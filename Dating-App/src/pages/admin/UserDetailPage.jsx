// src/pages/admin/UserDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/AdminLayout';

const TABS = ['Profile', 'Subscription', 'Moderation History'];

const ACTION_CONFIG = {
  warn:    { label: 'Warn',    icon: '⚠️', color: '#f59e0b', desc: 'ส่ง warning ให้ user ทราบ (account ยังใช้งานได้)' },
  suspend: { label: 'Suspend', icon: '⏸️', color: '#f97316', desc: 'ระงับบัญชีชั่วคราว (กำหนดวันหมดได้)' },
  ban:     { label: 'Ban',     icon: '🚫', color: '#ef4444', desc: 'แบนบัญชีถาวร (user เข้าไม่ได้)' },
  restore: { label: 'Restore', icon: '✅', color: '#10b981', desc: 'คืนสถานะ account ให้เป็นปกติ' },
  note:    { label: 'Note',    icon: '📝', color: '#3b82f6', desc: 'เพิ่ม internal note (ไม่แจ้ง user)' },
};

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [tab, setTab]             = useState('Profile');
  const [profile, setProfile]     = useState(null);
  const [subs, setSubs]           = useState([]);
  const [modHistory, setModHistory] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Modal state
  const [modal, setModal]         = useState(null); // { action: 'warn'|'suspend'|'ban'|'restore'|'note' }
  const [reason, setReason]       = useState('');
  const [msgToUser, setMsgToUser] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]         = useState(null);

  useEffect(() => { fetchAll(); }, [userId]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchSubs(), fetchModHistory()]);
    setLoading(false);
  }

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data);
  }

  async function fetchSubs() {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(name, display_name, price_monthly)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setSubs(data || []);
  }

  async function fetchModHistory() {
    const { data } = await supabase
      .from('user_moderation_actions')
      .select('*')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false });
    setModHistory(data || []);
  }

  function openModal(action) {
    setReason('');
    setMsgToUser('');
    setSuspendDays(7);
    setModal({ action });
  }

  function closeModal() {
    if (submitting) return;
    setModal(null);
  }

  async function submitAction() {
    if (!reason.trim() && modal.action !== 'restore') return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert moderation action log
      const expiresAt = modal.action === 'suspend'
        ? new Date(Date.now() + suspendDays * 86400000).toISOString()
        : null;

      const { error: logErr } = await supabase.from('user_moderation_actions').insert({
        target_user_id: userId,
        admin_user_id:  user.id,
        action_type:    modal.action,
        reason:         reason.trim() || null,
        message_to_user: msgToUser.trim() || null,
        expires_at:     expiresAt,
      });

      if (logErr) throw logErr;

      // 2. Update profile status
      if (modal.action !== 'note') {
        const statusMap = { warn: 'active', suspend: 'suspended', ban: 'banned', restore: 'active' };
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ account_status: statusMap[modal.action] })
          .eq('id', userId);
        if (profileErr) throw profileErr;
      }

      showToast(`✅ ${ACTION_CONFIG[modal.action].label} สำเร็จ`, 'success');
      closeModal();
      fetchAll();
    } catch (err) {
      showToast(`❌ An error occurred: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const accountStatus = profile?.account_status || 'active';
  const actionColor = { warn: '#f59e0b', suspend: '#f97316', ban: '#ef4444', restore: '#10b981', note: '#3b82f6' };

  if (loading) return <AdminLayout><div style={S.loading}>Loading...</div></AdminLayout>;
  if (!profile) return <AdminLayout><div style={S.loading}>User not found</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={S.page}>

        {/* Toast */}
        {toast && (
          <div style={{ ...S.toast, background: toast.type === 'success' ? '#10b98122' : '#ef444422', borderColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
            {toast.msg}
          </div>
        )}

        {/* Back */}
        <button onClick={() => navigate('/admin/users')} style={S.backBtn}>← Back to Users</button>

        {/* User Header */}
        <div style={S.userHeader}>
          <img src={profile.avatar_url || 'https://via.placeholder.com/72'} style={S.avatar} alt="avatar" />
          <div style={{ flex: 1 }}>
            <h2 style={S.username}>{profile.username || 'Anonymous'}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={S.infoBadge}>🆔 {profile.id.slice(0,8)}...</span>
              {profile.is_verified && <span style={{ ...S.infoBadge, color: '#10b981' }}>✅ Verified</span>}
              <span style={S.infoBadge}>{profile.subscription_plan?.toUpperCase() || 'FREE'}</span>
              <span style={S.infoBadge}>Joined {new Date(profile.created_at).toLocaleDateString('en-GB')}</span>
              <AccountStatusBadge status={accountStatus} />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={S.actionGroup}>
            {accountStatus !== 'banned' && (
              <>
                <ActionBtn cfg={ACTION_CONFIG.warn}    onClick={() => openModal('warn')} />
                <ActionBtn cfg={ACTION_CONFIG.suspend} onClick={() => openModal('suspend')} />
                <ActionBtn cfg={ACTION_CONFIG.ban}     onClick={() => openModal('ban')} />
              </>
            )}
            {(accountStatus === 'suspended' || accountStatus === 'banned') && (
              <ActionBtn cfg={ACTION_CONFIG.restore} onClick={() => openModal('restore')} />
            )}
            <ActionBtn cfg={ACTION_CONFIG.note} onClick={() => openModal('note')} />
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...S.tabBtn, ...(tab === t ? S.tabBtnActive : {}) }}>
              {t}
              {t === 'Moderation History' && modHistory.length > 0 && (
                <span style={S.tabBadge}>{modHistory.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={S.tabContent}>

          {tab === 'Profile' && (
            <div style={S.card}>
              <Row label="Username"  value={profile.username} />
              <Row label="Gender"    value={profile.gender} />
              <Row label="Age"       value={profile.age} />
              <Row label="Height"    value={profile.height ? `${profile.height} cm` : null} />
              <Row label="Weight"    value={profile.weight ? `${profile.weight} kg` : null} />
              <Row label="Education" value={profile.education} />
              <Row label="Language"  value={profile.preferred_lang} />
              <Row label="Verified"  value={profile.is_verified ? 'Yes ✅' : 'No ❌'} />
              <Row label="Status"    value={accountStatus.toUpperCase()} />
              {profile.photos?.length > 0 && (
                <div style={{ marginTop: 16, paddingBottom: 12 }}>
                  <div style={S.rowLabel}>Photos</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {profile.photos.map((p, i) => (
                      <img key={i} src={typeof p === 'string' ? p : p?.url} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid #334155' }} alt="" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'Subscription' && (
            <div style={S.card}>
              {subs.length === 0 ? (
                <div style={S.empty}>No subscription history</div>
              ) : subs.map(s => (
                <div key={s.id} style={S.subRow}>
                  <div>
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{s.subscription_plans?.display_name || s.plan_id}</span>
                    <span style={{ ...S.statusBadge, background: s.status === 'active' ? '#10b98122' : '#47556922', color: s.status === 'active' ? '#10b981' : '#475569', marginLeft: 8 }}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    {new Date(s.current_period_start).toLocaleDateString('en-GB')} → {new Date(s.current_period_end).toLocaleDateString('en-GB')}
                    {s.amount_paid && <span style={{ marginLeft: 8, color: '#10b981' }}>${s.amount_paid}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Moderation History' && (
            <div style={S.card}>
              {modHistory.length === 0 ? (
                <div style={S.empty}>No moderation history</div>
              ) : modHistory.map(m => (
                <div key={m.id} style={S.modRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...S.statusBadge, background: `${actionColor[m.action_type]}22`, color: actionColor[m.action_type] || '#94a3b8' }}>
                      {ACTION_CONFIG[m.action_type]?.icon} {m.action_type}
                    </span>
                    {m.expires_at && <span style={{ color: '#64748b', fontSize: 11 }}>Expires {new Date(m.expires_at).toLocaleDateString('en-GB')}</span>}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>{m.reason}</div>
                  {m.message_to_user && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>"{m.message_to_user}"</div>}
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString('en-GB')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Action Modal ── */}
      {modal && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ ...S.modalHeader, borderBottom: `2px solid ${ACTION_CONFIG[modal.action].color}22` }}>
              <span style={{ fontSize: 22 }}>{ACTION_CONFIG[modal.action].icon}</span>
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 16 }}>
                  {ACTION_CONFIG[modal.action].label} User
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {ACTION_CONFIG[modal.action].desc}
                </div>
              </div>
              <button onClick={closeModal} style={S.closeBtn}>✕</button>
            </div>

            {/* Target user info */}
            <div style={S.modalTarget}>
              <img src={profile.avatar_url || 'https://via.placeholder.com/36'} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{profile.username || 'Anonymous'}</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{profile.id.slice(0, 16)}...</div>
              </div>
            </div>

            {/* Suspend duration */}
            {modal.action === 'suspend' && (
              <div style={S.formGroup}>
                <label style={S.label}>Suspend for how many days</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 3, 7, 14, 30].map(d => (
                    <button key={d} onClick={() => setSuspendDays(d)}
                      style={{ ...S.dayChip, ...(suspendDays === d ? { background: `${ACTION_CONFIG.suspend.color}33`, color: ACTION_CONFIG.suspend.color, borderColor: ACTION_CONFIG.suspend.color } : {}) }}>
                      {d}d
                    </button>
                  ))}
                  <input type="number" value={suspendDays} onChange={e => setSuspendDays(Number(e.target.value))} min={1}
                    style={{ ...S.input, width: 60, textAlign: 'center' }} />
                </div>
              </div>
            )}

            {/* Reason */}
            {modal.action !== 'restore' && (
              <div style={S.formGroup}>
                <label style={S.label}>
                  Reason (internal) {modal.action !== 'note' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder={modal.action === 'note' ? 'บันทึกภายใน...' : 'ระบุเหตุผล...'}
                  style={S.textarea} />
              </div>
            )}

            {/* Message to user */}
            {(modal.action === 'warn' || modal.action === 'ban' || modal.action === 'suspend') && (
              <div style={S.formGroup}>
                <label style={S.label}>Message to user (optional)</label>
                <textarea value={msgToUser} onChange={e => setMsgToUser(e.target.value)} rows={2}
                  placeholder="Message user will see..."
                  style={S.textarea} />
              </div>
            )}

            {/* Confirm warning for ban */}
            {modal.action === 'ban' && (
              <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444', marginBottom: 16 }}>
                ⚠️ การ Ban เป็นการถาวร — user จะไม่สามารถเข้าระบบได้จนกว่าจะ Restore
              </div>
            )}

            {/* Restore info */}
            {modal.action === 'restore' && (
              <div style={{ background: '#10b98111', border: '1px solid #10b98133', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#10b981', marginBottom: 16 }}>
                คืนสถานะ account ของ <strong>{profile.username}</strong> กลับเป็น active
              </div>
            )}

            {/* Buttons */}
            <div style={S.modalFooter}>
              <button onClick={closeModal} style={S.cancelBtn} disabled={submitting}>Cancel</button>
              <button
                onClick={submitAction}
                disabled={submitting || (!reason.trim() && modal.action !== 'restore' && modal.action !== 'note')}
                style={{ ...S.confirmBtn, background: ACTION_CONFIG[modal.action].color, opacity: (submitting || (!reason.trim() && modal.action !== 'restore' && modal.action !== 'note')) ? 0.5 : 1 }}>
                {submitting ? 'Processing...' : `ยืนยัน ${ACTION_CONFIG[modal.action].label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function AccountStatusBadge({ status }) {
  const map = {
    active:    { color: '#10b981', label: 'Active' },
    suspended: { color: '#f97316', label: 'Suspended' },
    banned:    { color: '#ef4444', label: 'Banned' },
    warned:    { color: '#f59e0b', label: 'Warned' },
  };
  const cfg = map[status] || map.active;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, background: `${cfg.color}22`, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      ● {cfg.label}
    </span>
  );
}

function ActionBtn({ cfg, onClick }) {
  return (
    <button onClick={onClick} style={{ ...S.actionBtn, borderColor: `${cfg.color}44`, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </button>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
      <div style={S.rowLabel}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 14 }}>{value}</div>
    </div>
  );
}

const S = {
  page:        { padding: 24 },
  loading:     { padding: 60, textAlign: 'center', color: '#475569' },
  backBtn:     { background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginBottom: 20, fontWeight: 600 },
  userHeader:  { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24, background: '#1e293b', padding: 20, borderRadius: 16, border: '1px solid #334155', flexWrap: 'wrap' },
  avatar:      { width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #334155', flexShrink: 0 },
  username:    { color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0 },
  infoBadge:   { padding: '3px 10px', borderRadius: 20, background: '#0f172a', color: '#64748b', fontSize: 11, fontWeight: 600 },
  actionGroup: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' },
  actionBtn:   { padding: '7px 14px', borderRadius: 8, border: '1px solid', background: 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' },
  tabBar:      { display: 'flex', gap: 4, marginBottom: 16 },
  tabBtn:      { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tabBtnActive:{ background: '#e91e6322', color: '#e91e63', borderColor: '#e91e6344' },
  tabBadge:    { background: '#334155', color: '#94a3b8', borderRadius: 20, padding: '1px 7px', fontSize: 11 },
  tabContent:  {},
  card:        { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', padding: '8px 20px' },
  rowLabel:    { color: '#475569', fontSize: 13, fontWeight: 600, width: 140, flexShrink: 0 },
  subRow:      { padding: '12px 0', borderBottom: '1px solid #0f172a' },
  modRow:      { padding: '12px 0', borderBottom: '1px solid #0f172a' },
  statusBadge: { padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  empty:       { padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 },
  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox:    { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 20px 16px' },
  closeBtn:    { background: 'none', border: 'none', color: '#475569', fontSize: 18, cursor: 'pointer', marginLeft: 'auto', lineHeight: 1 },
  modalTarget: { display: 'flex', alignItems: 'center', gap: 10, background: '#0f172a', margin: '0 20px 16px', padding: '10px 14px', borderRadius: 10 },
  formGroup:   { padding: '0 20px 16px' },
  label:       { display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  input:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, padding: '8px 12px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea:    { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, padding: '8px 12px', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
  dayChip:     { padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  modalFooter: { display: 'flex', gap: 10, padding: '16px 20px', borderTop: '1px solid #0f172a', justifyContent: 'flex-end' },
  cancelBtn:   { padding: '9px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  confirmBtn:  { padding: '9px 20px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  toast:       { position: 'fixed', top: 20, right: 20, zIndex: 2000, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontWeight: 600, fontSize: 13 },
};