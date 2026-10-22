# Poker App — Full Context

Written 2026-10-22, revised the same day. Supersedes `HANDOFF.md`, which has
been deleted -- this file is now the only handoff doc and it lives in the repo.
Self-contained: this plus `CLAUDE.md` (project rules) and `AGENTS.md` (Expo
docs rule) is everything a fresh session needs.

---

## 1. What this is

A cross-platform mobile Texas Hold'em app (iPhone + Android) so the owner can
play with friends. Built solo on Windows 11.

**Two modes, one engine:**

1. **Virtual chips** — no real-world value. **This is what is being built.**
2. **Real money** — **deferred, not built, not a feature toggle.**

Real money is gated behind a PAGCOR (Philippine Amusement and Gaming
Corporation) licence, plus Apple/Google per-region gambling rules (licence
required, geofencing, free app + external payment processor). Needs a lawyer
before anything public. **Ship the virtual-chips product as a complete thing
first.** The engine does not care whether a chip is worth anything, so this
decision is genuinely deferrable — nothing built now gets thrown away.

---

## 2. Current status

`CLAUDE.md` may still list Phase 4 and Phase 6 as remaining. Both are built,
committed and pushed. Actual state:

| Phase | Status |
|---|---|
| 1 — Tooling (Expo, Supabase project, Git) | **Done** |
| 2 — Database (6 tables live in Supabase) | **Done** (schema only; **no code touches it**) |
| 3 — Poker engine (`server/game.js`) | **Done**; fuzz harness now in the repo |
| 4 — Socket.io layer | **Done** — `server/table.js`, `server/index.js` |
| 6 — Mobile UI (table screen) | **Done** — built ahead of order from a design reference |
| **5 — Auth + persistence** | **NOT DONE — the real next phase** |
| 7 — Hosting (Render/Railway) | Not done |
| 8 — Distribution (Expo Go + QR) | Not done |
| UI redesign (section 12) | **Spec'd, not started** |
| Deferred — real-money compliance | Not started, intentionally |

Phase 6 was built before Phase 5 because the owner supplied a design reference
and asked for the UI. That is why persistence is the gap.

**The app has never run on a real phone.** See section 9.

---

## 3. Stack and exact versions

**Expo SDK 54 — PINNED. DO NOT UPGRADE.** The public Expo Go app on the App
Store / Play Store caps at SDK 54; a newer SDK simply will not open in it.

`AGENTS.md` requires reading the exact versioned docs at
<https://docs.expo.dev/versions/v54.0.0/> **before writing any Expo code.**

Client (`package.json`):

```
expo                     ~54.0.36
react-native             0.81.5
react                    19.1.0
expo-router              ~6.0.24
expo-linear-gradient     ~15.0.8
expo-screen-orientation  ~9.0.9
react-native-svg         15.12.1
socket.io-client         ^4.8.3
react-native-safe-area-context ~5.6.0
typescript               ~5.9.2
```

Server (`server/package.json`):

```
express      ^5.2.1
socket.io    ^4.8.3
pokersolver  ^2.1.4
cors         ^2.8.6
dotenv       ^17.4.2
socket.io-client ^4.8.3   (devDependency, for the integration test)
```

Node 20.19.x minimum (SDK 54 requirement).

---

## 4. Layout — two separate projects, two working directories

```
pokerapp/              <- Expo app. Run `npx expo start` from HERE.
  app/
    _layout.tsx        Root Stack, landscape, no header
    index.tsx          THE TABLE SCREEN (the whole game UI)
  components/poker/
    seat.tsx           Avatar, clock ring, badges, name/stack plate, hole cards
    playing-card.tsx   Card faces and backs
    chip-amount.tsx    SVG poker chip + number (bets and pot)
    table-felt.tsx     Rail + radial-gradient felt (SVG)
    action-bar.tsx     FOLD / CHECK-CALL / BET-RAISE + amount box
    bet-slider.tsx     Slider with steppers (PanResponder)
  constants/poker-theme.ts   Colours, card sizes, ring states
  hooks/use-poker-table.ts   Socket client + connection state
  lib/poker.ts               Snapshot TYPES + seat geometry maths

  server/              <- Node backend. Run all node/npm commands from HERE.
    deck.js            crypto.randomInt shuffle; cards as 'As' / 'Th'
    evaluator.js       Wraps pokersolver; findWinners returns an array (ties)
    game.js            PURE hand state machine. No db, no sockets, no timers.
    table.js           Seats, stacks, dealer button, action clock, auto-deal
    index.js           Socket.io + Express transport
    test.js            Evaluator sanity check
    test-game.js       9 hand scenarios
    fuzz-game.js       Randomised property test, seeded and replayable
    test-socket.js     33-assertion integration test (boots a real server)
```

