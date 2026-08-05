// api/scripts/backfill-banned-photo-hashes.js
// One-time backfill: hashes the current photos of every ALREADY-banned/
// suspended account into banned_photo_hashes, so check-photo-hash.js has
// something to compare against for users banned before this feature existed.
// Going forward, UserDetailPage.jsx's ban/suspend action calls
// api/hash-user-photos.js automatically — this script is only for the
// pre-existing backlog.
//
// NOT deployed to Vercel (excluded via .vercelignore) — run this locally:
//   cd api
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-banned-photo-hashes.js
// (or put those two vars in api/.env — dotenv is already a dependency here)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { computePHash } = require('../lib/phash');

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them as env vars or in api/.env.');
    process.exit(1);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, avatar_url, photos, banned_until, ban_reason');
  if (error) { console.error('Failed to fetch profiles:', error.message); process.exit(1); }

  const now = new Date();
  const banned = (profiles || []).filter((p) =>
    (p.banned_until && new Date(p.banned_until) > now) || (!p.banned_until && p.ban_reason)
  );
  console.log(`Found ${banned.length} currently banned/suspended account(s).`);

  let usersProcessed = 0, photosHashed = 0, photosSkipped = 0, photosFailed = 0;

  for (const profile of banned) {
    const urls = new Set();
    if (profile.avatar_url) urls.add(typeof profile.avatar_url === 'string' ? profile.avatar_url : profile.avatar_url.url);
    if (Array.isArray(profile.photos)) {
      for (const p of profile.photos) urls.add(typeof p === 'string' ? p : p?.url);
    }
    if (urls.size === 0) continue;

    for (const url of urls) {
      if (!url) continue;
      try {
        const { data: existing } = await supabase
          .from('banned_photo_hashes')
          .select('id')
          .eq('user_id', profile.id)
          .eq('photo_url', url)
          .maybeSingle();
        if (existing) { photosSkipped++; continue; }

        const resp = await fetch(url);
        if (!resp.ok) { photosFailed++; continue; }
        const buffer = Buffer.from(await resp.arrayBuffer());
        const phash = await computePHash(buffer);
        await supabase.from('banned_photo_hashes').insert({ user_id: profile.id, phash, photo_url: url });
        photosHashed++;
      } catch (e) {
        console.error(`  Failed on ${url}:`, e.message);
        photosFailed++;
      }
    }
    usersProcessed++;
    console.log(`  [${usersProcessed}/${banned.length}] ${profile.id} done`);
  }

  console.log(`\nDone. Users processed: ${usersProcessed}. Photos hashed: ${photosHashed}. Already had a hash: ${photosSkipped}. Failed: ${photosFailed}.`);
}

main().catch((e) => { console.error('Fatal error:', e); process.exit(1); });
