-- Lotus Flower system — Phase 4a: purchase packs schema.
-- No checkout route or webhook yet — schema only, same pattern as
-- lotus_boost_prices (2026-09-02-lotus-schema.sql): authenticated-read-only
-- RLS, no client write policies anywhere, editable later without a code
-- deploy. Run this the same way: Supabase Dashboard → SQL Editor →
-- paste → Run.
--
-- base_lotus is the primary key rather than a surrogate id: it's the
-- stable identity of "which pack" (100/200/300/500/1000), independent of
-- the bonus percentage — if the bonus rate ever changes, total_lotus and
-- price_thb can be updated in place without the pack's identity moving.
create table if not exists lotus_purchase_packs (
  base_lotus integer primary key,
  bonus_lotus integer not null,
  total_lotus integer not null,
  price_thb numeric(10,2) not null,
  stripe_price_id text,
  check (total_lotus = base_lotus + bonus_lotus)
);

alter table lotus_purchase_packs enable row level security;

drop policy if exists "Authenticated users can view purchase packs" on lotus_purchase_packs;
create policy "Authenticated users can view purchase packs"
  on lotus_purchase_packs for select
  to authenticated
  using (true);

insert into lotus_purchase_packs (base_lotus, bonus_lotus, total_lotus, price_thb, stripe_price_id) values
  (100,  10,  110,  35.00,  null),
  (200,  20,  220,  70.00,  null),
  (300,  30,  330,  105.00, null),
  (500,  50,  550,  175.00, null),
  (1000, 100, 1100, 350.00, null)
on conflict (base_lotus) do nothing;
