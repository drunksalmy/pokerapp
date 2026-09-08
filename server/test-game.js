const { startHand, applyAction, legalActions, publicState } = require('./game');

function seat(userId, stack) { return { userId, stack }; }

console.log('=== Scenario 1: 3 players, everyone folds to big blind ===');
let s = startHand([seat('a', 1000), seat('b', 1000), seat('c', 1000)], 0, 10, 20);
console.log('to act:', s.players[s.actingIndex].userId, legalActions(s));
applyAction(s, 'a', 'fold');
console.log('to act:', s.players[s.actingIndex].userId);
applyAction(s, 'b', 'fold');
console.log('stage:', s.stage, 'winners:', s.winners);
console.log('stacks:', s.players.map(p => `${p.userId}:${p.stack}`).join(' '));

console.log('\n=== Scenario 2: 3 players, call to showdown ===');
s = startHand([seat('a', 1000), seat('b', 1000), seat('c', 1000)], 0, 10, 20);
applyAction(s, 'a', 'call');
applyAction(s, 'b', 'call');
applyAction(s, 'c', 'check');
console.log('stage after preflop:', s.stage, 'pot:', s.pot, 'board:', s.community);
console.log('to act:', s.players[s.actingIndex].userId, legalActions(s));
applyAction(s, 'b', 'check');
applyAction(s, 'c', 'check');
applyAction(s, 'a', 'check');
console.log('stage:', s.stage, 'board:', s.community);
applyAction(s, 'b', 'check');
applyAction(s, 'c', 'check');
applyAction(s, 'a', 'check');
console.log('stage:', s.stage, 'board:', s.community);
applyAction(s, 'b', 'check');
applyAction(s, 'c', 'check');
applyAction(s, 'a', 'check');
console.log('stage:', s.stage, 'board:', s.community);
console.log('winners:', s.winners);
console.log('total chips:', s.players.reduce((t, p) => t + p.stack, 0));

console.log('\n=== Scenario 3: raise, re-raise, fold ===');
s = startHand([seat('a', 1000), seat('b', 1000), seat('c', 1000)], 0, 10, 20);
applyAction(s, 'a', 'raise', 60);
console.log('currentBet:', s.currentBet, 'to act:', s.players[s.actingIndex].userId, legalActions(s));
applyAction(s, 'b', 'raise', 180);
console.log('currentBet:', s.currentBet, 'to act:', s.players[s.actingIndex].userId);
applyAction(s, 'c', 'fold');
applyAction(s, 'a', 'fold');
console.log('winners:', s.winners);
console.log('total chips:', s.players.reduce((t, p) => t + p.stack, 0));

console.log('\n=== Scenario 4: heads up, big blind option ===');
s = startHand([seat('a', 1000), seat('b', 1000)], 0, 10, 20);
console.log('preflop first to act (should be a, the dealer/SB):', s.players[s.actingIndex].userId);
applyAction(s, 'a', 'call');
console.log('stage still preflop (BB option):', s.stage, 'to act:', s.players[s.actingIndex].userId, legalActions(s));
applyAction(s, 'b', 'check');
console.log('stage:', s.stage, 'first to act postflop (should be b):', s.players[s.actingIndex].userId);

console.log('\n=== Scenario 5: side pot, short stack all-in ===');
s = startHand([seat('a', 100), seat('b', 1000), seat('c', 1000)], 0, 10, 20);
applyAction(s, 'a', 'raise', 100);
console.log('a all-in?', s.players[0].allIn);
applyAction(s, 'b', 'call');
applyAction(s, 'c', 'call');
console.log('stage:', s.stage, 'pot:', s.pot);
console.log('to act:', s.actingIndex === null ? 'none' : s.players[s.actingIndex].userId);
applyAction(s, 'b', 'raise', 200);
applyAction(s, 'c', 'call');
console.log('stage:', s.stage);
while (s.stage !== 'complete') {
  const actor = s.players[s.actingIndex].userId;
  applyAction(s, actor, 'check');
}
console.log('winners:', s.winners);
console.log('stacks:', s.players.map(p => `${p.userId}:${p.stack}`).join(' '));
console.log('total chips (should be 2100):', s.players.reduce((t, p) => t + p.stack, 0));

console.log('\n=== Scenario 6: everyone all-in preflop, runs out board ===');
s = startHand([seat('a', 200), seat('b', 200), seat('c', 200)], 0, 10, 20);
applyAction(s, 'a', 'raise', 200);
applyAction(s, 'b', 'call');
applyAction(s, 'c', 'call');
console.log('stage:', s.stage, 'board:', s.community);
console.log('winners:', s.winners);
console.log('total chips (should be 600):', s.players.reduce((t, p) => t + p.stack, 0));

console.log('\n=== Scenario 7: publicState hides other hole cards ===');
s = startHand([seat('a', 1000), seat('b', 1000)], 0, 10, 20);
console.log(JSON.stringify(publicState(s, 'a').players, null, 1));

console.log('\n=== Scenario 8: under-raise all-in does NOT reopen betting ===');
// a is the dealer, so d acts first preflop.
s = startHand([seat('a', 1000), seat('b', 1000), seat('c', 1000), seat('d', 130)], 0, 10, 20);
applyAction(s, 'd', 'raise', 60);   // full raise, minRaise becomes 40
applyAction(s, 'a', 'raise', 100);  // full re-raise, minRaise stays 40
applyAction(s, 'b', 'fold');
applyAction(s, 'c', 'fold');
console.log('minRaise before the shove (should be 40):', s.minRaise);
applyAction(s, 'd', 'raise', 130);  // all-in for +30, short of a full 40 raise
console.log('currentBet after shove (should be 130):', s.currentBet);
console.log('minRaise unchanged (should be 40):', s.minRaise);
console.log('to act:', s.players[s.actingIndex].userId);
console.log('legal actions for a (should be fold/call only):', legalActions(s));
try {
  applyAction(s, 'a', 'raise', 260);
  console.log('BUG: a was allowed to re-raise');
} catch (err) {
  console.log('re-raise correctly rejected:', err.message);
}
applyAction(s, 'a', 'call');
console.log('stage:', s.stage, 'winners:', s.winners);
console.log('total chips (should be 3130):', s.players.reduce((t, p) => t + p.stack, 0));

console.log('\n=== Scenario 9: full all-in raise DOES reopen betting ===');
s = startHand([seat('a', 1000), seat('b', 1000), seat('c', 1000), seat('d', 200)], 0, 10, 20);
applyAction(s, 'd', 'raise', 60);   // full raise, minRaise becomes 40
applyAction(s, 'a', 'raise', 100);  // full re-raise
applyAction(s, 'b', 'fold');
applyAction(s, 'c', 'fold');
applyAction(s, 'd', 'raise', 200);  // all-in for +100, a full raise
console.log('currentBet (should be 200):', s.currentBet);
console.log('minRaise (should be 100):', s.minRaise);
console.log('legal actions for a (should include raise):', legalActions(s));
applyAction(s, 'a', 'call');
console.log('stage:', s.stage);
console.log('total chips (should be 3200):', s.players.reduce((t, p) => t + p.stack, 0));
