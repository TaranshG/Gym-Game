/**
 * Gym Simulator - Incremental Game
 * Main game logic and state management
 * Author: Rehan Patel, Taransh Goyal 
 * Date: February 27, 2026
 * Course: Intro Web Dev
 * 
 * * This file manages:
 * - Game state (model)
 * - DOM manipulation (view)
 * - Event handlers (controller)
 * - localStorage for save/load
 */

// ==================== MODEL (GAME STATE) ====================
let reps = 0;
let repsPerClick = 1;
let totalClicks = 0;
let autoClickIntervalId = null;
let autoGymLevel = 0;

// Upgrades data structure
const upgrades = [
    {
        id: 'proteinShake',
        name: 'Protein Shake',
        description: '+1 reps per click',
        emoji: '🥤',
        basePrice: 10,
        growth: 1.25,
        owned: 0,
        effect: 1,
        type: 'click'
    },
    {
        id: 'preworkout',
        name: 'Pre-Workout',
        description: '+5 reps per click',
        emoji: '⚡',
        basePrice: 50,
        growth: 1.28,
        owned: 0,
        effect: 5,
        type: 'click'
    },
    {
        id: 'personalTrainer',
        name: 'Personal Trainer',
        description: '+20 reps per click',
        emoji: '👨‍🏫',
        basePrice: 200,
        growth: 1.30,
        owned: 0,
        effect: 20,
        type: 'click'
    },
    {
        id: 'autoGym',
        name: 'Auto-Gym Machine',
        description: 'Automatic reps!',
        emoji: '🤖',
        basePrice: 100,
        growth: 1.35,
        owned: 0,
        effect: 0,
        type: 'auto'
    }
];

// Rewards data structure
const rewards = [
    { id: 'firstSteps', name: 'First Steps', emoji: '👟', requirement: 'reps', value: 10, earned: false },
    { id: 'firstCentury', name: 'First Century', emoji: '💯', requirement: 'reps', value: 100, earned: false },
    { id: 'ironWill', name: 'Iron Will', emoji: '🎖️', requirement: 'upgrades', value: 3, earned: false },
    { id: 'automatedAthlete', name: 'Automated Athlete', emoji: '🤖', requirement: 'autoGym', value: 1, earned: false },
    { id: 'gymLegend', name: 'Gym Legend', emoji: '👑', requirement: 'reps', value: 1000, earned: false }
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate the cost of an upgrade based on owned count
 * @param {Object} upgrade - The upgrade object
 * @returns {number} - The calculated cost
 */
function calculateCost(upgrade) {
    return Math.floor(upgrade.basePrice * Math.pow(upgrade.growth, upgrade.owned));
}

/**
 * Get total number of upgrades owned
 * @returns {number} - Total upgrades owned
 */
function getTotalUpgrades() {
    return upgrades.reduce((sum, upgrade) => sum + upgrade.owned, 0);
}

/**
 * Find the next unearned reward
 * @returns {Object|null} - Next reward object or null
 */
function getNextReward() {
    for (let reward of rewards) {
        if (!reward.earned) {
            return reward;
        }
    }
    return null;
}

/**
 * Calculate progress percentage to next reward
 * @returns {number} - Percentage (0-100)
 */
function calculateProgressToNextReward() {
    const nextReward = getNextReward();
    if (!nextReward) return 100;

    let current = 0;
    if (nextReward.requirement === 'reps') {
        current = reps;
    } else if (nextReward.requirement === 'upgrades') {
        current = getTotalUpgrades();
    } else if (nextReward.requirement === 'autoGym') {
        current = autoGymLevel;
    }

    return Math.min(100, (current / nextReward.value) * 100);
}

// ==================== GAME LOGIC FUNCTIONS ====================

/**
 * Handle workout button click
 * Increases reps and provides visual feedback
 */
function handleWorkout() {
    reps += repsPerClick;
    totalClicks++;
    
    // Visual feedback: floating text
    showFloatingText(`+${repsPerClick}`, document.getElementById('workoutBtn'));
    
    updateDisplay();
    checkRewards();
    saveGame();
}

/**
 * Buy an upgrade if player can afford it
 * @param {string} upgradeId - The ID of the upgrade to buy
 */
function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    const cost = calculateCost(upgrade);
    
    if (reps >= cost) {
        // Deduct cost
        reps -= cost;
        upgrade.owned++;
        
        // Apply effect
        if (upgrade.type === 'click') {
            repsPerClick += upgrade.effect;
        } else if (upgrade.type === 'auto') {
            autoGymLevel++;
            updateAutoGym();
        }
        
        updateDisplay();
        checkRewards();
        saveGame();
        showMessage(`Purchased ${upgrade.name}!`, 'success');
    } else {
        showMessage('Not enough reps!', 'error');
    }
}

