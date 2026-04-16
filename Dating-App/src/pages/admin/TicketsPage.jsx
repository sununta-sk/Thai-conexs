// src/pages/admin/TicketsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const STATUS_TABS  = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
const PRIORITIES   = ['all', 'urgent', 'high', 'medium', 'low'];

const STATUS_COLOR = {
  open:         '#ef4444',
  in_progress:  '#3b82f6',
  waiting_user: '#f59e0b',
  resolved:     '#10b981',
  closed:       '#475569',
};
const PRIORITY_COLOR = {
  urgent: '#ef4444',
  high:   '#f59e0b',
  medium: '#3b82f6',
  low:    '#475569',
};
const PRIORITY_ICON = { urgent: '🔴', high: '🟠', medium: '🔵', low: '⚪' };

export default function TicketsPage() {
  const { adminUser } = useAdminAuth();

  const [tickets,       setTickets]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('open');
  const [priority,      setPriority]      = useState('all');
  const [stats,         setStats]         = useState({});
  const [detail,        setDetail]        = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [reply,         setReply]         = useState('');
  const [replyLoading,  setReplyLoading]  = useState(false);
  const [msgLoading,    setMsgLoading]    = useState(false);

  /* ── Fetch tickets ── */
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('support_tickets')
      .select(`
        id, subject, message, status, priority, created_at, updated_at, user_id
      `)
      .eq('status', activeTab)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (priority !== 'all') query = query.eq('priority', priority);
    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  }, [activeTab, priority]);

  const fetchStats = async () => {
    const results = await Promise.all(
      STATUS_TABS.map(s =>
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', s)
      )
    );
    const s = {};
    STATUS_TABS.forEach((key, i) => { s[key] = results[i].count || 0; });
    setStats(s);
  };

  useEffect(() => { fetchTickets(); fetchStats(); }, [fetchTickets]);

  /* ── Load ticket messages ── */
  const openDetail = async (ticket) => {
    setDetail(ticket);
    setReply('');
    setMsgLoading(true);
    const { data } = await supabase
      .from('ticket_messages')
      .select('id, content, is_admin, created_at, sender_id')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setMsgLoading(false);
  };

  /* ── Send reply ── */
  const sendReply = async () => {
    if (!reply.trim() || !detail) return;
    setReplyLoading(true);
    await supabase.from('ticket_messages').insert({
      ticket_id: detail.id,
      sender_id: adminUser?.id,
      content:   reply.trim(),
      is_admin:  true,
    });
    await supabase.from('support_tickets').update({
      status:     'waiting_user',
      updated_at: new Date().toISOString(),
    }).eq('id', detail.id);

    const { data } = await supabase
      .from('ticket_messages')
      .select('id, content, is_admin, created_at, sender_id')
      .eq('ticket_id', detail.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setReply('');
    await fetchTickets();
    await fetchStats();
    setReplyLoading(false);
  };

  /* ── Update ticket status ── */
  const updateStatus = async (ticketId, newStatus) => {
    await supabase.from('support_tickets').update({
      status:     newStatus,
      updated_at: new Date().toISOString(),
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', ticketId);
    setDetail(null);
    await fetchTickets();
    await fetchStats();
  };

  const statusLabel = s => s.replace('_', ' ');

  return (
    <AdminLayout>
      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.pageHeader}>
          <div>
            <h2 style={S.pageTitle}>🎫 Support Tickets</h2>
            <p style={S.pageSubtitle}>Manage tickets and reply to users</p>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div style={S.tabs}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ ...S.tab, ...(activeTab === tab ? { ...S.tabActive, borderColor: STATUS_COLOR[tab] + '66' } : {}) }}
            >
              <span style={{ ...S.tabDot, background: STATUS_COLOR[tab] }} />
              <span style={{ textTransform: 'capitalize' }}>{statusLabel(tab)}</span>
              <span style={{ ...S.tabBadge, background: `${STATUS_COLOR[tab]}22`, color: STATUS_COLOR[tab] }}>
                {stats[tab] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* ── Priority Filter ── */}
        <div style={S.catRow}>
          {PRIORITIES.map(p => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              style={{
                ...S.catBtn,
                ...(priority === p ? { background: '#e91e63', color: '#fff', border: '1px solid #e91e63' } : {}),
              }}
            >
              {p === 'all' ? '🎯 All Priority' : `${PRIORITY_ICON[p]} ${p.charAt(0).toUpperCase() + p.slice(1)}`}
            </button>
          ))}
        </div>

        {/* ── Layout: List + Detail ── */}
        <div style={{ display: 'flex', gap: 16 }}>

          {/* Ticket List */}
          <div style={{ ...S.tableCard, flex: 1 }}>
            {loading ? (
              <div style={S.empty}>Loading...</div>
            ) : tickets.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div>No tickets {statusLabel(activeTab)}</div>
              </div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    {['ผู้ใช้', 'Subject', 'Priority', 'Updated', ''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr
                      key={t.id}
                      style={{ ...S.tr, background: detail?.id === t.id ? '#1e293b' : 'transparent' }}
                      onClick={() => openDetail(t)}
                    >
                      {/* User */}
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img
                            src={t.user?.avatar_url || `https://ui-avatars.com/api/?name=${t.user?.display_name}&background=1e293b&color=f1f5f9&size=28`}
                            alt=""
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', background: '#334155' }}
                          />
                          <div>
                            <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{t.user?.display_name}</div>
                            <div style={{ color: '#475569', fontSize: 11 }}>{t.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Subject */}
                      <td style={{ ...S.td, maxWidth: 200 }}>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.subject}
                        </div>
                      </td>
                      {/* Priority */}
                      <td style={S.td}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: `${PRIORITY_COLOR[t.priority]}22`,
                          color: PRIORITY_COLOR[t.priority],
                        }}>
                          {PRIORITY_ICON[t.priority]} {t.priority}
                        </span>
                      </td>
                      {/* Updated */}
                      <td style={{ ...S.td, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(t.updated_at).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ ...S.td, color: '#334155' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel: Ticket Thread */}
          {detail && (
            <div style={S.detailPanel}>
              {/* Panel Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{detail.subject}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${STATUS_COLOR[detail.status]}22`, color: STATUS_COLOR[detail.status], textTransform: 'capitalize' }}>
                      {statusLabel(detail.status)}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${PRIORITY_COLOR[detail.priority]}22`, color: PRIORITY_COLOR[detail.priority] }}>
                      {PRIORITY_ICON[detail.priority]} {detail.priority}
                    </span>
                  </div>
                </div>
                <button style={S.closePanelBtn} onClick={() => setDetail(null)}>✕</button>
              </div>

              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 10px', background: '#0f172a', borderRadius: 8 }}>
                <img
                  src={detail.user?.avatar_url || `https://ui-avatars.com/api/?name=${detail.user?.display_name}&background=1e293b&color=f1f5f9&size=32`}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 12 }}>{detail.user?.display_name}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{detail.user?.email}</div>
                </div>
              </div>

              {/* Messages */}
              <div style={S.msgThread}>
                {msgLoading ? (
                  <div style={{ color: '#475569', textAlign: 'center', padding: 20, fontSize: 13 }}>Loading...</div>
                ) : messages.length === 0 ? (
                  <div style={{ color: '#475569', textAlign: 'center', padding: 20, fontSize: 13 }}>No messages yet</div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} style={{ ...S.msgBubble, ...(m.is_admin ? S.msgAdmin : S.msgUser) }}>
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{m.content}</div>
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>
                        {m.is_admin ? '🛡️ Admin' : `👤 ${m.sender?.display_name}`} · {new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply box */}
              {!['resolved', 'closed'].includes(detail.status) && (
                <div style={{ marginTop: 12 }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type a reply..."
                    style={S.textarea}
                    rows={3}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply(); }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      style={{ ...S.actBtn, flex: 1, background: '#e91e63', color: '#fff', border: 'none' }}
                      onClick={sendReply}
                      disabled={replyLoading || !reply.trim()}
                    >
                      {replyLoading ? 'Sending...' : '↑ ส่งข้อความ'}
                    </button>
                  </div>
                </div>
              )}

              {/* Status actions */}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Change Status</div>
                {detail.status !== 'resolved' && (
                  <button style={{ ...S.actBtn, background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}
                    onClick={() => updateStatus(detail.id, 'resolved')}>
                    ✓ Mark Resolved
                  </button>
                )}
                {detail.status !== 'in_progress' && !['resolved', 'closed'].includes(detail.status) && (
                  <button style={{ ...S.actBtn, background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}
                    onClick={() => updateStatus(detail.id, 'in_progress')}>
                    🔧 In Progress
                  </button>
                )}
                {detail.status !== 'closed' && (
                  <button style={{ ...S.actBtn, background: '#47556922', color: '#64748b', border: '1px solid #47556944' }}
                    onClick={() => updateStatus(detail.id, 'closed')}>
                    ✕ Close Ticket
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
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

  tableCard: { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #334155' },
  tr:        { borderBottom: '1px solid #0f172a', cursor: 'pointer' },
  td:        { padding: '12px 16px', color: '#94a3b8', fontSize: 13 },
  empty:     { padding: 60, textAlign: 'center', color: '#475569', fontSize: 14 },

  detailPanel: {
    width: 320, flexShrink: 0,
    background: '#1e293b', borderRadius: 16,
    border: '1px solid #334155', padding: 16,
    alignSelf: 'flex-start', position: 'sticky', top: 0,
    maxHeight: 'calc(100vh - 130px)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  closePanelBtn: {
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: 8, color: '#64748b',
    width: 28, height: 28, cursor: 'pointer', fontSize: 13,
    flexShrink: 0,
  },
  msgThread: {
    flex: 1, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 8,
    maxHeight: 280, padding: '4px 0',
  },
  msgBubble: {
    padding: '8px 12px', borderRadius: 10,
    maxWidth: '90%', wordBreak: 'break-word',
  },
  msgUser:  { background: '#0f172a', color: '#94a3b8', alignSelf: 'flex-start', borderRadius: '4px 12px 12px 12px' },
  msgAdmin: { background: '#e91e6322', color: '#fda4af', alignSelf: 'flex-end', border: '1px solid #e91e6333', borderRadius: '12px 4px 12px 12px' },

  textarea: {
    width: '100%', boxSizing: 'border-box',
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: 8, padding: '8px 10px',
    color: '#f1f5f9', fontSize: 13, resize: 'vertical',
    fontFamily: "'Segoe UI', sans-serif",
  },
  actBtn: {
    width: '100%', padding: '8px 0',
    borderRadius: 10, fontSize: 12,
    fontWeight: 700, cursor: 'pointer',
  },
};