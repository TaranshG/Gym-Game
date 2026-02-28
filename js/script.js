/**
 * Gym Simulator - Incremental Game
 * Enhanced version with:
 * - K/M/B number formatting
 * - Workout button flavor text
 * - Random gym events system
 * - Offline progress
 * - Unlockable upgrade tiers
 * - Combo/streak multiplier
 * - Prestige system ("Go Pro")
 * - Absurd upgrades + humor
 * - Milestone screen flash + sounds
 * Authors: Rehan Patel, Taransh Goyal (enhanced)
 */

// ==================== MODEL (GAME STATE) ====================
let reps = 0;
let repsPerClick = 1;
let totalClicks = 0;
let autoClickIntervalId = null;
let autoGymLevel = 0;

// Prestige state (never wiped on reset)
let prestigeCount = 0;
let gainsMultiplier = 1;

// Combo system
let comboStreak = 0;
let comboMultiplier = 1;
let lastClickTime = 0;
let comboTimeoutId = null;
const COMBO_WINDOW_MS = 800; // Must click within this window to keep streak

// Event system
let eventTimeoutId = null;
let activeEvent = null; // { text, multiplier, endTime }

// ==================== FLAVOR TEXT ====================
const flavorTexts = [
    "Do you even lift?",
    "Pain is just weakness leaving the body (allegedly).",
    "No days off. Except rest days. But not today.",
    "You call THAT a rep?!",
    "Someone's watching. Make it count.",
    "The mirror never lies. Unfortunately.",
    "Gym selfie NOT included.",
    "Every rep brings you closer to your final form.",
    "Your future self is begging you.",
    "Sweat is just your fat crying.",
    "Legend says this button has been clicked 1 million times.",
    "The gains are worth it. Probably.",
    "You smell like determination. Or pre-workout. Hard to tell.",
    "One more. No, seriously, just one more.",
    "Your gym crush is watching. No they're not. Maybe they are.",
];

// ==================== RANDOM GYM EVENTS ====================
const gymEvents = [
    { text: "⚡ Pre-workout KICKED IN. You see God.", multiplier: 3, duration: 15000 },
    { text: "🎵 Eye of the Tiger came on. YOU'RE UNSTOPPABLE.", multiplier: 2, duration: 20000 },
    { text: "💪 Gym bro hyped you up. +100% reps!", multiplier: 2, duration: 10000 },
    { text: "🧘 Someone's doing yoga RIGHT NEXT TO THE SQUAT RACK. -50% focus.", multiplier: 0.5, duration: 12000 },
    { text: "👀 Gym Karen complained about your grunting.", multiplier: 0.75, duration: 10000 },
    { text: "📱 You're distracted by someone else's Instagram in the gym.", multiplier: 0.5, duration: 8000 },
    { text: "🥚 You drank a raw egg smoothie. Questionable decision. +150% gains!", multiplier: 2.5, duration: 12000 },
    { text: "🪞 Made accidental eye contact in the mirror for 5 seconds. Gained confidence.", multiplier: 1.5, duration: 15000 },
    { text: "🦾 A stranger spotting you yelled 'ALL YOU!' It was NOT all you.", multiplier: 1.8, duration: 10000 },
    { text: "💀 Someone left sweat on your bench. You rage-cleaned it. Nothing happened.", multiplier: 1, duration: 8000 },
    { text: "📢 Bluetooth speaker playing Lo-fi beats. Chill vibes. Slow gains.", multiplier: 0.8, duration: 20000 },
    { text: "🧲 Dropped a dumbbell. Everyone stared. Gained 0 reps, lost dignity.", multiplier: 0.6, duration: 8000 },
    { text: "🍕 Someone brought PIZZA to the gym. The audacity. You eat some.", multiplier: 1.2, duration: 15000 },
    { text: "🏆 The gym opened a new squat rack. You immediately claimed it. +2x reps!", multiplier: 2, duration: 12000 },
    { text: "🤳 Influencer is filming in your spot. You work around them. -25% efficiency.", multiplier: 0.75, duration: 15000 },
];

