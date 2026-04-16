// src/pages/admin/UserListPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/AdminLayout';

const PLAN_COLORS = {
  free:    { bg: '#1e293b', color: '#64748b' },
  premium: { bg: '#1c1917', color: '#f59e0b' },
  gold:    { bg: '#1c1917', color: '#eab308' },
};

export default function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [planFilter, setPlan]   = useState('all');
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchUsers(); }, [search, planFilter, page]);

  async function fetchUsers() {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, subscription_plan, subscription_expiry, created_at, is_verified', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) query = query.ilike('username', `%${search.trim()}%`);
      if (planFilter !== 'all') query = query.eq('subscription_plan', planFilter);

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (e) { console.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <AdminLayout>
      <div style={S.page}>
        {/* Header */}
        <div style={S.pageHeader}>
          <div>
            <h2 style={S.pageTitle}>👥 User Management</h2>
            <p style={S.pageSubtitle}>Manage all users in the system</p>
          </div>
        </div>

        {/* Filters */}
        <div style={S.filterBar}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="🔍  Search username..."
            style={S.searchInput}
          />
          <div style={S.filterBtns}>
            {['all', 'free', 'premium', 'gold'].map(p => (
              <button
                key={p}
                onClick={() => { setPlan(p); setPage(0); }}
                style={{ ...S.filterBtn, ...(planFilter === p ? S.filterBtnActive : {}) }}
              >
                {p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={S.tableCard}>
          {loading ? (
            <div style={S.empty}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={S.empty}>No users found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['User', 'Plan', 'Verified', 'Joined', 'Expiry', 'Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const plan = u.subscription_plan?.toLowerCase() || 'free';
                    const pc   = PLAN_COLORS[plan] || PLAN_COLORS.free;
                    return (
                      <tr key={u.id} style={S.tr}>
                        {/* User */}
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                              src={u.avatar_url || 'https://via.placeholder.com/36'}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e293b' }}
                            />
                            <div>
                              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{u.username || 'Anonymous'}</div>
                              <div style={{ color: '#475569', fontSize: 11 }}>{u.id.slice(0,8)}...</div>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td style={S.td}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: pc.bg, color: pc.color, textTransform: 'uppercase' }}>
                            {plan}
                          </span>
                        </td>

                        {/* Verified */}
                        <td style={S.td}>
                          <span style={{ fontSize: 16 }}>{u.is_verified ? '✅' : '❌'}</span>
                        </td>

                        {/* Joined */}
                        <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>
                          {new Date(u.created_at).toLocaleDateString('th-TH')}
                        </td>

                        {/* Expiry */}
                        <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>
                          {u.subscription_expiry
                            ? new Date(u.subscription_expiry).toLocaleDateString('th-TH')
                            : '—'}
                        </td>

                        {/* Actions */}
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => navigate(`/admin/users/${u.id}`)}
                              style={S.actionBtn}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div style={S.pagination}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ ...S.pageBtn, opacity: page === 0 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <span style={{ color: '#64748b', fontSize: 13 }}>Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={users.length < PAGE_SIZE}
              style={{ ...S.pageBtn, opacity: users.length < PAGE_SIZE ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const S = {
  page:        { padding: 24 },
  pageHeader:  { marginBottom: 20 },
  pageTitle:   { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  pageSubtitle:{ color: '#64748b', fontSize: 13, margin: 0 },
  filterBar:   { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: 1, minWidth: 200, padding: '10px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 14, outline: 'none' },
  filterBtns:  { display: 'flex', gap: 6 },
  filterBtn:   { padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  filterBtnActive: { background: '#e91e6322', color: '#e91e63', borderColor: '#e91e6344' },
  tableCard:   { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #334155', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid #0f172a' },
  td:          { padding: '12px 16px', color: '#94a3b8', fontSize: 13 },
  actionBtn:   { padding: '5px 12px', borderRadius: 6, border: '1px solid #334155', background: 'none', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  pagination:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '14px 0', borderTop: '1px solid #334155' },
  pageBtn:     { padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  empty:       { padding: 50, textAlign: 'center', color: '#475569', fontSize: 14 },
};