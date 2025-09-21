

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
        const INITIAL_HEALTH = 3; 
        const ITEM_SPAWN_INTERVAL = 1000; // 1 second
        const ITEM_SPAWN_PROBABILITY = 0.1; // 10% chance
        const SLOW_MO_DURATION = 5000; // 5 seconds
        const FEVER_DURATION = 5000; // 5 seconds
        const HIGH_SCORE_KEY = 'brickGameHighScores';
        const SKIN_SETTINGS_KEY = 'brickGameSkinSettings';
        const LEADERBOARD_KEY = 'brickGameLeaderboard';
        const UNLOCKED_DIFFICULTIES_KEY = 'brickGameUnlockedDifficulties';
        const LEADERBOARD_MAX_SIZE = 20;

        const DIFFICULTY_LEVELS = {
            easy: { initialSpeed: 2.4, spawnInterval: 583, speedIncrease: 0.24, speedInterval: 5000 },
            normal: { initialSpeed: 3.0, spawnInterval: 500, speedIncrease: 0.30, speedInterval: 4500 },
            hard: { initialSpeed: 3.6, spawnInterval: 417, speedIncrease: 0.36, speedInterval: 4000 },
            god: { initialSpeed: 7.5, spawnInterval: 150, speedIncrease: 0.80, speedInterval: 2000 },
            transcendence: { initialSpeed: 9.0, spawnInterval: 125, speedIncrease: 1.0, speedInterval: 1800 },
            void: { initialSpeed: 12.0, spawnInterval: 100, speedIncrease: 1.25, speedInterval: 1500 },
        };

        const ALL_DIFFICULTIES = ['easy', 'normal', 'hard', 'god', 'transcendence', 'void'];
        const KOREAN_DIFFICULTY_NAMES = {
            easy: '쉬움',
            normal: '보통',
            hard: '어려움',
            god: '신',
            transcendence: '초월',
            void: '심연'
        };
        const UNLOCK_CONDITIONS = {
            normal: { prev: 'easy', score: 100 },
            hard: { prev: 'normal', score: 100 },
            god: { prev: 'hard', score: 100 },
            transcendence: { prev: 'god', score: 100 },
            void: { prev: 'transcendence', score: 100 },
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
        const retryPauseButton = document.getElementById('retry-pause-button');
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
        let bonusScore;
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
        let initialSpawnInterval;
        let highScores = {};
        let leaderboard = [];
        let unlockedDifficulties = ['easy'];
        let currentDifficulty;
        let storageAvailable = false;
        let skinSettings = { bg: 'sky', brick: 'classic', player: 'classic' };
        let isShieldActive = false;
        let isFeverActive = false;
        let feverEndTime = 0;
        let slowMoEndTime = 0;
        let isDragging = false;
        let isInvincible = false;
        let invincibilityEndTime = 0;

        // --- Player Control Handlers ---
        const handleDragStart = (e) => {
            if (!gameLoopId || isPaused) return; 
            isDragging = true;
            keys = {};
        };

        const handleDragMove = (e) => {
            if (!isDragging || isPaused) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const gameRect = gameContainer.getBoundingClientRect();
            let newPlayerX = clientX - gameRect.left - (PLAYER_WIDTH / 2);
            const rightBoundary = gameContainer.clientWidth - WALL_WIDTH - PLAYER_WIDTH;
            if (newPlayerX < WALL_WIDTH) newPlayerX = WALL_WIDTH;
            if (newPlayerX > rightBoundary) newPlayerX = rightBoundary;
            playerX = newPlayerX;
            player.style.left = `${playerX}px`;
        };

        const handleDragEnd = () => {
            isDragging = false;
        };
        
        const handleKeyDown = (e) => {
            if (isDragging) return;
            keys[e.key] = true;
        };

        const handleKeyUp = (e) => {
            keys[e.key] = false;
        };
        
        function addPlayerControls() {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            gameContainer.addEventListener('mousedown', handleDragStart);
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            gameContainer.addEventListener('touchstart', handleDragStart, { passive: true });
            window.addEventListener('touchmove', handleDragMove, { passive: true });
            window.addEventListener('touchend', handleDragEnd);
        }
        
        function removePlayerControls() {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            gameContainer.removeEventListener('mousedown', handleDragStart);
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            gameContainer.removeEventListener('touchstart', handleDragStart);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
            keys = {};
            isDragging = false;
        }


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
                
                const storedUnlocked = localStorage.getItem(UNLOCKED_DIFFICULTIES_KEY);
                unlockedDifficulties = storedUnlocked ? JSON.parse(storedUnlocked) : ['easy'];

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
            const bgSkinClasses = ['bg-sky', 'bg-night', 'bg-sunset', 'bg-forest', 'bg-cosmos', 'bg-sakura', 'bg-ocean', 'bg-synthwave'];
            gameContainer.classList.remove(...bgSkinClasses);
            gameContainer.classList.add(`bg-${skinSettings.bg}`);
            document.querySelectorAll('#bg-skin-selection .skin-option').forEach(el => {
                el.classList.toggle('selected', el.dataset.skin === skinSettings.bg);
            });
            // Brick (for previews)
            document.querySelectorAll('#brick-skin-selection .skin-option').forEach(el => {
                el.classList.toggle('selected', el.dataset.skin === skinSettings.brick);
            });
            // Player
            const playerSkinClasses = ['player-classic', 'player-racer', 'player-stealth', 'player-gold', 'player-hologram', 'player-wood', 'player-galaxy', 'player-camo'];
            player.classList.remove(...playerSkinClasses);
            player.classList.add(`player-${skinSettings.player}`);
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
        
        function updateDifficultyButtonsUI() {
            document.querySelectorAll('#difficulty-selection .difficulty-option').forEach(option => {
                const button = option.querySelector('.difficulty-btn');
                const conditionEl = option.querySelector('.unlock-condition');
                const difficulty = button.dataset.difficulty;
                const buttonText = KOREAN_DIFFICULTY_NAMES[difficulty] || difficulty;

                if (unlockedDifficulties.includes(difficulty)) {
                    button.disabled = false;
                    button.classList.remove('locked');
                    button.innerHTML = buttonText;
                    conditionEl.textContent = '';
                    conditionEl.classList.remove('visible');
                } else {
                    button.disabled = true;
                    button.classList.add('locked');
                    button.innerHTML = `${buttonText} 🔒`;
                    
                    const condition = UNLOCK_CONDITIONS[difficulty];
                    if (condition) {
                        const conditionText = `'${KOREAN_DIFFICULTY_NAMES[condition.prev]}'에서 ${condition.score}점 달성`;
                        conditionEl.textContent = conditionText;
                        conditionEl.classList.add('visible');
                    } else {
                        conditionEl.textContent = '';
                        conditionEl.classList.remove('visible');
                    }
                }
            });
        }

        // --- Initialization ---
        function init() {
            storageAvailable = isLocalStorageAvailable();
            loadData();
            applySkins();
            
            setupControls();

            // Navigation buttons
            startGameBtn.addEventListener('click', () => {
                updateDifficultyButtonsUI();
                showScreen('difficulty-screen');
            });
            customizeBtn.addEventListener('click', () => showScreen('customize-screen'));
            viewRankingsBtn.addEventListener('click', showRankingScreen);
            backToStartFromDifficulty.addEventListener('click', () => showScreen('start-screen'));
            backToStartFromCustomize.addEventListener('click', () => showScreen('start-screen'));
            backToStartFromRanking.addEventListener('click', () => showScreen('start-screen'));


            // Skin selection
            bgSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'bg'));
            brickSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'brick'));
            playerSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'player'));

            // Difficulty selection
            document.querySelectorAll('#difficulty-selection .difficulty-btn').forEach(button => {
                button.addEventListener('click', () => {
                    if (button.disabled) return;
                    const difficulty = button.dataset.difficulty;
                    if (difficulty && DIFFICULTY_LEVELS[difficulty]) {
                        prepareGame(DIFFICULTY_LEVELS[difficulty], difficulty);
                    }
                });
            });

            retryButton.addEventListener('click', () => {
                prepareGame(currentGameConfig, currentDifficulty);
            });
            retryPauseButton.addEventListener('click', () => {
                prepareGame(currentGameConfig, currentDifficulty);
            });
            selectDifficultyButton.addEventListener('click', () => {
                endGameCleanup();
                updateDifficultyButtonsUI();
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
            removePlayerControls();
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
            gameLoopId = null;
            brickSpawnTimer = null;
            itemSpawnTimer = null;
            speedIncreaseTimer = null;
        }

        function resetItemEffects() {
            isShieldActive = false;
            player.classList.remove('shield-active');

            isFeverActive = false;
            player.classList.remove('fever-active');

            isInvincible = false;
            player.classList.remove('invincible');
            
            itemStatusEl.innerHTML = '';
            slowMoEndTime = 0;
            feverEndTime = 0;
            invincibilityEndTime = 0;
        }


        function resetGame(initialSpeed, difficulty) {
            currentDifficulty = difficulty;
            const playableWidth = gameContainer.clientWidth - WALL_WIDTH * 2;
            playerX = WALL_WIDTH + (playableWidth - PLAYER_WIDTH) / 2;
            score = 0;
            bonusScore = 0;
            health = INITIAL_HEALTH;
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
            healthBarEl.innerHTML = `❤️ x ${health}`;
        }

        function prepareGame(config, difficulty) {
            const existingUnlockMsg = document.getElementById('unlock-message');
            if (existingUnlockMsg) {
                existingUnlockMsg.remove();
            }

            currentGameConfig = config;
            resetGame(currentGameConfig.initialSpeed, difficulty);
            currentSpawnInterval = currentGameConfig.spawnInterval;
            initialSpawnInterval = currentGameConfig.spawnInterval;
            
            healthBarEl.classList.remove('hidden');
            document.querySelectorAll('.overlay').forEach(s => s.classList.add('hidden'));
            pauseButton.classList.remove('hidden');
            newHighScoreMessage.classList.add('hidden');

            addPlayerControls();
            runGame();
        }
        
        function adjustDifficultyOverTime() {
            originalBrickSpeed += currentGameConfig.speedIncrease;
            if (slowMoEndTime <= Date.now()) {
                brickSpeed = originalBrickSpeed;
            }
        
            // Decrease spawn interval to maintain brick density as speed increases.
            const speedRatio = currentGameConfig.initialSpeed / originalBrickSpeed;
            currentSpawnInterval = initialSpawnInterval * speedRatio;
        
            // Set a minimum spawn interval to avoid excessive spawning
            const MIN_SPAWN_INTERVAL = 50; // ms
            if (currentSpawnInterval < MIN_SPAWN_INTERVAL) {
                currentSpawnInterval = MIN_SPAWN_INTERVAL;
            }
        
            // Reset the brick spawn timer with the new, shorter interval
            clearInterval(brickSpawnTimer);
            brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
        }

        function runGame() {
            gameStartTime = Date.now(); // Start timer now for accurate scoring

            speedIncreaseTimer = window.setInterval(adjustDifficultyOverTime, currentGameConfig.speedInterval);

            brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
            itemSpawnTimer = window.setInterval(trySpawningItem, ITEM_SPAWN_INTERVAL);
            gameLoopId = requestAnimationFrame(gameLoop);
        }
        
        // --- Status Timers Update ---
        function updateStatusTimers() {
            const now = Date.now();
            let statusText = '';

            // Fever Check
            if (feverEndTime > 0) {
                if (now < feverEndTime) {
                    const remaining = Math.ceil((feverEndTime - now) / 1000);
                    statusText += `🔥 ${remaining}s `;
                    if (!isFeverActive) {
                        isFeverActive = true;
                        player.classList.add('fever-active');
                    }
                } else {
                    isFeverActive = false;
                    player.classList.remove('fever-active');
                    feverEndTime = 0;
                }
            }

            // Slow-mo Check
            if (slowMoEndTime > 0) {
                if (now < slowMoEndTime) {
                    const remaining = Math.ceil((slowMoEndTime - now) / 1000);
                    statusText += `⏳ ${remaining}s `;
                } else {
                    brickSpeed = originalBrickSpeed;
                    slowMoEndTime = 0;
                }
            }
            
            // Post-hit Invincibility Check (no UI text, just state management)
            if (invincibilityEndTime > 0) {
                 if (now >= invincibilityEndTime) {
                    isInvincible = false;
                    player.classList.remove('invincible');
                    invincibilityEndTime = 0;
                }
            }

            itemStatusEl.innerHTML = statusText.trim();
        }

        // --- Game Loop ---
        function gameLoop() {
            if (isPaused) return;

            updatePlayerPosition();
            updateObjects();
            updateScore();
            updateParticles();
            updateStatusTimers();
            
            checkItemCollisions();

            if (checkBrickCollisions()) {
                endGame();
                return;
            }
            
            gameLoopId = requestAnimationFrame(gameLoop);
        }

        function updateScore() {
            const timeScore = Math.floor((Date.now() - gameStartTime) / 100);
            score = timeScore + bonusScore;
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
            const itemTypes = ['shield', 'slow-mo', 'health', 'fever', 'clear', 'coin'];
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
            const gameRect = gameContainer.getBoundingClientRect(); // Bug Fix: Added for relative coordinates
            let isGameOver = false;
        
            for (let i = bricks.length - 1; i >= 0; i--) {
                const brick = bricks[i].element;
                const brickRect = brick.getBoundingClientRect();
        
                if (isColliding(playerRect, brickRect)) {
                    const brickColor = window.getComputedStyle(brick).backgroundColor;
                    // Bug Fix: Calculate position relative to game container
                    const brickCenterX = brickRect.left - gameRect.left + brickRect.width / 2;
                    const brickCenterY = brickRect.top - gameRect.top + brickRect.height / 2;
        
                    brick.remove();
                    bricks.splice(i, 1);
        
                    if (isFeverActive) {
                        bonusScore += 10; // Bonus score
                        createParticles(brickCenterX, brickCenterY, brickColor);
                    } else if (isShieldActive) {
                        isShieldActive = false;
                        player.classList.remove('shield-active');
                        createParticles(brickCenterX, brickCenterY, 'cyan');
                    } else if (!isInvincible) {
                        health--;
                        updateHealthUI();
        
                        if (health <= 0) {
                            isGameOver = true;
                        } else {
                            // Activate 2-second invincibility
                            isInvincible = true;
                            player.classList.add('invincible');
                            invincibilityEndTime = Date.now() + 2000;
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
                brickSpeed = originalBrickSpeed / 2;
                slowMoEndTime = Date.now() + SLOW_MO_DURATION;
            } else if (type === 'health') {
                health++;
                updateHealthUI();
            } else if (type === 'fever') {
                feverEndTime = Date.now() + FEVER_DURATION;
                // isFeverActive will be set true in updateStatusTimers to sync with UI
            } else if (type === 'coin') {
                bonusScore += 50;
                const particleX = playerX + (PLAYER_WIDTH / 2);
                const particleY = player.offsetTop;
                createParticles(particleX, particleY, 'gold');
            } else if (type === 'clear') {
                const gameRect = gameContainer.getBoundingClientRect(); // Bug Fix: Added for relative coordinates
                const bricksCleared = bricks.length;
                bricks.forEach(brick => {
                    const brickRect = brick.element.getBoundingClientRect();
                    const brickColor = window.getComputedStyle(brick.element).backgroundColor;
                    // Bug Fix: Calculate position relative to game container
                    const particleX = brickRect.left - gameRect.left + brickRect.width / 2;
                    const particleY = brickRect.top - gameRect.top + brickRect.height / 2;
                    createParticles(particleX, particleY, brickColor);
                    brick.element.remove();
                });
                bricks = [];
                bonusScore += bricksCleared * 5; // Bonus score for each cleared brick
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
            
            // Check for unlocking next difficulty
            const nextDifficulty = ALL_DIFFICULTIES[ALL_DIFFICULTIES.indexOf(currentDifficulty) + 1];
            if (nextDifficulty && !unlockedDifficulties.includes(nextDifficulty)) {
                const condition = UNLOCK_CONDITIONS[nextDifficulty];
                if (condition && score >= condition.score) {
                    unlockedDifficulties.push(nextDifficulty);
                    saveData(UNLOCKED_DIFFICULTIES_KEY, unlockedDifficulties);
                    const unlockMsg = document.createElement('p');
                    unlockMsg.id = 'unlock-message';
                    unlockMsg.textContent = `🎉 '${KOREAN_DIFFICULTY_NAMES[nextDifficulty]}' 난이도 잠금 해제! 🎉`;
                    newHighScoreMessage.insertAdjacentElement('afterend', unlockMsg);
                }
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
                removePlayerControls();
                pauseStartTime = Date.now();
                if (gameLoopId) cancelAnimationFrame(gameLoopId);
                clearAllTimers();
                showScreen('pause-screen');
            } else {
                addPlayerControls();
                const pauseDuration = Date.now() - pauseStartTime;
                gameStartTime += pauseDuration;
                
                // Adjust effect end times
                if (slowMoEndTime > 0) slowMoEndTime += pauseDuration;
                if (feverEndTime > 0) feverEndTime += pauseDuration;
                if (invincibilityEndTime > 0) invincibilityEndTime += pauseDuration;

                // Restart timers
                speedIncreaseTimer = window.setInterval(adjustDifficultyOverTime, currentGameConfig.speedInterval);
                brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
                itemSpawnTimer = window.setInterval(trySpawningItem, ITEM_SPAWN_INTERVAL);

                pauseScreen.classList.add('hidden');
                gameLoopId = requestAnimationFrame(gameLoop);
            }
        }

        // --- Controls ---
        function handleVisibilityChange() {
            if (document.visibilityState === 'hidden') {
                // Pause the game if it is running and not already paused
                if (gameLoopId && !isPaused) {
                    togglePause();
                }
            }
        }

        function setupControls() {
            pauseButton.addEventListener('click', togglePause);
            resumeButton.addEventListener('click', togglePause);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        init();

    } catch(e) {
        document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">
            <h2>An error occurred</h2><p>${e.message}</p><pre>${e.stack}</pre>
        </div>`;
        console.error("Game initialization failed:", e);
    }
});