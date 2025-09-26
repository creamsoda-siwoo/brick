

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
        const ITEM_SPAWN_PROBABILITY = 0.15; // 15% chance
        const SLOW_MO_DURATION = 5000; // 5 seconds
        const FEVER_DURATION = 5000; // 5 seconds
        const SCORE_MULTIPLIER_DURATION = 7000; // 7 seconds
        const TIME_STOP_DURATION = 3000; // 3 seconds
        const MAGNET_DURATION = 8000; // 8 seconds
        const MAGNET_RADIUS = 150; // pixels
        const HIGH_SCORE_KEY = 'brickGameHighScores';
        const SKIN_SETTINGS_KEY = 'brickGameSkinSettings';
        const LEADERBOARD_KEY = 'brickGameLeaderboard';
        const LEADERBOARD_MAX_SIZE = 20;

        const DIFFICULTY_LEVELS = {
            easy: { initialSpeed: 2.4, spawnInterval: 583, speedIncrease: 0.24, speedInterval: 5000 },
            normal: { initialSpeed: 3.0, spawnInterval: 500, speedIncrease: 0.30, speedInterval: 4500 },
            hard: { initialSpeed: 3.6, spawnInterval: 417, speedIncrease: 0.36, speedInterval: 4000 },
            god: { initialSpeed: 7.5, spawnInterval: 150, speedIncrease: 0.80, speedInterval: 2000 },
            transcendence: { initialSpeed: 9.0, spawnInterval: 125, speedIncrease: 1.0, speedInterval: 1800 },
            void: { initialSpeed: 12.0, spawnInterval: 100, speedIncrease: 1.25, speedInterval: 1500 },
            cataclysm: { initialSpeed: 15.0, spawnInterval: 80, speedIncrease: 1.5, speedInterval: 1200 },
        };

        const KOREAN_DIFFICULTY_NAMES = {
            easy: '쉬움',
            normal: '보통',
            hard: '어려움',
            god: '신',
            transcendence: '초월',
            void: '심연',
            cataclysm: '카타클리즘'
        };

        const WEIGHTED_ITEM_TYPES = [
            // Common
            'shield', 'shield', 'shield',
            'slow-mo', 'slow-mo', 'slow-mo',
            'coin', 'coin', 'coin',
            // Uncommon
            'health', 'health',
            'clear', 'clear',
            'score-multiplier', 'score-multiplier',
            'magnet', 'magnet',
            // Rare
            'fever',
            'time-stop'
        ];
        
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
        const itemDescriptionScreen = document.getElementById('item-description-screen');
        const customizeScreen = document.getElementById('customize-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScoreEl = document.getElementById('final-score');
        const finalHighScoreEl = document.getElementById('final-high-score');
        const newHighScoreMessage = document.getElementById('new-high-score-message');
        const easterEggMessage = document.getElementById('easter-egg-message');
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
        const itemDescriptionBtn = document.getElementById('item-description-btn');
        const customizeBtn = document.getElementById('customize-btn');
        const viewRankingsBtn = document.getElementById('view-rankings-btn');
        const rankingScreen = document.getElementById('ranking-screen');
        const rankingList = document.getElementById('ranking-list');
        const backToMainFromRanking = document.getElementById('back-to-main-from-ranking');
        const backToMainFromCustomize = document.getElementById('back-to-main-from-customize');
        const backToStartFromDifficulty = document.getElementById('back-to-start-from-difficulty');
        const backToStartFromItemDesc = document.getElementById('back-to-start-from-item-desc');
        const bgSkinSelection = document.getElementById('bg-skin-selection');
        const brickSkinSelection = document.getElementById('brick-skin-selection');
        const playerSkinSelection = document.getElementById('player-skin-selection');
        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownText = document.getElementById('countdown-text');
        const showcasePlayerSkin = document.getElementById('showcase-player-skin');
        const showcaseBrickSkin = document.getElementById('showcase-brick-skin');

        // --- Game State ---
        let playerX;
        let score;
        let timeScore;
        let bonusScore;
        let health;
        let shieldCount;
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
        let lastUpdateTime;
        let isPaused = false;
        let pauseStartTime;
        let currentGameConfig;
        let currentSpawnInterval;
        let initialSpawnInterval;
        let highScores = {};
        let leaderboard = [];
        let currentDifficulty;
        let storageAvailable = false;
        let skinSettings = { bg: 'sky', brick: 'classic', player: 'classic' };
        let isFeverActive = false;
        let feverEndTime = 0;
        let slowMoEndTime = 0;
        let isScoreMultiplierActive = false;
        let scoreMultiplierEndTime = 0;
        let isTimeStopped = false;
        let timeStopEndTime = 0;
        let isMagnetActive = false;
        let magnetEndTime = 0;
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

        function navigateTo(screenId) {
            if (screenId === 'ranking-screen') {
                 showRankingScreenContent();
            }
            showScreen(screenId);
        }

        function showRankingScreenContent() {
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
        }
        
        // --- Countdown Logic ---
        function startCountdown(onComplete) {
            removePlayerControls(); // Player can't move during countdown

            let count = 3;
            countdownOverlay.classList.remove('hidden');
            countdownText.textContent = count;

            const intervalId = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownText.textContent = count;
                } else if (count === 0) {
                    countdownText.textContent = '시작!';
                } else {
                    clearInterval(intervalId);
                    countdownOverlay.classList.add('hidden');
                    addPlayerControls(); // Give controls back
                    onComplete();
                }
            }, 1000);
        }

        // --- Initialization ---
        function init() {
            storageAvailable = isLocalStorageAvailable();
            loadData();
            applySkins();
            setupControls();

            showMainMenu();

            // Navigation buttons
            startGameBtn.addEventListener('click', () => navigateTo('difficulty-screen'));
            itemDescriptionBtn.addEventListener('click', () => navigateTo('item-description-screen'));
            customizeBtn.addEventListener('click', () => navigateTo('customize-screen'));
            viewRankingsBtn.addEventListener('click', () => navigateTo('ranking-screen'));
            
            // Back buttons
            backToMainFromCustomize.addEventListener('click', showMainMenu);
            backToMainFromRanking.addEventListener('click', showMainMenu);
            backToStartFromDifficulty.addEventListener('click', showMainMenu);
            backToStartFromItemDesc.addEventListener('click', showMainMenu);

            // Skin selection
            bgSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'bg'));
            brickSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'brick'));
            playerSkinSelection.addEventListener('click', (e) => handleSkinSelection(e, 'player'));

            // Difficulty selection
            document.querySelectorAll('#difficulty-selection .difficulty-btn').forEach(button => {
                button.addEventListener('click', () => {
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
                showScreen('difficulty-screen');
            });
            backToStartGameOverBtn.addEventListener('click', goBackToStart);
            backToStartButton.addEventListener('click', goBackToStart);
        }

        function showMainMenu() {
            pauseButton.classList.add('hidden');
            highScoreDisplay.classList.add('hidden');
            healthBarEl.classList.add('hidden');
            player.style.display = 'none';
            removePlayerControls();

            // Update showcase skins to reflect current selection
            showcasePlayerSkin.className = `skin-option player-preview player-${skinSettings.player}-preview`;
            showcaseBrickSkin.className = `skin-option brick-preview brick-${skinSettings.brick}-preview`;
            
            showScreen('start-screen');
        }

        function goBackToStart() {
            endGameCleanup();
            showMainMenu();
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
            player.style.display = 'none';
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
            shieldCount = 0;
            player.classList.remove('shield-active');

            isFeverActive = false;
            player.classList.remove('fever-active');
            
            isScoreMultiplierActive = false;

            isMagnetActive = false;
            player.classList.remove('magnet-active');
            
            isTimeStopped = false;

            isInvincible = false;
            player.classList.remove('invincible');
            
            itemStatusEl.innerHTML = '';
            slowMoEndTime = 0;
            feverEndTime = 0;
            scoreMultiplierEndTime = 0;
            timeStopEndTime = 0;
            invincibilityEndTime = 0;
            magnetEndTime = 0;
        }


        function resetGame(initialSpeed, difficulty) {
            currentDifficulty = difficulty;
            const playableWidth = gameContainer.clientWidth - WALL_WIDTH * 2;
            playerX = WALL_WIDTH + (playableWidth - PLAYER_WIDTH) / 2;
            score = 0;
            timeScore = 0;
            bonusScore = 0;
            health = INITIAL_HEALTH;
            shieldCount = 0;
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
            let healthHTML = `❤️ x ${health}`;
            if (shieldCount > 0) {
                healthHTML += ` 🛡️ x ${shieldCount}`;
            }
            healthBarEl.innerHTML = healthHTML;
            
            if (shieldCount > 0) {
                player.classList.add('shield-active');
            } else {
                player.classList.remove('shield-active');
            }
        }

        function prepareGame(config, difficulty) {
            player.style.display = 'block';
            currentGameConfig = config;
            resetGame(currentGameConfig.initialSpeed, difficulty);
            currentSpawnInterval = currentGameConfig.spawnInterval;
            initialSpawnInterval = currentGameConfig.spawnInterval;
            
            healthBarEl.classList.remove('hidden');
            document.querySelectorAll('.overlay').forEach(s => s.classList.add('hidden'));
            pauseButton.classList.remove('hidden');
            newHighScoreMessage.classList.add('hidden');
            easterEggMessage.classList.add('hidden');

            startCountdown(runGame);
        }
        
        function adjustDifficultyOverTime() {
            originalBrickSpeed += currentGameConfig.speedIncrease;
            if (slowMoEndTime <= Date.now() && !isTimeStopped) {
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
            lastUpdateTime = Date.now();

            speedIncreaseTimer = window.setInterval(adjustDifficultyOverTime, currentGameConfig.speedInterval);
            brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
            itemSpawnTimer = window.setInterval(trySpawningItem, ITEM_SPAWN_INTERVAL);
            gameLoopId = requestAnimationFrame(gameLoop);
        }
        
        // --- Status Timers Update ---
        function updateStatusTimers() {
            const now = Date.now();
            let statusText = '';
            
            // Time Stop Check
            if (timeStopEndTime > 0) {
                if (now < timeStopEndTime) {
                    const remaining = Math.ceil((timeStopEndTime - now) / 1000);
                    statusText += `⏱️ ${remaining}s `;
                    isTimeStopped = true;
                } else {
                    isTimeStopped = false;
                    timeStopEndTime = 0;
                    // Restore original speed if slow-mo isn't active
                    if (slowMoEndTime <= now) {
                        brickSpeed = originalBrickSpeed;
                    }
                }
            }


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
            
            // Score Multiplier Check
            if (scoreMultiplierEndTime > 0) {
                if (now < scoreMultiplierEndTime) {
                    const remaining = Math.ceil((scoreMultiplierEndTime - now) / 1000);
                    statusText += `⭐ ${remaining}s `;
                    isScoreMultiplierActive = true;
                } else {
                    isScoreMultiplierActive = false;
                    scoreMultiplierEndTime = 0;
                }
            }


            // Slow-mo Check
            if (slowMoEndTime > 0) {
                if (now < slowMoEndTime) {
                    const remaining = Math.ceil((slowMoEndTime - now) / 1000);
                    statusText += `⏳ ${remaining}s `;
                } else {
                    if (!isTimeStopped) {
                      brickSpeed = originalBrickSpeed;
                    }
                    slowMoEndTime = 0;
                }
            }
            
            // Magnet Check
            if (magnetEndTime > 0) {
                 if (now < magnetEndTime) {
                    const remaining = Math.ceil((magnetEndTime - now) / 1000);
                    statusText += `🧲 ${remaining}s `;
                    if (!isMagnetActive) {
                       isMagnetActive = true;
                       player.classList.add('magnet-active');
                    }
                } else {
                    isMagnetActive = false;
                    player.classList.remove('magnet-active');
                    magnetEndTime = 0;
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
            if (isTimeStopped) {
                lastUpdateTime = Date.now(); // Prevent score from increasing during time stop
                return;
            }
            const now = Date.now();
            const timeDelta = now - lastUpdateTime;
            lastUpdateTime = now;
        
            let pointsPerMillisecond = 1 / 100;
            if (isScoreMultiplierActive) {
                pointsPerMillisecond *= 2;
            }
            timeScore += timeDelta * pointsPerMillisecond;
            score = Math.floor(timeScore) + bonusScore;
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
            const itemType = WEIGHTED_ITEM_TYPES[Math.floor(Math.random() * WEIGHTED_ITEM_TYPES.length)];
            
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
            if (isTimeStopped) return;
        
            const containerHeight = gameContainer.clientHeight;
            const gameRect = gameContainer.getBoundingClientRect();
            
            const update = (objectArray, speed) => {
                for (let i = objectArray.length - 1; i >= 0; i--) {
                    const obj = objectArray[i];
                    
                    // Magnet logic for items
                    if (isMagnetActive && objectArray === items) {
                        const playerCenterX = playerX + PLAYER_WIDTH / 2;
                        const playerCenterY = player.offsetTop + player.offsetHeight / 2;
        
                        const itemElem = obj.element;
                        const itemRect = itemElem.getBoundingClientRect();
                        const itemCenterX = itemRect.left - gameRect.left + itemRect.width / 2;
                        const itemCenterY = itemRect.top - gameRect.top + itemRect.height / 2;
        
                        const dx = playerCenterX - itemCenterX;
                        const dy = playerCenterY - itemCenterY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
        
                        if (distance > 0 && distance < MAGNET_RADIUS) {
                            const pullSpeed = 4;
                            // Adjust horizontal position
                            let currentLeft = parseFloat(itemElem.style.left);
                            itemElem.style.left = `${currentLeft + (dx / distance) * pullSpeed}px`;
                            
                            // Add vertical pull (downwards only)
                            if (dy > 0) {
                                obj.y += (dy / distance) * pullSpeed;
                            }
                        }
                    }

                    // Normal movement
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
            const gameRect = gameContainer.getBoundingClientRect();
            let isGameOver = false;
        
            for (let i = bricks.length - 1; i >= 0; i--) {
                const brick = bricks[i].element;
                const brickRect = brick.getBoundingClientRect();
        
                if (isColliding(playerRect, brickRect)) {
                    const brickColor = window.getComputedStyle(brick).backgroundColor;
                    const brickCenterX = brickRect.left - gameRect.left + brickRect.width / 2;
                    const brickCenterY = brickRect.top - gameRect.top + brickRect.height / 2;
        
                    brick.remove();
                    bricks.splice(i, 1);
        
                    if (isFeverActive) {
                        bonusScore += 2; // Fixed 2 points
                        createParticles(brickCenterX, brickCenterY, brickColor);
                    } else if (shieldCount > 0) {
                        shieldCount--;
                        updateHealthUI();
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
                shieldCount++;
                updateHealthUI();
            } else if (type === 'slow-mo') {
                brickSpeed = originalBrickSpeed / 2;
                slowMoEndTime = Date.now() + SLOW_MO_DURATION;
            } else if (type === 'health') {
                health++;
                updateHealthUI();
            } else if (type === 'fever') {
                feverEndTime = Date.now() + FEVER_DURATION;
            } else if (type === 'score-multiplier') {
                scoreMultiplierEndTime = Date.now() + SCORE_MULTIPLIER_DURATION;
            } else if (type === 'time-stop') {
                timeStopEndTime = Date.now() + TIME_STOP_DURATION;
            } else if (type === 'magnet') {
                magnetEndTime = Date.now() + MAGNET_DURATION;
            } else if (type === 'coin') {
                bonusScore += isScoreMultiplierActive ? 100 : 50;
                const particleX = playerX + (PLAYER_WIDTH / 2);
                const particleY = player.offsetTop;
                createParticles(particleX, particleY, 'gold');
            } else if (type === 'clear') {
                const gameRect = gameContainer.getBoundingClientRect();
                const bricksCleared = bricks.length;
                bricks.forEach(brick => {
                    const brickRect = brick.element.getBoundingClientRect();
                    const brickColor = window.getComputedStyle(brick.element).backgroundColor;
                    const particleX = brickRect.left - gameRect.left + brickRect.width / 2;
                    const particleY = brickRect.top - gameRect.top + brickRect.height / 2;
                    createParticles(particleX, particleY, brickColor);
                    brick.element.remove();
                });
                bricks = [];
                bonusScore += bricksCleared * 2; // Fixed 2 points per brick
            }
        }

        function endGame() {
            endGameCleanup();
            
            finalScoreEl.textContent = score;
            const currentHighScore = highScores[currentDifficulty] || 0;
            let isNewHighScore = score > currentHighScore;

            // Hide messages by default
            newHighScoreMessage.classList.add('hidden');
            easterEggMessage.classList.add('hidden');

            // Check for Easter Egg first (1008+ score)
            if (score >= 1008) {
                easterEggMessage.innerHTML = '🎉 1008점 돌파! 🎉<br><small>제작자를 응원해주셔서 감사합니다!</small>';
                easterEggMessage.classList.remove('hidden');
                // Celebrate with confetti
                for (let i = 0; i < 100; i++) {
                    createParticles(Math.random() * gameContainer.clientWidth, Math.random() * gameContainer.clientHeight, `hsl(${Math.random() * 360}, 100%, 50%)`, true);
                }
            } 
            // If not the easter egg, check for a new high score
            else if (isNewHighScore) {
                newHighScoreMessage.classList.remove('hidden');
                // Celebrate with confetti for the new record
                for (let i = 0; i < 100; i++) {
                    createParticles(Math.random() * gameContainer.clientWidth, Math.random() * gameContainer.clientHeight, `hsl(${Math.random() * 360}, 100%, 50%)`, true);
                }
            }

            // Always handle high score logic (saving and displaying)
            if (isNewHighScore) {
                highScores[currentDifficulty] = score;
                saveData(HIGH_SCORE_KEY, highScores);
                finalHighScoreEl.textContent = score;
            } else {
                finalHighScoreEl.textContent = currentHighScore;
            }
            
            // Leaderboard Logic
            const newEntry = { score, difficulty: KOREAN_DIFFICULTY_NAMES[currentDifficulty] };
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

        function resumeGame() {
            const pauseDuration = Date.now() - pauseStartTime;
            lastUpdateTime += pauseDuration;
            
            // Adjust effect end times
            if (slowMoEndTime > 0) slowMoEndTime += pauseDuration;
            if (feverEndTime > 0) feverEndTime += pauseDuration;
            if (scoreMultiplierEndTime > 0) scoreMultiplierEndTime += pauseDuration;
            if (timeStopEndTime > 0) timeStopEndTime += pauseDuration;
            if (invincibilityEndTime > 0) invincibilityEndTime += pauseDuration;
            if (magnetEndTime > 0) magnetEndTime += pauseDuration;

            // Restart timers
            speedIncreaseTimer = window.setInterval(adjustDifficultyOverTime, currentGameConfig.speedInterval);
            brickSpawnTimer = window.setInterval(spawnBrick, currentSpawnInterval);
            itemSpawnTimer = window.setInterval(trySpawningItem, ITEM_SPAWN_INTERVAL);
            
            gameLoopId = requestAnimationFrame(gameLoop);
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
                pauseScreen.classList.add('hidden');
                startCountdown(resumeGame);
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