/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Game Configuration ---
const PLAYER_WIDTH = 50;
const PLAYER_SPEED = 8;
const BRICK_WIDTH = 40;
const BRICK_HEIGHT = 20;

const DIFFICULTY_LEVELS = {
  very_easy: { initialSpeed: 1.8, spawnInterval: 800, speedIncrease: 0.18, speedInterval: 6000 },
  easy: { initialSpeed: 2.4, spawnInterval: 700, speedIncrease: 0.24, speedInterval: 5000 },
  normal: { initialSpeed: 3.0, spawnInterval: 600, speedIncrease: 0.30, speedInterval: 4500 },
  hard: { initialSpeed: 3.6, spawnInterval: 500, speedIncrease: 0.36, speedInterval: 4000 },
  very_hard: { initialSpeed: 4.2, spawnInterval: 400, speedIncrease: 0.42, speedInterval: 3500 },
};
type DifficultySetting = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

// --- DOM Elements ---
const root = document.getElementById('root')!;
root.innerHTML = `
  <div id="game-container">
    <div id="score-board">
        <p>점수: <span id="current-score">0</span></p>
        <p>최고 점수: <span id="high-score">0</span></p>
    </div>
    <button id="pause-button" class="hidden">||</button>
    <div id="player"></div>
    <div id="start-screen" class="overlay">
      <h1>벽돌 피하기</h1>
      <p>난이도를 선택하세요!</p>
      <div id="difficulty-selection">
        <button class="difficulty-btn" data-difficulty="very_easy">매우 쉬움</button>
        <button class="difficulty-btn" data-difficulty="easy">쉬움</button>
        <button class="difficulty-btn" data-difficulty="normal">보통</button>
        <button class="difficulty-btn" data-difficulty="hard">어려움</button>
        <button class="difficulty-btn" data-difficulty="very_hard">매우 어려움</button>
      </div>
    </div>
    <div id="game-over-screen" class="overlay hidden">
      <h1>게임 오버</h1>
      <p>최종 점수: <span id="final-score">0</span></p>
      <button id="restart-button">처음으로</button>
    </div>
    <div id="pause-screen" class="overlay hidden">
      <h1>일시정지</h1>
      <button id="resume-button">계속하기</button>
    </div>
  </div>
`;

const gameContainer = document.getElementById('game-container') as HTMLElement;
const player = document.getElementById('player') as HTMLElement;
const currentScoreEl = document.getElementById('current-score') as HTMLElement;
const highScoreEl = document.getElementById('high-score') as HTMLElement;
const startScreen = document.getElementById('start-screen') as HTMLElement;
const gameOverScreen = document.getElementById('game-over-screen') as HTMLElement;
const finalScoreEl = document.getElementById('final-score') as HTMLElement;
const difficultySelection = document.getElementById('difficulty-selection') as HTMLElement;
const restartButton = document.getElementById('restart-button') as HTMLButtonElement;
const pauseButton = document.getElementById('pause-button') as HTMLButtonElement;
const pauseScreen = document.getElementById('pause-screen') as HTMLElement;
const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;


// --- Game State ---
let playerX: number;
let score: number;
let highScore: number;
let brickSpeed: number;
let bricks: HTMLElement[] = [];
let keys: { [key: string]: boolean } = {};
let gameLoopId: number;
let brickSpawnTimer: number;
let speedIncreaseTimer: number;
let gameStartTime: number;
let isPaused = false;
let pauseStartTime: number;
let currentDifficulty: DifficultySetting;

// --- Initialization ---
function init() {
    loadHighScore();
    setupControls();
    difficultySelection.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('.difficulty-btn')) {
            const difficulty = target.dataset.difficulty as keyof typeof DIFFICULTY_LEVELS;
            if (difficulty) {
                startGame(DIFFICULTY_LEVELS[difficulty]);
            }
        }
    });
    restartButton.addEventListener('click', showStartScreen);
}

function showStartScreen() {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    pauseButton.classList.add('hidden');
}

function loadHighScore() {
    highScore = parseInt(localStorage.getItem('brickDodgerHighScore') || '0', 10);
    highScoreEl.textContent = highScore.toString();
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('brickDodgerHighScore', highScore.toString());
        highScoreEl.textContent = highScore.toString();
    }
}

function resetGame(initialSpeed: number) {
    // Reset state
    playerX = gameContainer.clientWidth / 2 - PLAYER_WIDTH / 2;
    score = 0;
    brickSpeed = initialSpeed;
    gameStartTime = Date.now();
    isPaused = false;

    // Reset DOM
    player.style.left = `${playerX}px`;
    currentScoreEl.textContent = '0';
    
    // Clear old elements and timers
    bricks.forEach(brick => brick.remove());
    bricks = [];
    clearInterval(brickSpawnTimer);
    clearInterval(speedIncreaseTimer);
    cancelAnimationFrame(gameLoopId);
}

