// src/App.jsx — Phase 6A ready
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabaseClient';

import Login        from './pages/Login';
import Register     from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Discover     from './pages/Discover';
import Messages     from './pages/Messages';
import RoomChat     from './pages/RoomChat';
import PaymentPage from './pages/PaymentPage';
import Navbar       from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import NotificationsPage from "./pages/NotificationsPage";

// ── Phase 6A: User-facing ───────────────────────────────────────────────────
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// ── Admin pages (lazy) ──────────────────────────────────────────────────────
const RevenuePage            = lazy(() => import('./pages/admin/RevenuePage'));
const PlatformSettingsPage   = lazy(() => import('./pages/admin/PlatformSettingsPage'));
const AnnouncementsPage      = lazy(() => import('./pages/admin/AnnouncementsPage'));
const TeamPage               = lazy(() => import('./pages/admin/TeamPage'));
const AuditLogPage           = lazy(() => import('./pages/admin/AuditLogPage'));

const UserListPage      = lazy(() => import('./pages/admin/UserListPage'));
const UserDetailPage    = lazy(() => import('./pages/admin/UserDetailPage'));
const AffiliateListPage = lazy(() => import('./pages/admin/AffiliateListPage'));

// Phase 3
const PhotoQueuePage = lazy(() => import('./pages/admin/PhotoQueuePage'));
const ReportsPage    = lazy(() => import('./pages/admin/ReportsPage'));
const TicketsPage    = lazy(() => import('./pages/admin/TicketsPage'));

// Phase 4
const AffiliateDetailPage    = lazy(() => import('./pages/admin/AffiliateDetailPage'));
const PayoutListPage         = lazy(() => import('./pages/admin/PayoutListPage'));
const PayoutRequestPage      = lazy(() => import('./pages/admin/PayoutRequestPage'));
const CommissionSettingsPage = lazy(() => import('./pages/admin/CommissionSettingsPage'));

// Phase 5
const AnalyticsDashboardPage    = lazy(() => import('./pages/admin/AnalyticsDashboardPage'));
const SubscriptionPage          = lazy(() => import('./pages/admin/SubscriptionPage'));
const NotificationBroadcastPage = lazy(() => import('./pages/admin/NotificationBroadcastPage'));

// ── Protected Route (user) ───────────────────────────────────────────────────
const ProtectedRoute = ({ children, session }) => {
  if (session === undefined) return <div style={{ background: '#0f172a', height: '100vh' }} />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

// ── Admin Protected Route ────────────────────────────────────────────────────
const AdminRoute = ({ children, session }) => {
  if (session === undefined) return <div style={{ background: '#0f172a', height: '100vh' }} />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

// ── Fallback loading ─────────────────────────────────────────────────────────
const AdminFallback = () => (
  <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
    Loading…
  </div>
);

// ── App Content ──────────────────────────────────────────────────────────────
function AppContent() {
  const location = useLocation();
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const hideNavbar = location.pathname.startsWith('/admin') ||
                     location.pathname.startsWith('/room-chat/');

  return (
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ flex: 1 }}>
        <Suspense fallback={<AdminFallback />}>
          <Routes>
            {/* ── Public ─────────────────────────────────────────────────── */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ── App (user) ──────────────────────────────────────────────── */}
            <Route path="/discover"          element={<ProtectedRoute session={session}><Discover /></ProtectedRoute>} />
            <Route path="/messages"          element={<ProtectedRoute session={session}><Messages /></ProtectedRoute>} />
            <Route path="/profile-setup"     element={<ProtectedRoute session={session}><ProfileSetup /></ProtectedRoute>} />
            <Route path="/room-chat/:chatId" element={<ProtectedRoute session={session}><RoomChat /></ProtectedRoute>} />

            {/* ── Phase 6A: User-facing ───────────────────────────────────── */}
            <Route path="/profile" element={<ProtectedRoute session={session}><ProfilePage /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute session={session}><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute session={session}><PaymentPage /></ProtectedRoute>} />

            {/* ── Admin — Core ─────────────────────────────────────────────── */}
            <Route path="/admin-secret-portal"  element={<AdminRoute session={session}><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/dashboard"      element={<AdminRoute session={session}><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users"          element={<AdminRoute session={session}><UserListPage /></AdminRoute>} />
            <Route path="/admin/users/:userId"  element={<AdminRoute session={session}><UserDetailPage /></AdminRoute>} />
            <Route path="/admin/affiliates"     element={<AdminRoute session={session}><AffiliateListPage /></AdminRoute>} />

            {/* ── Admin — Phase 3: Content Moderation ─────────────────────── */}
            <Route path="/admin/moderation/photos"   element={<AdminRoute session={session}><PhotoQueuePage /></AdminRoute>} />
            <Route path="/admin/moderation/reports"  element={<AdminRoute session={session}><ReportsPage /></AdminRoute>} />
            <Route path="/admin/moderation/tickets"  element={<AdminRoute session={session}><TicketsPage /></AdminRoute>} />

            {/* ── Admin — Phase 4: Affiliate & Payout ─────────────────────── */}
            <Route path="/admin/affiliates/:id"      element={<AdminRoute session={session}><AffiliateDetailPage /></AdminRoute>} />
            <Route path="/admin/payouts"             element={<AdminRoute session={session}><PayoutListPage /></AdminRoute>} />
            <Route path="/admin/payouts/new"         element={<AdminRoute session={session}><PayoutRequestPage /></AdminRoute>} />
            <Route path="/admin/commission-settings" element={<AdminRoute session={session}><CommissionSettingsPage /></AdminRoute>} />

            {/* ── Admin — Phase 5: Analytics, Subscriptions, Notifications ── */}
            <Route path="/admin/analytics"      element={<AdminRoute session={session}><AnalyticsDashboardPage /></AdminRoute>} />
            <Route path="/admin/subscriptions"  element={<AdminRoute session={session}><SubscriptionPage /></AdminRoute>} />
            <Route path="/admin/notifications"  element={<AdminRoute session={session}><NotificationBroadcastPage /></AdminRoute>} />

            <Route path="/admin/revenue"                element={<AdminRoute session={session}><RevenuePage /></AdminRoute>} />
            <Route path="/admin/platform/settings"      element={<AdminRoute session={session}><PlatformSettingsPage /></AdminRoute>} />
            <Route path="/admin/platform/announcements" element={<AdminRoute session={session}><AnnouncementsPage /></AdminRoute>} />
            <Route path="/admin/team"                   element={<AdminRoute session={session}><TeamPage /></AdminRoute>} />
            <Route path="/admin/audit-log"              element={<AdminRoute session={session}><AuditLogPage /></AdminRoute>} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {/* ── Root redirect ────────────────────────────────────────────── */}
            <Route path="/" element={<Navigate to="/discover" replace />} />

            {/* ── Fallback ─────────────────────────────────────────────────── */}
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
      <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>Admin page not found</div>
        <div style={{ color: '#475569', fontSize: 14 }}>{location.pathname}</div>
        <a href="/admin/dashboard" style={{ color: '#e91e63', fontSize: 14, marginTop: 8 }}>← Back to Dashboard</a>
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