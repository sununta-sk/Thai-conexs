import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTMany, SUPPORTED_LANGS } from '../lib/I18';

const LANG_EVENT = 'app:lang-changed';

export function useTranslation(pages = ['common']) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('app_lang') || 'en';
  });
  const [tx, setTx] = useState(getTMany(pages, lang));
  const [ready, setReady] = useState(false);

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
        const userLang = data?.preferred_lang || localStorage.getItem('app_lang') || 'en';
        setLangState(userLang);
        localStorage.setItem('app_lang', userLang);
        setTx(getTMany(pages, userLang));
      } catch {}
      finally { setReady(true); }
    }
    loadLang();
  }, []);

  // Listen for global lang changes from other components
  useEffect(() => {
    const handler = (e) => {
      const newLang = e.detail;
      setLangState(newLang);
      setTx(getTMany(pages, newLang));
    };
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, [pages.join(',')]);

  const setLang = async (newLang) => {
    setLangState(newLang);
    setTx(getTMany(pages, newLang));
    localStorage.setItem('app_lang', newLang);
    // Broadcast to all useTranslation instances
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: newLang }));
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
