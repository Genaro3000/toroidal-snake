// This file only runs on game.html
import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CELL_SIZE = 20;
const GRID_COLS = 20;
const GRID_ROWS = 20;
const INITIAL_SPEED_MS = 135;
const BASE_POINTS = 10;

// Change this to whatever secret word you want in the URL,
// e.g. game.html?admin=ghost1234
const ADMIN_KEY = 'ghost1234';

// ---------- Souls (collectible types) ----------
// weight controls how often each one appears; higher = more common.
// category decides which info-panel tab it shows in ('active', 'villain', or 'both').
const SOULS = [
  {
    id: 'echo', name: 'Echo Soul', color: '#00c8ff', rarity: 'Common', weight: 25,
    category: 'active',
    description: 'Standard: gives normal points and grows your body.',
  },
  {
    id: 'purity', name: 'Purity Soul', color: '#fffbf2', rarity: 'Common', weight: 15,
    category: 'active',
    description: 'Antidote: instantly shrinks your body by 10%.',
  },
  {
    id: 'rush', name: 'Rush Soul', color: '#ed7300', rarity: 'Uncommon', weight: 7,
    category: 'active',
    description: 'Sprint: doubles your movement speed for 5 seconds.',
  },
  {
    id: 'bounty', name: 'Bounty Soul', color: '#f2ff00', rarity: 'Uncommon', weight: 6,
    category: 'active',
    description: 'Gold Rush: spawns 5 fast-fading mini-souls worth exponential bonus points for 5 seconds.',
  },
  {
    id: 'void', name: 'Void Soul', color: '#000000', glow: '#00c8ff', rarity: 'Uncommon', weight: 5,
    category: 'active',
    description: 'Ghost Mode: pass through your own body for 3 seconds.',
  },
  {
    id: 'slime', name: 'Slime Soul', color: '#00cf34', rarity: 'Rare', weight: 2,
    category: 'active',
    description: 'Sticky Trail: leaves slime behind you for 6 seconds. Crossing your own slime halves your speed.',
  },
  {
    id: 'hydra', name: 'Hydra Soul', color: '#ff0d00', rarity: 'Rare', weight: 1.5,
    category: 'active',
    description: 'Summons 2 ally heads that each chase down and consume one soul for x2 points, then vanish.',
  },
  {
    id: 'rift', name: 'Rift Soul', color: '#f200ae', rarity: 'Rare', weight: 1.5,
    category: 'active',
    description: 'Warp: scrambles the wrap-around edges for 8 seconds — exits connect to different sides than normal.',
  },
  {
    id: 'atomic', name: 'Atomic Soul', color: '#a17000', rarity: 'Legendary', weight: 0.6,
    category: 'active',
    description: 'Body Detonation: instantly destroys the back 50% of your tail for massive bonus points.',
  },
  {
    id: 'corruption', name: 'Corruption Soul', color: '#6000a1', rarity: 'Legendary', weight: 0.4,
    category: 'active',
    description: '10x points, but summons a bot snake that can end your run.',
  },
  {
    id: 'spider', name: 'Spider Soul', color: '#000000', border: '#960000', rarity: 'Common', weight: 12,
    category: 'villain',
    description: 'Web Trap: triggers a 5x5 cobweb. Your speed is reduced by 70% while you\'re touching it.',
  },
  {
    id: 'grave', name: 'Grave Soul', color: '#4d4d4d', border: '#000000', rarity: 'Common', weight: 8,
    category: 'villain',
    description: 'Tombstone Hazard: a grave appears where consumed for 10 seconds. Touching it is lethal.',
  },
  {
    id: 'mimic', name: 'Mimic Soul', color: '#63310d', border: '#7a2f00', rarity: 'Uncommon', weight: 0,
    category: 'villain',
    description: 'Danger: souls marked with a brown outline are lethal to touch for 5 seconds. After that, the mark fades and it becomes a normal, safe soul.',
  },
  {
    id: 'skeleton', name: 'Skeleton Soul', color: '#ffffff', border: '#8c8c8c', rarity: 'Uncommon', weight: 4,
    category: 'villain',
    description: 'Solid Boundaries: all edges become solid walls for 6 seconds. Hitting one ends your run.',
  },
  {
    id: 'phantom', name: 'Phantom Soul', color: '#00008c', border: '#46de00', rarity: 'Uncommon', weight: 4,
    category: 'villain',
    description: 'Haunted Decoy: spawns an autonomous ghost that travels in a straight line. Touching its path subtracts 50% of your points.',
  },
  {
    id: 'mummy', name: 'Mummy Soul', color: '#ffdd9e', border: '#ffffff', rarity: 'Uncommon', weight: 4,
    category: 'villain',
    description: 'Wrapped Stiff: for 6 seconds your snake turns bandage-colored and its speed randomly bursts fast/slow in 3 two-second phases.',
  },
  {
    id: 'bloody', name: 'Bloody Soul', color: '#591800', border: '#bd1600', rarity: 'Rare', weight: 1.5,
    category: 'villain',
    description: 'Blood Trail: leaves a fatal trace of blood behind you for 5 seconds. Touching old blood is lethal.',
  },
  {
    id: 'shadow', name: 'Shadow Soul', color: '#0a004d', border: '#000000', rarity: 'Rare', weight: 1.5,
    category: 'villain',
    description: 'Doppelganger: a shadow clone of your snake attaches right behind you, one cell apart, for 7 seconds. Touching it is lethal.',
  },
  {
    id: 'zombie', name: 'Zombie Soul', color: '#2cde00', border: '#ff26f1', rarity: 'Legendary', weight: 0.6,
    category: 'villain',
    description: 'Inversion: reverses your controls for 4 seconds.',
  },
  {
    id: 'blindness', name: 'Blindness Soul', color: '#000000', border: '#1c004a', rarity: 'Legendary', weight: 0.4,
    category: 'villain',
    description: 'Fog of War: reduces your sight to just your head for 6 seconds. Everything else turns pitch black.',
  },
];

