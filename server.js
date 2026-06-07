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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: Object.keys(rooms).length,
    casualQueue: casualQueue.length,
    rankedQueue: rankedQueue.length,
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/rooms', (req, res) => {
  const summary = Object.values(rooms).map(r => ({
    id: r.id, players: r.players.length, phase: r.phase,
  }));
  res.json(summary);
});

// ── ルーム・キュー管理 ──
const rooms = {};
const socketRoom = {};

// カジュアルキュー（ランダムマッチ）
// { socketId, name, deck }
let casualQueue = [];

// ランクキュー（ランクマッチ）
// { socketId, name, deck, rating }
let rankedQueue = [];

// レート管理（socketId → rating）
const playerRatings = {};
const DEFAULT_RATING = 1500;
const K_FACTOR = 32;

function calcNewRatings(rA, rB, scoreA) {
  const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  const eB = 1 - eA;
  return {
    newA: Math.round(rA + K_FACTOR * (scoreA - eA)),
    newB: Math.round(rB + K_FACTOR * ((1 - scoreA) - eB)),
  };
}

function broadcast(roomId, event, data) {
  io.to(roomId).emit(event, data);
}

function sendState(room) {
  room.players.forEach((pl) => {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (!sock) return;
    const pub = room.G ? engine.publicState(room.G, pl.pi) : null;
    sock.emit('state', {
      G: pub, myPi: pl.pi, roomPhase: room.phase,
      players: room.players.map(p => ({ name: p.name, ready: p.ready })),
    });
  });
}

// マッチングしてルームを作成・ゲーム開始
function createMatchRoom(p1, p2, matchType) {
  const roomId = uuidv4().slice(0, 6).toUpperCase();
  rooms[roomId] = {
    id: roomId,
    players: [
      { socketId: p1.socketId, name: p1.name, pi: 0, deck: p1.deck || null, ready: false, rematchReady: false, rating: p1.rating || DEFAULT_RATING },
      { socketId: p2.socketId, name: p2.name, pi: 1, deck: p2.deck || null, ready: false, rematchReady: false, rating: p2.rating || DEFAULT_RATING },
    ],
    G: null, phase: 'waiting', mulliganSels: [null, null],
    rematchTimer: null, matchType,
  };
  socketRoom[p1.socketId] = roomId;
  socketRoom[p2.socketId] = roomId;

  const sock1 = io.sockets.sockets.get(p1.socketId);
  const sock2 = io.sockets.sockets.get(p2.socketId);
  if (sock1) sock1.join(roomId);
  if (sock2) sock2.join(roomId);

  // マッチング成立通知
  const matchInfo = {
    roomId,
    matchType,
    opponent: '',
    myRating: 0,
  };
  if (sock1) sock1.emit('matchFound', { ...matchInfo, opponent: p2.name, myRating: p1.rating || DEFAULT_RATING, opponentRating: p2.rating || DEFAULT_RATING });
  if (sock2) sock2.emit('matchFound', { ...matchInfo, opponent: p1.name, myRating: p2.rating || DEFAULT_RATING, opponentRating: p1.rating || DEFAULT_RATING });

  broadcast(roomId, 'roomInfo', {
    roomId, players: rooms[roomId].players.map(p => ({ name: p.name, ready: p.ready })),
  });

  // デッキが両者揃っているなら即マリガンへ
  if (p1.deck && p2.deck) {
    startMulligan(rooms[roomId]);
  }
  console.log(`[Match] ${matchType} room=${roomId} ${p1.name} vs ${p2.name}`);
}

