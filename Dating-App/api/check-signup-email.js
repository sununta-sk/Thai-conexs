// api/check-signup-email.js
// Vercel serverless function — POST /api/check-signup-email
// Public (pre-auth) endpoint called from Register.jsx before supabase.auth.signUp.
// Returns whether this email belongs to a currently-banned account, and why,
// so signup can show a clear message instead of a generic error.
//
// "Currently banned" = profiles.banned_until is set and in the future. The
// admin ban action (UserDetailPage.jsx) sets banned_until to a far-future
// sentinel (2099-01-01) for permanent bans and a real date for suspensions —
// both are covered by this same "in the future" check.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data } = await supabase
      .from('profiles')
      .select('banned_until, ban_reason')
      .ilike('email', email.trim())
      .maybeSingle();

    const now = new Date();
    const isBanned = !!data && (
      (data.banned_until && new Date(data.banned_until) > now) ||
      (!data.banned_until && data.ban_reason)
    );

    if (!isBanned) return res.status(200).json({ blocked: false });

    const isPermanent = !data.banned_until || new Date(data.banned_until).getUTCFullYear() >= 2099;
    return res.status(200).json({
      blocked: true,
      permanent: isPermanent,
      bannedUntil: data.banned_until,
      reason: data.ban_reason || 'Violation of terms of service',
    });
  } catch (err) {
    // Fail open on unexpected errors — never block a legitimate signup because
    // this check itself broke.
    console.error('[check-signup-email] error', err.message);
    return res.status(200).json({ blocked: false });
  }
}
