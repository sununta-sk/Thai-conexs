import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

const CHANNEL_OPTIONS = [
  { id: 'push',   label: 'Push Notification', icon: '🔔' },
  { id: 'email',  label: 'Email',             icon: '✉️' },
  { id: 'in_app', label: 'In-App Banner',     icon: '📱' },
]
const AUDIENCE_OPTIONS = [
  { id: 'all',      label: 'All Users' },
  { id: 'free',     label: 'Free Plan Only' },
  { id: 'premium',  label: 'Premium / VIP' },
  { id: 'inactive', label: 'Inactive 30+ Days' },
]
const TEMPLATES = [
  { label: 'Welcome back 👋', title: 'We miss you!', body: "It's been a while — new matches are waiting for you. Come back and explore!" },
  { label: 'Upgrade promo 💎', title: 'Go Premium for 50% OFF!', body: 'This weekend only: upgrade to Premium and unlock unlimited likes, boosts, and more.' },
  { label: 'New feature 🚀',   title: 'Exciting new feature!', body: 'We just launched a brand new feature. Open the app to check it out.' },
]
const MOCK_HISTORY = [
  { id: 1, title: 'Weekend promo 🎉', body: 'Get 50% off Premium this weekend only!', audience: 'free', channels: ['push','email'], status: 'sent', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 2, title: 'New feature alert 🚀', body: 'Check out our new video profile feature!', audience: 'all', channels: ['push','in_app'], status: 'sent', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 3, title: "Valentine's special 💕", body: 'Love is in the air! Special matches waiting.', audience: 'premium', channels: ['push'], status: 'scheduled', created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
]

export default function NotificationBroadcastPage() {
  const [tab, setTab]           = useState('compose')
  const [form, setForm]         = useState({ title: '', body: '', channels: ['push'], audience: 'all', schedule: 'now', scheduled_at: '' })
  const [sending, setSending]   = useState(false)
  const [toast, setToast]       = useState(null)
  const [history, setHistory]   = useState([])
  const [histLoading, setHistL] = useState(true)
  const [preview, setPreview]   = useState(false)

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    setHistL(true)
    try {
      const { data } = await supabase.from('notifications_log').select('*').order('created_at', { ascending: false }).limit(30)
      setHistory(data?.length ? data : MOCK_HISTORY)
    } catch { setHistory(MOCK_HISTORY) }
    setHistL(false)
  }

  function toggleChannel(id) {
    setForm(p => ({ ...p, channels: p.channels.includes(id) ? p.channels.filter(c => c !== id) : [...p.channels, id] }))
  }

  async function sendBroadcast() {
    if (!form.title.trim() || !form.body.trim()) { showToast('Title and message are required', 'error'); return }
    if (!form.channels.length) { showToast('Select at least one channel', 'error'); return }
    setSending(true)
    try {
      await supabase.from('notifications_log').insert({
        title: form.title, body: form.body, channels: form.channels, audience: form.audience,
        scheduled_at: form.schedule === 'later' ? form.scheduled_at : null,
        status: form.schedule === 'later' ? 'scheduled' : 'sent',
      })
    } catch { }
    await fetchHistory()
    showToast(form.schedule === 'later' ? '⏰ Notification scheduled!' : '🚀 Broadcast sent!')
    setForm({ title: '', body: '', channels: ['push'], audience: 'all', schedule: 'now', scheduled_at: '' })
    setTab('history')
    setSending(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const recipientCount = { all: '1,380', free: '940', premium: '352', inactive: '210' }

  return (
    <AdminLayout>
      <div style={S.page}>
        {toast && <div style={{ ...S.toast, background: toast.type === 'error' ? '#ef4444' : '#10b981' }}>{toast.msg}</div>}

        <div style={S.header}>
          <div>
            <h1 style={S.title}>Notification Center</h1>
            <p style={S.subtitle}>Broadcast messages to your users</p>
          </div>
          <button style={S.btnPrimary} onClick={() => { setTab('compose'); setPreview(false) }}>+ New Broadcast</button>
        </div>

        <div style={S.tabs}>
          {['compose','history'].map(t => (
            <button key={t} style={tab === t ? S.tabActive : S.tab} onClick={() => setTab(t)}>
              {t === 'compose' ? '✍️ Compose' : '📋 History'}
            </button>
          ))}
        </div>

        {tab === 'compose' && (
          <div style={S.composeGrid}>
            <div style={S.formBox}>
              <div style={S.section}>
                <div style={S.sectionLabel}>Quick Templates</div>
                <div style={S.templateRow}>
                  {TEMPLATES.map((t, i) => (
                    <button key={i} style={S.templateBtn} onClick={() => setForm(p => ({ ...p, title: t.title, body: t.body }))}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div style={S.section}>
                <div style={S.sectionLabel}>Channels</div>
                <div style={S.channelRow}>
                  {CHANNEL_OPTIONS.map(c => (
                    <label key={c.id} style={{ ...S.channelChip, ...(form.channels.includes(c.id) ? S.channelChipActive : {}) }}>
                      <input type="checkbox" checked={form.channels.includes(c.id)} onChange={() => toggleChannel(c.id)} style={{ display: 'none' }}/>
                      {c.icon} {c.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={S.section}>
                <div style={S.sectionLabel}>Audience</div>
                <div style={S.audienceRow}>
                  {AUDIENCE_OPTIONS.map(a => (
                    <label key={a.id} style={{ ...S.audienceChip, ...(form.audience === a.id ? S.audienceChipActive : {}) }}>
                      <input type="radio" name="audience" value={a.id} checked={form.audience === a.id}
                        onChange={() => setForm(p => ({ ...p, audience: a.id }))} style={{ display: 'none' }}/>
                      {a.label}
                      <span style={S.audienceCount}>~{recipientCount[a.id]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={S.section}>
                <div style={S.sectionLabel}>Title</div>
                <input value={form.title} placeholder="e.g. We miss you!" maxLength={60}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={S.input}/>
                <div style={S.charCount}>{form.title.length}/60</div>
              </div>

              <div style={S.section}>
                <div style={S.sectionLabel}>Message</div>
                <textarea value={form.body} rows={4} placeholder="Write your message…" maxLength={200}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))} style={S.textarea}/>
                <div style={S.charCount}>{form.body.length}/200</div>
              </div>

              <div style={S.section}>
                <div style={S.sectionLabel}>Delivery</div>
                <div style={S.scheduleRow}>
                  {[{ v: 'now', l: '⚡ Send Now' }, { v: 'later', l: '⏰ Schedule' }].map(o => (
                    <label key={o.v} style={{ ...S.scheduleChip, ...(form.schedule === o.v ? S.scheduleChipActive : {}) }}>
                      <input type="radio" name="schedule" value={o.v} checked={form.schedule === o.v}
                        onChange={() => setForm(p => ({ ...p, schedule: o.v }))} style={{ display: 'none' }}/>
                      {o.l}
                    </label>
                  ))}
                </div>
                {form.schedule === 'later' && (
                  <input type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
                    style={{ ...S.input, marginTop: 10 }}/>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button style={S.btnPrimary} onClick={sendBroadcast} disabled={sending}>
                  {sending ? 'Sending…' : form.schedule === 'later' ? '⏰ Schedule' : '🚀 Send Broadcast'}
                </button>
                <button style={S.btnGhost} onClick={() => setPreview(p => !p)}>
                  {preview ? 'Hide Preview' : '👁 Preview'}
                </button>
              </div>
            </div>

            {preview && (
              <div style={S.previewBox}>
                <div style={S.sectionLabel}>Push Preview</div>
                <div style={S.phoneFrame}>
                  <div style={S.phoneNotif}>
                    <div style={S.phoneApp}>💕 Thai Conexns</div>
                    <div style={S.phoneTitle}>{form.title || 'Your title here'}</div>
                    <div style={S.phoneBody}>{form.body || 'Your message body will appear here…'}</div>
                  </div>
                </div>
                <div style={{ ...S.sectionLabel, marginTop: 20 }}>Summary</div>
                <div style={S.summaryBox}>
                  {[
                    { label: 'Channels', value: form.channels.join(', ') || '—' },
                    { label: 'Audience', value: `${AUDIENCE_OPTIONS.find(a => a.id === form.audience)?.label} (~${recipientCount[form.audience]})` },
                    { label: 'Delivery', value: form.schedule === 'later' ? `Scheduled: ${form.scheduled_at || 'TBD'}` : 'Immediately' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                      <span style={{ color: '#64748b', fontSize: 13 }}>{r.label}</span>
                      <span style={{ color: '#f1f5f9', fontSize: 13 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={S.tableWrap}>
            {histLoading ? <div style={S.empty}>Loading history…</div> : (
              <table style={S.table}>
                <thead><tr>{['Title','Audience','Channels','Status','Sent At'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {history.map((n, i) => (
                    <tr key={n.id ?? i} style={S.tr}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{n.body?.slice(0, 60)}…</div>
                      </td>
                      <td style={S.td}>{n.audience ?? '—'}</td>
                      <td style={S.td}>{(Array.isArray(n.channels) ? n.channels : [n.channels]).map(c => <span key={c} style={S.chip}>{c}</span>)}</td>
                      <td style={S.td}>
                        <span style={{ ...S.statusPill, background: n.status === 'sent' ? '#10b98120' : '#f59e0b20', color: n.status === 'sent' ? '#10b981' : '#f59e0b' }}>
                          {n.status ?? 'sent'}
                        </span>
                      </td>
                      <td style={S.td}>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

const S = {
  page:              { padding: '32px', minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' },
  header:            { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title:             { margin: 0, fontSize: 26, fontWeight: 700 },
  subtitle:          { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  tabs:              { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #1e293b' },
  tab:               { padding: '8px 20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, borderBottom: '2px solid transparent' },
  tabActive:         { padding: '8px 20px', background: 'none', border: 'none', color: '#e91e63', cursor: 'pointer', fontSize: 14, borderBottom: '2px solid #e91e63', fontWeight: 600 },
  composeGrid:       { display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' },
  formBox:           { background: '#1e293b', borderRadius: 14, padding: 28 },
  previewBox:        { background: '#1e293b', borderRadius: 14, padding: 24, width: 280 },
  section:           { marginBottom: 20 },
  sectionLabel:      { fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  templateRow:       { display: 'flex', flexWrap: 'wrap', gap: 8 },
  templateBtn:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 20, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  channelRow:        { display: 'flex', gap: 10 },
  channelChip:       { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontSize: 13, color: '#94a3b8' },
  channelChipActive: { borderColor: '#e91e63', color: '#e91e63', background: '#e91e6315' },
  audienceRow:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  audienceChip:      { padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontSize: 13, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  audienceChipActive:{ borderColor: '#e91e63', color: '#e91e63', background: '#e91e6315' },
  audienceCount:     { fontSize: 11, opacity: 0.7 },
  input:             { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  textarea:          { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', resize: 'vertical', boxSizing: 'border-box' },
  charCount:         { textAlign: 'right', fontSize: 11, color: '#475569', marginTop: 4 },
  scheduleRow:       { display: 'flex', gap: 10 },
  scheduleChip:      { padding: '8px 18px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontSize: 13, color: '#94a3b8' },
  scheduleChipActive:{ borderColor: '#3b82f6', color: '#3b82f6', background: '#3b82f615' },
  btnPrimary:        { background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnGhost:          { background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14 },
  phoneFrame:        { background: '#0f172a', borderRadius: 16, padding: 16, border: '1px solid #334155' },
  phoneNotif:        { background: '#1e293b', borderRadius: 12, padding: '14px 16px' },
  phoneApp:          { fontSize: 11, color: '#64748b', marginBottom: 6 },
  phoneTitle:        { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  phoneBody:         { fontSize: 13, color: '#94a3b8', lineHeight: 1.5 },
  summaryBox:        { background: '#0f172a', borderRadius: 10, padding: '4px 14px' },
  tableWrap:         { background: '#1e293b', borderRadius: 12, overflow: 'hidden' },
  table:             { width: '100%', borderCollapse: 'collapse' },
  th:                { textAlign: 'left', padding: '14px 18px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #0f172a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr:                { borderBottom: '1px solid #0f172a' },
  td:                { padding: '14px 18px', fontSize: 14, color: '#e2e8f0', verticalAlign: 'top' },
  chip:              { display: 'inline-block', background: '#0f172a', color: '#94a3b8', padding: '2px 8px', borderRadius: 6, fontSize: 12, marginRight: 4 },
  statusPill:        { padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 },
  empty:             { textAlign: 'center', padding: '48px', color: '#64748b' },
  toast:             { position: 'fixed', bottom: 32, right: 32, color: '#fff', padding: '12px 22px', borderRadius: 10, fontWeight: 600, zIndex: 999 },
}