// ---------- Collectibles (cosmetic unlocks, separate from souls) ----------
// They roll on their own (they never replace a soul), can sit on the board at
// the same time as a soul, and vanish if not grabbed in COLLECTIBLE_LIFETIME_MS.
// Once unlocked, a collectible stops spawning and shows as obtained in the info panel.
const COLLECTIBLE_CHANCE = 0.005;        // per locked collectible, rolled every time a soul spawns
const COLLECTIBLE_LIFETIME_MS = 15000;
const COLLECTIBLES = [
  {
    id: 'pumpkin', emoji: '🎃', name: "Jack-o'-Pattern",
    description: 'Unlocks an orange-and-black checkered pattern for your snake (2 orange squares, 1 black, repeating).',
  },
  { id: 'bat', emoji: '🦇', name: 'Bat Crown', description: '' },
  {
    id: 'zombie', emoji: '🧟', name: 'Zombie Flesh',
    description: 'Unlocks a zombie skin: pink head, body in varying shades of green.',
  },
  {
    id: 'grave', emoji: '🪦', name: 'Grave Mark',
    description: 'Unlocks customizable traces.',
  },
  {
    id: 'candy', emoji: '🍬', name: 'Candy Palette',
    description: 'Unlocks a colorful pattern for your snake.',
  },
  {
    id: 'moon', emoji: '🌕', name: 'Moon Orb',
    description: 'Changes your snake\'s squared body shape to a rounded one.',
  },
  {
    id: 'crescent', emoji: '🌙', name: 'Crescent Tip',
    description: 'Changes the final tip of your snake to a triangular shape.',
  },
  { id: 'mage', emoji: '🧙', name: 'Mage Glow', description: '' },
  { id: 'wolf', emoji: '🐺', name: 'Wolf Charm', description: '' },
  { id: 'house', emoji: '🏚️', name: 'Haunted Mansion', description: '' },
];

function getUnlockedCollectibles() {
  try {
    return JSON.parse(localStorage.getItem('unlockedCollectibles') || '[]');
  } catch {
    return [];
  }
}

function unlockCollectible(id) {
  const unlocked = getUnlockedCollectibles();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem('unlockedCollectibles', JSON.stringify(unlocked));
  }
}

// Low chance that any newly spawned soul gets marked as a Mimic.
// (Mimic isn't a real spawnable food — it's a mark applied to whichever
// soul spawns — so its "10%" from the design list is used as this chance.)
const MIMIC_CHANCE = 0.06;
const MIMIC_DURATION_MS = 5000;