/**
 * Update auto-gym functionality
 * Manages auto-click intervals based on tier
 */
function updateAutoGym() {
    // Clear existing interval
    if (autoClickIntervalId) {
        clearInterval(autoClickIntervalId);
        autoClickIntervalId = null;
    }
    
    // Set up new interval based on tier
    if (autoGymLevel === 1) {
        // Tier 1: every 3 seconds
        autoClickIntervalId = setInterval(() => {
            reps += repsPerClick;
            updateDisplay();
            checkRewards();
            saveGame();
        }, 3000);
    } else if (autoGymLevel === 2) {
        // Tier 2: every 1 second
        autoClickIntervalId = setInterval(() => {
            reps += repsPerClick;
            updateDisplay();
            checkRewards();
            saveGame();
        }, 1000);
    } else if (autoGymLevel >= 3) {
        // Tier 3+: every 0.5 seconds
        autoClickIntervalId = setInterval(() => {
            reps += repsPerClick;
            updateDisplay();
            checkRewards();
            saveGame();
        }, 500);
    }
}

/**
 * Check if any rewards should be unlocked
 */
function checkRewards() {
    let newRewardsEarned = false;
    
    rewards.forEach(reward => {
        if (!reward.earned) {
            let meetsRequirement = false;
            
            if (reward.requirement === 'reps') {
                meetsRequirement = reps >= reward.value;
            } else if (reward.requirement === 'upgrades') {
                meetsRequirement = getTotalUpgrades() >= reward.value;
            } else if (reward.requirement === 'autoGym') {
                meetsRequirement = autoGymLevel >= reward.value;
            }
            
            if (meetsRequirement) {
                reward.earned = true;
                newRewardsEarned = true;
                showCongrats(`${reward.emoji} ${reward.name} Unlocked!`);
            }
        }
    });
    
    if (newRewardsEarned) {
        renderRewards();
    }
}

// ==================== VIEW (DOM MANIPULATION) ====================

/**
 * Update all display elements to reflect current game state
 */
function updateDisplay() {
    // Update stats
    document.getElementById('totalReps').textContent = `${reps.toLocaleString()} REPS`;
    document.getElementById('repsPerClick').textContent = repsPerClick;
    document.getElementById('autoGymLevel').textContent = autoGymLevel;
    document.getElementById('totalUpgrades').textContent = getTotalUpgrades();
    
    // Update upgrades
    renderUpgrades();
    
    // Update progress bar
    updateProgressBar();
}

/**
 * Render all upgrade cards
 */
