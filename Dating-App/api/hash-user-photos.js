// api/hash-user-photos.js
// Vercel serverless function — POST /api/hash-user-photos
// Called from UserDetailPage.jsx right after a ban/suspend action succeeds.
// Downloads the target user's current photos (avatar_url + photos[]), computes
// a perceptual hash for each, and stores them in banned_photo_hashes so a new
// signup re-uploading the same photo gets caught by check-photo-hash.js.
// Admin-gated the same way as delete-account.js.
import { createClient } from '@supabase/supabase-js';
import { computePHash } from './lib/phash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.replace('Bearer ', '');

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, photos')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return res.status(404).json({ error: 'User not found' });

    const urls = new Set();
    if (profile.avatar_url) urls.add(typeof profile.avatar_url === 'string' ? profile.avatar_url : profile.avatar_url.url);
    if (Array.isArray(profile.photos)) {
      for (const p of profile.photos) urls.add(typeof p === 'string' ? p : p?.url);
    }

    let hashed = 0;
    for (const url of urls) {
      if (!url) continue;
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const buffer = Buffer.from(await resp.arrayBuffer());
        const phash = await computePHash(buffer);
        await supabase.from('banned_photo_hashes').insert({ user_id: userId, phash, photo_url: url });
        hashed++;
      } catch (e) {
        console.error('[hash-user-photos] failed on', url, e.message);
      }
    }

    return res.status(200).json({ success: true, hashed });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error hashing photos' });
  }
}