io.on('connection', (socket) => {
  console.log('connect', socket.id);
  playerRatings[socket.id] = playerRatings[socket.id] || DEFAULT_RATING;

  // ── カジュアルキュー参加 ──
  socket.on('joinCasualQueue', ({ name, deck, rating }) => {
    // 既にキュー/ルームにいる場合は除外
    casualQueue = casualQueue.filter(p => p.socketId !== socket.id);
    playerRatings[socket.id] = rating || DEFAULT_RATING;
    casualQueue.push({ socketId: socket.id, name: name || 'Player', deck: deck || null, rating: DEFAULT_RATING });
    socket.emit('queueJoined', { matchType: 'casual', queueSize: casualQueue.length });
    console.log(`[CasualQueue] ${name} joined (${casualQueue.length} waiting)`);
    // 2人以上いたらマッチング
    if (casualQueue.length >= 2) {
      const [p1, p2] = casualQueue.splice(0, 2);
      createMatchRoom(p1, p2, 'casual');
    }
  });

  // ── ランクキュー参加 ──
  socket.on('joinRankedQueue', ({ name, deck, rating }) => {
    rankedQueue = rankedQueue.filter(p => p.socketId !== socket.id);
    const myRating = rating || playerRatings[socket.id] || DEFAULT_RATING;
    playerRatings[socket.id] = myRating;
    rankedQueue.push({ socketId: socket.id, name: name || 'Player', deck: deck || null, rating: myRating, joinedAt: Date.now() });
    socket.emit('queueJoined', { matchType: 'ranked', queueSize: rankedQueue.length, myRating });
    console.log(`[RankedQueue] ${name}(${myRating}) joined (${rankedQueue.length} waiting)`);
    tryRankedMatch();
  });

  // ランクマッチング：レート差300以内でマッチング（待機時間が長いほど許容範囲を拡大）
  function tryRankedMatch() {
    if (rankedQueue.length < 2) return;
    const now = Date.now();
    for (let i = 0; i < rankedQueue.length; i++) {
      for (let j = i + 1; j < rankedQueue.length; j++) {
        const p1 = rankedQueue[i], p2 = rankedQueue[j];
        const waitSec = Math.min((now - p1.joinedAt) / 1000, (now - p2.joinedAt) / 1000);
        // 待機30秒ごとに許容レート差+200（最大1000）
        const allowedDiff = 300 + Math.floor(waitSec / 30) * 200;
        if (Math.abs(p1.rating - p2.rating) <= allowedDiff) {
          rankedQueue.splice(j, 1);
          rankedQueue.splice(i, 1);
          createMatchRoom(p1, p2, 'ranked');
          return;
        }
      }
    }
  }

  // ランクキュー拡大タイマー（30秒ごとに許容範囲が広がるのでマッチングを再試行）
  const rankedTimer = setInterval(() => { if (rankedQueue.some(p => p.socketId === socket.id)) tryRankedMatch(); }, 15000);

  // ── キュー離脱 ──
  socket.on('leaveQueue', () => {
    casualQueue = casualQueue.filter(p => p.socketId !== socket.id);
    rankedQueue = rankedQueue.filter(p => p.socketId !== socket.id);
    socket.emit('queueLeft', {});
    console.log(`[Queue] ${socket.id} left queue`);
  });

  // ── ルーム作成 ──
  socket.on('createRoom', ({ name, deck }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      players: [{ socketId: socket.id, name: name || 'Player1', pi: 0, deck: deck || null, ready: false, rematchReady: false }],
      G: null, phase: 'waiting', mulliganSels: [null, null], rematchTimer: null, matchType: 'private',
    };
    socketRoom[socket.id] = roomId;
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    broadcast(roomId, 'roomInfo', {
      roomId, players: rooms[roomId].players.map(p => ({ name: p.name, ready: p.ready })),
    });
    console.log('room created', roomId);
  });

  // ── ルーム参加 ──
  socket.on('joinRoom', ({ roomId, name, deck }) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('error', 'ルームが見つかりません'); return; }
    if (room.players.length >= 2) { socket.emit('error', 'ルームが満員です'); return; }
    if (room.phase !== 'waiting') { socket.emit('error', 'ゲームが既に始まっています'); return; }
    room.players.push({ socketId: socket.id, name: name || 'Player2', pi: 1, deck: deck || null, ready: false, rematchReady: false });
    socketRoom[socket.id] = roomId;
    socket.join(roomId);
    socket.emit('roomJoined', { roomId, myPi: 1 });
    broadcast(roomId, 'roomInfo', { roomId, players: room.players.map(p => ({ name: p.name, ready: p.ready })) });
    console.log('joined', roomId, socket.id);
  });

  // ── 準備完了 ──
  socket.on('ready', ({ deck }) => {
    const roomId = socketRoom[socket.id];
    const room = rooms[roomId];
    if (!room) return;
    const pl = room.players.find(p => p.socketId === socket.id);
    if (!pl) return;
    if (deck) pl.deck = deck; // nullで上書きしない（クロージャの古い値対策）
    pl.ready = true;
    broadcast(roomId, 'roomInfo', { roomId, players: room.players.map(p => ({ name: p.name, ready: p.ready })) });
    if (room.phase === 'waiting' && room.players.length === 2 && room.players.every(p => p.ready)) {
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
    if (room.mulliganSels.every(s => s !== null)) {
      const players = engine.doMulligan(room.G.players, room.mulliganSels);
      room.G = { ...room.G, players };
      room.phase = 'game';
      sendState(room);
      broadcast(roomId, 'gameStarted', {});
      startTurnTimer(room);
    }
  });

  // ── 再戦 ──
  socket.on('rematch', ({ deck }) => {
    const roomId = socketRoom[socket.id];
    const room = rooms[roomId];
    if (!room) return;
    const pl = room.players.find(p => p.socketId === socket.id);
    if (!pl) return;
    pl.deck = deck || null;
    pl.rematchReady = true;
    broadcast(roomId, 'roomInfo', { roomId, players: room.players.map(p => ({ name: p.name, ready: p.ready })) });
    const readyCount = room.players.filter(p => p.rematchReady).length;
    if (room.players.length === 2 && readyCount === 2) {
      if (room.rematchTimer) { clearInterval(room.rematchTimer); room.rematchTimer = null; }
      room.players.forEach(p => { p.rematchReady = false; p.ready = false; });
      broadcast(roomId, 'rematchMatched', {});
      return;
    }
    if (readyCount === 1 && !room.rematchTimer) {
      let sec = 10;
      room.players.forEach(p => {
        const s = io.sockets.sockets.get(p.socketId);
        if (!s) return;
        s.emit('rematchCountdown', { sec, fromOpponent: !p.rematchReady });
      });
      room.rematchTimer = setInterval(() => {
        sec--;
        if (sec <= 0) {
          clearInterval(room.rematchTimer); room.rematchTimer = null;
          if (!room.players.every(p => p.rematchReady)) {
            broadcast(roomId, 'rematchExpired', {});
            room.players.forEach(p => { p.rematchReady = false; });
          }
          return;
        }
        room.players.filter(p => p.rematchReady).forEach(p => {
          const s = io.sockets.sockets.get(p.socketId);
          if (s) s.emit('rematchCountdown', { sec, fromOpponent: false });
        });
      }, 1000);
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
      case 'discard':   result = engine.doDiscard(room.G, pi, payload.cardUid, payload.from); break;
      case 'nextPhase': result = engine.doNextPhase(room.G, pi); break;
      case 'resolve':   result = engine.doResolveChoice(room.G, pi, payload.chosen); break;
      default: socket.emit('error', '不明なアクション'); return;
    }
    if (result.error) { socket.emit('error', result.error); return; }
    const prevPlayer = room.G.currentPlayer;
    room.G = result.G;
    sendState(room);
    // ターンが切り替わったらタイマーリスタート
    if (room.G.winner == null && room.G.currentPlayer !== prevPlayer) {
      startTurnTimer(room);
    }
    if (room.G.winner != null) {
      clearTurnTimer(room);
      const winnerPl = room.players[room.G.winner];
      const loserPl = room.players[1 - room.G.winner];
      // ランクマッチならレート更新
      if (room.matchType === 'ranked') {
        const rW = winnerPl.rating || DEFAULT_RATING;
        const rL = loserPl.rating || DEFAULT_RATING;
        const { newA: newW, newB: newL } = calcNewRatings(rW, rL, 1);
        const ratingChange = newW - rW;
        const wSock = io.sockets.sockets.get(winnerPl.socketId);
        const lSock = io.sockets.sockets.get(loserPl.socketId);
        if (wSock) wSock.emit('gameOver', { winner: room.G.winner, winnerName: winnerPl.name, newRating: newW, ratingChange: +ratingChange });
        if (lSock) lSock.emit('gameOver', { winner: room.G.winner, winnerName: winnerPl.name, newRating: newL, ratingChange: -(ratingChange) });
        playerRatings[winnerPl.socketId] = newW;
        playerRatings[loserPl.socketId] = newL;
      } else {
        broadcast(roomId, 'gameOver', { winner: room.G.winner, winnerName: winnerPl.name });
      }
    }
  });

  // ── 切断 ──
  socket.on('disconnect', () => {
    clearInterval(rankedTimer);
    casualQueue = casualQueue.filter(p => p.socketId !== socket.id);
    rankedQueue = rankedQueue.filter(p => p.socketId !== socket.id);
    const roomId = socketRoom[socket.id];
    if (!roomId) return;
    const room = rooms[roomId];
    if (room) {
      if (room.rematchTimer) { clearInterval(room.rematchTimer); room.rematchTimer = null; }
      broadcast(roomId, 'opponentLeft', { msg: '相手が切断しました' });
      if (room.phase === 'game') {
        const remaining = room.players.find(p => p.socketId !== socket.id);
        if (remaining) {
          // ランクマッチなら切断側が負け扱いでレート更新
          if (room.matchType === 'ranked') {
            const disconnected = room.players.find(p => p.socketId === socket.id);
            if (disconnected && remaining) {
              const rW = remaining.rating || DEFAULT_RATING;
              const rL = disconnected.rating || DEFAULT_RATING;
              const { newA: newW, newB: newL } = calcNewRatings(rW, rL, 1);
              const rSock = io.sockets.sockets.get(remaining.socketId);
              if (rSock) rSock.emit('gameOver', { winnerName: remaining.name, newRating: newW, ratingChange: newW - rW, reason: '相手が切断しました' });
            }
          } else {
            io.to(remaining.socketId).emit('gameOver', { winnerName: remaining.name, reason: '相手が切断しました' });
          }
        }
      }
      delete rooms[roomId];
    }
    delete socketRoom[socket.id];
    delete playerRatings[socket.id];
    console.log('disconnect', socket.id, roomId);
  });
});

