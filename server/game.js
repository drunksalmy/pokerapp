const { createDeck, shuffle } = require('./deck');
const { findWinners } = require('./evaluator');

const STAGES = ['preflop', 'flop', 'turn', 'river', 'showdown'];

function startHand(seatedPlayers, dealerIndex, smallBlind, bigBlind) {
  const players = seatedPlayers.map(p => ({
    userId: p.userId,
    stack: p.stack,
    holeCards: [],
    betThisRound: 0,
    totalContributed: 0,
    folded: false,
    allIn: false,
    hasActed: false,
    mayRaise: true
  }));

  const state = {
    players,
    deck: shuffle(createDeck()),
    community: [],
    pot: 0,
    stage: 'preflop',
    currentBet: 0,
    minRaise: bigBlind,
    dealerIndex,
    smallBlind,
    bigBlind,
    actingIndex: null,
    winners: null
  };

  const n = players.length;
  const sbIndex = n === 2 ? dealerIndex : (dealerIndex + 1) % n;
  const bbIndex = n === 2 ? (dealerIndex + 1) % n : (dealerIndex + 2) % n;

  postBlind(state, sbIndex, smallBlind);
  postBlind(state, bbIndex, bigBlind);

  state.currentBet = bigBlind;

  for (let i = 0; i < 2; i++) {
    for (const player of players) {
      player.holeCards.push(state.deck.pop());
    }
  }

  state.actingIndex = n === 2 ? dealerIndex : (bbIndex + 1) % n;
  state.actingIndex = nextActiveFrom(state, state.actingIndex);

  return state;
}

function postBlind(state, index, amount) {
  const player = state.players[index];
  const paid = Math.min(amount, player.stack);
  player.stack -= paid;
  player.betThisRound += paid;
  player.totalContributed += paid;
  if (player.stack === 0) player.allIn = true;
}

function nextActiveFrom(state, index) {
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    const candidate = (index + i) % n;
    const player = state.players[candidate];
    if (!player.folded && !player.allIn) return candidate;
  }
  return null;
}

function legalActions(state) {
  if (state.actingIndex === null) return [];
  const player = state.players[state.actingIndex];
  const toCall = state.currentBet - player.betThisRound;
  const actions = ['fold'];

  if (toCall === 0) {
    actions.push('check');
  } else {
    actions.push('call');
  }

  if (player.stack > toCall && player.mayRaise) {
    actions.push(state.currentBet === 0 ? 'bet' : 'raise');
  }

  return actions;
}

function applyAction(state, userId, action, amount) {
  if (state.stage === 'complete') throw new Error('Hand is already over');

  const index = state.actingIndex;
  if (index === null) throw new Error('No player is due to act');

  const player = state.players[index];
  if (player.userId !== userId) throw new Error(`It is not ${userId}'s turn`);

  const toCall = state.currentBet - player.betThisRound;

  if (action === 'fold') {
    player.folded = true;
    player.hasActed = true;

  } else if (action === 'check') {
    if (toCall > 0) throw new Error('Cannot check facing a bet');
    player.hasActed = true;

  } else if (action === 'call') {
    const paid = Math.min(toCall, player.stack);
    player.stack -= paid;
    player.betThisRound += paid;
    player.totalContributed += paid;
    if (player.stack === 0) player.allIn = true;
    player.hasActed = true;

  } else if (action === 'bet' || action === 'raise') {
    if (!player.mayRaise) {
      throw new Error('Betting is not reopened: an all-in short of a full raise only allows call or fold');
    }

    const raiseTo = amount;
    const needed = raiseTo - player.betThisRound;

    if (needed > player.stack) throw new Error('Not enough chips');

    const isAllIn = needed === player.stack;
    const minimumRaiseTo = state.currentBet + state.minRaise;

    if (raiseTo < minimumRaiseTo && !isAllIn) {
      throw new Error(`Raise must be to at least ${minimumRaiseTo}`);
    }

    player.stack -= needed;
    player.betThisRound += needed;
    player.totalContributed += needed;
    if (player.stack === 0) player.allIn = true;

    if (raiseTo > state.currentBet) {
      // An all-in short of a full raise increment does not reopen the betting.
      // It still raises the amount everyone must match, but players who have
      // already acted may only call or fold, and it does not grow minRaise.
      const increment = raiseTo - state.currentBet;
      const isFullRaise = increment >= state.minRaise;

      if (isFullRaise) state.minRaise = increment;
      state.currentBet = raiseTo;

      for (const other of state.players) {
        if (other === player || other.folded || other.allIn) continue;
        if (isFullRaise) {
          other.mayRaise = true;
        } else if (other.hasActed) {
          other.mayRaise = false;
        }
        other.hasActed = false;
      }
    }
    player.hasActed = true;

  } else {
    throw new Error(`Unknown action: ${action}`);
  }

  advance(state);
  return state;
}