**Leftover scaffold, now unreferenced** (safe to delete, left in place):
`components/hello-wave.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`,
`themed-view.tsx`, `external-link.tsx`, `haptic-tab.tsx`,
`ui/collapsible.tsx`, `ui/icon-symbol*.tsx`, `constants/theme.ts`,
`hooks/use-color-scheme*.ts`, `hooks/use-theme-color.ts`. They served the
deleted `create-expo-app` demo tabs. `themed-text` and `icon-symbol` may be
worth keeping for a future lobby screen.

---

## 5. Non-negotiable design rules

These are in `CLAUDE.md` and must not be relaxed:

1. **The server is the sole authority** on cards, turn order and chip maths.
   Never trust the client with any of it.
2. **Only ever send `publicState()` over the network.** It masks other
   players' hole cards as `'XX'`. Sending raw game state to a phone means
   every player can read everyone's cards in the network tab.
3. **Shuffling uses `crypto.randomInt`, not `Math.random`.** `Math.random` is
   predictable enough to reconstruct deck order from observed hands.

How rule 2 is enforced in code: `Table.stateFor(userId)` is built **from**
`publicState()`, never from raw hand state, and broadcasting loops per-socket
emitting a snapshot built for that specific viewer. **There is no code path
that emits one shared hand object to a room.** `test-socket.js` walks entire
payloads hunting for leaks and for a `deck` key.

---

## 6. How to run it

**Terminal 1 — backend** (must stay open):

```
cd C:\Users\josep\Documents\Projects\pokerapp\server
npm start
```

Expect: `poker server listening on :3001`

**Terminal 2 — Expo app:**

```
cd C:\Users\josep\Documents\Projects\pokerapp
npx expo start
```

Scan the QR with Expo Go. Phone and PC must be on the same wifi.
**Turn the phone sideways** — the app forces landscape.

**Tests:**

```
cd C:\Users\josep\Documents\Projects\pokerapp\server
npm test
```

Runs evaluator, hand scenarios, the fuzz harness, then socket integration.
Expect a fuzz line (`20000 hands ... chips conserved ...`) followed by
`33 passed, 0 failed`.

The fuzz harness also runs alone, with an optional hand count and seed:

```
node fuzz-game.js 500 123456
```

It prints its seed every run, and on failure prints the state at the point of
failure plus the exact command to replay it. A fuzz failure is reproducible,
not a ghost.

**Server env vars** (all optional, `.env` in `server/`, gitignored):
`PORT` (3001), `CORS_ORIGIN` (*), `SMALL_BLIND` (10), `BIG_BLIND` (20),
`MAX_SEATS` (6), `ACTION_TIMEOUT_MS` (30000), `HAND_BREAK_MS` (5000).

**Client server URL:** `EXPO_PUBLIC_SERVER_URL` overrides. Otherwise the
address is derived from Metro's `hostUri` — because on a phone, `localhost`
is the phone itself, not the dev PC.

---

## 7. The socket protocol

**Handshake:** `auth: { userId, name }`. See the auth warning in section 9.

**Client → server** (each takes an ack callback returning `{ ok: true }` or
`{ ok: false, error }`):

| Event | Payload |
|---|---|
| `table:join` | `{ tableId }` |
| `table:sit` | `{ seatIndex, buyIn }` |
| `table:leave` | — |
| `table:sitOut` | `{ sittingOut }` |
| `hand:action` | `{ action, amount }` |

**Server → client:** deliberately just **one** event, `table:state`, carrying a
complete personalized snapshot. One event means the client is a dumb
render-from-state component instead of a pile of incremental patch handlers.
Also `table:error` `{ message }`.

Snapshot shape (typed in `lib/poker.ts`):

