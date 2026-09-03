-- Lotus Flower system — Phase 2: claim_monthly_lotus_allowance RPC.
-- Depends on the Phase 1 schema (2026-09-02-lotus-schema.sql) already
-- being live. Run this the same way: Supabase Dashboard → SQL Editor →
-- paste → Run.

-- ── Fix: lotus_ledger.reference_id needs to hold text values ──
-- Phase 1 created this column as `uuid`, but this RPC needs to store the
-- month_key ('2026-09') in it, and future writers (purchase → Stripe
-- session id, etc.) will need text too. Table is empty so far, so this is
-- a safe, non-destructive widen.
alter table lotus_ledger
  alter column reference_id type text using reference_id::text;

-- ── claim_monthly_lotus_allowance ──
-- Grants the 5-free-lotus monthly allowance, once per (user, calendar
-- month). Race-safe by construction: the INSERT below either succeeds (no
-- prior grant this month) or is silently skipped by
-- ON CONFLICT ... DO NOTHING (a prior grant already exists) — there is no
-- preceding SELECT check, so two concurrent calls for the same user in the
-- same month can't both grant. `FOUND` after the INSERT tells us which
-- case happened.
--
-- p_user_id is trusted as passed by the caller, with no auth.uid() cross-
-- check — matching the calling convention useBoost.js already uses for
-- activate_boost (supabase.rpc('activate_boost', { p_user_id: userId })).
-- This also matches the requested test path: calling this directly from
-- the SQL editor has no auth.uid() context to check against.
--
-- Returns jsonb: { granted: boolean, balance: integer, month_key: text }
--   granted    — true if this call performed the grant, false if this
--                user already claimed this calendar month
--   balance    — the user's lotus_balance after this call (post-grant if
--                granted, current value if not)
--   month_key  — the 'YYYY-MM' key this call evaluated against
create or replace function claim_monthly_lotus_allowance(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_key text := to_char(now(), 'YYYY-MM');
  v_granted   boolean := false;
  v_balance   integer;
begin
  insert into lotus_monthly_grants (user_id, month_key, granted_at)
  values (p_user_id, v_month_key, now())
  on conflict (user_id, month_key) do nothing;

  if found then
    v_granted := true;

    update profiles
    set lotus_balance = lotus_balance + 5
    where id = p_user_id
    returning lotus_balance into v_balance;

    insert into lotus_ledger (user_id, type, amount, reference_id)
    values (p_user_id, 'monthly_grant', 5, v_month_key);
  else
    select lotus_balance into v_balance
    from profiles
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'granted', v_granted,
    'balance', v_balance,
    'month_key', v_month_key
  );
end;
$$;

grant execute on function claim_monthly_lotus_allowance(uuid) to authenticated;

-- ── Manual test (per Phase 2 spec) ──
-- Run this twice in a row for the same test user id:
--   select claim_monthly_lotus_allowance('<test-user-id>');
-- First call:  {"granted": true,  "balance": <+5>, "month_key": "2026-09"}
-- Second call: {"granted": false, "balance": <same>, "month_key": "2026-09"}
