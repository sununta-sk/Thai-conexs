// src/components/VideoUploader.jsx
import { useRef, useState, useCallback } from 'react'
import { useVideoProfile } from '../hooks/useVideoProfile'

export default function VideoUploader({ onSuccess }) {
  const { uploadVideo, uploading, progress, error, MAX_SIZE_MB } = useVideoProfile()
  const inputRef  = useRef()
  const [preview, setPreview]   = useState(null)
  const [file, setFile]         = useState(null)
  const [dragging, setDragging] = useState(false)
  const [localErr, setLocalErr] = useState(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    setLocalErr(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleUpload = async () => {
    if (!file) return
    const res = await uploadVideo(file)
    if (res.success) {
      setPreview(null)
      setFile(null)
      onSuccess?.(res.video)
    } else {
      setLocalErr(res.error)
    }
  }

  const displayErr = localErr || error

  return (
    <div style={S.wrap}>
      {/* Drop Zone */}
      {!preview && (
        <div
          style={{ ...S.dropzone, ...(dragging ? S.dropzoneDrag : {}) }}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span style={S.dropIcon}>🎬</span>
          <p style={S.dropTitle}>วางหรือคลิกเพื่ออัปโหลดวิดีโอ</p>
          <p style={S.dropSub}>.mp4 .webm .mov · สูงสุด {MAX_SIZE_MB}MB · ไม่เกิน 60 วินาที</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div style={S.previewWrap}>
          <video
            src={preview}
            style={S.video}
            controls
            muted
            playsInline
          />
          <div style={S.previewMeta}>
            <span style={S.fileName}>{file?.name}</span>
            <span style={S.fileSize}>{(file?.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <button style={S.changeBtn} onClick={() => { setPreview(null); setFile(null) }}>
            เปลี่ยนไฟล์
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div style={S.progressWrap}>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${progress}%` }} />
          </div>
          <span style={S.progressText}>{progress}%</span>
        </div>
      )}

      {/* Error */}
      {displayErr && <p style={S.errText}>⚠️ {displayErr}</p>}

      {/* Upload Button */}
      {preview && !uploading && (
        <button style={S.uploadBtn} onClick={handleUpload}>
          📤 อัปโหลดวิดีโอโปรไฟล์
        </button>
      )}

      <p style={S.note}>วิดีโอจะถูกตรวจสอบโดย Admin ก่อนแสดงสาธารณะ</p>
    </div>
  )
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 14 },

  dropzone: {
    border: '2px dashed rgba(255,255,255,0.15)',
    borderRadius: 16, padding: '40px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(255,255,255,0.02)',
  },
  dropzoneDrag: {
    borderColor: '#e91e63', background: 'rgba(233,30,99,0.08)',
  },
  dropIcon:  { fontSize: 40 },
  dropTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  dropSub:   { margin: 0, fontSize: 12, color: '#64748b' },

  previewWrap: {
    borderRadius: 14, overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0f172a',
  },
  video: { width: '100%', maxHeight: 280, display: 'block', objectFit: 'cover' },
  previewMeta: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px',
  },
  fileName: { fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' },
  fileSize: { fontSize: 12, color: '#64748b' },
  changeBtn: {
    width: '100%', padding: '8px 0',
    background: 'rgba(255,255,255,0.04)', border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    color: '#64748b', fontSize: 12, cursor: 'pointer',
  },

  progressWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  progressBar: {
    flex: 1, height: 6, borderRadius: 99,
    background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 99,
    background: 'linear-gradient(90deg,#e91e63,#9c27b0)',
    transition: 'width 0.3s',
  },
  progressText: { fontSize: 12, color: '#94a3b8', minWidth: 36 },

  errText: { margin: 0, fontSize: 13, color: '#f87171' },

  uploadBtn: {
    padding: '12px 0', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg,#e91e63,#9c27b0)',
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  note: { margin: 0, fontSize: 11, color: '#475569', textAlign: 'center' },
}