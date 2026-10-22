// Randomised property test for the pure hand engine in game.js.
//
// This is the harness behind the "20,000 random hands" claim in CONTEXT.md.
// It plays complete hands by picking uniformly at random from whatever
// legalActions() offers, and after every single action it checks a set of
// invariants that must hold no matter what sequence came before.
//
// NOTE ON RANDOMNESS: the PRNG below drives ACTION CHOICE ONLY. It never
// touches the deck. Shuffling stays on crypto.randomInt inside deck.js --
// see rule 3 in CLAUDE.md. Do not import this PRNG anywhere else.
//
// Usage:
//   node fuzz-game.js              20000 hands, random seed
//   node fuzz-game.js 500          500 hands, random seed
//   node fuzz-game.js 500 123456   500 hands, seed 123456 (reproduces a failure)

const { startHand, applyAction, legalActions, publicState } = require('./game');

const HANDS = Number(process.argv[2]) || 20000;
const SEED = Number(process.argv[3]) || (Date.now() >>> 0);
const MAX_STEPS_PER_HAND = 500;

// mulberry32 -- small, fast, and crucially reproducible from a seed, so a
// failing run can be replayed exactly instead of being a ghost.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(SEED);
const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = arr => arr[Math.floor(rng() * arr.length)];

function chipsInPlay(state) {
  return state.players.reduce((sum, p) => sum + p.stack + p.betThisRound, 0) + state.pot;
}

function fail(message, context) {
  const error = new Error(message);
  error.context = context;
  throw error;
}

function checkInvariants(state, total, label) {
  for (const p of state.players) {
    if (p.stack < 0) fail(`negative stack for ${p.userId} (${p.stack}) after ${label}`, state);
    if (p.betThisRound < 0) fail(`negative bet for ${p.userId} after ${label}`, state);
    if (p.totalContributed < 0) fail(`negative contribution for ${p.userId} after ${label}`, state);
    if (p.stack === 0 && !p.allIn && !p.folded) {
      fail(`${p.userId} has no chips but is not marked all-in after ${label}`, state);
    }
  }

  const now = chipsInPlay(state);
  if (now !== total) {
    fail(`chips not conserved after ${label}: expected ${total}, found ${now}`, state);
  }

  if (state.pot < 0) fail(`negative pot after ${label}`, state);

  if (state.stage !== 'complete' && state.actingIndex === null) {
    fail(`deadlock: stage is ${state.stage} but nobody is due to act (after ${label})`, state);
  }

  if (state.actingIndex !== null) {
    const actor = state.players[state.actingIndex];
    if (actor.folded) fail(`a folded player (${actor.userId}) is due to act after ${label}`, state);
    if (actor.allIn) fail(`an all-in player (${actor.userId}) is due to act after ${label}`, state);
  }
}

// Rule 2 in CLAUDE.md: publicState must never expose another player's cards
// while the hand is live. Cheap to assert here, so assert it here too.
function checkNoLeak(state, viewerId) {
  const view = publicState(state, viewerId);
  if (view.deck) fail('publicState exposed the deck', state);
  for (const p of view.players) {
    if (p.userId === viewerId) continue;
    const revealed = state.stage === 'complete' && !p.folded;
    if (revealed) continue;
    for (const card of p.holeCards) {
      if (card !== 'XX') {
        fail(`publicState leaked ${p.userId}'s card "${card}" to ${viewerId}`, state);
      }
    }
  }
}

function checkCardsUnique(state) {
  const seen = new Set();
  const all = [...state.community, ...state.players.flatMap(p => p.holeCards)];
  for (const card of all) {
    if (seen.has(card)) fail(`duplicate card dealt: ${card}`, state);
    seen.add(card);
  }
}

function chooseAmount(state, player, actions) {
  // raiseTo semantics. Either a legal sized raise, or an all-in shove --
  // when the minimum raise is more than the player can afford, only the
  // shove is legal, and that is exactly the under-raise path worth hitting.
  const maxTo = player.betThisRound + player.stack;
  const minTo = state.currentBet + state.minRaise;
  if (minTo > maxTo) return maxTo;
  // Bias toward the extremes: minimum raises and shoves find more edges
  // than arbitrary middling numbers do.
  const roll = rng();
  if (roll < 0.35) return minTo;
  if (roll < 0.55) return maxTo;
  return randInt(minTo, maxTo);
}