function pickWeightedSoul() {
  const pickable = SOULS.filter(s => s.weight > 0);
  const total = pickable.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of pickable) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return pickable[0];
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
const soulsTabs = document.querySelectorAll('.souls-tab');
const adminPanel = document.getElementById('adminPanel');
const adminToggleBtn = document.getElementById('adminToggleBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const adminLengthInput = document.getElementById('adminLengthInput');
const adminSetLengthBtn = document.getElementById('adminSetLengthBtn');
const adminSoulButtons = document.getElementById('adminSoulButtons');
const adminCollectibleButtons = document.getElementById('adminCollectibleButtons');
const adminResetCollectiblesBtn = document.getElementById('adminResetCollectiblesBtn');

// ---------- Game state ----------
let snake, direction, nextDirection, food, score, highscore;
let gameLoopId = null;
let nextTickAt = 0; // scheduled time of the next tick, used to keep the pace steady
let isRunning = false;

// Status-effect state
let speedMultiplier = 1;
let controlsInverted = false;
let ghostMode = false;
let botCells = [];
let slimeActive = false;
let slimeCells = new Set();
let nextTickSlowed = false;
let miniSouls = [];
let riftActive = false;

// Villain-souls state
let spiderWebCells = [];       // {x,y,expiresAt}
let nextTickWebSlowed = false;
let blindnessActive = false;
let skeletonActive = false;
let phantom = null;            // {x,y,dx,dy,path:Set}
let graveCells = [];           // {x,y,expiresAt}
let mummyActive = false;
let mummySpeedMultiplier = 1;
let bloodyActive = false;
let bloodCells = new Set();
let shadowActive = false;
let shadowLength = 0;          // how many segments the shadow clone has
let pathHistory = [];          // every cell the head has visited, newest first
let hydraActive = false;
let hydraAllies = [];          // [{x,y}, {x,y}]
let activeCollectibles = [];   // [{x,y,collectible,expiresAt}] — independent from the soul on the board

let rushTimeout, chaosTimeout, voidTimeout, botTimeout, slimeTimeout,
  miniSoulsTimeout, riftTimeout, blindnessTimeout,
  zombieTimeout, skeletonTimeout, phantomTimeout,
  mummyTimeout, bloodyTimeout, shadowTimeout, hydraTimeout, mummyBurstTimeout;

highscore = Number(localStorage.getItem('snakeHighscore') || 0);
highscoreEl.textContent = highscore;

function resetState() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  // Path history starts with the snake itself, plus a virtual straight trail
  // behind it so a Shadow Soul eaten right away still has room to appear.
  pathHistory = snake.map(seg => ({ x: seg.x, y: seg.y }));
  for (let i = 1; i <= 100; i++) {
    pathHistory.push({ x: (((8 - i) % GRID_COLS) + GRID_COLS) % GRID_COLS, y: 10 });
  }
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = score;

  speedMultiplier = 1;
  controlsInverted = false;
  ghostMode = false;
  botCells = [];
  slimeActive = false;
  slimeCells = new Set();
  nextTickSlowed = false;
  miniSouls = [];
  riftActive = false;
  canvas.classList.remove('rift-active');
  canvas.classList.remove('skeleton-active');

  spiderWebCells = [];
  nextTickWebSlowed = false;
  blindnessActive = false;
  skeletonActive = false;
  phantom = null;
  graveCells = [];
  mummyActive = false;
  mummySpeedMultiplier = 1;
  bloodyActive = false;
  bloodCells = new Set();
  shadowActive = false;
  shadowLength = 0;
  hydraActive = false;
  hydraAllies = [];
  activeCollectibles = [];

  clearTimeout(rushTimeout);
  clearTimeout(chaosTimeout);
  clearTimeout(voidTimeout);
  clearTimeout(botTimeout);
  clearTimeout(slimeTimeout);
  clearTimeout(miniSoulsTimeout);
  clearTimeout(riftTimeout);
  clearTimeout(blindnessTimeout);
  clearTimeout(mummyTimeout);
  clearTimeout(mummyBurstTimeout);
  clearTimeout(bloodyTimeout);
  clearTimeout(shadowTimeout);
  clearTimeout(hydraTimeout);
  clearTimeout(zombieTimeout);
  clearTimeout(skeletonTimeout);
  clearTimeout(phantomTimeout);

  placeFood();
}

// The toroidal wrap-around: instead of ending the game at an edge,
// snap the coordinate to the opposite side.
function wrap(value, max) {
  if (value < 0) return max - 1;
  if (value >= max) return 0;
  return value;
}

// Rift Soul's scrambled wrap: exiting one edge enters a DIFFERENT
// edge than usual, in a fixed rotation: top -> right -> bottom -> left -> top.
function riftWrap(rawX, rawY) {
  const N = GRID_COLS; // grid is square, so this works for both axes
  if (rawY < 0) return { x: N - 1, y: wrap(rawX, N) };   // exit top -> enter right
  if (rawX >= N) return { x: wrap(rawY, N), y: N - 1 };  // exit right -> enter bottom
  if (rawY >= N) return { x: 0, y: wrap(rawX, N) };      // exit bottom -> enter left
  if (rawX < 0) return { x: wrap(rawY, N), y: 0 };       // exit left -> enter top
  return { x: rawX, y: rawY };
}

