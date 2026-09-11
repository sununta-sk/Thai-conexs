import { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PROVINCES } from '../data/thaiLocations';
import { getStatesForCountryName } from '../data/worldLocations';
import { COUNTRY_LIST } from '../data/countryList';
import { useNavigate } from 'react-router-dom';
import { useOnline } from '../context/OnlineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileDiscoverFilters from '../components/MobileDiscoverFilters';
import { BOTTOM_H as MOBILE_NAV_BOTTOM_H } from '../components/MobileNavbar';
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

// ── Advertiser ad rail (side margins, replaces the old TCN Referral / VIP
// promo boxes — Task 4, then reverted from "6 stacked slots" back to a
// single box per side per client correction) ──
// Placeholder designs shown in the box when there's no real advertiser yet.
// Originally "same words, different design" (only the background/border
// cycled) — client reported that as "static, not rotating", since the one
// thing a viewer actually reads (the headline) never changed; a color/border
// shift 10s apart is easy to miss entirely. Each variant now carries its own
// eyebrow/headline too, so the visible copy itself changes every tick, not
// just the styling underneath it.
const AD_PLACEHOLDER_VARIANTS = [
  { variant: 'gradient-pink',  eyebrow: 'AD SPACE AVAILABLE',   headline: 'Your Advertisement Here' },
  { variant: 'gradient-gold',  eyebrow: 'PROMOTE YOUR BUSINESS', headline: 'Reach Real Singles Today' },
  { variant: 'gradient-teal',  eyebrow: 'AD SPACE AVAILABLE',   headline: 'Get Seen By Thousands' },
  { variant: 'dark-outline',   eyebrow: 'ADVERTISE HERE',       headline: 'Your Brand, Your Audience' },
  { variant: 'light-ghost',    eyebrow: 'AD SPACE AVAILABLE',   headline: 'Contact Us To Advertise' },
];

