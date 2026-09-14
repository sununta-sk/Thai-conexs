// api/delete-account.js
// Vercel serverless function — POST /api/delete-account
// Relocated from Dating-App/api/delete-account.ts (wrong location — Vercel's
// api/ directory for this project is the repo root, not Dating-App/api).
// Written as plain CommonJS to match the rest of this directory (server.js,
// middleware/auth.js, routes/subscription.js) — avoids needing a TypeScript
// toolchain/@types setup this directory doesn't otherwise have.
//
// Verifies the caller is a real, active admin (via admin_users, checked against
// their own Supabase Auth session token — not a static "admin token"), then
// permanently deletes a user's data: dependent rows, Storage files, the
// profiles row, and finally the Supabase Auth user itself.
//
// Called from src/pages/admin/UserDetailPage.jsx's handleDeleteAccount(), which
// already POSTs { userId } with Authorization: Bearer <admin's session token>.
//
// 2026-09-14 fix (incident: 17 navguard-throwaway-* test accounts got stuck
// half-deleted): lotus_ledger, lotus_daily_grants, lotus_monthly_grants and
// profile_boosts all have `user_id references profiles(id)` with no
// ON DELETE CASCADE. Any account with rows in those tables would silently
// fail its profiles.delete() below (error was never checked), then fail
// auth.admin.deleteUser() too (profiles.id -> auth.users cascade gets
// blocked by the same rows), surfacing as "Database error deleting user"
// even though nothing had actually been removed. Fixed by (a) adding those
// 4 tables to the delete list, before profiles, and (b) checking every
// delete's error instead of swallowing it, so a real failure now aborts
// with a clear message instead of reporting false partial success.
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.replace('Bearer ', '');

  // Note: this project has no server-side SUPABASE_ANON_KEY var (only the
  // client-exposed VITE_SUPABASE_ANON_KEY) — the service-role client works
  // equally well for auth.getUser(token), since JWT validation depends on the
  // token itself, not which API key the client was constructed with.
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !caller) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', caller.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!adminRow) return res.status(403).json({ error: 'Not authorized as admin' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Throws on the first failed delete instead of silently continuing —
  // a step that fails here (e.g. an FK constraint blocking it) must abort
  // the whole flow with a clear "which step" message, not let the code
  // carry on as if the row were gone and report false success later.
  async function checkedDelete(label, queryBuilder) {
    const { error } = await queryBuilder;
    if (error) throw new Error(`${label}: ${error.message}`);
  }

  try {
    const { data: avatarFiles } = await supabase.storage.from('avatars').list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const { error } = await supabase.storage.from('avatars').remove(avatarFiles.map((f) => userId + '/' + f.name));
      if (error) throw new Error(`storage avatars: ${error.message}`);
    }
    const { data: faceFiles } = await supabase.storage.from('avatars').list('face-verify/' + userId);
    if (faceFiles && faceFiles.length > 0) {
      const { error } = await supabase.storage.from('avatars').remove(faceFiles.map((f) => 'face-verify/' + userId + '/' + f.name));
      if (error) throw new Error(`storage face-verify: ${error.message}`);
    }

    // lotus_ledger / lotus_daily_grants / lotus_monthly_grants / profile_boosts
    // all reference profiles(id) with no ON DELETE CASCADE — must go before
    // profiles or its delete (and then the auth user's) gets FK-blocked.
    await checkedDelete('lotus_ledger', supabase.from('lotus_ledger').delete().eq('user_id', userId));
    await checkedDelete('lotus_daily_grants', supabase.from('lotus_daily_grants').delete().eq('user_id', userId));
    await checkedDelete('lotus_monthly_grants', supabase.from('lotus_monthly_grants').delete().eq('user_id', userId));
    await checkedDelete('profile_boosts', supabase.from('profile_boosts').delete().eq('user_id', userId));

    await checkedDelete('messages', supabase.from('messages').delete().or('chat_id.like.' + userId + '_%,chat_id.like.%_' + userId));
    await checkedDelete('user_likes (liker)', supabase.from('user_likes').delete().eq('liker_id', userId));
    await checkedDelete('user_likes (liked)', supabase.from('user_likes').delete().eq('liked_id', userId));
    await checkedDelete('user_passes (passer)', supabase.from('user_passes').delete().eq('passer_id', userId));
    await checkedDelete('user_passes (passed)', supabase.from('user_passes').delete().eq('passed_id', userId));
    await checkedDelete('user_blocks (blocker)', supabase.from('user_blocks').delete().eq('blocker_id', userId));
    await checkedDelete('user_blocks (blocked)', supabase.from('user_blocks').delete().eq('blocked_id', userId));
    await checkedDelete('user_reports (reporter)', supabase.from('user_reports').delete().eq('reporter_id', userId));
    await checkedDelete('user_reports (reported)', supabase.from('user_reports').delete().eq('reported_id', userId));
    await checkedDelete('content_reports (reporter)', supabase.from('content_reports').delete().eq('reporter_id', userId));
    await checkedDelete('content_reports (reported)', supabase.from('content_reports').delete().eq('reported_user_id', userId));
    await checkedDelete('profile_views (viewer)', supabase.from('profile_views').delete().eq('viewer_id', userId));
    await checkedDelete('profile_views (viewed)', supabase.from('profile_views').delete().eq('viewed_id', userId));
    await checkedDelete('photo_moderation_queue', supabase.from('photo_moderation_queue').delete().eq('user_id', userId));
    await checkedDelete('profile_videos', supabase.from('profile_videos').delete().eq('user_id', userId));
    await checkedDelete('user_subscriptions', supabase.from('user_subscriptions').delete().eq('user_id', userId));

    const { data: tickets, error: ticketsSelectError } = await supabase.from('support_tickets').select('id').eq('user_id', userId);
    if (ticketsSelectError) throw new Error(`support_tickets (select): ${ticketsSelectError.message}`);
    if (tickets && tickets.length > 0) {
      const ticketIds = tickets.map((t) => t.id);
      await checkedDelete('ticket_messages', supabase.from('ticket_messages').delete().in('ticket_id', ticketIds));
      await checkedDelete('support_tickets', supabase.from('support_tickets').delete().eq('user_id', userId));
    }

    await checkedDelete('user_moderation_actions', supabase.from('user_moderation_actions').delete().eq('target_user_id', userId));
    await checkedDelete('profiles', supabase.from('profiles').delete().eq('id', userId));

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) return res.status(500).json({ error: 'Data deleted but auth user deletion failed: ' + deleteAuthError.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error during deletion' });
  }
};