// ==================== UPGRADES ====================
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
        type: 'click',
        unlockAt: 0 // always visible
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
        type: 'click',
        unlockAt: 30
    },
    {
        id: 'autoGym',
        name: 'Auto-Gym Machine',
        description: 'Passive reps on autopilot!',
        emoji: '🤖',
        basePrice: 100,
        growth: 1.35,
        owned: 0,
        effect: 0,
        type: 'auto',
        unlockAt: 80
    },
    {
        id: 'rawEggSmoothie',
        name: 'Raw Egg Smoothie',
        description: '+3 reps/click. Tastes like regret.',
        emoji: '🥚',
        basePrice: 120,
        growth: 1.27,
        owned: 0,
        effect: 3,
        type: 'click',
        unlockAt: 150
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
        type: 'click',
        unlockAt: 300
    },
    {
        id: 'bluetoothSpeaker',
        name: 'Eye of the Tiger 24/7',
        description: 'Bluetooth speaker. Doubles auto-gym output.',
        emoji: '📢',
        basePrice: 400,
        growth: 1.32,
        owned: 0,
        effect: 0,
        type: 'autoBoost',
        unlockAt: 500
    },
    {
        id: 'creatine',
        name: 'Creatine (Legal)',
        description: '+50 reps per click. Probably fine.',
        emoji: '🧪',
        basePrice: 800,
        growth: 1.33,
        owned: 0,
        effect: 50,
        type: 'click',
        unlockAt: 1000
    },
    {
        id: 'chairGrandpa',
        name: 'Motivational Grandpa',
        description: 'Old man in a chair. Passive moral support reps.',
        emoji: '🪑',
        basePrice: 1500,
        growth: 1.38,
        owned: 0,
        effect: 0,
        type: 'morale',
        unlockAt: 2000
    },
    {
        id: 'motivationalPoster',
        name: 'Mountain Poster',
        description: '"Climb Every Mountain." Costs 0. Does nothing. Vibes only.',
        emoji: '🏔️',
        basePrice: 0,
        growth: 1.0,
        owned: 0,
        effect: 0,
        type: 'joke',
        unlockAt: 3000,
        maxOwned: 1
    },
    {
        id: 'saunaSession',
        name: 'Sauna Session',
        description: '+100 reps/click. You\'ve transcended pain.',
        emoji: '🧖',
        basePrice: 3000,
        growth: 1.35,
        owned: 0,
        effect: 100,
        type: 'click',
        unlockAt: 5000
    },
];

// ==================== REWARDS ====================
const rewards = [
    { id: 'firstSteps', name: 'First Steps', emoji: '👟', requirement: 'reps', value: 10, earned: false },
    { id: 'firstCentury', name: 'First Century', emoji: '💯', requirement: 'reps', value: 100, earned: false },
    { id: 'ironWill', name: 'Iron Will', emoji: '🎖️', requirement: 'upgrades', value: 3, earned: false },
    { id: 'automatedAthlete', name: 'Automated Athlete', emoji: '🤖', requirement: 'autoGym', value: 1, earned: false },
    { id: 'gymLegend', name: 'Gym Legend', emoji: '👑', requirement: 'reps', value: 1000, earned: false },
    { id: 'thousandClicks', name: 'Clicky Fingers', emoji: '🖱️', requirement: 'clicks', value: 500, earned: false },
    { id: 'goProFirst', name: 'Went Pro', emoji: '🌟', requirement: 'prestige', value: 1, earned: false },
    { id: 'repMillionaire', name: 'Rep Millionaire', emoji: '💰', requirement: 'reps', value: 1000000, earned: false },
];

// ==================== PRESTIGE TITLES ====================
const prestigeTitles = [
    'Gym Newbie', 'Regular', 'Swole', 'Shredded',
    'Certified Gym Rat', 'Absolute Unit', 'Ascended Chad', 'The Gains God'
];

function getPrestigeTitle() {
    return prestigeTitles[Math.min(prestigeCount, prestigeTitles.length - 1)];
}

// ==================== NUMBER FORMATTER ====================
function formatReps(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
}

// ==================== HELPER FUNCTIONS ====================
function calculateCost(upgrade) {
    if (upgrade.basePrice === 0) return 0;
    return Math.floor(upgrade.basePrice * Math.pow(upgrade.growth, upgrade.owned));
}

