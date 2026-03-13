// src/pages/admin/ReportsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

const STATUS_TABS = ['open', 'investigating', 'resolved', 'dismissed'];
const CATEGORIES  = ['all', 'harassment', 'fake_profile', 'inappropriate_photo', 'spam', 'scam', 'underage', 'other'];

const STATUS_COLOR = {
  open:          '#ef4444',
  investigating: '#f59e0b',
  resolved:      '#10b981',
  dismissed:     '#475569',
};
const CATEGORY_LABEL = {
  harassment:          '🚨 Harassment',
  fake_profile:        '🎭 Fake Profile',
  inappropriate_photo: '🖼️ Inappropriate Photo',
  spam:                '📩 Spam',
  scam:                '💰 Scam',
  underage:            '⚠️ Underage',
  other:               '❓ Other',
};

export default function ReportsPage() {
  const navigate = useNavigate();

  const [reports,       setReports]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('open');
  const [category,      setCategory]      = useState('all');
  const [stats,         setStats]         = useState({});
  const [detail,        setDetail]        = useState(null);   // selected report for side panel
  const [adminNote,     setAdminNote]     = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Fetch ── */
  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('reports')
      .select(`
        id, category, description, status, created_at, admin_note,
        reporter:users!reports_reporter_id_fkey(id, display_name, email, avatar_url),
        reported:users!reports_reported_id_fkey(id, display_name, email, avatar_url)
      `)
      .eq('status', activeTab)
      .order('created_at', { ascending: false })
      .limit(50);

    if (category !== 'all') query = query.eq('category', category);
    const { data } = await query;
    setReports(data || []);
    setLoading(false);
  }, [activeTab, category]);

  const fetchStats = async () => {
    const results = await Promise.all(
      STATUS_TABS.map(s =>
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', s)
      )
    );
    const s = {};
    STATUS_TABS.forEach((key, i) => { s[key] = results[i].count || 0; });
    setStats(s);
  };

  useEffect(() => { fetchReports(); fetchStats(); }, [fetchReports]);

  /* ── Action ── */
  const updateStatus = async (reportId, newStatus) => {
    setActionLoading(true);
    await supabase.from('reports').update({
      status:      newStatus,
      admin_note:  adminNote || null,
      resolved_at: ['resolved', 'dismissed'].includes(newStatus) ? new Date().toISOString() : null,
    }).eq('id', reportId);
    setDetail(null);
    setAdminNote('');
    await fetchReports();
    await fetchStats();
    setActionLoading(false);
  };

  return (
    <AdminLayout>
      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.pageHeader}>
          <div>
            <h2 style={S.pageTitle}>🚨 User Reports</h2>
            <p style={S.pageSubtitle}>จัดการรายงานที่ผู้ใช้ส่งมา</p>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div style={S.tabs}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}), ...(activeTab === tab ? { borderColor: STATUS_COLOR[tab] + '66' } : {}) }}
            >
              <span style={{ ...S.tabDot, background: STATUS_COLOR[tab] }} />
              <span style={{ textTransform: 'capitalize' }}>{tab}</span>
              <span style={{
                ...S.tabBadge,
                background: `${STATUS_COLOR[tab]}22`,
                color: STATUS_COLOR[tab],
              }}>
                {stats[tab] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* ── Category Filter ── */}
        <div style={S.catRow}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                ...S.catBtn,
                ...(category === c ? { background: '#e91e63', color: '#fff', border: '1px solid #e91e63' } : {}),
              }}
            >
              {c === 'all' ? '📋 All' : CATEGORY_LABEL[c] || c}
            </button>
          ))}
        </div>

        {/* ── Layout: Table + Detail Panel ── */}
        <div style={{ display: 'flex', gap: 16 }}>

          {/* Table */}
          <div style={{ ...S.tableCard, flex: 1 }}>
            {loading ? (
              <div style={S.empty}>กำลังโหลด...</div>
            ) : reports.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div>ไม่มีรายงาน {activeTab}</div>
              </div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    {['ผู้รายงาน', 'ถูกรายงาน', 'ประเภท', 'วันที่', ''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr
                      key={r.id}
                      style={{
                        ...S.tr,
                        background: detail?.id === r.id ? '#1e293b' : 'transparent',
                      }}
                      onClick={() => { setDetail(r); setAdminNote(r.admin_note || ''); }}
                    >
                      {/* Reporter */}
                      <td style={S.td}>
                        <UserCell user={r.reporter} />
                      </td>
                      {/* Reported */}
                      <td style={S.td}>
                        <UserCell user={r.reported} />
                      </td>
                      {/* Category */}
                      <td style={S.td}>
                        <span style={S.catChip}>{CATEGORY_LABEL[r.category] || r.category}</span>
                      </td>
                      {/* Date */}
                      <td style={{ ...S.td, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString('th-TH')}
                      </td>
                      {/* Arrow */}
                      <td style={{ ...S.td, color: '#334155' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {detail && (
            <div style={S.detailPanel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>รายละเอียด</span>
                <button style={S.closePanelBtn} onClick={() => setDetail(null)}>✕</button>
              </div>

              {/* Status badge */}
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  ...S.statusBadge,
                  background: `${STATUS_COLOR[detail.status]}22`,
                  color: STATUS_COLOR[detail.status],
                }}>
                  {detail.status}
                </span>
              </div>

              {/* Users */}
              <div style={S.panelSection}>
                <div style={S.panelLabel}>ผู้รายงาน</div>
                <UserRow user={detail.reporter} navigate={navigate} />
              </div>
              <div style={S.panelSection}>
                <div style={S.panelLabel}>ถูกรายงาน</div>
                <UserRow user={detail.reported} navigate={navigate} />
              </div>

              {/* Category + Description */}
              <div style={S.panelSection}>
                <div style={S.panelLabel}>ประเภท</div>
                <span style={S.catChip}>{CATEGORY_LABEL[detail.category] || detail.category}</span>
              </div>
              {detail.description && (
                <div style={S.panelSection}>
                  <div style={S.panelLabel}>รายละเอียด</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{detail.description}</div>
                </div>
              )}

              {/* Admin note */}
              <div style={{ marginBottom: 14 }}>
                <div style={S.panelLabel}>Admin Note</div>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="บันทึกการดำเนินการ..."
                  style={S.textarea}
                  rows={3}
                />
              </div>

              {/* Action buttons */}
              {detail.status === 'open' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button style={{ ...S.actBtn, background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}
                    onClick={() => updateStatus(detail.id, 'investigating')} disabled={actionLoading}>
                    🔍 Investigate
                  </button>
                  <button style={{ ...S.actBtn, background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}
                    onClick={() => updateStatus(detail.id, 'resolved')} disabled={actionLoading}>
                    ✓ Resolve
                  </button>
                  <button style={{ ...S.actBtn, background: '#47556922', color: '#64748b', border: '1px solid #47556944' }}
                    onClick={() => updateStatus(detail.id, 'dismissed')} disabled={actionLoading}>
                    ✕ Dismiss
                  </button>
                </div>
              )}
              {detail.status === 'investigating' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button style={{ ...S.actBtn, background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}
                    onClick={() => updateStatus(detail.id, 'resolved')} disabled={actionLoading}>
                    ✓ Mark Resolved
                  </button>
                  <button style={{ ...S.actBtn, background: '#47556922', color: '#64748b', border: '1px solid #47556944' }}
                    onClick={() => updateStatus(detail.id, 'dismissed')} disabled={actionLoading}>
                    ✕ Dismiss
                  </button>
                </div>
              )}

              {/* Go to user */}
              <button
                style={{ ...S.actBtn, background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644', marginTop: 12 }}
                onClick={() => navigate(`/admin/users/${detail.reported?.id}`)}
              >
                👤 ดูโปรไฟล์ผู้ถูกรายงาน
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── Sub-components ── */
function UserCell({ user }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.display_name}&background=1e293b&color=f1f5f9&size=32`}
        alt=""
        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', background: '#334155' }}
      />
      <div>
        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{user?.display_name || 'Unknown'}</div>
        <div style={{ color: '#475569', fontSize: 11 }}>{user?.email}</div>
      </div>
    </div>
  );
}

function UserRow({ user, navigate }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0' }}
      onClick={() => navigate(`/admin/users/${user?.id}`)}
    >
      <img
        src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.display_name}&background=1e293b&color=f1f5f9&size=40`}
        alt=""
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#334155' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{user?.display_name}</div>
        <div style={{ color: '#64748b', fontSize: 11 }}>{user?.email}</div>
      </div>
      <span style={{ color: '#334155', fontSize: 18 }}>›</span>
    </div>
  );
}

/* ── Styles ── */
const S = {
  page:        { padding: 24 },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle:   { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  pageSubtitle:{ color: '#64748b', fontSize: 13, margin: 0 },

  tabs: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab:  {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 10,
    border: '1px solid #1e293b', background: '#0a0f1e',
    color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  tabActive: { background: '#1e293b', color: '#f1f5f9' },
  tabDot:    { width: 7, height: 7, borderRadius: '50%' },
  tabBadge:  { padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 },

  catRow: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  catBtn: {
    padding: '5px 12px', borderRadius: 20,
    border: '1px solid #1e293b', background: '#0a0f1e',
    color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  catChip: {
    padding: '3px 10px', borderRadius: 20,
    background: '#1e293b', color: '#94a3b8',
    fontSize: 11, fontWeight: 600,
  },

  tableCard: { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #334155' },
  tr:        { borderBottom: '1px solid #0f172a', cursor: 'pointer' },
  td:        { padding: '12px 16px', color: '#94a3b8', fontSize: 13 },
  empty:     { padding: 60, textAlign: 'center', color: '#475569', fontSize: 14 },

  detailPanel: {
    width: 300, flexShrink: 0,
    background: '#1e293b', borderRadius: 16,
    border: '1px solid #334155', padding: 16,
    alignSelf: 'flex-start', position: 'sticky', top: 0,
  },
  closePanelBtn: {
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: 8, color: '#64748b',
    width: 28, height: 28, cursor: 'pointer', fontSize: 13,
  },
  panelSection: { marginBottom: 14 },
  panelLabel:   { color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  statusBadge:  { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' },
  textarea: {
    width: '100%', boxSizing: 'border-box',
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: 8, padding: '8px 10px',
    color: '#f1f5f9', fontSize: 13, resize: 'vertical',
    fontFamily: "'Segoe UI', sans-serif",
  },
  actBtn: {
    width: '100%', padding: '9px 0',
    borderRadius: 10, fontSize: 13,
    fontWeight: 700, cursor: 'pointer',
  },
};