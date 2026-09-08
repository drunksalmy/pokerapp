const { startHand, applyAction, legalActions, publicState } = require('./game');

const DEFAULTS = {
  maxSeats: 6,
  smallBlind: 10,
  bigBlind: 20,
  actionTimeoutMs: 30000,
  handBreakMs: 5000
};

// A single poker table. Owns the seats, the chip stacks between hands, the
// dealer button and the action clock. Knows nothing about sockets: it calls
// onChange() whenever something happened that clients should see, and the
// transport layer decides how to deliver that.
class Table {
  constructor(options = {}) {
    const config = { ...DEFAULTS, ...options };

    this.id = config.id;
    this.maxSeats = config.maxSeats;
    this.smallBlind = config.smallBlind;
    this.bigBlind = config.bigBlind;
    this.actionTimeoutMs = config.actionTimeoutMs;
    this.handBreakMs = config.handBreakMs;
    this.onChange = config.onChange || (() => {});

    this.seats = new Array(this.maxSeats).fill(null);
    this.dealerSeat = 0;
    this.handNumber = 0;

    this.hand = null;        // { state, seatOf: [] } while a hand is running
    this.deadline = null;    // epoch ms the acting player must act by
    this.actionTimer = null;
    this.breakTimer = null;
    this.disposed = false;
  }

  // ---------------------------------------------------------------- seating

  seatOfUser(userId) {
    return this.seats.findIndex(s => s && s.userId === userId);
  }

  sit(userId, name, seatIndex, buyIn) {
    if (this.seatOfUser(userId) !== -1) throw new Error('You are already seated');
    if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= this.maxSeats) {
      throw new Error('No such seat');
    }
    if (this.seats[seatIndex]) throw new Error('Seat is taken');
    if (!Number.isInteger(buyIn) || buyIn < this.bigBlind) {
      throw new Error(`Buy-in must be a whole number of at least ${this.bigBlind}`);
    }

    this.seats[seatIndex] = {
      userId,
      name,
      stack: buyIn,
      connected: true,
      sittingOut: false,
      leaving: false
    };

