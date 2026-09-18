// ---------- Config ----------
const CELL_SIZE = 20;
const GRID_COLS = 20; // 400 / 20
const GRID_ROWS = 20;
const INITIAL_SPEED_MS = 130;

// ---------- Canvas setup ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');

// ---------- Game state ----------
let snake, direction, nextDirection, food, score, highscore;
let gameLoopId = null;
let isPaused = false;
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

// ---------- Toroidal wrap helper ----------
// This is the key piece: instead of ending the game when the snake
// goes off an edge, we wrap its coordinate to the opposite side.
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

  // Self-collision only (no wall collision, since the board is toroidal)
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

  // Food
  ctx.fillStyle = '#e94560';
  ctx.fillRect(
    food.x * CELL_SIZE + 2,
    food.y * CELL_SIZE + 2,
    CELL_SIZE - 4,
    CELL_SIZE - 4
  );

  // Snake
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#8fffb0' : '#4ecca3';
    ctx.fillRect(
      seg.x * CELL_SIZE + 1,
      seg.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2
    );
  });
}

function loop() {
  if (isPaused) return;
  update();
  if (isRunning) {
    draw();
    gameLoopId = setTimeout(loop, INITIAL_SPEED_MS);
  }
}

function startGame() {
  resetState();
  isRunning = true;
  isPaused = false;
  gameOverModal.classList.add('hidden');
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Pausa';
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
  pauseBtn.disabled = true;
}

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Reanudar' : 'Pausa';
  if (!isPaused) loop();
}

// ---------- Input handling ----------
const KEY_MAP = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

window.addEventListener('keydown', (e) => {
  const newDir = KEY_MAP[e.key];
  if (!newDir) return;

  // Prevent reversing directly into itself
  const isOpposite =
    newDir.x === -direction.x && newDir.y === -direction.y;
  if (!isOpposite) {
    nextDirection = newDir;
  }

  if (e.key === ' ') togglePause();
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', startGame);

// Initial draw before the game starts
resetState();
draw();