function getTotalUpgrades() {
    return upgrades.reduce((sum, u) => sum + u.owned, 0);
}

function getNextReward() {
    for (let reward of rewards) {
        if (!reward.earned) return reward;
    }
    return null;
}

function calculateProgressToNextReward() {
    const nextReward = getNextReward();
    if (!nextReward) return 100;
    let current = 0;
    if (nextReward.requirement === 'reps') current = reps;
    else if (nextReward.requirement === 'upgrades') current = getTotalUpgrades();
    else if (nextReward.requirement === 'autoGym') current = autoGymLevel;
    else if (nextReward.requirement === 'clicks') current = totalClicks;
    else if (nextReward.requirement === 'prestige') current = prestigeCount;
    return Math.min(100, (current / nextReward.value) * 100);
}

function getVisibleUpgrades() {
    const totalEarned = reps + (getTotalUpgrades() * 50);
    return upgrades.filter(u => {
        if (u.maxOwned && u.owned >= u.maxOwned) return true; // always show owned-max items
        return totalEarned >= u.unlockAt || reps >= u.unlockAt;
    });
}

function getAutoRps() {
    // Base auto rate from autoGymLevel
    let base = 0;
    if (autoGymLevel === 1) base = repsPerClick / 3;
    else if (autoGymLevel === 2) base = repsPerClick;
    else if (autoGymLevel >= 3) base = repsPerClick * 2;

    // Bluetooth speaker doubles it
    const speakerOwned = upgrades.find(u => u.id === 'bluetoothSpeaker')?.owned || 0;
    if (speakerOwned > 0) base *= 2;

    // Grandpa adds flat bonus per owned
    const grandpaOwned = upgrades.find(u => u.id === 'chairGrandpa')?.owned || 0;
    base += grandpaOwned * 5;

    return base * gainsMultiplier;
}

// ==================== WEB AUDIO (SOUNDS) ====================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, vol = 0.3) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

function playClickSound() {
    playTone(440 + comboStreak * 20, 'sine', 0.08, 0.15);
}

function playMilestoneSound() {
    // A little fanfare
    [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => playTone(f, 'triangle', 0.25, 0.4), i * 120);
    });
}

function playEventSound(positive) {
    if (positive) playTone(660, 'triangle', 0.2, 0.3);
    else playTone(200, 'sawtooth', 0.3, 0.3);
}

// ==================== COMBO SYSTEM ====================
function updateCombo() {
    const now = Date.now();
    const timeSinceLast = now - lastClickTime;

    if (lastClickTime > 0 && timeSinceLast <= COMBO_WINDOW_MS) {
        comboStreak = Math.min(comboStreak + 1, 20);
    } else {
        comboStreak = 1;
    }

    lastClickTime = now;
    comboMultiplier = 1 + Math.floor(comboStreak / 3) * 0.25; // Every 3 clicks = +0.25x

    // Clear previous reset timeout
    if (comboTimeoutId) clearTimeout(comboTimeoutId);
    comboTimeoutId = setTimeout(() => {
        comboStreak = 0;
        comboMultiplier = 1;
        updateComboDisplay();
    }, COMBO_WINDOW_MS + 100);

    updateComboDisplay();
}

function updateComboDisplay() {
    const comboEl = document.getElementById('comboDisplay');
    if (!comboEl) return;
    if (comboStreak >= 3) {
        comboEl.textContent = `🔥 x${comboMultiplier.toFixed(2)} COMBO (${comboStreak} streak)`;
        comboEl.classList.remove('hidden');
    } else {
        comboEl.classList.add('hidden');
    }
}

// ==================== RANDOM EVENTS ====================
function scheduleNextEvent() {
    const delay = 30000 + Math.random() * 60000; // 30-90 seconds
    eventTimeoutId = setTimeout(triggerRandomEvent, delay);
}

function triggerRandomEvent() {
    const event = gymEvents[Math.floor(Math.random() * gymEvents.length)];
    activeEvent = { ...event, endTime: Date.now() + event.duration };

    const isPositive = event.multiplier >= 1;
    playEventSound(isPositive);

    showEventBanner(event);

    setTimeout(() => {
        activeEvent = null;
        hideEventBanner();
        scheduleNextEvent();
    }, event.duration);
}

