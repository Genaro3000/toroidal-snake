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
  previewCtx.fillStyle = i === 0 ? '#8fffb0' : '#4ecca3';
  previewCtx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
});
