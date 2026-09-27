-- SECURITY FIX — close anon / self-credit access to the Lotus + boost RPCs.
--
-- Found 2026-09-27 (checked live with has_function_privilege): every one of
-- these functions was executable by BOTH anon and authenticated:
--   activate_boost, activate_boost_with_lotus, claim_daily_login_lotus,
--   claim_monthly_lotus_allowance, gift_lotus, credit_lotus_purchase
--
-- Why that is dangerous:
-- 1. Their auth guard is `if auth.uid() is not null and auth.uid() !=
--    p_user_id` — a caller with only the public anon key has auth.uid() =
--    NULL, so the guard lets them act as ANY p_user_id (e.g. gift_lotus
--    from someone else's balance to themselves).
-- 2. credit_lotus_purchase adds Lotus with no Stripe check of its own. It
--    was meant to be service-role only, but `revoke ... from public` does
--    not remove Supabase's explicit default grants to anon/authenticated,
--    so any visitor could credit themselves Lotus for free.
--
-- The fix is grants only — no function body, table or data changes:
--   * the 5 user-facing RPCs: revoked from public + anon, kept for
--     authenticated (the app always calls them while logged in, so
--     auth.uid() is set and the existing guard does its job);
--   * credit_lotus_purchase: revoked from public + anon + authenticated,
--     kept for service_role only (api/lotus/webhook.ts uses the
--     service-role client, so Stripe purchases keep working).
-- The SQL-editor test path (auth.uid() NULL as postgres) still works.
--
-- Loops over pg_proc by name so it covers every overload and can't fail on
-- a signature typo. Safe to run more than once.
-- Run: Supabase Dashboard → SQL Editor → paste → Run. NOT YET RUN.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('activate_boost', 'activate_boost_with_lotus', 'claim_daily_login_lotus',
                        'claim_monthly_lotus_allowance', 'gift_lotus')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;

  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'credit_lotus_purchase'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;


-- ── 1. Verify (expect: anon = false everywhere; authenticated = false only
--       for credit_lotus_purchase, true for the other five) ──
select p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'execute') as can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated'), ('service_role')) r(rolname)
where n.nspname = 'public'
  and p.proname in ('gift_lotus', 'activate_boost_with_lotus', 'activate_boost',
                    'claim_monthly_lotus_allowance', 'claim_daily_login_lotus', 'credit_lotus_purchase')
order by 1, 2;


-- ── 2. Read-only: was it ever abused? ──
-- (a) Purchases that did not come from a Stripe Checkout session
--     (real ones have reference_id 'cs_live_…' / 'cs_test_…').
-- select * from lotus_ledger
-- where type = 'purchase' and coalesce(reference_id::text, '') not like 'cs\_%'
-- order by created_at desc;
--
-- (b) Recent gifts, biggest first — look for transfers nobody would make.
-- select * from lotus_ledger
-- where type in ('gift_sent', 'gift_received')
-- order by abs(amount) desc, created_at desc
-- limit 50;


-- ── 3. Read-only: any OTHER SECURITY DEFINER function anon can still run ──
-- Send this list back for review before revoking anything else — some
-- functions may legitimately need anon (e.g. signup helpers).
-- select p.oid::regprocedure as function, p.prosecdef as security_definer
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.prosecdef
--   and has_function_privilege('anon', p.oid, 'execute')
-- order by 1;
