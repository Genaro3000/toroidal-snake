// This file only runs on game.html
import { db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CELL_SIZE = 20;
const GRID_COLS = 20;
const GRID_ROWS = 20;
const INITIAL_SPEED_MS = 130;

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

let snake, direction, nextDirection, food, score, highscore;
let gameLoopId = null;
let isRunning = false;

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
    };
  } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
  food = newFood;
}

function update() {
  direction = nextDirection;

  const head = {
    x: wrap(snake[0].x + direction.x, GRID_COLS),
    y: wrap(snake[0].y + direction.y, GRID_ROWS),
  };

  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e94560';
  ctx.fillRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#66ffcc' : '#00ff99';
    ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });
}

function loop() {
  update();
  if (isRunning) {
    draw();
    gameLoopId = setTimeout(loop, INITIAL_SPEED_MS);
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

function setDirection(newDir) {
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

// Draw an initial empty-ish state before Start is pressed
resetState();
draw();
