// src/data/worldLocations.js
// State/Province lookup for non-Thailand countries.
//
// Uses `country-region-data` (MIT licensed, ~46KB gzip for the whole world) for
// the state/province level. We deliberately do NOT pull in a world city dataset
// (e.g. country-state-city's city.json is ~2.2MB gzip on its own) — city is a
// free-text field for non-Thailand users instead (see ProfileSetup.jsx).
import { allCountries } from 'country-region-data';
import { COUNTRY_ISO } from './countryIso';

// Build a lookup: ISO code -> [[regionName, regionCode], ...]
const REGIONS_BY_ISO = {};
for (const [, isoCode, regions] of allCountries) {
  REGIONS_BY_ISO[isoCode] = regions;
}

/**
 * Get the list of states/provinces for one of the country names used in our
 * country dropdown (see ProfileSetup.jsx). Returns [] if the country has no
 * ISO mapping (e.g. "Other") or the dataset has no regions for it.
 * @param {string} countryName
 * @returns {{ id: string, name: string }[]}
 */
export function getStatesForCountryName(countryName) {
  const iso = COUNTRY_ISO[countryName];
  if (!iso) return [];
  const regions = REGIONS_BY_ISO[iso] || [];
  return regions.map(([name, code]) => ({ id: code, name }));
}
