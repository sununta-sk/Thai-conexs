// src/pages/admin/AnnouncementsPage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import { useAuditLogger } from '../../hooks/useAuditLogger'
import { useIsMobile } from '../../hooks/useIsMobile'

export default function AnnouncementsPage() {
  const isMobile = useIsMobile()
  const [list, setList]     = useState([])
  const [loading, setLoad]  = useState(true)
  const [showForm, setForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const [form, setF]        = useState({ title: '', body: '', type: 'info', active: true })

  const { logAction } = useAuditLogger()

  const [mode, setMode] = useState('public');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false); // ← เพิ่ม

  useEffect(() => { loadList() }, [])

  async function loadList() {
    setLoad(true)
    try {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
      setList(data || [])
    } catch (err) { console.error('[Publish error]', err);}
    setLoad(false)
  }

  async function searchUsers(q) {
    setUserQuery(q);
    if (!q.trim()) { setUserResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', '%' + q.trim() + '%').limit(8);
    setUserResults(data || []);
    setSearching(false);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) { showT('Please fill in all fields', 'error'); return }
    setSaving(true)
    try {
      if (mode === 'private') {
        if (!selectedUser) { showT('Please select a user', 'error'); setSaving(false); return; }
        const OFFICIAL_ID = '00000000-0000-0000-0000-000000000001'
        const announceEmoji = String.fromCodePoint(0x1F4E2)
        const content = announceEmoji + ' ' + form.title + '\n\n' + form.body
        const chat_id = [selectedUser.id, OFFICIAL_ID].sort().join('_')
        const { error: msgErr } = await supabase.from('messages').insert({ chat_id, room_id: chat_id, sender_id: OFFICIAL_ID, content })
        if (msgErr) { showT('Error', 'error'); setSaving(false); return; }
        await logAction({
          action_type: 'announcement_publish',
          target_type: 'user',
          target_id: selectedUser.id,
          metadata: { title: form.title, private: true, to_username: selectedUser.username },
        }).catch(console.error)
        showT('Sent to ' + selectedUser.username)
        setF({ title: '', body: '', type: 'info', active: true })
        setSelectedUser(null); setUserQuery(''); setUserResults([])
        setForm(false)
        setSaving(false)
        return
      }
      const { data, error } = await supabase
        .from('announcements')
        .insert({ title: form.title, body: form.body, announcement_type: form.type || 'banner', target_audience: 'all', status: form.active ? 'active' : 'draft', created_by: await (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: adminRow } = await supabase.from('admin_users').select('id').eq('auth_user_id', user.id).single()
            return adminRow?.id
          })() })
        .select('id')
        .single()

      if (error) throw error

      const OFFICIAL_ID = '00000000-0000-0000-0000-000000000001'
      const { data: users } = await supabase.from('profiles').select('id').neq('id', OFFICIAL_ID)
      if (users && users.length > 0) {
        const announceEmoji = String.fromCodePoint(0x1F4E2)
        const broadcastContent = announceEmoji + ' ' + form.title + '\n\n' + form.body
        const msgs = users.map(u => {
          const chat_id = [u.id, OFFICIAL_ID].sort().join('_')
          return { chat_id, room_id: chat_id, sender_id: OFFICIAL_ID, content: broadcastContent }
        })
        for (let i = 0; i < msgs.length; i += 500) {
          await supabase.from('messages').insert(msgs.slice(i, i + 500))
        }
        showT('Sent to ' + users.length + ' users')
      }

      // ── Audit log ──
      await logAction({
        action_type: 'announcement_publish',
        target_type: 'announcement',
        target_id:   data.id,
        metadata:    { title: form.title, type: form.type, active: form.active },
      }).catch(console.error)

      await loadList()
      setF({ title: '', body: '', type: 'info', active: true })
      setForm(false)
      showT('✓ Published')
    } catch (err) { console.error('[Publish error]', err);
      showT('Error', 'error')
    }
    setSaving(false)
  }

  async function toggleActive(item) {
    try {
      await supabase.from('announcements').update({ active: !item.active }).eq('id', item.id)
      setList(prev => prev.map(a => a.id === item.id ? { ...a, active: !a.active } : a))

      // ── Audit log ──
      await logAction({
        action_type: 'announcement_publish',
        target_type: 'announcement',
        target_id:   item.id,
        metadata:    { title: item.title, action: item.active ? 'deactivate' : 'activate' },
      }).catch(console.error)
    } catch (err) { console.error('[Publish error]', err);}
  }

  async function del(id) {
    if (!confirm('Delete this announcement?')) return
    try {
      await supabase.from('announcements').delete().eq('id', id)
      setList(prev => prev.filter(a => a.id !== id))
    } catch (err) { console.error('[Publish error]', err);}
  }

  function showT(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }
  const typeColor = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981', error: '#ef4444' }

  return (
    <AdminLayout>
      <div style={S.page}>
        {toast && <div style={{ ...S.toast, background: toast.type === 'error' ? '#ef4444' : '#10b981' }}>{toast.msg}</div>}
        <div style={S.hdr}>
          <div><h2 style={S.title}>📢 Announcements</h2><p style={S.sub}>Announcements and banners in the app</p></div>
          <button onClick={() => setForm(v => !v)} style={S.addBtn}>{showForm ? '✕ Cancel' : '+ New'}</button>
        </div>

        {showForm && (
          <div style={S.formCard}>
            <div style={S.field}>
              <label style={S.lbl}>Audience</label>
              {/* Stacked full-width on mobile - "Public (all users)" /
                  "Private (select user)" side-by-side left these two
                  buttons cramped/clipped at phone widths. */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
                <button type="button" onClick={() => { setMode('public'); setSelectedUser(null); }} style={{ ...S.actionBtn, padding: '8px 16px', width: isMobile ? '100%' : undefined, boxSizing: 'border-box', background: mode === 'public' ? '#e91e63' : 'transparent', color: mode === 'public' ? '#fff' : '#94a3b8', borderColor: mode === 'public' ? '#e91e63' : '#334155' }}>Public (all users)</button>
                <button type="button" onClick={() => setMode('private')} style={{ ...S.actionBtn, padding: '8px 16px', width: isMobile ? '100%' : undefined, boxSizing: 'border-box', background: mode === 'private' ? '#e91e63' : 'transparent', color: mode === 'private' ? '#fff' : '#94a3b8', borderColor: mode === 'private' ? '#e91e63' : '#334155' }}>Private (select user)</button>
              </div>
            </div>
            {mode === 'private' && (
              <div style={S.field}>
                <label style={S.lbl}>Send to</label>
                {selectedUser ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px' }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 700, flex: 1 }}>{selectedUser.username}</span>
                    <button type="button" onClick={() => { setSelectedUser(null); setUserQuery(''); }} style={{ ...S.actionBtn, padding: '4px 10px' }}>Change</button>
                  </div>
                ) : (
                  <div>
                    <input value={userQuery} onChange={e => searchUsers(e.target.value)} style={S.input} placeholder="Search username..." />
                    {searching && <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Searching...</div>}
                    {userResults.length > 0 && (
                      <div style={{ marginTop: 6, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }}>
                        {userResults.map(u => (
                          <div key={u.id} onClick={() => { setSelectedUser(u); setUserResults([]); }} style={{ padding: '8px 14px', color: '#f1f5f9', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}>{u.username}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={S.field}><label style={S.lbl}>Title</label>
              <input value={form.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} style={S.input} placeholder="Title..." /></div>
            <div style={S.field}><label style={S.lbl}>Message</label>
              <textarea value={form.body} onChange={e => setF(p => ({ ...p, body: e.target.value }))} rows={3} style={S.textarea} /></div>
            {/* Stacked full-width on mobile - side-by-side left the Publish
                button squeezed next to the Type select at phone widths
                (same fix as the Audience toggle above). */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
              <div style={S.field}>
                <label style={S.lbl}>Type</label>
                <select value={form.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))} style={{ ...S.select, width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}>
                  {['info', 'warning', 'success', 'error'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={save} disabled={saving} style={{ ...S.saveBtn, width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}>{saving ? 'Saving…' : '🚀 Publish'}</button>
            </div>
          </div>
        )}

        <div style={S.card}>
          {loading ? <div style={S.empty}>Loading...</div>
            : list.length === 0 ? <div style={S.empty}>No announcements yet</div>
            : list.map(a => (
              <div key={a.id} style={{ ...S.row, opacity: a.active ? 1 : 0.5 }}>
                <div style={{ ...S.dot, background: typeColor[a.type] || '#475569' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{a.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{a.body}</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{new Date(a.created_at).toLocaleString('th-TH')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleActive(a)} style={S.actionBtn}>{a.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => del(a.id)} style={{ ...S.actionBtn, color: '#ef4444', borderColor: '#ef444444' }}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </AdminLayout>
  )
}

const S = {
  page: { padding: 24 }, hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }, sub: { color: '#64748b', fontSize: 13, margin: 0 },
  addBtn: { background: '#e91e63', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  formCard: { background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 24, marginBottom: 20 },
  field: { marginBottom: 14 }, lbl: { display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', resize: 'vertical', boxSizing: 'border-box' },
  select: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14 },
  saveBtn: { background: '#e91e63', border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  card: { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid #0f172a' },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  actionBtn: { background: 'transparent', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  empty: { padding: 40, textAlign: 'center', color: '#475569' },
  toast: { position: 'fixed', bottom: 32, right: 32, color: '#fff', padding: '12px 22px', borderRadius: 10, fontWeight: 700, zIndex: 999 },
}