// Integration test for the Socket.io layer. Boots the real server on a test
// port and drives it with real clients.
process.env.PORT = process.env.PORT || '3999';
process.env.ACTION_TIMEOUT_MS = '1200';
process.env.HAND_BREAK_MS = '400';

const { io: connect } = require('socket.io-client');
const { server } = require('./index');

const URL = `http://localhost:${process.env.PORT}`;

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// A client that remembers the latest snapshot it was sent.
function client(userId, name) {
  const socket = connect(URL, { auth: { userId, name }, transports: ['websocket'] });
  const c = { userId, name, socket, state: null, errors: [] };

  socket.on('table:state', state => { c.state = state; });
  socket.on('table:error', err => { c.errors.push(err.message); });

  c.emit = (event, payload) => new Promise((resolve, reject) => {
    socket.emit(event, payload, res => {
      if (res && res.ok === false) reject(new Error(res.error));
      else resolve(res);
    });
  });

  c.waitFor = (predicate, label, timeoutMs = 4000) => new Promise((resolve, reject) => {
    if (c.state && predicate(c.state)) return resolve(c.state);
    const timer = setTimeout(() => {
      socket.off('table:state', handler);
      reject(new Error(`${userId} timed out waiting for ${label}`));
    }, timeoutMs);
    const handler = state => {
      if (!predicate(state)) return;
      clearTimeout(timer);
      socket.off('table:state', handler);
      resolve(state);
    };
    socket.on('table:state', handler);
  });

  c.connected = new Promise(resolve => socket.on('connect', resolve));
  return c;
}

// Walks a whole snapshot looking for anything the viewer must not receive.
function findLeaks(state, viewerId) {
  const problems = [];
  if (JSON.stringify(state).includes('"deck"')) problems.push('snapshot contains a deck');
  if (!state.hand) return problems;

  for (const player of state.hand.players) {
    if (player.userId === viewerId) continue;
    if (state.hand.stage === 'complete' && !player.folded) continue; // showdown
    const masked = player.holeCards.every(card => card === 'XX');
    if (!masked) problems.push(`${viewerId} can see ${player.userId}'s cards: ${player.holeCards}`);
  }
  return problems;
}

