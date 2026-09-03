-- Lotus Flower system — Phase 3: activate_boost_with_lotus RPC.
-- Depends on Phase 1 (schema) and Phase 2 (monthly grant RPC) already
-- being live. Does NOT touch the existing activate_boost RPC — that stays
-- exactly as-is, this is a separate, additional entry point into the same
-- profile_boosts table. Run this the same way: Supabase Dashboard →
-- SQL Editor → paste → Run.

-- ── activate_boost_with_lotus ──
-- Lotus-funded alternative to the subscription-gated activate_boost.
-- Writes into the same profile_boosts table with the same shape
-- (user_id, expires_at, duration_hours), so the Discover ranking fix
-- already built picks up a lotus-funded boost with zero further changes —
-- it only ever reads profile_boosts.expires_at, it doesn't care how a row
-- got there.
--
-- Error convention deliberately matches activate_boost's, as inferred from
-- useBoost.js's handling (`data?.error`, with a code → Thai-copy map that
-- falls back to the raw code string for anything not in the map):
--   { error: 'invalid_duration' }       -- no lotus_boost_prices row for
--                                           p_duration_days; never guessed
--                                           or defaulted
--   { error: 'insufficient_balance' }   -- profiles.lotus_balance < cost
--   { error: 'boost_already_active' }   -- reuses the exact same code
--                                           useBoost.js already has Thai
--                                           copy mapped for ('คุณมี Boost
--                                           ที่ยังใช้งานอยู่'), so that
--                                           existing mapping works for
--                                           this RPC's failures too,
--                                           unchanged
-- On success (no 'error' key, matching the same `data?.error` convention):
--   { success: true, balance: <new lotus_balance>, expires_at: <timestamptz> }
--
-- p_user_id is trusted as passed by the caller, no auth.uid() cross-check —
-- same trade-off as claim_monthly_lotus_allowance (Phase 2), for the same
-- reasons: matches activate_boost's inferred calling convention, and keeps
-- the requested SQL-editor test path (no auth.uid() context there) working.
create or replace function activate_boost_with_lotus(p_user_id uuid, p_duration_days integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost          integer;
  v_balance       integer;
  v_new_balance   integer;
  v_expires_at    timestamptz;
  v_active_exists boolean;
begin
  -- 1. Look up cost for this duration. No guessing/defaulting — an
  --    unrecognized duration is rejected outright.
  select lotus_cost into v_cost
  from lotus_boost_prices
  where duration_days = p_duration_days;

  if v_cost is null then
    return jsonb_build_object('error', 'invalid_duration');
  end if;

  -- 2. Check balance. No partial writes past this point if insufficient.
  select lotus_balance into v_balance
  from profiles
  where id = p_user_id;

  if v_balance is null or v_balance < v_cost then
    return jsonb_build_object('error', 'insufficient_balance');
  end if;

  -- 3. Same "already active" guard activate_boost enforces, against the
  --    same table, so a user can't stack a lotus boost on top of a
  --    subscription-funded one or vice versa.
  select exists(
    select 1 from profile_boosts
    where user_id = p_user_id and expires_at > now()
  ) into v_active_exists;

  if v_active_exists then
    return jsonb_build_object('error', 'boost_already_active');
  end if;

  -- 4. All checks passed — debit, ledger, boost row, atomically (this
  --    entire function body runs as a single statement in the caller's
  --    transaction).
  v_expires_at := now() + (p_duration_days || ' days')::interval;

  update profiles
  set lotus_balance = lotus_balance - v_cost
  where id = p_user_id
  returning lotus_balance into v_new_balance;

  insert into lotus_ledger (user_id, type, amount, reference_id)
  values (p_user_id, 'boost_spend', -v_cost, p_duration_days::text);

  insert into profile_boosts (user_id, expires_at, duration_hours)
  values (p_user_id, v_expires_at, p_duration_days * 24);

  return jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'expires_at', v_expires_at
  );
end;
$$;

grant execute on function activate_boost_with_lotus(uuid, integer) to authenticated;

-- ── Manual test (per Phase 3 spec) ──
-- 1. Ensure the test user has balance, e.g. via Phase 2's RPC:
--      select claim_monthly_lotus_allowance('<test-user-id>');
-- 2. Valid duration + sufficient balance:
--      select activate_boost_with_lotus('<test-user-id>', 1);
--    Expect {"success": true, "balance": <-500>, "expires_at": <~24h out>},
--    and a new profile_boosts row for that user with duration_hours = 24.
-- 3. Call again immediately with any valid duration:
--      select activate_boost_with_lotus('<test-user-id>', 1);
--    Expect {"error": "boost_already_active"}, no second row, no debit.
-- 4. Invalid duration (once the active boost above has expired, or on a
--    fresh user with no active boost):
--      select activate_boost_with_lotus('<test-user-id>', 4);
--    Expect {"error": "invalid_duration"} — 4 isn't a seeded tier.