// Returns the next head position, or null if Skeleton Soul's solid
// walls make this move fatal.
function computeNextHead() {
  const rawX = snake[0].x + direction.x;
  const rawY = snake[0].y + direction.y;

  if (skeletonActive) {
    if (rawX < 0 || rawX >= GRID_COLS || rawY < 0 || rawY >= GRID_ROWS) {
      return null; // hit a solid wall
    }
    return { x: rawX, y: rawY };
  }

  if (riftActive) {
    return riftWrap(rawX, rawY);
  }

  return { x: wrap(rawX, GRID_COLS), y: wrap(rawY, GRID_ROWS) };
}

function placeFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_COLS),
      y: Math.floor(Math.random() * GRID_ROWS),
      type: pickWeightedSoul(),
      isMimic: false,
      mimicExpiresAt: 0,
    };
  } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));

  if (Math.random() < MIMIC_CHANCE) {
    newFood.isMimic = true;
    newFood.mimicExpiresAt = Date.now() + MIMIC_DURATION_MS;
  }

  food = newFood;

  // Collectibles roll separately and can appear alongside the soul.
  maybeSpawnCollectibles();
}

function spawnCollectible(collectible) {
  let cell;
  let attempts = 0;
  do {
    cell = {
      x: Math.floor(Math.random() * GRID_COLS),
      y: Math.floor(Math.random() * GRID_ROWS),
    };
    attempts++;
  } while (
    attempts < 60 &&
    (snake.some(seg => seg.x === cell.x && seg.y === cell.y) ||
      (food && food.x === cell.x && food.y === cell.y) ||
      activeCollectibles.some(a => a.x === cell.x && a.y === cell.y))
  );

  activeCollectibles.push({
    x: cell.x,
    y: cell.y,
    collectible,
    expiresAt: Date.now() + COLLECTIBLE_LIFETIME_MS,
  });
}

function maybeSpawnCollectibles() {
  const unlocked = getUnlockedCollectibles();
  COLLECTIBLES.forEach(c => {
    if (unlocked.includes(c.id)) return;
    if (activeCollectibles.some(a => a.collectible.id === c.id)) return;
    if (Math.random() < COLLECTIBLE_CHANCE) {
      spawnCollectible(c);
    }
  });
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

function spawnMiniSouls() {
  miniSouls = [];
  const values = [10, 20, 40, 80, 160]; // exponential bonus
  for (let i = 0; i < 5; i++) {
    let cell;
    let attempts = 0;
    do {
      cell = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS),
      };
      attempts++;
    } while (
      attempts < 30 &&
      (snake.some(seg => seg.x === cell.x && seg.y === cell.y) ||
        (food.x === cell.x && food.y === cell.y) ||
        miniSouls.some(m => m.x === cell.x && m.y === cell.y))
    );
    miniSouls.push({ x: cell.x, y: cell.y, value: values[i] });
  }
  clearTimeout(miniSoulsTimeout);
  miniSoulsTimeout = setTimeout(() => { miniSouls = []; }, 5000);
}

function spawnSpiderWeb(atX, atY) {
  const cells = [];
  const expiresAt = Date.now() + 8000;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      cells.push({ x: wrap(atX + dx, GRID_COLS), y: wrap(atY + dy, GRID_ROWS), expiresAt });
    }
  }
  spiderWebCells.push(...cells);
}

function spawnGrave(atX, atY) {
  graveCells.push({ x: atX, y: atY, expiresAt: Date.now() + 10000 });
}

function spawnPhantom() {
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const dir = dirs[Math.floor(Math.random() * dirs.length)];
  phantom = {
    x: Math.floor(Math.random() * GRID_COLS),
    y: Math.floor(Math.random() * GRID_ROWS),
    dx: dir.x,
    dy: dir.y,
    path: new Set(),
  };
  clearTimeout(phantomTimeout);
  phantomTimeout = setTimeout(() => { phantom = null; }, 8000);
}

// The Shadow Soul's clone: same length as your snake was when you ate it,
// following your exact path, with ONE empty cell between your tail and it.
function getShadowCells() {
  if (!shadowActive) return [];
  const start = snake.length + 1; // +1 = the gap cell
  return pathHistory.slice(start, start + shadowLength);
}

