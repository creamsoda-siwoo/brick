
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

window.addEventListener('DOMContentLoaded', () => {

    // --- Game Configuration ---
    const PLAYER_WIDTH = 50;
    const PLAYER_SPEED = 8;
    const BRICK_WIDTH = 40;
    const BRICK_HEIGHT = 20;
    const WALL_WIDTH = 10;
    const ITEM_WIDTH = 30;
    const ITEM_HEIGHT = 30;
    const ITEM_SPAWN_CHANCE = 0.05; // 5% chance per spawn interval
    const SLOW_EFFECT_DURATION = 5000; // 5 seconds in ms

    const DIFFICULTY_LEVELS = {
        easy: { initialSpeed: 2.4, spawnInterval: 583, speedIncrease: 0.24, speedInterval: 5000 },
        normal: { initialSpeed: 3.0, spawnInterval: 500, speedIncrease: 0.30, speedInterval: 4500 },
        hard: { initialSpeed: 3.6, spawnInterval: 417, speedIncrease: 0.36, speedInterval: 4000 },
        impossible: { initialSpeed: 5.0, spawnInterval: 250, speedIncrease: 0.50, speedInterval: 3000 },
        hell: { initialSpeed: 6.0, spawnInterval: 200, speedIncrease: 0.60, speedInterval: 2500 },
    };

    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const currentScoreEl = document.getElementById('current-score');
    const highScoreEl = document.getElementById('high-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreEl = document.getElementById('final-score');
    const difficultySelection = document.getElementById('difficulty-selection');
    const restartButton = document.getElementById('restart-button');
    const pauseButton = document.getElementById('pause-button');
    const pauseScreen = document.getElementById('pause-screen');
    const resumeButton = document.getElementById('resume-button');
    const backToStartButton = document.getElementById('back-to-start-button');
    const itemTimerDisplay = document.getElementById('item-timer-display');
    const itemTimerEl = document.getElementById('item-timer');

    // --- Game State ---
    let playerX;
    let score;
    let highScore;
    let brickSpeed;
    let bricks = [];
    let items = [];
    let keys = {};
    let gameLoopId;
    let objectSpawnTimer;
    let speedIncreaseTimer;
    let gameStartTime;
    let isPaused = false;
    let pauseStartTime;
    let currentGameConfig;
    let currentSpawnInterval;
    let isSlowed = false;
    let slowEffectTimer;
    let slowEffectEndTime;

    // --- Initialization ---
    function init() {
        loadHighScore();
        setupControls();

        difficultySelection.addEventListener('click', (e) => {
            const target = e.target;
            if (target instanceof HTMLElement && target.matches('.difficulty-btn')) {
                const difficulty = target.dataset.difficulty;
                if (difficulty && DIFFICULTY_LEVELS[difficulty]) {
                    startGame(DIFFICULTY_LEVELS[difficulty]);
                }
            }
        });

        restartButton.addEventListener('click', showStartScreen);
        backToStartButton.addEventListener('click', goBackToStart);
    }

    function showStartScreen() {
        gameOverScreen.classList.add('hidden');
        pauseButton.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }

    function goBackToStart() {
        endGameCleanup();
        showStartScreen();
    }
    
    function endGameCleanup() {
        isPaused = false;
        saveHighScore();
        clearAllTimers();
        bricks.forEach(brick => brick.remove());
        bricks = [];
        items.forEach(item => item.remove());
        items = [];
        deactivateSlowEffect();
        pauseScreen.classList.add('hidden');
    }

    function clearAllTimers() {
        cancelAnimationFrame(gameLoopId);
        clearInterval(objectSpawnTimer);
        clearInterval(speedIncreaseTimer);
        clearTimeout(slowEffectTimer);
        gameLoopId = null;
        objectSpawnTimer = null;
        speedIncreaseTimer = null;
        slowEffectTimer = null;
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

    function resetGame(initialSpeed) {
        const playableWidth = gameContainer.clientWidth - WALL_WIDTH * 2;
        playerX = WALL_WIDTH + (playableWidth - PLAYER_WIDTH) / 2;
        score = 0;
        brickSpeed = initialSpeed;
        gameStartTime = Date.now();
        isPaused = false;

        player.style.left = `${playerX}px`;
        currentScoreEl.textContent = '0';
        
        bricks.forEach(brick => brick.remove());
        bricks = [];
        items.forEach(item => item.remove());
        items = [];
        deactivateSlowEffect();

        clearAllTimers();
    }

    function startGame(config) {
        currentGameConfig = config;
        resetGame(currentGameConfig.initialSpeed);
        currentSpawnInterval = currentGameConfig.spawnInterval;

        speedIncreaseTimer = window.setInterval(() => {
            brickSpeed += currentGameConfig.speedIncrease;
        }, currentGameConfig.speedInterval);
        
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        pauseButton.classList.remove('hidden');

        objectSpawnTimer = window.setInterval(spawnObject, currentSpawnInterval);
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    // --- Game Loop ---
    function gameLoop() {
        if (isPaused) return;

        updatePlayerPosition();
        updateBricks();
        updateItems();
        updateScore();
        updateItemTimerDisplay();
        
        checkItemCollisions();
        if (checkBrickCollisions()) {
            endGame();
            return;
        }
        
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function updateScore() {
        score = Math.floor((Date.now() - gameStartTime) / 100);
        currentScoreEl.textContent = score.toString();
    }

    function updateItemTimerDisplay() {
        if (isSlowed) {
            const timeLeft = Math.max(0, (slowEffectEndTime - Date.now()) / 1000);
            itemTimerEl.textContent = timeLeft.toFixed(1);
        }
    }

    function updatePlayerPosition() {
        if (keys['ArrowLeft'] || keys['a']) {
            playerX -= PLAYER_SPEED;
        }
        if (keys['ArrowRight'] || keys['d']) {
            playerX += PLAYER_SPEED;
        }

        const rightBoundary = gameContainer.clientWidth - WALL_WIDTH - PLAYER_WIDTH;
        if (playerX < WALL_WIDTH) playerX = WALL_WIDTH;
        if (playerX > rightBoundary) {
            playerX = rightBoundary;
        }

        player.style.left = `${playerX}px`;
    }

    function spawnObject() {
        if (Math.random() < ITEM_SPAWN_CHANCE) {
            spawnItem();
        } else {
            spawnBrick();
        }
    }

    function spawnBrick() {
        const brick = document.createElement('div');
        brick.className = 'brick';
        const spawnAreaWidth = gameContainer.clientWidth - WALL_WIDTH * 2 - BRICK_WIDTH;
        const brickX = Math.random() * spawnAreaWidth + WALL_WIDTH;

        brick.style.left = `${brickX}px`;
        brick.style.top = `-${BRICK_HEIGHT}px`;
        
        gameContainer.appendChild(brick);
        bricks.push(brick);
    }

    function spawnItem() {
        const item = document.createElement('div');
        item.className = 'item';
        const spawnAreaWidth = gameContainer.clientWidth - WALL_WIDTH * 2 - ITEM_WIDTH;
        const itemX = Math.random() * spawnAreaWidth + WALL_WIDTH;

        item.style.left = `${itemX}px`;
        item.style.top = `-${ITEM_HEIGHT}px`;
        
        gameContainer.appendChild(item);
        items.push(item);
    }

    function updateBricks() {
        const containerHeight = gameContainer.clientHeight;
        const currentSpeed = isSlowed ? brickSpeed / 2 : brickSpeed;
        for (let i = bricks.length - 1; i >= 0; i--) {
            const brick = bricks[i];
            const currentTop = parseFloat(brick.style.top);
            const newTop = currentTop + currentSpeed;
            
            if (newTop > containerHeight) {
                brick.remove();
                bricks.splice(i, 1);
            } else {
                brick.style.top = `${newTop}px`;
            }
        }
    }

    function updateItems() {
        const containerHeight = gameContainer.clientHeight;
        const currentSpeed = isSlowed ? brickSpeed / 2 : brickSpeed;
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const currentTop = parseFloat(item.style.top);
            const newTop = currentTop + currentSpeed;
            
            if (newTop > containerHeight) {
                item.remove();
                items.splice(i, 1);
            } else {
                item.style.top = `${newTop}px`;
            }
        }
    }

    function checkBrickCollisions() {
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

    function checkItemCollisions() {
        const playerRect = player.getBoundingClientRect();
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const itemRect = item.getBoundingClientRect();
            if (
                playerRect.left < itemRect.right &&
                playerRect.right > itemRect.left &&
                playerRect.top < itemRect.bottom &&
                playerRect.bottom > itemRect.top
            ) {
                item.remove();
                items.splice(i, 1);
                activateSlowEffect();
            }
        }
    }

    function activateSlowEffect() {
        clearTimeout(slowEffectTimer);
        isSlowed = true;
        slowEffectEndTime = Date.now() + SLOW_EFFECT_DURATION;
        gameContainer.classList.add('slow-effect');
        itemTimerDisplay.classList.remove('hidden');

        slowEffectTimer = setTimeout(deactivateSlowEffect, SLOW_EFFECT_DURATION);
    }
    
    function deactivateSlowEffect() {
        isSlowed = false;
        clearTimeout(slowEffectTimer);
        slowEffectTimer = null;
        gameContainer.classList.remove('slow-effect');
        itemTimerDisplay.classList.add('hidden');
    }

    function endGame() {
        saveHighScore();
        clearAllTimers();
        deactivateSlowEffect();
        finalScoreEl.textContent = score.toString();
        gameOverScreen.classList.remove('hidden');
        pauseButton.classList.add('hidden');
    }

    function pauseGame() {
        if (isPaused || !gameLoopId) return;
        isPaused = true;
        pauseStartTime = Date.now();
        clearAllTimers();
        pauseScreen.classList.remove('hidden');
    }

    function resumeGame() {
        if (!isPaused) return;
        isPaused = false;
        const pausedDuration = Date.now() - pauseStartTime;
        gameStartTime += pausedDuration;
        
        if (isSlowed) {
            slowEffectEndTime += pausedDuration;
            const remainingSlowTime = slowEffectEndTime - Date.now();
            if (remainingSlowTime > 0) {
                slowEffectTimer = setTimeout(deactivateSlowEffect, remainingSlowTime);
            } else {
                deactivateSlowEffect();
            }
        }

        pauseScreen.classList.add('hidden');

        speedIncreaseTimer = window.setInterval(() => {
            brickSpeed += currentGameConfig.speedIncrease;
        }, currentGameConfig.speedInterval);

        objectSpawnTimer = window.setInterval(spawnObject, currentSpawnInterval);

        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function togglePause() {
        if (isPaused) {
            resumeGame();
        } else if (gameLoopId) {
            pauseGame();
        }
    }

    // --- Controls ---
    function setupControls() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                togglePause();
            } else {
                keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });

        pauseButton.addEventListener('click', togglePause);
        resumeButton.addEventListener('click', resumeGame);

        const handleMove = (clientX) => {
            if (isPaused || !gameLoopId) return;
            const rect = gameContainer.getBoundingClientRect();
            let newPlayerX = clientX - rect.left - PLAYER_WIDTH / 2;

            const rightBoundary = gameContainer.clientWidth - WALL_WIDTH - PLAYER_WIDTH;
            if (newPlayerX < WALL_WIDTH) newPlayerX = WALL_WIDTH;
            if (newPlayerX > rightBoundary) {
                newPlayerX = rightBoundary;
            }
            
            playerX = newPlayerX;
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
});
