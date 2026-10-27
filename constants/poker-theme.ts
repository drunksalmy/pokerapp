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

// Portrait has width to spare across five community cards, so they are a
// little larger than the landscape sizes these started at. Your own two cards
// are the biggest thing on the table, as in the design: about 1.7x the board.
// Opponents' cards only ever show face-up at showdown, small, over the avatar.
export const CardSize = {
  community: { w: 44, h: 62 },
  hero: { w: 76, h: 106 },
  seat: { w: 30, h: 42 }
};

// The pill above each opponent's avatar. IN / OUT are the design's tags; ALL IN
// and AWAY cover the two states it doesn't show.
export const Status = {
  in: { bg: '#1b5e3b', fg: '#7ef0ad', label: 'IN' },
  out: { bg: '#b3262f', fg: '#ffe3e4', label: 'OUT' },
  allIn: { bg: '#7a5a12', fg: '#ffd86b', label: 'ALL IN' },
  away: { bg: '#3a3546', fg: 'rgba(255,255,255,0.72)', label: 'AWAY' }
} as const;

// Saturated two-tone discs behind each player's initials, standing in for the
// design's illustrated portraits. Picked per player from their id, so a player
// keeps the same colour all session.
export const AvatarGradients = [
  ['#ffb347', '#ef5a1f'],
  ['#7d8bff', '#3e4fe0'],
  ['#ff7a7a', '#d6304a'],
  ['#b28bff', '#6d3fe0'],
  ['#5ee0c6', '#1f9d8a'],
  ['#ff8fd0', '#c73f8e']
] as const;

// The action clock turns red for its final stretch, in milliseconds rather
// than as a fraction, so "hurry up" means the same thing whatever the timer.
export const CLOCK_CRITICAL_MS = 5000;
