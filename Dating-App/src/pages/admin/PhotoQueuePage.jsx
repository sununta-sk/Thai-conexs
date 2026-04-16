// src/pages/admin/PhotoQueuePage.jsx
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function PhotoQueuePage() {
  const [photos,        setPhotos]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('pending');
  const [stats,         setStats]         = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selected,      setSelected]      = useState(new Set());
  const [preview,       setPreview]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Fetch photos ── */
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const { data } = await supabase
      .from('photo_moderation_queue')
      .select(`
        id, photo_url, status, created_at, is_profile_photo, flag_reason, user_id
      `)
      .eq('status', activeTab)
      .order('created_at', { ascending: true })
      .limit(60);
    setPhotos(data || []);
    setLoading(false);
  }, [activeTab]);

  /* ── Fetch stats ── */
  const fetchStats = async () => {
    const [p, a, r] = await Promise.all(
      STATUS_TABS.map(s =>
        supabase.from('photo_moderation_queue').select('id', { count: 'exact', head: true }).eq('status', s)
      )
    );
    setStats({ pending: p.count || 0, approved: a.count || 0, rejected: r.count || 0 });
  };

  useEffect(() => { fetchPhotos(); fetchStats(); }, [fetchPhotos]);

  /* ── Moderate ── */
  const moderate = async (action, ids) => {
    setActionLoading(true);
    const statusMap = { approve: 'approved', reject: 'rejected' };
    await supabase
      .from('photo_moderation_queue')
      .update({ status: statusMap[action], reviewed_at: new Date().toISOString() })
      .in('id', ids);
    setPreview(null);
    await fetchPhotos();
    await fetchStats();
    setActionLoading(false);
  };

  const toggleSelect  = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll     = () => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map(p => p.id)));
  const selectedArr   = [...selected];

  return (
    <AdminLayout>
      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.pageHeader}>
          <div>
            <h2 style={S.pageTitle}>🖼️ Photo Queue</h2>
            <p style={S.pageSubtitle}>Review and approve user photos</p>
          </div>
        </div>

        {/* ── Stat Tabs ── */}
        <div style={S.tabs}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}) }}
            >
              <span style={{ ...S.tabDot, background: TAB_COLOR[tab] }} />
              <span style={{ textTransform: 'capitalize' }}>{tab}</span>
              <span style={{
                ...S.tabBadge,
                background: activeTab === tab ? `${TAB_COLOR[tab]}33` : '#1e293b',
                color:      activeTab === tab ? TAB_COLOR[tab] : '#475569',
              }}>
                {stats[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Bulk action bar ── */}
        {activeTab === 'pending' && selected.size > 0 && (
          <div style={S.bulkBar}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>เลือก <b style={{ color: '#f1f5f9' }}>{selected.size}</b> รูป</span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button
                style={{ ...S.actionBtn, background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}
                onClick={() => moderate('approve', selectedArr)}
                disabled={actionLoading}
              >✓ Approve {selected.size}</button>
              <button
                style={{ ...S.actionBtn, background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
                onClick={() => moderate('reject', selectedArr)}
                disabled={actionLoading}
              >✕ Reject {selected.size}</button>
              <button style={{ ...S.actionBtn, background: 'none', color: '#475569', border: '1px solid #334155' }}
                onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          </div>
        )}

        {/* ── Select all ── */}
        {activeTab === 'pending' && photos.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" checked={selected.size === photos.length} onChange={toggleAll}
              style={{ width: 15, height: 15, accentColor: '#e91e63', cursor: 'pointer' }} />
            <span style={{ color: '#64748b', fontSize: 12 }}>Select all ({photos.length} รูป)</span>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div style={S.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={S.skeleton} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {activeTab === 'pending' ? '📭' : activeTab === 'approved' ? '✅' : '🗑️'}
            </div>
            <div>No photos {activeTab}</div>
          </div>
        ) : (
          <div style={S.grid}>
            {photos.map(photo => (
              <div
                key={photo.id}
                style={{
                  ...S.card,
                  outline: selected.has(photo.id) ? '2px solid #e91e63' : '2px solid transparent',
                }}
              >
                {/* Image */}
                <div style={S.imgWrap} onClick={() => setPreview(photo)}>
                  <img src={photo.photo_url} alt="" style={S.img} />
                  {photo.is_profile_photo && <span style={S.primaryBadge}>Primary</span>}
                  <div style={S.imgOverlay}>
                    <span style={{ fontSize: 20 }}>🔍</span>
                  </div>
                </div>

                {/* Checkbox (pending only) */}
                {activeTab === 'pending' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(photo.id)}
                      onChange={() => toggleSelect(photo.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 16, height: 16, accentColor: '#e91e63', cursor: 'pointer' }}
                    />
                  </div>
                )}

                {/* User info */}
                <div style={S.cardBody}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {photo.user?.display_name || 'Unknown'}
                  </div>
                  <div style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {photo.user?.email}
                  </div>
                </div>

                {/* Quick action (pending only) */}
                {activeTab === 'pending' && (
                  <div style={S.quickActions}>
                    <button
                      style={{ ...S.quickBtn, background: '#10b98122', color: '#10b981' }}
                      onClick={e => { e.stopPropagation(); moderate('approve', [photo.id]); }}
                      disabled={actionLoading}
                    >✓</button>
                    <button
                      style={{ ...S.quickBtn, background: '#ef444422', color: '#ef4444' }}
                      onClick={e => { e.stopPropagation(); moderate('reject', [photo.id]); }}
                      disabled={actionLoading}
                    >✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Preview Modal ── */}
        {preview && (
          <div style={S.overlay} onClick={() => setPreview(null)}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>
              <button style={S.closeBtn} onClick={() => setPreview(null)}>✕</button>
              <img src={preview.photo_url} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', background: '#0a0f1e', borderRadius: '12px 12px 0 0' }} />
              <div style={{ padding: 20 }}>
                {/* User row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <img
                    src={preview.user?.avatar_url || `https://ui-avatars.com/api/?name=${preview.user?.display_name}&background=1e293b&color=f1f5f9`}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#1e293b' }}
                  />
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{preview.user?.display_name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{preview.user?.email}</div>
                  </div>
                  {preview.is_profile_photo && <span style={{ marginLeft: 'auto', ...S.primaryBadge, position: 'static' }}>Primary</span>}
                </div>
                <div style={{ color: '#475569', fontSize: 12, marginBottom: 16 }}>
                  Uploaded: {new Date(preview.created_at).toLocaleString('en-GB')}
                </div>

                {/* Actions */}
                {preview.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={{ ...S.modalActionBtn, background: '#10b981', flex: 1 }}
                      onClick={() => moderate('approve', [preview.id])}
                      disabled={actionLoading}
                    >✓ Approve</button>
                    <button
                      style={{ ...S.modalActionBtn, background: '#ef4444', flex: 1 }}
                      onClick={() => moderate('reject', [preview.id])}
                      disabled={actionLoading}
                    >✕ Reject</button>
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center', padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
                    background: preview.status === 'approved' ? '#10b98122' : '#ef444422',
                    color:      preview.status === 'approved' ? '#10b981'   : '#ef4444',
                  }}>
                    {preview.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ── Constants ── */
const TAB_COLOR = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

/* ── Styles ── */
const S = {
  page:        { padding: 24 },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle:   { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  pageSubtitle:{ color: '#64748b', fontSize: 13, margin: 0 },

  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab:  {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 10,
    border: '1px solid #1e293b', background: '#0a0f1e',
    color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  tabActive: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' },
  tabDot:    { width: 7, height: 7, borderRadius: '50%' },
  tabBadge:  { padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 },

  bulkBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', marginBottom: 12,
    background: '#1e293b', borderRadius: 10, border: '1px solid #334155',
  },
  actionBtn: {
    padding: '6px 14px', borderRadius: 8,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  card: {
    background: '#1e293b', borderRadius: 12,
    overflow: 'hidden', position: 'relative',
    transition: 'outline 0.1s',
  },
  imgWrap: {
    width: '100%', aspectRatio: '1',
    overflow: 'hidden', cursor: 'pointer',
    position: 'relative', background: '#0a0f1e',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' },
  imgOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  cardBody: { padding: '8px 10px' },
  quickActions: { display: 'flex', gap: 6, padding: '0 10px 10px' },
  quickBtn: {
    flex: 1, padding: '5px 0', borderRadius: 8,
    border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  primaryBadge: {
    position: 'absolute', top: 6, left: 6,
    background: '#3b82f666', color: '#93c5fd',
    fontSize: 10, fontWeight: 700, padding: '2px 8px',
    borderRadius: 20, backdropFilter: 'blur(4px)',
  },
  skeleton: {
    aspectRatio: '1', borderRadius: 12,
    background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  empty: { padding: 80, textAlign: 'center', color: '#475569', fontSize: 14 },

  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: '#1e293b', borderRadius: 16,
    width: '100%', maxWidth: 480,
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    position: 'relative', overflow: 'hidden',
    border: '1px solid #334155',
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)', border: 'none',
    color: '#f1f5f9', fontSize: 14, cursor: 'pointer',
  },
  modalActionBtn: {
    padding: '10px 0', borderRadius: 10,
    border: 'none', color: '#fff', fontWeight: 700,
    fontSize: 14, cursor: 'pointer',
  },
};