-- Lotus Flower system — daily login bonus, replacing the monthly
-- allowance mechanic entirely (+1 lotus per login, up to 2 grants/day).
--
-- claim_monthly_lotus_allowance and lotus_monthly_grants are left in
-- place, untouched, dormant - matching this project's usual pattern of
-- not deleting working-but-superseded code without being asked. Nothing
-- in the frontend has ever called claim_monthly_lotus_allowance (checked
-- before writing this - the /lotus UI never shipped), so there's nothing
-- to unwire on that side either.
--
-- Run this the same way as every other manual-sql file in this repo:
-- Supabase Dashboard → SQL Editor → paste → Run.

-- ── lotus_ledger.type — widen the check constraint ──
-- Adding 'daily_grant' as a distinct type from 'monthly_grant': these are
-- genuinely different mechanics now (up to twice a day vs once a month),
-- and a ledger row that said "monthly_grant" for something that can fire
-- twice in one day would actively mislead anyone reading a user's
-- transaction history later.
alter table lotus_ledger drop constraint if exists lotus_ledger_type_check;
alter table lotus_ledger add constraint lotus_ledger_type_check
  check (type in (
    'monthly_grant', 'daily_grant', 'gift_sent', 'gift_received',
    'purchase', 'boost_spend', 'admin_adjustment'
  ));

-- ── lotus_daily_grants ──
-- No unique constraint on (user_id, day_key) alone this time - up to 2
-- grants/day are allowed, so that wouldn't express the right invariant.
-- grant_slot (1 or 2) + a unique constraint on the full triple is what
-- makes this race-safe: the RPC below tries inserting slot 1 first, then
-- slot 2, each via ON CONFLICT DO NOTHING - same atomic-via-constraint
-- technique lotus_monthly_grants already uses, not a new one. A plain
-- "select count(*) then insert" would have a check-then-act race between
-- two near-simultaneous calls (e.g. a flaky double-fire of the SIGNED_IN
-- event) that could both read count<2 and both insert, blowing past the
-- cap - this avoids that.
create table if not exists lotus_daily_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  day_key text not null,
  grant_slot smallint not null check (grant_slot in (1, 2)),
  granted_at timestamptz not null default now(),
  unique (user_id, day_key, grant_slot)
);

create index if not exists lotus_daily_grants_user_id_day_key_idx
  on lotus_daily_grants (user_id, day_key);

alter table lotus_daily_grants enable row level security;

drop policy if exists "Users can view their own daily grants" on lotus_daily_grants;
create policy "Users can view their own daily grants"
  on lotus_daily_grants for select
  to authenticated
  using (auth.uid() = user_id);

-- ── claim_daily_login_lotus ──
-- Grants +1 lotus per call, up to 2 successful grants per calendar day
-- per user. Tries grant_slot 1 first; if that slot's already taken today
-- (this is the user's 2nd+ call today), tries slot 2; if both are taken,
-- no-ops cleanly.
--
-- p_user_id is trusted as passed by the caller, no auth.uid() cross-check
-- beyond the mismatch guard below - same trust model as
-- claim_monthly_lotus_allowance and activate_boost_with_lotus (matches
-- useBoost.js's calling convention, and keeps this callable from the SQL
-- editor with no JWT context for testing).
--
-- Returns jsonb: { granted: boolean, balance: integer, day_key: text,
--                   grants_today: integer }
--   granted      — true if this call performed a grant, false if both of
--                  today's slots were already claimed
--   balance      — the user's lotus_balance after this call
--   day_key      — the 'YYYY-MM-DD' key this call evaluated against
--   grants_today — how many of the 2 daily slots are now claimed (1 or 2)
create or replace function claim_daily_login_lotus(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_key text := to_char(now(), 'YYYY-MM-DD');
  v_granted boolean := false;
  v_slot    smallint;
  v_balance integer;
  v_grants_today integer;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  insert into lotus_daily_grants (user_id, day_key, grant_slot)
  values (p_user_id, v_day_key, 1)
  on conflict (user_id, day_key, grant_slot) do nothing;

  if found then
    v_slot := 1;
  else
    insert into lotus_daily_grants (user_id, day_key, grant_slot)
    values (p_user_id, v_day_key, 2)
    on conflict (user_id, day_key, grant_slot) do nothing;

    if found then
      v_slot := 2;
    end if;
  end if;

  if v_slot is not null then
    v_granted := true;

    update profiles
    set lotus_balance = lotus_balance + 1
    where id = p_user_id
    returning lotus_balance into v_balance;

    insert into lotus_ledger (user_id, type, amount, reference_id)
    values (p_user_id, 'daily_grant', 1, v_day_key);
  else
    select lotus_balance into v_balance
    from profiles
    where id = p_user_id;
  end if;

  select count(*) into v_grants_today
  from lotus_daily_grants
  where user_id = p_user_id and day_key = v_day_key;

  return jsonb_build_object(
    'granted', v_granted,
    'balance', v_balance,
    'day_key', v_day_key,
    'grants_today', v_grants_today
  );
end;
$$;

grant execute on function claim_daily_login_lotus(uuid) to authenticated;

-- ── Manual test ──
-- Run 3 times in a row for the same test user id:
--   select claim_daily_login_lotus('<test-user-id>');
-- 1st call:  {"granted": true,  "balance": <+1>, "grants_today": 1, ...}
-- 2nd call:  {"granted": true,  "balance": <+1>, "grants_today": 2, ...}
-- 3rd call:  {"granted": false, "balance": <same as 2nd>, "grants_today": 2, ...}
