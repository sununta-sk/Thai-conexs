// src/lib/zoomCursor.js
// "Click to enlarge" affordance for photos, built from SK's Phosphor
// magnifying-glass-plus icon (same path as MagnifyingGlassPlusIcon in
// components/Icons.jsx, which imports it from here).

export const MAGNIFY_PLUS_PATH = 'M152,112a8,8,0,0,1-8,8H120v24a8,8,0,0,1-16,0V120H80a8,8,0,0,1,0-16h24V80a8,8,0,0,1,16,0v24h24A8,8,0,0,1,152,112Zm77.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88.11,88.11,0,1,1,11.31-11.31l50.07,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z';

// Hover cursor for enlargeable photos (desktop/mouse). 40px - bigger than
// the browser's own ~16-24px zoom-in cursor so it's easy to spot - white
// with a dark outline + a soft glow so it reads on any photo. Hotspot
// (18,18) sits in the lens centre. Falls back to the built-in zoom-in.
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-12 -12 280 280">' +
  '<path d="' + MAGNIFY_PLUS_PATH + '" fill="#ffffff" stroke="#0f172a" stroke-width="22" stroke-linejoin="round" paint-order="stroke"/>' +
  '</svg>';
export const ZOOM_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 18 18, zoom-in`;

// True on devices whose primary pointer can hover (mouse/trackpad): they get
// ZOOM_CURSOR; touch screens get components/PhotoZoomButton instead. Read
// once at load - it doesn't change during a session in practice.
export const CAN_HOVER = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;
