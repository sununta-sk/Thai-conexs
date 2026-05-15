// src/hooks/useTranslation.js
// ── Global language hook — ใช้ทุกหน้า ──
// Usage:
//   const { tx, lang, setLang } = useTranslation(['common', 'discover'])
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTMany, SUPPORTED_LANGS } from '../lib/I18';

const LANG_EVENT = 'app-lang-change';

export function useTranslation(pages = ['common']) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('app_lang') || 'en'; } catch { return 'en'; }
  });
  const [tx, setTx] = useState(() => {
    try { return getTMany(pages, localStorage.getItem('app_lang') || 'en'); } catch { return getTMany(pages, 'en'); }
  });
  const [ready, setReady] = useState(false);

  // โหลดภาษาจาก Supabase ตอนเริ่ม
  useEffect(() => {
    async function loadLang() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setReady(true); return; }
        const { data } = await supabase
          .from('profiles')
          .select('preferred_lang')
          .eq('id', user.id)
          .maybeSingle();
        const userLang = data?.preferred_lang || 'en';
        setLangState(userLang);
        setTx(getTMany(pages, userLang));
        try { localStorage.setItem('app_lang', userLang); } catch {}
      } catch {
        // fallback to 'en'
      } finally {
        setReady(true);
      }
    }
    loadLang();
  }, []);

  // ฟัง event จาก setLang ของ instance อื่น
  useEffect(() => {
    const handler = (e) => {
      const newLang = e.detail;
      setLangState(newLang);
      setTx(getTMany(pages, newLang));
    };
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);

  // เปลี่ยนภาษา + save + broadcast ให้ instance อื่น
  const setLang = async (newLang) => {
    setLangState(newLang);
    setTx(getTMany(pages, newLang));
    try { localStorage.setItem('app_lang', newLang); } catch {}
    // broadcast ให้ component อื่นรู้
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: newLang }));
    // save to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles')
          .update({ preferred_lang: newLang })
          .eq('id', user.id);
      }
    } catch {}
  };

  return { tx, lang, setLang, ready, SUPPORTED_LANGS };
}

export default useTranslation;