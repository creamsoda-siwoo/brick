
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

    const DIFFICULTY_LEVELS = {
        easy: { initialSpeed: 2.4, spawnInterval: 583, speedIncrease: 0.24, speedInterval: 5000 },
        normal: { initialSpeed: 3.0, spawnInterval: 500, speedIncrease: 0.30, speedInterval: 4500 },
        hard: { initialSpeed: 3.6, spawnInterval: 417, speedIncrease: 0.36, speedInterval: 4000 },
        impossible: { initialSpeed: 5.0, spawnInterval: 250, speedIncrease: 0.50, speedInterval: 3000 },
        hell: { initialSpeed: 6.0, spawnInterval: 200, speedIncrease: 0.60, speedInterval: 2500 },
    };

    type Difficulty = keyof typeof DIFFICULTY_LEVELS;
    type GameConfig = typeof DIFFICULTY_LEVELS[Difficulty];
    
    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container') as HTMLDivElement;
    const player = document.getElementById('player') as HTMLDivElement;
    const currentScoreEl = document.getElementById('current-score') as HTMLSpanElement;
    const highScoreEl = document.getElementById('high-score') as HTMLSpanElement;
    const startScreen = document.getElementById('start-screen') as HTMLDivElement;
    const gameOverScreen = document.getElementById('game-over-screen') as HTMLDivElement;
    const finalScoreEl = document.getElementById('final-score') as HTMLSpanElement;
    const difficultySelection = document.getElementById('difficulty-selection') as HTMLDivElement;
    const restartButton = document.getElementById('restart-button') as HTMLButtonElement;
    const pauseButton = document.getElementById('pause-button') as HTMLButtonElement;
    const pauseScreen = document.getElementById('pause-screen') as HTMLDivElement;
    const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;
    const backToStartButton = document.getElementById('back-to-start-button') as HTMLButtonElement;

    // --- Game State ---
    let playerX: number;
    let score: number;
    let highScore: number;
    let brickSpeed: number;
    let bricks: HTMLDivElement[] = [];
    let keys: { [key: string]: boolean } = {};
    let gameLoopId: number | null = null;
    let objectSpawnTimer: number | null = null;
    let speedIncreaseTimer: number | null = null;
    let gameStartTime: number;
    let isPaused = false;
    let pauseStartTime: number;
    let currentGameConfig: GameConfig;
    let currentSpawnInterval: number;

    // --- Initialization ---
    function init() {
        loadHighScore();
        setupControls();

        difficultySelection.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target?.matches('.difficulty-btn')) {
                const difficulty = target.dataset.difficulty as Difficulty;
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
        pauseScreen.classList.add('hidden');
    }

    function clearAllTimers() {
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        if (objectSpawnTimer) clearInterval(objectSpawnTimer);
        if (speedIncreaseTimer) clearInterval(speedIncreaseTimer);
        gameLoopId = null;
        objectSpawnTimer = null;
        speedIncreaseTimer = null;
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

        clearAllTimers();
    }

    function startGame(config: GameConfig) {
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

        objectSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    // --- Game Loop ---
    function gameLoop() {
        if (isPaused) return;

        updatePlayerPosition();
        updateBricks();
        updateScore();
        
        if (checkBrickCollisions()) {
            endGame();
            return;
        }
        
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function updateScore() {
        // gameStartTime can be adjusted by pause, so we check for NaN
        const currentElapsedTime = Date.now() - gameStartTime;
        score = Math.floor(currentElapsedTime / 100);
        currentScoreEl.textContent = score.toString();
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

    function checkBrickCollisions(): boolean {
        const playerRect = player.getBoundingClientRect();
        for (const brick of bricks) {
            const brickRect = brick.getBoundingClientRect();
            if (
                playerRect.left < brickRect.right &&
                playerRect.right > brickRect.left &&
                playerRect.top < brickRect.bottom &&
                playerRect.bottom > brickRect.top
            ) {
                return true; // Game over
            }
        }
        return false; // No collision
    }

    function endGame() {
        saveHighScore();
        clearAllTimers();
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

        pauseScreen.classList.add('hidden');

        speedIncreaseTimer = window.setInterval(() => {
            brickSpeed += currentGameConfig.speedIncrease;
        }, currentGameConfig.speedInterval);

        objectSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);

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
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                togglePause();
            } else {
                keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e: KeyboardEvent) => {
            keys[e.key] = false;
        });

        pauseButton.addEventListener('click', togglePause);
        resumeButton.addEventListener('click', resumeGame);

        const handleMove = (clientX: number) => {
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

        gameContainer.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX);
            }
        }, { passive: false });

        gameContainer.addEventListener('mousemove', (e: MouseEvent) => {
            handleMove(e.clientX);
        });
    }

    // --- Start the app ---
    init();
});
