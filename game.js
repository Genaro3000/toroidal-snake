// ---------- Config ----------
const CELL_SIZE = 20;
const GRID_COLS = 20; // 400 / 20
const GRID_ROWS = 20;
const INITIAL_SPEED_MS = 130;

// ---------- Screens ----------
const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const playBtn = document.getElementById('playBtn');
const restartBtn = document.getElementById('restartBtn');

// ---------- Canvas setup ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');

// ---------- Game state ----------
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

// ---------- Toroidal wrap helper ----------
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

// Shared drawing function so we can reuse it for both the real
// game canvas AND the small preview canvas on the home screen.
function drawOn(context, snakeData, foodData, cellSize) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  context.fillStyle = '#e94560';
  context.fillRect(
    foodData.x * cellSize + 2,
    foodData.y * cellSize + 2,
    cellSize - 4,
    cellSize - 4
  );

  snakeData.forEach((seg, i) => {
    context.fillStyle = i === 0 ? '#8fffb0' : '#4ecca3';
    context.fillRect(
      seg.x * cellSize + 1,
      seg.y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
  });
}

function draw() {
  drawOn(ctx, snake, food, CELL_SIZE);
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
}

// ---------- Static preview on the home screen (just decoration) ----------
const previewSnake = [
  { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 },
];
const previewFood = { x: 5, y: 3 };
const PREVIEW_CELL = 15;
drawOn(previewCtx, previewSnake, previewFood, PREVIEW_CELL);

// ---------- Screen switching ----------
playBtn.addEventListener('click', () => {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  startGame();
});

restartBtn.addEventListener('click', startGame);

// ---------- Touch controls (swipe) ----------
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  // Whichever axis moved more decides the swipe direction
  let newDir;
  if (Math.abs(dx) > Math.abs(dy)) {
    newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }

  const isOpposite = newDir.x === -direction.x && newDir.y === -direction.y;
  if (!isOpposite) {
    nextDirection = newDir;
  }
}, { passive: true });
