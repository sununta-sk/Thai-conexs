// src/App.jsx — Phase 8
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabaseClient';

import Login        from './pages/Login';
import Register     from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Discover     from './pages/Discover';
import Messages     from './pages/Messages';
import RoomChat     from './pages/RoomChat';
import PaymentPage  from './pages/PaymentPage';
import Navbar       from './components/Navbar';
import AdminDashboard    from './pages/AdminDashboard';
import NotificationsPage from './pages/NotificationsPage';

// ── User-facing (lazy) ──────────────────────────────────────────────────────
const ProfilePage  = lazy(() => import('./pages/ProfilePage'));

// ── Admin pages (lazy) ──────────────────────────────────────────────────────
const UserListPage      = lazy(() => import('./pages/admin/UserListPage'));
const UserDetailPage    = lazy(() => import('./pages/admin/UserDetailPage'));
const AffiliateListPage = lazy(() => import('./pages/admin/AffiliateListPage'));

const PhotoQueuePage = lazy(() => import('./pages/admin/PhotoQueuePage'));
const ReportsPage    = lazy(() => import('./pages/admin/ReportsPage'));
const TicketsPage    = lazy(() => import('./pages/admin/TicketsPage'));

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

// ── Phase 7 ─────────────────────────────────────────────────────────────────
const TeamPage     = lazy(() => import('./pages/admin/TeamPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));

// ── Fallback ─────────────────────────────────────────────────────────────────
const AdminFallback = () => (
  <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
    Loading…
  </div>
);

// ── ProtectedRoute (user) ────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div style={{ background: '#0f172a', height: '100vh' }} />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

// ── AdminRoute — Phase 8: ตรวจ admin_users จริง ไม่ใช่แค่ session ───────────
function AdminRoute({ children, session }) {
  const [adminOk,  setAdminOk]  = useState(undefined); // undefined = loading
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!session) { setAdminOk(false); return; }

    supabase
      .from('admin_users')
      .select('id, is_active, admin_roles(name)')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        setAdminOk(!!data);
        setIsSuperAdmin(data?.admin_roles?.name === 'super_admin');
      });
  }, [session]);

  if (session === undefined || adminOk === undefined)
    return <div style={{ background: '#0f172a', height: '100vh' }} />;
  if (!session || !adminOk)
    return <Navigate to="/login" replace />;
  return children;
}

// ── SuperAdminRoute — Phase 7 pages (team, audit-log) ───────────────────────
function SuperAdminRoute({ children, session }) {
  const [roleOk, setRoleOk] = useState(undefined);

  useEffect(() => {
    if (!session) { setRoleOk(false); return; }
    supabase
      .from('admin_users')
      .select('admin_roles(name)')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        setRoleOk(data?.admin_roles?.name === 'super_admin');
      });
  }, [session]);

  if (session === undefined || roleOk === undefined)
    return <div style={{ background: '#0f172a', height: '100vh' }} />;
  if (!session || !roleOk)
    return <Navigate to="/admin/dashboard" replace />;
  return children;
}

// ── App Content ──────────────────────────────────────────────────────────────
function AppContent() {
  const location = useLocation();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSession(session);
      else {
        // fallback: รอ onAuthStateChange
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s2 } }) => setSession(s2 ?? null));
        }, 1000);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const hideNavbar =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/room-chat/') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  return (
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ flex: 1 }}>
        <Suspense fallback={<AdminFallback />}>
          <Routes>
            {/* ── Public ── */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ── User App ── */}
            <Route path="/discover"          element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/messages"          element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile-setup"     element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/room-chat/:chatId" element={<RoomChat />} />
            <Route path="/profile"           element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/subscription"      element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/payment"           element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/notifications"     element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            {/* ── Admin — Core ── */}
            <Route path="/admin-secret-portal" element={<AdminRoute session={session}><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/dashboard"     element={<AdminRoute session={session}><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users"         element={<AdminRoute session={session}><UserListPage /></AdminRoute>} />
            <Route path="/admin/users/:userId" element={<AdminRoute session={session}><UserDetailPage /></AdminRoute>} />
            <Route path="/admin/affiliates"    element={<AdminRoute session={session}><AffiliateListPage /></AdminRoute>} />

            {/* ── Admin — Phase 3 ── */}
            <Route path="/admin/moderation/photos"  element={<AdminRoute session={session}><PhotoQueuePage /></AdminRoute>} />
            <Route path="/admin/moderation/reports" element={<AdminRoute session={session}><ReportsPage /></AdminRoute>} />
            <Route path="/admin/moderation/tickets" element={<AdminRoute session={session}><TicketsPage /></AdminRoute>} />

            {/* ── Admin — Phase 4 ── */}
            <Route path="/admin/affiliates/:id"      element={<AdminRoute session={session}><AffiliateDetailPage /></AdminRoute>} />
            <Route path="/admin/payouts"             element={<AdminRoute session={session}><PayoutListPage /></AdminRoute>} />
            <Route path="/admin/payouts/new"         element={<AdminRoute session={session}><PayoutRequestPage /></AdminRoute>} />
            <Route path="/admin/commission-settings" element={<AdminRoute session={session}><CommissionSettingsPage /></AdminRoute>} />

            {/* ── Admin — Phase 5 ── */}
            <Route path="/admin/analytics"     element={<AdminRoute session={session}><AnalyticsDashboardPage /></AdminRoute>} />
            <Route path="/admin/subscriptions" element={<AdminRoute session={session}><SubscriptionPage /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute session={session}><NotificationBroadcastPage /></AdminRoute>} />

            {/* ── Admin — Phase 6 ── */}
            <Route path="/admin/revenue"                element={<AdminRoute session={session}><RevenuePage /></AdminRoute>} />
            <Route path="/admin/platform/settings"      element={<AdminRoute session={session}><PlatformSettingsPage /></AdminRoute>} />
            <Route path="/admin/platform/announcements" element={<AdminRoute session={session}><AnnouncementsPage /></AdminRoute>} />

            {/* ── Admin — Phase 7 (super_admin only) ── */}
            <Route path="/admin/team"      element={<SuperAdminRoute session={session}><TeamPage /></SuperAdminRoute>} />
            <Route path="/admin/audit-log" element={<SuperAdminRoute session={session}><AuditLogPage /></SuperAdminRoute>} />

            {/* ── Root ── */}
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      {!hideNavbar && <Navbar />}
    </div>
  );
}

function NotFound() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) {
    return (
      <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'Segoe UI', sans-serif" }}>
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
      <AppContent />
    </Router>
  );
}