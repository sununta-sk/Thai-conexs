// src/App.jsx — Phase 8
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabaseClient';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { OnlineProvider } from './context/OnlineContext';
import { NavGuardProvider, useNavGuard } from './context/NavGuardContext';
import { useLoginBonus } from './hooks/useLoginBonus';
import BanModal from './components/BanModal';
import WelcomeModal from './components/WelcomeModal';
import WarnModal from './components/WarnModal';
import UsernameChangedModal from './components/UsernameChangedModal';

import Login        from './pages/Login';
import Register     from './pages/Register';
import CheckEmail   from './pages/CheckEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import RulesPage from './pages/RulesPage';
import LoadingScreen from './components/LoadingScreen';
import GlobalToast from './components/GlobalToast';
import Navbar       from './components/Navbar';
import MobilePreviewFrame from './components/MobilePreviewFrame';

// These were previously static imports, meaning every visitor — including
// anonymous ones still on the login/register page — downloaded the JS for all
// of them upfront (ProfileSetup alone is ~230KB, RoomChat pulls in a ~510KB
// emoji picker). The route tree below already has a single <Suspense> boundary
// wrapping everything, same as the /admin/* pages already use, so these are
// safe to lazy-load the same way.
const ProfileSetup       = lazy(() => import('./pages/ProfileSetup'));
const AccountSettings    = lazy(() => import('./pages/AccountSettings'));
const HelpPage           = lazy(() => import('./pages/HelpPage'));
const Discover           = lazy(() => import('./pages/Discover'));
const Messages           = lazy(() => import('./pages/Messages'));
const RoomChat           = lazy(() => import('./pages/RoomChat'));
const PaymentPage        = lazy(() => import('./pages/PaymentPage'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const NotificationsPage  = lazy(() => import('./pages/NotificationsPage'));

const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
const LotusPage       = lazy(() => import('./pages/LotusPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));

const UserListPage      = lazy(() => import('./pages/admin/UserListPage'));
const UserDetailPage    = lazy(() => import('./pages/admin/UserDetailPage'));
const AffiliateListPage = lazy(() => import('./pages/admin/AffiliateListPage'));
const PhotoQueuePage    = lazy(() => import('./pages/admin/PhotoQueuePage'));
const ReportsPage       = lazy(() => import('./pages/admin/ReportsPage'));
const TicketsPage       = lazy(() => import('./pages/admin/TicketsPage'));
const AffiliateDetailPage    = lazy(() => import('./pages/admin/AffiliateDetailPage'));
const PayoutListPage         = lazy(() => import('./pages/admin/PayoutListPage'));
const PayoutRequestPage      = lazy(() => import('./pages/admin/PayoutRequestPage'));
const UserPayoutPage         = lazy(() => import('./pages/UserPayoutPage'));
const CommissionSettingsPage = lazy(() => import('./pages/admin/CommissionSettingsPage'));
const AnalyticsDashboardPage    = lazy(() => import('./pages/admin/AnalyticsDashboardPage'));
const SubscriptionPage          = lazy(() => import('./pages/admin/SubscriptionPage'));
const NotificationBroadcastPage = lazy(() => import('./pages/admin/NotificationBroadcastPage'));
const RevenuePage          = lazy(() => import('./pages/admin/RevenuePage'));
const PlatformSettingsPage = lazy(() => import('./pages/admin/PlatformSettingsPage'));
const AnnouncementsPage    = lazy(() => import('./pages/admin/AnnouncementsPage'));
const TeamPage     = lazy(() => import('./pages/admin/TeamPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const PlansPage    = lazy(() => import('./pages/admin/PlansPage'));
const AdsPage       = lazy(() => import('./pages/admin/AdsPage'));

const AdminFallback = () => <LoadingScreen />;

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { profileComplete } = useNavGuard();
  const [session, setSession] = useState(undefined);
  const [banInfo, setBanInfo] = useState(undefined);
  const [warnInfo, setWarnInfo] = useState(undefined);
  const [usernameNotice, setUsernameNotice] = useState(undefined);
  // Backstop for reload / typed URL / browser back — the in-app nav guard
  // (NavGuardContext, checked by Navbar/MobileNavbar/NotificationBell/
  // GlobalToast) only ever sees clicks; it has no way to intercept any of
  // these. undefined = still loading (see the LoadingScreen gate below,
  // same pattern as banInfo/warnInfo) so a photo-having user is never
  // bounced off a mid-fetch false reading of "no photos yet".
  const [hasPhotos, setHasPhotos] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setBanInfo(null); return; }

    supabase
      .from('profiles')
      .select('banned_until, ban_reason, photos')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        // Fail OPEN on a genuine query error (a transient Supabase blip
        // must never lock a real user out of the app) — but NOT on a
        // successful query that simply found no row. maybeSingle() returns
        // { data: null, error: null } for both "0 rows" and "query failed
        // for some other reason that isn't really an error", so error==null
        // alone doesn't mean a row exists. A brand-new signup has no
        // `profiles` row at all until ProfileSetup's first save — that's
        // not a fetch failure, it's the exact "definitely no photos yet"
        // case this check exists to catch, so it must fail CLOSED here,
        // not open. (Caught live: a fresh signup's very first /discover
        // load wasn't redirected to /profile-setup until this fix.)
        if (error) { setBanInfo(null); setHasPhotos(true); return; }
        if (!data) { setBanInfo(null); setHasPhotos(false); return; }
        const now = Date.now();
        const banUntil = data.banned_until ? new Date(data.banned_until).getTime() : null;
        const reason = data.ban_reason;
        const isPermanent = !banUntil && reason;
        const isTemporary = banUntil && banUntil > now;
        if (isPermanent || isTemporary) {
          setBanInfo({ bannedUntil: data.banned_until, banReason: reason });
        } else {
          setBanInfo(null);
        }
        setHasPhotos(Array.isArray(data.photos) && data.photos.length > 0);
      });
    // location.pathname (not just session) is a real dependency here, not
    // just a lint satisfier: this app's <Routes> reuses the SAME
    // ProtectedRoute instance across sibling protected routes rather than
    // remounting it (confirmed live — an instance ID tag persisted across
    // a /profile-setup -> /discover navigation). Without this, hasPhotos
    // is computed once per login and never rechecked again for the rest of
    // the session, so confirming Save in the nav-guard popup and
    // navigating to /discover client-side kept reading the STALE
    // zero-photos value from before the upload and bounced straight back —
    // only caught because the live click-through test chained an actual
    // save into an actual navigate, which a page-reload-based check never
    // would. Re-running this on every route change re-reads the real
    // current value (and also freshens banInfo along the way, previously
    // gated only on session too).
  }, [session, location.pathname]);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setWarnInfo(null); return; }

    supabase
      .from('user_moderation_actions')
      .select('reason, message_to_user, expires_at')
      .eq('target_user_id', session.user.id)
      .eq('action_type', 'warn')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setWarnInfo(null); return; }
        setWarnInfo({
          expiresAt: data.expires_at,
          reason: data.reason,
          message: data.message_to_user,
        });
      });
  }, [session]);
  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setUsernameNotice(null); return; }
    supabase
      .from('user_moderation_actions')
      .select('id, reason, message_to_user, action_type')
      .eq('target_user_id', session.user.id)
      .eq('action_type', 'edit_username')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setUsernameNotice(null); return; }
        setUsernameNotice({
          id: data.id,
          reason: data.reason,
          oldUsername: data.message_to_user,
        });
      });
  }, [session]);

  if (session === undefined) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (banInfo === undefined) return <LoadingScreen />;
  if (warnInfo === undefined) return <LoadingScreen />;
  if (hasPhotos === undefined) return <LoadingScreen />;

  // Redirect straight into profile-setup on reload/typed-URL/back-button
  // with zero saved photos — everywhere else that same photo count gates
  // navigation via a confirmation popup (NavGuardContext), but there's no
  // page to render a popup ON TOP of here: children hasn't mounted yet.
  // No exception for banInfo/warnInfo: both render as full-screen
  // position:fixed;inset:0 overlays regardless of which page sits under
  // them, so landing on profile-setup instead of e.g. Discover changes
  // nothing about what a banned/warned user actually sees.
  //
  // profileComplete is also checked here, not just hasPhotos — this app's
  // <Routes> reuses the SAME ProtectedRoute instance across sibling
  // protected routes rather than remounting it (confirmed live via an
  // instance-id trace), so navigate()-ing here right after a confirmed
  // save renders ONCE with the PREVIOUS location's hasPhotos state before
  // this component's own effects get a chance to re-fetch — no re-query,
  // however fresh, can win a race against the render that happens before
  // it even starts. profileComplete is set synchronously (by ProfileSetup,
  // via an awaited successful save) at the one moment this component
  // cannot yet know the answer for itself, closing exactly that gap.
  if (!hasPhotos && !profileComplete && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <>
      {children}
      {banInfo && <BanModal bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />}
      {!banInfo && warnInfo && <WarnModal expiresAt={warnInfo.expiresAt} reason={warnInfo.reason} message={warnInfo.message} />}
      {!banInfo && !warnInfo && usernameNotice && <UsernameChangedModal id={usernameNotice.id} userId={session?.user?.id} oldUsername={usernameNotice.oldUsername} reason={usernameNotice.reason} />}
    </>
  );
};