// ── ターンタイマー ──
const TURN_TIME_LIMIT = 90; // 秒

function startTurnTimer(room) {
  clearTurnTimer(room);
  room.turnTimeLeft = TURN_TIME_LIMIT;
  broadcastTurnTimer(room);
  room.turnTimerInterval = setInterval(() => {
    room.turnTimeLeft--;
    broadcastTurnTimer(room);
    if (room.turnTimeLeft <= 0) {
      clearTurnTimer(room);
      // 時間切れ：現在の手番プレイヤーを強制endTurn
      if (room.G && room.phase === 'game' && room.G.winner == null) {
        const result = engine.doForceEndTurn(room.G, room.G.currentPlayer);
        if (!result.error) {
          room.G = result.G;
          sendState(room);
          // 勝敗確認
          if (room.G.winner != null) {
            const winnerPl = room.players[room.G.winner];
            broadcast(room.id, 'gameOver', { winner: room.G.winner, winnerName: winnerPl.name });
          } else {
            startTurnTimer(room);
          }
        }
        broadcast(room.id, 'turnTimeout', { pi: room.G.currentPlayer });
      }
    }
  }, 1000);
}

function clearTurnTimer(room) {
  if (room.turnTimerInterval) {
    clearInterval(room.turnTimerInterval);
    room.turnTimerInterval = null;
  }
  room.turnTimeLeft = null;
}