function scheduleMummyBursts() {
  const options = [0.35, 0.5, 0.7, 1.6, 2, 2.4]; // slow...fast, picked randomly
  const pickBurst = () => options[Math.floor(Math.random() * options.length)];

  mummySpeedMultiplier = pickBurst();
  clearTimeout(mummyBurstTimeout);

  let remainingBursts = 2; // 2 more changes after this first one = 3 total
  function nextBurst() {
    mummyBurstTimeout = setTimeout(() => {
      mummySpeedMultiplier = pickBurst();
      remainingBursts--;
      if (remainingBursts > 0) nextBurst();
    }, 2000);
  }
  nextBurst();
}

function spawnHydraAllies() {
  hydraAllies = [
    { x: Math.floor(Math.random() * GRID_COLS), y: Math.floor(Math.random() * GRID_ROWS) },
    { x: Math.floor(Math.random() * GRID_COLS), y: Math.floor(Math.random() * GRID_ROWS) },
  ];
  hydraActive = true;
  clearTimeout(hydraTimeout);
  hydraTimeout = setTimeout(() => {
    hydraActive = false;
    hydraAllies = [];
  }, 10000);
}

function applySoulEffect(type, atX, atY) {
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

    case 'bounty':
      score += BASE_POINTS;
      spawnMiniSouls();
      break;

    case 'chaos':
      score += BASE_POINTS;
      controlsInverted = true;
      clearTimeout(chaosTimeout);
      chaosTimeout = setTimeout(() => { controlsInverted = false; }, 7000);
      break;

    case 'slime':
      score += BASE_POINTS;
      slimeActive = true;
      clearTimeout(slimeTimeout);
      slimeTimeout = setTimeout(() => {
        slimeActive = false;
        slimeCells = new Set();
      }, 6000);
      break;

    case 'void':
      score += BASE_POINTS;
      ghostMode = true;
      clearTimeout(voidTimeout);
      voidTimeout = setTimeout(() => { ghostMode = false; }, 3000);
      break;

    case 'rift':
      score += BASE_POINTS;
      riftActive = true;
      canvas.classList.add('rift-active');
      clearTimeout(riftTimeout);
      riftTimeout = setTimeout(() => {
        riftActive = false;
        canvas.classList.remove('rift-active');
      }, 8000);
      break;

    case 'hydra':
      score += BASE_POINTS;
      spawnHydraAllies();
      break;

    case 'corruption':
      score += BASE_POINTS * 10;
      spawnBotSnake();
      break;

    case 'atomic': {
      const destroyCount = Math.min(
        Math.max(1, Math.floor(snake.length * 0.5)),
        snake.length - 1
      );
      for (let i = 0; i < destroyCount; i++) {
        snake.pop();
      }
      score += destroyCount * 30; // massive bonus per destroyed segment
      break;
    }

    case 'spider':
      score += BASE_POINTS;
      spawnSpiderWeb(atX, atY);
      break;

    case 'blindness':
      score += BASE_POINTS;
      blindnessActive = true;
      clearTimeout(blindnessTimeout);
      blindnessTimeout = setTimeout(() => { blindnessActive = false; }, 6000);
      break;

    case 'zombie':
      score += BASE_POINTS;
      controlsInverted = true;
      clearTimeout(zombieTimeout);
      zombieTimeout = setTimeout(() => { controlsInverted = false; }, 4000);
      break;

    case 'skeleton':
      score += BASE_POINTS;
      skeletonActive = true;
      canvas.classList.add('skeleton-active');
      clearTimeout(skeletonTimeout);
      skeletonTimeout = setTimeout(() => {
        skeletonActive = false;
        canvas.classList.remove('skeleton-active');
      }, 6000);
      break;

    case 'phantom':
      score += BASE_POINTS;
      spawnPhantom();
      break;

    case 'grave':
      score += BASE_POINTS;
      spawnGrave(atX, atY);
      break;

    case 'mummy':
      score += BASE_POINTS;
      mummyActive = true;
      scheduleMummyBursts();
      clearTimeout(mummyTimeout);
      mummyTimeout = setTimeout(() => {
        mummyActive = false;
        mummySpeedMultiplier = 1;
        clearTimeout(mummyBurstTimeout);
      }, 6000);
      break;

    case 'bloody':
      score += BASE_POINTS;
      bloodyActive = true;
      clearTimeout(bloodyTimeout);
      bloodyTimeout = setTimeout(() => {
        bloodyActive = false;
        bloodCells = new Set();
      }, 5000);
      break;

    case 'shadow':
      score += BASE_POINTS;
      shadowActive = true;
      shadowLength = snake.length; // a clone of your snake, as long as it is right now
      clearTimeout(shadowTimeout);
      shadowTimeout = setTimeout(() => {
        shadowActive = false;
        shadowLength = 0;
      }, 7000);
      break;
  }
  scoreEl.textContent = score;
}

