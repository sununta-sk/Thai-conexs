// src/hooks/useIsMobile.js
// Single source of truth for responsive tier (real mobile OR Mobile Preview).
//
// Tiers:
//   'mobile'  — width < 768   (unchanged from the original binary threshold)
//   'laptop'  — 768–1439      (new: previously lumped in with 'desktop')
//   'desktop' — >= 1440
//
// Side effects (only while tier === 'mobile', unchanged from before):
//   - Toggles 'mobile-active' class on <html>
//   - Injects global CSS overrides for known hardcoded grids
import { useState, useEffect } from 'react';

const PREVIEW_KEY = 'mobilePreviewMode';
const PREVIEW_EVENT = 'mobilePreviewChange';
export const MOBILE_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1440;

const isPreview = () => {
  try { return localStorage.getItem(PREVIEW_KEY) === '1'; } catch { return false; }
};

// Plain (non-hook) tier read — safe to call from effects/callbacks outside
// component render, where hooks can't be used. Mirrors the hook's own logic
// exactly so there's one source of truth for the thresholds.
export function getViewportTier() {
  if (typeof window === 'undefined') return 'desktop';
  if (isPreview()) return 'mobile';
  const w = window.innerWidth;
  if (w < MOBILE_BREAKPOINT) return 'mobile';
  if (w < DESKTOP_BREAKPOINT) return 'laptop';
  return 'desktop';
}

// Inject CSS rules once
function ensureCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mobile-active-overrides')) return;
  const style = document.createElement('style');
  style.id = 'mobile-active-overrides';
  style.textContent = `
    /* Hardcoded 5-col card grid -> 3 cols on mobile */
    .mobile-active [style*="repeat(5, 1fr)"] {
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
    }
    /* Hardcoded fixed-width grids -> 3 cols on mobile */
    .mobile-active [style*="repeat(6, 130px)"] {
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
    }
  `;
  document.head.appendChild(style);
}

// Returns 'mobile' | 'laptop' | 'desktop', live-updating on resize/preview
// toggle. New call sites that need to treat 13"-laptop widths differently
// from large-desktop widths should use this instead of the binary hooks
// below.
export function useViewportTier() {
  const [tier, setTier] = useState(getViewportTier);

  useEffect(() => {
    ensureCSS();
    const update = () => setTier(getViewportTier());
    window.addEventListener('resize', update);
    window.addEventListener('storage', update);
    window.addEventListener(PREVIEW_EVENT, update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('storage', update);
      window.removeEventListener(PREVIEW_EVENT, update);
    };
  }, []);

  useEffect(() => {
    const cls = 'mobile-active';
    if (tier === 'mobile') document.documentElement.classList.add(cls);
    else document.documentElement.classList.remove(cls);
    return () => document.documentElement.classList.remove(cls);
  }, [tier]);

  return tier;
}

// Unchanged binary signal — every existing call site (Navbar, Discover,
// Messages, GlobalToast, admin pages, etc.) keeps working exactly as before:
// true below 768px (or Mobile Preview on), false at 768px and above.
export function useIsMobile() {
  return useViewportTier() === 'mobile';
}

// Replaces the old per-file `useIsDesktop(900)` duplicated in RoomChat.jsx,
// ProfileSetup.jsx and AccountSettings.jsx. Those each had their own
// independent 900px threshold, disagreeing with the 768px used everywhere
// else in the app (including this hook) for the 768–899px range. This now
// resolves to the same 768px boundary as useIsMobile, so "desktop" here
// means "not mobile" consistently app-wide — true at 768px and above,
// including both the 'laptop' and 'desktop' tiers.
export function useIsDesktop() {
  return useViewportTier() !== 'mobile';
}
