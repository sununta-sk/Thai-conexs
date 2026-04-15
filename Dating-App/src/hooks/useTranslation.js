// src/hooks/useTranslation.js
// ── Global language hook — ใช้ทุกหน้า ──
// Usage:
//   const { tx, lang, setLang } = useTranslation(['common', 'discover'])

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTMany, SUPPORTED_LANGS } from '../lib/i18n';

export function useTranslation(pages = ['common']) {
  const [lang, setLangState] = useState('en');
  const [tx, setTx]         = useState(getTMany(pages, 'en'));
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    // ── โหลดภาษาจาก Supabase profiles ──
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
      } catch {
        // fallback to 'en'
      } finally {
        setReady(true);
      }
    }

    loadLang();
  }, []);

  // ── เปลี่ยนภาษา + save to Supabase ──
  const setLang = async (newLang) => {
    setLangState(newLang);
    setTx(getTMany(pages, newLang));

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