function showEventBanner(event) {
    const banner = document.getElementById('eventBanner');
    if (!banner) return;
    const isPositive = event.multiplier >= 1;
    banner.textContent = event.text;
    banner.className = `event-banner ${isPositive ? 'positive' : 'negative'}`;
    banner.classList.remove('hidden');
}

function hideEventBanner() {
    const banner = document.getElementById('eventBanner');
    if (banner) banner.classList.add('hidden');
}

function getEventMultiplier() {
    if (!activeEvent || Date.now() > activeEvent.endTime) {
        activeEvent = null;
        return 1;
    }
    return activeEvent.multiplier;
}

// ==================== OFFLINE PROGRESS ====================
function applyOfflineProgress() {
    const lastSave = localStorage.getItem('gymSimulatorLastSave');
    if (!lastSave || autoGymLevel === 0) return;

    const elapsed = (Date.now() - parseInt(lastSave, 10)) / 1000; // seconds
    const cappedSeconds = Math.min(elapsed, 8 * 3600); // max 8 hours
    if (cappedSeconds < 30) return; // don't bother for tiny gaps

    const rps = getAutoRps();
    const earned = Math.floor(rps * cappedSeconds);
    if (earned <= 0) return;

    reps += earned;

    const humanTime = elapsed >= 3600
        ? `${(elapsed / 3600).toFixed(1)} hours`
        : `${Math.floor(elapsed / 60)} minutes`;

    showOfflineModal(humanTime, earned);
}

function showOfflineModal(time, earned) {
    const modal = document.getElementById('offlineModal');
    if (!modal) return;
    document.getElementById('offlineTime').textContent = time;
    document.getElementById('offlineEarned').textContent = formatReps(earned);
    modal.classList.remove('hidden');
}

// ==================== PRESTIGE ====================
function canPrestige() {
    return reps >= 10000;
}

function performPrestige() {
    if (!canPrestige()) return;

    prestigeCount++;
    gainsMultiplier = 1 + prestigeCount * 0.5; // +50% per prestige

    // Reset regular state
    if (autoClickIntervalId) {
        clearInterval(autoClickIntervalId);
        autoClickIntervalId = null;
    }
    reps = 0;
    repsPerClick = 1;
    totalClicks = 0;
    autoGymLevel = 0;
    upgrades.forEach(u => { u.owned = 0; });
    rewards.forEach(r => {
        if (r.id !== 'goProFirst') r.earned = false;
    });

    if (prestigeCount >= 1) {
        rewards.find(r => r.id === 'goProFirst').earned = true;
    }

    document.getElementById('prestigeModal').classList.add('hidden');

    playMilestoneSound();
    flashScreen();
    showCongrats(`🌟 WENT PRO! Now ${getPrestigeTitle()}! Gains x${gainsMultiplier.toFixed(1)}`);

    saveGame();
    updateDisplay();
    renderRewards();
    updatePrestigeUI();
}

function updatePrestigeUI() {
    const el = document.getElementById('prestigeTitle');
    if (el) el.textContent = `${getPrestigeTitle()} (x${gainsMultiplier.toFixed(1)} gains)`;

    const goProBtn = document.getElementById('goProBtn');
    if (goProBtn) {
        if (canPrestige()) {
            goProBtn.classList.remove('hidden');
        } else {
            goProBtn.classList.add('hidden');
        }
    }

    const prestigeCountEl = document.getElementById('prestigeCount');
    if (prestigeCountEl) prestigeCountEl.textContent = prestigeCount;
}

// ==================== SCREEN FLASH ====================
function flashScreen() {
    document.body.classList.add('milestone-flash');
    setTimeout(() => document.body.classList.remove('milestone-flash'), 600);
}

// ==================== GAME LOGIC ====================
function handleWorkout() {
    updateCombo();
    playClickSound();

    const eventMult = getEventMultiplier();
    const gained = Math.floor(repsPerClick * comboMultiplier * eventMult * gainsMultiplier);
    reps += gained;
    totalClicks++;

    // Flavor text rotation
    const instruction = document.querySelector('.instruction');
    if (instruction && Math.random() < 0.2) {
        instruction.textContent = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];
    }

    showFloatingText(`+${formatReps(gained)}`, document.getElementById('workoutBtn'), comboMultiplier > 1);

    updateDisplay();
    checkRewards();
    saveGame();
}

