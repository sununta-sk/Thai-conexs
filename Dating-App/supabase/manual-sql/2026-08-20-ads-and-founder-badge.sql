-- Task 4 (Advertiser ad rotation) + Task 5 (Founder Member badge)
--
-- This repo has no tracked migrations folder — existing tables were created
-- directly via the Supabase SQL editor, so run this the same way:
-- Supabase Dashboard → SQL Editor → paste → Run. Safe to run once.

-- ── Task 5: Founder Member badge ──
alter table profiles
  add column if not exists is_founder_member boolean not null default false;

-- ── Task 4: Advertiser ads ──
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text,
  advertiser_contact text,
  headline text not null,
  body_text text,
  image_url text,
  destination_url text not null,
  design_variant text not null default 'gradient-pink',
  side text not null default 'left' check (side in ('left', 'right', 'both')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references admin_users(id)
);

create index if not exists ads_side_active_order_idx
  on ads (side, is_active, display_order);

alter table ads enable row level security;

-- Public/anon + logged-in users only ever need to see active ads (Discover
-- side rails); admins need to see and manage everything.
drop policy if exists "Public can view active ads" on ads;
create policy "Public can view active ads"
  on ads for select
  using (is_active = true);

drop policy if exists "Admins can view all ads" on ads;
create policy "Admins can view all ads"
  on ads for select
  using (exists (
    select 1 from admin_users au
    where au.auth_user_id = auth.uid() and au.is_active = true
  ));

drop policy if exists "Admins can insert ads" on ads;
create policy "Admins can insert ads"
  on ads for insert
  with check (exists (
    select 1 from admin_users au
    where au.auth_user_id = auth.uid() and au.is_active = true
  ));

drop policy if exists "Admins can update ads" on ads;
create policy "Admins can update ads"
  on ads for update
  using (exists (
    select 1 from admin_users au
    where au.auth_user_id = auth.uid() and au.is_active = true
  ));

drop policy if exists "Admins can delete ads" on ads;
create policy "Admins can delete ads"
  on ads for delete
  using (exists (
    select 1 from admin_users au
    where au.auth_user_id = auth.uid() and au.is_active = true
  ));
