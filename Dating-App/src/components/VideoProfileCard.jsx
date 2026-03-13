// src/components/VideoProfileCard.jsx
import { useState } from 'react'
import { useVideoProfile } from '../hooks/useVideoProfile'
import VideoUploader from './VideoUploader'

export default function VideoProfileCard({ userId, isOwner = false }) {
  const { video, allVideos, loading, setPrimary, deleteVideo, refetch } = useVideoProfile(userId)
  const [showUploader, setShowUploader] = useState(false)
  const [playing, setPlaying]           = useState(false)
  const [manage, setManage]             = useState(false)

  if (loading) return <div style={S.skeleton} />

  const STATUS_LABEL = {
    pending:  { label: '⏳ รอตรวจสอบ',   color: '#f59e0b' },
    approved: { label: '✅ ผ่านการตรวจ',  color: '#10b981' },
    rejected: { label: '❌ ถูกปฏิเสธ',    color: '#f87171' },
  }

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <h3 style={S.cardTitle}>🎬 วิดีโอโปรไฟล์</h3>
        {isOwner && (
          <div style={S.headerActions}>
            {allVideos.length > 1 && (
              <button style={S.manageBtn} onClick={() => setManage(!manage)}>
                {manage ? 'ปิด' : 'จัดการ'}
              </button>
            )}
            <button style={S.addBtn} onClick={() => setShowUploader(!showUploader)}>
              {showUploader ? '✕' : '+ อัปโหลด'}
            </button>
          </div>
        )}
      </div>

      {/* Video Player */}
      {video ? (
        <div style={S.playerWrap}>
          {video.status === 'approved' || isOwner ? (
            <>
              <video
                src={video.public_url}
                style={S.player}
                controls={playing}
                muted
                playsInline
                loop
                poster={video.thumbnail_url || undefined}
                onClick={() => setPlaying(true)}
              />
              {!playing && (
                <button style={S.playBtn} onClick={() => setPlaying(true)}>
                  <span style={S.playIcon}>▶</span>
                </button>
              )}
              {isOwner && (
                <div style={S.statusBadge}>
                  <span style={{ color: STATUS_LABEL[video.status]?.color, fontSize: 12 }}>
                    {STATUS_LABEL[video.status]?.label}
                  </span>
                  {video.status === 'rejected' && video.rejection_reason && (
                    <p style={S.rejectReason}>{video.rejection_reason}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={S.pendingBox}>
              <span style={S.pendingIcon}>⏳</span>
              <p style={S.pendingText}>วิดีโออยู่ระหว่างการตรวจสอบ</p>
            </div>
          )}
        </div>
      ) : (
        !showUploader && (
          <div style={S.emptyBox}>
            <span style={S.emptyIcon}>🎬</span>
            <p style={S.emptyText}>
              {isOwner ? 'ยังไม่มีวิดีโอโปรไฟล์' : 'ผู้ใช้นี้ยังไม่มีวิดีโอโปรไฟล์'}
            </p>
            {isOwner && (
              <button style={S.emptyUploadBtn} onClick={() => setShowUploader(true)}>
                อัปโหลดเลย
              </button>
            )}
          </div>
        )
      )}

      {/* Uploader */}
      {showUploader && isOwner && (
        <div style={S.uploaderWrap}>
          <VideoUploader onSuccess={() => { setShowUploader(false); refetch() }} />
        </div>
      )}

      {/* Manage List */}
      {manage && isOwner && allVideos.length > 0 && (
        <div style={S.manageList}>
          {allVideos.map(v => (
            <div key={v.id} style={{ ...S.manageItem, ...(v.is_primary ? S.manageItemPrimary : {}) }}>
              <video src={v.public_url} style={S.thumb} muted />
              <div style={S.manageInfo}>
                <span style={{ color: STATUS_LABEL[v.status]?.color, fontSize: 11 }}>
                  {STATUS_LABEL[v.status]?.label}
                </span>
                {v.is_primary && <span style={S.primaryTag}>Primary</span>}
                <span style={S.fileInfo}>{v.file_size_mb} MB</span>
              </div>
              <div style={S.manageActions}>
                {!v.is_primary && v.status === 'approved' && (
                  <button style={S.setPrimaryBtn} onClick={() => setPrimary(v.id)}>ตั้งเป็น Primary</button>
                )}
                <button style={S.deleteBtn} onClick={() => deleteVideo(v.id)}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const S = {
  skeleton: {
    height: 240, borderRadius: 16,
    background: 'linear-gradient(90deg,#1e293b 25%,#263347 50%,#1e293b 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
  },
  card: {
    background: '#1e293b', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  cardTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: '#f1f5f9' },
  headerActions: { display: 'flex', gap: 8 },
  manageBtn: {
    fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
  },
  addBtn: {
    fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
    background: 'rgba(233,30,99,0.15)', border: '1px solid rgba(233,30,99,0.3)',
    color: '#e91e63', fontWeight: 600,
  },

  playerWrap: { position: 'relative' },
  player: { width: '100%', maxHeight: 320, display: 'block', objectFit: 'cover', cursor: 'pointer' },
  playBtn: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer',
  },
  playIcon: {
    fontSize: 40, color: '#fff', width: 64, height: 64,
    background: 'rgba(233,30,99,0.8)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    paddingLeft: 4,
  },
  statusBadge: { padding: '8px 14px', background: 'rgba(0,0,0,0.3)' },
  rejectReason: { margin: '4px 0 0', fontSize: 11, color: '#94a3b8' },

  pendingBox: {
    height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, background: 'rgba(245,158,11,0.05)',
  },
  pendingIcon: { fontSize: 36 },
  pendingText: { margin: 0, fontSize: 13, color: '#f59e0b' },

  emptyBox: {
    padding: '40px 24px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { margin: 0, fontSize: 13, color: '#475569' },
  emptyUploadBtn: {
    marginTop: 4, padding: '8px 20px', borderRadius: 10, border: 'none',
    background: 'rgba(233,30,99,0.15)', color: '#e91e63',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  uploaderWrap: { padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' },

  manageList: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  manageItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 10,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  },
  manageItemPrimary: { border: '1px solid rgba(233,30,99,0.3)' },
  thumb: { width: 60, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 },
  manageInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  primaryTag: {
    fontSize: 10, padding: '2px 6px', borderRadius: 4,
    background: 'rgba(233,30,99,0.2)', color: '#e91e63', alignSelf: 'flex-start',
  },
  fileInfo: { fontSize: 11, color: '#475569' },
  manageActions: { display: 'flex', flexDirection: 'column', gap: 4 },
  setPrimaryBtn: {
    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
    background: 'rgba(233,30,99,0.15)', border: '1px solid rgba(233,30,99,0.3)',
    color: '#e91e63', whiteSpace: 'nowrap',
  },
  deleteBtn: {
    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    color: '#f87171',
  },
}