function playOneHand(handNumber) {
  const playerCount = randInt(2, 6);
  const bigBlind = pick([2, 10, 20, 50]);
  const smallBlind = bigBlind / 2;

  const seats = [];
  for (let i = 0; i < playerCount; i++) {
    // Deliberately lumpy stacks, including some below one big blind, so that
    // side pots and short all-ins happen often rather than by luck.
    const style = rng();
    let stack;
    if (style < 0.2) stack = randInt(1, bigBlind);
    else if (style < 0.45) stack = randInt(bigBlind, bigBlind * 8);
    else stack = randInt(bigBlind * 8, bigBlind * 100);
    seats.push({ userId: `p${i}`, stack });
  }

  const total = seats.reduce((sum, s) => sum + s.stack, 0);
  const dealerIndex = randInt(0, playerCount - 1);

  const state = startHand(seats, dealerIndex, smallBlind, bigBlind);
  checkInvariants(state, total, 'the deal');
  checkCardsUnique(state);

  let steps = 0;
  while (state.stage !== 'complete') {
    if (++steps > MAX_STEPS_PER_HAND) {
      fail(`hand did not finish within ${MAX_STEPS_PER_HAND} actions -- probable infinite loop`, state);
    }

    const player = state.players[state.actingIndex];
    const actions = legalActions(state);
    if (actions.length === 0) fail('a player is due to act but has no legal actions', state);

    checkNoLeak(state, player.userId);

    const action = pick(actions);
    const amount = (action === 'bet' || action === 'raise')
      ? chooseAmount(state, player, actions)
      : undefined;

    applyAction(state, player.userId, action, amount);
    checkInvariants(state, total, `${player.userId} ${action}${amount !== undefined ? ' to ' + amount : ''}`);
    checkCardsUnique(state);
  }

  const finalTotal = state.players.reduce((sum, p) => sum + p.stack, 0);
  if (finalTotal !== total) {
    fail(`chips not conserved at payout: started ${total}, ended ${finalTotal}`, state);
  }
  if (state.pot !== 0) fail(`pot not emptied at the end of the hand (${state.pot})`, state);
  if (!state.winners || state.winners.length === 0) fail('hand completed with no winners', state);

  const paid = state.winners.reduce((sum, w) => sum + w.amount, 0);
  const contributed = state.players.reduce((sum, p) => sum + p.totalContributed, 0);
  if (paid !== contributed) {
    fail(`payouts (${paid}) do not match contributions (${contributed})`, state);
  }

  for (const viewer of state.players) checkNoLeak(state, viewer.userId);

  return { playerCount, steps };
}

console.log(`fuzzing game.js: ${HANDS} hands, seed ${SEED}`);
const started = Date.now();
let totalSteps = 0;
const bySize = {};

try {
  for (let hand = 1; hand <= HANDS; hand++) {
    const { playerCount, steps } = playOneHand(hand);
    totalSteps += steps;
    bySize[playerCount] = (bySize[playerCount] || 0) + 1;
  }
} catch (error) {
  console.error(`\nFAILED on seed ${SEED}`);
  console.error(error.message);
  if (error.context) {
    console.error('\nstate at failure:');
    console.error(JSON.stringify({
      stage: error.context.stage,
      pot: error.context.pot,
      currentBet: error.context.currentBet,
      minRaise: error.context.minRaise,
      community: error.context.community,
      players: error.context.players.map(p => ({
        userId: p.userId, stack: p.stack, bet: p.betThisRound,
        contributed: p.totalContributed, folded: p.folded,
        allIn: p.allIn, mayRaise: p.mayRaise
      }))
    }, null, 2));
  }
  console.error(`\nreplay with: node fuzz-game.js ${HANDS} ${SEED}`);
  process.exit(1);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
const spread = Object.keys(bySize).sort().map(n => `${n}p:${bySize[n]}`).join(' ');
console.log(`${HANDS} hands, ${totalSteps} actions, ${seconds}s -- ${spread}`);
console.log('chips conserved, no negative stacks, no deadlocks, no leaked cards');
