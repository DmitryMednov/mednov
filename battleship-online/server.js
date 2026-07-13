// ===== Морской Бой: сервер =====
// Архитектура: Express раздаёт статику, Socket.IO держит real-time канал.
// Состояние игр — в памяти (Map). Для бесплатного хостинга этого достаточно.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Раздаём клиентский HTML/CSS/JS
app.use(express.static(path.join(__dirname, 'public')));

// Health check — Render проверяет что сервис жив
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size }));

// ===== Состояние =====
// rooms: код → { players: [{id, nick, grid, ships, ready, hits, misses}], turn, state, winner }
const rooms = new Map();

// Игровые константы
const SIZE = 10;
const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

// Генерация короткого уникального кода
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

// Проверка валидности расстановки флота от клиента
function validateFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) return false;
  // Каждый корабль — объект с массивом клеток [row, col] из целых чисел
  for (const ship of ships) {
    if (!ship || !Array.isArray(ship.cells) || !ship.cells.length) return false;
    for (const cell of ship.cells) {
      if (!Array.isArray(cell) || cell.length !== 2) return false;
      if (!Number.isInteger(cell[0]) || !Number.isInteger(cell[1])) return false;
    }
  }

  // Проверка длин кораблей
  const lengths = ships.map(s => s.cells.length).sort((a, b) => b - a);
  const expected = [...FLEET].sort((a, b) => b - a);
  if (JSON.stringify(lengths) !== JSON.stringify(expected)) return false;

  // Все клетки в пределах поля и уникальны
  const occupied = new Set();
  for (const ship of ships) {
    if (!Array.isArray(ship.cells)) return false;
    for (const [r, c] of ship.cells) {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      const key = `${r},${c}`;
      if (occupied.has(key)) return false;
      occupied.add(key);
    }
    // Корабль должен быть прямой линией
    const rows = ship.cells.map(c => c[0]);
    const cols = ship.cells.map(c => c[1]);
    const sameRow = rows.every(r => r === rows[0]);
    const sameCol = cols.every(c => c === cols[0]);
    if (!sameRow && !sameCol) return false;
  }

  // Корабли не должны касаться друг друга (включая диагонали)
  for (let i = 0; i < ships.length; i++) {
    for (const [r, c] of ships[i].cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
          // Эта клетка принадлежит текущему кораблю?
          if (ships[i].cells.some(([sr, sc]) => sr === nr && sc === nc)) continue;
          // Эта клетка — часть ДРУГОГО корабля?
          const otherShip = ships.findIndex((s, idx) =>
            idx !== i && s.cells.some(([sr, sc]) => sr === nr && sc === nc)
          );
          if (otherShip !== -1) return false;
        }
      }
    }
  }
  return true;
}

// Проверка: попал ли выстрел в корабль
function checkShot(ships, r, c) {
  for (const ship of ships) {
    const hitIdx = ship.cells.findIndex(([sr, sc]) => sr === r && sc === c);
    if (hitIdx !== -1) {
      ship.hits = ship.hits || new Set();
      ship.hits.add(`${r},${c}`);
      const sunk = ship.hits.size === ship.cells.length;
      return { hit: true, sunk, ship: sunk ? ship : null };
    }
  }
  return { hit: false };
}

// Проверка: все ли корабли потоплены
function allSunk(ships) {
  return ships.every(ship => ship.hits && ship.hits.size === ship.cells.length);
}

// Защита обработчиков: битые данные от клиента не должны ронять процесс
function safe(handler) {
  return (data, callback) => {
    try {
      handler(data || {}, typeof callback === 'function' ? callback : () => {});
    } catch (err) {
      console.error('[handler error]', err);
    }
  };
}