```ts
{
  tableId, handNumber, maxSeats, smallBlind, bigBlind,
  dealerSeat, actionTimeoutMs,
  deadline,                       // epoch ms the acting player must act by
  you: { userId, seatIndex },
  seats: [ { seatIndex, userId, name, stack, connected, sittingOut, leaving } | null ],
  hand: {
    stage,                        // preflop|flop|turn|river|showdown|complete
    community, pot, currentBet,
    toAct,                        // userId or null
    legalActions,                 // [] unless it is YOUR turn
    winners,
    players: [ { userId, seatIndex, stack, betThisRound,
                 folded, allIn, holeCards } ],   // holeCards 'XX' if not yours
    raiseBounds: { min, max } | null              // only for the acting viewer
  } | null
}
```

---

## 8. Key decisions and non-obvious implementation details

**The under-raise rule.** An all-in smaller than a full raise increment raises
the amount everyone must match, but does **not** reopen the betting: players
who already acted may only call or fold, and `minRaise` is unchanged. Tracked
per-player with a `mayRaise` flag, reset each betting round and restored by any
full raise. This exists because otherwise two colluding players could use a
short stack's token shove to hand an ally a fresh chance to re-raise.
Scenarios 8 and 9 in `test-game.js` cover both directions.

*Open question:* after an under-raise all-in, the next minimum raise is
computed as `currentBet + minRaise` (i.e. off the all-in amount). The
alternative convention computes it off the last *full* bet. The current
behaviour matches most online rooms. Not settled with the owner.

**Heads-up postflop order is correct — do not "fix" it.** `game.js` computes
the first postflop actor as `(dealerIndex + 1) % n`. This previously appeared
as a dead ternary with two identical branches and looked like a copy-paste
bug. It is not. Heads-up, the dealer posts the small blind and acts **first
preflop but last postflop**, so the big blind — `dealerIndex + 1` — correctly
acts first postflop. For 3+ players the same expression gives the small blind,
also correct. The ternary has since been collapsed to the single expression.
If a future session "fixes" this to `dealerIndex`, heads-up action order
breaks in a way that is hard to notice.

**Broadcasting is synchronous on purpose.** The idiomatic
`await io.in(room).fetchSockets()` was tried and is **wrong here**: the await
is long enough for the table to advance, so the snapshot gets built from a
*later* state than the one that triggered it, and short-lived states (the gap
between hands) vanish entirely. Replaced with a plain `Map` registry of
sockets per table. This looks correct in the async form and fails only under
timing — do not "simplify" it back.

**`game.js` is pure and fuzz-tested — treat it as load-bearing.** No database,
no sockets, no timers. `fuzz-game.js` plays 20,000 random hands per run and
checks, after every single action: chips conserved, no negative stacks, no
player left with zero chips but not marked all-in, no deadlock, no duplicate
cards dealt, and no hole card leaked through `publicState()`. It is wired into
`npm test`, so the property is re-verified on every change rather than being a
claim in a document.

**The all-in-from-blinds deadlock (found by the fuzz harness, fixed).** If
posting blinds put *every* remaining player all-in before anyone could act --
heads-up with both stacks at or below their blind -- `startHand` returned a
state with `actingIndex === null` that nobody could ever act on. The hand sat
forever: the action clock had no one to time out, and `applyAction` would
throw `No player is due to act`. It arose in roughly 0.4% of deals once stacks
below one big blind were allowed. `startHand` now calls `advance(state)` when
nobody can act, which runs the board out to showdown. `table.js:148` already
had `if (state.stage === 'complete') this.finishHand();` immediately after
`startHand` -- a branch that could never fire until this fix, which suggests
this was the intended behaviour all along. `table.js` exists specifically so that scheduling,
seats and I/O stay out of it. **Resist adding incidental features to it** —
see the `lastAction` note in section 12.7 for the pattern to follow instead.

**Seat geometry.** Seats are laid out on an ellipse (`seatPositions()` in
`lib/poker.ts`) and **rotated by the viewer's own seat so you always sit at the
bottom**, as every poker client does. A seat widget's visual anchor is the
avatar centre, not the middle of its box — hence `SEAT_ANCHOR_Y`.

**Layout is vertically tight and was got wrong twice.** A landscape phone has
far less height than a marketing render suggests. The table is sized from
`height − HEADER_SPACE − ACTION_BAR_SPACE − SEAT_BELOW_ANCHOR` so the
bottom seat's name plate clears the action bar. The header and action bar
**overlay** the felt rather than taking layout space; otherwise the table
collapses. Name and stack share one compact plate because a separate name line
makes top and bottom seats too tall. If you change avatar or card sizes,
re-check the top-centre and bottom-centre seats first — they are where it
breaks.

