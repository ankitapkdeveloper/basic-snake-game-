const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const messageElement = document.getElementById("message");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const controlButtons = document.querySelectorAll(".control");

const gridSize = 20;
const tileSize = canvas.width / gridSize;
const gameSpeed = 120;

let snake;
let food;
let direction;
let nextDirection;
let score;
let gameLoop;
let paused;
let gameOver;

function randomPosition() {
  return {
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize)
  };
}

function createFood() {
  let newFood;

  do {
    newFood = randomPosition();
  } while (snake.some(part => part.x === newFood.x && part.y === newFood.y));

  return newFood;
}

function resetGame() {
  clearInterval(gameLoop);

  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  paused = false;
  gameOver = false;

  scoreElement.textContent = score;
  pauseBtn.textContent = "Pause";
  messageElement.textContent = "Use arrow keys or the buttons below to play.";

  food = createFood();
  draw();

  gameLoop = setInterval(updateGame, gameSpeed);
}

function updateGame() {
  if (paused || gameOver) return;

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  const hitWall =
    head.x < 0 ||
    head.x >= gridSize ||
    head.y < 0 ||
    head.y >= gridSize;

  const hitSelf = snake.some(part => part.x === head.x && part.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = score;
    food = createFood();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  gameOver = true;
  clearInterval(gameLoop);
  messageElement.textContent = `Game Over! Your score: ${score}`;
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1;

  for (let i = 0; i <= gridSize; i++) {
    const p = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }

  // Food
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.arc(
    food.x * tileSize + tileSize / 2,
    food.y * tileSize + tileSize / 2,
    tileSize * 0.35,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Snake
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? "#7CFC00" : "#39b54a";
    ctx.fillRect(
      part.x * tileSize + 1,
      part.y * tileSize + 1,
      tileSize - 2,
      tileSize - 2
    );
  });
}

function changeDirection(newDirection) {
  if (gameOver) return;

  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const requested = directions[newDirection];
  if (!requested) return;

  // Prevent instant reversal.
  if (
    requested.x === -direction.x &&
    requested.y === -direction.y
  ) {
    return;
  }

  nextDirection = requested;
}

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right"
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    changeDirection(keyMap[event.key]);
  }
});

controlButtons.forEach(button => {
  button.addEventListener("click", () => {
    changeDirection(button.dataset.direction);
  });
});

pauseBtn.addEventListener("click", () => {
  if (gameOver) return;

  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  messageElement.textContent = paused ? "Game Paused" : "Game Resumed";
});

restartBtn.addEventListener("click", resetGame);

// Basic swipe controls for mobile
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    changeDirection(dx > 0 ? "right" : "left");
  } else {
    changeDirection(dy > 0 ? "down" : "up");
  }
}, { passive: true });

resetGame();