    this.changed();
    this.maybeStartHand();
    return seatIndex;
  }

  leave(userId) {
    const seatIndex = this.seatOfUser(userId);
    if (seatIndex === -1) return;

    // Mid-hand you cannot just vanish with live chips in the pot: fold out
    // first, then the seat is released once the hand finishes.
    if (this.isInHand(userId)) {
      this.seats[seatIndex].leaving = true;
      if (this.userToAct() === userId) this.forceAction(userId, 'fold');
      else this.changed();
      return;
    }

    this.seats[seatIndex] = null;
    this.changed();
  }

  setConnected(userId, connected) {
    const seatIndex = this.seatOfUser(userId);
    if (seatIndex === -1) return;
    this.seats[seatIndex].connected = connected;
    if (!connected && !this.isInHand(userId)) this.seats[seatIndex].sittingOut = true;
    this.changed();
  }

  setSittingOut(userId, sittingOut) {
    const seatIndex = this.seatOfUser(userId);
    if (seatIndex === -1) throw new Error('You are not seated');
    this.seats[seatIndex].sittingOut = sittingOut;
    this.changed();
    if (!sittingOut) this.maybeStartHand();
  }

  // ------------------------------------------------------------ hand set-up

  eligibleSeats() {
    const eligible = [];
    for (let i = 0; i < this.maxSeats; i++) {
      const seat = this.seats[i];
      if (seat && seat.connected && !seat.sittingOut && !seat.leaving && seat.stack > 0) {
        eligible.push(i);
      }
    }
    return eligible;
  }

  maybeStartHand() {
    if (this.disposed || this.hand || this.breakTimer) return;
    if (this.eligibleSeats().length < 2) return;
    this.startNextHand();
  }

  startNextHand() {
    const eligible = this.eligibleSeats();
    if (eligible.length < 2) return;

    // Button moves to the next eligible seat clockwise from where it was.
    let dealerSeat = eligible[0];
    for (let step = 1; step <= this.maxSeats; step++) {
      const candidate = (this.dealerSeat + step) % this.maxSeats;
      if (eligible.includes(candidate)) {
        dealerSeat = candidate;
        break;
      }
    }
    this.dealerSeat = dealerSeat;

    // game.js works on a dense array; keep it in seat order so the circular
    // position maths (blinds, who acts first) still matches the real table.
    const players = eligible.map(i => ({
      userId: this.seats[i].userId,
      stack: this.seats[i].stack
    }));
    const dealerIndex = eligible.indexOf(dealerSeat);

    const state = startHand(players, dealerIndex, this.smallBlind, this.bigBlind);

    this.handNumber++;
    this.hand = { state, seatOf: eligible };

    if (state.stage === 'complete') this.finishHand();
    else this.armActionTimer();

    this.changed();
  }

  isInHand(userId) {
    if (!this.hand) return false;
    const player = this.hand.state.players.find(p => p.userId === userId);
    return Boolean(player) && !player.folded;
  }

  userToAct() {
    if (!this.hand) return null;
    const { state } = this.hand;
    if (state.actingIndex === null) return null;
    return state.players[state.actingIndex].userId;
  }

  // ------------------------------------------------------------- acting

  act(userId, action, amount) {
    if (!this.hand) throw new Error('No hand in progress');
    if (this.userToAct() !== userId) throw new Error('It is not your turn');

    const allowed = legalActions(this.hand.state);
    if (!allowed.includes(action)) {
      throw new Error(`You cannot ${action} right now`);
    }
    if (action === 'bet' || action === 'raise') {
      if (!Number.isInteger(amount)) throw new Error('Raise amount must be a whole number');
    }

    // game.js is the authority; it re-checks everything and throws on nonsense.
    applyAction(this.hand.state, userId, action, amount);
    this.afterAction();
  }

  // Used by the clock and by players walking away mid-hand. Never rejects.
  forceAction(userId, action) {
    if (!this.hand || this.userToAct() !== userId) return;
    const allowed = legalActions(this.hand.state);
    const choice = allowed.includes(action) ? action : 'fold';
    applyAction(this.hand.state, userId, choice);
    this.afterAction();
  }

  afterAction() {
    this.clearActionTimer();
    if (this.hand.state.stage === 'complete') this.finishHand();
    else this.armActionTimer();
    this.changed();
  }

  finishHand() {
    const { state, seatOf } = this.hand;

    // Chips live on the seat between hands, not in the hand state.
    state.players.forEach((player, index) => {
      const seat = this.seats[seatOf[index]];
      if (seat && seat.userId === player.userId) seat.stack = player.stack;
    });

    this.clearActionTimer();

    for (let i = 0; i < this.maxSeats; i++) {
      const seat = this.seats[i];
      if (!seat) continue;
      if (seat.leaving) this.seats[i] = null;
      else if (seat.stack === 0) seat.sittingOut = true;
    }

    // Leave the finished hand visible so clients can show the showdown,
    // then clear it and deal again.
    this.breakTimer = setTimeout(() => {
      this.breakTimer = null;
      this.hand = null;
      this.changed();
      this.maybeStartHand();
    }, this.handBreakMs);
  }

  // -------------------------------------------------------------- the clock

  armActionTimer() {
    this.clearActionTimer();
    const actor = this.userToAct();
    if (!actor) return;

    this.deadline = Date.now() + this.actionTimeoutMs;
    this.actionTimer = setTimeout(() => {
      this.actionTimer = null;
      // Standard house behaviour: check it down if free, otherwise fold.
      this.forceAction(actor, 'check');
    }, this.actionTimeoutMs);
  }

  clearActionTimer() {
    if (this.actionTimer) clearTimeout(this.actionTimer);
    this.actionTimer = null;
    this.deadline = null;
  }

  dispose() {
    this.disposed = true;
    this.clearActionTimer();
    if (this.breakTimer) clearTimeout(this.breakTimer);
    this.breakTimer = null;
  }

  changed() {
    if (!this.disposed) this.onChange(this);
  }

  // ------------------------------------------------------------- snapshots

  // Everything one specific viewer is allowed to know. This is the ONLY thing
  // that should ever reach a client: it is built from publicState(), so other
  // players' hole cards are masked and the deck is never included.
  stateFor(userId) {
    const seatIndex = this.seatOfUser(userId);

    const snapshot = {
      tableId: this.id,
      handNumber: this.handNumber,
      maxSeats: this.maxSeats,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      dealerSeat: this.hand ? this.dealerSeat : null,
      actionTimeoutMs: this.actionTimeoutMs,
      deadline: this.deadline,
      you: { userId, seatIndex: seatIndex === -1 ? null : seatIndex },
      seats: this.seats.map((seat, index) => seat && {
        seatIndex: index,
        userId: seat.userId,
        name: seat.name,
        stack: seat.stack,
        connected: seat.connected,
        sittingOut: seat.sittingOut,
        leaving: seat.leaving
      }),
      hand: null
    };

    if (this.hand) {
      const view = publicState(this.hand.state, userId);
      // Tell the client which seat each player in the hand occupies.
      view.players = view.players.map((player, index) => ({
        ...player,
        seatIndex: this.hand.seatOf[index]
      }));
      view.raiseBounds = this.raiseBoundsFor(userId);
      snapshot.hand = view;
    }

    return snapshot;
  }

  // Min/max legal raise for the viewer, so the client can build a slider
  // without duplicating the betting rules.
  raiseBoundsFor(userId) {
    if (!this.hand) return null;
    const { state } = this.hand;
    if (state.actingIndex === null) return null;

    const player = state.players[state.actingIndex];
    if (player.userId !== userId) return null;

    const allowed = legalActions(state);
    if (!allowed.includes('bet') && !allowed.includes('raise')) return null;

    const max = player.betThisRound + player.stack;
    return { min: Math.min(state.currentBet + state.minRaise, max), max };
  }
}

module.exports = { Table, DEFAULTS };