**The UI cannot offer an illegal move.** The action bar renders purely from
`hand.legalActions`, and the slider from `raiseBounds`. Betting rules are not
reimplemented client-side. This is what makes the under-raise restriction show
up in the UI for free.

**Radial gradients need SVG.** `expo-linear-gradient` is linear only; the felt
uses `react-native-svg`'s `RadialGradient`.

---

## 9. What is NOT done — the honest gaps

**Never run on a real phone.** The UI was only ever verified in a desktop
browser at phone dimensions via `npx expo start --web`. Landscape on a real
device — notches, safe areas, home indicator — is exactly where this kind of
layout breaks. **Treat "the UI works" as unconfirmed, and verify it before
building anything on top of it.**

**Identity is asserted, not authenticated.** The client sends its own `userId`
in the handshake and the server believes it. Anyone can claim to be anyone.
Flagged in a comment at `server/index.js`. Fine for chips among friends;
unacceptable before real money (KYC). **This is Phase 5.**

**Nothing is persisted.** All table state is in memory. A server restart wipes
seats, stacks, everything. **Supabase is NOT wired into the code at all** —
the six tables exist in the project but no client, no queries, no imports. The
client also invents a throwaway user id per launch, so chips vanish on reload.
**This is Phase 5 and it is the most user-visible gap.**

> **Persistence must land before hosting.** Free-tier hosting (Render,
> Railway) spins the server down after ~15 minutes of inactivity. With all
> state in memory that is not merely a restart risk — everyone's stack is
> wiped if the table goes quiet mid-session. In-memory state and free-tier
> hosting are actively incompatible.

**No lobby.** `app/index.tsx` hard-codes `tableId: 'main'` and `name: 'You'`.
Buy-in is fixed at 100 big blinds.

**Server runs on the dev PC only.** Friends can reach it on the same wifi
only. Phase 7.

**UI gaps** — superseded by the redesign in section 12, but for reference:
no photo avatars, no per-action seat badges, flat gradient background, no
chat, 6-max rather than 9.

---

## 10. Git state

Branch `main`, synced with `origin/main` (`drunksalmy/pokerapp`).

```
8b21a92  Add .gitattributes to normalize line endings to LF
1dcd968  Add project context          <- CLAUDE.md
ac22420  Add poker table UI for the Expo client
be677ae  Add poker server: hand engine and Socket.io layer
fc311f9  Initial commit
```

`d14d2f8` collapsed the heads-up ternary described in section 8. Its commit
body carries the reasoning, so `git blame` explains the line to whoever reads
it next.

**Line endings.** `.gitattributes` holds `* text=auto eol=lf`. Before it, the
working copy was CRLF while the repo was LF, so `git status` reported all 26
tracked files as modified at all times and any real change was invisible
inside the noise. Nothing on disk changed -- git simply converts on the way
in now. Expect `warning: CRLF will be replaced by LF` when git touches a
file; that is the rule working, not a problem.

A branch `phase-4-server-socket-layer` points at the same commit as `main`
and is now redundant — `git branch -d phase-4-server-socket-layer`.

`.env` is gitignored (added when `dotenv` was introduced, so Supabase keys
never get committed).

---

## 11. How the owner wants to work

From `CLAUDE.md`, and it matters:

> Give me extremely granular, literal instructions: the exact commands to
> type, precise navigation steps, and a short explanation of why each step
> matters. I confirm each step works before moving to the next — **don't batch
> multiple phases into one message.** Assume I'll paste back terminal output
> or screenshots and want the next single step from there.

Windows 11, Command Prompt / PowerShell. Prior experience: React, Express,
Supabase (from a project called Kirmz Admin). Solo developer.

**Work one numbered section at a time.** Do not take the whole of section 12
in a single pass.

---

## 12. UI REDESIGN SPEC — dark/violet table

Adapt the table UI to a dark violet visual direction, replacing the green
felt. Reference image supplied by the owner (a dark table with a violet-lit
pot, large circular avatars with status badges, white cards with dashed empty
slots, and flat text action buttons).

Source of truth for data shapes stays `lib/poker.ts`. **No betting logic moves
to the client** — the action bar still renders purely from `hand.legalActions`
and `hand.raiseBounds`.

### 12.0 Constraints that override the reference

The reference is a 3-handed **desktop** layout. Three things do not port:

