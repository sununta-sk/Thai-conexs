// src/hooks/useIsMobile.js
// Single source of truth for mobile mode (real mobile OR Mobile Preview).
// Side effects:
//   - Toggles 'mobile-active' class on <html> while mobile
//   - Injects global CSS overrides for known hardcoded grids
import { useState, useEffect } from 'react';

const PREVIEW_KEY = 'mobilePreviewMode';
const PREVIEW_EVENT = 'mobilePreviewChange';
const BREAKPOINT = 768;

const isPreview = () => {
  try { return localStorage.getItem(PREVIEW_KEY) === '1'; } catch { return false; }
};

const compute = () => {
  if (typeof window === 'undefined') return false;
  return isPreview() || window.innerWidth < BREAKPOINT;
};

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

export function useIsMobile() {
  const [mobile, setMobile] = useState(compute);

  useEffect(() => {
    ensureCSS();
    const update = () => setMobile(compute());
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
    if (mobile) document.documentElement.classList.add(cls);
    else document.documentElement.classList.remove(cls);
    return () => document.documentElement.classList.remove(cls);
  }, [mobile]);

  return mobile;
}