// Shared with the admin Ads page (AdsPage.jsx) — keep the variant keys in
// sync if either side changes. 'gradient-pink' is deliberately identical to
// the original (pre-Task-4) TCN Referral/VIP promo box's gradient, so the
// default look here matches "the original promo boxes" per the reverted spec.
const AD_VARIANT_STYLES = {
  'gradient-pink': { background: 'linear-gradient(135deg, #e91e63, #9c27b0)', color: '#fff', border: 'none' },
  'gradient-gold':  { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none' },
  'gradient-teal':  { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none' },
  'dark-outline':   { background: '#1e293b', color: '#f1f5f9', border: '1.5px solid #e91e63' },
  'light-ghost':    { background: 'rgba(255,255,255,0.07)', color: '#f1f5f9', border: '1.5px dashed rgba(255,255,255,0.35)' },
};

// The single box per side rotates through up to this many configured ads
// (by display_order), looping back to the first after the last — not 6
// simultaneous boxes any more, just the rotation pool size.
const AD_POOL_SIZE = 6;

// The single ad box for one side — either a real active ad (clickable, opens
// destination_url in a new tab) or a placeholder design. The close button
// sits as a sibling of the <a>, not inside it, so dismissing never triggers
// a navigation.
function AdBox({ content, onDismiss, sideStyle }) {
  const variantKey = content.type === 'ad' ? (content.ad.design_variant || 'gradient-pink') : content.variant;
  const variantStyle = AD_VARIANT_STYLES[variantKey] || AD_VARIANT_STYLES['gradient-pink'];
  return (
    <div className="tcn-promo-box" style={{ ...S.adBox, ...sideStyle, ...variantStyle }}>
      <button type="button" style={S.adBoxClose} onClick={onDismiss} aria-label="Dismiss">✕</button>
      {content.type === 'ad' ? (
        <a href={content.ad.destination_url} target="_blank" rel="noopener noreferrer" style={S.adBoxLink}>
          {content.ad.image_url && <img src={content.ad.image_url} alt="" style={S.adBoxImg} />}
          <div style={{ minWidth: 0 }}>
            {content.ad.advertiser_name && <p style={S.adEyebrow}>{content.ad.advertiser_name}</p>}
            <h4 style={S.adHeadline}>{content.ad.headline}</h4>
            {content.ad.body_text && <p style={S.adBody}>{content.ad.body_text}</p>}
          </div>
        </a>
      ) : (
        <div style={S.adBoxLink}>
          <div style={{ minWidth: 0 }}>
            <p style={S.adEyebrow}>{content.eyebrow}</p>
            <h4 style={S.adHeadline}>{content.headline}</h4>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile equivalent of AdBox — desktop's side rails have no room on a phone
// screen, so this renders as a full-width banner instead, fixed to the
// bottom edge and sized to exactly overlap (not push down/sit beside)
// MobileNavbar's own tab bar there — same MOBILE_NAV_BOTTOM_H constant that
// bar itself uses, so this can never drift out of sync with it. Content
// rendering mirrors AdBox's real-ad vs.
// placeholder branch exactly, just without body_text (no vertical room for
// a third line in a ~64-68px banner) and with single-line ellipsis instead
// of wrapping. A separate component (not AdBox reused with new props)
// because desktop's `.tcn-promo-box` class carries its own
// `display:none`-below-768px rule — reusing that class here would fight
// this component's own isMobile-gated render in AdRails.
function MobileAdBanner({ content, onDismiss, edgeStyle }) {
  const variantKey = content.type === 'ad' ? (content.ad.design_variant || 'gradient-pink') : content.variant;
  const variantStyle = AD_VARIANT_STYLES[variantKey] || AD_VARIANT_STYLES['gradient-pink'];
  return (
    <div style={{ ...S.mobileAdBanner, ...edgeStyle, ...variantStyle }}>
      <button type="button" style={S.mobileAdBannerClose} onClick={onDismiss} aria-label="Dismiss">✕</button>
      {content.type === 'ad' ? (
        <a href={content.ad.destination_url} target="_blank" rel="noopener noreferrer" style={S.mobileAdBannerLink}>
          {content.ad.image_url && <img src={content.ad.image_url} alt="" style={S.mobileAdBannerImg} />}
          <div style={{ minWidth: 0 }}>
            {content.ad.advertiser_name && <p style={S.mobileAdEyebrow}>{content.ad.advertiser_name}</p>}
            <h4 style={S.mobileAdHeadline}>{content.ad.headline}</h4>
          </div>
        </a>
      ) : (
        <div style={S.mobileAdBannerLink}>
          <div style={{ minWidth: 0 }}>
            <p style={S.mobileAdEyebrow}>{content.eyebrow}</p>
            <h4 style={S.mobileAdHeadline}>{content.headline}</h4>
          </div>
        </div>
      )}
    </div>
  );
}

// Ad rails (side margins) — Task 4, extracted into their own component (was
// previously state living directly in Discover()) so the 10s rotation timer
// only re-renders this small subtree, not the ~150+-card profile grid that
// used to share the same component and re-execute in full on every tick.
// memo()'d on top of that so this also skips re-rendering when Discover
// re-renders for unrelated reasons (filter changes, OnlineContext's own
// 30-60s ticks) — currentUserId is the only prop, and it only ever changes
// once per session (login), so this should render once, then only on its
// own internal state changes.
// Reverted from "6 stacked slots per side" back to one box per side (client
// correction of the original Task 4 spec) — the fetch/rotation-timer/isolation
// structure above is untouched, only what gets rendered from `ads` changed:
// a single box's content now advances through the ad pool one at a time
// instead of 6 boxes each showing a different pool entry simultaneously.
const AdRails = memo(function AdRails({ currentUserId }) {
  // Mobile has no room for side rails — the JSX below branches to render
  // top/bottom banners instead (MobileAdBanner) when this is true. Nothing
  // else in this component (fetch, rotation timer, getAdContent) changes
  // based on it — both layouts read from the exact same ads/adRotationTick
  // state, just render it differently.
  const isMobile = useIsMobile();
  const [ads, setAds] = useState([]);
  const [adRotationTick, setAdRotationTick] = useState(0);
  // In-memory only, on purpose: dismissing a side's box hides it for this
  // page view alone, not persisted (no localStorage) — reappears on refresh.
  // Tracked by side, not by ad id, so a box the visitor closed stays closed
  // even as its rotating content changes underneath it.
  const [dismissedSides, setDismissedSides] = useState(new Set());
  const dismissSide = (side) => {
    setDismissedSides(prev => { const next = new Set(prev); next.add(side); return next; });
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
    // Client-side rotation only — no reload. Advancing this tick moves the
    // box on each side to the next ad/placeholder in its pool (see
    // getAdContent below). Scoped to this component, so this re-render
    // never touches the profile grid.
    const timer = setInterval(() => setAdRotationTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, [currentUserId]);

  // One box per side: content advances by adRotationTick through up to
  // AD_POOL_SIZE real ads (display_order first), looping back to the first
  // after the last; falls back to the placeholder-design cycle when the side
  // has no real ads configured yet.
  function getAdContent(side) {
    const realAds = ads.filter(a => a.side === side || a.side === 'both').slice(0, AD_POOL_SIZE);
    if (realAds.length === 0) {
      return { type: 'placeholder', ...AD_PLACEHOLDER_VARIANTS[adRotationTick % AD_PLACEHOLDER_VARIANTS.length] };
    }
    return { type: 'ad', ad: realAds[adRotationTick % realAds.length] };
  }

  // Gated on currentUserId, matching the old promo boxes' timing so this
  // still appears in step with WelcomeModal. Returning null here (rather
  // than the parent conditionally mounting/unmounting this component)
  // means AdRails mounts once and its effects don't re-fire on login.
  if (!currentUserId) return null;

  // Mobile: one full-width banner stacked directly ABOVE MobileNavbar's
  // bottom tab bar (not covering it, not floating in empty space) - SK
  // request, reversing the previous "overlapping the tab bar" explicit
  // spec noted below. bottom is now offset by the tab bar's own height
  // (same MOBILE_NAV_BOTTOM_H + safe-area-inset-bottom formula the tab bar
  // itself uses, so this stays flush against its top edge at every device's
  // safe-area value) instead of 0. Verified (Playwright, several
  // safe-area-inset-bottom values): 0px overlap, ad banner's bottom edge
  // exactly == tab bar's top edge at every value, both fully visible.
  // MobileNavbar.jsx itself is untouched - zIndex 1500 (still above the
  // tab bar's 1000) no longer matters for overlap now that they don't
  // occupy the same space, but is left as-is since it's not part of this
  // fix and doesn't cause any issue while it stays that way.
  //
  // Used to also render a top banner overlapping the header, but that sat
  // at zIndex 1500 (above MobileNavbar's 1000) and blocked the logo/
  // language toggle/menu button until dismissed each session - dropped in
  // favor of bottom-only. Dismiss key 'bottom' is distinct from desktop's
  // 'left'/'right' (same dismissedSides Set, just a different string key)
  // so dismissing this can't accidentally hide desktop's rails if the
  // viewport crosses the 768px breakpoint mid-session. Content still comes
  // from getAdContent('right') — 'bottom' isn't a valid `ads.side` value in
  // the DB, so this reuses the exact same pool (and thus the exact same
  // real-ad/placeholder rotation) the right side rail already reads from,
  // just relabeled by screen position instead of side.
  if (isMobile) {
    return (
      <>
        {!dismissedSides.has('bottom') && (
          <MobileAdBanner
            content={getAdContent('right')}
            onDismiss={() => dismissSide('bottom')}
            edgeStyle={{
              bottom: `calc(${MOBILE_NAV_BOTTOM_H}px + env(safe-area-inset-bottom))`,
              height: `calc(${MOBILE_NAV_BOTTOM_H}px + env(safe-area-inset-bottom))`,
              paddingTop: 6,
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Fixed to the viewport (not absolute/scrolling with the page) so the
          ad stays visible the whole time the user scrolls through Discover's
          200+-profile grid, per client follow-up — an ad nobody scrolls back
          up to see isn't useful to an advertiser. Fixed over sticky: this is
          a straight revert to how the very first (pre-Task-4) promo boxes
          positioned themselves — byte-identical, not scaled. Both the
          horizontal calc()s below and the vertical centering (top:
          max(260px, calc(50vh - var(--tcn-ad-box-h) / 2)), set on S.adBox
          itself) are copied as-is from that original box's own positioning
          — see Discover's <style> block for the CSS vars (defined on :root,
          so available here too even though this is a separate component)
          and the full original-value baseline. Desktop-only: mobile returns
          early above with MobileAdBanner instead. */}
      {!dismissedSides.has('left') && (
        <AdBox content={getAdContent('left')} onDismiss={() => dismissSide('left')} sideStyle={{ left: 'calc(50% - var(--tcn-grid-max) / 2 - 24px - var(--tcn-box-w))' }} />
      )}
      {!dismissedSides.has('right') && (
        <AdBox content={getAdContent('right')} onDismiss={() => dismissSide('right')} sideStyle={{ right: 'calc(50% - var(--tcn-grid-max) / 2 - 24px - var(--tcn-box-w))' }} />
      )}
    </>
  );
});

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
  const { tx, lang } = useTranslation(['common', 'discover', 'messages', 'lotusPage']);
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [passedIds, setPassedIds] = useState(new Set());
  const [boostedIds, setBoostedIds] = useState(new Set());
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // ── Lotus gifting (desktop only - see the !isMobile guards at each
  // render site below) ──
  const [myLotusBalance, setMyLotusBalance] = useState(0);
  const [giftOpenForId, setGiftOpenForId] = useState(null); // profile.id whose popover is open, or null
  const [giftAmount, setGiftAmount] = useState(1);
  const [giftSending, setGiftSending] = useState(false);
  const [giftToast, setGiftToast] = useState(null); // { status: 'error' | 'success', text }
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
      const { data: profile } = await supabase.from('profiles').select('banned_until, ban_reason, details, subscription_plan, lotus_balance').eq('id', user.id).maybeSingle();
      if (profile) {
        setCurrentUserProfile(profile);
        setMyLotusBalance(profile.lotus_balance ?? 0);
        const isBanned = profile.banned_until === null && profile.ban_reason ? true : profile.banned_until && new Date(profile.banned_until) > new Date();
        if (isBanned) { setBanInfo({ bannedUntil: profile.banned_until, banReason: profile.ban_reason }); setLoading(false); return; }
      }
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, details, province, city, last_seen_at, is_verified, subscription_plan, is_founder_member, created_at, is_invisible, lotus_balance').neq('id', user.id);

      // Fetch blocked + passed users to filter them out
      const { data: blocks } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id);
      const blockedIds = new Set((blocks || []).map(b => b.blocked_id));

      const { data: passes } = await supabase.from('user_passes').select('passed_id').eq('passer_id', user.id);
      const passedSet = new Set((passes || []).map(p => p.passed_id));
      setPassedIds(passedSet);

      const { data: likes } = await supabase.from('user_likes').select('liked_id').eq('liker_id', user.id);
      setLikedIds(new Set((likes || []).map(l => l.liked_id)));

      const { data: boosts } = await supabase.from('profile_boosts').select('user_id').gt('expires_at', new Date().toISOString());
      setBoostedIds(new Set((boosts || []).map(b => b.user_id)));

      const viewerIsVip = profile?.subscription_plan === 'gold' || profile?.subscription_plan === 'platinum';
      if (!error && data) {
        setProfiles(data.filter(p => !blockedIds.has(p.id) && !passedSet.has(p.id) && !(p.is_invisible && !viewerIsVip)));
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

    // Boosted users (active profile_boosts row) surface above everyone else,
    // including plain VIP; VIP users surface above the rest below that.
    // Each tier is shuffled among itself fresh each time this recomputes;
    // non-VIP/non-boosted users keep whatever order the block above produced.
    const boosted = result.filter(p => boostedIds.has(p.id));
    const vip = result.filter(p => !boostedIds.has(p.id) && isVipProfile(p));
    const nonVip = result.filter(p => !boostedIds.has(p.id) && !isVipProfile(p));
    for (let i = boosted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [boosted[i], boosted[j]] = [boosted[j], boosted[i]];
    }
    for (let i = vip.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vip[i], vip[j]] = [vip[j], vip[i]];
    }
    result = [...boosted, ...vip, ...nonVip];

    return result;
  }, [profiles, filters, onlineUsers, botIds, currentUserProfile, boostedIds]);

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

  function showGiftToast(status, text) {
    setGiftToast({ status, text });
    setTimeout(() => setGiftToast(t => (t?.text === text ? null : t)), 4000);
  }

  // Clicking the 🪷 badge on a card: 0 balance sends the viewer to /lotus
  // instead of opening the gift popover (nothing to gift with), otherwise
  // toggles the popover for that card (clicking the same badge again, or a
  // different card's badge while one is open, both just re-toggle/switch).
  const handleGiftBadgeClick = (e, profileId) => {
    e.stopPropagation();
    if (myLotusBalance <= 0) { navigate('/lotus'); return; }
    setGiftAmount(1);
    setGiftOpenForId(prev => (prev === profileId ? null : profileId));
  };

  const handleGiftConfirm = async (e, recipient) => {
    e.stopPropagation();
    if (giftSending) return;
    const amount = Number(giftAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 500 || amount > myLotusBalance) return;

    setGiftSending(true);
    try {
      const { data, error } = await supabase.rpc('gift_lotus', {
        p_sender_id: currentUserId,
        p_recipient_id: recipient.id,
        p_amount: amount,
      });

      if (error) {
        showGiftToast('error', tx.errGeneric || 'Something went wrong, please try again.');
        return;
      }
      if (data?.error) {
        const msg =
          data.error === 'insufficient_balance' ? (tx.errInsufficientBalance || 'You do not have enough lotus for this.') :
          data.error === 'recipient_not_found' ? (tx.errRecipientNotFound || 'This profile is no longer available.') :
          data.error === 'cannot_gift_self' ? (tx.errCannotGiftSelf || 'You cannot gift lotus to yourself.') :
          data.error === 'invalid_amount' ? (tx.errInvalidPack || 'Invalid option selected.') :
          (tx.errGeneric || 'Something went wrong, please try again.');
        showGiftToast('error', msg);
        return;
      }

      setMyLotusBalance(data.sender_balance);
      setProfiles(prev => prev.map(p => p.id === recipient.id ? { ...p, lotus_balance: (p.lotus_balance ?? 0) + amount } : p));
      setGiftOpenForId(null);
      showGiftToast('success', (tx.giftSentToast ? tx.giftSentToast(amount) : `Sent ${amount} 🪷!`));
    } catch {
      showGiftToast('error', tx.errGeneric || 'Something went wrong, please try again.');
    } finally {
      setGiftSending(false);
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

  // Card grid, mobile: was relying on hooks/useIsMobile.js's injected CSS
  // (.mobile-active [style*="repeat(6, 130px)"]) to string-match the
  // literal 'repeat(6, 130px)' below and force 3 columns - but that
  // override sets `repeat(3, 1fr)`, and a bare 1fr track defaults to
  // minmax(auto, 1fr): its floor is the track's own content's min-content
  // size, not 0. Individual cards' min-content width (~185px at 390px
  // viewport width, from their internal flex/text content) sat above the
  // ~115px an even 3-way split of the actual available width would give,
  // so every column got inflated to that ~185px floor regardless of the
  // container's real width - overflowing it by ~90px, with cards sliced
  // at both edges (confirmed live: grid scrollWidth 481px inside a 390px
  // box). Now sets the mobile grid explicitly here instead of depending on
  // that global string-match mechanism at all for this grid -
  // minmax(0, 1fr) is what actually forces columns to shrink to fit
  // rather than floor at their content's natural size (verified live:
  // scrollWidth drops to exactly 390px, matching the container, no
  // overflow). Scoped to this grid only - hooks/useIsMobile.js and its
  // repeat(5, 1fr) rule (used elsewhere, e.g. this page's own filter row)
  // are untouched, not a global CSS change.
  // Laptop/desktop (>=768px) instead gets a fluid track so column count
  // and card width grow with the viewport instead of staying frozen at a
  // fixed 6x130px island.
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
    ? { ...S.grid, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }
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
        /* VIP shimmer border: was animating background-position, a
           paint-triggering property (repaints the gradient every frame for
           every visible VIP card, indefinitely). Replaced with a rotating
           conic-gradient layer animated via transform:rotate() instead —
           compositor-only, no layout/paint per frame — using the same
           5-color loop (first/last color already matched for a seamless
           conic wrap) so the visual read (a moving rainbow border) is the
           same, just spinning instead of scrolling sideways.
           The layer is 2x the frame's size (inset:-50%) and centered so
           full rotation always covers every corner with no gaps; .tcn-vip-
           frame's overflow:hidden (see S.vipFrame) clips it back down to
           the frame's own shape. ">*  { z-index:1 }" lifts the actual photo
           (which already paints its own #334155 background - see
           S.photoWrap) above the spinning layer, so only the padding-width
           ring shows the gradient underneath. */
        @keyframes vipSpin {
          to { transform: rotate(360deg); }
        }
        .tcn-vip-frame::before {
          content: '';
          position: absolute;
          inset: -50%;
          background: conic-gradient(from 0deg, #f06292, #ffb74d, #4fc3f7, #ba68c8, #f06292);
          animation: vipSpin 5s linear infinite;
          will-change: transform;
        }
        .tcn-vip-frame > * {
          position: relative;
          z-index: 1;
        }
        /* One ad box per side (reverted from the "6 stacked slots" version of
           Task 4 per client correction). Sizing/positioning is now a BYTE-
           IDENTICAL match to the original (pre-Task-4) single promo box —
           no 2x scaling, no viewport-fit math, nothing recalculated. Two
           earlier passes at this revert tried scaling the box up (first via
           a viewport-filling height formula, then via a literal 2x of every
           original value) — both replaced per explicit client correction;
           this is a plain revert of size/position/spacing to exactly what
           shipped for hours before tonight's ad-rail work, re-verified via
           git history at commit 4016d76^ (S.promoBox et al): width
           clamp(120px, 14vw, 200px), height a flat 464px, top
           'max(260px, calc(50vh - 232px))' (232 = 464/2). Grid max-width
           uses the same formula as pre-Task-4 too, so it reaches the
           original fixed 1100px cap at the same ~1560px+ viewports as
           before any of tonight's ad-rail changes. */
        :root {
          --tcn-box-w: clamp(120px, 14vw, 200px);
          --tcn-grid-max: min(1100px, calc(100vw - 60px - 2 * var(--tcn-box-w)));
          --tcn-ad-box-h: 464px;
        }
        .tcn-promo-box { display: none; }
        @media (min-width: 768px) {
          /* 768px matches MOBILE_BREAKPOINT in hooks/useIsMobile.js */
          .tcn-promo-box { display: block; }
        }
      `}</style>
      {/* Ad rail: one box per side, content rotating every 10s through the ad
          pool (reverted from Task 4's "6 stacked slots" per client
          correction) — extracted into its own AdRails component (defined
          above, near AdBox) so its 10s rotation timer only re-renders that
          small subtree, not this whole Discover component and its
          ~150+-card grid below. All positioning/styling comments now live on
          AdRails itself. */}
      <AdRails currentUserId={currentUserId} />
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
            // founderBadge already occupies bottom-right (S.founderBadge) -
            // nudge the lotus badge one slot further left only on cards
            // that actually have a founder badge, rather than moving
            // founderBadge itself (which would touch every card, not just
            // the ones with a collision).
            const lotusBadgeStyle = profile.is_founder_member
              ? { ...S.lotusBadge, right: 27 }
              : S.lotusBadge;
            return (
              <div key={profile.id} style={S.cardWrap}>
                <div style={S.card}>
                  <div className={isVipProfile(profile) ? 'tcn-vip-frame' : undefined} style={isVipProfile(profile) ? S.vipFrame : S.vipFrameOff}>
                    <div style={S.photoWrap} onClick={() => handleCardClick(profile.id)}>
                      <img src={photoUrl} alt={profile.username} style={S.photo} loading="lazy" />
                      {profile.is_verified && <div style={verifiedBadgeStyle}>V</div>}
                      {isVipProfile(profile) && <div style={vipBadgeStyle}>VIP</div>}
                      {profile.is_founder_member && <div style={founderBadgeStyle}>🌟</div>}
                      <div
                        style={{ ...S.onlineBadge, background: isOnline ? '#4cd964' : isRecentlyActive ? '#fbbf24' : '#64748b' }}
                        title={isOnline ? (tx.online || 'Online') : isRecentlyActive ? 'Recently Active' : undefined}
                      />
                      {!isMobile && (
                        <button
                          type="button"
                          style={lotusBadgeStyle}
                          onClick={e => handleGiftBadgeClick(e, profile.id)}
                          title={tx.giftLotus || 'Gift lotus'}
                        >
                          🪷 {(profile.lotus_balance ?? 0).toLocaleString()}
                        </button>
                      )}
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

                {/* Gift popover - a sibling of S.card (not a descendant), so
                    it isn't clipped by S.card's own overflow:hidden. Desktop
                    only, matching the badge that opens it. */}
                {!isMobile && giftOpenForId === profile.id && (
                  <div style={S.giftPopover} onClick={e => e.stopPropagation()}>
                    <div style={S.giftPopoverHeader}>
                      <span>🪷 {tx.giftLotus || 'Gift lotus'}</span>
                      <button type="button" style={S.giftCloseBtn} onClick={() => setGiftOpenForId(null)}>✕</button>
                    </div>
                    <div style={S.giftAmountRow}>
                      <button
                        type="button"
                        style={S.giftStepBtn}
                        onClick={() => setGiftAmount(a => Math.max(1, a - 1))}
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        max={Math.min(500, myLotusBalance)}
                        value={giftAmount}
                        onChange={e => setGiftAmount(Math.max(1, Math.min(500, myLotusBalance, Number(e.target.value) || 1)))}
                        style={S.giftAmountInput}
                      />
                      <button
                        type="button"
                        style={S.giftStepBtn}
                        onClick={() => setGiftAmount(a => Math.min(500, myLotusBalance, a + 1))}
                      >+</button>
                    </div>
                    <button
                      type="button"
                      style={{ ...S.giftConfirmBtn, ...(giftSending ? S.giftConfirmBtnDisabled : {}) }}
                      onClick={e => handleGiftConfirm(e, profile)}
                      disabled={giftSending}
                    >
                      {giftSending ? '…' : `${tx.send || 'Send'} 🪷 ${giftAmount}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gift toast - same fixed-bottom-pill pattern as ProfileSetup.jsx's saveToast */}
      {giftToast && (
        <div style={{
          ...S.giftToast,
          background: giftToast.status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)',
          border: `1px solid ${giftToast.status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)'}`,
          color: giftToast.status === 'error' ? '#f87171' : '#4ade80',
        }}>
          {giftToast.text}
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
  // Thin wrapper around the existing S.card - position:relative so the gift
  // popover (a sibling of S.card, not a descendant) can anchor to it without
  // being clipped by S.card's own overflow:hidden. S.card itself is
  // untouched by this.
  cardWrap: { position: 'relative' },
  vipFrameOff: { display: 'block' },
  // The animated gradient itself now lives in the .tcn-vip-frame CSS class
  // (see the <style> block above) as a rotating ::before layer — this
  // object just sets up the box that layer clips against.
  vipFrame: {
    display: 'block',
    position: 'relative',
    overflow: 'hidden',
    padding: 3,
    boxSizing: 'border-box',
  },
  photoWrap: { position: 'relative', width: '100%', aspectRatio: '1/1', background: '#334155', overflow: 'hidden' },
  photo: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  verifiedBadge: { position: 'absolute', top: 5, left: 5, width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  vipBadge: { position: 'absolute', bottom: 5, left: 5, padding: '2px 6px', borderRadius: 4, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 0.3 },
  founderBadge: { position: 'absolute', bottom: 5, right: 5, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  onlineBadge: { position: 'absolute', top: 5, right: 5, width: 11, height: 11, borderRadius: '50%', border: '2px solid #1e293b' },

  // Lotus gift badge (bottom-right of the photo, like founderBadge - see
  // the inline `right: 27` override at the call site for cards that also
  // have a founderBadge in that same corner) + its popover. Desktop only.
  lotusBadge: {
    position: 'absolute', bottom: 5, right: 5,
    display: 'flex', alignItems: 'center', gap: 2,
    padding: '2px 6px', borderRadius: 10,
    background: 'rgba(233,30,99,0.85)', border: 'none',
    color: '#fff', fontSize: 9, fontWeight: 800,
    cursor: 'pointer', lineHeight: 1.4,
  },
  giftPopover: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 50,
    width: 160,
    background: '#1e293b', border: '1px solid rgba(233,30,99,0.4)', borderRadius: 12,
    padding: 12,
    boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
    cursor: 'default',
  },
  giftPopoverHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 10,
  },
  giftCloseBtn: {
    background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
    borderRadius: '50%', width: 18, height: 18, fontSize: 10,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  giftAmountRow: {
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  // padding:0 added - index.css's global `button { padding: 0.6em 1.2em }`
  // (the Vite template default) was falling through because this style
  // object never set its own padding to override it (an inline style only
  // wins per-property; it doesn't blank out properties it never mentions).
  // That inflated these from the intended 24x24 squares to ~36px-wide
  // pills, which is what actually threw the row's proportions off -
  // confirmed by measuring both variants: the row's own outer box was
  // already flush with the popover's content edges either way (input's
  // flex:1 absorbs all free space regardless), so a missing justifyContent
  // on giftAmountRow (tried first) measured as a no-op and isn't the fix.
  // giftCloseBtn has this same unreset padding but is out of scope here -
  // the ask was the stepper row specifically.
  giftStepBtn: {
    width: 24, height: 24, borderRadius: 6, padding: 0,
    border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  giftAmountInput: {
    flex: 1, minWidth: 0, textAlign: 'center',
    padding: '4px 2px', borderRadius: 6,
    border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
    fontSize: 13, fontWeight: 700,
  },
  giftConfirmBtn: {
    width: '100%', padding: 8, borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
  },
  giftConfirmBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  giftToast: {
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    padding: '14px 28px', borderRadius: 16, fontSize: 14, fontWeight: 700,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 3000, textAlign: 'center', maxWidth: '90vw',
  },

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

  // Advertiser ad box (side margins, desktop-wide only — see .tcn-promo-box
  // media query). One box per side (reverted from Task 4's 6-stacked-slots
  // version), sized/styled as a BYTE-IDENTICAL match to the original
  // (pre-Task-4) single promo box — no scaling of any kind, per explicit
  // client correction of two earlier passes that tried 2x'ing this. Every
  // value below is copied as-is from S.promoBox/promoClose/promoEyebrow/
  // promoHeadline/promoBody at commit 4016d76^: width var(--tcn-box-w)
  // (clamp(120,14vw,200) — see <style> block), height var(--tcn-ad-box-h)
  // (464px), padding '20px 16px', borderRadius 14, boxShadow '0 8px 24px
  // rgba(233,30,99,.3)' (the original's own pink-tinted shadow — matches
  // 'gradient-pink' below, the byte-for-byte original gradient). Close
  // button and eyebrow/headline/body sizes are likewise the original's exact
  // numbers, unscaled. adBoxImg/adBoxLink's gap have no original counterpart
  // (the referral/VIP boxes never had an image) — left at the pre-revert
  // 6-slot AdSlot's own values (32px/radius 6, gap 8) rather than inventing
  // new numbers, for the same "don't scale/recalculate anything" reason.
  // Fixed (not absolute) per client follow-up: the ad should stay on screen
  // the whole time the user scrolls through Discover's 200+-profile grid,
  // not scroll away after the first screen. top/left/right calc()s mirror
  // the original fixed promo boxes' own positioning exactly.
  adBox: {
    position: 'fixed',
    top: 'max(260px, calc(50vh - var(--tcn-ad-box-h) / 2))',
    width: 'var(--tcn-box-w)',
    minHeight: 'var(--tcn-ad-box-h)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '20px 16px',
    borderRadius: 14,
    boxShadow: '0 8px 24px rgba(233, 30, 99, 0.3)',
    overflow: 'hidden',
    zIndex: 30,
  },
  adBoxClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: 'inherit',
    fontSize: 12,
    lineHeight: '22px',
    padding: 0,
    cursor: 'pointer',
    zIndex: 1,
  },
  adBoxLink: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', textDecoration: 'none', color: 'inherit' },
  adBoxImg: { width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  adEyebrow: { margin: '0 22px 6px 0', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, opacity: 0.9 },
  adHeadline: { margin: '0 0 8px', fontSize: 19, fontWeight: 900, lineHeight: 1.2 },
  adBody: { margin: '0 0 14px', fontSize: 12, lineHeight: 1.45, opacity: 0.9 },

  // Mobile ad banner (<768px only, via AdRails' isMobile branch — see
  // MobileAdBanner above). bottom/height come from the edgeStyle prop
  // (MOBILE_NAV_BOTTOM_H-derived) - bottom is offset by the tab bar's own
  // height so this stacks directly above it instead of covering it (see
  // AdRails' own comment at its isMobile branch for the fix writeup).
  // zIndex 1500 is still above MobileNavbar's bars (zIndex 1000), which no
  // longer matters for overlap now that they don't occupy the same space.
  mobileAdBanner: {
    position: 'fixed',
    left: 0,
    right: 0,
    zIndex: 1500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 36,
    boxSizing: 'border-box',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  mobileAdBannerClose: {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: 'inherit',
    fontSize: 12,
    lineHeight: '22px',
    padding: 0,
    cursor: 'pointer',
    zIndex: 1,
  },
  mobileAdBannerLink: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', textDecoration: 'none', color: 'inherit', minWidth: 0 },
  mobileAdBannerImg: { width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  // Single-line + ellipsis (not adBody's multi-line wrap) — a ~56-68px-tall
  // banner has no vertical room for wrapped text or a 3rd line.
  mobileAdEyebrow: { margin: '0 0 2px', fontSize: 9, fontWeight: 800, letterSpacing: 0.3, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  mobileAdHeadline: { margin: 0, fontSize: 13, fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};
