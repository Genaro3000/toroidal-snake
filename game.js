// This file only runs on game.html
import { db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CELL_SIZE = 20;
const GRID_COLS = 20;
const GRID_ROWS = 20;
const INITIAL_SPEED_MS = 130;
const BASE_POINTS = 10;

// Change this to whatever secret word you want in the URL,
// e.g. game.html?admin=ghost1234
const ADMIN_KEY = 'ghost1234';

// ---------- Souls (collectible types) ----------
// weight controls how often each one appears; higher = more common.
const SOULS = [
  {
    id: 'echo',
    name: 'Echo Soul',
    color: '#00F3FF',
    rarity: 'Common',
    weight: 45,
    description: 'Standard: gives normal points and grows your body.',
  },
  {
    id: 'purity',
    name: 'Purity Soul',
    color: '#39FF14',
    rarity: 'Common',
    weight: 25,
    description: 'Antidote: instantly shrinks your body by 10%.',
  },
  {
    id: 'rush',
    name: 'Rush Soul',
    color: '#FF5E00',
    rarity: 'Uncommon',
    weight: 15,
    description: 'Sprint: doubles your movement speed for 5 seconds.',
  },
  {
    id: 'chaos',
    name: 'Chaos Soul',
    color: '#8A2BE2',
    rarity: 'Rare',
    weight: 8,
    description: 'Inversion: reverses your controls for 7 seconds.',
  },
  {
    id: 'void',
    name: 'Void Soul',
    color: '#1A0033',
    glow: '#00F3FF',
    rarity: 'Rare',
    weight: 5,
    description: 'Ghost Mode: pass through your own body for 3 seconds.',
  },
  {
    id: 'corruption',
    name: 'Corruption Soul',
    color: '#FF003C',
    rarity: 'Legendary',
    weight: 2,
    description: '10x points, but summons a bot snake that can end your run.',
  },
];

function pickWeightedSoul() {
  const total = SOULS.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of SOULS) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return SOULS[0];
}

// ---------- DOM references ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const infoToggleBtn = document.getElementById('infoToggleBtn');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const soulsPanel = document.getElementById('soulsPanel');
const soulsList = document.getElementById('soulsList');
const adminPanel = document.getElementById('adminPanel');
const adminLengthInput = document.getElementById('adminLengthInput');
const adminSetLengthBtn = document.getElementById('adminSetLengthBtn');
const adminSoulButtons = document.getElementById('adminSoulButtons');

// ---------- Game state ----------
let snake, direction, nextDirection, food, score, highscore;
let gameLoopId = null;
let isRunning = false;

// Status-effect state
let speedMultiplier = 1;
let controlsInverted = false;
let ghostMode = false;
let botCells = [];
let rushTimeout, chaosTimeout, voidTimeout, botTimeout;

highscore = Number(localStorage.getItem('snakeHighscore') || 0);
highscoreEl.textContent = highscore;

function resetState() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = score;

  speedMultiplier = 1;
  controlsInverted = false;
  ghostMode = false;
  botCells = [];
  clearTimeout(rushTimeout);
  clearTimeout(chaosTimeout);
  clearTimeout(voidTimeout);
  clearTimeout(botTimeout);

  placeFood();
}

// The toroidal wrap-around: instead of ending the game at an edge,
// snap the coordinate to the opposite side.
function wrap(value, max) {
  if (value < 0) return max - 1;
  if (value >= max) return 0;
  return value;
}

function placeFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_COLS),
      y: Math.floor(Math.random() * GRID_ROWS),
      type: pickWeightedSoul(),
    };
  } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
  food = newFood;
}

function spawnBotSnake() {
  const cells = [];
  const bx = Math.floor(Math.random() * GRID_COLS);
  const by = Math.floor(Math.random() * GRID_ROWS);
  for (let i = 0; i < 3; i++) {
    cells.push({ x: wrap(bx + i, GRID_COLS), y: by });
  }
  botCells = cells;
  clearTimeout(botTimeout);
  botTimeout = setTimeout(() => { botCells = []; }, 8000);
}

function applySoulEffect(type) {
  switch (type.id) {
    case 'echo':
      score += BASE_POINTS;
      break;

    case 'purity': {
      score += BASE_POINTS;
      const shrinkBy = Math.max(1, Math.floor(snake.length * 0.1));
      for (let i = 0; i < shrinkBy && snake.length > 3; i++) {
        snake.pop();
      }
      break;
    }

    case 'rush':
      score += BASE_POINTS;
      speedMultiplier = 2;
      clearTimeout(rushTimeout);
      rushTimeout = setTimeout(() => { speedMultiplier = 1; }, 5000);
      break;

    case 'chaos':
      score += BASE_POINTS;
      controlsInverted = true;
      clearTimeout(chaosTimeout);
      chaosTimeout = setTimeout(() => { controlsInverted = false; }, 7000);
      break;

    case 'void':
      score += BASE_POINTS;
      ghostMode = true;
      clearTimeout(voidTimeout);
      voidTimeout = setTimeout(() => { ghostMode = false; }, 3000);
      break;

    case 'corruption':
      score += BASE_POINTS * 10;
      spawnBotSnake();
      break;
  }
  scoreEl.textContent = score;
}

