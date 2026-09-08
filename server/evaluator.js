const { Hand } = require('pokersolver');

function evaluateHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  const hand = Hand.solve(allCards);
  return {
    name: hand.name,
    description: hand.descr,
    hand: hand
  };
}

function findWinners(players, communityCards) {
  const solved = players.map(player => ({
    userId: player.userId,
    hand: Hand.solve([...player.holeCards, ...communityCards])
  }));

  const winningHands = Hand.winners(solved.map(s => s.hand));

  return solved
    .filter(s => winningHands.includes(s.hand))
    .map(s => ({
      userId: s.userId,
      description: s.hand.descr
    }));
}

module.exports = { evaluateHand, findWinners };