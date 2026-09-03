-- Lotus Flower system — Phase 1: schema only.
-- No RPCs, no application code changes yet. Every table here is written to
-- exclusively by future SECURITY DEFINER RPCs (same model as profile_boosts
-- / activate_boost) — there are deliberately no client-side insert/update/
-- delete policies anywhere below.
--
-- This repo has no tracked migrations folder — existing tables were created
-- directly via the Supabase SQL editor, so run this the same way:
-- Supabase Dashboard → SQL Editor → paste → Run. Safe to run once.

-- ── lotus_ledger ──
-- Source of truth for every lotus balance change. profiles.lotus_balance
-- (below) is a cache only — never trust it independently of this table;
-- every future writer RPC must update both in one transaction.
create table if not exists lotus_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  type text not null check (type in (
    'monthly_grant', 'gift_sent', 'gift_received', 'purchase',
    'boost_spend', 'admin_adjustment'
  )),
  amount integer not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists lotus_ledger_user_id_created_at_idx
  on lotus_ledger (user_id, created_at);

alter table lotus_ledger enable row level security;

drop policy if exists "Users can view their own lotus ledger" on lotus_ledger;
create policy "Users can view their own lotus ledger"
  on lotus_ledger for select
  to authenticated
  using (auth.uid() = user_id);

-- ── profiles.lotus_balance ──
-- Cache column. RLS on `profiles` already governs row access; no new
-- policy needed here, just the column.
alter table profiles
  add column if not exists lotus_balance integer not null default 0;

-- ── lotus_monthly_grants ──
-- One row per (user, calendar month) the free monthly allowance was
-- claimed. The unique constraint is what makes the future claim RPC
-- race-safe without a cron job — "insert ... on conflict do nothing",
-- credit the ledger/balance only if the insert actually happened.
create table if not exists lotus_monthly_grants (
  user_id uuid not null references profiles(id),
  month_key text not null,
  granted_at timestamptz not null default now(),
  unique (user_id, month_key)
);

alter table lotus_monthly_grants enable row level security;

drop policy if exists "Users can view their own monthly grants" on lotus_monthly_grants;
create policy "Users can view their own monthly grants"
  on lotus_monthly_grants for select
  to authenticated
  using (auth.uid() = user_id);

-- ── lotus_boost_prices ──
-- Not per-user data — readable by any authenticated user. Editable later
-- via direct SQL/admin tooling without a code deploy; application code
-- must read prices from here, never hardcode them.
create table if not exists lotus_boost_prices (
  duration_days integer primary key,
  lotus_cost integer not null
);

alter table lotus_boost_prices enable row level security;

drop policy if exists "Authenticated users can view boost prices" on lotus_boost_prices;
create policy "Authenticated users can view boost prices"
  on lotus_boost_prices for select
  to authenticated
  using (true);

insert into lotus_boost_prices (duration_days, lotus_cost) values
  (1, 500),
  (2, 1000),
  (3, 1500),
  (7, 3500),
  (14, 7000)
on conflict (duration_days) do nothing;
