import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PROVINCES } from '../data/thaiLocations';
import { useNavigate } from 'react-router-dom';
import { useOnline } from '../context/OnlineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileDiscoverFilters from '../components/MobileDiscoverFilters';
import { useTranslation } from '../hooks/useTranslation';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function BanScreen({ bannedUntil, banReason }) {
  const isPermanent = !bannedUntil;
  const until = bannedUntil ? new Date(bannedUntil) : null;
  const now = new Date();
  const diffMs = until ? until - now : null;
  const diffDays = diffMs ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;
  const diffHrs = diffMs ? Math.ceil(diffMs / (1000 * 60 * 60)) : null;
  let timeLabel = '';
  if (isPermanent) timeLabel = 'Permanent';
  else if (diffHrs <= 24) timeLabel = '~' + diffHrs + ' hours remaining';
  else timeLabel = '~' + diffDays + ' days remaining';
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #ef444433', borderRadius: '20px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>X</div>
        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#f87171' }}>Account suspended</h2>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '12px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Reason</div>
          <div style={{ fontSize: '15px', color: '#f1f5f9' }}>{banReason || 'Violation of terms of service'}</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Duration</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: isPermanent ? '#f87171' : '#fbbf24' }}>{timeLabel}</div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); }} style={{ width: '100%', padding: '13px', borderRadius: '30px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Right Now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

const DEFAULT_FILTERS = {
  gender: 'all',
  ageRange: 'all',
  province: 'all',
  ignoreAgePref: false,
  height: 'all',
  weight: 'all',
  education: 'all',
  children: 'all',
  onlineOnly: false,
  hasPhoto: false,
  orderBy: 'last_seen',
};

const AGE_RANGES = [
  { value: 'all', label: 'All ages' },
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
];

const HEIGHT_RANGES = [
  { value: 'all', label: 'Any height' },
  { value: '<150', label: 'Under 150 cm' },
  { value: '150-160', label: '150-160 cm' },
  { value: '161-170', label: '161-170 cm' },
  { value: '171-180', label: '171-180 cm' },
  { value: '181+', label: 'Over 180 cm' },
];

const WEIGHT_RANGES = [
  { value: 'all', label: 'Any weight' },
  { value: '<50', label: 'Under 50 kg' },
  { value: '50-60', label: '50-60 kg' },
  { value: '61-70', label: '61-70 kg' },
  { value: '71-80', label: '71-80 kg' },
  { value: '81+', label: 'Over 80 kg' },
];

function inRange(value, range) {
  if (range === 'all' || !value) return true;
  const num = parseInt(value);
  if (isNaN(num)) return false;
  if (range.includes('-')) {
    const [min, max] = range.split('-').map(Number);
    return num >= min && num <= max;
  }
  if (range.startsWith('<')) return num < parseInt(range.slice(1));
  if (range.endsWith('+')) return num >= parseInt(range);
  return true;
}

export default function Discover() {
  const { tx } = useTranslation(['common', 'discover', 'messages']);
  const [profiles, setProfiles] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { onlineUsers } = useOnline();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUserId) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + latitude + '&lon=' + longitude + '&format=json');
        const data = await res.json();
        // City now manually selected via Province dropdown — only update last_seen_at
        await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
      } catch {}
    }, () => {
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
    });
  }, [currentUserId]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('banned_until, ban_reason, details').eq('id', user.id).maybeSingle();
      if (profile) {
        setCurrentUserProfile(profile);
        const isBanned = profile.banned_until === null && profile.ban_reason ? true : profile.banned_until && new Date(profile.banned_until) > new Date();
        if (isBanned) { setBanInfo({ bannedUntil: profile.banned_until, banReason: profile.ban_reason }); setLoading(false); return; }
      }
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, details, province, city, last_seen_at, is_verified').neq('id', user.id);
      if (!error && data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  const filteredProfiles = useMemo(() => {
    const myAge = parseInt(currentUserProfile?.details?.age) || 0;

    let result = profiles.filter(p => {
      const d = p.details || {};
      const isOnline = onlineUsers.has(p.id);

      if (filters.gender !== 'all' && d.gender !== filters.gender) return false;
      if (!inRange(d.age, filters.ageRange)) return false;
      if (filters.province !== 'all' && (p.details?.province || '') !== filters.province) return false;
      if (!inRange(d.height, filters.height)) return false;
      if (!inRange(d.weight, filters.weight)) return false;
      if (filters.education !== 'all' && d.education !== filters.education) return false;
      if (filters.children !== 'all' && d.children !== filters.children) return false;
      if (filters.onlineOnly && !isOnline) return false;
      if (filters.hasPhoto && !p.avatar_url) return false;

      // Ignore their age range (respect their preferred_age_min/max if set)
      if (!filters.ignoreAgePref && myAge) {
        const minPref = parseInt(d.preferred_age_min);
        const maxPref = parseInt(d.preferred_age_max);
        if (minPref && myAge < minPref) return false;
        if (maxPref && myAge > maxPref) return false;
      }

      return true;
    });

    if (filters.orderBy === 'last_seen') {
      result.sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));
    } else if (filters.orderBy === 'newest') {
      result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    }
    return result;
  }, [profiles, filters, onlineUsers, currentUserProfile]);

  const handleStartChat = (targetUserId) => navigate('/room-chat/' + getChatId(currentUserId, targetUserId));
  const handleCardClick = (targetUserId) => {
    if (!isMobile) navigate('/room-chat/' + getChatId(currentUserId, targetUserId));
    else navigate('/profile/' + targetUserId);
  };
  const getMainPhoto = (profile) => {
    const raw = profile.avatar_url;
    if (!raw) return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect width="150" height="150" fill="#1e293b"/><text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="central">👤</text></svg>');
    if (typeof raw === 'string') return raw;
    return raw.url;
  };

  const isMobile = useIsMobile();

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  if (!loading && banInfo) return <BanScreen bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />;

  return (
    <div style={{ ...S.page, paddingTop: isMobile ? 0 : 90 }}>
      {isMobile && <MobileDiscoverFilters filters={filters} updateFilter={updateFilter} tx={tx} />}
      {/* SEARCH BAR — ThaiFriendly compact 3-row layout */}
      <div style={S.searchBar}>
        {/* Row 1 */}
        <div style={S.row}>
          <select value={filters.gender} onChange={e => updateFilter('gender', e.target.value)} style={S.input}>
            <option value="all">{tx.genderAll || "Guys & Girls"}</option>
            <option value="male">{tx.genderMale || "Guys"}</option>
            <option value="female">{tx.genderFemale || "Girls"}</option>
            <option value="other">{tx.genderOther || "Other"}</option>
          </select>

          <select value={filters.ageRange} onChange={e => updateFilter('ageRange', e.target.value)} style={S.input}>
            {AGE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select value={filters.province} onChange={e => updateFilter('province', e.target.value)} style={S.input}>
            <option value="all">{tx.allProvinces || "All provinces"}</option>
            {PROVINCES.map(p => (
              <option key={p.id} value={p.id}>{p.name.en}</option>
            ))}
          </select>

          <select value={filters.ignoreAgePref ? 'ignore' : 'respect'} onChange={e => updateFilter('ignoreAgePref', e.target.value === 'ignore')} style={S.input}>
            <option value="respect">{tx.respectAgePref || "Respect their age range"}</option>
            <option value="ignore">{tx.ignoreAgePref || "Ignore their age range"}</option>
          </select>

          <button style={S.searchBtn} onClick={() => {}}>{tx.search || "Search"}</button>
        </div>

        {/* Row 2 */}
        <div style={S.row}>
          <select value={filters.height} onChange={e => updateFilter('height', e.target.value)} style={S.input}>
            {HEIGHT_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select value={filters.weight} onChange={e => updateFilter('weight', e.target.value)} style={S.input}>
            {WEIGHT_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select value={filters.education} onChange={e => updateFilter('education', e.target.value)} style={S.input}>
            <option value="all">{tx.anyEducation || "Any education"}</option>
            <option value="High School">High School</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Master">Master</option>
            <option value="PhD">PhD</option>
          </select>

          <select value={filters.children} onChange={e => updateFilter('children', e.target.value)} style={S.input}>
            <option value="all">{tx.anyChildren || "Any children"}</option>
            <option value="No">No children</option>
            <option value="Has children">Has children</option>
            <option value="Want children">Want children</option>
            <option value="Don't want">Don't want children</option>
          </select>

          <div style={S.checks}>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={filters.onlineOnly} onChange={e => updateFilter('onlineOnly', e.target.checked)} style={S.checkbox} />
              Online
            </label>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={filters.hasPhoto} onChange={e => updateFilter('hasPhoto', e.target.checked)} style={S.checkbox} />
              Photo
            </label>
          </div>
        </div>

        {/* Row 3 */}
        <div style={S.row}>
          <div />
          <div />
          <div />
          <select value={filters.orderBy} onChange={e => updateFilter('orderBy', e.target.value)} style={S.input}>
            <option value="last_seen">Order by Last Active</option>
            <option value="newest">Order by Newest</option>
          </select>
          <div style={S.resultCount}>
            <strong style={{ color: '#e91e63' }}>{filteredProfiles.length}</strong> of {profiles.length} members
          </div>
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div style={S.emptyState}>Loading...</div>
      ) : filteredProfiles.length === 0 ? (
        <div style={S.emptyState}>{profiles.length === 0 ? 'No members found' : 'No matches. Try adjusting your filters.'}</div>
      ) : (
        <div style={S.grid}>
          {filteredProfiles.map((profile) => {
            const photoUrl = getMainPhoto(profile);
            const isOnline = onlineUsers.has(profile.id);
            const age = profile.details?.age ?? '';
            const gender = profile.details?.gender ?? '';
            const city = profile.city || profile.details?.city || '';
            const lastSeen = isOnline ? 'Right Now' : timeAgo(profile.last_seen_at);
            const metaParts = [age, gender ? gender[0].toUpperCase() : '', city].filter(Boolean);
            return (
              <div key={profile.id} style={S.card}>
                <div style={S.photoWrap} onClick={() => handleCardClick(profile.id)}>
                  <img src={photoUrl} alt={profile.username} style={S.photo} />
                  {profile.is_verified && <div style={S.verifiedBadge}>V</div>}
                  <div style={{ ...S.onlineBadge, background: isOnline ? '#4cd964' : '#64748b' }} />
                </div>
                <div style={S.info}>
                  <div style={S.name}>{profile.username || '-'}</div>
                  {metaParts.length > 0 && <div style={S.meta}>{metaParts.join(', ')}</div>}
                  <div style={{ ...S.lastSeen, color: isOnline ? '#4caf50' : '#64748b' }}>{lastSeen}</div>
                </div>
                <div style={S.actions}>
                  <button style={S.btnX} onClick={e => e.stopPropagation()}>X</button>
                  <button style={S.btnChat} onClick={e => { e.stopPropagation(); handleStartChat(profile.id); }}>Chat</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  page: { background: '#0f172a', minHeight: '100vh', paddingBottom: 80, paddingTop: 90 },

  searchBar: {
    maxWidth: '1100px',
    margin: '0 auto 12px',
    padding: '14px 18px',
    background: '#1e293b',
    borderRadius: '10px',
    border: '1px solid #334155',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  input: {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    cursor: 'pointer',
  },
  searchBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(233, 30, 99, 0.4)',
  },
  checks: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 4,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#cbd5e1',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  checkbox: { width: 14, height: 14, accentColor: '#e91e63', cursor: 'pointer' },
  resultCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 600,
    textAlign: 'right',
    paddingRight: 4,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 130px)',
    justifyContent: 'center',
    gap: '10px',
    padding: '15px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' },
  photoWrap: { position: 'relative', width: '100%', aspectRatio: '1/1', background: '#334155', overflow: 'hidden' },
  photo: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  verifiedBadge: { position: 'absolute', top: 5, left: 5, width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  onlineBadge: { position: 'absolute', top: 5, right: 5, width: 11, height: 11, borderRadius: '50%', border: '2px solid #1e293b' },
  info: { padding: '8px 8px 4px' },
  name: { fontSize: '13px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: '11px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  lastSeen: { fontSize: '10px', marginTop: '1px', fontWeight: 600 },
  actions: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px', borderTop: '1px solid #334155' },
  btnX: { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: '3px 10px' },
  btnChat: { background: 'rgba(233, 30, 99, 0.15)', border: '1px solid rgba(233, 30, 99, 0.3)', borderRadius: '12px', color: '#e91e63', fontSize: '13px', cursor: 'pointer', padding: '3px 10px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: 14 },
};