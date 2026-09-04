document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const gridSize = 20;
  const tileSize = canvas.width / gridSize;

  const homeScreen = document.getElementById("homeScreen");
  const gameScreen = document.getElementById("gameScreen");
  const settingsScreen = document.getElementById("settingsScreen");
  const modal = document.getElementById("gameOverModal");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const homeHighScoreEl = document.getElementById("homeHighScore");
  const gamesPlayedEl = document.getElementById("gamesPlayed");
  const messageEl = document.getElementById("gameMessage");

  let snake = [];
  let food = { x: 0, y: 0 };
  let direction = { x: 1, y: 0 };
  let pendingDirection = { x: 1, y: 0 };
  let score = 0;
  let timer = null;
  let paused = false;
  let gameOver = false;

  let highScore = Number(localStorage.getItem("snakeHighScore") || 0);
  let gamesPlayed = Number(localStorage.getItem("snakeGamesPlayed") || 0);
  let speed = Number(localStorage.getItem("snakeGameSpeed") || 120);
  let showGrid = localStorage.getItem("snakeShowGrid") !== "false";

  document.getElementById("speedSelect").value = String(speed);
  document.getElementById("gridToggle").checked = showGrid;

  function showScreen(screen) {
    homeScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    settingsScreen.classList.remove("active");
    screen.classList.add("active");
  }

  function updateStats() {
    highScoreEl.textContent = highScore;
    homeHighScoreEl.textContent = highScore;
    gamesPlayedEl.textContent = gamesPlayed;
  }

  function randomCell() {
    return { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
  }

  function placeFood() {
    let candidate;
    do {
      candidate = randomCell();
    } while (snake.some(part => part.x === candidate.x && part.y === candidate.y));
    food = candidate;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showGrid) {
      ctx.strokeStyle = "#1d2125";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        const p = i * tileSize;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
      }
    }

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(food.x * tileSize + tileSize / 2, food.y * tileSize + tileSize / 2, tileSize * 0.34, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach(function (part, index) {
      ctx.fillStyle = index === 0 ? "#8cff2f" : "#43c463";
      ctx.fillRect(part.x * tileSize + 2, part.y * tileSize + 2, tileSize - 4, tileSize - 4);
    });
  }

  function startGame() {
    clearInterval(timer);
    modal.classList.add("hidden");

    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    direction = {x:1,y:0};
    pendingDirection = {x:1,y:0};
    score = 0;
    paused = false;
    gameOver = false;

    placeFood();
    scoreEl.textContent = "0";
    messageEl.textContent = "Use swipe, buttons, or arrow keys.";
    document.getElementById("pauseBtn").textContent = "Pause";

    draw();
    timer = setInterval(gameTick, speed);
  }

  function gameTick() {
    if (paused || gameOver) return;

    direction = pendingDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
    const hitSnake = snake.some(part => part.x === head.x && part.y === head.y);

    if (hitWall || hitSnake) {
      finishGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function finishGame() {
    gameOver = true;
    clearInterval(timer);

    gamesPlayed += 1;
    localStorage.setItem("snakeGamesPlayed", String(gamesPlayed));

    const newHigh = score > highScore;
    if (newHigh) {
      highScore = score;
      localStorage.setItem("snakeHighScore", String(highScore));
    }

    updateStats();
    document.getElementById("finalScore").textContent = String(score);
    document.getElementById("newHighScoreText").classList.toggle("hidden", !newHigh);

    setTimeout(function () {
      modal.classList.remove("hidden");
    }, 250);
  }

  function changeDirection(name) {
    if (gameOver || paused) return;

    const directions = {
      up: {x:0,y:-1},
      down: {x:0,y:1},
      left: {x:-1,y:0},
      right: {x:1,y:0}
    };

    const requested = directions[name];
    if (!requested) return;

    if (requested.x === -direction.x && requested.y === -direction.y) return;
    pendingDirection = requested;
  }

  // Navigation buttons
  document.getElementById("playBtn").addEventListener("click", function () {
    showScreen(gameScreen);
    startGame();
  });

  document.getElementById("settingsBtn").addEventListener("click", function () {
    showScreen(settingsScreen);
  });

  document.getElementById("settingsBackBtn").addEventListener("click", function () {
    updateStats();
    showScreen(homeScreen);
  });

  function goHome() {
    clearInterval(timer);
    modal.classList.add("hidden");
    updateStats();
    showScreen(homeScreen);
  }

  document.getElementById("backBtn").addEventListener("click", goHome);
  document.getElementById("homeBtn").addEventListener("click", goHome);

  document.getElementById("restartBtn").addEventListener("click", startGame);
  document.getElementById("playAgainBtn").addEventListener("click", startGame);

  document.getElementById("pauseBtn").addEventListener("click", function () {
    if (gameOver) return;
    paused = !paused;
    this.textContent = paused ? "Resume" : "Pause";
    messageEl.textContent = paused ? "Game Paused" : "Game Resumed";
  });

  document.querySelectorAll(".control").forEach(function (button) {
    button.addEventListener("click", function () {
      changeDirection(button.dataset.direction);
    });
  });

  document.addEventListener("keydown", function (event) {
    const keys = { ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right" };
    if (keys[event.key]) {
      event.preventDefault();
      changeDirection(keys[event.key]);
    }
  });

  document.getElementById("speedSelect").addEventListener("change", function () {
    speed = Number(this.value);
    localStorage.setItem("snakeGameSpeed", String(speed));
    if (!gameOver && snake.length) {
      clearInterval(timer);
      timer = setInterval(gameTick, speed);
    }
  });

  document.getElementById("gridToggle").addEventListener("change", function () {
    showGrid = this.checked;
    localStorage.setItem("snakeShowGrid", String(showGrid));
    if (snake.length) draw();
  });

  document.getElementById("resetDataBtn").addEventListener("click", function () {
    if (!confirm("Delete your high score and games played?")) return;
    highScore = 0;
    gamesPlayed = 0;
    localStorage.removeItem("snakeHighScore");
    localStorage.removeItem("snakeGamesPlayed");
    updateStats();
    alert("Game data reset.");
  });

  let startX = 0, startY = 0;
  canvas.addEventListener("touchstart", function (event) {
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, {passive:true});

  canvas.addEventListener("touchend", function (event) {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? "right" : "left");
    } else {
      changeDirection(dy > 0 ? "down" : "up");
    }
  }, {passive:true});

  updateStats();
});
