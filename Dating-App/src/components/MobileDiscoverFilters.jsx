// src/components/MobileDiscoverFilters.jsx
// Mobile filter dropdown for Discover page.
// Receives `filters` and `updateFilter` from parent Discover.
// On mount: injects CSS that hides the next sibling (existing search bar)
// when html.mobile-active is set.
import { useState, useEffect } from 'react';
import { PROVINCES } from '../data/thaiLocations';

const AGE_RANGES = [
  { value: 'all', label: 'All ages' },
  { value: '18-25', label: '18-25' },
  { value: '26-35', label: '26-35' },
  { value: '36-45', label: '36-45' },
  { value: '46-55', label: '46-55' },
  { value: '55+', label: '55+' },
];

const sel = {
  width: '100%',
  padding: '12px 14px',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
  fontWeight: 600,
  appearance: 'none',
  cursor: 'pointer',
};

export default function MobileDiscoverFilters({ filters, updateFilter }) {
  const [open, setOpen] = useState(false);

  // Inject CSS once: hide existing search bar (next sibling) when mobile
  useEffect(() => {
    const ID = 'mobile-discover-filters-css';
    if (document.getElementById(ID)) return;
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = `
      .mobile-active .mobile-discover-filters + div {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Count active filters for badge
  const activeCount =
    (filters?.gender && filters.gender !== 'all' ? 1 : 0) +
    (filters?.ageRange && filters.ageRange !== 'all' ? 1 : 0) +
    (filters?.province && filters.province !== 'all' ? 1 : 0) +
    (filters?.ignoreAgePref ? 1 : 0);

  return (
    <div
      className="mobile-discover-filters"
      style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: 12,
        position: 'sticky',
        top: 56,
        zIndex: 50,
      }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: open ? '#0f172a' : 'linear-gradient(135deg, #e91e63, #c2185b)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(233,30,99,0.3)',
        }}>
        <span>
          🔍 Filters
          {activeCount > 0 && (
            <span style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: '#fff',
              color: '#e91e63',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 800,
            }}>{activeCount}</span>
          )}
        </span>
        <span style={{ fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#0f172a',
          padding: 12,
          borderRadius: 10,
          border: '1px solid #334155',
        }}>
          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4 }}>
            Gender
          </label>
          <select
            value={filters?.gender || 'all'}
            onChange={e => updateFilter('gender', e.target.value)}
            style={sel}>
            <option value="all">Guys & Girls</option>
            <option value="male">Guys</option>
            <option value="female">Girls</option>
            <option value="other">Other</option>
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            Age Range
          </label>
          <select
            value={filters?.ageRange || 'all'}
            onChange={e => updateFilter('ageRange', e.target.value)}
            style={sel}>
            {AGE_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            Province
          </label>
          <select
            value={filters?.province || 'all'}
            onChange={e => updateFilter('province', e.target.value)}
            style={sel}>
            <option value="all">All provinces</option>
            {PROVINCES.map(p => (
              <option key={p.id} value={p.id}>{p.name?.en || p.id}</option>
            ))}
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            Age Preference
          </label>
          <select
            value={filters?.ignoreAgePref ? 'ignore' : 'respect'}
            onChange={e => updateFilter('ignoreAgePref', e.target.value === 'ignore')}
            style={sel}>
            <option value="respect">Respect their age range</option>
            <option value="ignore">Ignore their age range</option>
          </select>

          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: 8,
              padding: '12px',
              background: 'linear-gradient(135deg, #e91e63, #c2185b)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(233,30,99,0.3)',
            }}>
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
