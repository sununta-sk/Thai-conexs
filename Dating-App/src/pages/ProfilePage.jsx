// src/pages/ProfilePage.jsx  ← วางที่ src/pages/ProfilePage.jsx
// Phase 6A — หน้าโปรไฟล์ของตัวเอง
// Dark theme #0f172a / #1e293b | Accent #e91e63

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BoostButton from '../components/BoostButton'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) console.error(error)
      setProfile(data ?? null)
      setLoading(false)
    }
    load()
  }, [navigate])

  if (loading) {
    return (
      <div style={S.loadWrap}>
        <div style={S.spinner} />
      </div>
    )
  }

  if (!profile) return null

  const avatar = profile.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || 'User')}&background=e91e63&color=fff&size=200`

  return (
    <div style={S.page}>

      {/* ── Hero ── */}
      <div style={S.hero}>
        <div style={S.avatarRing}>
          <img src={avatar} alt="avatar" style={S.avatar} />
        </div>

        <div style={S.nameRow}>
          <h1 style={S.name}>{profile.display_name || 'ไม่ระบุชื่อ'}</h1>
          {profile.age && <span style={S.ageBadge}>{profile.age}</span>}
        </div>

        {profile.location && (
          <p style={S.location}>📍 {profile.location}</p>
        )}

        <div style={S.boostWrap}>
          <BoostButton userId={profile.id} />
        </div>
      </div>

      {/* ── Bio ── */}
      {profile.bio && (
        <Section title="เกี่ยวกับฉัน">
          <p style={S.bio}>{profile.bio}</p>
        </Section>
      )}

      {/* ── Details ── */}
      <Section title="ข้อมูลทั่วไป">
        <div style={S.chipRow}>
          {profile.gender            && <Chip icon="🧑"  label={profile.gender} />}
          {profile.height            && <Chip icon="📏"  label={`${profile.height} cm`} />}
          {profile.education         && <Chip icon="🎓"  label={profile.education} />}
          {profile.occupation        && <Chip icon="💼"  label={profile.occupation} />}
          {profile.relationship_goal && <Chip icon="💬"  label={profile.relationship_goal} />}
        </div>
      </Section>

      {/* ── Interests ── */}
      {Array.isArray(profile.interests) && profile.interests.length > 0 && (
        <Section title="ความสนใจ">
          <div style={S.tagRow}>
            {profile.interests.map(t => (
              <span key={t} style={S.tag}>{t}</span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Photos ── */}
      {Array.isArray(profile.photos) && profile.photos.length > 0 && (
        <Section title="รูปภาพ">
          <div style={S.photoGrid}>
            {profile.photos.map((url, i) => (
              <img key={i} src={url} alt={`photo-${i}`} style={S.photo} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Buttons ── */}
      <div style={S.btnGroup}>
        <button style={S.editBtn} onClick={() => navigate('/profile-setup')}>
          ✏️ แก้ไขโปรไฟล์
        </button>
        <button
          style={S.logoutBtn}
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/login')
          }}
        >
          ออกจากระบบ
        </button>
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={S.section}>
      <p style={S.sectionLabel}>{title}</p>
      {children}
    </div>
  )
}

function Chip({ icon, label }) {
  return (
    <div style={S.chip}>
      <span>{icon}</span>
      <span style={S.chipText}>{label}</span>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f1f5f9',
    paddingBottom: 100,
  },
  loadWrap: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid rgba(233,30,99,0.2)',
    borderTopColor: '#e91e63',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  // Hero
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '44px 24px 28px',
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    gap: 6,
  },
  avatarRing: {
    padding: 3,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
    marginBottom: 10,
    boxShadow: '0 0 28px rgba(233,30,99,0.4)',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    border: '3px solid #0f172a',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  ageBadge: {
    background: 'rgba(233,30,99,0.15)',
    border: '1px solid rgba(233,30,99,0.35)',
    color: '#e91e63',
    borderRadius: 99,
    padding: '2px 10px',
    fontSize: 13,
    fontWeight: 600,
  },
  location: {
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
  },
  boostWrap: {
    marginTop: 8,
  },

  // Sections
  section: {
    padding: '20px 20px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionLabel: {
    margin: '0 0 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
  },
  bio: {
    margin: '0 0 14px',
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 1.75,
  },

  // Chips
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 99,
    padding: '6px 14px',
    fontSize: 13,
  },
  chipText: {
    color: '#cbd5e1',
  },

  // Tags
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    background: 'rgba(233,30,99,0.1)',
    border: '1px solid rgba(233,30,99,0.28)',
    color: '#e91e63',
    borderRadius: 99,
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 500,
  },

  // Photo grid
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    marginBottom: 14,
  },
  photo: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    borderRadius: 10,
  },

  // Buttons
  btnGroup: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  editBtn: {
    width: '100%',
    padding: 14,
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  logoutBtn: {
    width: '100%',
    padding: 14,
    background: 'transparent',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 14,
    color: '#f87171',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}