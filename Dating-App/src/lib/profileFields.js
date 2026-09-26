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
