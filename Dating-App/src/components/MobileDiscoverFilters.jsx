// src/components/MobileDiscoverFilters.jsx
// Mobile filter dropdown for Discover page (desktop search bar is not rendered on mobile).
import { useState } from 'react';
import { COUNTRY_LIST } from '../data/countryList';

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

export default function MobileDiscoverFilters({ filters, updateFilter, updateCountryFilter, provinceOptions = [], tx = {} }) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (filters?.gender && filters.gender !== 'all' ? 1 : 0) +
    (filters?.ageRange && filters.ageRange !== 'all' ? 1 : 0) +
    (filters?.country && filters.country !== 'all' ? 1 : 0) +
    (filters?.province && filters.province !== 'all' ? 1 : 0) +
    (filters?.ignoreAgePref ? 1 : 0) +
    (filters?.onlineOnly ? 1 : 0) +
    (filters?.orderBy && filters.orderBy !== 'random' ? 1 : 0) +
    (filters?.username && filters.username.trim() ? 1 : 0);

  return (
    <>
    <div
      className="mobile-discover-filters"
      style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: 12,
        position: 'sticky',
        top: 0,
        zIndex: 999,
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
    </div>

    {open && (
        <div style={{
          margin: '10px 12px',
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
            <option value="transgender">{tx.genderTransgender || 'Transgender'}</option>
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
            {tx.country || 'Country'}
          </label>
          <select
            value={filters?.country || 'all'}
            onChange={e => (updateCountryFilter ? updateCountryFilter(e.target.value) : updateFilter('country', e.target.value))}
            style={sel}>
            <option value="all">{tx.allCountries || 'All countries'}</option>
            {COUNTRY_LIST.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
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
            {provinceOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
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

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            {tx.onlineOnly || 'Online'}
          </label>
          <select
            value={filters?.onlineOnly ? 'online' : 'all'}
            onChange={e => updateFilter('onlineOnly', e.target.value === 'online')}
            style={sel}>
            <option value="all">{tx.showAllMembers || 'All members'}</option>
            <option value="online">{tx.onlineOnly || 'Online only'}</option>
          </select>

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            {tx.searchUsername || 'Search username'}
          </label>
          <input
            type="text"
            value={filters?.username || ''}
            onChange={e => updateFilter('username', e.target.value)}
            placeholder={tx.searchUsername || 'Search username...'}
            style={{ ...sel, cursor: 'text', boxSizing: 'border-box' }}
          />

          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: -4, marginTop: 4 }}>
            {tx.sortBy || 'Sort By'}
          </label>
          <select
            value={filters?.orderBy || 'random'}
            onChange={e => updateFilter('orderBy', e.target.value)}
            style={sel}>
            <option value="random">{tx.orderRandom || 'Sort by Random'}</option>
            <option value="last_seen">{tx.orderLastActive || 'Sort by Last Active'}</option>
            <option value="newest">{tx.orderNewest || 'Sort by Newest'}</option>
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
    </>
  );
}
