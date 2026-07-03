// --- CONFIGURAZIONE BOT TELEGRAM ---
const TG_TOKEN = "8984169443:AAHCp6DAsKF6MTrih4QV-hmXHBrUGUPaz88";
const TG_CHAT_ID = "548217015";
const TARGET_SCORE = 20; // Obiettivo della partita

// --- ELEMENTI DOM ---
const startBtn = document.getElementById('start-btn');
const startContainer = document.getElementById('start-container');
const gameContainer = document.getElementById('game-container');
const victoryContainer = document.getElementById('victory-container');
const proposalContainer = document.getElementById('proposal-container');
const responseContainer = document.getElementById('response-container');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const progressFill = document.getElementById('progress-fill');
const targetDisplay = document.getElementById('target-display');

const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');
const buttonsWrapper = document.querySelector('.buttons-wrapper');
const heartGrid = document.getElementById('heart-grid');

const responseIcon = document.getElementById('response-icon');
const responseTitle = document.getElementById('response-title');
const responseText = document.getElementById('response-text');

// --- AUDIO ---
const gameMusic = document.getElementById('game-music');
const romanticMusic = document.getElementById('romantic-music');

// --- CANVAS PRINCIPALE ---
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

// --- CANVAS "PROSSIMO PEZZO" ---
const nextCanvas = document.getElementById('next-piece');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

targetDisplay.innerText = TARGET_SCORE;

let score = 0;
let level = 1;
let gameOverTriggered = false;
let gameStarted = false;

const COLORS = [null, '#ff2e63', '#00f5d4', '#ffd23f', '#7c4dff', '#ff9f1c', '#3d5afe', '#ff5252'];

// --- PEZZI ---
const PIECES = 'ILJOTSZ';

function createPiece(type) {
  if (type === 'T') return [[0, 0, 0], [1, 1, 1], [0, 1, 0]];
  if (type === 'O') return [[2, 2], [2, 2]];
  if (type === 'L') return [[0, 0, 3], [3, 3, 3], [0, 0, 0]];
  if (type === 'J') return [[4, 0, 0], [4, 4, 4], [0, 0, 0]];
  if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
  if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
  if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
}

function randomPieceType() {
  return PIECES[(PIECES.length * Math.random()) | 0];
}

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

const arena = createMatrix(12, 24);

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  next: randomPieceType(),
};

// --- DISEGNO ---
function drawCell(ctx, x, y, value) {
  ctx.fillStyle = COLORS[value];
  ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x, y, 1, 0.12);
  ctx.fillRect(x, y, 0.12, 1);
}

function drawMatrix(matrix, offset, ctx) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) drawCell(ctx, x + offset.x, y + offset.y, value);
    });
  });
}

function getGhostY() {
  const ghost = { x: player.pos.x, y: player.pos.y };
  while (!collide(arena, { matrix: player.matrix, pos: { x: ghost.x, y: ghost.y + 1 } })) {
    ghost.y++;
  }
  return ghost.y;
}

function drawGhost() {
  const ghostY = getGhostY();
  context.save();
  context.globalAlpha = 0.25;
  drawMatrix(player.matrix, { x: player.pos.x, y: ghostY }, context);
  context.restore();
}

function draw() {
  context.clearRect(0, 0, canvas.width / 20, canvas.height / 20);
  drawMatrix(arena, { x: 0, y: 0 }, context);
  drawGhost();
  drawMatrix(player.matrix, player.pos, context);
}

function drawNext() {
  nextContext.clearRect(0, 0, 4, 4);
  const shape = createPiece(player.next);
  const offsetX = shape[0].length === 2 ? 1 : shape.length === 4 ? 0 : 0.5;
  drawMatrix(shape, { x: offsetX, y: 0.5 }, nextContext);
}

// --- LOGICA ---
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

function collide(arena, player) {
  const m = player.matrix, o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
      if (m[y][x] !== 0 && (arena[y + o.y] === undefined)) return true;
    }
  }
  return false;
}

// Punteggio standard: 1 linea = 100, 2 = 300, 3 = 500, 4 (tetris) = 800, scalato per livello
const LINE_SCORES = [0, 100, 300, 500, 800];

