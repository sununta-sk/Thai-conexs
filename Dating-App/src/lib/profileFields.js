// src/lib/profileFields.js
// Small shared readers for profile `details` fields whose stored shape
// varies, so every page interprets them the same way.

// Same matching lists Discover.jsx's gender filter already uses (male /
// female / transgender), so every page agrees on what each value means.
const MALE_VALUES = ['male', 'ชาย', 'm', 'man'];
const FEMALE_VALUES = ['female', 'หญิง', 'f', 'woman'];
const TRANSGENDER_VALUES = ['transgender', 'trans', 'ทรานส์เจนเดอร์', 'tg'];

// 'male' | 'female' | 'transgender' | 'other' (Non-binary, Gay, Bisexual,
// Other, อื่นๆ ...) | null (blank). 'other' deliberately gets no gender
// symbol anywhere - a gay man or a bisexual woman shouldn't be shown the
// transgender symbol just because their value isn't literally "Male"/"Female".
export function genderKind(rawGender) {
  const g = (rawGender || '').toLowerCase().trim();
  if (!g) return null;
  if (MALE_VALUES.includes(g)) return 'male';
  if (FEMALE_VALUES.includes(g)) return 'female';
  if (TRANSGENDER_VALUES.includes(g)) return 'transgender';
  return 'other';
}

// "Looking For" used to be a single string and is now multi-select (an
// array). Older profiles still hold a plain string, so every reader
// normalises through this instead of assuming either shape. No migration
// needed - a profile becomes an array the next time its owner saves.
export function toLookingForList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

// Height is stored in centimetres. Many foreign members think in feet and
// inches, so displays show both: "162 cm (5'4")". Non-numeric legacy values
// are shown unchanged.
export function cmToFeetInches(value) {
  const cm = parseFloat(value);
  if (!Number.isFinite(cm) || cm <= 0) return '';
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export function formatHeight(value) {
  const imperial = cmToFeetInches(value);
  if (!imperial) return value ? String(value) : '';
  return `${Math.round(parseFloat(value))} cm (${imperial})`;
}

// Parses what people type for height in feet/inches and returns whole cm,
// or null if it isn't a height. Accepts 5'4" / 5'4 / 5’4” / 5 4 / 5-4 /
// 5ft 4in / 5 (= 5'0"). A dot is read the way people write heights
// casually: 5.4 = 5'4", 5.10 = 5'10" (not decimal feet).
export function feetInchesToCm(text) {
  const s = String(text ?? '').trim().toLowerCase()
    .replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(/''/g, '"');
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s*(?:'|ft|feet|foot|\.|-|\s)?\s*(\d{1,2}(?:\.\d+)?)?\s*(?:"|in|inch|inches)?$/);
  if (!m) return null;
  const ft = Number(m[1]);
  const inch = m[2] ? Number(m[2]) : 0;
  if (ft < 3 || ft > 8 || inch >= 12) return null;
  return Math.round((ft * 12 + inch) * 2.54);
}