function update() {
  direction = nextDirection;

  // Mimic's brown outline fades after its timer runs out — it just
  // becomes an ordinary, unmarked soul of the same type.
  if (food.isMimic && Date.now() > food.mimicExpiresAt) {
    food.isMimic = false;
  }

  // Clear expired hazards
  const now = Date.now();
  spiderWebCells = spiderWebCells.filter(c => c.expiresAt > now);
  activeCollectibles = activeCollectibles.filter(a => a.expiresAt > now);
  graveCells = graveCells.filter(c => c.expiresAt > now);

  const head = computeNextHead();
  if (head === null) {
    return gameOver(); // Skeleton Soul: hit a solid wall
  }

  const hitSelf = !ghostMode && snake.some(seg => seg.x === head.x && seg.y === head.y);
  const hitBot = botCells.some(c => c.x === head.x && c.y === head.y);
  const hitGrave = graveCells.some(c => c.x === head.x && c.y === head.y);
  const hitLethalMimic = food.isMimic && head.x === food.x && head.y === food.y;
  const hitBlood = bloodyActive && bloodCells.has(`${head.x},${head.y}`);

  const hitShadow = shadowActive && getShadowCells().some(c => c.x === head.x && c.y === head.y);

  if (hitSelf || hitBot || hitGrave || hitLethalMimic || hitBlood || hitShadow) {
    return gameOver();
  }

  // Slime slows the NEXT tick if you're about to land on your own trail
  nextTickSlowed = slimeActive && slimeCells.has(`${head.x},${head.y}`);

  // Spider's web slows you only while you're actually standing on it
  nextTickWebSlowed = spiderWebCells.some(c => c.x === head.x && c.y === head.y);

  snake.unshift(head);

  pathHistory.unshift({ x: head.x, y: head.y });
  if (pathHistory.length > 1000) pathHistory.length = 1000;

  if (slimeActive) {
    snake.forEach(seg => slimeCells.add(`${seg.x},${seg.y}`));
  }

  if (bloodyActive) {
    snake.forEach(seg => bloodCells.add(`${seg.x},${seg.y}`));
  }

  // Move the Phantom ghost and check if its current cell or trail hits us
  if (phantom) {
    phantom.x = wrap(phantom.x + phantom.dx, GRID_COLS);
    phantom.y = wrap(phantom.y + phantom.dy, GRID_ROWS);
    phantom.path.add(`${phantom.x},${phantom.y}`);

    if (phantom.path.has(`${head.x},${head.y}`)) {
      score = Math.floor(score / 2);
      scoreEl.textContent = score;
      clearTimeout(phantomTimeout);
      phantom = null;
    }
  }

  // Mini-souls from Bounty Soul can be picked up any tick they're on the board
  const miniIndex = miniSouls.findIndex(m => m.x === head.x && m.y === head.y);
  if (miniIndex !== -1) {
    score += miniSouls[miniIndex].value;
    scoreEl.textContent = score;
    miniSouls.splice(miniIndex, 1);
  }

  // Collectibles are not souls: picking one up unlocks it, gives a small
  // bonus, and does NOT grow the snake or replace the soul on the board.
  const collectibleIndex = activeCollectibles.findIndex(a => a.x === head.x && a.y === head.y);
  if (collectibleIndex !== -1) {
    unlockCollectible(activeCollectibles[collectibleIndex].collectible.id);
    activeCollectibles.splice(collectibleIndex, 1);
    score += BASE_POINTS;
    scoreEl.textContent = score;
  }

  if (head.x === food.x && head.y === food.y) {
    if (food.isMimic) {
      return gameOver(); // Mimic Soul: eating it while marked is instant death
    }
    const eatenX = food.x;
    const eatenY = food.y;
    applySoulEffect(food.type, eatenX, eatenY);
    placeFood();
  } else {
    snake.pop();
  }

  // Hydra allies chase the current soul on their own; whatever they reach
  // gives you double points automatically. Each ally only gets ONE catch,
  // then it disappears — otherwise this would farm infinite points.
  if (hydraActive) {
    const survivors = [];
    hydraAllies.forEach(ally => {
      const dx = food.x - ally.x;
      const dy = food.y - ally.y;
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
        ally.x = wrap(ally.x + Math.sign(dx), GRID_COLS);
      } else if (dy !== 0) {
        ally.y = wrap(ally.y + Math.sign(dy), GRID_ROWS);
      }
      if (!food.isMimic && ally.x === food.x && ally.y === food.y) {
        score += BASE_POINTS * 2;
        scoreEl.textContent = score;
        placeFood();
        // ally used up its one catch — don't add it back, it vanishes
      } else {
        survivors.push(ally);
      }
    });
    hydraAllies = survivors;
    if (hydraAllies.length === 0) {
      hydraActive = false;
      clearTimeout(hydraTimeout);
    }
  }
}

