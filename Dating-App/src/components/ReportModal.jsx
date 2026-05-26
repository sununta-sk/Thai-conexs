// src/components/ReportModal.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';

const CATEGORIES = {
  en: [
    {
      id: 'inappropriate',
      icon: '\u26D4',
      title: 'Inappropriate Content',
      desc: 'Nudity, sexual content, or harmful imagery',
      reasons: [
        'Nudity or sexual content',
        'Underage user (looks under 18)',
        'Violent or disturbing content',
        'Hate speech or discrimination',
      ],
    },
    {
      id: 'sex_work',
      icon: '\u26A0',
      title: 'Sex Work / Money Requests',
      desc: 'Selling services or asking for money',
      reasons: [
        'Asking for money or financial help',
        'Selling sexual or escort services',
        'Sugar baby / sugar daddy arrangement',
        'Promoting OnlyFans or paid content',
      ],
    },
    {
      id: 'fake_profile',
      icon: '\u2691',
      title: 'Fake Profile / Catfish',
      desc: 'Stolen photos or fake identity',
      reasons: [
        'Using stolen or AI-generated photos',
        'Pretending to be a different person',
        'Bot or automated account',
        'Multiple accounts (duplicate user)',
      ],
    },
    {
      id: 'harassment',
      icon: '\u2716',
      title: 'Harassment / Threatening',
      desc: 'Abusive, threatening, or unsafe behavior',
      reasons: [
        'Verbal abuse or insults',
        'Threats of violence',
        'Stalking or repeated unwanted contact',
        'Sharing private information',
      ],
    },
    {
      id: 'spam',
      icon: '\u2709',
      title: 'Spam / Scam',
      desc: 'Promoting unrelated content or fraud',
      reasons: [
        'Promoting another website or app',
        'Cryptocurrency or investment scam',
        'Phishing for personal information',
        'Repeated unwanted messages',
      ],
    },
    {
      id: 'other',
      icon: '\u2026',
      title: 'Other',
      desc: 'Something else not listed above',
      reasons: [],
    },
  ],
  th: [
    {
      id: 'inappropriate',
      icon: '\u26D4',
      title: 'เนื้อหาไม่เหมาะสม',
      desc: 'รูปโป๊ เนื้อหาทางเพศ หรือภาพอันตราย',
      reasons: [
        'รูปโป๊หรือเนื้อหาทางเพศ',
        'ผู้ใช้อายุต่ำกว่า 18 ปี',
        'ภาพรุนแรงหรือน่ารังเกียจ',
        'คำพูดดูถูก เหยียดเชื้อชาติ',
      ],
    },
    {
      id: 'sex_work',
      icon: '\u26A0',
      title: 'ค้าประเวณี / ขอเงิน',
      desc: 'ขายบริการทางเพศหรือขอเงิน',
      reasons: [
        'ขอเงินหรือความช่วยเหลือทางการเงิน',
        'ขายบริการทางเพศ',
        'ชูการ์เบบี้ / ชูการ์แดดดี้',
        'โปรโมต OnlyFans หรือคอนเทนต์เสียเงิน',
      ],
    },
    {
      id: 'fake_profile',
      icon: '\u2691',
      title: 'โปรไฟล์ปลอม',
      desc: 'รูปขโมยมาหรือตัวตนปลอม',
      reasons: [
        'ใช้รูปขโมยหรือรูปจาก AI',
        'แอบอ้างเป็นคนอื่น',
        'บอทหรือบัญชีอัตโนมัติ',
        'มีหลายบัญชี (ซ้ำ)',
      ],
    },
    {
      id: 'harassment',
      icon: '\u2716',
      title: 'คุกคาม / ข่มขู่',
      desc: 'พฤติกรรมรุนแรง ข่มขู่ หรือไม่ปลอดภัย',
      reasons: [
        'ด่าทอหรือดูถูก',
        'ข่มขู่จะใช้ความรุนแรง',
        'สะกดรอยตามหรือรบกวนซ้ำๆ',
        'เปิดเผยข้อมูลส่วนตัว',
      ],
    },
    {
      id: 'spam',
      icon: '\u2709',
      title: 'สแปม / หลอกลวง',
      desc: 'โปรโมตเนื้อหาอื่นหรือฉ้อโกง',
      reasons: [
        'โปรโมตเว็บไซต์หรือแอปอื่น',
        'หลอกลวงเรื่องคริปโตหรือการลงทุน',
        'หลอกขอข้อมูลส่วนตัว',
        'ส่งข้อความสแปมซ้ำๆ',
      ],
    },
    {
      id: 'other',
      icon: '\u2026',
      title: 'อื่นๆ',
      desc: 'เหตุผลอื่นที่ไม่ได้ระบุข้างต้น',
      reasons: [],
    },
  ],
};