function AdminRoute({ children }) {
  const [session, setSession] = useState(undefined);
  const [adminOk, setAdminOk] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { setAdminOk(false); return; }
    supabase
      .from('admin_users')
      .select('id, is_active, admin_roles(name)')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => setAdminOk(!!data));
  }, [session]);

  if (session === undefined || adminOk === undefined)
    return <LoadingScreen />;
  if (!session || !adminOk)
    return <Navigate to="/login" replace />;
  return children;
}

function SuperAdminRoute({ children }) {
  const [session, setSession] = useState(undefined);
  const [roleOk, setRoleOk]   = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { setRoleOk(false); return; }
    supabase
      .from('admin_users')
      .select('admin_roles(name)')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => setRoleOk(data?.admin_roles?.name === 'super_admin'));
  }, [session]);

  if (session === undefined || roleOk === undefined)
    return <LoadingScreen />;
  if (!session || !roleOk)
    return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function AppContent() {
  const location = useLocation();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) setSession(s);
      else setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session: s2 } }) => setSession(s2 ?? null));
      }, 1000);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });

    let urlListener;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        if (url.includes('login-callback')) {
          const hashIndex = url.indexOf('#');
          if (hashIndex >= 0) {
            const hash = url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        }
      }).then(listener => { urlListener = listener; });
    }

    return () => {
      subscription.unsubscribe();
      if (urlListener) urlListener.remove();
    };
  }, []);

  const hideNavbar =
    !session ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/room-chat/') ||
    location.pathname.startsWith('/profile/') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', overflowX: 'hidden' }}>
      <div style={{ flex: 1 }}>
        <Suspense fallback={<AdminFallback />}>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/rules" element={<RulesPage />} />

            <Route path="/discover"          element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/messages"          element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile-setup"     element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/payout"           element={<ProtectedRoute><UserPayoutPage /></ProtectedRoute>} />
            <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/help"             element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
            <Route path="/room-chat/:chatId" element={<RoomChat />} />
            <Route path="/profile"           element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/lotus"             element={<ProtectedRoute><LotusPage /></ProtectedRoute>} />
            <Route path="/profile/:userId"   element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
            <Route path="/subscription"      element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/payment"           element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/notifications"     element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            <Route path="/admin-secret-portal" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/dashboard"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users"         element={<AdminRoute><UserListPage /></AdminRoute>} />
            <Route path="/admin/users/:userId" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
            <Route path="/admin/affiliates"    element={<AdminRoute><AffiliateListPage /></AdminRoute>} />

            <Route path="/admin/moderation/photos"  element={<AdminRoute><PhotoQueuePage /></AdminRoute>} />
            <Route path="/admin/moderation/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
            <Route path="/admin/moderation/tickets" element={<AdminRoute><TicketsPage /></AdminRoute>} />

            <Route path="/admin/affiliates/:id"      element={<AdminRoute><AffiliateDetailPage /></AdminRoute>} />
            <Route path="/admin/payouts"             element={<AdminRoute><PayoutListPage /></AdminRoute>} />
            <Route path="/admin/payouts/new"         element={<AdminRoute><PayoutRequestPage /></AdminRoute>} />
            <Route path="/admin/commission-settings" element={<AdminRoute><CommissionSettingsPage /></AdminRoute>} />

            <Route path="/admin/analytics"     element={<AdminRoute><AnalyticsDashboardPage /></AdminRoute>} />
            <Route path="/admin/subscriptions" element={<AdminRoute><SubscriptionPage /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><NotificationBroadcastPage /></AdminRoute>} />

            <Route path="/admin/revenue"                element={<AdminRoute><RevenuePage /></AdminRoute>} />
            <Route path="/admin/platform/settings"      element={<AdminRoute><PlatformSettingsPage /></AdminRoute>} />
            <Route path="/admin/platform/announcements" element={<AdminRoute><AnnouncementsPage /></AdminRoute>} />
            <Route path="/admin/plans"                  element={<AdminRoute><PlansPage /></AdminRoute>} />
            <Route path="/admin/ads"                    element={<AdminRoute><AdsPage /></AdminRoute>} />

            <Route path="/admin/team"      element={<SuperAdminRoute><TeamPage /></SuperAdminRoute>} />
            <Route path="/admin/audit-log" element={<SuperAdminRoute><AuditLogPage /></SuperAdminRoute>} />

            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <WelcomeModal />
      <GlobalToast />
      {!hideNavbar && <Navbar />}
    </div>
  );
}

function NotFound() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) {
    return (
      <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>Admin page not found</div>
        <div style={{ color: '#475569', fontSize: 13 }}>{location.pathname}</div>
        <a href="/admin/dashboard" style={{ color: '#e91e63', fontSize: 13, marginTop: 8 }}>← Back to Dashboard</a>
      </div>
    );
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  useLoginBonus();
  return (
    <Router>
      <OnlineProvider>
        <MobilePreviewFrame>
          <NavGuardProvider>
            <AppContent />
          </NavGuardProvider>
        </MobilePreviewFrame>
      </OnlineProvider>
    </Router>
  );
}