1. **Seat count.** The table is 6-max. Avatars at reference scale do not fit
   six-up on a landscape phone. Seat chrome must scale — see 12.3.
2. **Hero hole cards.** The reference centres them, large and fanned, right
   where the community row and bottom seat live on a phone. They go
   bottom-right instead — see 12.5.
3. **Logo and avatars.** Use the project's own mark and the existing
   initials-based avatars. Do not reproduce the reference's wordmark or
   character illustrations — those are someone else's work, unlike the
   general layout and colour language.

The layout budget in section 8 still holds and is still the thing most likely
to break. Header and action bar **overlay** the felt. Do not change that.

### 12.1 Palette

Replace the colour tokens in `constants/poker-theme.ts`. **Map these onto the
existing export names** rather than renaming — other components import them.

```ts
// Surfaces
bgDeep:        '#0e0c16'   // outside the table
tableEdge:     '#16131f'   // rail
tableFelt:     '#1b1726'   // table surface (base of the radial gradient)
tableFeltLift: '#2a2338'   // lighter arc, upper third of the felt
panel:         '#221d30'   // seat plates, badges, bank panel
panelBorder:   'rgba(255,255,255,0.07)'

// Accent
violet:        '#7f5af0'   // primary accent, pot glow, chip fill
violetSoft:    'rgba(127,90,240,0.28)'  // glow falloff
gold:          '#f5c84c'   // balance coin, your-turn ring

// Text
textPrimary:   '#ffffff'
textSecondary: 'rgba(255,255,255,0.56)'
textMuted:     'rgba(255,255,255,0.32)'

// Cards
cardFace:      '#ffffff'
cardInk:       '#15131f'   // spades/clubs
cardRed:       '#e5342f'   // hearts/diamonds
cardBack:      '#2a2338'   // + violet pattern
cardSlot:      'rgba(255,255,255,0.10)'  // dashed empty community slot

// Action states
fold:          '#ff4d4f'
raise:         '#22c55e'
check:         'rgba(255,255,255,0.80)'

// Ring states (clock ring around the acting player's avatar)
ringIdle:      'rgba(255,255,255,0.14)'
ringActive:    '#7f5af0'
ringUrgent:    '#ff4d4f'   // final 5 seconds
```

The felt is a **radial gradient**, lighter at the top, falling off to
`tableFelt` at the edges — `react-native-svg`'s `RadialGradient`, as now.

### 12.2 Header and chrome

- **Top-left:** project mark + table name.
- **Top-centre:** small `Pot` label in `textSecondary`, with the pot number
  directly beneath it in a large, light weight (~40px). This is the single
  biggest visual anchor on the table.
- **Behind the pot number:** a soft `violetSoft` radial glow fading downward.
  This is what makes the table read as "lit from the pot" — it matters more
  than it sounds.
- **Top-right:** the viewer's stack with a small gold coin glyph.
- **Bottom-left:** `Help` and `Log` as low-contrast text buttons
  (`textMuted`). Chrome, not controls — keep them visually quiet.

Header stays absolutely positioned over the felt.

### 12.3 Seats — scaling chrome

Seat geometry (`seatPositions()` in `lib/poker.ts`) stays as-is. The ellipse
and viewer-rotation are correct. Only the widget changes.

Pick the variant from the number of **occupied** seats:

**Roomy (≤4 occupied)** — close to the reference:
- Avatar 64px circle, 3px ring
- Status badge pill floating above-left of the avatar
- Name on its own line, stack beneath it with a chip glyph

**Compact (5–6 occupied)** — the phone-safe fallback:
- Avatar 44px circle, 2px ring
- Status badge shrinks to a dot on the ring, colour-coded, no text
- Name and stack share **one** plate line: `Name · 1,240`

The single-plate rule exists because separate name and stack lines make the
top-centre and bottom-centre seats too tall and they collide with the
community row and action bar respectively. That is the failure mode to watch.

**Ring states**, drawn as an SVG arc around the avatar:
- Not acting: `ringIdle`, full circle
- Acting: `ringActive`, sweeping down from full to empty over
  `actionTimeoutMs`, driven by `deadline`
- Final 5s: `ringUrgent`
- Folded: avatar drops to 45% opacity, ring hidden

**Badges** (data comes from 12.7):
`CALLED` / `RAISED` / `CHECKED` in `panel` with `textPrimary`;
`FOLDED` in `panel` with `fold` text; `ALL IN` in `violet` with white text.