function broadcastTurnTimer(room) {
  broadcast(room.id, 'turnTimer', {
    timeLeft: room.turnTimeLeft,
    currentPlayer: room.G ? room.G.currentPlayer : null,
  });
}

function startMulligan(room) {
  const configs = room.players.map(p => p.deck);
  room.G = engine.createGame(configs);
  room.phase = 'mulligan';
  room.mulliganSels = [null, null];
  const first = room.G.currentPlayer;
  room.players.forEach((pl) => {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (!sock) return;
    sock.emit('coinFlip', { first, myPi: pl.pi });
  });
  setTimeout(() => {
    room.players.forEach((pl) => {
      const sock = io.sockets.sockets.get(pl.socketId);
      if (!sock) return;
      sock.emit('mulliganStart', { hand: room.G.players[pl.pi].hand, myPi: pl.pi });
    });
    console.log('mulligan started', room.id);
  }, 2400);
  console.log('coin flip: first =', first, room.id);
}

// ルーム状態確認（デバッグ用）
app.get('/debug-rooms', (req, res) => {
  const summary = Object.values(rooms).map(r => ({
    id: r.id,
    players: r.players.length,
    phase: r.phase,
  }));
  res.json(summary);
});


const PORT = process.env.PORT || 3000;
srv.listen(PORT, () => console.log(`🍳 Grimoire Server listening on port ${PORT}`));
