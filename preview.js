// ---------- First-visit name prompt ----------
const nameModal = document.getElementById('nameModal');
const nameInput = document.getElementById('nameInput');
const nameSubmitBtn = document.getElementById('nameSubmitBtn');
const greetingEl = document.getElementById('greeting');

const savedName = localStorage.getItem('playerName');

if (savedName) {
  greetingEl.textContent = `Welcome back, ${savedName}!`;
  greetingEl.classList.remove('hidden');
} else {
  nameModal.classList.remove('hidden');
  nameInput.focus();
}

function saveName() {
  const value = nameInput.value.trim();
  if (!value) return;
  localStorage.setItem('playerName', value);
  nameModal.classList.add('hidden');
  greetingEl.textContent = `Welcome, ${value}!`;
  greetingEl.classList.remove('hidden');
}

nameSubmitBtn.addEventListener('click', saveName);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveName();
});

// ---------- Leaderboard (top 10, shared across everyone) — now a popup ----------
import { db } from './firebase-init.js';
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const leaderboardList = document.getElementById('leaderboardList');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');

async function loadLeaderboard() {
  leaderboardList.innerHTML = '<li>Loading...</li>';
  try {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(10));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      leaderboardList.innerHTML = '<li class="lb-empty">No scores yet — be the first!</li>';
      return;
    }

    leaderboardList.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement('li');
      li.innerHTML = `<span class="lb-name">${data.name}</span><span class="lb-score">${data.score}</span>`;
      leaderboardList.appendChild(li);
    });
  } catch (err) {
    leaderboardList.innerHTML = '<li class="lb-empty">Could not load leaderboard</li>';
    console.error('Leaderboard error:', err);
  }
}

leaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.remove('hidden');
  loadLeaderboard(); // fetch fresh each time it opens
});
closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.classList.add('hidden'));

// This file only runs on index.html — it just draws a static
// snake + food on the small preview canvas. No game logic here.
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const CELL = 15;

const snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
const food = { x: 5, y: 3 };

previewCtx.fillStyle = '#e94560';
previewCtx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

snake.forEach((seg, i) => {
  previewCtx.fillStyle = i === 0 ? '#66ffcc' : '#00ff99';
  previewCtx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
});
