// src/components/Icons.jsx
// Shared app icons. Two kinds live here:
//
// 1. Hand-drawn inline SVGs that used to be copy-pasted between files
//    (RoomChat.jsx / MobileRoomChat.jsx input bar, chat header, avatar
//    placeholder). Each component's DEFAULTS reproduce the original markup
//    exactly (same size, colors, stroke, paths), so swapping a call site
//    from the old inline <svg> to <XIcon /> is a pure consolidation with no
//    visual change. Pass size/color only where a call site genuinely
//    differed.
//
// 2. App-wide icon *decisions* that aren't a single lucide import, so there
//    is one place to change them. Everything else should import straight
//    from 'lucide-react' (same 24x24 / 2px stroke / round-cap style as the
//    SVGs below).

import { useId } from 'react';
import { ChevronFirst, ChevronLast } from 'lucide-react';
import { genderKind } from '../lib/profileFields';
import { MAGNIFY_PLUS_PATH } from '../lib/zoomCursor';
import { phosphorIcon } from '../lib/phosphor';

// Emoji-picker toggle (chat input bar).
export function SmileyIcon({ size = 26, color = '#e91e63', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

// Photo-attach button (desktop chat input bar).
export function CameraIcon({ size = 24, color = '#e91e63', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// Voice-message (hold-to-record) button. Call sites pass the recording
// color (#f87171) while recording.
export function MicIcon({ size = 22, color = '#e91e63', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Filled person silhouette - avatar placeholder when a user has no photo.
// Default matches RoomChat's photo-strip placeholder (28px, #64748b);
// navbars pass their own size/color to fit their avatar circles.
export function PersonIcon({ size = 28, color = '#64748b', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...rest}>
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// Chat header "back" chevron (was already an SVG on desktop RoomChat, a
// plain "←" text glyph on MobileRoomChat - both use this now). Inherits the
// button's text color via currentColor.
export function BackIcon({ size = 22, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// Previous/next (and collapse) arrows: app-wide choice is the "caret-line"
// shape (chevron + vertical bar, as in Phosphor's caret-line-left/right),
// picked for the profile-photo carousel. lucide's ChevronFirst/ChevronLast
// are that same shape drawn in lucide's stroke style, so they sit
// consistently next to every other lucide icon without adding a second
// icon library. If the literal Phosphor glyphs are ever wanted instead,
// this is the only place to change.
export const CaretLineLeftIcon = ChevronFirst;
export const CaretLineRightIcon = ChevronLast;

// ── Icons supplied by SK (Phosphor "regular" weight, MIT) ──────────────────
// Path data is copied verbatim from the downloaded SVGs; see lib/phosphor.js.
const phosphor = phosphorIcon;

// Notifications bell (was 🔔).
export const BellRingingIcon = phosphor('M224,71.1a8,8,0,0,1-10.78-3.42,94.13,94.13,0,0,0-33.46-36.91,8,8,0,1,1,8.54-13.54,111.46,111.46,0,0,1,39.12,43.09A8,8,0,0,1,224,71.1ZM35.71,72a8,8,0,0,0,7.1-4.32A94.13,94.13,0,0,1,76.27,30.77a8,8,0,1,0-8.54-13.54A111.46,111.46,0,0,0,28.61,60.32,8,8,0,0,0,35.71,72Zm186.1,103.94A16,16,0,0,1,208,200H167.2a40,40,0,0,1-78.4,0H48a16,16,0,0,1-13.79-24.06C43.22,160.39,48,138.28,48,112a80,80,0,0,1,160,0C208,138.27,212.78,160.38,221.81,175.94ZM150.62,200H105.38a24,24,0,0,0,45.24,0ZM208,184c-10.64-18.27-16-42.49-16-72a64,64,0,0,0-128,0c0,29.52-5.38,53.74-16,72Z', 'BellRingingIcon');

// VIP (was 💎 on "VIP Member"; also leads every "VIP" badge).
export const CrownIcon = phosphor('M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.91,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.85A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM193.22,192H62.78L48.86,108.52,81.79,149A8,8,0,0,0,88,152a7.83,7.83,0,0,0,1.08-.07,8,8,0,0,0,6.26-4.74l29.3-67.4a27,27,0,0,0,6.72,0l29.3,67.4a8,8,0,0,0,6.26,4.74A7.83,7.83,0,0,0,168,152a8,8,0,0,0,6.21-3l32.93-40.52ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z', 'CrownIcon');

// Lotus currency (was 🪷).
export const LotusIcon = phosphor('M245.83,121.63a15.53,15.53,0,0,0-9.52-7.33,73.51,73.51,0,0,0-22.17-2.22c4-19.85,1-35.55-2.06-44.86a16.15,16.15,0,0,0-18.79-10.88,85.53,85.53,0,0,0-28.55,12.12,94.58,94.58,0,0,0-27.11-33.25,16.05,16.05,0,0,0-19.26,0A94.48,94.48,0,0,0,91.26,68.46,85.53,85.53,0,0,0,62.71,56.34,16.15,16.15,0,0,0,43.92,67.22c-3,9.31-6,25-2.06,44.86a73.51,73.51,0,0,0-22.17,2.22,15.53,15.53,0,0,0-9.52,7.33,16,16,0,0,0-1.6,12.27c3.39,12.57,13.8,36.48,45.33,55.32S113.13,208,128.05,208s42.67,0,74-18.78c31.53-18.84,41.94-42.75,45.33-55.32A16,16,0,0,0,245.83,121.63ZM59.14,72.14a.2.2,0,0,1,.23-.15A70.43,70.43,0,0,1,85.18,83.66,118.65,118.65,0,0,0,80,119.17c0,18.74,3.77,34,9.11,46.28A123.59,123.59,0,0,1,69.57,140C51.55,108.62,55.3,84,59.14,72.14Zm3,103.35C35.47,159.57,26.82,140.05,24,129.7a59.82,59.82,0,0,1,22.5-1.17,129.08,129.08,0,0,0,9.15,19.41,142.28,142.28,0,0,0,34,39.56A114.92,114.92,0,0,1,62.1,175.49ZM128,190.4c-9.33-6.94-32-28.23-32-71.23C96,76.7,118.38,55.24,128,48c9.62,7.26,32,28.72,32,71.19C160,162.17,137.33,183.46,128,190.4ZM170.82,83.66A70.43,70.43,0,0,1,196.63,72a.2.2,0,0,1,.23.15C200.7,84,204.45,108.62,186.43,140a123.32,123.32,0,0,1-19.54,25.48c5.34-12.26,9.11-27.54,9.11-46.28A118.65,118.65,0,0,0,170.82,83.66ZM232,129.72c-2.77,10.25-11.4,29.81-38.09,45.77a114.92,114.92,0,0,1-27.55,12,142.28,142.28,0,0,0,34-39.56,129.08,129.08,0,0,0,9.15-19.41A59.69,59.69,0,0,1,232,129.71Z', 'LotusIcon');

// Chat send button.
export const PaperPlaneIcon = phosphor('M231.87,114l-168-95.89A16,16,0,0,0,40.92,37.34L71.55,128,40.92,218.67A16,16,0,0,0,56,240a16.15,16.15,0,0,0,7.93-2.1l167.92-96.05a16,16,0,0,0,.05-27.89ZM56,224a.56.56,0,0,0,0-.12L85.74,136H144a8,8,0,0,0,0-16H85.74L56.06,32.16A.46.46,0,0,0,56,32l168,95.83Z', 'PaperPlaneIcon');

// Boost (was 🚀 on boost buttons/modals).
export const RocketIcon = phosphor('M223.85,47.12a16,16,0,0,0-15-15c-12.58-.75-44.73.4-71.41,27.07L132.69,64H74.36A15.91,15.91,0,0,0,63,68.68L28.7,103a16,16,0,0,0,9.07,27.16l38.47,5.37,44.21,44.21,5.37,38.49a15.94,15.94,0,0,0,10.78,12.92,16.11,16.11,0,0,0,5.1.83A15.91,15.91,0,0,0,153,227.3L187.32,193A15.91,15.91,0,0,0,192,181.64V123.31l4.77-4.77C223.45,91.86,224.6,59.71,223.85,47.12ZM74.36,80h42.33L77.16,119.52,40,114.34Zm74.41-9.45a76.65,76.65,0,0,1,59.11-22.47,76.46,76.46,0,0,1-22.42,59.16L128,164.68,91.32,128ZM176,181.64,141.67,216l-5.19-37.17L176,139.31Zm-74.16,9.5C97.34,201,82.29,224,40,224a8,8,0,0,1-8-8c0-42.29,23-57.34,32.86-61.85a8,8,0,0,1,6.64,14.56c-6.43,2.93-20.62,12.36-23.12,38.91,26.55-2.5,36-16.69,38.91-23.12a8,8,0,1,1,14.56,6.64Z', 'RocketIcon');

// Upgrade / subscribe CTAs.
export const DiamondIcon = phosphor('M246,98.73l-56-64A8,8,0,0,0,184,32H72a8,8,0,0,0-6,2.73l-56,64a8,8,0,0,0,.17,10.73l112,120a8,8,0,0,0,11.7,0l112-120A8,8,0,0,0,246,98.73ZM222.37,96H180L144,48h36.37ZM74.58,112l30.13,75.33L34.41,112Zm89.6,0L128,202.46,91.82,112ZM96,96l32-42.67L160,96Zm85.42,16h40.17l-70.3,75.33ZM75.63,48H112L76,96H33.63Z', 'DiamondIcon');

// Verified badge (was a bare ✓ / "V").
export const VerifiedIcon = phosphor('M221.35,104.11a8,8,0,0,0-6.57,9.21A88.85,88.85,0,0,1,216,128a87.62,87.62,0,0,1-22.24,58.41,79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75A88,88,0,0,1,128,40a88.76,88.76,0,0,1,14.68,1.22,8,8,0,0,0,2.64-15.78,103.92,103.92,0,1,0,85.24,85.24A8,8,0,0,0,221.35,104.11ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM237.66,45.66l-32,32a8,8,0,0,1-11.32,0l-16-16a8,8,0,0,1,11.32-11.32L200,60.69l26.34-26.35a8,8,0,0,1,11.32,11.32Z', 'VerifiedIcon');

// Gender: female.
export const GenderFemaleIcon = phosphor('M208,96a80,80,0,1,0-88,79.6V200H88a8,8,0,0,0,0,16h32v24a8,8,0,0,0,16,0V216h32a8,8,0,0,0,0-16H136V175.6A80.11,80.11,0,0,0,208,96ZM64,96a64,64,0,1,1,64,64A64.07,64.07,0,0,1,64,96Z', 'GenderFemaleIcon');

// Gender: male.
export const GenderMaleIcon = phosphor('M216,32H168a8,8,0,0,0,0,16h28.69L154.62,90.07a80,80,0,1,0,11.31,11.31L208,59.32V88a8,8,0,0,0,16,0V40A8,8,0,0,0,216,32ZM149.24,197.29a64,64,0,1,1,0-90.53A64.1,64.1,0,0,1,149.24,197.29Z', 'GenderMaleIcon');

// Gender: transgender.
export const GenderTransIcon = phosphor('M216,32H168a8,8,0,0,0,0,16h28.69L168,76.69,149.66,58.35a8,8,0,1,0-11.32,11.31L156.69,88l-15.76,15.76a71.94,71.94,0,1,0,11.32,11.31L168,99.33l18.34,18.34a8,8,0,0,0,11.32-11.31L179.31,88,208,59.32V88a8,8,0,0,0,16,0V40A8,8,0,0,0,216,32ZM135.6,199.63A56,56,0,1,1,152,160,56.08,56.08,0,0,1,135.6,199.63Z', 'GenderTransIcon');

// Locked (members-only) profile photos (was 🔒).
export const LockIcon = phosphor('M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z', 'LockIcon');

// Location / city (was 📍).
export const LocationIcon = phosphor('M237.33,106.21,61.41,41l-.16-.05A16,16,0,0,0,40.9,61.25a1,1,0,0,0,.05.16l65.26,175.92A15.77,15.77,0,0,0,121.28,248h.3a15.77,15.77,0,0,0,15-11.29l.06-.2,21.84-78,78-21.84.2-.06a16,16,0,0,0,.62-30.38ZM149.84,144.3a8,8,0,0,0-5.54,5.54L121.3,232l-.06-.17L56,56l175.82,65.22.16.06Z', 'LocationIcon');

// Weight (was ⚖️).
export const WeightIcon = phosphor('M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z', 'WeightIcon');

// Education (was 🎓).
export const EducationIcon = phosphor('M251.76,88.94l-120-64a8,8,0,0,0-7.52,0l-120,64a8,8,0,0,0,0,14.12L32,117.87v48.42a15.91,15.91,0,0,0,4.06,10.65C49.16,191.53,78.51,216,128,216a130,130,0,0,0,48-8.76V240a8,8,0,0,0,16,0V199.51a115.63,115.63,0,0,0,27.94-22.57A15.91,15.91,0,0,0,224,166.29V117.87l27.76-14.81a8,8,0,0,0,0-14.12ZM128,200c-43.27,0-68.72-21.14-80-33.71V126.4l76.24,40.66a8,8,0,0,0,7.52,0L176,143.47v46.34C163.4,195.69,147.52,200,128,200Zm80-33.75a97.83,97.83,0,0,1-16,14.25V134.93l16-8.53ZM188,118.94l-.22-.13-56-29.87a8,8,0,0,0-7.52,14.12L171,128l-43,22.93L25,96,128,41.07,231,96Z', 'EducationIcon');

// Looking For / interested in.
export const HeartIcon = phosphor('M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z', 'HeartIcon');

// Block user (was 🚫).
export const ProhibitIcon = phosphor('M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.56,87.56,0,0,1-20.41,56.28L71.72,60.4A88,88,0,0,1,216,128ZM40,128A87.56,87.56,0,0,1,60.41,71.72L184.28,195.6A88,88,0,0,1,40,128Z', 'ProhibitIcon');

// Enlarge photo (tap-target on touch screens; see lib/zoomCursor.js for the
// matching mouse cursor).
export const MagnifyingGlassPlusIcon = phosphor(MAGNIFY_PLUS_PATH, 'MagnifyingGlassPlusIcon');


// Close / dismiss / Pass (was ✕), everywhere on mobile and desktop.
export const XIcon = phosphor('M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z', 'XIcon');

// Free-photo counter on profile carousels (was 🔓).
export const LockOpenIcon = phosphor('M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z', 'LockOpenIcon');

// "No notifications" empty state (was 🔕).
export const BellSlashIcon = phosphor('M53.92,34.62A8,8,0,1,0,42.08,45.38L58.82,63.8A79.59,79.59,0,0,0,48,104c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.8a40,40,0,0,0,78.4,0h15.44l19.44,21.38a8,8,0,1,0,11.84-10.76ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a63.65,63.65,0,0,1,6.26-27.62L168.09,184Zm166-4.73a8.13,8.13,0,0,1-2.93.55,8,8,0,0,1-7.44-5.08C196.35,156.19,192,129.75,192,104A64,64,0,0,0,96.43,48.31a8,8,0,0,1-7.9-13.91A80,80,0,0,1,208,104c0,35.35,8.05,58.59,10.52,64.88A8,8,0,0,1,214,179.25Z', 'BellSlashIcon');

// Founder Member badge (was 🌟) - SK's pick.
export const ShieldStarIcon = phosphor('M80.57,117A8,8,0,0,1,91,112.57l29,11.61V96a8,8,0,0,1,16,0v28.18l29-11.61A8,8,0,1,1,171,127.43l-30.31,12.12L158.4,163.2a8,8,0,1,1-12.8,9.6L128,149.33,110.4,172.8a8,8,0,1,1-12.8-9.6l17.74-23.65L85,127.43A8,8,0,0,1,80.57,117ZM224,56v56c0,52.72-25.52,84.67-46.93,102.19-23.06,18.86-46,25.27-47,25.53a8,8,0,0,1-4.2,0c-1-.26-23.91-6.67-47-25.53C57.52,196.67,32,164.72,32,112V56A16,16,0,0,1,48,40H208A16,16,0,0,1,224,56Zm-16,0L48,56l0,56c0,37.3,13.82,67.51,41.07,89.81A128.25,128.25,0,0,0,128,223.62a129.3,129.3,0,0,0,39.41-22.2C194.34,179.16,208,149.07,208,112Z', 'ShieldStarIcon');

// Copy-to-clipboard buttons (was 📋).
export const CopyIcon = phosphor('M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z', 'CopyIcon');

// "Copied!" confirmation.
export const CheckIcon = phosphor('M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z', 'CheckIcon');

// Height (was 📏). Supplied as a tall 427x800 Inkscape drawing, so the
// viewBox is widened to a centred 800x800 square - it then lines up in the
// same square slot as every other icon instead of rendering narrow.
export function HeightIcon({ size = 16, color = 'currentColor', style, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="-186.338 0 800 800" fill={color} aria-hidden="true" style={{ flexShrink: 0, ...style }} {...rest}>
      <g transform="translate(-325,174.03197)">
        <path d="m 399.28168,-174.03197 0,25.52746 -10.94632,0 0,1.12814 c -1.91484,8.55374 -6.87265,19.88209 -24.64974,26.11247 0,0 -0.0726,-4.3e-4 -0.0812,0 -3.58994,0.0427 -6.47523,2.95879 -6.47523,6.55942 0,3.62883 2.93016,6.55942 6.55899,6.55942 l 24.64974,0 0,17.129696 10.94633,0 0,652.684424 -74.28425,0 0,64.29897 427.32372,0 0,-64.29897 -117.81871,0 a 30.084471,30.084471 0 0 0 15.41656,-26.69748 l 0,-434.1344 15.75116,0 0,181.53352 a 23.399032,23.399032 0 1 0 46.79322,0 l 0,-186.379376 0,-30.457498 c 0,-28.0397 -22.5973,-50.637433 -50.637,-50.637433 l -162.35609,0 c -28.04013,0 -50.59556,22.597733 -50.59556,50.637433 l 0,28.828113 a 23.399032,23.399032 0 0 0 0,1.629385 l 0,4.845856 0,181.53352 a 23.399032,23.399032 0 1 0 46.79323,0 l 0,-181.53352 15.79303,0 0,434.1344 a 30.084471,30.084471 0 0 0 15.45844,26.69748 l -86.06642,0 0,-652.684424 10.94632,0 0,-17.129696 125.46438,0 c -29.00502,1.75416 -51.9741,25.784284 -51.9741,55.23287 0,30.589969 24.76854,55.3999567 55.35808,55.3999567 30.59082,0 55.40038,-24.8099877 55.40038,-55.3999567 0,-29.448586 -22.96651,-53.47871 -51.97452,-55.23287 l 63.58918,0 c 3.62926,0 6.55942,-2.93059 6.55942,-6.55942 0,-3.62883 -2.93016,-6.55942 -6.55942,-6.55942 l -24.39933,0 c -51.00279,-1.54307 -99.15705,-1.19565 -136.4107,-7.14443 -15.08752,-2.40925 -27.29787,-13.08978 -35.05337,-19.51117 l 0,-0.58501 -10.94632,0 0,-25.52746 -41.57133,0 z m 172.34222,456.31934 18.13177,0 0,252.68421 a 30.084471,30.084471 0 0 0 15.45844,26.69748 l -49.00719,0 a 30.084471,30.084471 0 0 0 15.41698,-26.69748 l 0,-252.68421 z" />
      </g>
    </svg>
  );
}

// Re-crop a profile photo (was ✂).
export const CropIcon = phosphor('M240,192a8,8,0,0,1-8,8H200v32a8,8,0,0,1-16,0V200H64a8,8,0,0,1-8-8V72H24a8,8,0,0,1,0-16H56V24a8,8,0,0,1,16,0V184H232A8,8,0,0,1,240,192ZM96,72h88v88a8,8,0,0,0,16,0V64a8,8,0,0,0-8-8H96a8,8,0,0,0,0,16Z', 'CropIcon');

// Prize draw / gift (was 🎁).
export const GiftIcon = phosphor('M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z', 'GiftIcon');

// Add a photo (was the "+" in ProfileSetup's upload slot).
export const ImageIcon = phosphor('M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z', 'ImageIcon');

// "Upload photos" hint (was 📸) - picked from the Phosphor set.
export const CameraPhIcon = phosphor('M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z', 'CameraPhIcon');

// Gender -> icon, via the shared male/female/transgender classification in
// lib/profileFields.js. Renders nothing for 'other' (Non-binary, Gay,
// Bisexual, Other...) and blank values - callers decide their own fallback.
export function GenderIcon({ gender, ...rest }) {
  const kind = genderKind(gender);
  if (kind === 'male') return <GenderMaleIcon {...rest} />;
  if (kind === 'female') return <GenderFemaleIcon {...rest} />;
  if (kind === 'transgender') return <GenderTransIcon {...rest} />;
  return null;
}

// Age (was 🎂). SK couldn't find a stock icon for this, so it's drawn here
// to match his reference (an info card with text lines, a person in front
// of its lower-right corner) in the same line weight as the Phosphor
// "regular" icons above: 256 grid, 16-unit round strokes. The mask cuts a
// gap in the card where the person overlaps it, like the reference.
export function AgeIcon({ size = 16, color = 'currentColor', style, ...rest }) {
  const maskId = `age-icon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }} {...rest}>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
        <rect x="0" y="0" width="256" height="256" fill="#fff" stroke="none" />
        <circle cx="192" cy="122" r="20" fill="#000" stroke="#000" strokeWidth="32" />
        <path d="M148,204a44,44,0,0,1,88,0Z" fill="#000" stroke="#000" strokeWidth="32" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <rect x="16" y="50" width="184" height="120" rx="4" />
        <g strokeWidth="12">
          <line x1="46" y1="84" x2="166" y2="84" />
          <line x1="46" y1="112" x2="150" y2="112" />
          <line x1="46" y1="140" x2="128" y2="140" />
        </g>
      </g>
      <circle cx="192" cy="122" r="20" />
      <path d="M148,204a44,44,0,0,1,88,0Z" />
    </svg>
  );
}

// Plain-text messages (toasts, whose wording lives in lib/I18.js as strings)
// that contain the lotus/rocket emoji: renders the text with those two emoji
// swapped for the app's LotusIcon/RocketIcon, so the translations don't need
// to change shape.
const INLINE_ICONS = { '🪷': LotusIcon, '🚀': RocketIcon };
export function IconText({ text, size = '1.15em' }) {
  if (typeof text !== 'string') return text ?? null;
  return text.split(/(🪷|🚀)/u).map((part, i) => {
    const Icon = INLINE_ICONS[part];
    return Icon ? <Icon key={i} size={size} style={{ verticalAlign: '-0.2em' }} /> : part;
  });
}