function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;

    if (upgrade.maxOwned && upgrade.owned >= upgrade.maxOwned) {
        showMessage("You already have this!", 'error');
        return;
    }

    const cost = calculateCost(upgrade);

    if (reps >= cost) {
        reps -= cost;
        upgrade.owned++;

        if (upgrade.type === 'click') {
            repsPerClick += upgrade.effect;
        } else if (upgrade.type === 'auto') {
            autoGymLevel++;
            updateAutoGym();
        } else if (upgrade.type === 'autoBoost' || upgrade.type === 'morale') {
            // Effects are calculated dynamically in getAutoRps()
            if (autoGymLevel > 0) updateAutoGym();
        }
        // 'joke' type does nothing

        playTone(550, 'triangle', 0.15, 0.35);
        updateDisplay();
        checkRewards();
        saveGame();
        showMessage(`Purchased ${upgrade.emoji} ${upgrade.name}!`, 'success');
    } else {
        showMessage('Not enough reps! Keep grinding. 💪', 'error');
    }
}

function updateAutoGym() {
    if (autoClickIntervalId) {
        clearInterval(autoClickIntervalId);
        autoClickIntervalId = null;
    }
    if (autoGymLevel === 0) return;

    const interval = autoGymLevel === 1 ? 3000 : autoGymLevel === 2 ? 1000 : 500;

    autoClickIntervalId = setInterval(() => {
        const rps = getAutoRps();
        reps += rps * (interval / 1000);
        updateDisplay();
        checkRewards();
        // Save less frequently for performance
        if (Math.random() < 0.1) saveGame();
    }, interval);
}

function checkRewards() {
    let newRewardsEarned = false;

    rewards.forEach(reward => {
        if (!reward.earned) {
            let meets = false;
            if (reward.requirement === 'reps') meets = reps >= reward.value;
            else if (reward.requirement === 'upgrades') meets = getTotalUpgrades() >= reward.value;
            else if (reward.requirement === 'autoGym') meets = autoGymLevel >= reward.value;
            else if (reward.requirement === 'clicks') meets = totalClicks >= reward.value;
            else if (reward.requirement === 'prestige') meets = prestigeCount >= reward.value;

            if (meets) {
                reward.earned = true;
                newRewardsEarned = true;
                playMilestoneSound();
                flashScreen();
                showCongrats(`${reward.emoji} ${reward.name} Unlocked!`);
            }
        }
    });

    if (newRewardsEarned) renderRewards();
}

// ==================== VIEW ====================
function updateDisplay() {
    document.getElementById('totalReps').textContent = `${formatReps(reps)} REPS`;
    document.getElementById('repsPerClick').textContent = formatReps(Math.floor(repsPerClick * gainsMultiplier));
    document.getElementById('autoGymLevel').textContent = autoGymLevel;
    document.getElementById('totalUpgrades').textContent = getTotalUpgrades();

    // RPS display
    const rpsEl = document.getElementById('repsPerSecond');
    if (rpsEl) rpsEl.textContent = formatReps(getAutoRps().toFixed(1));

    renderUpgrades();
    updateProgressBar();
    updatePrestigeUI();
}

