# Poker App — Project Context

## What this is

A cross-platform mobile poker app (iPhone + Android) so I can play Texas Hold'em
online with my friends. Built solo. Windows PC, Command Prompt / PowerShell.

## Two planned modes

1. **Virtual chips** — no real-world value. This is what I'm building now.
2. **Real money** — chips equivalent to cash. **Deferred, not built.**

Real money is a separate later phase, not a feature toggle. Reason: operating a
real-money poker platform accessible in the Philippines requires a PAGCOR
license, and Apple/Google both require gambling apps to hold licenses per region,
geofence to those regions, and ship as free apps with external payment
processors. Needs a lawyer before it goes anywhere public. Build and ship the
virtual-chips product as a complete thing first.

## Stack

- **Frontend:** React Native via Expo, **SDK 57** (React Native 0.86.3,
  React 19.2.3, TypeScript 6).
  **Do not pin to an old SDK.** This file used to say "SDK 54, pinned, do not
  upgrade, Expo Go caps at SDK 54". That was true when written and became
  false without warning: Expo Go on the App Store always runs the *newest*
  SDK, and iOS cannot install an older Expo Go. When Expo Go moves ahead, the
  project must follow or it simply stops opening on a phone. Upgrade one SDK
  at a time: `npm install expo@^NN.0.0`, then `npx expo install --fix`, then
  `npx expo-doctor` and `npx expo export --platform web` to verify.
- **Expo Go now requires signing in.** Both the CLI (`npx expo login`) and the
  Expo Go app on the phone must be signed in to the same Expo account, or the
  project refuses to open.
- **Backend:** Node.js + Express + Socket.io (real-time, server-authoritative)
- **Database:** Supabase (Postgres) — project name `pokerapp`, Singapore region
- **Hand evaluation:** `pokersolver`
- **Version control:** Git + GitHub (`drunksalmy/pokerapp`)
- Prior experience: React, Express, Supabase (from a project called Kirmz Admin)

## Folder layout

```
pokerapp/          <- Expo app. Run `npx expo start` from HERE.
  server/          <- Node backend. Run all node/npm commands from HERE.
    deck.js
    evaluator.js
    game.js
```

Two separate projects, two working directories. Easy to trip over.

## Non-negotiable design rules

- **The server is the sole authority** on cards, turn order, and chip math.
  Never trust the client with any of it.
- **Only ever send `publicState()` over the network.** It masks other players'
  hole cards as `'XX'`. Sending raw game state to a phone = every player can
  read everyone's cards in the network tab.
- Shuffling uses `crypto.randomInt`, not `Math.random`. Math.random is
  predictable enough to reconstruct deck order from observed hands.

## What's DONE

**Phase 1 — Tooling.** Expo project created and confirmed running on a physical
phone via Expo Go QR code. Supabase project created (URL + publishable key +
secret key saved). Git repo initialized and pushed to GitHub.

**Phase 2 — Database.** Six tables live in Supabase:

- `profiles` — one row per user, extends Supabase auth
- `wallets` — chip balances. Two rows per user: `currency_type` of
  `'play_chips'` or `'real_money'`. This is the two-modes-one-engine design.
- `poker_tables` — a table/room, its currency type, blinds
- `table_seats` — who's sitting where, current stack
- `hands` — record of each hand, winner, pot size
- `transactions` — audit log of every chip movement

**Phase 3 — Poker engine.** `server/game.js` is complete and tested.
A pure state machine — no database, no sockets, no timers. Hand it a state
object and an action, it returns the updated state.

- `startHand(players, dealerIndex, smallBlind, bigBlind)`
- `legalActions(state)` → e.g. `['fold','call','raise']`
- `applyAction(state, userId, action, amount)` — auto-advances to next player,
  next street, or showdown
- `publicState(state, forUserId)` — the network-safe view

Handles: blinds, heads-up rules (dealer is SB, acts first preflop / last
postflop), big blind option, min-raise enforcement, all-ins, **side pots**,
split pots with odd-chip remainders, and dead money from folded overbettors.

`server/fuzz-game.js` is the fuzz harness and runs as part of `npm test`:
20,000 random hands per run, checking chip conservation, no deadlocks, no
negative stacks, no duplicate cards and no leaked hole cards after every
single action. Seeded, so a failure replays exactly. Re-run `npm test` after
any engine change -- the harness already caught one real deadlock that the
scripted scenarios missed.

## What's LEFT (in order)

> **This section is out of date. `CONTEXT.md` is the current status doc.**
> Phases 4 and 6 are built, committed and pushed. Phase 5 (auth + persistence)
> is the real next phase.

**Phase 4 — Socket.io layer.** *(DONE — `server/table.js`, `server/index.js`.)* The big one. Table rooms, seating, turn
broadcasting, per-player `publicState`, action timers so one AFK player doesn't
freeze the table, and reconnect handling (phones drop wifi constantly — a
mid-hand disconnect should auto-fold/auto-check, not hang).

**Phase 5 — Auth + persistence.** Supabase login; load and save chip stacks so
balances survive restarts. Right now `startHand` takes plain numbers with
nothing behind them.

**Phase 6 — Mobile UI.** Lobby screen, table screen (seats, cards, pot, stacks),
bet/call/fold controls.

**Phase 7 — Hosting.** The server currently runs on my PC, so friends can only
reach it on my wifi. For play-from-anywhere it needs deploying (Render or
Railway free tier is fine for a friend group).

**Phase 8 — Distribution.** Friends install Expo Go and scan a QR code. No app
store needed for a private group.

**Deferred — Real-money compliance track.** KYC, age verification, licensed
payment processor, geofencing, legal sign-off. Gated behind licensing.

## How I like to work

Give me extremely granular, literal instructions: the exact commands to type,
precise navigation steps, and a short explanation of why each step matters.
I confirm each step works before moving to the next — don't batch multiple
phases into one message. Assume I'll paste back terminal output or screenshots
and want the next single step from there.
