/**
 * The shape of what the server sends. Mirrors Table.stateFor() in server/table.js.
 * Hole cards belonging to other players arrive masked as 'XX'.
 */

export type Card = string; // 'As', 'Th', or 'XX' when hidden

export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export type Stage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';

export interface SeatView {
  seatIndex: number;
  userId: string;
  name: string;
  stack: number;
  connected: boolean;
  sittingOut: boolean;
  leaving: boolean;
}

export interface HandPlayerView {
  userId: string;
  seatIndex: number;
  stack: number;
  betThisRound: number;
  folded: boolean;
  allIn: boolean;
  holeCards: Card[];
}

export interface WinnerView {
  userId: string;
  amount: number;
  description?: string;
}

export interface HandView {
  stage: Stage;
  community: Card[];
  pot: number;
  currentBet: number;
  toAct: string | null;
  legalActions: Action[];
  winners: WinnerView[] | null;
  players: HandPlayerView[];
  raiseBounds: { min: number; max: number } | null;
}

export interface TableSnapshot {
  tableId: string;
  handNumber: number;
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  dealerSeat: number | null;
  actionTimeoutMs: number;
  deadline: number | null;
  you: { userId: string; seatIndex: number | null };
  seats: (SeatView | null)[];
  hand: HandView | null;
}

const RANK_LABEL: Record<string, string> = { T: '10' };
const SUITS = {
  s: { symbol: '♠', red: false },
  h: { symbol: '♥', red: true },
  d: { symbol: '♦', red: true },
  c: { symbol: '♣', red: false }
} as const;

export function isHidden(card: Card) {
  return !card || card === 'XX';
}

export function readCard(card: Card) {
  if (isHidden(card)) return null;
  const rank = card[0];
  const suit = SUITS[card[1] as keyof typeof SUITS];
  if (!suit) return null;
  return { rank: RANK_LABEL[rank] ?? rank, symbol: suit.symbol, red: suit.red };
}

/** 20845 -> "20,845". The reference uses separators on every stack. */
export function formatChips(amount: number) {
  return Math.round(amount).toLocaleString('en-US');
}

/**
 * Seat positions on an ellipse, as fractions of the felt box.
 *
 * The viewer is always drawn at the bottom of the table regardless of which
 * seat they actually occupy, which is what every poker client does — so seats
 * are rotated by the viewer's own seat before being placed.
 */
export function seatPositions(maxSeats: number, viewerSeat: number | null) {
  const positions: { x: number; y: number; angle: number }[] = [];
  for (let seat = 0; seat < maxSeats; seat++) {
    const rotated = viewerSeat === null ? seat : (seat - viewerSeat + maxSeats) % maxSeats;
    // Screen coords: y grows downward, so 90deg is the bottom of the table.
    const angle = (Math.PI / 2) + (rotated * 2 * Math.PI) / maxSeats;
    // Fractions of the felt box, so this works for any table shape -- the
    // ellipse follows whatever aspect the box has. Slightly inside the rim
    // vertically so seats sit on the rail rather than floating off the ends.
    positions[seat] = {
      x: 0.5 + 0.48 * Math.cos(angle),
      y: 0.5 + 0.46 * Math.sin(angle),
      angle
    };
  }
  return positions;
}

export interface CarouselSlot {
  seatIndex: number;
  /** Signed distance from the spotlight: -1 left, 0 centre, +1 right. */
  slot: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  isHero: boolean;
}

// Where the three visible opponent slots sit, as fractions of the felt box.
const SLOT_SPREAD = 0.33;   // horizontal step between slots
const SLOT_TOP = 0.24;      // height of the centre (spotlight) slot
const SLOT_DROP = 0.085;    // how far the side slots fall away, as an arc
const SIDE_SCALE = 0.74;

/**
 * Portrait carousel layout. The viewer is pinned at the foot of the table and
 * never moves; the opponents ride a ring that turns so whoever is to act lands
 * in the centre slot.
 *
 * Opponents are ordered starting from the seat on the viewer's left, so the
 * ring preserves real table order -- turning one step clockwise shows the
 * player who actually acts next.
 *
 * Seats more than one slot from the spotlight get opacity 0 rather than being
 * dropped, so they can be animated in and out instead of popping.
 */
export function carouselPositions(
  maxSeats: number,
  viewerSeat: number | null,
  focusSeat: number | null
): CarouselSlot[] {
  const slots: CarouselSlot[] = [];

  // Before you sit down there is no viewer to pin at the foot, and a carousel
  // would hide three of the six seats with no way to reach them. So the empty
  // table falls back to the full oval: every seat visible and clickable.
  if (viewerSeat === null) {
    return seatPositions(maxSeats, null).map((pos, seatIndex) => ({
      seatIndex,
      slot: 0,
      x: pos.x,
      y: pos.y,
      scale: 0.82,
      opacity: 1,
      isHero: false
    }));
  }

  const opponents: number[] = [];
  for (let step = 1; step < maxSeats; step++) opponents.push((viewerSeat + step) % maxSeats);

  const n = opponents.length;
  const focusIndex = focusSeat === null ? -1 : opponents.indexOf(focusSeat);
  const focus = focusIndex >= 0 ? focusIndex : 0;

  opponents.forEach((seatIndex, i) => {
    // Shortest signed way round the ring, so a seat leaves one edge and
    // returns at the other rather than sweeping all the way back.
    let slot = i - focus;
    if (slot > n / 2) slot -= n;
    if (slot < -n / 2) slot += n;

    const onScreen = Math.abs(slot) <= 1.0001;
    slots.push({
      seatIndex,
      slot,
      x: 0.5 + SLOT_SPREAD * slot,
      y: SLOT_TOP + SLOT_DROP * slot * slot,
      scale: slot === 0 ? 1 : SIDE_SCALE,
      opacity: onScreen ? (slot === 0 ? 1 : 0.88) : 0,
      isHero: false
    });
  });

  if (viewerSeat !== null) {
    slots.push({
      seatIndex: viewerSeat,
      slot: 0,
      x: 0.5,
      y: 0.94,
      scale: 1,
      opacity: 1,
      isHero: true
    });
  }

  return slots;
}

/** Where a player's chips sit: pulled off the seat toward the middle of the felt. */
export function betPosition(seat: { x: number; y: number }) {
  return {
    x: seat.x + (0.5 - seat.x) * 0.34,
    y: seat.y + (0.5 - seat.y) * 0.36
  };
}
