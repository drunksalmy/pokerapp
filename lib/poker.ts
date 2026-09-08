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
    // Wider than tall, and slightly inside the rim vertically, so seats sit on
    // the rail rather than floating off the top and bottom of the table.
    positions[seat] = {
      x: 0.5 + 0.48 * Math.cos(angle),
      y: 0.5 + 0.46 * Math.sin(angle),
      angle
    };
  }
  return positions;
}

/** Where a player's chips sit: pulled off the seat toward the middle of the felt. */
export function betPosition(seat: { x: number; y: number }) {
  return {
    x: seat.x + (0.5 - seat.x) * 0.34,
    y: seat.y + (0.5 - seat.y) * 0.36
  };
}