function startGame(difficulty: DifficultySetting) {
    currentDifficulty = difficulty;
    resetGame(difficulty.initialSpeed);

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    pauseButton.classList.remove('hidden');

    brickSpawnTimer = window.setInterval(spawnBrick, difficulty.spawnInterval);
    speedIncreaseTimer = window.setInterval(() => {
        brickSpeed += difficulty.speedIncrease;
    }, difficulty.speedInterval);

    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- Game Loop ---
function gameLoop() {
    if (isPaused) return;

    updatePlayerPosition();
    updateBricks();
    updateScore();
    
    if (checkCollisions()) {
        endGame();
        return;
    }
    
    gameLoopId = requestAnimationFrame(gameLoop);
}

function updateScore() {
    score = Math.floor((Date.now() - gameStartTime) / 100);
    currentScoreEl.textContent = score.toString();
}

function updatePlayerPosition() {
    if (keys['ArrowLeft'] || keys['a']) {
        playerX -= PLAYER_SPEED;
    }
    if (keys['ArrowRight'] || keys['d']) {
        playerX += PLAYER_SPEED;
    }

    // Boundary checks
    if (playerX < 0) {
        playerX = 0;
    }
    if (playerX > gameContainer.clientWidth - PLAYER_WIDTH) {
        playerX = gameContainer.clientWidth - PLAYER_WIDTH;
    }

    player.style.left = `${playerX}px`;
}

function spawnBrick() {
    const brick = document.createElement('div');
    brick.className = 'brick';
    const brickX = Math.random() * (gameContainer.clientWidth - BRICK_WIDTH);
    brick.style.left = `${brickX}px`;
    brick.style.top = `-${BRICK_HEIGHT}px`;
    
    gameContainer.appendChild(brick);
    bricks.push(brick);
}

function updateBricks() {
    const containerHeight = gameContainer.clientHeight;
    for (let i = bricks.length - 1; i >= 0; i--) {
        const brick = bricks[i];
        const currentTop = parseFloat(brick.style.top);
        const newTop = currentTop + brickSpeed;
        
        if (newTop > containerHeight) {
            brick.remove();
            bricks.splice(i, 1);
        } else {
            brick.style.top = `${newTop}px`;
        }
    }
}

function checkCollisions(): boolean {
    const playerRect = player.getBoundingClientRect();
    for (const brick of bricks) {
        const brickRect = brick.getBoundingClientRect();
        if (
            playerRect.left < brickRect.right &&
            playerRect.right > brickRect.left &&
            playerRect.top < brickRect.bottom &&
            playerRect.bottom > brickRect.top
        ) {
            return true;
        }
    }
    return false;
}

function endGame() {
    cancelAnimationFrame(gameLoopId);
    clearInterval(brickSpawnTimer);
    clearInterval(speedIncreaseTimer);
    saveHighScore();

    finalScoreEl.textContent = score.toString();
    gameOverScreen.classList.remove('hidden');
    pauseButton.classList.add('hidden');
}

function pauseGame() {
    if (isPaused) return;
    isPaused = true;
    pauseStartTime = Date.now();
    cancelAnimationFrame(gameLoopId);
    clearInterval(brickSpawnTimer);
    clearInterval(speedIncreaseTimer);
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    const pausedDuration = Date.now() - pauseStartTime;
    gameStartTime += pausedDuration;

    pauseScreen.classList.add('hidden');

    brickSpawnTimer = window.setInterval(spawnBrick, currentDifficulty.spawnInterval);
    speedIncreaseTimer = window.setInterval(() => {
        brickSpeed += currentDifficulty.speedIncrease;
    }, currentDifficulty.speedInterval);

    gameLoopId = requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

// --- Controls ---
function setupControls() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const isGameRunning = !startScreen.classList.contains('hidden') && !gameOverScreen.classList.contains('hidden');
            if (isGameRunning) {
                togglePause();
            }
        } else {
            keys[e.key] = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);

    // Touch and Mouse controls
    const handleMove = (clientX: number) => {
        if (isPaused) return; // Prevent movement when paused
        const rect = gameContainer.getBoundingClientRect();
        let newPlayerX = clientX - rect.left - PLAYER_WIDTH / 2;

        // Boundary checks
        if (newPlayerX < 0) newPlayerX = 0;
        if (newPlayerX > gameContainer.clientWidth - PLAYER_WIDTH) {
            newPlayerX = gameContainer.clientWidth - PLAYER_WIDTH;
        }
        
        playerX = newPlayerX;
        // The position will be visually updated in the next gameLoop frame
    };

    gameContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
        }
    }, { passive: false });

    gameContainer.addEventListener('mousemove', (e) => {
        handleMove(e.clientX);
    });
}

// --- Start the app ---
init();