const COPY = {
  en: {
    title: 'Report User',
    subtitle: 'Help us keep the community safe',
    selectCategory: 'Select a category',
    selectReason: 'Select a reason',
    otherPlaceholder: 'Please describe the issue...',
    cancel: 'Cancel',
    submit: 'Submit Report',
    submitting: 'Submitting...',
    success: 'Report submitted successfully',
    successDesc: 'Our team will review this within 24-48 hours.',
    error: 'Failed to submit report',
  },
  th: {
    title: 'รายงานผู้ใช้',
    subtitle: 'ช่วยกันรักษาความปลอดภัยของชุมชน',
    selectCategory: 'เลือกหมวดหมู่',
    selectReason: 'เลือกเหตุผล',
    otherPlaceholder: 'กรุณาอธิบายปัญหา...',
    cancel: 'ยกเลิก',
    submit: 'ส่งรายงาน',
    submitting: 'กำลังส่ง...',
    success: 'ส่งรายงานเรียบร้อย',
    successDesc: 'ทีมงานจะตรวจสอบภายใน 24-48 ชั่วโมง',
    error: 'ส่งรายงานไม่สำเร็จ',
  },
};

export default function ReportModal({ targetUserId, targetUsername, onClose }) {
  const { lang } = useTranslation(['common']);
  const t = COPY[lang === 'th' ? 'th' : 'en'];
  const categories = CATEGORIES[lang === 'th' ? 'th' : 'en'];

  const [openCat, setOpenCat] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [customText, setCustomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!openCat) return;
    const isOther = openCat === 'other';
    if (!isOther && !selectedReason) return;
    if (isOther && !customText.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertErr } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_id: targetUserId,
        category: openCat,
        sub_reason: isOther ? null : selectedReason,
        custom_text: isOther ? customText.trim() : null,
        status: 'pending',
      });

      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = openCat && (
    (openCat === 'other' && customText.trim()) ||
    (openCat !== 'other' && selectedReason)
  );

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose}>{'\u2715'}</button>

        {success ? (
          <div style={S.successWrap}>
            <div style={S.successIcon}>{'\u2713'}</div>
            <h2 style={S.successTitle}>{t.success}</h2>
            <p style={S.successDesc}>{t.successDesc}</p>
          </div>
        ) : (
          <>
            <div style={S.header}>
              <h2 style={S.title}>{t.title}</h2>
              <p style={S.subtitle}>{t.subtitle}</p>
              {targetUsername && (
                <div style={S.targetBox}>
                  <span style={S.targetLabel}>Reporting:</span>
                  <span style={S.targetName}>@{targetUsername}</span>
                </div>
              )}
            </div>

            <div style={S.body}>
              {!openCat && <div style={S.stepHint}>{t.selectCategory}</div>}

              {categories.map((cat) => {
                const isOpen = openCat === cat.id;
                return (
                  <div key={cat.id} style={S.catItem}>
                    <button
                      style={{ ...S.catHeader, ...(isOpen ? S.catHeaderActive : {}) }}
                      onClick={() => {
                        setOpenCat(isOpen ? null : cat.id);
                        setSelectedReason(null);
                        setCustomText('');
                      }}
                    >
                      <span style={S.catIcon}>{cat.icon}</span>
                      <div style={S.catTextWrap}>
                        <div style={S.catTitle}>{cat.title}</div>
                        <div style={S.catDesc}>{cat.desc}</div>
                      </div>
                      <span style={{ ...S.chevron, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                        {'\u25BC'}
                      </span>
                    </button>

                    {isOpen && (
                      <div style={S.catBody}>
                        {cat.id === 'other' ? (
                          <textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder={t.otherPlaceholder}
                            style={S.textarea}
                            rows={4}
                            autoFocus
                          />
                        ) : (
                          <div style={S.reasonList}>
                            <div style={S.reasonHint}>{t.selectReason}</div>
                            {cat.reasons.map((reason) => (
                              <label key={reason} style={S.reasonRow}>
                                <input
                                  type="radio"
                                  name="reason"
                                  checked={selectedReason === reason}
                                  onChange={() => setSelectedReason(reason)}
                                  style={S.radio}
                                />
                                <span style={S.reasonText}>{reason}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <div style={S.errorBox}>{error}</div>}

            <div style={S.footer}>
              <button style={S.cancelBtn} onClick={onClose} disabled={submitting}>
                {t.cancel}
              </button>
              <button
                style={{ ...S.submitBtn, opacity: (canSubmit && !submitting) ? 1 : 0.5, cursor: (canSubmit && !submitting) ? 'pointer' : 'not-allowed' }}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const PINK = '#e91e63';
const PINK_DARK = '#c2185b';
const BG = '#0f172a';
const BG_ELEV = '#1e293b';
const BG_DEEP = '#0a1120';
const BORDER = '#334155';
const TEXT = '#f1f5f9';
const TEXT_SOFT = '#cbd5e1';
const TEXT_MUTED = '#94a3b8';
const RED = '#ef4444';
const GREEN = '#10b981';

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 9500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: BG_ELEV,
    borderRadius: 20,
    maxWidth: 520,
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${BORDER}`,
    boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
    position: 'relative',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${BORDER}`,
    color: TEXT_SOFT,
    fontSize: 14,
    cursor: 'pointer',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: '24px 24px 16px',
    borderBottom: `1px solid ${BORDER}`,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: TEXT,
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    margin: '0 0 12px',
  },
  targetBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  targetLabel: {
    color: TEXT_MUTED,
  },
  targetName: {
    color: PINK,
    fontWeight: 700,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  stepHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  catItem: {
    marginBottom: 8,
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  catHeader: {
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '14px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    color: TEXT,
    textAlign: 'left',
  },
  catHeaderActive: {
    background: 'rgba(233, 30, 99, 0.08)',
  },
  catIcon: {
    fontSize: 18,
    width: 32,
    height: 32,
    background: 'rgba(233, 30, 99, 0.12)',
    border: `1px solid ${PINK}`,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: PINK,
    flexShrink: 0,
  },
  catTextWrap: { flex: 1 },
  catTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: TEXT,
    marginBottom: 2,
  },
  catDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 1.4,
  },
  chevron: {
    fontSize: 10,
    color: TEXT_MUTED,
    transition: 'transform 0.2s',
    flexShrink: 0,
  },
  catBody: {
    padding: '8px 14px 14px',
    background: BG_DEEP,
    borderTop: `1px solid ${BORDER}`,
  },
  reasonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  reasonHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: 600,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  radio: {
    accentColor: PINK,
    cursor: 'pointer',
    width: 16,
    height: 16,
  },
  reasonText: {
    fontSize: 13.5,
    color: TEXT_SOFT,
    lineHeight: 1.4,
  },
  textarea: {
    width: '100%',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '10px 12px',
    color: TEXT,
    fontSize: 13.5,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorBox: {
    margin: '0 20px 12px',
    padding: '10px 12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: `1px solid ${RED}`,
    borderRadius: 8,
    color: RED,
    fontSize: 13,
  },
  footer: {
    display: 'flex',
    gap: 10,
    padding: '14px 20px 18px',
    borderTop: `1px solid ${BORDER}`,
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    color: TEXT_SOFT,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    background: `linear-gradient(135deg, ${PINK}, ${PINK_DARK})`,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    boxShadow: '0 6px 20px rgba(233, 30, 99, 0.4)',
  },
  successWrap: {
    padding: '60px 40px',
    textAlign: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    margin: '0 auto 18px',
    background: GREEN,
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    fontWeight: 900,
    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: TEXT,
    margin: '0 0 8px',
  },
  successDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    margin: 0,
    lineHeight: 1.5,
  },
};
