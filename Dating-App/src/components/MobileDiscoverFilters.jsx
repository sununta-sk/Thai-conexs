// src/components/MobileDiscoverFilters.jsx
// Mobile filters for Discover page (desktop search bar is not rendered on mobile).
// Layout: a standalone always-visible username search bar sits where the old
// full-width "Filters" button used to be; every other filter lives in a popup
// modal triggered by the small funnel icon in MobileNavbar's header row (it
// does NOT push the page content down like the old expanding panel did).
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { COUNTRY_LIST } from '../data/countryList';
import { OPEN_DISCOVER_FILTERS_EVENT } from './MobileNavbar';

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

  // Opened via the funnel icon in MobileNavbar's header row (cross-component
  // signal, not app-wide state - just tells this popup to open).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_DISCOVER_FILTERS_EVENT, handler);
    return () => window.removeEventListener(OPEN_DISCOVER_FILTERS_EVENT, handler);
  }, []);

  return (
    <>
      <div
        className="mobile-discover-search"
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: 12,
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}>
        <input
          type="text"
          value={filters?.username || ''}
          onChange={e => {
            const value = e.target.value;
            // Search has no visible sort control of its own here (Sort By
            // lives in the funnel popup below) - default order is 'random',
            // whose no-photo bucket always sinks brand-new (often
            // photo-less) signups to the bottom. Bias to newest-first, but
            // only on the empty->non-empty transition (starting a fresh
            // search), so a sort the user picks from the popup mid-search
            // doesn't get silently overridden on the next keystroke.
            if (value.trim() && !(filters?.username || '').trim()) {
              updateFilter('orderBy', 'newest');
            }
            updateFilter('username', value);
          }}
          placeholder={tx.searchUsername || 'Search username...'}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#f1f5f9',
            fontSize: 14,
            fontWeight: 600,
            boxSizing: 'border-box',
            outline: 'none',
            cursor: 'text',
          }}
        />
      </div>

      {open && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setOpen(false)}>
          <div
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 16,
              padding: 16, width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>🔍 {tx.filters || 'Filters'}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                {tx.hasPhotoOnly || 'Has photo'}
              </label>
              <select
                value={filters?.hasPhoto ? 'yes' : 'all'}
                onChange={e => updateFilter('hasPhoto', e.target.value === 'yes')}
                style={sel}>
                <option value="all">{tx.showAllMembers || 'All members'}</option>
                <option value="yes">{tx.hasPhotoOnly || 'Has photo'}</option>
              </select>

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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
