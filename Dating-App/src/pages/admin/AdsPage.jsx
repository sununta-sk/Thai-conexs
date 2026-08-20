// src/pages/admin/AdsPage.jsx
// Admin management for the Discover side-rail advertisers (Task 4). Keeps
// AnnouncementsPage.jsx's exact form + list pattern for consistency.
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import { useAuditLogger } from '../../hooks/useAuditLogger'

// Keep these keys in sync with AD_VARIANT_STYLES in src/pages/Discover.jsx —
// this is just the admin-facing label for each.
const DESIGN_VARIANTS = [
  { value: 'gradient-pink', label: 'Pink/Purple Gradient' },
  { value: 'gradient-gold', label: 'Gold Gradient' },
  { value: 'gradient-teal', label: 'Teal Gradient' },
  { value: 'dark-outline', label: 'Dark, Pink Outline' },
  { value: 'light-ghost', label: 'Light Ghost / Dashed' },
]

const EMPTY_FORM = {
  advertiser_name: '', advertiser_contact: '', headline: '', body_text: '',
  image_url: '', destination_url: '', design_variant: 'gradient-pink',
  side: 'left', display_order: 0, is_active: true,
}

export default function AdsPage() {
  const [list, setList]     = useState([])
  const [loading, setLoad]  = useState(true)
  const [showForm, setForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const [f, setF]           = useState(EMPTY_FORM)

  const { logAction } = useAuditLogger()

  useEffect(() => { loadList() }, [])

  async function loadList() {
    setLoad(true)
    try {
      const { data } = await supabase.from('ads').select('*').order('side', { ascending: true }).order('display_order', { ascending: true })
      setList(data || [])
    } catch (err) { console.error('[Ads] load error', err) }
    setLoad(false)
  }

  function startCreate() {
    setEditingId(null)
    setF(EMPTY_FORM)
    setForm(true)
  }

  function startEdit(ad) {
    setEditingId(ad.id)
    setF({
      advertiser_name: ad.advertiser_name || '', advertiser_contact: ad.advertiser_contact || '',
      headline: ad.headline || '', body_text: ad.body_text || '', image_url: ad.image_url || '',
      destination_url: ad.destination_url || '', design_variant: ad.design_variant || 'gradient-pink',
      side: ad.side || 'left', display_order: ad.display_order ?? 0, is_active: ad.is_active !== false,
    })
    setForm(true)
  }

  async function save() {
    if (!f.headline.trim() || !f.destination_url.trim()) { showT('Headline and destination URL are required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        advertiser_name: f.advertiser_name.trim() || null,
        advertiser_contact: f.advertiser_contact.trim() || null,
        headline: f.headline.trim(),
        body_text: f.body_text.trim() || null,
        image_url: f.image_url.trim() || null,
        destination_url: f.destination_url.trim(),
        design_variant: f.design_variant,
        side: f.side,
        display_order: parseInt(f.display_order) || 0,
        is_active: f.is_active,
      }

      if (editingId) {
        const { error } = await supabase.from('ads').update(payload).eq('id', editingId)
        if (error) throw error
        await logAction({ action_type: 'ad_update', target_type: 'ad', target_id: editingId, metadata: { headline: payload.headline } }).catch(console.error)
        showT('✓ Ad updated')
      } else {
        const { data, error } = await supabase.from('ads').insert(payload).select('id').single()
        if (error) throw error
        await logAction({ action_type: 'ad_create', target_type: 'ad', target_id: data.id, metadata: { headline: payload.headline, side: payload.side } }).catch(console.error)
        showT('✓ Ad created')
      }

      await loadList()
      setForm(false)
      setEditingId(null)
      setF(EMPTY_FORM)
    } catch (err) {
      console.error('[Ads] save error', err)
      showT('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  async function toggleActive(ad) {
    try {
      await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
      setList(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a))
      await logAction({ action_type: 'ad_update', target_type: 'ad', target_id: ad.id, metadata: { headline: ad.headline, action: ad.is_active ? 'deactivate' : 'activate' } }).catch(console.error)
    } catch (err) { console.error('[Ads] toggle error', err) }
  }

  async function del(ad) {
    if (!confirm(`Delete the ad "${ad.headline}"?`)) return
    try {
      await supabase.from('ads').delete().eq('id', ad.id)
      setList(prev => prev.filter(a => a.id !== ad.id))
      await logAction({ action_type: 'ad_delete', target_type: 'ad', target_id: ad.id, metadata: { headline: ad.headline } }).catch(console.error)
    } catch (err) { console.error('[Ads] delete error', err) }
  }

  function showT(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  const leftAds  = list.filter(a => a.side === 'left' || a.side === 'both')
  const rightAds = list.filter(a => a.side === 'right' || a.side === 'both')

  return (
    <AdminLayout>
      <div style={S.page}>
        {toast && <div style={{ ...S.toast, background: toast.type === 'error' ? '#ef4444' : '#10b981' }}>{toast.msg}</div>}
        <div style={S.hdr}>
          <div>
            <h2 style={S.title}>📣 Advertisers</h2>
            <p style={S.sub}>Manage the ad slots that rotate in the Discover side rails ({leftAds.filter(a=>a.is_active).length} active left, {rightAds.filter(a=>a.is_active).length} active right — 6 slots visible per side, rotates automatically past 6)</p>
          </div>
          <button onClick={() => (showForm ? setForm(false) : startCreate())} style={S.addBtn}>{showForm ? '✕ Cancel' : '+ New Ad'}</button>
        </div>

        {showForm && (
          <div style={S.formCard}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={S.field}><label style={S.lbl}>Advertiser Name (optional, shown as eyebrow)</label>
                <input value={f.advertiser_name} onChange={e => setF(p => ({ ...p, advertiser_name: e.target.value }))} style={S.input} placeholder="e.g. Acme Co." /></div>
              <div style={S.field}><label style={S.lbl}>Advertiser Contact (internal only)</label>
                <input value={f.advertiser_contact} onChange={e => setF(p => ({ ...p, advertiser_contact: e.target.value }))} style={S.input} placeholder="email or phone" /></div>
            </div>
            <div style={S.field}><label style={S.lbl}>Headline *</label>
              <input value={f.headline} onChange={e => setF(p => ({ ...p, headline: e.target.value }))} style={S.input} placeholder="Your Advertisement Here" /></div>
            <div style={S.field}><label style={S.lbl}>Body text (optional)</label>
              <textarea value={f.body_text} onChange={e => setF(p => ({ ...p, body_text: e.target.value }))} rows={2} style={S.textarea} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={S.field}><label style={S.lbl}>Destination URL *</label>
                <input value={f.destination_url} onChange={e => setF(p => ({ ...p, destination_url: e.target.value }))} style={S.input} placeholder="https://..." /></div>
              <div style={S.field}><label style={S.lbl}>Image URL (optional)</label>
                <input value={f.image_url} onChange={e => setF(p => ({ ...p, image_url: e.target.value }))} style={S.input} placeholder="https://... (small thumbnail)" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
              <div style={S.field}><label style={S.lbl}>Side</label>
                <select value={f.side} onChange={e => setF(p => ({ ...p, side: e.target.value }))} style={S.select}>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="both">Both</option>
                </select></div>
              <div style={S.field}><label style={S.lbl}>Design</label>
                <select value={f.design_variant} onChange={e => setF(p => ({ ...p, design_variant: e.target.value }))} style={S.select}>
                  {DESIGN_VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select></div>
              <div style={S.field}><label style={S.lbl}>Display Order</label>
                <input type="number" value={f.display_order} onChange={e => setF(p => ({ ...p, display_order: e.target.value }))} style={S.input} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}>
                <input type="checkbox" checked={f.is_active} onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#e91e63' }} />
                Active
              </label>
              <div style={{ flex: 1 }} />
              <button onClick={save} disabled={saving} style={S.saveBtn}>{saving ? 'Saving…' : (editingId ? '💾 Save Changes' : '🚀 Create Ad')}</button>
            </div>
          </div>
        )}

        <div style={S.card}>
          {loading ? <div style={S.empty}>Loading...</div>
            : list.length === 0 ? <div style={S.empty}>No ads yet — Discover's side rails are showing placeholder designs</div>
            : list.map(a => (
              <div key={a.id} style={{ ...S.row, opacity: a.is_active ? 1 : 0.5 }}>
                <div style={{ ...S.dot, background: a.side === 'both' ? '#8b5cf6' : a.side === 'left' ? '#3b82f6' : '#f59e0b' }} title={a.side} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{a.headline}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
                    {a.advertiser_name ? `${a.advertiser_name} · ` : ''}{a.side} · order {a.display_order} · {DESIGN_VARIANTS.find(v => v.value === a.design_variant)?.label || a.design_variant}
                  </div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{a.destination_url}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(a)} style={S.actionBtn}>Edit</button>
                  <button onClick={() => toggleActive(a)} style={S.actionBtn}>{a.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => del(a)} style={{ ...S.actionBtn, color: '#ef4444', borderColor: '#ef444444' }}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </AdminLayout>
  )
}

const S = {
  page: { padding: 24 }, hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }, sub: { color: '#64748b', fontSize: 13, margin: 0 },
  addBtn: { background: '#e91e63', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, height: 'fit-content' },
  formCard: { background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column' }, lbl: { display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', resize: 'vertical', boxSizing: 'border-box' },
  select: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  saveBtn: { background: '#e91e63', border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  card: { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid #0f172a' },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  actionBtn: { background: 'transparent', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  empty: { padding: 40, textAlign: 'center', color: '#475569' },
  toast: { position: 'fixed', bottom: 32, right: 32, color: '#fff', padding: '12px 22px', borderRadius: 10, fontWeight: 700, zIndex: 999 },
}
