'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const engine = require('./game-engine');

const app = express();
const srv = http.createServer(app);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

const io = new Server(srv, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

app.use(express.static(__dirname + '/public'));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: Object.keys(rooms).length,
    uptime: Math.floor(process.uptime()),
  });
});

// ルーム状態確認（デバッグ用）
app.get('/rooms', (req, res) => {
  const summary = Object.values(rooms).map(r => ({
    id: r.id,
    players: r.players.length,
    phase: r.phase,
  }));
  res.json(summary);
});

// ── ルーム管理 ──
// rooms[roomId] = { id, players:[{socketId,name,pi,deck,ready}], G, phase:'waiting'|'mulligan'|'game', mulliganSels }
const rooms = {};
// socketId → roomId
const socketRoom = {};

function broadcast(roomId, event, data) {
  io.to(roomId).emit(event, data);
}

function sendState(room) {
  room.players.forEach((pl, pi) => {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (!sock) return;
    const pub = room.G ? engine.publicState(room.G, pi) : null;
    sock.emit('state', {
      G: pub,
      myPi: pi,
      roomPhase: room.phase,
      players: room.players.map(p => ({ name: p.name, ready: p.ready })),
    });
  });
}

io.on('connection', (socket) => {
  console.log('connect', socket.id);

  // ── ルーム作成 ──
  socket.on('createRoom', ({ name, deck }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      players: [{ socketId: socket.id, name: name || 'Player1', pi: 0, deck: deck || null, ready: false }],
      G: null, phase: 'waiting', mulliganSels: [null, null],
    };
    socketRoom[socket.id] = roomId;
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    broadcast(roomId, 'roomInfo', {
      roomId,
      players: rooms[roomId].players.map(p => ({ name: p.name, ready: p.ready })),
    });
    console.log('room created', roomId);
  });

  // ── ルーム参加 ──
  socket.on('joinRoom', ({ roomId, name, deck }) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('error', 'ルームが見つかりません'); return; }
    if (room.players.length >= 2) { socket.emit('error', 'ルームが満員です'); return; }
    if (room.phase !== 'waiting') { socket.emit('error', 'ゲームが既に始まっています'); return; }

    room.players.push({ socketId: socket.id, name: name || 'Player2', pi: 1, deck: deck || null, ready: false });
    socketRoom[socket.id] = roomId;
    socket.join(roomId);
    socket.emit('roomJoined', { roomId, myPi: 1 });
    broadcast(roomId, 'roomInfo', {
      roomId,
      players: room.players.map(p => ({ name: p.name, ready: p.ready })),
    });
    console.log('joined', roomId, socket.id);
  });

  // ── デッキ送信＆準備完了 ──
  socket.on('ready', ({ deck }) => {
    const roomId = socketRoom[socket.id];
    const room = rooms[roomId];
    if (!room) return;
    const pl = room.players.find(p => p.socketId === socket.id);
    if (!pl) return;
    pl.deck = deck || null;
    pl.ready = true;

    broadcast(roomId, 'roomInfo', {
      roomId,
      players: room.players.map(p => ({ name: p.name, ready: p.ready })),
    });

    // 両者揃ったらマリガンフェーズへ
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      startMulligan(room);
    }
  });

  // ── マリガン確定 ──
  socket.on('mulliganDone', ({ sel }) => {
    const roomId = socketRoom[socket.id];
    const room = rooms[roomId];
    if (!room || room.phase !== 'mulligan') return;
    const pl = room.players.find(p => p.socketId === socket.id);
    if (!pl) return;
    room.mulliganSels[pl.pi] = sel || [];

    // 両者揃ったら
    if (room.mulliganSels.every(s => s !== null)) {
      const players = engine.doMulligan(room.G.players, room.mulliganSels);
      room.G = { ...room.G, players };
      room.phase = 'game';
      sendState(room);
      broadcast(roomId, 'gameStarted', {});
    }
  });

  // ── ゲームアクション ──
  socket.on('action', ({ type, payload }) => {
    const roomId = socketRoom[socket.id];
    const room = rooms[roomId];
    if (!room || room.phase !== 'game' || !room.G) return;
    const pl = room.players.find(p => p.socketId === socket.id);
    if (!pl) return;
    const pi = pl.pi;

    let result;
    switch (type) {
      case 'draw':      result = engine.doDrawCard(room.G, pi, payload.deckType); break;
      case 'place':     result = engine.doPlaceCard(room.G, pi, payload.cardUid); break;
      case 'return':    result = engine.doReturnCard(room.G, pi, payload.cardUid); break;
      case 'activate':  result = engine.doActivate(room.G, pi, payload.cardUid); break;
      case 'serve':     result = engine.doServeRecipe(room.G, pi, payload.recUid, payload.ingUids); break;
      case 'discard':   result = engine.doDiscard(room.G, pi, payload.cardUid); break;
      case 'nextPhase': result = engine.doNextPhase(room.G, pi); break;
      case 'resolve':   result = engine.doResolveChoice(room.G, pi, payload.chosen); break;
      default: socket.emit('error', '不明なアクション'); return;
    }

    if (result.error) { socket.emit('error', result.error); return; }
    room.G = result.G;
    sendState(room);
    if (room.G.winner != null) {
      broadcast(roomId, 'gameOver', { winner: room.G.winner, winnerName: room.players[room.G.winner].name });
    }
  });

  // ── 切断 ──
  socket.on('disconnect', () => {
    const roomId = socketRoom[socket.id];
    if (!roomId) return;
    const room = rooms[roomId];
    if (room) {
      broadcast(roomId, 'opponentLeft', { msg: '相手が切断しました' });
      // ゲーム中なら相手の勝利
      if (room.phase === 'game') {
        const remaining = room.players.find(p => p.socketId !== socket.id);
        if (remaining) io.to(remaining.socketId).emit('gameOver', { winner: remaining.pi, winnerName: remaining.name, reason: '相手が切断しました' });
      }
      delete rooms[roomId];
    }
    delete socketRoom[socket.id];
    console.log('disconnect', socket.id, roomId);
  });
});

function startMulligan(room) {
  const configs = room.players.map(p => p.deck);
  room.G = engine.createGame(configs);
  room.phase = 'mulligan';
  room.mulliganSels = [null, null];
  // 各プレイヤーに初期手札を送信
  room.players.forEach((pl, pi) => {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (!sock) return;
    sock.emit('mulliganStart', {
      hand: room.G.players[pi].hand,
      myPi: pi,
    });
  });
  console.log('mulligan started', room.id);
}

const PORT = process.env.PORT || 3000;
srv.listen(PORT, () => console.log(`🍳 Grimoire Server listening on port ${PORT}`));
