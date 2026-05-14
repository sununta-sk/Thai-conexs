// src/components/MobileDiscoverFilters.jsx
// Mobile filter dropdown for Discover page (desktop search bar is not rendered on mobile).
import { useState } from 'react';
import { PROVINCES } from '../data/thaiLocations';

const AGE_RANGES = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
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

export default function MobileDiscoverFilters({ filters, updateFilter, tx = {}, lang = 'en' }) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (filters?.gender && filters.gender !== 'all' ? 1 : 0) +
    (filters?.ageRange && filters.ageRange !== 'all' ? 1 : 0) +
    (filters?.province && filters.province !== 'all' ? 1 : 0) +
    (filters?.ignoreAgePref ? 1 : 0);

  const provinceLabel = (p) => (p?.name && (p.name[lang] || p.name.en)) || p?.id || '';

  return (
    <div
      className="mobile-discover-filters"
      style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: 12,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
      <button
        type="button"
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
          🔍 {tx.filters || 'Filters'}
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
            {tx.gender || 'Gender'}
          </label>
          <select
            value={filters?.gender || 'all'}
            onChange={e => updateFilter('gender', e.target.value)}
            style={sel}>
            <option value="all">{tx.genderAll || 'Guys & Girls'}</option>
            <option value="male">{tx.genderMale || 'Guys'}</option>
            <option value="female">{tx.genderFemale || 'Girls'}</option>
            <option value="other">{tx.genderOther || 'Other'}</option>
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            {tx.ageRange || 'Age Range'}
          </label>
          <select
            value={filters?.ageRange || 'all'}
            onChange={e => updateFilter('ageRange', e.target.value)}
            style={sel}>
            <option value="all">{tx.allAges || 'All ages'}</option>
            {AGE_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            {tx.province || 'Province'}
          </label>
          <select
            value={filters?.province || 'all'}
            onChange={e => updateFilter('province', e.target.value)}
            style={sel}>
            <option value="all">{tx.allProvinces || 'All provinces'}</option>
            {PROVINCES.map(p => (
              <option key={p.id} value={p.id}>{provinceLabel(p)}</option>
            ))}
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            {tx.agePref || 'Age Preference'}
          </label>
          <select
            value={filters?.ignoreAgePref ? 'ignore' : 'respect'}
            onChange={e => updateFilter('ignoreAgePref', e.target.value === 'ignore')}
            style={sel}>
            <option value="respect">{tx.respectAgePref || 'Respect their age range'}</option>
            <option value="ignore">{tx.ignoreAgePref || 'Ignore their age range'}</option>
          </select>

          <button
            type="button"
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
            {tx.applyFilters || 'Apply Filters'}
          </button>
        </div>
      )}
    </div>
  );
}