function updateHUD() {
  scoreElement.innerText = score;
  levelElement.innerText = level;
  const pct = Math.min(100, (score / TARGET_SCORE) * 100);
  progressFill.style.width = pct + '%';
}

function arenaSweep() {
  let linesCleared = 0;

  for (let y = arena.length - 1; y >= 0; --y) {
    let rowFilled = true;
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) { rowFilled = false; break; }
    }
    if (rowFilled) {
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      y++;
      linesCleared++;
    }
  }

  if (linesCleared > 0) {
    score += (LINE_SCORES[linesCleared] || linesCleared * 200) * level;
    level = 1 + Math.floor(score / 400);
    dropInterval = Math.max(120, 1000 - (level - 1) * 90);
    updateHUD();
    checkWin();
  }
}

function checkWin() {
  if (score >= TARGET_SCORE && !gameOverTriggered) {
    return vittoriaGioco();
  }
  return false;
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    lockPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  player.pos.y = getGhostY();
  lockPiece();
  dropCounter = 0;
}

function lockPiece() {
  merge(arena, player);
  score += 10; // punti per ogni pezzo atterrato
  updateHUD();

  if (checkWin()) return;

  arenaSweep();
  playerReset();
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function playerReset() {
  player.matrix = createPiece(player.next);
  player.next = randomPieceType();
  drawNext();

  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    // Il campo è pieno prima di raggiungere il punteggio: la sorpresa arriva comunque.
    vittoriaGioco();
  }
}

function playerRotate() {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix);
      player.pos.x = pos;
      return;
    }
  }
}

function rotate(matrix) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  matrix.forEach(row => row.reverse());
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  if (gameOverTriggered || !gameStarted) return;

  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) playerDrop();

  draw();
  requestAnimationFrame(update);
}

// --- INPUT ---
document.addEventListener('keydown', event => {
  if (!gameStarted || gameOverTriggered) return;
  if (event.keyCode === 37) { playerMove(-1); event.preventDefault(); }
  if (event.keyCode === 39) { playerMove(1); event.preventDefault(); }
  if (event.keyCode === 40) { playerDrop(); event.preventDefault(); }
  if (event.keyCode === 38) { playerRotate(); event.preventDefault(); }
  if (event.keyCode === 32) { hardDrop(); event.preventDefault(); }
});

// Tastierino touch (unico modo di giocare su smartphone, dove non c'è tastiera)
function bindTouchButton(id, action) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', event => {
    event.preventDefault();
    if (gameStarted && !gameOverTriggered) action();
  }, { passive: false });
  el.addEventListener('click', () => {
    if (gameStarted && !gameOverTriggered) action();
  });
}

bindTouchButton('btn-left', () => playerMove(-1));
bindTouchButton('btn-right', () => playerMove(1));
bindTouchButton('btn-rotate', () => playerRotate());
bindTouchButton('btn-down', () => playerDrop());
bindTouchButton('btn-drop', () => hardDrop());

// Gesti sul campo di gioco: swipe orizzontale = muovi, swipe giù = tuffo, tap = ruota
(function setupSwipeControls() {
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  const SWIPE_THRESHOLD = 24; // px minimi per contare come swipe e non come tap
  const TAP_MAX_DURATION = 250; // ms

  canvas.addEventListener('touchstart', event => {
    if (!gameStarted || gameOverTriggered) return;
    const t = event.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
    event.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', event => {
    if (!gameStarted || gameOverTriggered) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const duration = Date.now() - touchStartTime;

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD && duration < TAP_MAX_DURATION) {
      playerRotate(); // tap breve = ruota
    } else if (Math.abs(dx) > Math.abs(dy)) {
      playerMove(dx > 0 ? 1 : -1); // swipe orizzontale = muovi di una colonna
    } else if (dy > SWIPE_THRESHOLD) {
      dy > SWIPE_THRESHOLD * 3 ? hardDrop() : playerDrop(); // swipe giù lungo = tuffo, corto = giù veloce
    }
    event.preventDefault();
  }, { passive: false });
})();

// --- AVVIO ---
startBtn.addEventListener('click', () => {
  startContainer.classList.add('hidden');
  gameContainer.classList.remove('hidden');

  gameMusic.play().catch(e => console.log('Audio bloccato:', e));

  gameStarted = true;
  playerReset();
  updateHUD();
  requestAnimationFrame(update);
});

