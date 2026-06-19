import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * admin-audit-log Edge Function
 * 
 * Accepts POST requests from authenticated admin clients.
 * Verifies the JWT belongs to an active admin, then inserts
 * an audit log entry using the service_role key (bypasses RLS).
 * 
 * The admin_audit_log table is INSERT-only from this function.
 * No UPDATE or DELETE is ever issued here.
 * 
 * Request body shape:
 * {
 *   action_type: string,       // e.g. 'user_ban', 'photo_approve'
 *   target_type: string,       // e.g. 'app_user', 'photo'
 *   target_id?: string,        // uuid — single target
 *   target_ids?: string[],     // uuid[] — bulk targets (mutually exclusive with target_id)
 *   metadata?: Record<string, unknown>  // any extra context
 * }
 */

// Valid action_type and target_type values (mirrors schema comments)
const VALID_ACTION_TYPES = new Set([
  'user_warn',
  'user_suspend',
  'user_ban',
  'user_restore',
  'photo_approve',
  'photo_reject',
  'ticket_assign',
  'ticket_resolve',
  'payout_approve',
  'payout_deny',
  'plan_update',
  'setting_update',
  'announcement_publish',
  'affiliate_create',
  'commission_created',
])

const VALID_TARGET_TYPES = new Set([
  'app_user',
  'photo',
  'ticket',
  'payout',
  'plan',
  'setting',
  'announcement',
  'affiliate',
])

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 1. Parse incoming body ───────────────────────────────────────────────
    const body = await req.json()
    const { action_type, target_type, target_id, target_ids, metadata = {} } = body

    // ── 2. Validate required fields ──────────────────────────────────────────
    if (!action_type || !VALID_ACTION_TYPES.has(action_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid or missing action_type: "${action_type}"` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!target_type || !VALID_TARGET_TYPES.has(target_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid or missing target_type: "${target_type}"` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // target_id and target_ids are mutually exclusive
    if (target_id && target_ids) {
      return new Response(
        JSON.stringify({ error: 'Provide either target_id or target_ids, not both' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Verify caller JWT and resolve admin_user_id ────────────────────────
    // Use the anon client to verify the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the authenticated user's UID from the JWT
    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Resolve admin_users row (confirms this is an active admin) ─────────
    // Use service_role client here so RLS doesn't block the lookup
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: adminUser, error: adminError } = await serviceClient
      .from('admin_users')
      .select('id, role_id, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Caller is not a registered admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!adminUser.is_active) {
      return new Response(
        JSON.stringify({ error: 'Admin account is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Extract request context for forensics ──────────────────────────────
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const user_agent = req.headers.get('user-agent') ?? null

    // ── 6. Insert audit log row via service_role (bypasses RLS) ──────────────
    const insertPayload: Record<string, unknown> = {
      admin_user_id: adminUser.id,
      action_type,
      target_type,
      metadata,
      ip_address,
      user_agent,
    }

    if (target_id) insertPayload.target_id = target_id
    if (target_ids) insertPayload.target_ids = target_ids

    const { data: logEntry, error: insertError } = await serviceClient
      .from('admin_audit_log')
      .insert(insertPayload)
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('Audit log insert failed:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to write audit log', detail: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 7. Return the created log entry id ────────────────────────────────────
    return new Response(
      JSON.stringify({ id: logEntry.id, created_at: logEntry.created_at }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error in admin-audit-log:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})