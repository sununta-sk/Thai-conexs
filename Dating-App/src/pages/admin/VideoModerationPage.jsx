// src/pages/admin/VideoModerationPage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const TABS = [
  { key: 'pending',  label: '⏳ รอตรวจ' },
  { key: 'approved', label: '✅ ผ่านแล้ว' },
  { key: 'rejected', label: '❌ ปฏิเสธแล้ว' },
]

export default function VideoModerationPage() {
  const [tab, setTab]         = useState('pending')
  const [videos, setVideos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing]     = useState(false)

  useEffect(() => { fetchVideos() }, [tab])

  const fetchVideos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profile_videos')
      .select(`
        *,
        profiles:user_id (
          id, display_name, avatar_url
        )
      `)
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  const moderate = async (videoId, status) => {
    setProcessing(true)
    await supabase.rpc('admin_moderate_video', {
      p_video_id:        videoId,
      p_status:          status,
      p_rejection_reason: status === 'rejected' ? rejectReason : null,
    })
    setSelected(null)
    setRejectReason('')
    fetchVideos()
    setProcessing(false)
  }

  const COUNTS = { pending: 0, approved: 0, rejected: 0 }
  videos.forEach(v => COUNTS[v.status] = (COUNTS[v.status] || 0) + 1)

  return (
    <AdminLayout>
      <div style={S.page}>
        <h1 style={S.title}>🎬 Video Moderation</h1>

        {/* Tabs */}
        <div style={S.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={S.loadingWrap}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={S.skeleton} />)}
          </div>
        ) : videos.length === 0 ? (
          <div style={S.empty}>
            <span style={S.emptyIcon}>🎬</span>
            <p style={S.emptyText}>No videos in this status</p>
          </div>
        ) : (
          <div style={S.grid}>
            {videos.map(v => (
              <div
                key={v.id}
                style={{ ...S.videoCard, ...(selected?.id === v.id ? S.videoCardActive : {}) }}
                onClick={() => setSelected(selected?.id === v.id ? null : v)}
              >
                <div style={S.videoWrap}>
                  <video src={v.public_url} style={S.video} muted playsInline />
                  <div style={S.videoOverlay}>
                    <span style={S.playIcon}>▶</span>
                  </div>
                  <div style={S.videoBadge}>{v.file_size_mb} MB</div>
                </div>
                <div style={S.videoInfo}>
                  <div style={S.userRow}>
                    {v.profiles?.avatar_url && (
                      <img src={v.profiles.avatar_url} style={S.avatar} alt="" />
                    )}
                    <span style={S.username}>{v.profiles?.display_name || 'Unknown'}</span>
                  </div>
                  <span style={S.date}>
                    {new Date(v.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Panel */}
        {selected && (
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <h3 style={S.panelTitle}>Details</h3>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <video src={selected.public_url} style={S.panelVideo} controls muted playsInline />

            <div style={S.panelMeta}>
              <MetaRow label="ผู้ใช้"    value={selected.profiles?.display_name} />
              <MetaRow label="ขนาดไฟล์"  value={`${selected.file_size_mb} MB`} />
              <MetaRow label="อัปโหลด"   value={new Date(selected.created_at).toLocaleString('en-GB')} />
              <MetaRow label="สถานะ"     value={selected.status} />
              {selected.rejection_reason && (
                <MetaRow label="เหตุผล"  value={selected.rejection_reason} />
              )}
            </div>

            {tab === 'pending' && (
              <div style={S.panelActions}>
                <input
                  style={S.reasonInput}
                  placeholder="เหตุผลถ้าจะปฏิเสธ (ไม่บังคับ)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
                <div style={S.actionBtns}>
                  <button
                    style={{ ...S.actionBtn, ...S.approveBtn }}
                    onClick={() => moderate(selected.id, 'approved')}
                    disabled={processing}
                  >
                    ✅ อนุมัติ
                  </button>
                  <button
                    style={{ ...S.actionBtn, ...S.rejectBtn }}
                    onClick={() => moderate(selected.id, 'rejected')}
                    disabled={processing}
                  >
                    ❌ ปฏิเสธ
                  </button>
                </div>
              </div>
            )}

            {tab === 'approved' && (
              <button
                style={{ ...S.actionBtn, ...S.rejectBtn, width: '100%' }}
                onClick={() => moderate(selected.id, 'rejected')}
                disabled={processing}
              >
                ❌ Revoke Approval
              </button>
            )}

            {tab === 'rejected' && (
              <button
                style={{ ...S.actionBtn, ...S.approveBtn, width: '100%' }}
                onClick={() => moderate(selected.id, 'approved')}
                disabled={processing}
              >
                ✅ อนุมัติใหม่
              </button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: '#64748b', minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#f1f5f9' }}>{value}</span>
    </div>
  )
}

const S = {
  page: { padding: '24px', maxWidth: 1200 },
  title: { margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#f1f5f9' },

  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: {
    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
    background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer',
  },
  tabActive: {
    background: 'rgba(233,30,99,0.15)', border: '1px solid rgba(233,30,99,0.4)',
    color: '#e91e63', fontWeight: 600,
  },

  loadingWrap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 },
  skeleton: { height: 200, borderRadius: 12, background: 'rgba(255,255,255,0.05)' },

  empty: { padding: '60px 0', textAlign: 'center' },
  emptyIcon: { fontSize: 40 },
  emptyText: { margin: '12px 0 0', fontSize: 14, color: '#475569' },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
  },
  videoCard: {
    borderRadius: 12, overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#1e293b', cursor: 'pointer', transition: 'all 0.2s',
  },
  videoCardActive: {
    border: '1px solid rgba(233,30,99,0.5)',
    boxShadow: '0 0 20px rgba(233,30,99,0.15)',
  },
  videoWrap: { position: 'relative' },
  video: { width: '100%', height: 160, objectFit: 'cover', display: 'block' },
  videoOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  playIcon: {
    fontSize: 24, color: '#fff', width: 44, height: 44,
    background: 'rgba(233,30,99,0.8)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    paddingLeft: 3,
  },
  videoBadge: {
    position: 'absolute', bottom: 6, right: 8,
    fontSize: 10, background: 'rgba(0,0,0,0.6)', color: '#94a3b8',
    padding: '2px 6px', borderRadius: 4,
  },
  videoInfo: {
    padding: '10px 12px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
  },
  userRow: { display: 'flex', alignItems: 'center', gap: 6 },
  avatar: { width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' },
  username: { fontSize: 12, color: '#f1f5f9', fontWeight: 500 },
  date: { fontSize: 11, color: '#475569' },

  panel: {
    position: 'fixed', right: 24, top: 80, bottom: 24,
    width: 360, background: '#1e293b',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
    padding: 20, overflowY: 'auto', zIndex: 100,
    boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  panelTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: '#f1f5f9' },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#64748b',
    fontSize: 18, cursor: 'pointer',
  },
  panelVideo: { width: '100%', borderRadius: 10, marginBottom: 14 },
  panelMeta: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 10,
    padding: '12px 14px', marginBottom: 16,
  },
  panelActions: { display: 'flex', flexDirection: 'column', gap: 10 },
  reasonInput: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  },
  actionBtns: { display: 'flex', gap: 10 },
  actionBtn: {
    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  approveBtn: { background: 'rgba(16,185,129,0.2)', color: '#10b981' },
  rejectBtn:  { background: 'rgba(239,68,68,0.2)',  color: '#f87171' },
}