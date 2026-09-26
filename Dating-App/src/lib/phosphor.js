// src/lib/phosphor.js
// Builds a React icon component from Phosphor "regular" path data (MIT,
// phosphoricons.com - the same icon family SK downloads from). Every icon is
// fill-based on a 256 viewBox and defaults to currentColor, so it picks up
// the text colour of whatever badge/button it sits in; pass `color` to
// override and `size` (px or any CSS length, e.g. "1.1em") to scale.
import { createElement } from 'react';

export function phosphorIcon(d, displayName) {
  function Icon({ size = 16, color = 'currentColor', style, ...rest }) {
    return createElement(
      'svg',
      { width: size, height: size, viewBox: '0 0 256 256', fill: color, 'aria-hidden': 'true', style: { flexShrink: 0, ...style }, ...rest },
      createElement('path', { d }),
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
