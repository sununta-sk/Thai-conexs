-- Lotus Flower system — purchase webhook idempotency + credit RPC.
-- Backs api/lotus/webhook.ts (checkout.session.completed, mode: "payment").
-- Depends on the Phase 1 schema (2026-09-02-lotus-schema.sql) already
-- being live. Run this the same way as every other manual-sql file in
-- this repo: Supabase Dashboard → SQL Editor → paste → Run.

-- ── lotus_ledger — unique index for purchase idempotency ──
-- Stripe retries webhook delivery on any non-2xx response (up to 3 days),
-- so the same checkout.session.completed event can arrive more than once
-- for the same session. reference_id already holds the Stripe session id
-- for 'purchase' rows (per the Phase 2 comment anticipating this), but no
-- constraint was ever added to actually enforce it — flagged as a gap
-- during investigation, not something previously done.
--
-- Partial, not a plain unique(reference_id): reference_id is a shared,
-- overloaded column across ledger types — 'monthly_grant' stores a
-- month_key, 'daily_grant' a day_key, 'boost_spend' a duration_days — and
-- those aren't required to be globally unique the way a Stripe session id
-- is. Scoping the constraint to type = 'purchase' only enforces
-- uniqueness where it actually matters, and is what credit_lotus_purchase
-- below targets as its ON CONFLICT arbiter.
create unique index if not exists lotus_ledger_purchase_session_unique
  on lotus_ledger (reference_id)
  where type = 'purchase';

-- ── credit_lotus_purchase ──
-- Credits a completed lotus-pack purchase, once per Stripe checkout
-- session. Race/retry-safe the same way as claim_daily_login_lotus /
-- claim_monthly_lotus_allowance: the INSERT either succeeds (first time
-- this session id has been credited) or is silently skipped by
-- ON CONFLICT ... DO NOTHING (a retry of an already-processed session) —
-- FOUND after the INSERT tells us which case happened, and the balance
-- update only runs in the first case.
--
-- Deliberately NOT granted to `authenticated` like the other lotus RPCs
-- (claim_daily_login_lotus, activate_boost_with_lotus, etc.) — those are
-- meant to be called by the logged-in user themselves via the client SDK.
-- This one credits a balance by trusting p_amount and p_stripe_session_id
-- verbatim, with no independent check against Stripe inside the function
-- itself — it's only safe to call from a context that has already
-- verified the Stripe webhook signature (api/lotus/webhook.ts, via the
-- service-role Supabase client). PostgreSQL grants EXECUTE on new
-- functions to PUBLIC by default, so the explicit REVOKE below is
-- required, not just belt-and-suspenders — without it, any logged-in
-- user could call this directly via supabase.rpc() from the browser
-- console and self-credit lotus.
create or replace function credit_lotus_purchase(
  p_user_id uuid,
  p_stripe_session_id text,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credited boolean := false;
  v_balance  integer;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;

  if p_stripe_session_id is null or p_stripe_session_id = '' then
    return jsonb_build_object('error', 'invalid_session_id');
  end if;

  insert into lotus_ledger (user_id, type, amount, reference_id)
  values (p_user_id, 'purchase', p_amount, p_stripe_session_id)
  on conflict (reference_id) where type = 'purchase' do nothing;

  if found then
    v_credited := true;

    update profiles
    set lotus_balance = lotus_balance + p_amount
    where id = p_user_id
    returning lotus_balance into v_balance;
  else
    select lotus_balance into v_balance
    from profiles
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'credited', v_credited,
    'balance', v_balance
  );
end;
$$;

revoke execute on function credit_lotus_purchase(uuid, text, integer) from public;
grant execute on function credit_lotus_purchase(uuid, text, integer) to service_role;

-- ── Manual test ──
-- Run this twice in a row for the same test user id + a fake session id:
--   select credit_lotus_purchase('<test-user-id>', 'cs_test_fake123', 110);
-- First call:  {"credited": true,  "balance": <+110>}
-- Second call: {"credited": false, "balance": <same as first>}
-- (Only service_role can call this in practice — the SQL editor runs
-- with sufficient privilege to execute it directly for this test.)
