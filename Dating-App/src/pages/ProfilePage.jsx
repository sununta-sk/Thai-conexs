// src/pages/ProfilePage.jsx  ← วางที่ src/pages/ProfilePage.jsx
// Phase 6A — หน้าโปรไฟล์ของตัวเอง
// Dark theme #0f172a / #1e293b | Accent #e91e63

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BoostButton from '../components/BoostButton'
import { useIsMobile } from '../hooks/useIsMobile'
import { TOP_H, BOTTOM_H } from '../components/MobileNavbar'
import { useTranslation } from '../hooks/useTranslation'

// Photo entries are JSON-stringified objects with crop metadata, same
// shape RoomChat.jsx/MobileRoomChat.jsx already parse via their own
// extractPhotoUrl. This file was passing the raw string straight to
// <img src>, which fails to load for every account with real photos,
// not just accounts with none.
function extractPhotoUrl(p) {
  if (!p) return null
  if (typeof p === 'string') { try { return JSON.parse(p)?.url || p } catch { return p } }
  return p?.url || null
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { tx } = useTranslation(['userProfile'])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Bio is clamped to 2 lines by default, same technique as RoomChat.jsx's
  // DesktopSidebar - measures whether the clamp is actually cutting
  // anything off (scrollHeight > clientHeight) so a short bio doesn't get
  // a pointless toggle, and keeps this section's worst-case height
  // predictable instead of growing with however long the bio is.
  const bioRef = useRef(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [bioClamped, setBioClamped] = useState(false)

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

  useEffect(() => {
    if (bioRef.current) setBioClamped(bioRef.current.scrollHeight > bioRef.current.clientHeight + 1)
  }, [profile?.bio])

  if (loading) {
    return (
      <div style={S.loadWrap}>
        <div style={S.spinner} />
      </div>
    )
  }

  if (!profile) return null

  const avatar = profile.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'User')}&background=e91e63&color=fff&size=200`

  // Laptop/desktop (>=768px): content is centered inside a 900px column
  // (same width as Login/Register's card, an existing app value) instead of
  // stretching edge-to-edge, with S.page's background staying full-bleed.
  // The flex column properties below are unconditional on both - this div
  // is the single flex item inside S.page's own flex column, and needs to
  // pass flex:1/minHeight:0 down to its own children so the photo section
  // can correctly claim whatever space the fixed sections don't use.
  const contentWrapStyle = {
    display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%',
    ...(isMobile ? {} : { maxWidth: 900, margin: '0 auto' }),
  };

  return (
    <div style={{
      ...S.page,
      paddingTop: isMobile ? 0 : 90,
      // Mobile reserves its own top/bottom clearance via body padding
      // (MobileNavbar's TOP_H/BOTTOM_H), which a child's vh can't see -
      // so 100vh alone would overflow the body by exactly that amount.
      // Desktop's clearance lives in this div's own paddingTop instead,
      // so border-box is what keeps it inside the 100vh cap rather than
      // adding to it.
      height: isMobile ? `calc(100vh - ${TOP_H + BOTTOM_H}px)` : '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
    <div style={contentWrapStyle}>

      {/* ── Hero ── */}
      <div style={S.hero}>
        <div style={S.avatarRing}>
          <img src={avatar} alt="avatar" style={S.avatar} />
        </div>

        <div style={S.nameRow}>
          <h1 style={S.name}>{profile.username || tx.noName || 'ไม่ระบุชื่อ'}</h1>
          {profile.age && <span style={S.ageBadge}>{profile.age}</span>}
        </div>

        {profile.location && (
          <p style={S.location}>📍 {profile.location}</p>
        )}

        <div style={S.boostWrap}>
          <BoostButton userId={profile.id} size="lg" />
        </div>
      </div>

      {/* ── Bio ── */}
      {profile.bio && (
        <Section title={tx.aboutMe || 'เกี่ยวกับฉัน'}>
          <p ref={bioRef} style={bioExpanded ? S.bio : S.bioClamped}>{profile.bio}</p>
          {bioClamped && (
            <button type="button" style={S.bioToggle} onClick={() => setBioExpanded(v => !v)}>
              {bioExpanded ? (tx.showLess || 'แสดงน้อยลง') : (tx.showMore || '...เพิ่มเติม')}
            </button>
          )}
        </Section>
      )}

      {/* ── Details ── */}
      <Section title={tx.generalInfo || 'ข้อมูลทั่วไป'}>
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
        <Section title={tx.interests || 'ความสนใจ'}>
          <div style={S.tagRow}>
            {profile.interests.map(t => (
              <span key={t} style={S.tag}>{t}</span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Photos ── */}
      {Array.isArray(profile.photos) && profile.photos.length > 0 && (
        <Section
          title={tx.photos || 'รูปภาพ'}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <div style={S.photoGrid}>
            {profile.photos.map((p, i) => (
              <img key={i} src={extractPhotoUrl(p)} alt={`photo-${i}`} style={S.photo} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Buttons ── */}
      <div style={S.btnGroup}>
        <button style={S.lotusBtn} onClick={() => navigate('/lotus')}>
          🪷 {tx.getMoreLotus || 'รับดอกบัวเพิ่ม'}
        </button>
      </div>

    </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function Section({ title, children, style }) {
  return (
    <div style={{ ...S.section, ...style }}>
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
    background: '#0f172a',
    color: '#f1f5f9',
    // Was 100px, sized for a naturally-scrolling page with trailing space
    // after the last element. Now load-bearing chrome inside a fixed
    // viewport budget, so it needs to be much smaller.
    paddingBottom: 16,
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
    padding: 'clamp(16px, 5vh, 44px) 24px clamp(12px, 3vh, 28px)',
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    gap: 6,
    flexShrink: 0,
  },
  avatarRing: {
    padding: 3,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
    marginBottom: 10,
    boxShadow: '0 0 28px rgba(233,30,99,0.4)',
  },
  avatar: {
    width: 'clamp(64px, 10vh, 100px)',
    height: 'clamp(64px, 10vh, 100px)',
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
    width: '100%',
  },

  // Sections
  section: {
    padding: '20px 20px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
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
  bioClamped: {
    margin: '0 0 4px',
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 1.75,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  bioToggle: {
    background: 'none',
    border: 'none',
    color: '#e91e63',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0 0 14px',
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

  // Photo row - was a wrapping grid, so photo count directly grew page
  // height with no ceiling. Now a single horizontally-scrolling row: any
  // number of photos fits in the same vertical space, only scroll
  // distance changes.
  photoGrid: {
    display: 'flex',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    overflowY: 'hidden',
    gap: 10,
    flex: 1,
    minHeight: 0,
  },
  photo: {
    // Fills whatever height flex:1 actually leaves for the photo row on
    // this screen; width follows via aspect-ratio so tiles stay square
    // at any size instead of being hardcoded to one pixel value.
    height: '100%',
    aspectRatio: '1 / 1',
    flexShrink: 0,
    objectFit: 'cover',
    borderRadius: 10,
  },

  // Buttons
  btnGroup: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0,
  },
  lotusBtn: {
    width: '100%',
    padding: 14,
    background: 'rgba(233,30,99,0.1)',
    border: '1px solid rgba(233,30,99,0.3)',
    borderRadius: 14,
    color: '#e91e63',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}