// src/App.jsx — Phase 8
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabaseClient';
import { OnlineProvider } from './context/OnlineContext';
import BanModal from './components/BanModal';

import Login        from './pages/Login';
import Register     from './pages/Register';
import CheckEmail   from './pages/CheckEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import RulesPage from './pages/RulesPage';
import ProfileSetup from './pages/ProfileSetup';
import AccountSettings from './pages/AccountSettings';
import HelpPage from './pages/HelpPage';
import LoadingScreen from './components/LoadingScreen';
import GlobalToast from './components/GlobalToast';
import Discover     from './pages/Discover';
import Messages     from './pages/Messages';
import RoomChat     from './pages/RoomChat';
import PaymentPage  from './pages/PaymentPage';
import Navbar       from './components/Navbar';
import MobilePreviewFrame from './components/MobilePreviewFrame';
import AdminDashboard    from './pages/AdminDashboard';
import NotificationsPage from './pages/NotificationsPage';

const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
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

const AdminFallback = () => <LoadingScreen />;

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(undefined);
  const [banInfo, setBanInfo] = useState(undefined);

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
      .select('banned_until, ban_reason')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setBanInfo(null); return; }
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
      });
  }, [session]);

  if (session === undefined) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (banInfo === undefined) return <LoadingScreen />;

  return (
    <>
      {children}
      {banInfo && <BanModal bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />}
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
    return () => subscription.unsubscribe();
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
            <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/help"             element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
            <Route path="/room-chat/:chatId" element={<RoomChat />} />
            <Route path="/profile"           element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
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

            <Route path="/admin/team"      element={<SuperAdminRoute><TeamPage /></SuperAdminRoute>} />
            <Route path="/admin/audit-log" element={<SuperAdminRoute><AuditLogPage /></SuperAdminRoute>} />

            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
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
  return (
    <Router>
      <OnlineProvider>
        <MobilePreviewFrame>
          <AppContent />
        </MobilePreviewFrame>
      </OnlineProvider>
    </Router>
  );
}