function drawGameContents() {
  // Slime trail (drawn first, underneath everything)
  if (slimeActive) {
    ctx.fillStyle = 'rgba(57, 255, 20, 0.25)';
    slimeCells.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    });
  }

  // Blood trail (lethal — drawn with a warning-red tint)
  if (bloodyActive) {
    ctx.fillStyle = 'rgba(189, 22, 0, 0.45)';
    bloodCells.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    });
  }

  // Spider webs
  ctx.fillStyle = 'rgba(99, 49, 13, 0.35)';
  spiderWebCells.forEach(c => {
    ctx.fillRect(c.x * CELL_SIZE + 2, c.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  });

  // Graves
  ctx.fillStyle = '#3B3C36';
  graveCells.forEach(c => {
    ctx.fillRect(c.x * CELL_SIZE + 2, c.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.strokeStyle = '#63310d';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x * CELL_SIZE + 2, c.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  });

  // Bot snake obstacle (from Corruption Soul)
  ctx.fillStyle = '#661018';
  botCells.forEach(c => {
    ctx.fillRect(c.x * CELL_SIZE + 1, c.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });

  // Phantom ghost + its trail
  if (phantom) {
    ctx.fillStyle = 'rgba(75, 0, 130, 0.3)';
    phantom.path.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * CELL_SIZE + 4, y * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    });
    ctx.fillStyle = '#4B0082';
    ctx.fillRect(phantom.x * CELL_SIZE + 1, phantom.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  }

  // Shadow Soul: a full clone of your snake, one cell behind your tail
  if (shadowActive) {
    ctx.fillStyle = '#0a004d';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    getShadowCells().forEach(c => {
      ctx.fillRect(c.x * CELL_SIZE + 1, c.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.strokeRect(c.x * CELL_SIZE + 1, c.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });
  }

  // Mini-souls (from Bounty Soul)
  ctx.fillStyle = '#FFD700';
  miniSouls.forEach(m => {
    ctx.fillRect(m.x * CELL_SIZE + 6, m.y * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12);
  });

  // Soul (food)
  ctx.fillStyle = food.type.color;
  ctx.fillRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  const outline = food.type.border || food.type.glow;
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }
  if (food.isMimic) {
    ctx.strokeStyle = '#7a2f00';
    ctx.lineWidth = 3;
    ctx.strokeRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  // Collectibles: real emoji, independent from the soul
  if (activeCollectibles.length > 0) {
    ctx.font = `${CELL_SIZE - 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    activeCollectibles.forEach(a => {
      ctx.fillText(a.collectible.emoji, a.x * CELL_SIZE + CELL_SIZE / 2, a.y * CELL_SIZE + CELL_SIZE / 2 + 1);
    });
  }

  // Hydra allies
  if (hydraActive) {
    ctx.fillStyle = '#ff0d00';
    hydraAllies.forEach(a => {
      ctx.fillRect(a.x * CELL_SIZE + 3, a.y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    });
  }

  // Snake
  snake.forEach((seg, i) => {
    if (mummyActive) {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#ffdd9e';
    } else {
      ctx.fillStyle = i === 0 ? '#66ffcc' : '#00ff99';
    }
    ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (blindnessActive) {
    // Fill everything black, then only reveal a small circle around the head
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    const cx = (snake[0].x + 0.5) * CELL_SIZE;
    const cy = (snake[0].y + 0.5) * CELL_SIZE;
    ctx.arc(cx, cy, 0.7 * CELL_SIZE, 0, Math.PI * 2);
    ctx.clip();
    drawGameContents();
    ctx.restore();
  } else {
    drawGameContents();
  }
}

function loop() {
  update();
  if (isRunning) {
    draw();
    let delay = INITIAL_SPEED_MS / speedMultiplier;
    if (nextTickSlowed) delay *= 2;
    if (nextTickWebSlowed) delay /= 0.3; // 70% slower
    if (mummyActive) delay /= mummySpeedMultiplier;

    // Schedule against a fixed clock instead of "now + delay", so the time
    // spent running update/draw doesn't make some ticks slower than others.
    const now = performance.now();
    if (!nextTickAt || now - nextTickAt > delay * 3) nextTickAt = now; // first tick or tab was paused
    nextTickAt += delay;
    gameLoopId = setTimeout(loop, Math.max(0, nextTickAt - now));
  }
}

function startGame() {
  resetState();
  nextTickAt = 0;
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
    const scoreRef = doc(db, 'scores', name);
    const existing = await getDoc(scoreRef);
    const previousBest = existing.exists() ? existing.data().score : -1;

    if (finalScore > previousBest) {
      await setDoc(scoreRef, {
        name,
        score: finalScore,
        timestamp: serverTimestamp(),
      });
    }
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

// ---------- Keyboard controls (PC): arrows and WASD work together ----------
const KEY_DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },    KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },   KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },  KeyD: { x: 1, y: 0 },
};

window.addEventListener('keydown', (e) => {
  const dir = KEY_DIRECTIONS[e.code];
  if (!dir) return;

  // Don't hijack typing (e.g. the admin length box) or browser shortcuts like Ctrl+D
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  e.preventDefault(); // stops the arrow keys from scrolling the page
  setDirection(dir);
});

// ---------- Souls info panel (3 tabs) ----------
function renderSoulsList(tab) {
  if (tab === 'collectibles') {
    renderCollectiblesList();
    return;
  }

  const dataByTab = {
    active: SOULS.filter(s => s.category === 'active' || s.category === 'both'),
    villain: SOULS.filter(s => s.category === 'villain' || s.category === 'both'),
  };
  const list = dataByTab[tab] || [];

  soulsList.innerHTML = '';

  if (list.length === 0) {
    soulsList.innerHTML = '<li class="souls-empty">Coming soon...</li>';
    return;
  }

  list.forEach(s => {
    const li = document.createElement('li');
    const borderColor = s.border || s.color;
    li.innerHTML = `
      <span class="soul-dot" style="background:${s.color}; border: 2px solid ${borderColor}"></span>
      <div>
        <span class="soul-name">${s.name}</span><span class="soul-rarity">${s.rarity}</span>
        <div class="soul-effect">${s.description}</div>
      </div>
    `;
    soulsList.appendChild(li);
  });
}

function renderCollectiblesList() {
  const unlocked = getUnlockedCollectibles();
  soulsList.innerHTML = '';
  COLLECTIBLES.forEach(c => {
    const isUnlocked = unlocked.includes(c.id);
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="soul-dot collectible-emoji">${c.emoji}</span>
      <div>
        <span class="soul-name">${c.name}</span><span class="soul-rarity">0.5%</span>
        <div class="soul-effect">${c.description || 'Function TBD.'}</div>
        <div class="collectible-status ${isUnlocked ? 'unlocked' : ''}">${isUnlocked ? '✅ Already obtained' : '🔒 Locked'}</div>
      </div>
    `;
    soulsList.appendChild(li);
  });
}
renderSoulsList('active');

soulsTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    soulsTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSoulsList(btn.dataset.tab);
  });
});

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
      if (s.id === 'mimic') {
        food.isMimic = true;
        food.mimicExpiresAt = Date.now() + MIMIC_DURATION_MS;
      } else {
        applySoulEffect(s, snake[0].x, snake[0].y);
      }
      draw();
    });
    adminSoulButtons.appendChild(btn);
  });
}

