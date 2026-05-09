// src/hooks/useMobilePreview.js
import { useState, useEffect } from 'react';

const KEY = 'mobilePreviewMode';
const read = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export function useMobilePreview() {
  const [enabled, setEnabled] = useState(read);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setEnabled(e.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const set = (val) => {
    const next = typeof val === 'boolean' ? val : !enabled;
    try {
      if (next) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
    } catch {}
    setEnabled(next);
  };

  return [enabled, set];
}
