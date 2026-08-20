import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PROVINCES } from '../data/thaiLocations';
import { getStatesForCountryName } from '../data/worldLocations';
import { COUNTRY_LIST } from '../data/countryList';
import { useNavigate } from 'react-router-dom';
import { useOnline } from '../context/OnlineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileDiscoverFilters from '../components/MobileDiscoverFilters';
import { useTranslation } from '../hooks/useTranslation';
import officialLogo from '../lib/LotusConnexs-full.jpeg';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}
const OFFICIAL_ID = "00000000-0000-0000-0000-000000000001";

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

function isVipProfile(p) {
  return p.subscription_plan === 'gold' || p.subscription_plan === 'platinum';
}

// ── Advertiser ad rails (side margins, replaces the old TCN Referral / VIP
// promo boxes — Task 4) ──
// Placeholder designs shown in any slot with no real advertiser. Deliberately
// more than one so the rotation timer visibly cycles through different looks
// even at zero real ads configured — this is what lets the client visually
// confirm the rotation mechanism works before any advertiser buys a slot
// ("same words, different design, so you can see it's changing").
const AD_PLACEHOLDER_VARIANTS = ['gradient-pink', 'gradient-gold', 'gradient-teal', 'dark-outline', 'light-ghost'];

// Shared with the admin Ads page (AdsPage.jsx) — keep the variant keys in
// sync if either side changes.
const AD_VARIANT_STYLES = {
  'gradient-pink': { background: 'linear-gradient(135deg, #e91e63, #9c27b0)', color: '#fff', border: 'none' },
  'gradient-gold':  { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none' },
  'gradient-teal':  { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none' },
  'dark-outline':   { background: '#1e293b', color: '#f1f5f9', border: '1.5px solid #e91e63' },
  'light-ghost':    { background: 'rgba(255,255,255,0.07)', color: '#f1f5f9', border: '1.5px dashed rgba(255,255,255,0.35)' },
};

const AD_SLOTS_PER_SIDE = 6;

// One ad rail slot — either a real active ad (clickable, opens destination_url
// in a new tab) or a placeholder design. The close button sits as a sibling
// of the <a>, not inside it, so dismissing never triggers a navigation.
function AdSlot({ slot, onDismiss }) {
  const variantKey = slot.type === 'ad' ? (slot.ad.design_variant || 'gradient-pink') : slot.variant;
  const variantStyle = AD_VARIANT_STYLES[variantKey] || AD_VARIANT_STYLES['gradient-pink'];
  return (
    <div style={{ ...S.adSlot, ...variantStyle }}>
      <button type="button" style={S.adSlotClose} onClick={onDismiss} aria-label="Dismiss">✕</button>
      {slot.type === 'ad' ? (
        <a href={slot.ad.destination_url} target="_blank" rel="noopener noreferrer" style={S.adSlotLink}>
          {slot.ad.image_url && <img src={slot.ad.image_url} alt="" style={S.adSlotImg} />}
          <div style={{ minWidth: 0 }}>
            {slot.ad.advertiser_name && <p style={S.adEyebrow}>{slot.ad.advertiser_name}</p>}
            <h4 style={S.adHeadline}>{slot.ad.headline}</h4>
            {slot.ad.body_text && <p style={S.adBody}>{slot.ad.body_text}</p>}
          </div>
        </a>
      ) : (
        <div style={S.adSlotLink}>
          <div style={{ minWidth: 0 }}>
            <p style={S.adEyebrow}>AD SPACE AVAILABLE</p>
            <h4 style={S.adHeadline}>Your Advertisement Here</h4>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLastSeen(dateStr, tx) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return tx.rightNow || 'Right now';
  if (diff < 3600) return (tx.agoMinutes || '{n}m ago').replace('{n}', String(Math.floor(diff / 60)));
  if (diff < 86400) return (tx.agoHours || '{n}h ago').replace('{n}', String(Math.floor(diff / 3600)));
  return (tx.agoDays || '{n}d ago').replace('{n}', String(Math.floor(diff / 86400)));
}

const DEFAULT_FILTERS = {
  gender: 'all',
  ageRange: 'all',
  country: 'all',
  province: 'all',
  ignoreAgePref: false,
  height: 'all',
  weight: 'all',
  education: 'all',
  children: 'all',
  onlineOnly: false,
  hasPhoto: false,
  orderBy: 'random',
  username: '',
};

const AGE_VALUES = ['all', '18-24', '25-34', '35-44', '45-54', '55+'];
const HEIGHT_VALUES = ['all', '<150', '150-160', '161-170', '171-180', '181+'];
const WEIGHT_VALUES = ['all', '<50', '50-60', '61-70', '71-80', '81+'];

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
  const { tx, lang } = useTranslation(['common', 'discover', 'messages']);
  const isMobile = useIsMobile();
  if (typeof window !== 'undefined') {
    window.__debugWidth = window.innerWidth;
    console.log('[DEBUG] window.innerWidth =', window.innerWidth, 'isMobile =', isMobile);
  }
  const [profiles, setProfiles] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [passedIds, setPassedIds] = useState(new Set());
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { onlineUsers, recentlyActiveUsers, botIds } = useOnline();
  const navigate = useNavigate();

  useEffect(() => {
    // Quietly ensure the current user has a referral code, reusing the exact
    // same generation formula ProfileSetup.jsx uses (TCN-<first 6 of uid>),
    // so codes stay consistent across the app. No longer displayed on this
    // page (that surface is now the ad rails below) — UserPayoutPage is
    // where users actually see/use their code — but kept as a backstop so
    // older accounts that predate ProfileSetup's own generation still get one.
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('referral_code').eq('id', currentUserId).maybeSingle();
      if (cancelled || data?.referral_code) return;
      const code = `TCN-${currentUserId.slice(0, 6).toUpperCase()}`;
      await supabase.from('profiles').update({ referral_code: code }).eq('id', currentUserId);
    })();
    return () => { cancelled = true; };
  }, [currentUserId]);

  // ── Advertiser ad rails (side margins) — Task 4 ──
  const [ads, setAds] = useState([]);
  const [adRotationTick, setAdRotationTick] = useState(0);
  // In-memory only, on purpose: dismissing a slot hides it for this page view
  // alone, not persisted (no localStorage) — reappears on refresh. Tracked by
  // side+position, not by ad id, so a slot the visitor closed stays closed
  // even as its rotating content changes underneath it.
  const [dismissedAdSlots, setDismissedAdSlots] = useState(new Set());
  const dismissAdSlot = (side, slotIndex) => {
    setDismissedAdSlots(prev => { const next = new Set(prev); next.add(`${side}:${slotIndex}`); return next; });
  };

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('ads').select('*').eq('is_active', true).order('display_order', { ascending: true });
      if (!cancelled) setAds(data || []);
    })();
    return () => { cancelled = true; };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    // Client-side rotation only — no reload. Advancing this tick shifts which
    // ad/placeholder each slot shows (see getAdSlotContent below).
    const timer = setInterval(() => setAdRotationTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, [currentUserId]);

  function getAdSlotContent(side, slotIndex) {
    const realAds = ads.filter(a => a.side === side || a.side === 'both');
    if (realAds.length === 0) {
      return { type: 'placeholder', variant: AD_PLACEHOLDER_VARIANTS[(adRotationTick + slotIndex) % AD_PLACEHOLDER_VARIANTS.length] };
    }
    if (realAds.length <= AD_SLOTS_PER_SIDE) {
      // Everything already fits — no rotation needed, real ads first.
      if (slotIndex < realAds.length) return { type: 'ad', ad: realAds[slotIndex] };
      return { type: 'placeholder', variant: AD_PLACEHOLDER_VARIANTS[(adRotationTick + slotIndex) % AD_PLACEHOLDER_VARIANTS.length] };
    }
    // More real ads than visible slots: rotate through the full pool over
    // time so every configured ad eventually gets shown.
    const idx = (adRotationTick + slotIndex) % realAds.length;
    return { type: 'ad', ad: realAds[idx] };
  }

  useEffect(() => {
    if (!currentUserId) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + latitude + '&lon=' + longitude + '&format=json');
        const data = await res.json();
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
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, details, province, city, last_seen_at, is_verified, subscription_plan, is_founder_member, created_at').neq('id', user.id);

      // Fetch blocked + passed users to filter them out
      const { data: blocks } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id);
      const blockedIds = new Set((blocks || []).map(b => b.blocked_id));

      const { data: passes } = await supabase.from('user_passes').select('passed_id').eq('passer_id', user.id);
      const passedSet = new Set((passes || []).map(p => p.passed_id));
      setPassedIds(passedSet);

      const { data: likes } = await supabase.from('user_likes').select('liked_id').eq('liker_id', user.id);
      setLikedIds(new Set((likes || []).map(l => l.liked_id)));

      if (!error && data) {
        setProfiles(data.filter(p => !blockedIds.has(p.id) && !passedSet.has(p.id)));
      }
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  const filteredProfiles = useMemo(() => {
    const myAge = parseInt(currentUserProfile?.details?.age) || 0;

    let result = profiles.filter(p => {
      const d = p.details || {};
      const isOnline = onlineUsers.has(p.id);

      if (filters.gender !== 'all') {
        const g = (d.gender || '').toLowerCase().trim();
        const isMale = ['male', 'ชาย', 'm', 'man'].includes(g);
        const isFemale = ['female', 'หญิง', 'f', 'woman'].includes(g);
        const isTransgender = ['transgender', 'trans', 'ทรานส์เจนเดอร์', 'tg'].includes(g);
        if (filters.gender === 'male' && !isMale) return false;
        if (filters.gender === 'female' && !isFemale) return false;
        if (filters.gender === 'transgender' && !isTransgender) return false;
        if (filters.gender === 'other' && (isMale || isFemale || isTransgender || !g)) return false;
      }
      if (!inRange(d.age, filters.ageRange)) return false;
      if (filters.country !== 'all' && (p.details?.country || '') !== filters.country) return false;
      if (filters.province !== 'all' && (p.details?.province || '') !== filters.province) return false;
      if (!inRange(d.height, filters.height)) return false;
      if (!inRange(d.weight, filters.weight)) return false;
      if (filters.education !== 'all' && d.education !== filters.education) return false;
      if (filters.children !== 'all' && d.children !== filters.children) return false;
      if (filters.onlineOnly && !isOnline) return false;
      if (filters.hasPhoto && !p.avatar_url) return false;
      if (filters.username && filters.username.trim() && !(p.username || '').toLowerCase().includes(filters.username.trim().toLowerCase())) return false;

      if (!filters.ignoreAgePref && myAge) {
        const minPref = parseInt(d.preferred_age_min);
        const maxPref = parseInt(d.preferred_age_max);
        if (minPref && myAge < minPref) return false;
        if (maxPref && myAge > maxPref) return false;
      }

      return true;
    });

    if (filters.orderBy === 'random') {
      const hasPhoto = (p) => Boolean(p.avatar_url) || (Array.isArray(p.details?.photos) && p.details.photos.length > 0);
      const withPhotos = result.filter(hasPhoto);
      const withoutPhotos = result.filter(p => !hasPhoto(p));
      for (let i = withPhotos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [withPhotos[i], withPhotos[j]] = [withPhotos[j], withPhotos[i]];
      }
      withoutPhotos.sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));
      result = [...withPhotos, ...withoutPhotos];
    } else if (filters.orderBy === 'last_seen') {
      // Two-tier: real (non-bot) users by last_seen_at desc first, then bot
      // accounts by last_seen_at desc after them. Bots' last_seen_at
      // refreshes on its own cadence outside this app, so without this split
      // they could permanently outrank a genuinely active real user just by
      // having a technically-newer timestamp - real activity should always
      // win regardless of that.
      const realUsers = result.filter(p => !botIds.has(p.id));
      const bots = result.filter(p => botIds.has(p.id));
      realUsers.sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));
      bots.sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));
      result = [...realUsers, ...bots];
    } else if (filters.orderBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    // VIP users (active paid subscription) surface above everyone else,
    // shuffled among themselves fresh each time this recomputes; non-VIP
    // users keep whatever order the block above produced.
    const vip = result.filter(isVipProfile);
    const nonVip = result.filter(p => !isVipProfile(p));
    for (let i = vip.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vip[i], vip[j]] = [vip[j], vip[i]];
    }
    result = [...vip, ...nonVip];

    return result;
  }, [profiles, filters, onlineUsers, botIds, currentUserProfile]);

  const handleStartChat = (targetUserId) => navigate('/room-chat/' + getChatId(currentUserId, targetUserId));

  const handleToggleLike = async (targetUserId) => {
    if (!currentUserId) return;
    if (likedIds.has(targetUserId)) {
      await supabase.from('user_likes').delete().match({ liker_id: currentUserId, liked_id: targetUserId });
      setLikedIds(prev => { const next = new Set(prev); next.delete(targetUserId); return next; });
    } else {
      await supabase.from('user_likes').insert({ liker_id: currentUserId, liked_id: targetUserId });
      setLikedIds(prev => { const next = new Set(prev); next.add(targetUserId); return next; });
    }
  };

  const handlePass = async (targetUserId) => {
    if (!currentUserId) return;
    // Optimistic: remove from grid immediately
    setProfiles(prev => prev.filter(p => p.id !== targetUserId));
    setPassedIds(prev => { const next = new Set(prev); next.add(targetUserId); return next; });
    // Persist
    const { error } = await supabase.from('user_passes').insert({ passer_id: currentUserId, passed_id: targetUserId });
    if (error && !String(error.message).includes('duplicate')) {
      console.error('[Pass] failed:', error.message);
    }
  };

  const handleCardClick = (targetUserId) => {
    if (!isMobile) navigate('/room-chat/' + getChatId(currentUserId, targetUserId));
    else navigate('/profile/' + targetUserId);
  };
  const getMainPhoto = (profile) => {
    if (profile.id === OFFICIAL_ID) return officialLogo;
    const raw = profile.avatar_url;
    if (!raw) return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect width="150" height="150" fill="#1e293b"/><text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="central">👤</text></svg>');
    if (typeof raw === 'string') return raw;
    return raw.url;
  };

  const ageRanges = useMemo(() => {
    const labels = { all: tx.allAges || 'All ages' };
    return AGE_VALUES.map((v) => ({ value: v, label: labels[v] || v }));
  }, [tx]);

  const heightRanges = useMemo(() => {
    const m = {
      all: tx.anyHeight || 'Any height',
      '<150': tx.heightUnder150,
      '150-160': tx.height150_160,
      '161-170': tx.height161_170,
      '171-180': tx.height171_180,
      '181+': tx.height181Plus,
    };
    return HEIGHT_VALUES.map((v) => ({ value: v, label: m[v] || v }));
  }, [tx]);

  const weightRanges = useMemo(() => {
    const m = {
      all: tx.anyWeight || 'Any weight',
      '<50': tx.weightUnder50,
      '50-60': tx.weight50_60,
      '61-70': tx.weight61_70,
      '71-80': tx.weight71_80,
      '81+': tx.weight81Plus,
    };
    return WEIGHT_VALUES.map((v) => ({ value: v, label: m[v] || v }));
  }, [tx]);

  const provinceLabel = (p) => (p?.name && (p.name[lang] || p.name.en)) || p?.id || '';

  // Province filter options depend on the selected country: Thai provinces for
  // Thailand/"all", or that country's states/provinces (worldLocations.js) otherwise.
  const provinceFilterOptions = useMemo(() => {
    if (filters.country === 'all' || filters.country === 'Thailand') {
      return PROVINCES.map(p => ({ value: p.id, label: provinceLabel(p) }));
    }
    return getStatesForCountryName(filters.country).map(s => ({ value: s.name, label: s.name }));
  }, [filters.country, lang]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  // Changing country invalidates the previous province/state selection.
  const updateCountryFilter = (value) => setFilters(prev => ({ ...prev, country: value, province: 'all' }));

  if (!loading && banInfo) return <BanScreen bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />;

  // Card grid: mobile keeps the exact literal 'repeat(6, 130px)' string
  // unchanged, because hooks/useIsMobile.js's injected CSS
  // (.mobile-active [style*="repeat(6, 130px)"]) string-matches that exact
  // value to force 3 columns on mobile. Laptop/desktop (>=768px) instead
  // gets a fluid track so column count and card width grow with the
  // viewport instead of staying frozen at a fixed 6x130px island.
  //
  // S.grid's maxWidth (below) is now 1100px to match S.searchBar's 1100px -
  // it was previously 1400px, a mismatch that was invisible under the old
  // fixed repeat(6, 130px) track (always ~830px of actual card content,
  // comfortably narrower than either box, so it never reached either cap)
  // but became a visible edge overflow once the track went fluid, since
  // 1fr tracks stretch to fill their full container width. Matching
  // horizontal padding (18px, same as searchBar's) here too so the card
  // edges line up with the filter bar's edges exactly, not just the caps.
  // maxWidth is changed on the shared S.grid object itself (not just this
  // !isMobile branch) because it's inert on mobile - the viewport is
  // always far narrower than either 1100px or 1400px there, so this has
  // zero visual effect on mobile.
  // maxWidth is overridden only in this !isMobile branch (not on the shared
  // S.grid object) so mobile keeps its exact original 1100px, untouched —
  // the --tcn-grid-max CSS var (defined alongside the promo boxes above)
  // shrinks the grid on laptop-tier widths so it and both promo boxes fit
  // side-by-side without overlap, reaching the original fixed 1100px again
  // once the viewport is wide enough (~1560px+).
  const gridStyle = isMobile
    ? S.grid
    : { ...S.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', padding: '15px 18px', maxWidth: 'var(--tcn-grid-max)' };

  // Same --tcn-grid-max narrowing as gridStyle above, applied to the filter
  // bar too, so both stay the same width (and same left/right edges) at
  // every viewport instead of the filter bar staying frozen at 1100px and
  // getting overlapped by the ad rail once the grid — but not the filter
  // bar — started narrowing to make room for it.
  const searchBarStyle = { ...S.searchBar, maxWidth: 'var(--tcn-grid-max)' };

  // Card text/badges: fixed sizes preserved exactly on mobile; scale up via
  // clamp() on laptop/desktop as cards get wider.
  const nameStyle = isMobile ? S.name : { ...S.name, fontSize: 'clamp(13px, 1vw + 7px, 16px)' };
  const metaStyle = isMobile ? S.meta : { ...S.meta, fontSize: 'clamp(11px, 0.8vw + 6px, 14px)' };
  const verifiedBadgeStyle = isMobile ? S.verifiedBadge : { ...S.verifiedBadge, fontSize: 'clamp(9px, 0.5vw + 6px, 11px)' };
  const vipBadgeStyle = isMobile ? S.vipBadge : { ...S.vipBadge, fontSize: 'clamp(8px, 0.5vw + 5px, 10px)' };
  const founderBadgeStyle = isMobile ? S.founderBadge : { ...S.founderBadge, fontSize: 'clamp(9px, 0.5vw + 6px, 12px)' };

  return (
    <div style={{ ...S.page, position: 'relative', paddingTop: isMobile ? 0 : 90 }}>
      <style>{`
        @keyframes vipShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        /* Ad rail width scales 120px->200px as viewport grows 768px->~1429px,
           then holds at 200px (matches the box width used before this was made
           responsive). Grid max-width is solved so grid + both rails + gaps +
           edge insets always sum to <=100vw, reaching the original fixed
           1100px cap once there's room (at ~1560px+), unchanged above that. */
        /* Ad rail: top aligns with the top of the search/filter bar (i.e.
           right at the bottom of the fixed 90px navbar — matches S.page's
           paddingTop below), not with the card grid. Slot height is solved
           from actual available viewport height so all 6 stacked slots +
           their gaps fit within one screen on load: 100vh minus the navbar
           (90px) minus a small bottom margin (20px) minus 5 inter-slot gaps,
           divided across 6 slots. clamp() floors it at 60px (still legible)
           and caps it at 130px (so very tall monitors don't get oversized
           slots) — outside that band a *little* scroll may be needed, but
           800/900/1080px-tall viewports all land comfortably inside it. */
        :root {
          --tcn-box-w: clamp(120px, 14vw, 200px);
          --tcn-grid-max: min(1100px, calc(100vw - 60px - 2 * var(--tcn-box-w)));
          --tcn-ad-top: 90px;
          --tcn-ad-gap: clamp(6px, 1vh, 10px);
          --tcn-ad-slot-h: clamp(60px, calc((100vh - var(--tcn-ad-top) - 20px - (5 * var(--tcn-ad-gap))) / 6), 130px);
        }
        .tcn-promo-box { display: none; }
        @media (min-width: 768px) {
          /* 768px matches MOBILE_BREAKPOINT in hooks/useIsMobile.js */
          .tcn-promo-box { display: block; }
        }
      `}</style>
      {/* Ad rails: 6 stacked slots per side (Task 4). Positioned absolute
          (not fixed) relative to this page's own box — see S.page's
          position:relative below — so the rail scrolls with the page instead
          of being pinned to viewport height, which is what lets it track
          the page instead of clipping against the viewport.
          top: var(--tcn-ad-top) (90px) lines the rail's top edge up with the
          top of the search/filter bar, which sits immediately after that
          same 90px of paddingTop on S.page. Slot height (see --tcn-ad-slot-h
          above) is computed from actual viewport height so all 6 fit on load
          without needing to scroll the rail into view.
          Gated on currentUserId, matching the old promo boxes' timing so
          this still appears in step with WelcomeModal. */}
      {currentUserId && (
        <>
          <div className="tcn-promo-box" style={{ ...S.adRail, left: 'calc(50% - var(--tcn-grid-max) / 2 - 24px - var(--tcn-box-w))' }}>
            {Array.from({ length: AD_SLOTS_PER_SIDE }).map((_, i) => (
              dismissedAdSlots.has(`left:${i}`) ? null : (
                <AdSlot key={i} slot={getAdSlotContent('left', i)} onDismiss={() => dismissAdSlot('left', i)} />
              )
            ))}
          </div>
          <div className="tcn-promo-box" style={{ ...S.adRail, right: 'calc(50% - var(--tcn-grid-max) / 2 - 24px - var(--tcn-box-w))' }}>
            {Array.from({ length: AD_SLOTS_PER_SIDE }).map((_, i) => (
              dismissedAdSlots.has(`right:${i}`) ? null : (
                <AdSlot key={i} slot={getAdSlotContent('right', i)} onDismiss={() => dismissAdSlot('right', i)} />
              )
            ))}
          </div>
        </>
      )}
      {isMobile && (
        <MobileDiscoverFilters
          filters={filters}
          updateFilter={updateFilter}
          updateCountryFilter={updateCountryFilter}
          provinceOptions={provinceFilterOptions}
          tx={tx}
          lang={lang}
        />
      )}
      {!isMobile && (
      <div style={searchBarStyle}>
        {/* Row 1 */}
        <div style={S.row}>
          <select value={filters.gender} onChange={e => updateFilter('gender', e.target.value)} style={S.input}>
            <option value="all">{tx.genderAll || "Guys & Girls"}</option>
            <option value="male">{tx.genderMale || "Guys"}</option>
            <option value="female">{tx.genderFemale || "Girls"}</option>
            <option value="transgender">{tx.genderTransgender || "Transgender"}</option>
            <option value="other">{tx.genderOther || "Other"}</option>
          </select>

          <select value={filters.ageRange} onChange={e => updateFilter('ageRange', e.target.value)} style={S.input}>
            {ageRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select value={filters.province} onChange={e => updateFilter('province', e.target.value)} style={S.input}>
            <option value="all">{tx.allProvinces || "All provinces"}</option>
            {provinceFilterOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select value={filters.ignoreAgePref ? 'ignore' : 'respect'} onChange={e => updateFilter('ignoreAgePref', e.target.value === 'ignore')} style={S.input}>
            <option value="respect">{tx.respectAgePref || "Respect their age range"}</option>
            <option value="ignore">{tx.ignoreAgePref || "Ignore their age range"}</option>
          </select>

          <button type="button" style={S.searchBtn} onClick={() => {}}>{tx.search || "Search"}</button>
        </div>

        {/* Row 2 */}
        <div style={S.row}>
          <select value={filters.height} onChange={e => updateFilter('height', e.target.value)} style={S.input}>
            {heightRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select value={filters.weight} onChange={e => updateFilter('weight', e.target.value)} style={S.input}>
            {weightRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select value={filters.education} onChange={e => updateFilter('education', e.target.value)} style={S.input}>
            <option value="all">{tx.anyEducation || "Any education"}</option>
            <option value="High School">{tx.eduHighSchool || "High School"}</option>
            <option value="Bachelor">{tx.eduBachelor || "Bachelor"}</option>
            <option value="Master">{tx.eduMaster || "Master"}</option>
            <option value="PhD">{tx.eduPhD || "PhD"}</option>
          </select>

          <select value={filters.children} onChange={e => updateFilter('children', e.target.value)} style={S.input}>
            <option value="all">{tx.anyChildren || "Any children"}</option>
            <option value="No">{tx.childNo || "No children"}</option>
            <option value="Has children">{tx.childHas || "Has children"}</option>
            <option value="Want children">{tx.childWant || "Want children"}</option>
            <option value="Don't want">{tx.childDontWant || "Don't want children"}</option>
          </select>

          <div style={S.checks}>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={filters.onlineOnly} onChange={e => updateFilter('onlineOnly', e.target.checked)} style={S.checkbox} />
              {tx.onlineOnly || 'Online'}
            </label>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={filters.hasPhoto} onChange={e => updateFilter('hasPhoto', e.target.checked)} style={S.checkbox} />
              {tx.hasPhotoOnly || 'Photo'}
            </label>
          </div>
        </div>

        {/* Row 3 */}
        <div style={S.row}>
          <select value={filters.country} onChange={e => updateCountryFilter(e.target.value)} style={S.input}>
            <option value="all">{tx.allCountries || "All countries"}</option>
            {COUNTRY_LIST.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={filters.username}
            onChange={e => updateFilter('username', e.target.value)}
            placeholder={tx.searchUsername || "Search username..."}
            style={{ ...S.input, cursor: 'text', gridColumn: 'span 2' }}
          />
          <select value={filters.orderBy} onChange={e => updateFilter('orderBy', e.target.value)} style={S.input}>
            <option value="random">{tx.orderRandom || "Sort by Random"}</option>
            <option value="last_seen">{tx.orderLastActive || "Sort by Last Active"}</option>
            <option value="newest">{tx.orderNewest || "Sort by Newest"}</option>
          </select>
          <div style={S.resultCount}>
            {(tx.memberCount || '{shown} of {total} members')
              .replace('{shown}', String(filteredProfiles.length))
              .replace('{total}', String(profiles.length))}
          </div>
        </div>
      </div>
      )}

      {/* GRID */}
      {loading ? (
        <div style={S.emptyState}>{tx.loadingMembers || tx.loading || 'Loading...'}</div>
      ) : filteredProfiles.length === 0 ? (
        <div style={S.emptyState}>{profiles.length === 0 ? (tx.noMembersFound || 'No members found') : (tx.noMatchesAdjust || 'No matches. Try adjusting your filters.')}</div>
      ) : (
        <div style={gridStyle}>
          {filteredProfiles.map((profile) => {
            const photoUrl = getMainPhoto(profile);
            const isOnline = onlineUsers.has(profile.id);
            const isRecentlyActive = !isOnline && recentlyActiveUsers.has(profile.id);
            const age = profile.details?.age ?? '';
            const gender = profile.details?.gender ?? '';
            const city = profile.city || profile.details?.city || '';
            const metaParts = [age, gender ? gender[0].toUpperCase() : '', city].filter(Boolean);
            return (
              <div key={profile.id} style={S.card}>
                <div style={isVipProfile(profile) ? S.vipFrame : S.vipFrameOff}>
                  <div style={S.photoWrap} onClick={() => handleCardClick(profile.id)}>
                    <img src={photoUrl} alt={profile.username} style={S.photo} loading="lazy" />
                    {profile.is_verified && <div style={verifiedBadgeStyle}>V</div>}
                    {isVipProfile(profile) && <div style={vipBadgeStyle}>VIP</div>}
                    {profile.is_founder_member && <div style={founderBadgeStyle}>🌟</div>}
                    <div
                      style={{ ...S.onlineBadge, background: isOnline ? '#4cd964' : isRecentlyActive ? '#fbbf24' : '#64748b' }}
                      title={isOnline ? (tx.online || 'Online') : isRecentlyActive ? 'Recently Active' : undefined}
                    />
                  </div>
                </div>
                <div style={S.info}>
                  <div style={nameStyle}>{profile.username || '-'}</div>
                  {metaParts.length > 0 && <div style={metaStyle}>{metaParts.join(', ')}</div>}
                </div>
                <div style={S.actions}>
                  <button type="button" style={S.btnX} title={tx.passHide || 'Pass'} onClick={e => { e.stopPropagation(); handlePass(profile.id); }}>{tx.hideBtn || '✕'}</button>
                  <button type="button" style={likedIds.has(profile.id) ? S.btnLiked : S.btnLike} onClick={e => { e.stopPropagation(); handleToggleLike(profile.id); }}>{likedIds.has(profile.id) ? '❤' : '♡'}</button>
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
    maxWidth: '1100px',
    margin: '0 auto',
  },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' },
  vipFrameOff: { display: 'block' },
  vipFrame: {
    display: 'block',
    padding: 3,
    boxSizing: 'border-box',
    background: 'linear-gradient(90deg, #f06292, #ffb74d, #4fc3f7, #ba68c8, #f06292)',
    backgroundSize: '300% 100%',
    animation: 'vipShimmer 5s linear infinite',
  },
  photoWrap: { position: 'relative', width: '100%', aspectRatio: '1/1', background: '#334155', overflow: 'hidden' },
  photo: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  verifiedBadge: { position: 'absolute', top: 5, left: 5, width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  vipBadge: { position: 'absolute', bottom: 5, left: 5, padding: '2px 6px', borderRadius: 4, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 0.3 },
  founderBadge: { position: 'absolute', bottom: 5, right: 5, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  onlineBadge: { position: 'absolute', top: 5, right: 5, width: 11, height: 11, borderRadius: '50%', border: '2px solid #1e293b' },
  info: { padding: '8px 8px 4px', flex: 1, minHeight: 56 },
  name: { fontSize: '13px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: '11px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  lastSeen: { fontSize: '10px', marginTop: '1px', fontWeight: 600 },
  actions: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px', borderTop: '1px solid #334155' },
  btnX: { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: '3px 10px' },
  btnChat: { background: 'rgba(233, 30, 99, 0.15)', border: '1px solid rgba(233, 30, 99, 0.3)', borderRadius: '12px', color: '#e91e63', fontSize: '13px', cursor: 'pointer', padding: '3px 10px' },
  btnLike: { background: 'rgba(233, 30, 99, 0.15)', border: '1px solid rgba(233, 30, 99, 0.3)', borderRadius: '12px', color: '#e91e63', fontSize: '16px', cursor: 'pointer', padding: '3px 14px', lineHeight: 1 },
  btnLiked: { background: '#e91e63', border: '1px solid #e91e63', borderRadius: '12px', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '3px 14px', lineHeight: 1 },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: 14 },

  // Advertiser ad rails (side margins, desktop-wide only — see .tcn-promo-box
  // media query). Absolute (not fixed) so the rail scrolls with the page —
  // see the position:'relative' on S.page and the comment above the render.
  adRail: {
    position: 'absolute',
    top: 'var(--tcn-ad-top)',
    width: 'var(--tcn-box-w)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--tcn-ad-gap)',
    zIndex: 30,
  },
  adSlot: {
    position: 'relative',
    minHeight: 'var(--tcn-ad-slot-h)',
    boxSizing: 'border-box',
    borderRadius: 12,
    padding: '10px 12px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  adSlotClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: 'inherit',
    fontSize: 10,
    lineHeight: '18px',
    padding: 0,
    cursor: 'pointer',
    zIndex: 1,
  },
  adSlotLink: { display: 'flex', alignItems: 'center', gap: 8, height: '100%', textDecoration: 'none', color: 'inherit' },
  adSlotImg: { width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  adEyebrow: { margin: '0 18px 3px 0', fontSize: 9, fontWeight: 800, letterSpacing: 0.3, opacity: 0.85 },
  adHeadline: { margin: 0, fontSize: 12.5, fontWeight: 800, lineHeight: 1.25 },
  adBody: { margin: '3px 0 0', fontSize: 10, lineHeight: 1.3, opacity: 0.9 },
};
