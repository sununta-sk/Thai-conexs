// src/pages/admin/UserDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/AdminLayout';

const TABS = ['Profile', 'Subscription', 'Moderation History'];

const ACTION_CONFIG = {
  warn:    { label: 'Warn',    icon: '⚠️', color: '#f59e0b', desc: 'Send a warning to the user (account remains active)' },
  suspend: { label: 'Suspend', icon: '⏸️', color: '#f97316', desc: 'Temporarily suspend the account (set duration)' },
  ban:     { label: 'Ban',     icon: '🚫', color: '#ef4444', desc: 'Permanently ban the account (user cannot log in)' },
  restore: { label: 'Restore', icon: '✅', color: '#10b981', desc: 'Restore account to active status' },
  note:    { label: 'Note',    icon: '📝', color: '#3b82f6', desc: 'Add internal note (user is not notified)' },
  verify:  { label: 'Verify',  icon: '✓',  color: '#4fc3f7', desc: 'Verify the user identity (adds verified badge)' },
};

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [tab, setTab]             = useState('Profile');
  const [profile, setProfile]     = useState(null);
  const [subs, setSubs]           = useState([]);
  const [modHistory, setModHistory] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [modal, setModal]         = useState(null);
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
    if (!reason.trim() && modal.action !== 'restore' && modal.action !== 'verify') return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // ── Verify action ──
      if (modal.action === 'verify') {
        const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', userId);
        if (error) throw error;
        showToast('✅ Verified successfully', 'success');
        closeModal();
        fetchAll();
        return;
      }

      let expiresAt = null;
      if (modal.action === 'suspend') {
        expiresAt = new Date(Date.now() + suspendDays * 86400000).toISOString();
      } else if (modal.action === 'warn') {
        // Escalating: 30min -> 1hr -> 2hr -> 4hr (cap)
        const { count: prevWarns } = await supabase
          .from('user_moderation_actions')
          .select('*', { count: 'exact', head: true })
          .eq('target_user_id', userId)
          .eq('action_type', 'warn');
        const minutes = [30, 60, 120, 240][prevWarns ?? 0] ?? 240;
        expiresAt = new Date(Date.now() + minutes * 60000).toISOString();
      }

      const { error: logErr } = await supabase.from('user_moderation_actions').insert({
        target_user_id: userId,
        admin_user_id:  user.id,
        action_type:    modal.action,
        reason:         reason.trim() || null,
        message_to_user: msgToUser.trim() || null,
        expires_at:     expiresAt,
      });

      if (logErr) throw logErr;

      if (modal.action !== 'note') {
        const statusMap = { warn: 'active', suspend: 'suspended', ban: 'banned', restore: 'active' };
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ account_status: statusMap[modal.action] })
          .eq('id', userId);
        if (profileErr) throw profileErr;
      }

      showToast(`✅ ${ACTION_CONFIG[modal.action].label} successful`, 'success');
      closeModal();
      fetchAll();
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const accountStatus = profile?.account_status || 'active';
  const actionColor = { warn: '#f59e0b', suspend: '#f97316', ban: '#ef4444', restore: '#10b981', note: '#3b82f6', verify: '#4fc3f7' };

  if (loading) return <AdminLayout><div style={S.loading}>Loading...</div></AdminLayout>;
  if (!profile) return <AdminLayout><div style={S.loading}>User not found</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={S.page}>

        {toast && (
          <div style={{ ...S.toast, background: toast.type === 'success' ? '#10b98122' : '#ef444422', borderColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
            {toast.msg}
          </div>
        )}

        <button onClick={() => navigate('/admin/users')} style={S.backBtn}>← Back to Users</button>

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
            {!profile.is_verified && (
              <ActionBtn cfg={ACTION_CONFIG.verify} onClick={() => openModal('verify')} />
            )}
            <ActionBtn cfg={ACTION_CONFIG.note} onClick={() => openModal('note')} />
          </div>
        </div>

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

        <div style={S.tabContent}>

          {tab === 'Profile' && (
            <div style={S.card}>
              <Row label="Username"  value={profile.username} />
              <Row label="Email"     value={profile.email} />
              <Row label="Gender"    value={profile.gender} />
              <Row label="Age"       value={profile.age} />
              <Row label="Height"    value={profile.height ? `${profile.height} cm` : null} />
              <Row label="Weight"    value={profile.weight ? `${profile.weight} kg` : null} />
              <Row label="Education" value={profile.education} />
              <Row label="Language"  value={profile.preferred_lang} />
              <Row label="Verified"  value={profile.is_verified ? 'Yes ✅' : 'No ❌'} />
              <Row label="Status"    value={accountStatus.toUpperCase()} />
              {(() => {
                function extractPhotoUrl(p) {
    if (!p) return null;
    if (typeof p === 'string') {
      // Try parsing JSON string (some photos stored as JSON)
      if (p.trim().startsWith('{')) {
        try { return JSON.parse(p)?.url || null; } catch { return null; }
      }
      return p.startsWith('http') ? p : null;
    }
    if (typeof p === 'object') return p.url || p.path || null;
    return null;
  }
  const validPhotos = (profile.photos || []).map(extractPhotoUrl).filter(Boolean);
                if (validPhotos.length === 0) {
                  return (
                    <div style={{ marginTop: 16, paddingBottom: 12 }}>
                      <div style={S.rowLabel}>Photos</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>No photos uploaded</div>
                    </div>
                  );
                }
                return (
                  <div style={{ marginTop: 16, paddingBottom: 12 }}>
                    <div style={S.rowLabel}>Photos ({validPhotos.length})</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {validPhotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid #334155', cursor: 'pointer' }} alt="" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}
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

      {modal && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
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

            <div style={S.modalTarget}>
              <img src={profile.avatar_url || 'https://via.placeholder.com/36'} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{profile.username || 'Anonymous'}</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{profile.id.slice(0, 16)}...</div>
              </div>
            </div>

            {/* Verify info */}
            {modal.action === 'verify' && (
              <div style={{ background: '#4fc3f711', border: '1px solid #4fc3f733', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4fc3f7', margin: '0 20px 16px' }}>
                Verify <strong>{profile.username}</strong> — they will receive a ✓ badge next to their name
              </div>
            )}

            {modal.action === 'suspend' && (
              <div style={S.formGroup}>
                <label style={S.label}>Suspend duration (days)</label>
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

            {modal.action !== 'restore' && modal.action !== 'verify' && (
              <div style={S.formGroup}>
                <label style={S.label}>
                  Reason (internal) {modal.action !== 'note' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder={modal.action === 'note' ? 'Internal note...' : 'Enter reason...'}
                  style={S.textarea} />
              </div>
            )}

            {(modal.action === 'warn' || modal.action === 'ban' || modal.action === 'suspend') && (
              <div style={S.formGroup}>
                <label style={S.label}>Message to user (optional)</label>
                <textarea value={msgToUser} onChange={e => setMsgToUser(e.target.value)} rows={2}
                  placeholder="Message the user will see..."
                  style={S.textarea} />
              </div>
            )}

            {modal.action === 'ban' && (
              <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444', marginBottom: 16 }}>
                ⚠️ Banning is permanent — the user cannot log in until restored
              </div>
            )}

            {modal.action === 'restore' && (
              <div style={{ background: '#10b98111', border: '1px solid #10b98133', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#10b981', marginBottom: 16 }}>
                Restore <strong>{profile.username}</strong> account back to active
              </div>
            )}

            <div style={S.modalFooter}>
              <button onClick={closeModal} style={S.cancelBtn} disabled={submitting}>Cancel</button>
              <button
                onClick={submitAction}
                disabled={submitting || (!reason.trim() && modal.action !== 'restore' && modal.action !== 'note' && modal.action !== 'verify')}
                style={{ ...S.confirmBtn, background: ACTION_CONFIG[modal.action].color, opacity: (submitting || (!reason.trim() && modal.action !== 'restore' && modal.action !== 'note' && modal.action !== 'verify')) ? 0.5 : 1 }}>
                {submitting ? 'Processing...' : `Confirm ${ACTION_CONFIG[modal.action].label}`}
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