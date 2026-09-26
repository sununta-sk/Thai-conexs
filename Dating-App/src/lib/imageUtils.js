// src/lib/imageUtils.js
// Supabase Image Transformation helper
// - resizes/compresses via Supabase render endpoint (CDN-cached)
// - returns original URL unchanged for non-Supabase sources (giphy, data:, ui-avatars, external)

export function optimizeImage(url, opts = {}) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('/storage/v1/object/')) return url;
  if (url.includes('/storage/v1/render/image/')) return url;

  const { width = 800, height, resize, quality = 75 } = opts;
  const transformed = url.replace('/storage/v1/object/', '/storage/v1/render/image/');
  const sep = transformed.includes('?') ? '&' : '?';
  let out = transformed + sep + 'width=' + width;
  if (height) out += '&height=' + height;
  if (resize) out += '&resize=' + resize;
  return out + '&quality=' + quality;
}
