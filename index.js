
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
        const ITEM_SIZE = 30;
        const MAX_HEALTH = 3; // Initial health
        const ITEM_SPAWN_INTERVAL = 2000; // 2 seconds
        const ITEM_SPAWN_PROBABILITY = 0.05; // 5% chance
        const SLOW_MO_DURATION = 5000; // 5 seconds
        const FEVER_DURATION = 5000; // 5 seconds
        const HIGH_SCORE_KEY = 'brickGameHighScores';
        const SKIN_SETTINGS_KEY = 'brickGameSkinSettings';
        const LEADERBOARD_KEY = 'brickGameLeaderboard';
        const LEADERBOARD_MAX_SIZE = 20;

        const DIFFICULTY_LEVELS = {
            easy: { initialSpeed: 2.4, spawnInterval: 583, speedIncrease: 0.24, speedInterval: 5000 },
            normal: { initialSpeed: 3.0, spawnInterval: 500, speedIncrease: 0.30, speedInterval: 4500 },
            hard: { initialSpeed: 3.6, spawnInterval: 417, speedIncrease: 0.36, speedInterval: 4000 },
            hell: { initialSpeed: 6.0, spawnInterval: 200, speedIncrease: 0.60, speedInterval: 2500 },
            god: { initialSpeed: 7.5, spawnInterval: 150, speedIncrease: 0.80, speedInterval: 2000 },
            transcendence: { initialSpeed: 9.0, spawnInterval: 125, speedIncrease: 1.0, speedInterval: 1800 },
        };
        
        // --- DOM Elements ---
        const gameContainer = document.getElementById('game-container');
        const player = document.getElementById('player');
        const currentScoreEl = document.getElementById('current-score');
        const highScoreEl = document.getElementById('high-score');
        const highScoreDisplay = document.getElementById('high-score-display');
        const healthBarEl = document.getElementById('health-bar');
        const itemStatusEl = document.getElementById('item-status');
        const startScreen = document.getElementById('start-screen');
        const difficultyScreen = document.getElementById('difficulty-screen');
        const customizeScreen = document.getElementById('customize-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const preGameStartScreen = document.getElementById('pre-game-start-screen');
        const finalScoreEl = document.getElementById('final-score');
        const finalHighScoreEl = document.getElementById('final-high-score');
        const newHighScoreMessage = document.getElementById('new-high-score-message');
        const difficultySelection = document.getElementById('difficulty-selection');
        const retryButton = document.getElementById('retry-button');
        const selectDifficultyButton = document.getElementById('select-difficulty-button');
        const backToStartGameOverBtn = document.getElementById('back-to-start-game-over-btn');
        const pauseButton = document.getElementById('pause-button');
        const pauseScreen = document.getElementById('pause-screen');
        const resumeButton = document.getElementById('resume-button');
        const backToStartButton = document.getElementById('back-to-start-button');
        const startGameBtn = document.getElementById('start-game-btn');
        const customizeBtn = document.getElementById('customize-btn');
        const viewRankingsBtn = document.getElementById('view-rankings-btn');
        const rankingScreen = document.getElementById('ranking-screen');
        const rankingList = document.getElementById('ranking-list');
        const backToStartFromRanking = document.getElementById('back-to-start-from-ranking');
        const backToStartFromDifficulty = document.getElementById('back-to-start-from-difficulty');
        const backToStartFromCustomize = document.getElementById('back-to-start-from-customize');
        const bgSkinSelection = document.getElementById('bg-skin-selection');
        const brickSkinSelection = document.getElementById('brick-skin-selection');
        const playerSkinSelection = document.getElementById('player-skin-selection');


        // --- Game State ---
        let playerX;
        let score;
        let health;
        let brickSpeed;
        let originalBrickSpeed;
        let bricks = [];
        let items = [];
        let particles = [];
        let keys = {};
        let gameLoopId = null;
        let brickSpawnTimer = null;
        let itemSpawnTimer = null;
        let speedIncreaseTimer = null;
        let gameStartTime;
        let isPaused = false;
        let pauseStartTime;
        let currentGameConfig;
        let currentSpawnInterval;
        let highScores = {};
        let leaderboard = [];
        let currentDifficulty;
        let storageAvailable = false;
        let skinSettings = { bg: 'sky', brick: 'classic', player: 'classic' };
        let isShieldActive = false;
        let isFeverActive = false;
        let slowMoTimeoutId = null;
        let feverTimeoutId = null;

        // --- Local Storage Management ---
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
        
        function loadData() {
            if (!storageAvailable) return;
            try {
                const storedScores = localStorage.getItem(HIGH_SCORE_KEY);
                highScores = storedScores ? JSON.parse(storedScores) : {};

                const storedLeaderboard = localStorage.getItem(LEADERBOARD_KEY);
                leaderboard = storedLeaderboard ? JSON.parse(storedLeaderboard) : [];
                
                const storedSkins = localStorage.getItem(SKIN_SETTINGS_KEY);
                const defaultSkins = { bg: 'sky', brick: 'classic', player: 'classic' };
                skinSettings = storedSkins ? { ...defaultSkins, ...JSON.parse(storedSkins) } : defaultSkins;

            } catch (e) {
                console.error("Error loading data from localStorage:", e);
            }
        }

        function saveData(key, data) {
             if (!storageAvailable) return;
             try {
                localStorage.setItem(key, JSON.stringify(data));
             } catch(e) {
                console.error(`Error saving ${key}:`, e);
             }
        }

        // --- Skin Management ---
        function applySkins() {
            // Background
            gameContainer.className = ''; // Clear existing bg classes
            gameContainer.classList.add(`bg-${skinSettings.bg}`);
            document.querySelectorAll('#bg-skin-selection .skin-option').forEach(el => {
                el.classList.toggle('selected', el.dataset.skin === skinSettings.bg);
            });
            // Brick
            document.querySelectorAll('#brick-skin-selection .skin-option').forEach(el => {
                el.classList.toggle('selected', el.dataset.skin === skinSettings.brick);
            });
            // Player
            player.className = `player-${skinSettings.player}`;
            document.querySelectorAll('#player-skin-selection .skin-option').forEach(el => {
                el.classList.toggle('selected', el.dataset.skin === skinSettings.player);
            });
        }

        function handleSkinSelection(e, type) {
            const selectedSkin = e.target.dataset.skin;
            if (selectedSkin) {
                skinSettings[type] = selectedSkin;
                saveData(SKIN_SETTINGS_KEY, skinSettings);
                applySkins();
            }
        }

        // --- UI Screen Management ---
        function showScreen(screenId) {
            document.querySelectorAll('.overlay').forEach(screen => {
                screen.classList.add('hidden');
            });
            document.getElementById(screenId)?.classList.remove('hidden');
        }

        function showRankingScreen() {
            rankingList.innerHTML = ''; // Clear previous list
        
            if (leaderboard.length === 0) {
                rankingList.innerHTML = '<li>아직 기록이 없습니다.</li>';
            } else {
                leaderboard.forEach((entry, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="rank-position">${index + 1}.</span>
                        <span class="rank-score">${entry.score}</span>
                        <span class="rank-difficulty">${entry.difficulty}</span>
                    `;
                    rankingList.appendChild(li);
                });
            }
            
            showScreen('ranking-screen');
        }

        // --- Initialization ---
        function init() {
            storageAvailable = isLocalStorageAvailable();
            loadData();
            applySkins();
            
            setupControls();

            // Navigation buttons
            startGameBtn.addEventListener('click', () => showScreen('difficulty-screen'));
            customizeBtn.addEventListener('click', () => showScreen('customize-screen'));
            viewRankingsBtn.addEventListener('click', showRankingScreen);
            backToStartFromDifficulty.addEventListener('click', () => showScreen('start-screen'));
            backToStartFromCustomize.addEventListener('click', () => showScreen('start-screen'));
            backToStartFromRanking.addEventListener('click', () => showScreen('start-screen'));


            // Skin selection
            bgSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'bg'));
            brickSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'brick'));
            playerSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'player'));

            difficultySelection.addEventListener('click', (e) => {
                const target = e.target;
                if (target?.matches('.difficulty-btn')) {
                    const difficulty = target.dataset.difficulty;
                    if (difficulty && DIFFICULTY_LEVELS[difficulty]) {
                        prepareGame(DIFFICULTY_LEVELS[difficulty], difficulty);
                    }
                }
            });

            retryButton.addEventListener('click', () => prepareGame(currentGameConfig, currentDifficulty));
            selectDifficultyButton.addEventListener('click', () => {
                endGameCleanup();
                showScreen('difficulty-screen');
            });
            backToStartGameOverBtn.addEventListener('click', goBackToStart);
            backToStartButton.addEventListener('click', goBackToStart);
        }

        function showStartScreen() {
            pauseButton.classList.add('hidden');
            highScoreDisplay.classList.add('hidden');
            healthBarEl.classList.add('hidden');
            showScreen('start-screen');
        }

        function goBackToStart() {
            endGameCleanup();
            showStartScreen();
        }
        
        function endGameCleanup() {
            isPaused = false;
            clearAllTimers();
            [...bricks, ...items, ...particles].forEach(obj => obj.element?.remove());
            bricks = [];
            items = [];
            particles = [];
            resetItemEffects();
            pauseScreen.classList.add('hidden');
        }

        function clearAllTimers() {
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            if (brickSpawnTimer) clearInterval(brickSpawnTimer);
            if (itemSpawnTimer) clearInterval(itemSpawnTimer);
            if (speedIncreaseTimer) clearInterval(speedIncreaseTimer);
            if (slowMoTimeoutId) clearTimeout(slowMoTimeoutId);
            if (feverTimeoutId) clearTimeout(feverTimeoutId);
            gameLoopId = null;
            brickSpawnTimer = null;
            itemSpawnTimer = null;
            speedIncreaseTimer = null;
            slowMoTimeoutId = null;
            feverTimeoutId = null;
        }

        function resetItemEffects() {
            isShieldActive = false;
            isFeverActive = false;
            player.classList.remove('shield-active', 'fever-active');
            itemStatusEl.innerHTML = '';
            if (slowMoTimeoutId) clearTimeout(slowMoTimeoutId);
            if (feverTimeoutId) clearTimeout(feverTimeoutId);
            slowMoTimeoutId = null;
            feverTimeoutId = null;
        }


        function resetGame(initialSpeed, difficulty) {
            currentDifficulty = difficulty;
            const playableWidth = gameContainer.clientWidth - WALL_WIDTH * 2;
            playerX = WALL_WIDTH + (playableWidth - PLAYER_WIDTH) / 2;
            score = 0;
            health = MAX_HEALTH;
            brickSpeed = initialSpeed;
            originalBrickSpeed = initialSpeed;
            isPaused = false;

            player.style.left = `${playerX}px`;
            currentScoreEl.textContent = '0';
            updateHealthUI();
            
            if (storageAvailable) {
                const currentHighScore = highScores[currentDifficulty] || 0;
                highScoreEl.textContent = currentHighScore;
                highScoreDisplay.classList.remove('hidden');
            } else {
                highScoreDisplay.classList.add('hidden');
            }
            
            clearAllTimers();
            [...bricks, ...items, ...particles].forEach(obj => obj.element?.remove());
            bricks = [];
            items = [];
            particles = [];
            resetItemEffects();
        }
        
        function updateHealthUI() {
            healthBarEl.innerHTML = '❤️'.repeat(health);
        }

        function prepareGame(config, difficulty) {
            currentGameConfig = config;
            resetGame(currentGameConfig.initialSpeed, difficulty);
            currentSpawnInterval = currentGameConfig.spawnInterval;

            healthBarEl.classList.remove('hidden');
            document.querySelectorAll('.overlay').forEach(s => s.classList.add('hidden'));
            pauseButton.classList.remove('hidden');
            newHighScoreMessage.classList.add('hidden');

            preGameStartScreen.classList.remove('hidden');
            
            const startHandler = () => {
                runGame();
            };

            preGameStartScreen.addEventListener('click', startHandler, { once: true });
            preGameStartScreen.addEventListener('touchstart', startHandler, { once: true });
        }

        function runGame() {
            preGameStartScreen.classList.add('hidden');
            gameStartTime = Date.now(); // Start timer now for accurate scoring

            speedIncreaseTimer = window.setInterval(() => {
                originalBrickSpeed += currentGameConfig.speedIncrease;
                if (!slowMoTimeoutId) {
                    brickSpeed = originalBrickSpeed;
                }
            }, currentGameConfig.speedInterval);

            brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
            itemSpawnTimer = window.setInterval(trySpawningItem, ITEM_SPAWN_INTERVAL);
            gameLoopId = requestAnimationFrame(gameLoop);
        }

        // --- Game Loop ---
        function gameLoop() {
            if (isPaused) return;

            updatePlayerPosition();
            updateObjects();
            updateScore();
            updateParticles();
            
            checkItemCollisions();

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

        function trySpawningItem() {
            if (Math.random() < ITEM_SPAWN_PROBABILITY) {
                spawnItem();
            }
        }

        function spawnBrick() {
            const brick = document.createElement('div');
            brick.className = `brick brick-${skinSettings.brick}`;
            const spawnAreaWidth = gameContainer.clientWidth - WALL_WIDTH * 2 - BRICK_WIDTH;
            const brickX = Math.random() * spawnAreaWidth + WALL_WIDTH;

            brick.style.left = `${brickX}px`;
            brick.style.top = `-${BRICK_HEIGHT}px`;
            
            gameContainer.appendChild(brick);
            bricks.push({element: brick, y: -BRICK_HEIGHT});
        }

        function spawnItem() {
            const item = document.createElement('div');
            const itemTypes = ['shield', 'slow-mo', 'health', 'fever', 'clear'];
            const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            
            item.className = `item ${itemType}`;
            item.dataset.type = itemType;

            const spawnAreaWidth = gameContainer.clientWidth - WALL_WIDTH * 2 - ITEM_SIZE;
            const itemX = Math.random() * spawnAreaWidth + WALL_WIDTH;
            
            item.style.left = `${itemX}px`;
            item.style.top = `-${ITEM_SIZE}px`;

            gameContainer.appendChild(item);
            items.push({element: item, y: -ITEM_SIZE});
        }

        function updateObjects() {
            const containerHeight = gameContainer.clientHeight;
            const update = (objectArray, speed) => {
                for (let i = objectArray.length - 1; i >= 0; i--) {
                    const obj = objectArray[i];
                    obj.y += speed;
                    
                    if (obj.y > containerHeight) {
                        obj.element.remove();
                        objectArray.splice(i, 1);
                    } else {
                        obj.element.style.top = `${obj.y}px`;
                    }
                }
            };
            update(bricks, brickSpeed);
            update(items, brickSpeed);
        }
        
        function isColliding(rect1, rect2) {
             return rect1.left < rect2.right &&
                    rect1.right > rect2.left &&
                    rect1.top < rect2.bottom &&
                    rect1.bottom > rect2.top;
        }

        function checkBrickCollisions() {
            const playerRect = player.getBoundingClientRect();
            let isGameOver = false;
        
            for (let i = bricks.length - 1; i >= 0; i--) {
                const brick = bricks[i].element;
                const brickRect = brick.getBoundingClientRect();
        
                if (isColliding(playerRect, brickRect)) {
                    const brickColor = window.getComputedStyle(brick).backgroundColor;
                    const brickCenterX = brickRect.left + brickRect.width / 2;
                    const brickCenterY = brickRect.top + brickRect.height / 2;
        
                    brick.remove();
                    bricks.splice(i, 1);
        
                    if (isFeverActive) {
                        score += 10; // Bonus score
                        currentScoreEl.textContent = score.toString();
                        createParticles(brickCenterX, brickCenterY, brickColor);
                    } else if (isShieldActive) {
                        isShieldActive = false;
                        player.classList.remove('shield-active');
                        createParticles(brickCenterX, brickCenterY, 'cyan');
                    } else {
                        health--;
                        updateHealthUI();
                        player.classList.add('hit');
                        setTimeout(() => player.classList.remove('hit'), 400);
        
                        if (health <= 0) {
                            isGameOver = true;
                        }
                    }
                }
            }
            return isGameOver;
        }

        function checkItemCollisions() {
            const playerRect = player.getBoundingClientRect();
            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i].element;
                const itemRect = item.getBoundingClientRect();
                if(isColliding(playerRect, itemRect)) {
                    activateItemEffect(item.dataset.type);
                    item.remove();
                    items.splice(i, 1);
                }
            }
        }

        function activateItemEffect(type) {
            if (type === 'shield') {
                isShieldActive = true;
                player.classList.add('shield-active');
            } else if (type === 'slow-mo') {
                if (slowMoTimeoutId) clearTimeout(slowMoTimeoutId);
                brickSpeed = originalBrickSpeed / 2;
                itemStatusEl.innerHTML = '⏳';
                slowMoTimeoutId = setTimeout(() => {
                    brickSpeed = originalBrickSpeed;
                    itemStatusEl.innerHTML = '';
                    slowMoTimeoutId = null;
                }, SLOW_MO_DURATION);
            } else if (type === 'health') {
                health++;
                updateHealthUI();
            } else if (type === 'fever') {
                if (feverTimeoutId) clearTimeout(feverTimeoutId);
                isFeverActive = true;
                player.classList.add('fever-active');
                itemStatusEl.innerHTML = '🔥';
                feverTimeoutId = setTimeout(() => {
                    isFeverActive = false;
                    player.classList.remove('fever-active');
                    itemStatusEl.innerHTML = '';
                    feverTimeoutId = null;
                }, FEVER_DURATION);
            } else if (type === 'clear') {
                const bricksCleared = bricks.length;
                bricks.forEach(brick => {
                    const brickRect = brick.element.getBoundingClientRect();
                    const brickColor = window.getComputedStyle(brick.element).backgroundColor;
                    createParticles(brickRect.left + brickRect.width / 2, brickRect.top + brickRect.height / 2, brickColor);
                    brick.element.remove();
                });
                bricks = [];
                score += bricksCleared * 5; // Bonus score for each cleared brick
                currentScoreEl.textContent = score.toString();
            }
        }

        function endGame() {
            endGameCleanup();
            
            finalScoreEl.textContent = score;
            const currentHighScore = highScores[currentDifficulty] || 0;
            
            if (score > currentHighScore) {
                highScores[currentDifficulty] = score;
                saveData(HIGH_SCORE_KEY, highScores);
                finalHighScoreEl.textContent = score;
                newHighScoreMessage.classList.remove('hidden');
                // Celebrate with confetti
                for (let i = 0; i < 100; i++) {
                    createParticles(Math.random() * gameContainer.clientWidth, Math.random() * gameContainer.clientHeight, `hsl(${Math.random() * 360}, 100%, 50%)`, true);
                }
            } else {
                finalHighScoreEl.textContent = currentHighScore;
                newHighScoreMessage.classList.add('hidden');
            }

            // Leaderboard Logic
            const newEntry = { score, difficulty: currentDifficulty };
            leaderboard.push(newEntry);
            leaderboard.sort((a, b) => b.score - a.score);
            if (leaderboard.length > LEADERBOARD_MAX_SIZE) {
                leaderboard.length = LEADERBOARD_MAX_SIZE;
            }
            saveData(LEADERBOARD_KEY, leaderboard);
            
            showScreen('game-over-screen');
        }

        function createParticles(x, y, color, isConfetti = false) {
            const count = isConfetti ? 20 : 10;
            for (let i = 0; i < count; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.backgroundColor = color;
                p.style.left = `${x}px`;
                p.style.top = `${y}px`;
                gameContainer.appendChild(p);
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * (isConfetti ? 6 : 4) + 1;
                particles.push({
                    element: p,
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: isConfetti ? 100 : 50,
                });
            }
        }
        
        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // gravity
                p.life--;
                if (p.life <= 0) {
                    p.element.remove();
                    particles.splice(i, 1);
                } else {
                    p.element.style.transform = `translate(${p.x - p.element.offsetLeft}px, ${p.y - p.element.offsetTop}px)`;
                    p.element.style.opacity = p.life / (p.life > 50 ? 100 : 50);
                }
            }
        }
        
        function togglePause() {
            if (!gameLoopId && !isPaused) return; // Can't pause if game isn't running
            isPaused = !isPaused;
            if (isPaused) {
                pauseStartTime = Date.now();
                // We only cancel the animation frame, timers are implicitly paused by the game loop not running.
                if (gameLoopId) cancelAnimationFrame(gameLoopId);
                clearAllTimers();
                showScreen('pause-screen');
            } else {
                const pauseDuration = Date.now() - pauseStartTime;
                gameStartTime += pauseDuration;
                // Restart timers
                speedIncreaseTimer = window.setInterval(() => {
                    originalBrickSpeed += currentGameConfig.speedIncrease;
                    if (!slowMoTimeoutId) {
                        brickSpeed = originalBrickSpeed;
                    }
                }, currentGameConfig.speedInterval);
                brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
                itemSpawnTimer = window.setInterval(trySpawningItem, ITEM_SPAWN_INTERVAL);

                pauseScreen.classList.add('hidden');
                gameLoopId = requestAnimationFrame(gameLoop);
            }
        }

        // --- Controls ---
        function setupControls() {
            let isDragging = false;

            // Keyboard controls
            window.addEventListener('keydown', (e) => {
                if (isDragging) return; // Ignore keys while dragging
                keys[e.key] = true;
            });
            window.addEventListener('keyup', (e) => {
                keys[e.key] = false;
            });

            const handleDragStart = (e) => {
                // Can't drag if game isn't running or is paused
                if (!gameLoopId || isPaused) return; 
                isDragging = true;
                keys = {}; // Clear any existing key presses
            };

            const handleDragMove = (e) => {
                if (!isDragging || isPaused) return;

                // Get clientX from either mouse or touch event
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const gameRect = gameContainer.getBoundingClientRect();
                
                // Calculate position relative to the game container, centering the player on the cursor/finger
                let newPlayerX = clientX - gameRect.left - (PLAYER_WIDTH / 2);

                // Clamp player position within walls
                const rightBoundary = gameContainer.clientWidth - WALL_WIDTH - PLAYER_WIDTH;
                if (newPlayerX < WALL_WIDTH) {
                    newPlayerX = WALL_WIDTH;
                }
                if (newPlayerX > rightBoundary) {
                    newPlayerX = rightBoundary;
                }
                
                // Update game state and visual position directly for immediate feedback
                playerX = newPlayerX;
                player.style.left = `${playerX}px`;
            };

            const handleDragEnd = () => {
                isDragging = false;
            };

            // Mouse Events
            gameContainer.addEventListener('mousedown', handleDragStart);
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);

            // Touch Events
            gameContainer.addEventListener('touchstart', (e) => {
                // Prevent default touch actions like scrolling or zooming
                e.preventDefault();
                handleDragStart(e);
            }, { passive: false });
            window.addEventListener('touchmove', handleDragMove, { passive: true });
            window.addEventListener('touchend', handleDragEnd);
            
            pauseButton.addEventListener('click', togglePause);
            resumeButton.addEventListener('click', togglePause);
        }

        init();

    } catch(e) {
        document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">
            <h2>An error occurred</h2><p>${e.message}</p><pre>${e.stack}</pre>
        </div>`;
        console.error("Game initialization failed:", e);
    }
});