function advance(state) {
  const stillIn = state.players.filter(p => !p.folded);

  if (stillIn.length === 1) {
    collectBets(state);
    state.winners = [{ userId: stillIn[0].userId, amount: state.pot, description: 'Everyone else folded' }];
    stillIn[0].stack += state.pot;
    state.pot = 0;
    state.stage = 'complete';
    state.actingIndex = null;
    return;
  }

  if (!isRoundComplete(state)) {
    state.actingIndex = nextActiveFrom(state, (state.actingIndex + 1) % state.players.length);
    return;
  }

  collectBets(state);

  while (true) {
    const nextStage = STAGES[STAGES.indexOf(state.stage) + 1];
    state.stage = nextStage;

    if (nextStage === 'flop') {
      state.deck.pop();
      state.community.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
    } else if (nextStage === 'turn' || nextStage === 'river') {
      state.deck.pop();
      state.community.push(state.deck.pop());
    } else if (nextStage === 'showdown') {
      resolveShowdown(state);
      return;
    }

    state.currentBet = 0;
    state.minRaise = state.bigBlind;
    for (const player of state.players) {
      player.betThisRound = 0;
      player.hasActed = false;
      player.mayRaise = true;
    }

    const canAct = state.players.filter(p => !p.folded && !p.allIn);
    if (canAct.length > 1) {
      const n = state.players.length;
      const first = (state.dealerIndex + 1) % n;
      state.actingIndex = nextActiveFrom(state, first);
      return;
    }
  }
}

function isRoundComplete(state) {
  const canAct = state.players.filter(p => !p.folded && !p.allIn);
  if (canAct.length === 0) return true;
  if (canAct.length === 1) {
    const solo = canAct[0];
    return solo.hasActed && solo.betThisRound >= state.currentBet;
  }
  return canAct.every(p => p.hasActed && p.betThisRound === state.currentBet);
}

function collectBets(state) {
  for (const player of state.players) {
    state.pot += player.betThisRound;
    player.betThisRound = 0;
  }
}

function resolveShowdown(state) {
  const contenders = state.players.filter(p => !p.folded);
  const levels = [...new Set(state.players.map(p => p.totalContributed))]
    .filter(v => v > 0)
    .sort((a, b) => a - b);

  const payouts = {};
  const pots = [];
  let previous = 0;

  for (const level of levels) {
    const contributors = state.players.filter(p => p.totalContributed >= level);
    pots.push({
      amount: (level - previous) * contributors.length,
      eligible: contenders.filter(p => p.totalContributed >= level)
    });
    previous = level;
  }

  for (let i = pots.length - 1; i > 0; i--) {
    if (pots[i].eligible.length === 0) {
      pots[i - 1].amount += pots[i].amount;
      pots[i].amount = 0;
    }
  }

  for (const pot of pots) {
    if (pot.amount === 0 || pot.eligible.length === 0) continue;

    const winners = findWinners(
      pot.eligible.map(p => ({ userId: p.userId, holeCards: p.holeCards })),
      state.community
    );
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;

    for (const winner of winners) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;
      payouts[winner.userId] = (payouts[winner.userId] || 0) + share + extra;
    }
  }

  state.winners = Object.entries(payouts).map(([userId, amount]) => {
    const player = state.players.find(p => p.userId === userId);
    player.stack += amount;
    return { userId, amount };
  });

  state.pot = 0;
  state.stage = 'complete';
  state.actingIndex = null;
}

function publicState(state, forUserId) {
  return {
    stage: state.stage,
    community: state.community,
    pot: state.pot + state.players.reduce((sum, p) => sum + p.betThisRound, 0),
    currentBet: state.currentBet,
    toAct: state.actingIndex === null ? null : state.players[state.actingIndex].userId,
    legalActions: state.actingIndex !== null && state.players[state.actingIndex].userId === forUserId
      ? legalActions(state)
      : [],
    winners: state.winners,
    players: state.players.map(p => ({
      userId: p.userId,
      stack: p.stack,
      betThisRound: p.betThisRound,
      folded: p.folded,
      allIn: p.allIn,
      holeCards:
        p.userId === forUserId || (state.stage === 'complete' && !p.folded)
          ? p.holeCards
          : p.holeCards.map(() => 'XX')
    }))
  };
}

module.exports = { startHand, applyAction, legalActions, publicState };
