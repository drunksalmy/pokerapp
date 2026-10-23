/**
 * Visual language for the poker table: dark violet surfaces, a table lit from
 * the pot, white cards. Section 12.1 of CONTEXT.md is the source of truth for
 * these values.
 *
 * The spec's token names are mapped onto the EXISTING export names on purpose
 * -- every component already imports these, so renaming them would mean
 * touching every file instead of one. New names are only added where the old
 * palette had no equivalent.
 */

export const Felt = {
  centre: '#2a2338',        // tableFeltLift -- lighter arc, upper third
  mid: '#211c2e',
  edge: '#1b1726',          // tableFelt -- base of the radial gradient
  rail: '#16131f',          // tableEdge
  railHighlight: '#221d30',
  woodTop: '#14111d',
  woodBottom: '#0e0c16'     // bgDeep -- outside the table
};

export const Palette = {
  accent: '#7f5af0',        // violet -- primary accent
  accentDeep: '#5b3fc4',
  violetSoft: 'rgba(127,90,240,0.28)',   // pot glow falloff
  gold: '#f5c84c',          // balance coin, your-turn ring
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.56)',
  textMuted: 'rgba(255,255,255,0.32)',
  pill: '#221d30',          // panel -- seat plates, badges, bank panel
  pillBorder: 'rgba(255,255,255,0.07)',
  bar: '#14111d',
  barRaised: '#221d30',
  dealer: '#7f5af0',
  allIn: '#7f5af0',
  folded: '#ff4d4f',
  raise: '#22c55e',
  check: 'rgba(255,255,255,0.80)',
  seatEmpty: 'rgba(255,255,255,0.13)',
  danger: '#ff4d4f'
};

// Card faces are white in this direction, so they need their own inks.
export const Card = {
  face: '#ffffff',
  ink: '#15131f',           // spades and clubs
  red: '#e5342f',           // hearts and diamonds
  back: '#2a2338',
  slot: 'rgba(255,255,255,0.10)'   // dashed outline for an undealt card
};

// The seat ring doubles as the action clock, so it changes meaning by colour.
export const Ring = {
  idle: 'rgba(255,255,255,0.14)',
  acting: '#7f5af0',
  warning: '#f5c84c',
  critical: '#ff4d4f',
  allIn: '#f5c84c',
  folded: 'rgba(255,255,255,0.06)'
};

export const CardSize = {
  community: { w: 40, h: 56 },
  hero: { w: 48, h: 66 },
  seat: { w: 22, h: 30 }
};

export const Layout = {
  // Fraction of the felt box that the seat ellipse occupies.
  seatRadiusX: 0.46,
  seatRadiusY: 0.52,
  avatar: 54,
  actionBarHeight: 92
};
