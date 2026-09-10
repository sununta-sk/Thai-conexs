-- Security fix: profiles.lotus_balance (and total_spent, an orphaned
-- column no code ever reads/writes) were directly client-writable via
-- PostgREST. 'authenticated' held a blanket table-level UPDATE grant on
-- profiles - RLS's "Allow all for owner" / profiles_update_policy only
-- gates WHICH ROW a user can touch, not which COLUMNS, so any logged-in
-- user could PATCH their own lotus_balance to anything via a raw REST
-- call, bypassing every RPC and the entire lotus_ledger. Confirmed live
-- against production this session (PATCH .../profiles?id=eq.<id> with
-- {"lotus_balance": 99999} - HTTP 200; immediately reverted).
--
-- role_table_grants confirmed 'authenticated' holds table-level UPDATE
-- (not column-scoped) on profiles, which is why a column-level REVOKE
-- alone (REVOKE UPDATE (lotus_balance) ON profiles FROM authenticated)
-- would have been a silent no-op - Postgres lets a role update ANY
-- column once it holds table-level UPDATE, regardless of column-level
-- REVOKEs stacked on top. The fix has to revoke the blanket grant
-- entirely and re-grant UPDATE only on the columns client code actually
-- writes.
--
-- Column list below is exhaustive, not guessed - every .update()/.upsert()
-- call site against 'profiles' across src/ was grepped and read (admin
-- pages included - they use the same 'authenticated' role via the
-- admin's own session, not a separate privileged path; the 4 api/*
-- files that touch profiles all use SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses grants/RLS entirely and so don't factor into this list).
--
-- Excluded (the only two columns this fix actually closes tonight):
--   lotus_balance - the vulnerability that started this investigation.
--   total_spent   - zero references anywhere in src/ or api/, confirmed
--                    via grep. Orphaned column, never legitimately
--                    written client-side.
--
-- commission_balance is included below (SK's explicit decision -
-- referral-bonus flow must keep working tonight), even though it has
-- the exact same race-condition shape lotus_balance did: ProfileSetup.jsx
-- :390-392 does a client-side read-then-write
-- (update({commission_balance: (referrer.commission_balance||0)+30}))
-- against ANOTHER user's row, non-atomic, not RPC-backed. This REVOKE/
-- GRANT does not close that hole - tracked as a follow-up, not fixed
-- here. See the two TODOs below.
--
-- ── TODO (tracked follow-ups, not part of tonight's fix) ──
-- 1. commission_balance: convert the referral-bonus credit flow
--    (ProfileSetup.jsx:390-392) to a SECURITY DEFINER RPC matching
--    credit_lotus_purchase's atomic UPDATE ... RETURNING pattern, then
--    re-run this same REVOKE/GRANT exercise to finally exclude
--    commission_balance once nothing legitimate needs to write it
--    directly anymore.
-- 2. banned_until / ban_reason: both are in the GRANT list because the
--    admin UI legitimately needs to write them (BanModal.jsx,
--    admin/UserDetailPage.jsx, admin/ReportsPage.jsx) - but admin and
--    regular users share the same 'authenticated' Postgres role, with
--    no role-level separation. A regular (non-admin, possibly
--    already-banned) user whose own-row RLS update policy permits
--    self-updates could potentially clear their own banned_until/
--    ban_reason via a direct PATCH, bypassing whatever admin-only UI
--    gating exists today. This may be the actual root cause of the
--    already-documented "Ban button ... may not block login" bug.
--    Needs separate investigation - likely either a proper admin
--    role/claim check inside the RLS policy itself, or moving admin ban
--    actions to a service-role-backed API endpoint instead of a direct
--    client-side .update(). Not solved by this column-grant fix alone.
--
-- NOT YET RUN - reviewed and approved by SK before executing, per this
-- repo's manual-sql convention: Supabase Dashboard → SQL Editor → Run.

revoke update on public.profiles from authenticated;

grant update (
  id, username, bio, avatar_url, photos, details, referral_code, lifestyle,
  city, province, country, updated_at, referred_by, last_seen_at,
  banned_until, ban_reason, is_invisible, last_self_username_change_at,
  email_preferences, account_status, closed_at, deleted_at, is_verified,
  is_founder_member, preferred_lang, commission_balance
) on public.profiles to authenticated;

-- ── Manual verification after running ──
-- 1. Re-run the vulnerable PATCH from this session's investigation using
--    a real user's own access token:
--      PATCH .../rest/v1/profiles?id=eq.<user-id>  body: {"lotus_balance": 99999}
--    Expect a 42501-style permission-denied error from PostgREST, not
--    the previous 200.
-- 2. Confirm activate_boost_with_lotus's insufficient_balance path still
--    behaves identically - it's SECURITY DEFINER, so this REVOKE/GRANT
--    (which only affects the 'authenticated' role's own direct table
--    access) does not touch it.
-- 3. Confirm a normal legitimate field edit still works end-to-end
--    through the real UI - e.g. ProfileSetup.jsx's debounced bio
--    autosave, or the InvisibleModeToggle - both write columns that are
--    still in the GRANT list above.
