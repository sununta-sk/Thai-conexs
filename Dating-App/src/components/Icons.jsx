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

import { ChevronFirst, ChevronLast } from 'lucide-react';

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