function update() {
  direction = nextDirection;

  const head = {
    x: wrap(snake[0].x + direction.x, GRID_COLS),
    y: wrap(snake[0].y + direction.y, GRID_ROWS),
  };

  const hitSelf = !ghostMode && snake.some(seg => seg.x === head.x && seg.y === head.y);
  const hitBot = botCells.some(c => c.x === head.x && c.y === head.y);

  if (hitSelf || hitBot) {
    return gameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    const eatenType = food.type;
    applySoulEffect(eatenType);
    // Purity already removes segments itself; every other soul keeps
    // the newly-added head (net growth) by simply not popping the tail.
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Bot snake obstacle (from Corruption Soul)
  ctx.fillStyle = '#661018';
  botCells.forEach(c => {
    ctx.fillRect(c.x * CELL_SIZE + 1, c.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });

  // Soul (food)
  ctx.fillStyle = food.type.color;
  ctx.fillRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  if (food.type.glow) {
    ctx.strokeStyle = food.type.glow;
    ctx.lineWidth = 2;
    ctx.strokeRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  // Snake
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#66ffcc' : '#00ff99';
    ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });
}

function loop() {
  update();
  if (isRunning) {
    draw();
    gameLoopId = setTimeout(loop, INITIAL_SPEED_MS / speedMultiplier);
  }
}

function startGame() {
  resetState();
  isRunning = true;
  gameOverModal.classList.add('hidden');
  startBtn.disabled = true;
  draw();
  loop();
}

function gameOver() {
  isRunning = false;
  clearTimeout(gameLoopId);
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('snakeHighscore', highscore);
    highscoreEl.textContent = highscore;
  }
  finalScoreEl.textContent = score;
  gameOverModal.classList.remove('hidden');
  startBtn.disabled = false;
  submitScore(score);
}

async function submitScore(finalScore) {
  const name = localStorage.getItem('playerName') || 'Anonymous';
  try {
    await addDoc(collection(db, 'scores'), {
      name,
      score: finalScore,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('Could not save score to leaderboard', err);
  }
}

function setDirection(rawDir) {
  const newDir = controlsInverted
    ? { x: -rawDir.x, y: -rawDir.y }
    : rawDir;
  const isOpposite = newDir.x === -direction.x && newDir.y === -direction.y;
  if (!isOpposite) {
    nextDirection = newDir;
  }
}

// ---------- Buttons ----------
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
upBtn.addEventListener('click', () => setDirection({ x: 0, y: -1 }));
downBtn.addEventListener('click', () => setDirection({ x: 0, y: 1 }));
leftBtn.addEventListener('click', () => setDirection({ x: -1, y: 0 }));
rightBtn.addEventListener('click', () => setDirection({ x: 1, y: 0 }));

// ---------- Souls info panel ----------
function renderSoulsList() {
  soulsList.innerHTML = '';
  SOULS.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="soul-dot" style="background:${s.color}"></span>
      <div>
        <span class="soul-name">${s.name}</span><span class="soul-rarity">${s.rarity}</span>
        <div class="soul-effect">${s.description}</div>
      </div>
    `;
    soulsList.appendChild(li);
  });
}
renderSoulsList();

infoToggleBtn.addEventListener('click', () => soulsPanel.classList.toggle('hidden'));
closeInfoBtn.addEventListener('click', () => soulsPanel.classList.add('hidden'));

// ---------- Admin test panel (only shows with ?admin=KEY in the URL) ----------
function setSnakeLength(newLength) {
  if (!snake || snake.length === 0) {
    alert('Start the game first, then adjust the length.');
    return;
  }
  newLength = Math.max(1, Math.min(200, Math.floor(newLength)));
  while (snake.length < newLength) {
    const tail = snake[snake.length - 1];
    snake.push({ x: tail.x, y: tail.y });
  }
  while (snake.length > newLength) {
    snake.pop();
  }
  draw();
}

function renderAdminSoulButtons() {
  adminSoulButtons.innerHTML = '';
  SOULS.forEach(s => {
    const btn = document.createElement('button');
    btn.textContent = s.name;
    btn.style.borderColor = s.color;
    btn.addEventListener('click', () => {
      if (!snake || snake.length === 0) {
        alert('Start the game first.');
        return;
      }
      applySoulEffect(s);
      draw();
    });
    adminSoulButtons.appendChild(btn);
  });
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === ADMIN_KEY) {
  adminPanel.classList.remove('hidden');
  renderAdminSoulButtons();
  adminSetLengthBtn.addEventListener('click', () => {
    setSnakeLength(Number(adminLengthInput.value));
  });
}

// Draw an initial state before Start is pressed
resetState();
draw();