function renderAdminCollectibleButtons() {
  adminCollectibleButtons.innerHTML = '';
  COLLECTIBLES.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = `${c.emoji} ${c.name}`;
    btn.addEventListener('click', () => {
      if (!snake || snake.length === 0) {
        alert('Start the game first.');
        return;
      }
      // Replace any copy already on the board, then spawn a fresh one
      activeCollectibles = activeCollectibles.filter(a => a.collectible.id !== c.id);
      spawnCollectible(c);
      draw();
    });
    adminCollectibleButtons.appendChild(btn);
  });
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === ADMIN_KEY) {
  adminToggleBtn.classList.remove('hidden');
  adminToggleBtn.addEventListener('click', () => adminPanel.classList.toggle('hidden'));
  closeAdminBtn.addEventListener('click', () => adminPanel.classList.add('hidden'));
  renderAdminSoulButtons();
  renderAdminCollectibleButtons();
  adminSetLengthBtn.addEventListener('click', () => {
    setSnakeLength(Number(adminLengthInput.value));
  });
  adminResetCollectiblesBtn.addEventListener('click', () => {
    localStorage.removeItem('unlockedCollectibles');
    alert('Unlocked collectibles reset.');
  });
}

// Draw an initial state before Start is pressed
resetState();
draw();