function renderUpgrades() {
    const container = document.getElementById('upgradesContainer');
    container.innerHTML = '';
    
    upgrades.forEach(upgrade => {
        const cost = calculateCost(upgrade);
        const canAfford = reps >= cost;
        
        const card = document.createElement('div');
        card.className = `upgrade-card ${canAfford ? 'affordable' : 'not-affordable'}`;
        
        card.innerHTML = `
            <div class="upgrade-info">
                <div class="upgrade-name">${upgrade.emoji} ${upgrade.name}</div>
                <div class="upgrade-description">${upgrade.description}</div>
                <div class="upgrade-owned">Owned: ${upgrade.owned}</div>
            </div>
            <button class="upgrade-buy-btn" data-upgrade-id="${upgrade.id}" ${!canAfford ? 'disabled' : ''}>
                ${cost} reps
            </button>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.upgrade-buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const upgradeId = e.target.getAttribute('data-upgrade-id');
            buyUpgrade(upgradeId);
        });
    });
}

/**
 * Render all reward badges
 */
function renderRewards() {
    const container = document.getElementById('rewardsContainer');
    container.innerHTML = '';
    
    const earnedCount = rewards.filter(r => r.earned).length;
    document.getElementById('rewardCount').textContent = `(${earnedCount}/${rewards.length})`;
    
    rewards.forEach(reward => {
        const badge = document.createElement('div');
        badge.className = `reward-badge ${reward.earned ? 'earned' : 'not-earned'}`;
        
        badge.innerHTML = `
            <span class="reward-icon">${reward.emoji}</span>
            <div class="reward-name">${reward.name}</div>
        `;
        
        container.appendChild(badge);
    });
}

/**
 * Update progress bar to next reward
 */
function updateProgressBar() {
    const nextReward = getNextReward();
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressLabel');
    
    if (nextReward) {
        const progress = calculateProgressToNextReward();
        progressFill.style.width = `${progress}%`;
        
        let labelText = `Next: ${nextReward.name} at `;
        if (nextReward.requirement === 'reps') {
            labelText += `${nextReward.value} reps`;
        } else if (nextReward.requirement === 'upgrades') {
            labelText += `${nextReward.value} total upgrades`;
        } else if (nextReward.requirement === 'autoGym') {
            labelText += `Auto-Gym tier ${nextReward.value}`;
        }
        progressLabel.textContent = labelText;
    } else {
        progressFill.style.width = '100%';
        progressLabel.textContent = 'All rewards earned! 🎉';
    }
}

/**
 * Show floating text animation near an element
 * @param {string} text - Text to display
 * @param {HTMLElement} element - Reference element
 */
function showFloatingText(text, element) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    
    const rect = element.getBoundingClientRect();
    floatingText.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    floatingText.style.top = `${rect.top + window.scrollY}px`;
    floatingText.style.transform = 'translateX(-50%)'; // center it nicely
    
    document.body.appendChild(floatingText);
    
    setTimeout(() => {
        floatingText.remove();
    }, 1000);
}

/**
 * Show a message in the message area
 * @param {string} text - Message text
 * @param {string} type - Message type ('success' or 'error')
 */
function showMessage(text, type) {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = text;
    messageArea.style.backgroundColor = type === 'error' ? '#ff6b6b' : '#4ecdc4';
    messageArea.classList.add('show');
    
    setTimeout(() => {
        messageArea.classList.remove('show');
    }, 2000);
}

/**
 * Show congratulations popup
 * @param {string} message - Congratulations message
 */
function showCongrats(message) {
    const popup = document.getElementById('congratsPopup');
    popup.textContent = message;
    popup.classList.remove('hidden');
    
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 3000);
}

// ==================== HELP PANEL ====================

/**
 * Toggle help panel visibility
 */
function toggleHelp() {
    const helpPanel = document.getElementById('helpPanel');
    helpPanel.classList.toggle('hidden');
    
    if (!helpPanel.classList.contains('hidden')) {
        populateHelpPanel();
    }
}

/**
 * Populate help panel with upgrade and reward information
 */
function populateHelpPanel() {
    // Populate upgrades list
    const upgradesList = document.getElementById('helpUpgradesList');
    upgradesList.innerHTML = '';
    
    upgrades.forEach(upgrade => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${upgrade.emoji} ${upgrade.name}</strong>: ${upgrade.description} (Base price: ${upgrade.basePrice} reps)`;
        upgradesList.appendChild(li);
    });
    
    // Populate rewards list
    const rewardsList = document.getElementById('helpRewardsList');
    rewardsList.innerHTML = '';
    
    rewards.forEach(reward => {
        const li = document.createElement('li');
        let requirement = '';
        if (reward.requirement === 'reps') {
            requirement = `Reach ${reward.value} reps`;
        } else if (reward.requirement === 'upgrades') {
            requirement = `Own ${reward.value} total upgrades`;
        } else if (reward.requirement === 'autoGym') {
            requirement = `Reach Auto-Gym tier ${reward.value}`;
        }
        li.innerHTML = `<strong>${reward.emoji} ${reward.name}</strong>: ${requirement}`;
        rewardsList.appendChild(li);
    });
}