function renderUpgrades() {
    const container = document.getElementById('upgradesContainer');
    container.innerHTML = '';

    const visible = getVisibleUpgrades();

    if (visible.length === 0) {
        container.innerHTML = '<p style="color:#666;font-size:0.9rem;padding:8px;">Keep earning reps to unlock upgrades...</p>';
        return;
    }

    visible.forEach(upgrade => {
        const cost = calculateCost(upgrade);
        const canAfford = reps >= cost;
        const maxed = upgrade.maxOwned && upgrade.owned >= upgrade.maxOwned;

        const card = document.createElement('div');
        card.className = `upgrade-card ${canAfford && !maxed ? 'affordable' : 'not-affordable'}`;

        // Milestone count display
        let milestoneText = '';
        if (upgrade.owned >= 10) milestoneText = ' ⭐';
        if (upgrade.owned >= 25) milestoneText = ' ⭐⭐';
        if (upgrade.owned >= 50) milestoneText = ' 🌟';

        const btnText = maxed ? 'MAXED' : `${formatReps(cost)} reps`;

        card.innerHTML = `
            <div class="upgrade-info">
                <div class="upgrade-name">${upgrade.emoji} ${upgrade.name}${milestoneText}</div>
                <div class="upgrade-description">${upgrade.description}</div>
                <div class="upgrade-owned">Owned: ${upgrade.owned}${upgrade.maxOwned ? `/${upgrade.maxOwned}` : ''}</div>
            </div>
            <button class="upgrade-buy-btn" data-upgrade-id="${upgrade.id}" ${(!canAfford || maxed) ? 'disabled' : ''}>
                ${btnText}
            </button>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.upgrade-buy-btn').forEach(btn => {
        btn.addEventListener('click', e => buyUpgrade(e.target.getAttribute('data-upgrade-id')));
    });
}

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

function updateProgressBar() {
    const nextReward = getNextReward();
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressLabel');

    if (nextReward) {
        progressFill.style.width = `${calculateProgressToNextReward()}%`;
        let labelText = `Next: ${nextReward.name} at `;
        if (nextReward.requirement === 'reps') labelText += `${formatReps(nextReward.value)} reps`;
        else if (nextReward.requirement === 'upgrades') labelText += `${nextReward.value} upgrades`;
        else if (nextReward.requirement === 'autoGym') labelText += `Auto-Gym tier ${nextReward.value}`;
        else if (nextReward.requirement === 'clicks') labelText += `${formatReps(nextReward.value)} clicks`;
        else if (nextReward.requirement === 'prestige') labelText += `1 prestige`;
        progressLabel.textContent = labelText;
    } else {
        progressFill.style.width = '100%';
        progressLabel.textContent = 'All rewards earned! 🎉';
    }
}

function showFloatingText(text, element, big = false) {
    const floatingText = document.createElement('div');
    floatingText.className = `floating-text${big ? ' big' : ''}`;
    floatingText.textContent = text;
    const rect = element.getBoundingClientRect();
    floatingText.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    floatingText.style.top = `${rect.top + window.scrollY - 10}px`;
    floatingText.style.transform = 'translateX(-50%)';
    document.body.appendChild(floatingText);
    setTimeout(() => floatingText.remove(), 1000);
}

function showMessage(text, type) {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = text;
    messageArea.style.backgroundColor = type === 'error' ? '#ff6b6b' : '#4ecdc4';
    messageArea.classList.add('show');
    setTimeout(() => messageArea.classList.remove('show'), 2000);
}

function showCongrats(message) {
    const popup = document.getElementById('congratsPopup');
    popup.textContent = message;
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 3500);
}

// ==================== HELP PANEL ====================
function toggleHelp() {
    const helpPanel = document.getElementById('helpPanel');
    helpPanel.classList.toggle('hidden');
    if (!helpPanel.classList.contains('hidden')) populateHelpPanel();
}

function populateHelpPanel() {
    const upgradesList = document.getElementById('helpUpgradesList');
    upgradesList.innerHTML = '';
    upgrades.forEach(upgrade => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${upgrade.emoji} ${upgrade.name}</strong>: ${upgrade.description} (Unlocks at: ${upgrade.unlockAt === 0 ? 'Start' : formatReps(upgrade.unlockAt) + ' reps'})`;
        upgradesList.appendChild(li);
    });

    const rewardsList = document.getElementById('helpRewardsList');
    rewardsList.innerHTML = '';
    rewards.forEach(reward => {
        const li = document.createElement('li');
        let req = '';
        if (reward.requirement === 'reps') req = `Reach ${formatReps(reward.value)} reps`;
        else if (reward.requirement === 'upgrades') req = `Own ${reward.value} total upgrades`;
        else if (reward.requirement === 'autoGym') req = `Reach Auto-Gym tier ${reward.value}`;
        else if (reward.requirement === 'clicks') req = `Click ${formatReps(reward.value)} times`;
        else if (reward.requirement === 'prestige') req = `Prestige once`;
        li.innerHTML = `<strong>${reward.emoji} ${reward.name}</strong>: ${req}`;
        rewardsList.appendChild(li);
    });
}

