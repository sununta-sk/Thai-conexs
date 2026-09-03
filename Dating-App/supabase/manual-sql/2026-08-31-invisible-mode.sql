-- VIP Invisible Mode — new, separate flag (NOT a repurpose of Incognito Mode;
-- incognito_enabled/incognito_expires_at/incognito_duration and toggle_incognito
-- are left untouched).
--
-- This repo has no tracked migrations folder — existing tables were created
-- directly via the Supabase SQL editor, so run this the same way:
-- Supabase Dashboard → SQL Editor → paste → Run. Safe to run once.

alter table profiles
  add column if not exists is_invisible boolean not null default false;
