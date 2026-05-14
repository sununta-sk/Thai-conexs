// src/hooks/useLang.js
// ดึง preferred_lang ของ current user จาก Supabase
// ใช้ได้ทุกหน้า — ไม่แตะไฟล์เดิม

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useLang() {
  const [lang, setLang] = useState('en'); // default en

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      supabase
        .from('profiles')
        .select('preferred_lang')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.preferred_lang) setLang(data.preferred_lang);
        });
    });
  }, []);

  return lang;
}