Hole cards for opponents: two small backs tucked behind the avatar's
bottom-right, rotated a few degrees apart. At showdown they flip to faces.

### 12.4 Community cards

- White rounded cards, rank top-left at ~22px, suit glyph beneath it, large
  suit watermark bottom-right at low opacity.
- **Undealt slots render as dashed `cardSlot` outlines**, not blanks. The
  reference does this and it reads much better — the row keeps its shape from
  preflop onward instead of popping into existence at the flop.
- Deal animation: each card slides up ~8px and fades in, 120ms, staggered 60ms.

### 12.5 Hero hole cards and bank panel

**Not centred.** Bottom-right, above the action bar:

- Two cards at ~1.4× community card size, overlapping, second rotated ~8°.
- To their right: the bank panel — dealer `B` chip if you have the button,
  your current bet as a chip amount, and your stack large beneath it.

This is the main deliberate deviation from the reference: centring them
collides with the bottom-centre seat plate and the community row on a
landscape phone.

### 12.6 Action bar

Still renders **purely** from `hand.legalActions` and `raiseBounds`. No
client-side betting rules.

- Three text buttons, centre-bottom: `Fold` (fold colour), `Raise`/`Bet`
  (raise colour), `Check`/`Call` (check colour), each with a small glyph.
- Flat on the felt — no button chrome, no filled pills. The reference's
  restraint here is what keeps the table from looking like a slot machine.
- Disabled actions are hidden entirely, not greyed. The server already says
  what is legal; showing an action you cannot take is noise.
- **Your-turn pill**, bottom-right: `Your Turn!` with a `gold` 1.5px border
  and the countdown in `textSecondary` beside it. Appears only when
  `hand.toAct === you.userId`.
- Bet slider keeps its current PanResponder implementation, restyled to
  `violet` track and gold thumb. Steppers stay.

### 12.7 Server change — `lastAction`

The badges need each player's most recent action, which `publicState()` does
not report.

**Do not add this to `game.js`.** That file is pure and fuzz-tested over
20,000 hands and is the one thing in the project that must not acquire
incidental features.

Add it in `table.js` instead, which already sees every action before passing
it down:

1. Keep a `Map<userId, Action>` on the table, cleared when a hand starts.
2. On a successful `hand:action`, record it.
3. Clear it at the start of each new betting street — a badge reading
   `CALLED` from two streets ago is worse than no badge.
4. In `stateFor()`, merge `lastAction` onto each entry of `hand.players`
   **after** `publicState()` has produced the masked view. Never before —
   the masking is the security boundary.
5. Add `lastAction?: Action | null` to `HandPlayerView` in `lib/poker.ts`.

Then extend `test-socket.js`: assert `lastAction` appears, and that the
existing leak-hunt assertions still pass on the enriched payload.

### 12.8 Order of work

1. Palette (12.1) — touches one file, everything else inherits it.
2. Felt gradient + pot glow (12.1, 12.2).
3. Community cards including dashed slots (12.4).
4. Seats, roomy variant first, then compact (12.3).
5. Hero cards + bank panel (12.5).
6. Action bar + your-turn pill (12.6).
7. `lastAction` and badges (12.7) — last, because it is the only step that
   touches the server.

**After step 4 and again after step 5, check the top-centre and bottom-centre
seats on a real phone in landscape.** Those two positions are where this
layout has broken before, and a desktop browser at phone dimensions will not
reproduce it — safe areas and the home indicator are the difference.

---

## 13. Recommended order from here

1. **Run it on a real phone.** Unverified, and everything else sits on top of
   it. Both terminals from section 6, Expo Go, phone sideways. Confirm:
   connects, can sit, gets dealt in, bottom-centre seat plate clears the
   action bar, top-centre seat clears the community row.
2. **UI redesign**, section 12, one numbered sub-section at a time.
3. **Phase 5 — auth + persistence.** Supabase login; load and save stacks.
   Removes both the throwaway-user-id problem and the wiped-on-restart
   problem, and is the prerequisite for hosting being usable at all.
4. **Phase 7 — hosting.** Render or Railway free tier, only after 3.
5. **Phase 8 — distribution.** Friends install Expo Go, scan a QR. No app
   store needed for a private group.

Steps 2 and 3 are independent; 3 is what makes the app actually playable
across sessions, 2 is what makes it feel finished.
