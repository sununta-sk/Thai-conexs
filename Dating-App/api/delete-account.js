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
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
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

  try {
    const { data: avatarFiles } = await supabase.storage.from('avatars').list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      await supabase.storage.from('avatars').remove(avatarFiles.map((f) => userId + '/' + f.name));
    }
    const { data: faceFiles } = await supabase.storage.from('avatars').list('face-verify/' + userId);
    if (faceFiles && faceFiles.length > 0) {
      await supabase.storage.from('avatars').remove(faceFiles.map((f) => 'face-verify/' + userId + '/' + f.name));
    }

    await supabase.from('messages').delete().or('chat_id.like.' + userId + '_%,chat_id.like.%_' + userId);
    await supabase.from('user_likes').delete().eq('liker_id', userId);
    await supabase.from('user_likes').delete().eq('liked_id', userId);
    await supabase.from('user_passes').delete().eq('passer_id', userId);
    await supabase.from('user_passes').delete().eq('passed_id', userId);
    await supabase.from('user_blocks').delete().eq('blocker_id', userId);
    await supabase.from('user_blocks').delete().eq('blocked_id', userId);
    await supabase.from('user_reports').delete().eq('reporter_id', userId);
    await supabase.from('user_reports').delete().eq('reported_id', userId);
    await supabase.from('content_reports').delete().eq('reporter_id', userId);
    await supabase.from('content_reports').delete().eq('reported_user_id', userId);
    await supabase.from('profile_views').delete().eq('viewer_id', userId);
    await supabase.from('profile_views').delete().eq('viewed_id', userId);
    await supabase.from('photo_moderation_queue').delete().eq('user_id', userId);
    await supabase.from('profile_videos').delete().eq('user_id', userId);
    await supabase.from('user_subscriptions').delete().eq('user_id', userId);

    const { data: tickets } = await supabase.from('support_tickets').select('id').eq('user_id', userId);
    if (tickets && tickets.length > 0) {
      const ticketIds = tickets.map((t) => t.id);
      await supabase.from('ticket_messages').delete().in('ticket_id', ticketIds);
      await supabase.from('support_tickets').delete().eq('user_id', userId);
    }

    await supabase.from('user_moderation_actions').delete().eq('target_user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) return res.status(500).json({ error: 'Data deleted but auth user deletion failed: ' + deleteAuthError.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error during deletion' });
  }
}