// ===== Socket.IO логика =====
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // --- Создать комнату ---
  socket.on('create_room', safe(({ nick }, callback) => {
    if (!nick || typeof nick !== 'string' || nick.length > 20) {
      return callback({ error: 'Ник обязателен (до 20 символов)' });
    }
    const code = generateCode();
    const room = {
      code,
      players: [{
        id: socket.id,
        nick: nick.trim(),
        ships: null,
        ready: false,
        shots: new Set() // куда этот игрок стрелял
      }],
      state: 'waiting', // waiting → setup → battle → finished
      turn: null,
      winner: null
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    console.log(`[room created] ${code} by ${nick}`);
    callback({ code, role: 'host' });
  }));

  // --- Подключиться к комнате ---
  socket.on('join_room', safe(({ nick, code }, callback) => {
    if (!nick || typeof nick !== 'string' || nick.length > 20) {
      return callback({ error: 'Ник обязателен (до 20 символов)' });
    }
    const roomCode = (code || '').toUpperCase().trim();
    const room = rooms.get(roomCode);
    if (!room) return callback({ error: 'Комната не найдена' });
    if (room.players.length >= 2) return callback({ error: 'Комната заполнена' });
    if (room.state !== 'waiting') return callback({ error: 'Игра уже идёт' });

    room.players.push({
      id: socket.id,
      nick: nick.trim(),
      ships: null,
      ready: false,
      shots: new Set()
    });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    // Переход к расстановке
    room.state = 'setup';
    const nicks = room.players.map(p => p.nick);
    io.to(roomCode).emit('opponent_joined', { nicks });
    console.log(`[room joined] ${roomCode} by ${nick}`);
    callback({ code: roomCode, role: 'guest', opponentNick: room.players[0].nick });
  }));

  // --- Игрок готов (прислал расстановку) ---
  socket.on('fleet_ready', safe(({ ships }, callback) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'setup') return callback?.({ error: 'Не в фазе расстановки' });

    if (!validateFleet(ships)) {
      return callback?.({ error: 'Некорректная расстановка флота' });
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return callback?.({ error: 'Игрок не найден' });

    player.ships = ships.map(s => ({ cells: s.cells, hits: new Set() }));
    player.ready = true;
    callback?.({ ok: true });

    // Сообщаем противнику, что этот готов
    socket.to(room.code).emit('opponent_ready');

    // Если оба готовы — начинаем бой
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.state = 'battle';
      room.turn = room.players[Math.floor(Math.random() * 2)].id;
      const turnNick = room.players.find(p => p.id === room.turn).nick;
      io.to(room.code).emit('battle_start', {
        turn: room.turn,
        turnNick
      });
      console.log(`[battle start] ${room.code}, first: ${turnNick}`);
    }
  }));

  // --- Выстрел ---
  socket.on('shoot', safe(({ row, col }, callback) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'battle') return callback?.({ error: 'Не в фазе боя' });
    if (room.turn !== socket.id) return callback?.({ error: 'Не ваш ход' });
    if (!Number.isInteger(row) || !Number.isInteger(col) ||
        row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
      return callback?.({ error: 'Неверные координаты' });
    }

    const shooter = room.players.find(p => p.id === socket.id);
    const target = room.players.find(p => p.id !== socket.id);
    const shotKey = `${row},${col}`;

    if (shooter.shots.has(shotKey)) {
      return callback?.({ error: 'Уже стреляли сюда' });
    }
    shooter.shots.add(shotKey);

    const result = checkShot(target.ships, row, col);
    callback?.({ ok: true });

    const payload = {
      shooter: socket.id,
      shooterNick: shooter.nick,
      row,
      col,
      hit: result.hit,
      sunk: result.sunk,
      sunkShipCells: result.sunk ? result.ship.cells : null
    };

    // Проверка победы
    if (result.hit && allSunk(target.ships)) {
      room.state = 'finished';
      room.winner = socket.id;
      // Открываем флот проигравшего для анимации
      payload.gameOver = true;
      payload.winner = socket.id;
      payload.winnerNick = shooter.nick;
      payload.loserFleet = target.ships.map(s => s.cells);
      io.to(room.code).emit('shot_result', payload);
      console.log(`[game over] ${room.code}, winner: ${shooter.nick}`);
      return;
    }

    // Смена хода если промах; при попадании — стреляет снова
    if (!result.hit) {
      room.turn = target.id;
      payload.nextTurn = target.id;
      payload.nextTurnNick = target.nick;
    } else {
      payload.nextTurn = socket.id;
      payload.nextTurnNick = shooter.nick;
    }

    io.to(room.code).emit('shot_result', payload);
  }));

  // --- Запрос новой игры (после завершения) ---
  socket.on('rematch_request', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'finished') return;
    socket.to(room.code).emit('rematch_request', { nick: room.players.find(p => p.id === socket.id)?.nick });
  });

  socket.on('rematch_accept', () => {
    const room = rooms.get(socket.data.roomCode);
    // Реванш возможен только после завершённой игры с двумя игроками
    if (!room || room.state !== 'finished' || room.players.length !== 2) return;
    // Сброс
    room.state = 'setup';
    room.turn = null;
    room.winner = null;
    room.players.forEach(p => {
      p.ships = null;
      p.ready = false;
      p.shots = new Set();
    });
    io.to(room.code).emit('rematch_start');
    console.log(`[rematch] ${room.code}`);
  });

  // --- Выход / отключение ---
  socket.on('leave_room', () => handleDisconnect(socket));
  socket.on('disconnect', () => handleDisconnect(socket));
});

function handleDisconnect(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;

  const player = room.players.find(p => p.id === socket.id);
  room.players = room.players.filter(p => p.id !== socket.id);

  if (room.players.length === 0) {
    rooms.delete(code);
    console.log(`[room deleted] ${code}`);
  } else {
    // Сообщаем оставшемуся, что противник ушёл
    io.to(code).emit('opponent_left', { nick: player?.nick });
    // Если игра шла — засчитываем победу оставшемуся
    if (room.state === 'battle' || room.state === 'setup') {
      room.state = 'finished';
      room.winner = room.players[0].id;
    }
  }
  socket.data.roomCode = null;
}

// Очистка заброшенных комнат раз в час
setInterval(() => {
  const before = rooms.size;
  for (const [code, room] of rooms) {
    if (room.players.length === 0) rooms.delete(code);
  }
  if (before !== rooms.size) console.log(`[cleanup] ${before} → ${rooms.size} rooms`);
}, 60 * 60 * 1000);

// Graceful shutdown для Render
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing...');
  io.close(() => server.close(() => process.exit(0)));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚢 Battleship server on port ${PORT}`);
});
