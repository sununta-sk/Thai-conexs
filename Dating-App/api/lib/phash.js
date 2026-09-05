// api/lib/phash.js
// Perceptual-hash helpers shared by check-photo-hash.js and the ban-photo
// hashing hook (see admin_users ban flow) — used to detect the same photo
// being re-uploaded on a new account after a ban, tolerant of resizing/
// recompression. Not face-matching — purely a fingerprint of the image.
import { Jimp, compareHashes } from 'jimp';

/**
 * Compute a 64-bit perceptual hash (as a 64-char '0'/'1' string) for an image.
 * @param {Buffer} buffer raw image bytes (jpeg/png/etc.)
 * @returns {Promise<string>}
 */
async function computePHash(buffer) {
  const image = await Jimp.read(buffer);
  return image.pHash();
}

/**
 * Hamming distance between two same-length pHash strings, as a 0–1 fraction
 * of differing bits (0 = identical). Threshold below which we treat two
 * photos as "the same photo" for ban-evasion purposes.
 */
const MATCH_THRESHOLD = 0.1;

function isMatch(hashA, hashB) {
  if (!hashA || !hashB) return false;
  return compareHashes(hashA, hashB) <= MATCH_THRESHOLD;
}

export { computePHash, isMatch, MATCH_THRESHOLD };
