
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

window.addEventListener('load', () => {
    try {
        // --- Game Configuration ---
        const PLAYER_WIDTH = 50;
        const PLAYER_SPEED = 8;
        const BRICK_WIDTH = 40;
        const BRICK_HEIGHT = 20;
        const WALL_WIDTH = 10;
        const HIGH_SCORE_KEY = 'brickGameHighScores';

        const DIFFICULTY_LEVELS = {
            easy: { initialSpeed: 2.4, spawnInterval: 583, speedIncrease: 0.24, speedInterval: 5000 },
            normal: { initialSpeed: 3.0, spawnInterval: 500, speedIncrease: 0.30, speedInterval: 4500 },
            hard: { initialSpeed: 3.6, spawnInterval: 417, speedIncrease: 0.36, speedInterval: 4000 },
            impossible: { initialSpeed: 5.0, spawnInterval: 250, speedIncrease: 0.50, speedInterval: 3000 },
            hell: { initialSpeed: 6.0, spawnInterval: 200, speedIncrease: 0.60, speedInterval: 2500 },
            god: { initialSpeed: 7.5, spawnInterval: 150, speedIncrease: 0.80, speedInterval: 2000 },
        };
        
        // --- DOM Elements ---
        const gameContainer = document.getElementById('game-container');
        const player = document.getElementById('player');
        const currentScoreEl = document.getElementById('current-score');
        const highScoreEl = document.getElementById('high-score');
        const highScoreDisplay = document.getElementById('high-score-display');
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScoreEl = document.getElementById('final-score');
        const finalHighScoreEl = document.getElementById('final-high-score');
        const newHighScoreMessage = document.getElementById('new-high-score-message');
        const difficultySelection = document.getElementById('difficulty-selection');
        const restartButton = document.getElementById('restart-button');
        const pauseButton = document.getElementById('pause-button');
        const pauseScreen = document.getElementById('pause-screen');
        const resumeButton = document.getElementById('resume-button');
        const backToStartButton = document.getElementById('back-to-start-button');

        // --- Game State ---
        let playerX;
        let score;
        let brickSpeed;
        let bricks = [];
        let keys = {};
        let gameLoopId = null;
        let objectSpawnTimer = null;
        let speedIncreaseTimer = null;
        let gameStartTime;
        let isPaused = false;
        let pauseStartTime;
        let currentGameConfig;
        let currentSpawnInterval;
        let highScores = {};
        let currentDifficulty;
        let storageAvailable = false;

        // --- High Score Management ---
        function isLocalStorageAvailable() {
            try {
                const test = '__storage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch(e) {
                return false;
            }
        }

        function loadHighScores() {
            if (!storageAvailable) return;
            try {
                const storedScores = localStorage.getItem(HIGH_SCORE_KEY);
                highScores = storedScores ? JSON.parse(storedScores) : {};
            } catch (e) {
                console.error("Error loading high scores:", e);
                highScores = {};
            }
        }

        function saveHighScore() {
            if (!storageAvailable) return;
            try {
                highScores[currentDifficulty] = score;
                localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
            } catch (e) {
                console.error("Error saving high score:", e);
            }
        }

        // --- Initialization ---
        function init() {
            storageAvailable = isLocalStorageAvailable();
            if (storageAvailable) {
                loadHighScores();
            }

            setupControls();

            difficultySelection.addEventListener('click', (e) => {
                const target = e.target;
                if (target?.matches('.difficulty-btn')) {
                    const difficulty = target.dataset.difficulty;
                    if (difficulty && DIFFICULTY_LEVELS[difficulty]) {
                        startGame(DIFFICULTY_LEVELS[difficulty], difficulty);
                    }
                }
            });

            restartButton.addEventListener('click', showStartScreen);
            backToStartButton.addEventListener('click', goBackToStart);
        }

        function showStartScreen() {
            gameOverScreen.classList.add('hidden');
            pauseButton.classList.add('hidden');
            highScoreDisplay.classList.add('hidden');
            startScreen.classList.remove('hidden');
        }

        function goBackToStart() {
            endGameCleanup();
            showStartScreen();
        }
        
        function endGameCleanup() {
            isPaused = false;
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

        function resetGame(initialSpeed, difficulty) {
            currentDifficulty = difficulty;
            const playableWidth = gameContainer.clientWidth - WALL_WIDTH * 2;
            playerX = WALL_WIDTH + (playableWidth - PLAYER_WIDTH) / 2;
            score = 0;
            brickSpeed = initialSpeed;
            gameStartTime = Date.now();
            isPaused = false;

            player.style.left = `${playerX}px`;
            currentScoreEl.textContent = '0';
            
            if (storageAvailable) {
                const currentHighScore = highScores[currentDifficulty] || 0;
                highScoreEl.textContent = currentHighScore;
                highScoreDisplay.classList.remove('hidden');
            } else {
                highScoreDisplay.classList.add('hidden');
            }

            bricks.forEach(brick => brick.remove());
            bricks = [];

            clearAllTimers();
        }

        function startGame(config, difficulty) {
            currentGameConfig = config;
            resetGame(currentGameConfig.initialSpeed, difficulty);
            currentSpawnInterval = currentGameConfig.spawnInterval;

            speedIncreaseTimer = window.setInterval(() => {
                brickSpeed += currentGameConfig.speedIncrease;
            }, currentGameConfig.speedInterval);
            
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            pauseScreen.classList.add('hidden');
            pauseButton.classList.remove('hidden');
            newHighScoreMessage.classList.add('hidden');

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
                    return true; // Game over
                }
            }
            return false; // No collision
        }

        function endGame() {
            clearAllTimers();

            const currentHighScore = highScores[currentDifficulty] || 0;
            if (score > currentHighScore) {
                saveHighScore();
                newHighScoreMessage.classList.remove('hidden');
                finalHighScoreEl.textContent = score.toString();
            } else {
                newHighScoreMessage.classList.add('hidden');
                finalHighScoreEl.textContent = currentHighScore.toString();
            }
            
            finalScoreEl.textContent = score.toString();
            gameOverScreen.classList.remove('hidden');
            pauseButton.classList.add('hidden');
            highScoreDisplay.classList.add('hidden');
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

    } catch (error) {
        console.error("An unexpected error occurred, preventing the game from starting:", error);
        document.body.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #f0f0f0; color: #333; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; padding: 20px;">
                <h1 style="font-size: 1.5rem; color: #d9534f;">오류 발생</h1>
                <p style="font-size: 1rem; margin-top: 10px;">게임을 불러오는 데 실패했습니다.</p>
                <p style="font-size: 0.9rem; color: #777; margin-top: 20px;">(개발자 콘솔에서 자세한 내용을 확인하세요.)</p>
            </div>
        `;
    }
});