// ==================== SAVE/LOAD ====================
function saveGame() {
    const gameState = {
        reps,
        repsPerClick,
        totalClicks,
        autoGymLevel,
        prestigeCount,
        gainsMultiplier,
        upgrades: upgrades.map(u => ({ id: u.id, owned: u.owned })),
        rewards: rewards.map(r => ({ id: r.id, earned: r.earned }))
    };
    localStorage.setItem('gymSimulatorSave', JSON.stringify(gameState));
    localStorage.setItem('gymSimulatorLastSave', Date.now().toString());
}

function loadGame() {
    const savedData = localStorage.getItem('gymSimulatorSave');
    if (!savedData) return;

    try {
        const gs = JSON.parse(savedData);
        reps = gs.reps || 0;
        repsPerClick = gs.repsPerClick || 1;
        totalClicks = gs.totalClicks || 0;
        autoGymLevel = gs.autoGymLevel || 0;
        prestigeCount = gs.prestigeCount || 0;
        gainsMultiplier = gs.gainsMultiplier || 1;

        if (gs.upgrades) {
            gs.upgrades.forEach(su => {
                const u = upgrades.find(x => x.id === su.id);
                if (u) u.owned = su.owned;
            });
        }
        if (gs.rewards) {
            gs.rewards.forEach(sr => {
                const r = rewards.find(x => x.id === sr.id);
                if (r) r.earned = sr.earned;
            });
        }

        if (autoGymLevel > 0) updateAutoGym();

        updateDisplay();
        renderRewards();
    } catch (e) {
        console.error('Error loading save:', e);
    }
}

function openResetModal() {
    document.getElementById('resetModal').classList.remove('hidden');
}

function closeResetModal() {
    document.getElementById('resetModal').classList.add('hidden');
}

function performReset() {
    localStorage.removeItem('gymSimulatorSave');
    localStorage.removeItem('gymSimulatorLastSave');

    if (autoClickIntervalId) { clearInterval(autoClickIntervalId); autoClickIntervalId = null; }
    if (eventTimeoutId) { clearTimeout(eventTimeoutId); eventTimeoutId = null; }

    reps = 0; repsPerClick = 1; totalClicks = 0; autoGymLevel = 0;
    prestigeCount = 0; gainsMultiplier = 1;
    comboStreak = 0; comboMultiplier = 1;

    upgrades.forEach(u => { u.owned = 0; });
    rewards.forEach(r => { r.earned = false; });

    updateDisplay();
    renderRewards();
    hideEventBanner();
    document.getElementById('helpPanel').classList.add('hidden');
    showMessage('Progress reset. Time to grind again. 💪', 'success');
    closeResetModal();

    scheduleNextEvent();
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', () => {
    loadGame();
    applyOfflineProgress();

    document.getElementById('workoutBtn').addEventListener('click', handleWorkout);
    document.getElementById('helpBtn').addEventListener('click', toggleHelp);
    document.getElementById('closeHelp').addEventListener('click', toggleHelp);
    document.getElementById('resetBtn').addEventListener('click', openResetModal);
    document.getElementById('cancelReset').addEventListener('click', closeResetModal);
    document.getElementById('confirmReset').addEventListener('click', performReset);

    // Prestige modal
    const goProBtn = document.getElementById('goProBtn');
    if (goProBtn) goProBtn.addEventListener('click', () => {
        document.getElementById('prestigeModal').classList.remove('hidden');
    });
    const cancelPrestige = document.getElementById('cancelPrestige');
    if (cancelPrestige) cancelPrestige.addEventListener('click', () => {
        document.getElementById('prestigeModal').classList.add('hidden');
    });
    const confirmPrestige = document.getElementById('confirmPrestige');
    if (confirmPrestige) confirmPrestige.addEventListener('click', performPrestige);

    // Offline modal close
    const closeOffline = document.getElementById('closeOfflineModal');
    if (closeOffline) closeOffline.addEventListener('click', () => {
        document.getElementById('offlineModal').classList.add('hidden');
        updateDisplay();
        checkRewards();
        saveGame();
    });

    updateDisplay();
    renderRewards();
    scheduleNextEvent();
});