async function main() {
  const alice = client('u-alice', 'Alice');
  const bob = client('u-bob', 'Bob');
  const carol = client('u-carol', 'Carol');
  const all = [alice, bob, carol];

  await Promise.all(all.map(c => c.connected));
  console.log('=== Connect and join ===');
  check('three clients connected', all.every(c => c.socket.connected));

  await Promise.all(all.map(c => c.emit('table:join', { tableId: 'test-table' })));
  await alice.waitFor(s => s.tableId === 'test-table', 'join snapshot');
  check('join returns a table snapshot', alice.state.tableId === 'test-table');
  check('table starts with no hand', alice.state.hand === null);
  check('all seats empty', alice.state.seats.every(s => s === null));

  console.log('\n=== Rejecting bad requests ===');
  await alice.emit('table:sit', { seatIndex: 0, buyIn: 1000 });
  const takenSeat = await bob.emit('table:sit', { seatIndex: 0, buyIn: 1000 }).catch(e => e);
  check('cannot take an occupied seat', takenSeat instanceof Error, takenSeat.message);

  const tinyBuyIn = await bob.emit('table:sit', { seatIndex: 1, buyIn: 5 }).catch(e => e);
  check('rejects a buy-in below the big blind', tinyBuyIn instanceof Error, tinyBuyIn.message);

  const notSeated = await carol.emit('hand:action', { action: 'fold' }).catch(e => e);
  check('rejects an action with no hand running', notSeated instanceof Error, notSeated.message);

  console.log('\n=== Hand starts when two players are seated ===');
  await bob.emit('table:sit', { seatIndex: 1, buyIn: 1000 });
  await alice.waitFor(s => s.hand !== null, 'first hand');
  await bob.waitFor(s => s.hand !== null, 'first hand');

  check('hand is dealt', alice.state.hand.stage === 'preflop');
  check('button is assigned', Number.isInteger(alice.state.dealerSeat));
  check('blinds are posted', alice.state.hand.pot === 30, alice.state.hand.pot);

  console.log('\n=== Hole cards stay private ===');
  const aliceLeaks = findLeaks(alice.state, 'u-alice');
  const bobLeaks = findLeaks(bob.state, 'u-bob');
  const carolLeaks = findLeaks(carol.state, 'u-carol');
  check('alice sees no one else’s cards', aliceLeaks.length === 0, aliceLeaks);
  check('bob sees no one else’s cards', bobLeaks.length === 0, bobLeaks);
  check('a spectator sees no cards at all', carolLeaks.length === 0, carolLeaks);

  const aliceSelf = alice.state.hand.players.find(p => p.userId === 'u-alice');
  check('alice can see her own two cards', aliceSelf.holeCards.every(c => c !== 'XX'), aliceSelf.holeCards);

  console.log('\n=== Turn order is enforced ===');
  const toAct = alice.state.hand.toAct;
  const waiter = toAct === 'u-alice' ? bob : alice;
  const actor = toAct === 'u-alice' ? alice : bob;

  check('exactly one player is to act', typeof toAct === 'string');
  check('the player to act gets legal actions', actor.state.hand.legalActions.length > 0);
  check('the other player gets none', waiter.state.hand.legalActions.length === 0);
  check('the player to act gets raise bounds', actor.state.hand.raiseBounds !== null);
  check('the other player gets no raise bounds', waiter.state.hand.raiseBounds === null);

  const outOfTurn = await waiter.emit('hand:action', { action: 'fold' }).catch(e => e);
  check('acting out of turn is rejected', outOfTurn instanceof Error, outOfTurn.message);

  const illegal = await actor.emit('hand:action', { action: 'check' }).catch(e => e);
  check('checking into a bet is rejected', illegal instanceof Error, illegal.message);

  console.log('\n=== Playing the hand out ===');
  const chipsBefore = alice.state.seats.filter(Boolean).reduce((t, s) => t + s.stack, 0);
  await actor.emit('hand:action', { action: 'fold' });
  await alice.waitFor(s => s.hand && s.hand.stage === 'complete', 'showdown');

  check('hand completed', alice.state.hand.stage === 'complete');
  check('a winner was declared', Array.isArray(alice.state.hand.winners) && alice.state.hand.winners.length > 0);

  await alice.waitFor(s => s.hand === null, 'break between hands');
  const chipsAfter = alice.state.seats.filter(Boolean).reduce((t, s) => t + s.stack, 0);
  check('chips conserved across the hand', chipsAfter === chipsBefore, { chipsBefore, chipsAfter });

  console.log('\n=== The action clock ===');
  await alice.waitFor(s => s.hand !== null, 'next hand');
  check('a new hand was dealt automatically', alice.state.handNumber === 2, alice.state.handNumber);
  check('a deadline is published', typeof alice.state.deadline === 'number');
  check('deadline is in the future', alice.state.deadline > Date.now());

  const stalling = alice.state.hand.toAct;
  const stackBefore = alice.state.hand.players.find(p => p.userId === stalling).stack;

  // Nobody acts. The clock should act for them, with no client input at all.
  const clockFired = await alice
    .waitFor(
      s => s.hand === null || s.hand.toAct !== stalling || s.hand.stage === 'complete',
      'the clock to fire',
      3000
    )
    .then(() => true)
    .catch(() => false);

  const stalled = alice.state.hand && alice.state.hand.players.find(p => p.userId === stalling);
  check('the clock acted for the idle player', clockFired);
  if (stalled) {
    check('the idle player did not lose extra chips to a phantom call', stalled.stack === stackBefore, {
      before: stackBefore, after: stalled.stack
    });
  }

  console.log('\n=== Disconnect handling ===');
  const seatedBefore = alice.state.seats.filter(Boolean).length;
  bob.socket.close();
  await sleep(300);
  const bobSeat = alice.state.seats.find(s => s && s.userId === 'u-bob');
  check('seat is kept after a disconnect', Boolean(bobSeat));
  check('disconnected player is marked offline', bobSeat && bobSeat.connected === false, bobSeat);
  check('chips are not confiscated', bobSeat && bobSeat.stack > 0, bobSeat && bobSeat.stack);
  check('seat count unchanged', alice.state.seats.filter(Boolean).length === seatedBefore);

  // A phone that locks or switches apps drops its socket. If that happens
  // between hands, the player must be dealt back in once they return -- not
  // left silently sitting out with no way back.
  console.log('\n=== Reconnecting between hands ===');
  const dave = client('u-dave', 'Dave');
  const erin = client('u-erin', 'Erin');
  await Promise.all([dave.connected, erin.connected]);
  await dave.emit('table:join', { tableId: 'reconnect-table' });
  await erin.emit('table:join', { tableId: 'reconnect-table' });
  // Erin sits out first, so no hand is running when Dave's connection drops.
  await erin.emit('table:sit', { seatIndex: 1, buyIn: 1000 });
  await erin.emit('table:sitOut', { sittingOut: true });
  await dave.emit('table:sit', { seatIndex: 0, buyIn: 1000 });
  await erin.waitFor(s => s.seats[0] !== null, 'dave seated');
  check('no hand while the only other player sits out', erin.state.hand === null);

  dave.socket.close();
  await erin.waitFor(s => s.seats[0] && s.seats[0].connected === false, 'dave offline');

  const daveBack = client('u-dave', 'Dave');
  await daveBack.connected;
  await daveBack.emit('table:join', { tableId: 'reconnect-table' });
  await erin.waitFor(s => s.seats[0] && s.seats[0].connected === true, 'dave back online');
  check('reconnecting does not leave the player sitting out', erin.state.seats[0].sittingOut === false, erin.state.seats[0]);

  await erin.emit('table:sitOut', { sittingOut: false });
  const dealt = await erin
    .waitFor(s => s.hand !== null, 'a hand with both players', 3000)
    .then(() => true)
    .catch(() => false);
  check(
    'the next hand deals the reconnected player in',
    dealt && erin.state.hand.players.some(p => p.userId === 'u-dave')
  );

  for (const c of [daveBack, erin]) c.socket.close();
  for (const c of all) c.socket.close();
  await sleep(200);

  console.log(`\n${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('\ntest run crashed:', err.message);
  server.close();
  process.exit(1);
});
