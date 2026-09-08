/**
 * Visual language for the poker table, sampled from the design reference:
 * dark wood ground, deep green felt lit from the middle, mint-green accents.
 */

export const Felt = {
  centre: '#1A8055',
  mid: '#0E5C3D',
  edge: '#063825',
  rail: '#061D16',
  railHighlight: '#123529',
  woodTop: '#413A34',
  woodBottom: '#171513'
};

export const Palette = {
  accent: '#22D18A',
  accentDeep: '#12805A',
  text: '#FFFFFF',
  textDim: '#9BA7A2',
  pill: 'rgba(10,13,15,0.82)',
  pillBorder: 'rgba(255,255,255,0.10)',
  bar: '#26282B',
  barRaised: '#313438',
  dealer: '#D23A3A',
  allIn: '#1BA463',
  folded: '#39464F',
  raise: '#B8862B',
  seatEmpty: 'rgba(255,255,255,0.13)',
  danger: '#E05A4E'
};

// The seat ring doubles as the action clock, so it changes meaning by colour.
export const Ring = {
  idle: 'rgba(255,255,255,0.18)',
  acting: '#22D18A',
  warning: '#E8B33A',
  critical: '#E0503F',
  allIn: '#E8C93A',
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
