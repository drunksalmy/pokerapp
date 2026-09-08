const { evaluateHand, findWinners } = require('./evaluator');

const community = ['Ah', 'Kh', 'Qh', '2d', '7c'];

const alice = ['Jh', 'Th'];
const bob   = ['As', 'Ac'];
const carol = ['Ad', 'Kd'];

console.log('Alice:', evaluateHand(alice, community).description);
console.log('Bob:  ', evaluateHand(bob, community).description);
console.log('Carol:', evaluateHand(carol, community).description);

const winners = findWinners([
  { userId: 'alice', holeCards: alice },
  { userId: 'bob',   holeCards: bob },
  { userId: 'carol', holeCards: carol }
], community);

console.log('Winner(s):', winners);