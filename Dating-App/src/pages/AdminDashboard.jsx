// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { useAdminAuth } from '../hooks/useAdminAuth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { can } = useAdminAuth();
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState({ grossRevenue: 0, activeSubscriptions: 0, totalUsers: 0, openTickets: 0 });
  const [recentTickets, setRecentTickets]   = useState([]);
  const [recentAffiliates, setRecentAffiliates] = useState([]);
  const [planBreakdown, setPlanBreakdown]   = useState([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTickets(), fetchAffiliates(), fetchPlans()]);
    setLoading(false);
  }

  async function fetchStats() {
    try {
      // Total users จาก profiles
      const { count: userCount } = await supabase
        .from('profiles').select('*', { count: 'exact', head: true });

      // Active subscriptions
      const { count: subCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Gross revenue
      const { data: revData } = await supabase
        .from('user_subscriptions')
        .select('amount_paid')
        .eq('status', 'active');
      const gross = revData?.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0) || 0;

      // Open tickets
      const { count: ticketCount } = await supabase
        .from('moderation_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      setStats({
        grossRevenue:        gross,
        activeSubscriptions: subCount || 0,
        totalUsers:          userCount || 0,
        openTickets:         ticketCount || 0,
      });
    } catch (e) { console.error('stats error', e.message); }
  }

  async function fetchTickets() {
    try {
      const { data } = await supabase
        .from('moderation_tickets')
        .select('id, ticket_number, title, status, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentTickets(data || []);
    } catch (e) { console.error('tickets error', e.message); }
  }

  async function fetchAffiliates() {
    try {
      const { data } = await supabase
        .from('affiliates')
        .select('id, contact_name, referral_code, commission_rate, status, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentAffiliates(data || []);
    } catch (e) { console.error('affiliates error', e.message); }
  }

  async function fetchPlans() {
    try {
      const { data: plans } = await supabase
        .from('subscription_plans').select('id, name, display_name');
      if (!plans) return;
      const breakdown = await Promise.all(plans.map(async (p) => {
        const { count } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', p.id).eq('status', 'active');
        return { ...p, count: count || 0 };
      }));
      setPlanBreakdown(breakdown);
    } catch (e) { console.error('plans error', e.message); }
  }

  const priorityColor = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
  const statusColor   = { open: '#3b82f6', in_progress: '#8b5cf6', resolved: '#10b981', closed: '#475569' };

  return (
    <AdminLayout>
      <div style={S.page}>
        {/* Header */}
        <div style={S.pageHeader}>
          <div>
            <h2 style={S.pageTitle}>📊 Dashboard</h2>
            <p style={S.pageSubtitle}>Business Overview - Thai Conexns</p>
          </div>
          <button onClick={fetchAll} style={S.refreshBtn} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {loading ? (
          <div style={S.loadingBox}>Loading...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={S.kpiGrid}>
              <KpiCard icon="💰" label="Gross Revenue"        value={`$${stats.grossRevenue.toLocaleString()}`} accent="#f97316" />
              <KpiCard icon="👥" label="Total Users"          value={stats.totalUsers}                          accent="#3b82f6" />
              <KpiCard icon="⭐" label="Active Subscriptions" value={stats.activeSubscriptions}                 accent="#8b5cf6" />
              <KpiCard icon="🎫" label="Open Tickets"         value={stats.openTickets}                         accent="#ef4444"
                onClick={() => navigate('/admin/moderation/tickets')} clickable />
            </div>

            {/* Plan Breakdown */}
            {planBreakdown.length > 0 && (
              <div style={S.sectionRow}>
                {planBreakdown.map(p => {
                  const colors = { free: '#475569', premium: '#f59e0b', gold: '#eab308' };
                  return (
                    <div key={p.id} style={{ ...S.planCard, borderTop: `3px solid ${colors[p.name] || '#475569'}` }}>
                      <div style={{ color: colors[p.name] || '#fff', fontSize: 22, fontWeight: 800 }}>{p.count}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginTop: 4 }}>{p.display_name} users</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={S.twoCol}>
              {/* Recent Tickets */}
              {can('content', 'read') && (
                <div style={S.tableCard}>
                  <div style={S.tableHeader}>
                    <h3 style={S.tableTitle}>🎫 Recent Tickets</h3>
                    <button onClick={() => navigate('/admin/moderation/tickets')} style={S.viewAllBtn}>View All</button>
                  </div>
                  {recentTickets.length === 0 ? (
                    <div style={S.empty}>No tickets</div>
                  ) : (
                    <table style={S.table}>
                      <thead>
                        <tr>
                          {['#', 'Title', 'Priority', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {recentTickets.map(t => (
                          <tr key={t.id} style={S.tr}>
                            <td style={{ ...S.td, color: '#475569' }}>TKT-{String(t.ticket_number).padStart(4,'0')}</td>
                            <td style={{ ...S.td, color: '#f1f5f9', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                            <td style={S.td}>
                              <span style={{ ...S.badge, background: `${priorityColor[t.priority]}22`, color: priorityColor[t.priority] }}>{t.priority}</span>
                            </td>
                            <td style={S.td}>
                              <span style={{ ...S.badge, background: `${statusColor[t.status]}22`, color: statusColor[t.status] }}>{t.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Recent Affiliates */}
              {can('affiliates', 'read') && (
                <div style={S.tableCard}>
                  <div style={S.tableHeader}>
                    <h3 style={S.tableTitle}>🤝 Recent Affiliates</h3>
                    <button onClick={() => navigate('/admin/affiliates')} style={S.viewAllBtn}>View All</button>
                  </div>
                  {recentAffiliates.length === 0 ? (
                    <div style={S.empty}>No affiliates yet</div>
                  ) : (
                    <table style={S.table}>
                      <thead>
                        <tr>
                          {['Name', 'Code', 'Commission', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {recentAffiliates.map(a => (
                          <tr key={a.id} style={S.tr}>
                            <td style={{ ...S.td, color: '#f1f5f9', fontWeight: 700 }}>{a.contact_name}</td>
                            <td style={{ ...S.td, fontFamily: 'monospace', color: '#e91e63', fontWeight: 700 }}>{a.referral_code}</td>
                            <td style={{ ...S.td, color: '#10b981' }}>{(a.commission_rate * 100).toFixed(0)}%</td>
                            <td style={S.td}>
                              <span style={{ ...S.badge,
                                background: a.status === 'active' ? '#10b98122' : '#47556922',
                                color:      a.status === 'active' ? '#10b981'   : '#475569'
                              }}>{a.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function KpiCard({ icon, label, value, accent, onClick, clickable }) {
  return (
    <div
      onClick={onClick}
      style={{ ...S.kpiCard, borderTop: `3px solid ${accent}`, cursor: clickable ? 'pointer' : 'default' }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div style={S.kpiValue}>{value}</div>
        <div style={S.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

const S = {
  page:       { padding: 24, minHeight: '100%' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle:  { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  pageSubtitle: { color: '#64748b', fontSize: 13, margin: 0 },
  refreshBtn: { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '8px 16px', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loadingBox: { padding: 60, textAlign: 'center', color: '#475569' },
  kpiGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16, marginBottom: 20 },
  kpiCard:    { background: '#1e293b', borderRadius: 16, padding: 20, border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 14 },
  kpiValue:   { color: '#f1f5f9', fontSize: 22, fontWeight: 800 },
  kpiLabel:   { color: '#64748b', fontSize: 12, fontWeight: 600, marginTop: 2 },
  sectionRow: { display: 'flex', gap: 12, marginBottom: 20 },
  planCard:   { flex: 1, background: '#1e293b', borderRadius: 12, padding: '14px 18px', border: '1px solid #334155' },
  twoCol:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  tableCard:  { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  tableHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #334155' },
  tableTitle: { color: '#f1f5f9', fontWeight: 800, fontSize: 14, margin: 0 },
  viewAllBtn: { background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 16px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #334155', whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid #0f172a' },
  td:         { padding: '10px 16px', color: '#94a3b8', fontSize: 13 },
  badge:      { padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty:      { padding: 30, textAlign: 'center', color: '#475569', fontSize: 13 },
};