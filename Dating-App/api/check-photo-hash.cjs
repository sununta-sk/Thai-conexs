// api/check-photo-hash.js
// Vercel serverless function — POST /api/check-photo-hash
// Called from ProfileSetup.jsx when a user uploads their main photo. Computes
// a perceptual hash of the image and compares it against banned_photo_hashes
// (populated when an admin bans a user — see UserDetailPage.jsx). Hash
// comparison only — no face-matching AI.
const { createClient } = require('@supabase/supabase-js');
const { computePHash, isMatch } = require('./lib/phash.cjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const hash = await computePHash(buffer);

    const { data: bannedHashes, error } = await supabase
      .from('banned_photo_hashes')
      .select('phash, user_id');
    if (error) throw error;

    const match = (bannedHashes || []).find((row) => isMatch(hash, row.phash));

    if (!match) return res.status(200).json({ blocked: false, phash: hash });

    return res.status(200).json({
      blocked: true,
      reason: 'This photo matches one previously used by a banned account.',
      phash: hash,
    });
  } catch (err) {
    // Fail open — never block a legitimate upload because this check broke.
    console.error('[check-photo-hash] error', err.message);
    return res.status(200).json({ blocked: false });
  }
};
