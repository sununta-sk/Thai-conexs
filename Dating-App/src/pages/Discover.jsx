import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useOnline } from '../context/OnlineContext';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function BanScreen({ bannedUntil, banReason }) {
  const isPermanent = !bannedUntil;
  const until = bannedUntil ? new Date(bannedUntil) : null;
  const now   = new Date();
  const diffMs   = until ? until - now : null;
  const diffDays = diffMs ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;
  const diffHrs  = diffMs ? Math.ceil(diffMs / (1000 * 60 * 60)) : null;
  let timeLabel = '';
  if (isPermanent) timeLabel = 'Permanent';
  else if (diffHrs <= 24) timeLabel = '~' + diffHrs + ' hours remaining';
  else timeLabel = '~' + diffDays + ' days remaining';
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #ef444433', borderRadius: '20px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>X</div>
        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#f87171' }}>Your account has been suspended</h2>
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
  ageMin: '',
  ageMax: '',
  city: '',
  heightMin: '',
  heightMax: '',
  weightMin: '',
  weightMax: '',
  education: '',
  children: '',
  onlineOnly: false,
  hasPhoto: false,
  orderBy: 'last_seen',
};

export default function Discover() {
  const [profiles, setProfiles] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
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
        const city = data.address?.city || data.address?.state_district || data.address?.state || '';
        if (city) await supabase.from('profiles').update({ city, last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
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
      const { data: profile } = await supabase.from('profiles').select('banned_until, ban_reason').eq('id', user.id).maybeSingle();
      if (profile) {
        const isBanned = profile.banned_until === null && profile.ban_reason ? true : profile.banned_until && new Date(profile.banned_until) > new Date();
        if (isBanned) { setBanInfo({ bannedUntil: profile.banned_until, banReason: profile.ban_reason }); setLoading(false); return; }
      }
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, details, city, last_seen_at, is_verified').neq('id', user.id);
      if (!error && data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  const filteredProfiles = useMemo(() => {
    let result = profiles.filter(p => {
      const d = p.details || {};
      const isOnline = onlineUsers.has(p.id);
      if (filters.gender !== 'all' && d.gender !== filters.gender) return false;
      const age = parseInt(d.age) || 0;
      if (filters.ageMin && age < parseInt(filters.ageMin)) return false;
      if (filters.ageMax && age > parseInt(filters.ageMax)) return false;
      if (filters.city) {
        const userCity = (p.city || d.city || '').toLowerCase();
        if (!userCity.includes(filters.city.toLowerCase())) return false;
      }
      const height = parseInt(d.height) || 0;
      if (filters.heightMin && height < parseInt(filters.heightMin)) return false;
      if (filters.heightMax && height > parseInt(filters.heightMax)) return false;
      const weight = parseInt(d.weight) || 0;
      if (filters.weightMin && weight < parseInt(filters.weightMin)) return false;
      if (filters.weightMax && weight > parseInt(filters.weightMax)) return false;
      if (filters.education && d.education !== filters.education) return false;
      if (filters.children && d.children !== filters.children) return false;
      if (filters.onlineOnly && !isOnline) return false;
      if (filters.hasPhoto && !p.avatar_url) return false;
      return true;
    });
    if (filters.orderBy === 'last_seen') {
      result.sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));
    } else if (filters.orderBy === 'newest') {
      result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    }
    return result;
  }, [profiles, filters, onlineUsers]);

  const handleStartChat = (targetUserId) => navigate('/room-chat/' + getChatId(currentUserId, targetUserId));
  const handleCardClick = (targetUserId) => {
    if (window.innerWidth >= 900) {
      navigate('/room-chat/' + getChatId(currentUserId, targetUserId));
    } else {
      navigate('/profile/' + targetUserId);
    }
  };
  const getMainPhoto = (profile) => {
    const raw = profile.avatar_url;
    if (!raw) return 'https://placehold.co/150x150/1e293b/94a3b8?text=No+Photo';
    if (typeof raw === 'string') return raw;
    return raw.url;
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  if (!loading && banInfo) return <BanScreen bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />;

  return (
    <div style={S.page}>
      <div style={S.searchBar}>
        <div style={S.searchHeader}>
          <h2 style={S.searchTitle}>Find your match</h2>
          <button onClick={() => setShowFilters(!showFilters)} style={S.toggleBtn}>
            {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>

        <div style={S.quickRow}>
          <select value={filters.gender} onChange={e => updateFilter('gender', e.target.value)} style={S.input}>
            <option value="all">All genders</option>
            <option value="male">Guys</option>
            <option value="female">Girls</option>
            <option value="other">Other</option>
          </select>
          <input type="number" placeholder="Min age" value={filters.ageMin} onChange={e => updateFilter('ageMin', e.target.value)} style={S.input} />
          <input type="number" placeholder="Max age" value={filters.ageMax} onChange={e => updateFilter('ageMax', e.target.value)} style={S.input} />
          <input type="text" placeholder="City (e.g. Bangkok)" value={filters.city} onChange={e => updateFilter('city', e.target.value)} style={S.input} />
          <select value={filters.orderBy} onChange={e => updateFilter('orderBy', e.target.value)} style={S.input}>
            <option value="last_seen">Order by Last Active</option>
            <option value="newest">Order by Newest</option>
          </select>
        </div>

        {showFilters && (
          <>
            <div style={S.advRow}>
              <input type="number" placeholder="Min height (cm)" value={filters.heightMin} onChange={e => updateFilter('heightMin', e.target.value)} style={S.input} />
              <input type="number" placeholder="Max height (cm)" value={filters.heightMax} onChange={e => updateFilter('heightMax', e.target.value)} style={S.input} />
              <input type="number" placeholder="Min weight (kg)" value={filters.weightMin} onChange={e => updateFilter('weightMin', e.target.value)} style={S.input} />
              <input type="number" placeholder="Max weight (kg)" value={filters.weightMax} onChange={e => updateFilter('weightMax', e.target.value)} style={S.input} />
              <select value={filters.education} onChange={e => updateFilter('education', e.target.value)} style={S.input}>
                <option value="">Any education</option>
                <option value="High School">High School</option>
                <option value="Bachelor">Bachelor</option>
                <option value="Master">Master</option>
                <option value="PhD">PhD</option>
              </select>
              <select value={filters.children} onChange={e => updateFilter('children', e.target.value)} style={S.input}>
                <option value="">Any children</option>
                <option value="No">No children</option>
                <option value="Has children">Has children</option>
                <option value="Want children">Want children</option>
                <option value="Don't want">Don't want children</option>
              </select>
            </div>

            <div style={S.checkRow}>
              <label style={S.checkLabel}>
                <input type="checkbox" checked={filters.onlineOnly} onChange={e => updateFilter('onlineOnly', e.target.checked)} style={S.checkbox} />
                <span>Online only</span>
              </label>
              <label style={S.checkLabel}>
                <input type="checkbox" checked={filters.hasPhoto} onChange={e => updateFilter('hasPhoto', e.target.checked)} style={S.checkbox} />
                <span>Has photo</span>
              </label>
              <button onClick={resetFilters} style={S.resetBtn}>Reset all</button>
            </div>
          </>
        )}

        <div style={S.resultCount}>
          Showing <strong style={{ color: '#e91e63' }}>{filteredProfiles.length}</strong> of {profiles.length} members
        </div>
      </div>

      {loading ? (
        <div style={S.emptyState}>Loading...</div>
      ) : filteredProfiles.length === 0 ? (
        <div style={S.emptyState}>
          {profiles.length === 0 ? 'No members found' : 'No matches for your filters. Try adjusting them.'}
        </div>
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
  searchBar: { maxWidth: '1400px', margin: '0 auto 8px', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' },
  searchHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  searchTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: 0 },
  toggleBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  quickRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 },
  advRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 10, paddingTop: 14, borderTop: '1px solid #334155' },
  checkRow: { display: 'flex', gap: 20, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 13, cursor: 'pointer' },
  checkbox: { width: 16, height: 16, accentColor: '#e91e63', cursor: 'pointer' },
  resetBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' },
  input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%' },
  resultCount: { marginTop: 14, fontSize: 12, color: '#94a3b8', textAlign: 'center', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 130px)', justifyContent: 'center', gap: '10px', padding: '15px', maxWidth: '1400px', margin: '0 auto' },
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