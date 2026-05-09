// src/hooks/useMobilePreview.js
import { useState, useEffect } from 'react';

const KEY = 'mobilePreviewMode';
const EVENT = 'mobilePreviewChange';

const read = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export function useMobilePreview() {
  const [enabled, setEnabled] = useState(read);

  useEffect(() => {
    const onChange = () => setEnabled(read());
    window.addEventListener('storage', onChange);   // cross-tab sync
    window.addEventListener(EVENT, onChange);        // same-tab sync
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  const set = (val) => {
    const next = typeof val === 'boolean' ? val : !read();
    try {
      if (next) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
    } catch {}
    window.dispatchEvent(new Event(EVENT));  // notify same-tab listeners
  };

  return [enabled, set];
}
