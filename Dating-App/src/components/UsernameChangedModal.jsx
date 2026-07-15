import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';

const BLOCKLIST = ['freelance'];
// TODO: add more prohibited words here as needed (case-insensitive substring match)

const COPY = {
  en: {
    title: 'Your Username Was Changed',
    subtitle: 'An admin has changed your username due to a policy violation.',
    oldLabel: 'Previous username',
    newLabel: 'Choose a new username',
    reasonLabel: 'Reason',
    defaultReason: 'Inappropriate or prohibited username',
    warning: 'Please do not use this username again. Repeating this violation may result in your account being banned.',
    readRules: 'Read Community Rules',
    confirm: 'Confirm New Username',
    placeholder: 'Enter new username...',
    errorBlocklist: 'This username contains a prohibited word.',
    errorDuplicate: 'This username is already taken.',
    errorEmpty: 'Please enter a username.',
  },
  th: {
    title: 'ชื่อผู้ใช้ของคุณถูกเปลี่ยน',
    subtitle: 'แอดมินได้เปลี่ยนชื่อผู้ใช้ของคุณ เนื่องจากละเมิดกฎการใช้งาน',
    oldLabel: 'ชื่อเดิม',
    newLabel: 'เลือกชื่อผู้ใช้ใหม่',
    reasonLabel: 'เหตุผล',
    defaultReason: 'ชื่อผู้ใช้ไม่เหมาะสมหรือเป็นคำต้องห้าม',
    warning: 'โปรดอย่าใช้ชื่อนี้อีก หากทำผิดซ้ำ บัญชีของคุณอาจถูกระงับถาวร (แบน)',
    readRules: 'อ่านกฎการใช้งาน',
    confirm: 'ยืนยันชื่อใหม่',
    placeholder: 'พิมพ์ชื่อผู้ใช้ใหม่...',
    errorBlocklist: 'ชื่อนี้มีคำต้องห้าม กรุณาเปลี่ยนใหม่',
    errorDuplicate: 'ชื่อนี้ถูกใช้ไปแล้ว กรุณาเลือกชื่ออื่น',
    errorEmpty: 'กรุณากรอกชื่อผู้ใช้',
  },
};

export default function UsernameChangedModal({ id, userId, oldUsername, reason }) {
  const { lang } = useTranslation(['common']);
  const t = COPY[lang === 'th' ? 'th' : 'en'];
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReadRules = () => {
    window.open('/rules', '_blank');
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    setError('');
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t.errorEmpty);
      return;
    }
    const lower = trimmed.toLowerCase();
    if (BLOCKLIST.some(w => lower.includes(w))) {
      setError(t.errorBlocklist);
      return;
    }
    setSubmitting(true);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .neq('id', userId)
      .maybeSingle();

    if (existing) {
      setError(t.errorDuplicate);
      setSubmitting(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', userId);

    if (updateErr) {
      setError(updateErr.message);
      setSubmitting(false);
      return;
    }

    await supabase
      .from('user_moderation_actions')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id);

    window.location.reload();
  };

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        <div style={S.iconWrap}>
          <div style={S.icon}>{'\u270F\uFE0F'}</div>
        </div>

        <h2 style={S.title}>{t.title}</h2>
        <p style={S.subtitle}>{t.subtitle}</p>

        <div style={S.box}>
          <div style={S.boxLabel}>{t.oldLabel}</div>
          <div style={S.boxText}>{oldUsername}</div>
        </div>

        <div style={{ ...S.box, marginBottom: 16 }}>
          <div style={S.boxLabel}>{t.reasonLabel}</div>
          <div style={S.boxText}>{reason || t.defaultReason}</div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>{t.newLabel}</label>
          <input
            value={value}
            onChange={handleChange}
            placeholder={t.placeholder}
            style={{ ...S.input, borderColor: error ? '#dc2626' : '#a5f3fc' }}
          />
          {error && <div style={S.errorText}>* {error}</div>}
        </div>

        <p style={S.warningText}>{t.warning}</p>

        <button style={S.secondaryBtn} onClick={handleReadRules}>
          {t.readRules}
        </button>

        <button style={S.primaryBtn} onClick={handleSubmit} disabled={submitting || !value.trim()}>
          {submitting ? '...' : t.confirm}
        </button>
      </div>
    </div>
  );
}

const TEAL = '#0891b2';

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 99998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflowY: 'auto',
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    maxWidth: 420,
    width: '100%',
    padding: '32px 26px 24px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  iconWrap: {
    width: 72,
    height: 72,
    background: '#cffafe',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '3px solid #a5f3fc',
  },
  icon: { fontSize: 32 },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1a1a1a',
    margin: '0 0 6px',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    margin: '0 0 20px',
    lineHeight: 1.6,
  },
  box: {
    background: '#f0fdff',
    border: '1px solid #a5f3fc',
    borderRadius: 12,
    padding: '10px 14px',
    marginBottom: 10,
    textAlign: 'left',
  },
  boxLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 4,
  },
  boxText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  formGroup: { textAlign: 'left', marginBottom: 16 },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#f0fdff',
    border: '2px solid #a5f3fc',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12.5,
    fontWeight: 700,
    marginTop: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: 600,
    lineHeight: 1.5,
    margin: '4px 0 20px',
  },
  secondaryBtn: {
    width: '100%',
    background: 'transparent',
    color: TEAL,
    border: `2px solid ${TEAL}`,
    padding: '11px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 10,
  },
  primaryBtn: {
    width: '100%',
    background: TEAL,
    color: '#fff',
    border: 'none',
    padding: '13px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(8, 145, 178, 0.3)',
  },
};
