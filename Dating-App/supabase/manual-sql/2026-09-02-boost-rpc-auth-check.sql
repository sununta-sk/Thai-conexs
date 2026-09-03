-- Security fix: cross-check p_user_id against auth.uid() in all 3
-- boost/lotus RPCs, so an authenticated caller can no longer pass another
-- user's id and act on their behalf via a direct API/console call.
--
-- Permits:
--   (a) auth.uid() IS NULL   — direct SQL-editor/service-role calls with no
--                              JWT context, our established test convention
--   (b) auth.uid() = p_user_id — a legitimate user acting on their own
--                              behalf
-- Rejects any authenticated call where the ids don't match, returning
-- {"error": "unauthorized"} in the same shape each function already uses.
--
-- Run this the same way: Supabase Dashboard → SQL Editor → paste → Run.

-- ══════════════════════════════════════════════════════════════════════
-- 1/3 — claim_monthly_lotus_allowance (Phase 2)
--       Return type: jsonb → jsonb_build_object
-- ══════════════════════════════════════════════════════════════════════
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
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

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

-- ══════════════════════════════════════════════════════════════════════
-- 2/3 — activate_boost_with_lotus (Phase 3)
--       Return type: jsonb → jsonb_build_object
-- ══════════════════════════════════════════════════════════════════════
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
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select lotus_cost into v_cost
  from lotus_boost_prices
  where duration_days = p_duration_days;

  if v_cost is null then
    return jsonb_build_object('error', 'invalid_duration');
  end if;

  select lotus_balance into v_balance
  from profiles
  where id = p_user_id;

  if v_balance is null or v_balance < v_cost then
    return jsonb_build_object('error', 'insufficient_balance');
  end if;

  select exists(
    select 1 from profile_boosts
    where user_id = p_user_id and expires_at > now()
  ) into v_active_exists;

  if v_active_exists then
    return jsonb_build_object('error', 'boost_already_active');
  end if;

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

-- ══════════════════════════════════════════════════════════════════════
-- 3/3 — activate_boost (existing, subscription-gated)
--       Return type: json → json_build_object, per its existing convention
--
--       NOTE: the final RETURN's json_build_object, as pasted for this
--       task, had an odd/mismatched argument list ('id', v_boost.id,
--       'expires_at', 'duration_hours', v_boost.duration_hours) — five
--       items, not valid key/value pairs, which would throw at runtime.
--       Reproduced below as the evidently-intended 3-pair version
--       (id / expires_at / duration_hours); everything else, including
--       the Thai comments, is unchanged. Verify this one line against the
--       actual Supabase source before running.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.activate_boost(p_user_id uuid, p_duration_hours smallint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_existing uuid;
  v_boost    profile_boosts;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;

  -- ตรวจ subscription
  IF NOT has_active_subscription(p_user_id) THEN
    RETURN json_build_object('error', 'subscription_required');
  END IF;

  -- ห้าม stack boost
  SELECT id INTO v_existing
  FROM profile_boosts
  WHERE user_id = p_user_id
    AND expires_at > now()
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('error', 'boost_already_active');
  END IF;

  -- สร้าง boost
  INSERT INTO profile_boosts (user_id, duration_hours, expires_at)
  VALUES (
    p_user_id,
    p_duration_hours,
    now() + (p_duration_hours || ' hours')::interval
  )
  RETURNING * INTO v_boost;

  RETURN json_build_object(
    'id',             v_boost.id,
    'expires_at',     v_boost.expires_at,
    'duration_hours', v_boost.duration_hours
  );
END;
$function$;

-- ── Manual test (per this task's spec) ──
-- Re-run Phase 2/3's existing SQL-editor test calls (no JWT context there,
-- so auth.uid() is NULL) and confirm identical behavior to before:
--   select claim_monthly_lotus_allowance('<test-user-id>');
--   select activate_boost_with_lotus('<test-user-id>', 1);
-- Both should behave exactly as in the Phase 2/3 test notes — the NULL
-- auth.uid() case is explicitly permitted, so nothing here should change.
-- For activate_boost itself, re-run its existing subscription/boost tests
-- the same way (no JWT context ⇒ auth.uid() IS NULL ⇒ guard passes
-- through unchanged) and confirm subscription_required /
-- boost_already_active / success all still behave as before.
