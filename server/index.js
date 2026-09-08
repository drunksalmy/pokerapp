require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { Table } = require('./table');

const PORT = Number(process.env.PORT) || 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

const tables = new Map();

function getTable(tableId) {
  let table = tables.get(tableId);
  if (!table) {
    table = new Table({
      id: tableId,
      smallBlind: Number(process.env.SMALL_BLIND) || 10,
      bigBlind: Number(process.env.BIG_BLIND) || 20,
      maxSeats: Number(process.env.MAX_SEATS) || 6,
      actionTimeoutMs: Number(process.env.ACTION_TIMEOUT_MS) || 30000,
      handBreakMs: Number(process.env.HAND_BREAK_MS) || 5000,
      onChange: broadcast
    });
    tables.set(tableId, table);
  }
  return table;
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    tables: [...tables.values()].map(t => ({
      id: t.id,
      handNumber: t.handNumber,
      seated: t.seats.filter(Boolean).length,
      inHand: Boolean(t.hand)
    }))
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] }
});

// ---------------------------------------------------------------- identity

// NOTE: the client asserts its own userId. That is fine for the play-chips
// build among friends, but it is NOT authentication — anyone can claim any id.
// This must be replaced with a verified token before real money is involved.
io.use((socket, next) => {
  const auth = socket.handshake.auth || {};
  const userId = typeof auth.userId === 'string' ? auth.userId.trim() : '';
  const rawName = typeof auth.name === 'string' ? auth.name.trim() : '';

  if (!userId || userId.length > 64) return next(new Error('A userId is required'));

  socket.data.userId = userId;
  socket.data.name = (rawName || `Player ${userId.slice(0, 4)}`).slice(0, 24);
  socket.data.tableId = null;
  next();
});

// --------------------------------------------------------------- broadcast

// Who is watching which table. This is deliberately a synchronous registry
// rather than io.in(room).fetchSockets(): that call is async, and awaiting it
// lets the table move on before the snapshot is built, so short-lived states
// (the gap between hands, a hand that ends the instant it starts) get skipped.
const tableSockets = new Map();

function watch(tableId, socket) {
  if (!tableSockets.has(tableId)) tableSockets.set(tableId, new Set());
  tableSockets.get(tableId).add(socket);
}

function unwatch(tableId, socket) {
  const watchers = tableSockets.get(tableId);
  if (!watchers) return;
  watchers.delete(socket);
  if (watchers.size === 0) tableSockets.delete(tableId);
}

// Every viewer gets their own snapshot, because each one is allowed to see a
// different set of hole cards. Never emit one shared hand object to a room.
function broadcast(table) {
  const watchers = tableSockets.get(table.id);
  if (!watchers) return;
  for (const socket of watchers) {
    socket.emit('table:state', table.stateFor(socket.data.userId));
  }
}

function reply(ack, result) {
  if (typeof ack === 'function') ack(result);
}

// Wraps a handler so a thrown rule violation becomes a clean ack instead of
// killing the connection.
function guarded(socket, ack, handler) {
  try {
    const value = handler();
    reply(ack, { ok: true, ...(value || {}) });
  } catch (err) {
    reply(ack, { ok: false, error: err.message });
    socket.emit('table:error', { message: err.message });
  }
}

io.on('connection', socket => {
  const { userId } = socket.data;

  socket.on('table:join', (payload, ack) => {
    guarded(socket, ack, () => {
      const tableId = typeof payload?.tableId === 'string' ? payload.tableId.trim() : '';
      if (!tableId || tableId.length > 64) throw new Error('A tableId is required');

      if (socket.data.tableId && socket.data.tableId !== tableId) {
        unwatch(socket.data.tableId, socket);
      }

      const table = getTable(tableId);
      socket.data.tableId = tableId;
      watch(tableId, socket);

      // A returning player reclaims their seat rather than losing their chips.
      table.setConnected(userId, true);

      socket.emit('table:state', table.stateFor(userId));
      return { state: table.stateFor(userId) };
    });
  });

  socket.on('table:sit', (payload, ack) => {
    guarded(socket, ack, () => {
      const table = requireTable(socket);
      const seatIndex = Number(payload?.seatIndex);
      const buyIn = Number(payload?.buyIn);
      table.sit(userId, socket.data.name, seatIndex, buyIn);
      return { seatIndex };
    });
  });

  socket.on('table:leave', (payload, ack) => {
    guarded(socket, ack, () => {
      requireTable(socket).leave(userId);
    });
  });

  socket.on('table:sitOut', (payload, ack) => {
    guarded(socket, ack, () => {
      requireTable(socket).setSittingOut(userId, Boolean(payload?.sittingOut));
    });
  });

  socket.on('hand:action', (payload, ack) => {
    guarded(socket, ack, () => {
      const table = requireTable(socket);
      const action = typeof payload?.action === 'string' ? payload.action : '';
      const amount = payload?.amount === undefined ? undefined : Number(payload.amount);
      table.act(userId, action, amount);
    });
  });

  socket.on('disconnect', () => {
    const tableId = socket.data.tableId;
    if (!tableId) return;

    unwatch(tableId, socket);

    const table = tables.get(tableId);
    if (!table) return;

    // Only mark them away if this was their last open socket — a phone that
    // reconnects on a new socket should not knock the old session offline.
    const watchers = tableSockets.get(tableId);
    const stillHere = watchers && [...watchers].some(s => s.data.userId === userId);
    if (!stillHere) table.setConnected(userId, false);
  });
});

function requireTable(socket) {
  const table = socket.data.tableId && tables.get(socket.data.tableId);
  if (!table) throw new Error('Join a table first');
  return table;
}

server.listen(PORT, () => {
  console.log(`poker server listening on :${PORT}`);
});

function shutdown() {
  for (const table of tables.values()) table.dispose();
  io.close();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, server, io, tables };