// ==================== SAVE/LOAD SYSTEM ====================

/**
 * Save game state to localStorage
 */
function saveGame() {
    const gameState = {
        reps,
        repsPerClick,
        totalClicks,
        autoGymLevel,
        upgrades: upgrades.map(u => ({ id: u.id, owned: u.owned })),
        rewards: rewards.map(r => ({ id: r.id, earned: r.earned }))
    };
    
    localStorage.setItem('gymSimulatorSave', JSON.stringify(gameState));
}

/**
 * Load game state from localStorage
 */
function loadGame() {
    const savedData = localStorage.getItem('gymSimulatorSave');
    
    if (savedData) {
        try {
            const gameState = JSON.parse(savedData);
            
            reps = gameState.reps || 0;
            repsPerClick = gameState.repsPerClick || 1;
            totalClicks = gameState.totalClicks || 0;
            autoGymLevel = gameState.autoGymLevel || 0;
            
            // Restore upgrades
            if (gameState.upgrades) {
                gameState.upgrades.forEach(savedUpgrade => {
                    const upgrade = upgrades.find(u => u.id === savedUpgrade.id);
                    if (upgrade) {
                        upgrade.owned = savedUpgrade.owned;
                    }
                });
            }
            
            // Restore rewards
            if (gameState.rewards) {
                gameState.rewards.forEach(savedReward => {
                    const reward = rewards.find(r => r.id === savedReward.id);
                    if (reward) {
                        reward.earned = savedReward.earned;
                    }
                });
            }
            
            // Restart auto-gym if needed
            if (autoGymLevel > 0) {
                updateAutoGym();
            }
            
            updateDisplay();
            renderRewards();
        } catch (error) {
            console.error('Error loading save data:', error);
        }
    }
}

/**
 * Opens the reset confirmation modal to warn the user before deleting save data.
 */
function openResetModal() {
  document.getElementById('resetModal').classList.remove('hidden');
}

/**
 * Closes the reset confirmation modal without deleting any save data.
 */
function closeResetModal() {
  document.getElementById('resetModal').classList.add('hidden');
}

/**
 * Performs a complete reset of the game. Clears localStorage, stops auto-gym intervals, 
 * resets all variables to 0, and updates the DOM to reflect the wiped state.
 */
function performReset() {
  localStorage.removeItem('gymSimulatorSave');

  // Clear auto-click interval
  if (autoClickIntervalId) {
    clearInterval(autoClickIntervalId);
    autoClickIntervalId = null;
  }

  // Reset state
  reps = 0;
  repsPerClick = 1;
  totalClicks = 0;
  autoGymLevel = 0;

  upgrades.forEach(u => { u.owned = 0; });
  rewards.forEach(r => { r.earned = false; });

  updateDisplay();
  renderRewards();

  // Don’t toggle (could accidentally open help); just ensure closed
  document.getElementById('helpPanel').classList.add('hidden');

  showMessage('Progress reset.', 'success');
  closeResetModal();
}

// ==================== INITIALIZATION ====================

/**
 * Initialize game on window load
 */
window.addEventListener('load', () => {
    // Load saved game
    loadGame();
    
    // Set up event listeners
    document.getElementById('workoutBtn').addEventListener('click', handleWorkout);
    document.getElementById('helpBtn').addEventListener('click', toggleHelp);
    document.getElementById('closeHelp').addEventListener('click', toggleHelp);
    document.getElementById('resetBtn').addEventListener('click', openResetModal);
    document.getElementById('cancelReset').addEventListener('click', closeResetModal);
    document.getElementById('confirmReset').addEventListener('click', performReset);
    
    // Initial render
    updateDisplay();
    renderRewards();
});