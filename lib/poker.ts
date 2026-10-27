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

/** 20845 -> "20,845". Plain numbers: these are play chips, not currency. */
export function formatChips(amount: number) {
  return Math.round(amount).toLocaleString('en-US');
}

/**
 * The table is a true circle, wider than the phone, so only its top arc shows
 * and it runs off the sides and past the bottom of the screen -- you are
 * sitting at it, not looking down on it.
 *
 * Everything is in pixels, measured inside the PLAY AREA: from just under the
 * pot down to the bottom of the screen. The action buttons float over the
 * bottom of it (`reservedBottom`), with no bar behind them, so the felt has to
 * reach every corner. x runs from the screen's left edge.
 */
export interface TableGeometry {
  width: number;
  height: number;
  /** The felt circle. Its top edge sits a seat's height below the play area. */
  centreX: number;
  centreY: number;
  radius: number;
  /** Opponents ride this ring, just outside the rail, concentric with the table. */
  ringRadius: number;
  /** Angle between neighbouring positions on the ring, in radians. */
  ringStep: number;
  /** Centre line of the community cards once you are seated. */
  boardY: number;
  /** Centre of your own two cards, half way between the board and the buttons. */
  heroY: number;
  /** Before you sit: the six seats sit on an oval that fits the screen. */
  ovalCentreY: number;
  ovalRadiusX: number;
  ovalRadiusY: number;
}

// Never narrower than this multiple of the screen width, so the circle always
// overhangs the sides even on a short phone.
const TABLE_MIN_WIDTHS = 1.3;
// Extra radius beyond the exact corner fit, so the rail never clips a corner.
const CORNER_MARGIN = 6;
// Opponents sit around the table, not on it: each avatar's centre is this far
// outside the rail, so the avatar straddles the table's edge -- mostly outside,
// overlapping the rail -- and the name and stack under it land on the felt.
const SEAT_OUTSET = 8;
// The circle starts this far below the play area, so the spotlight seat at the
// top of the ring -- status pill, avatar and all -- clears the pot above it.
const TOP_SEAT_ROOM = 68;
// The two flank seats land this fraction of the width either side of centre.
const FLANK_X = 0.33;
// The board sits this far below the spotlight seat, clear of its name, stack
// and bet.
const BOARD_BELOW_RING = 135;
// Half the board's height, including the dip of the fanned outer cards.
const BOARD_HALF = 40;
// Fallback oval insets: half a seat at the sides, a status pill above the top
// seat, and a name, stack and bet below the bottom one.
const OVAL_MARGIN_X = 58;
const OVAL_TOP = 62;
const OVAL_FOOT = 96;
const SIDE_SCALE = 0.8;

export function tableGeometry(
  width: number,
  height: number,
  reservedBottom: number
): TableGeometry {
  // Smallest circle, top edge at TOP_SEAT_ROOM, whose edge passes outside both
  // bottom corners of the screen: half the width across and b down from its
  // top, a corner is inside when r^2 >= (width/2)^2 + (b - r)^2.
  const b = height - TOP_SEAT_ROOM;
  const cornerRadius = ((width * width) / 4 + b * b) / (2 * b);
  const radius = Math.max((width * TABLE_MIN_WIDTHS) / 2, cornerRadius + CORNER_MARGIN);
  const centreY = TOP_SEAT_ROOM + radius;
  const ringRadius = radius + SEAT_OUTSET;
  // Solve for the angle that puts a flank seat at FLANK_X of the width. The
  // cap only matters on implausibly squat screens.
  const ringStep = Math.asin(Math.min(0.95, (FLANK_X * width) / ringRadius));
  const spotlightY = centreY - ringRadius;
  const boardY = spotlightY + BOARD_BELOW_RING;
  const actionsTop = height - reservedBottom;
  const ovalTop = OVAL_TOP;
  const ovalBottom = actionsTop - OVAL_FOOT;

  return {
    width,
    height,
    centreX: width / 2,
    centreY,
    radius,
    ringRadius,
    ringStep,
    boardY,
    heroY: (boardY + BOARD_HALF + actionsTop) / 2,
    ovalCentreY: (ovalTop + ovalBottom) / 2,
    ovalRadiusX: width / 2 - OVAL_MARGIN_X,
    ovalRadiusY: (ovalBottom - ovalTop) / 2
  };
}

/** Where the community cards sit. */
export function boardCentre(geo: TableGeometry, seated: boolean) {
  return { x: geo.width / 2, y: seated ? geo.boardY : geo.ovalCentreY };
}

export interface CarouselSlot {
  seatIndex: number;
  /** Signed distance from the spotlight: -1 left, 0 centre, +1 right. */
  slot: number;
  /** Avatar centre (your cards' centre for the hero), in play-area pixels. */
  x: number;
  y: number;
  scale: number;
  opacity: number;
  isHero: boolean;
}

/**
 * Portrait carousel layout. The viewer is pinned at the foot of the table and
 * never moves; the opponents sit around the table's edge on a ring concentric
 * with the felt, which turns so whoever is to act lands at the top in the
 * spotlight.
 *
 * Opponents are ordered starting from the seat on the viewer's left, so the
 * ring preserves real table order -- turning one step clockwise shows the
 * player who actually acts next.
 *
 * Seats more than one slot from the spotlight get opacity 0 rather than being
 * dropped, so they can be animated in and out instead of popping. They sit
 * further round the same ring, off the sides of the screen.
 */
export function carouselPositions(
  maxSeats: number,
  viewerSeat: number | null,
  focusSeat: number | null,
  geo: TableGeometry
): CarouselSlot[] {
  // Before you sit down there is no viewer to pin at the foot, and a carousel
  // would hide three of the six seats with no way to reach them. So the empty
  // table falls back to an oval that fits the screen: every seat visible and
  // clickable, seat 0 at the bottom.
  if (viewerSeat === null) {
    return Array.from({ length: maxSeats }, (_, seatIndex) => {
      const angle = Math.PI / 2 + (seatIndex * 2 * Math.PI) / maxSeats;
      return {
        seatIndex,
        slot: 0,
        x: geo.centreX + geo.ovalRadiusX * Math.cos(angle),
        y: geo.ovalCentreY + geo.ovalRadiusY * Math.sin(angle),
        scale: 0.82,
        opacity: 1,
        isHero: false
      };
    });
  }

  const slots: CarouselSlot[] = [];
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

    // Angle from the top of the ring. Capped at a quarter turn so a hidden
    // seat parks off the side of the screen rather than coming back round
    // underneath the board.
    const angle = Math.sign(slot) * Math.min(Math.abs(slot) * geo.ringStep, Math.PI / 2);
    const onScreen = Math.abs(slot) <= 1.0001;
    slots.push({
      seatIndex,
      slot,
      x: geo.centreX + geo.ringRadius * Math.sin(angle),
      y: geo.centreY - geo.ringRadius * Math.cos(angle),
      scale: slot === 0 ? 1 : SIDE_SCALE,
      opacity: onScreen ? (slot === 0 ? 1 : 0.9) : 0,
      isHero: false
    });
  });

  // You have no avatar in this design: your seat is your two cards, centred,
  // with the bank panel beside them.
  slots.push({
    seatIndex: viewerSeat,
    slot: 0,
    x: geo.centreX,
    y: geo.heroY,
    scale: 1,
    opacity: 1,
    isHero: true
  });

  return slots;
}