// --- TRANSIZIONE DI VITTORIA ---
function vittoriaGioco() {
  if (gameOverTriggered) return true;
  gameOverTriggered = true;

  gameMusic.pause();
  gameContainer.classList.add('hidden');
  victoryContainer.classList.remove('hidden');

  setTimeout(() => {
    victoryContainer.classList.add('hidden');
    proposalContainer.classList.remove('hidden');
    romanticMusic.play().catch(e => console.log(e));
    buildHeart();
  }, 1900);

  return true;
}

// --- CUORE FATTO DI TETROMINI (elemento distintivo) ---
const HEART_MATRIX = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

function buildHeart() {
  if (heartGrid.childElementCount > 0) return; // costruito già una volta
  const palette = COLORS.slice(1);
  let delayIndex = 0;

  HEART_MATRIX.forEach((row, rowIndex) => {
    row.forEach(value => {
      const cell = document.createElement('div');
      if (value === 1) {
        cell.className = 'heart-cell';
        cell.style.background = palette[(rowIndex + delayIndex) % palette.length];
        cell.style.animationDelay = `${rowIndex * 60 + Math.random() * 80}ms`;
        delayIndex++;
      } else {
        cell.style.visibility = 'hidden';
      }
      heartGrid.appendChild(cell);
    });
  });
}

// --- EFFETTO FUGA DEL TASTO NO ---
// Il tasto scappa qualche volta per gioco, ma dopo alcuni tentativi si lascia
// finalmente premere: se lei insiste davvero, la risposta "no" viene comunque registrata.
const MAX_DODGES = 6;
let dodgeCount = 0;

noBtn.addEventListener('mouseover', () => scappaTastoNo(false));
noBtn.addEventListener('touchstart', event => {
  event.preventDefault();
  if (dodgeCount < MAX_DODGES) {
    scappaTastoNo(true);
  } else {
    inviaSceltaATelegram(false);
  }
}, { passive: false });
noBtn.addEventListener('click', event => {
  if (dodgeCount < MAX_DODGES) {
    event.preventDefault();
    scappaTastoNo(true);
  } else {
    inviaSceltaATelegram(false);
  }
});

function scappaTastoNo(fromClick) {
  if (dodgeCount >= MAX_DODGES) return;
  if (fromClick) dodgeCount++;

  const btnRect = noBtn.getBoundingClientRect();
  const maxX = window.innerWidth - btnRect.width - 24;
  const maxY = window.innerHeight - btnRect.height - 24;

  noBtn.style.position = 'fixed';
  noBtn.style.left = `${Math.max(24, Math.random() * maxX)}px`;
  noBtn.style.top = `${Math.max(24, Math.random() * maxY)}px`;
}

// --- INVIO RISPOSTA A TELEGRAM ---
let responseSent = false;

yesBtn.addEventListener('click', () => inviaSceltaATelegram(true));

function inviaSceltaATelegram(haDettoSi) {
  if (responseSent) return;
  responseSent = true;
  yesBtn.disabled = true;

  const risposta = haDettoSi ? 'HA DETTO SÌ! 💍❤️' : 'ha detto no… 💔';
  const messaggio = `🚨 PROPOSTA TETRIS\n${risposta}\nPunteggio finale: ${score} punti (livello ${level}).`;

  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: messaggio }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Risposta Telegram non valida');
      mostraSchermataRisposta(haDettoSi);
    })
    .catch(err => {
      console.error('Errore Telegram:', err);
      // Mostriamo comunque la schermata di conferma: l'esperienza non deve rompersi
      // per un problema di rete lato notifica.
      mostraSchermataRisposta(haDettoSi);
    });
}

function mostraSchermataRisposta(haDettoSi) {
  proposalContainer.classList.add('hidden');
  responseContainer.classList.remove('hidden');

  if (haDettoSi) {
    responseIcon.innerText = '🍒🦕';
    responseTitle.innerText = 'Ti amo!';
    responseText.innerText = 'Grazie per aver detto sì. Costruiamo casa un pezzo alla volta, insieme.';
  } else {
    responseIcon.innerText = '💌';
    responseTitle.innerText = 'Va bene così.';
    responseText.innerText = 'Grazie comunque per aver giocato fino alla fine.';
  }
}