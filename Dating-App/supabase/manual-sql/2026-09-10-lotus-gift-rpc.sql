-- Lotus Flower system — gift_lotus RPC (Phase 6).
-- Lets one authenticated user send lotus directly to another user's
-- balance from a Discover card. Follows the investigation report's
-- proposed design (see that session's report) and this repo's existing
-- lotus-RPC conventions rather than inventing new ones:
--   - auth.uid() cross-check against the acting party (sender), NULL
--     auth.uid() permitted for SQL-editor/service-role testing - same
--     trust model as claim_daily_login_lotus / activate_boost_with_lotus,
--     see 2026-09-02-boost-rpc-auth-check.sql.
--   - Atomic debit via UPDATE ... WHERE lotus_balance >= p_amount
--     RETURNING, same technique activate_boost_with_lotus already uses -
--     no row returned means the WHERE didn't match, which is what turns
--     into insufficient_balance below. This closes the same race a
--     separate SELECT-then-UPDATE would leave open between two
--     near-simultaneous gifts from the same sender.
--
-- Amount is user-configurable (SK's call, not fixed at 1), capped at
-- 1-500 per single gift - a product guardrail against a fat-fingered
-- amount, not a balance-integrity mechanism (the atomic debit above is
-- what actually protects balance integrity).
--
-- gift_sent / gift_received already exist in lotus_ledger.type's check
-- constraint (added 2026-09-03-lotus-daily-login-grant.sql, well ahead of
-- this RPC existing) - confirmed, no constraint migration needed here.
--
-- reference_id on each ledger row points at the *other* party's user id
-- (not an opaque gift-event id), so either side's ledger row alone
-- answers "who was this with" without a join.
--
-- Run this the same way as every other manual-sql file in this repo:
-- Supabase Dashboard → SQL Editor → paste → Run.

-- ── gift_lotus ──
-- Returns jsonb:
--   success case:  { success: true, sender_balance: integer, recipient_id: uuid }
--   error case:    { error: 'unauthorized' | 'cannot_gift_self' | 'invalid_amount'
--                          | 'recipient_not_found' | 'insufficient_balance' }
create or replace function gift_lotus(p_sender_id uuid, p_recipient_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_balance   integer;
  v_recipient_exists boolean;
begin
  if auth.uid() is not null and auth.uid() != p_sender_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if p_sender_id = p_recipient_id then
    return jsonb_build_object('error', 'cannot_gift_self');
  end if;

  if p_amount is null or p_amount < 1 or p_amount > 500 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;

  select exists(select 1 from profiles where id = p_recipient_id) into v_recipient_exists;

  if not v_recipient_exists then
    return jsonb_build_object('error', 'recipient_not_found');
  end if;

  -- Atomic debit: the lotus_balance >= p_amount guard lives inside this
  -- same UPDATE, not a preceding SELECT - see header note on why that
  -- matters for concurrent-gift safety. No matching row (balance too low
  -- by the time this runs) means v_sender_balance stays NULL.
  update profiles
  set lotus_balance = lotus_balance - p_amount
  where id = p_sender_id and lotus_balance >= p_amount
  returning lotus_balance into v_sender_balance;

  if v_sender_balance is null then
    return jsonb_build_object('error', 'insufficient_balance');
  end if;

  update profiles
  set lotus_balance = lotus_balance + p_amount
  where id = p_recipient_id;

  insert into lotus_ledger (user_id, type, amount, reference_id)
  values (p_sender_id, 'gift_sent', -p_amount, p_recipient_id::text);

  insert into lotus_ledger (user_id, type, amount, reference_id)
  values (p_recipient_id, 'gift_received', p_amount, p_sender_id::text);

  return jsonb_build_object(
    'success', true,
    'sender_balance', v_sender_balance,
    'recipient_id', p_recipient_id
  );
end;
$$;

grant execute on function gift_lotus(uuid, uuid, integer) to authenticated;

-- ── Manual test (no JWT context ⇒ auth.uid() IS NULL ⇒ guard passes through,
--    same convention as every other lotus RPC's manual test) ──
--   select gift_lotus('<sender-id>', '<recipient-id>', 10);
--   -- expect: {"success": true, "sender_balance": <sender's balance - 10>, "recipient_id": "<recipient-id>"}
--   select gift_lotus('<sender-id>', '<sender-id>', 10);
--   -- expect: {"error": "cannot_gift_self"}
--   select gift_lotus('<sender-id>', '<recipient-id>', 0);
--   -- expect: {"error": "invalid_amount"}
--   select gift_lotus('<sender-id>', '<recipient-id>', 501);
--   -- expect: {"error": "invalid_amount"}
--   select gift_lotus('<sender-id>', '00000000-0000-0000-0000-000000000000', 10);
--   -- expect: {"error": "recipient_not_found"}
--   select gift_lotus('<sender-id>', '<recipient-id>', 500);  -- with sender's balance < 500
--   -- expect: {"error": "insufficient_balance"}
