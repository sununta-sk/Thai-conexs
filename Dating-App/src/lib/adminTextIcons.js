// src/lib/adminTextIcons.js
// Emoji used inside admin toast / status strings -> icon, for <IconText
// icons={ADMIN_TEXT_ICONS} text={...} />, so those strings keep their
// wording and just show an icon where the emoji was. Lives in lib/ (not in
// components/admin/AdminIcons.jsx) because a component file may only export
// components (react-refresh lint rule).
import { CheckIcon, XIcon, RocketIcon, ShieldStarIcon, WarningIcon } from '../components/Icons';
import { CheckCircleIcon, XCircleIcon, AlarmIcon } from '../components/MoreIcons';

export const ADMIN_TEXT_ICONS = {
  '✓': CheckIcon,
  '✅': CheckCircleIcon,
  '❌': XCircleIcon,
  '✕': XIcon,
  '✗': XIcon,
  '⏰': AlarmIcon,
  '🚀': RocketIcon,
  '🌟': ShieldStarIcon,
  '⚠': WarningIcon,
};
