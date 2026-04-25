import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isDesktop;
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop(900);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [oldUsername, setOldUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [email, setEmail] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  const [prefs, setPrefs] = useState({
    notif_new_message: true,
    notif_new_member: true,
    notif_new_interest: true,
    notif_smart_emails: true,
  });

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const [savingUsername, setSavingUsername] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate('/login'); return; }
      setUser(u);
      setEmail(u.email || '');
      setMemberSince(new Date(u.created_at).toISOString().slice(0, 10));

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, subscription_plan, email_preferences')
        .eq('id', u.id)
        .maybeSingle();

      if (profile) {
        setOldUsername(profile.username || '');
        setIsPremium(profile.subscription_plan === 'gold' || profile.subscription_plan === 'platinum');
        if (profile.email_preferences) {
          setPrefs(prev => ({ ...prev, ...profile.email_preferences }));
        }
      }
      setLoading(false);
    }
    load();
  }, [navigate]);

  const handleChangeUsername = async () => {
    if (!isPremium) { alert('Username change is for Premium members only.'); return; }
    if (!newUsername.trim()) { alert('Please enter a new username'); return; }
    if (newUsername.trim() === oldUsername) { alert('New username is the same'); return; }
    setSavingUsername(true);
    const { error } = await supabase.from('profiles').update({ username: newUsername.trim() }).eq('id', user.id);
    setSavingUsername(false);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Username changed. You will be logged out.');
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const handleChangeEmail = async () => {
    if (!email.trim() || email === user.email) { alert('Please enter a new email'); return; }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) alert('Error: ' + error.message);
    else alert('Verification email sent to ' + email);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    const { error } = await supabase.from('profiles').update({ email_preferences: prefs }).eq('id', user.id);
    setSavingPrefs(false);
    if (error) alert('Error: ' + error.message);
    else alert('Email preferences saved');
  };

  const togglePref = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleCloseAccount = async () => {
    setShowCloseConfirm(false);
    const { error } = await supabase.from('profiles').update({ account_status: 'closed', closed_at: new Date().toISOString() }).eq('id', user.id);
    if (error) alert('Error: ' + error.message);
    else { alert('Account closed.'); await supabase.auth.signOut(); navigate('/login'); }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') { alert('Please type DELETE to confirm'); return; }
    setShowDeleteConfirm(false);
    const { error } = await supabase.from('profiles').update({ account_status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', user.id);
    if (error) alert('Error: ' + error.message);
    else { alert('Account permanently deleted.'); await supabase.auth.signOut(); navigate('/login'); }
  };

  if (loading) return (
    <div style={S.loading}>
      <div style={S.spinner} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const LeftColumn = (
    <div style={S.col}>
      <div style={S.card}>
        <div style={S.cardHeader}>Change Username {!isPremium && <span style={S.premiumBadge}>Premium Only</span>}</div>
        <div style={S.row}>
          <label style={S.rowLabel}>Old username:</label>
          <input value={oldUsername} disabled style={{ ...S.input, opacity: 0.6 }} />
        </div>
        <div style={S.row}>
          <label style={S.rowLabel}>New username:</label>
          <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Enter new username here" disabled={!isPremium} style={{ ...S.input, opacity: isPremium ? 1 : 0.5 }} />
        </div>
        <button onClick={handleChangeUsername} disabled={!isPremium || savingUsername} style={{ ...S.btnPrimary, opacity: isPremium ? 1 : 0.5, cursor: isPremium ? 'pointer' : 'not-allowed' }}>
          {savingUsername ? 'Changing...' : 'Change username'}
        </button>
        <p style={S.note}>If the name change is successful you will be logged out and need to log in with the new username.</p>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>Change email</div>
        <div style={S.row}>
          <label style={S.rowLabel}>Email address:</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} />
        </div>
        <button onClick={handleChangeEmail} disabled={savingEmail} style={S.btnPrimary}>
          {savingEmail ? 'Sending...' : 'Change email'}
        </button>
        <p style={S.note}>A verification link will be sent to the new email address.</p>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>Email preferences</div>
        <PrefRow checked={prefs.notif_new_message} onChange={() => togglePref('notif_new_message')} label="Receive new message email notifications" />
        <PrefRow checked={prefs.notif_new_member} onChange={() => togglePref('notif_new_member')} label="Receive newest member emails" />
        <PrefRow checked={prefs.notif_new_interest} onChange={() => togglePref('notif_new_interest')} label="Receive new interest email notifications" />
        <PrefRow checked={prefs.notif_smart_emails} onChange={() => togglePref('notif_smart_emails')} label="Smart Emails - Email notifications only sent if not using the app" />
        <button onClick={handleSavePrefs} disabled={savingPrefs} style={{ ...S.btnPrimary, marginTop: 16 }}>
          {savingPrefs ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </div>
  );

  const RightColumn = (
    <div style={S.col}>
      <div style={S.card}>
        <div style={S.cardHeader}>Account details</div>
        <div style={{ marginTop: 12, marginBottom: 24 }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Member since: </span>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{memberSince}</span>
        </div>

        <div style={S.subCardHeader}>Close your account</div>
        <p style={S.subCardText}>Your profile will look like it has been deleted, you will not appear in any search results. You can re-open your account at any time.</p>
        <button onClick={() => setShowCloseConfirm(true)} style={S.btnSecondary}>Close your account</button>

        <div style={{ ...S.subCardHeader, marginTop: 32 }}>Close your account and delete your profile forever!</div>
        <p style={S.subCardText}>Your account will be deleted along with all your photos and profile information. Deleted accounts cannot be undeleted!</p>
        <button onClick={() => setShowDeleteConfirm(true)} style={S.btnDanger}>Close your account and delete your profile forever!</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingTop: 90, paddingBottom: 60 }}>
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>Account Settings</h1>
        <p style={S.pageSubtitle}>Manage your account, email, and notification preferences</p>
      </div>

      <div style={isDesktop ? S.desktopWrap : S.mobileWrap}>
        {LeftColumn}
        {RightColumn}
      </div>

      {showCloseConfirm && (
        <Modal onClose={() => setShowCloseConfirm(false)}>
          <div style={S.modalIcon}>!</div>
          <div style={S.modalTitle}>Close your account?</div>
          <p style={S.modalText}>Your profile will be hidden but you can re-open it later by logging in again.</p>
          <div style={S.modalBtns}>
            <button onClick={() => setShowCloseConfirm(false)} style={S.btnSecondary}>Cancel</button>
            <button onClick={handleCloseAccount} style={S.btnPrimary}>Yes, close it</button>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <div style={S.modalIcon}>!!!</div>
          <div style={S.modalTitle}>Delete account forever?</div>
          <p style={S.modalText}>This action cannot be undone. All your photos, messages, and profile data will be permanently deleted.</p>
          <p style={{ ...S.modalText, marginTop: 16 }}>Type <strong style={{ color: '#e91e63', fontFamily: 'monospace' }}>DELETE</strong> to confirm:</p>
          <input value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="DELETE" style={{ ...S.input, marginTop: 8, marginBottom: 16, fontFamily: 'monospace' }} />
          <div style={S.modalBtns}>
            <button onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }} style={S.btnSecondary}>Cancel</button>
            <button onClick={handleDeleteAccount} disabled={deleteText !== 'DELETE'} style={{ ...S.btnDanger, opacity: deleteText === 'DELETE' ? 1 : 0.5 }}>Delete forever</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PrefRow({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 3, width: 16, height: 16, accentColor: '#e91e63', cursor: 'pointer' }} />
      <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{label}</span>
    </label>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }}>
        {children}
      </div>
    </div>
  );
}

const S = {
  loading: { background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 36, height: 36, border: '3px solid rgba(233,30,99,0.2)', borderTopColor: '#e91e63', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  pageHeader: { maxWidth: 1200, margin: '0 auto', padding: '0 20px 24px' },
  pageTitle: { color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: '0 0 4px' },
  pageSubtitle: { color: '#64748b', fontSize: 14, margin: 0 },
  desktopWrap: { maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'flex-start' },
  mobileWrap: { maxWidth: 600, margin: '0 auto', padding: '0 16px' },
  col: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24 },
  cardHeader: { fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  premiumBadge: { fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '2px 10px', borderRadius: 99 },
  row: { marginBottom: 12 },
  rowLabel: { display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 },
  btnSecondary: { padding: '10px 20px', borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnDanger: { padding: '12px 20px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  note: { marginTop: 12, fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  subCardHeader: { fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 },
  subCardText: { fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginTop: 0, marginBottom: 12 },
  modalIcon: { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0 },
  modalBtns: { display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' },
};
