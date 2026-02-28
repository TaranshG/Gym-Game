/**
 * GYM SIMULATOR — GRIND MODE
 * Full addictive loop implementation:
 * - GymCoin meta currency + Gym Corp shop
 * - 3-layer prestige (Go Pro → Ascension)
 * - Build synergy system (click/auto/combo/event/chaos)
 * - Gains Goblin event + event chains + ultra-events
 * - Momentum timer (session escalation)
 * - Rest XP / Return Power Spike
 * - Gym Vibes Radio
 * - 15 absurd upgrades
 * - 3 secret achievements
 * - Daily Rep Goal
 * - Mirror Simulator (vanity stat)
 * - Impossible Dream trophy
 * - Bro Science Degree "bad advice" mechanic
 * - Mystery Supplement random effect
 * - The Vortex lifetime-playtime reps
 */

// ==================== CONSTANTS ====================
const PRESTIGE_THRESHOLD = 10000;
const ASCENSION_THRESHOLD = 10; // Go Pros needed to unlock Ascend
const COMBO_WINDOW_MS = 800;
const MOMENTUM_TICK_MS = 600000; // 10 min
const MAX_MOMENTUM = 25;
const MAX_OFFLINE_HOURS = 8;

// ==================== STATE ====================
let reps = 0;
let repsPerClick = 1;
let totalClicks = 0;
let lifetimeReps = 0;   // never reset, ever
let lifetimeSeconds = 0; // total playtime in seconds, never reset
let autoClickIntervalId = null;
let autoGymLevel = 0;

// Meta currency — never wiped
let gymCoins = 0;
let totalGymCoinsEarned = 0;

// Prestige
let prestigeCount = 0;
let gainsMultiplier = 1;
let ascensionStars = 0; // 0-5, mega prestige layer
let lifetimePrestigesEverDone = 0; // for ascension tracking, never reset

// Combo
let comboStreak = 0;
let comboMultiplier = 1;
let lastClickTime = 0;
let comboTimeoutId = null;
let maxComboWindow = COMBO_WINDOW_MS;
let maxComboStreak = 20;

// Events
let eventTimeoutId = null;
let activeEvent = null;
let pendingChainEvent = false; // event chain system
let sessionUltraEventFired = false;
let gainsGoblinActive = false;
let gainsGoblinStolen = 0;
let gainsGoblinTimeoutId = null;

// Momentum
let momentumTicks = 0;
let momentumIntervalId = null;

// Rest XP
let restXpMultiplier = 1;
let restXpEndTime = 0;

// Vibes Radio
let activeStation = null; // 'rock' | 'lofi' | 'metal'

// Misc flags
let broScienceBadAdviceCounter = 0;
let mysterySupplementEffect = null;
let secretClickCount = 0; // for Method Actor achievement
let secretNoBuyClickCount = 0;

// Daily goal
let dailyGoal = null;
let dailyGoalEarned = false;

// Session start
let sessionStartTime = Date.now();

// Playthrough number tracking (for Bro Science Degree)
let runNumber = 0;

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
    "Bro, do you even science?",
    "This is your villain origin story. Gym edition.",
    "The weights don't care about your feelings.",
    "Technically you could just close this tab.",
    "But you won't. You can't. It has you.",
];

// ==================== ALL EVENTS ====================
const gymEvents = [
    // Standard positive
    { id: 'preworkout_kick', text: "⚡ Pre-workout KICKED IN. You see God.", multiplier: 3, duration: 15000, rare: false },
    { id: 'eye_tiger', text: "🎵 Eye of the Tiger just dropped. YOU'RE UNSTOPPABLE.", multiplier: 2, duration: 20000, rare: false },
    { id: 'bro_hype', text: "💪 Gym bro hyped you up. 'THAT'S ALL YOU!' It was not.", multiplier: 2, duration: 10000, rare: false },
    { id: 'raw_egg', text: "🥚 You slammed a raw egg smoothie. Taste: regret. Effect: gains.", multiplier: 2.5, duration: 12000, rare: false },
    { id: 'mirror_eye_contact', text: "🪞 Accidentally made eye contact with yourself for 5 seconds. Activated.", multiplier: 1.5, duration: 15000, rare: false },
    { id: 'new_rack', text: "🏆 New squat rack just opened. You sprinted to claim it.", multiplier: 2, duration: 12000, rare: false },
    { id: 'pizza_gym', text: "🍕 Someone brought PIZZA to the gym. You ate some. No regrets.", multiplier: 1.2, duration: 15000, rare: false },
    // Standard negative
    { id: 'yoga_squat_rack', text: "🧘 Someone is doing yoga IN the squat rack. Focus down.", multiplier: 0.5, duration: 12000, rare: false },
    { id: 'gym_karen', text: "👀 Gym Karen complained about your grunting. You grunt louder.", multiplier: 0.75, duration: 10000, rare: false },
    { id: 'instagram_distract', text: "📱 You're watching someone else's gym reel. Embarrassing.", multiplier: 0.5, duration: 8000, rare: false },
    { id: 'sweat_bench', text: "💀 Someone left sweat on your bench. You rage-cleaned it for 10 minutes.", multiplier: 0.8, duration: 10000, rare: false },
    { id: 'dumbbell_drop', text: "🧲 Dropped a dumbbell. Everyone stared. You stared back. Nobody won.", multiplier: 0.6, duration: 8000, rare: false },
    { id: 'influencer_filming', text: "🤳 Influencer is literally filming IN YOUR SPOT.", multiplier: 0.75, duration: 15000, rare: false },
    { id: 'equipment_malfunction', text: "⚠️ EQUIPMENT MALFUNCTION. Auto-gym offline. The treadmill yeeted someone.", multiplier: 0, duration: 20000, rare: false, autoOffline: true },
    // Chaos events
    { id: 'protein_spill', text: "🌩️ PROTEIN SPILL. 40lbs of whey. Vanilla cloud. EVERYONE GAINS.", multiplier: 5, duration: 30000, rare: true },
    { id: 'swole_santa', text: "🎅 SWOLE SANTA appeared. He gave you a gift. In a tank top.", multiplier: 3, duration: 20000, rare: true, giftUpgrade: true },
    { id: 'corporate_sponsor', text: "💰 CORPORATE SPONSORSHIP. You went viral. ALL income x5 for 2 minutes.", multiplier: 5, duration: 120000, rare: true, ultra: true },
    { id: 'went_viral', text: "📸 YOU WENT VIRAL. One hour of income just appeared in your account.", multiplier: 1, duration: 5000, rare: true, ultra: true, oneHourDump: true },
    { id: 'the_coach', text: "🦁 THE COACH appeared from the shadows. Grants a temporary secret upgrade.", multiplier: 2, duration: 60000, rare: true, ultra: true, tempUpgrade: true },
];

// Event chains: after a negative event, 5% chance a follow-up positive fires
const chainEvents = [
    { text: "✨ The universe felt bad. Compensation gains incoming.", multiplier: 3, duration: 20000 },
    { text: "🔄 Karma reversed. Your suffering was not in vain.", multiplier: 2.5, duration: 15000 },
    { text: "💫 Plot twist: the bad event was secretly the tutorial.", multiplier: 4, duration: 10000 },
];

// ==================== UPGRADES ====================
const upgrades = [
    // --- CLICK BUILD ---
    { id: 'proteinShake',    name: 'Protein Shake',       emoji: '🥤', desc: '+1 click. The classic.', basePrice: 10,      growth: 1.25, owned: 0, effect: 1,   type: 'click',     unlockAt: 0,        synergy: 'click' },
    { id: 'preworkout',      name: 'Pre-Workout',         emoji: '⚡', desc: '+5 click. Jittery hands included.', basePrice: 50, growth: 1.28, owned: 0, effect: 5,   type: 'click',     unlockAt: 30,       synergy: 'click' },
    { id: 'rawEggSmoothie',  name: 'Raw Egg Smoothie',    emoji: '🥚', desc: '+3 click. Tastes like regret.', basePrice: 120,   growth: 1.27, owned: 0, effect: 3,   type: 'click',     unlockAt: 150,      synergy: 'click' },
    { id: 'personalTrainer', name: 'Personal Trainer',    emoji: '👨‍🏫', desc: '+20 click. He\'s judging you.', basePrice: 200,  growth: 1.30, owned: 0, effect: 20,  type: 'click',     unlockAt: 300,      synergy: 'click' },
    { id: 'creatine',        name: 'Creatine (Legal)',    emoji: '🧪', desc: '+50 click. Probably fine.', basePrice: 800,     growth: 1.33, owned: 0, effect: 50,  type: 'click',     unlockAt: 1000,     synergy: 'click' },
    { id: 'saunaSession',    name: 'Sauna Session',       emoji: '🧖', desc: '+100 click. Transcended pain.', basePrice: 3000, growth: 1.35, owned: 0, effect: 100, type: 'click',     unlockAt: 5000,     synergy: 'click' },
    { id: 'broScienceDegree',name: 'Bro Science Degree',  emoji: '🧠', desc: '+500 click. Not accredited. Every 10th click does 0. You gave yourself bad advice.', basePrice: 50000, growth: 1.40, owned: 0, effect: 500, type: 'broscience', unlockAt: 500000, synergy: 'click' },
    { id: 'steakTherapy',    name: 'Raw Steak Slap Therapy', emoji: '🥩', desc: 'x2 click. 1% chance per click: MEAT EVENT (3x for 5s).', basePrice: 5000000, growth: 1.45, owned: 0, effect: 0, type: 'steak', unlockAt: 5000000, synergy: 'click' },
    // --- AUTO BUILD ---
    { id: 'autoGym',         name: 'Auto-Gym Machine',   emoji: '🤖', desc: 'Passive reps. Bots do the work.', basePrice: 100,   growth: 1.35, owned: 0, effect: 0,   type: 'auto',      unlockAt: 80,       synergy: 'auto' },
    { id: 'bluetoothSpeaker',name: 'Eye of the Tiger 24/7', emoji: '📢', desc: 'x2 auto output. Legally distinct.', basePrice: 400, growth: 1.32, owned: 0, effect: 0, type: 'autoBoost', unlockAt: 500,      synergy: 'auto' },
    { id: 'chairGrandpa',    name: 'Motivational Grandpa', emoji: '🪑', desc: '+5 passive rps per owned. He believes in you.', basePrice: 1500, growth: 1.38, owned: 0, effect: 0, type: 'morale', unlockAt: 2000, synergy: 'auto' },
    { id: 'robotGymCrew',    name: 'Robot Gym Crew',      emoji: '🦾', desc: '+50 base rps. An army of polite iron men.', basePrice: 25000, growth: 1.40, owned: 0, effect: 50, type: 'autoFlat', unlockAt: 20000, synergy: 'auto' },
    { id: 'aiTrainer',       name: 'AI Personal Trainer', emoji: '🖥️', desc: 'Auto rps x1.5. It also judges your form.', basePrice: 100000, growth: 1.42, owned: 0, effect: 0, type: 'autoMult', unlockAt: 80000, synergy: 'auto' },
    { id: 'theVortex',       name: 'The Vortex',          emoji: '🌀', desc: 'A dimensional rift. Gains from other timelines. Income based on total lifetime playtime.', basePrice: 500000000, growth: 1.50, owned: 0, effect: 0, type: 'vortex', unlockAt: 500000000, synergy: 'auto', maxOwned: 1 },
    // --- COMBO BUILD ---
    { id: 'rhythmTraining',  name: 'Rhythm Training',    emoji: '🥁', desc: 'x2 combo multiplier cap. Feel the beat.', basePrice: 2000, growth: 1.35, owned: 0, effect: 0, type: 'comboBoost', unlockAt: 3000, synergy: 'combo' },
    { id: 'comboWindow',     name: 'Wider Combo Window', emoji: '⏱️', desc: '+200ms click window per owned.', basePrice: 5000, growth: 1.38, owned: 0, effect: 200, type: 'comboWindow', unlockAt: 8000, synergy: 'combo' },
    // --- EVENT/CHAOS BUILD ---
    { id: 'chaosMagnet',     name: 'Chaos Magnet',       emoji: '🧲', desc: 'Events 30% more frequent. You attract drama.', basePrice: 10000, growth: 1.40, owned: 0, effect: 0, type: 'eventFreq', unlockAt: 15000, synergy: 'event' },
    { id: 'mysterySupp',     name: 'Mystery Supplement', emoji: '💊', desc: 'Unknown effect. Manufacturer unclear. Effect: ???', basePrice: 50000, growth: 1.50, owned: 0, effect: 0, type: 'mystery', unlockAt: 50000, synergy: 'chaos' },
    { id: 'giraffeSpotter',  name: 'Giraffe Spotter',    emoji: '🦒', desc: 'A giraffe walks in. You don\'t question it. +10% all gains.', basePrice: 1000000, growth: 1.45, owned: 0, effect: 0, type: 'giraffeBonus', unlockAt: 1000000, synergy: 'chaos' },
    // --- JOKE / VIBE ---
    { id: 'motivationalPoster', name: 'Mountain Poster', emoji: '🏔️', desc: '"Climb Every Mountain." Costs 0. Does nothing. Vibes only.', basePrice: 0, growth: 1.0, owned: 0, effect: 0, type: 'joke', unlockAt: 3000, maxOwned: 1 },
];

// ==================== GYM CORP SHOP (permanent, GymCoin-bought) ====================
const gymCorpUpgrades = [
    { id: 'startingSupps',   name: 'Starting Supplement Pack', emoji: '🎒', desc: 'Begin each run with 10 free Protein Shakes pre-purchased.', cost: 5,  owned: false },
    { id: 'vipMembership',   name: 'VIP Membership',           emoji: '💳', desc: 'Auto-gym starts at tier 1 immediately on new run.', cost: 8,  owned: false },
    { id: 'broNetwork',      name: 'Bro Network',              emoji: '🤜', desc: '+30% chance events are positive. Bros look out for you.', cost: 12, owned: false },
    { id: 'steroidKnowledge',name: 'Steroid Knowledge',        emoji: '📚', desc: 'Unlock an exclusive prestige-only upgrade each run.', cost: 20, owned: false },
    { id: 'eventChaser',     name: 'Event Chaser',             emoji: '🏃', desc: '+50% event duration. You milk every event dry.', cost: 15, owned: false },
    { id: 'comboMaster',     name: 'Combo Master Cert',        emoji: '🎓', desc: 'Combo window starts at 1200ms instead of 800ms.', cost: 10, owned: false },
    { id: 'gymInfluencer',   name: 'Gym Influencer Status',    emoji: '📸', desc: 'All GymCoin income x2. The algorithm loves you.', cost: 25, owned: false },
    { id: 'morningRoutine',  name: 'Morning Routine',          emoji: '☀️', desc: 'Momentum ticks 50% faster. You\'re a morning person now.', cost: 18, owned: false },
];

// ==================== REWARDS ====================
const rewards = [
    { id: 'firstSteps',     name: 'First Steps',      emoji: '👟', req: 'reps',     val: 10,          earned: false, secret: false },
    { id: 'firstCentury',   name: 'First Century',    emoji: '💯', req: 'reps',     val: 100,         earned: false, secret: false },
    { id: 'ironWill',       name: 'Iron Will',         emoji: '🎖️', req: 'upgrades', val: 3,           earned: false, secret: false },
    { id: 'automatedAthlete', name: 'Automated Athlete', emoji: '🤖', req: 'autoGym', val: 1,          earned: false, secret: false },
    { id: 'gymLegend',      name: 'Gym Legend',        emoji: '👑', req: 'reps',     val: 1000,        earned: false, secret: false },
    { id: 'clicky',         name: 'Clicky Fingers',    emoji: '🖱️', req: 'clicks',   val: 500,         earned: false, secret: false },
    { id: 'wentPro',        name: 'Went Pro',          emoji: '🌟', req: 'prestige', val: 1,           earned: false, secret: false },
    { id: 'millionaire',    name: 'Rep Millionaire',   emoji: '💰', req: 'reps',     val: 1000000,     earned: false, secret: false },
    { id: 'billionaire',    name: 'Rep Billionaire',   emoji: '🏦', req: 'reps',     val: 1000000000,  earned: false, secret: false },
    { id: 'ascended',       name: 'Ascended',          emoji: '✨', req: 'ascension', val: 1,          earned: false, secret: false },
    { id: 'goblinCaught',   name: 'Goblin Hunter',     emoji: '👹', req: 'goblin',   val: 1,           earned: false, secret: false },
    // Secret achievements
    { id: 'methodActor',    name: '???',               emoji: '🤫', req: 'secret_69clicks', val: 69,    earned: false, secret: true, revealAfter: '🤫 Method Actor — You know what you did.' },
    { id: 'midnightGains',  name: '???',               emoji: '🌙', req: 'secret_midnight', val: 1,     earned: false, secret: true, revealAfter: '🌙 Midnight Gains — No one can see you cry.' },
    { id: 'longHaul',       name: '???',               emoji: '💀', req: 'lifetime_seconds', val: 86400, earned: false, secret: true, revealAfter: '💀 The Long Haul — Seek help. (+25% permanent gains)' },
    // Impossible Dream
    { id: 'becomeTheGym',   name: 'Become The Gym',    emoji: '🌌', req: 'reps',     val: 1000000000000000, earned: false, secret: false },
];

// ==================== PRESTIGE TITLES ====================
const prestigeTitles = [
    { min: 0,  title: 'Gym Newbie',       color: '#aaa' },
    { min: 1,  title: 'Regular',          color: '#4ecdc4' },
    { min: 2,  title: 'Swole',            color: '#66d9e8' },
    { min: 3,  title: 'Shredded',         color: '#ffd700' },
    { min: 5,  title: 'Certified Gym Rat', color: '#ff8c00' },
    { min: 8,  title: 'Absolute Unit',    color: '#ff6b6b' },
    { min: 12, title: 'Ascended Chad',    color: '#da70d6' },
    { min: 20, title: 'The Gains God',    color: '#fff' },
];

function getPrestigeTitle() {
    let t = prestigeTitles[0];
    for (const pt of prestigeTitles) { if (prestigeCount >= pt.min) t = pt; }
    return t;
}

// ==================== NUMBER FORMATTER ====================
// Late game absurd names per tier
const bigNumNames = [
    [1e15, 'Quadrillion'], [1e12, 'Trillion'], [1e9, 'Billion'],
    [1e6, 'Million'], [1e3, 'K']
];
const absurdNames = ['Goblin Gainz', 'Chad Stacks', 'Swole Units', 'Absolute Numbers', 'Sigma Reps'];

function formatReps(n) {
    n = Math.floor(n);
    if (n >= 1e15) {
        const idx = Math.min(Math.floor(Math.log10(n) / 3) - 5, absurdNames.length - 1);
        const div = Math.pow(10, (Math.floor(Math.log10(n) / 3)) * 3);
        return `${(n / div).toFixed(2)} ${absurdNames[Math.max(0, idx)]}`;
    }
    for (const [val, name] of bigNumNames) {
        if (n >= val) return `${(n / val).toFixed(2)}${name.substring(0,1)}`;
    }
    return n.toString();
}

// ==================== BUILD SYNERGY ====================
function getClickSynergyBonus() {
    const clickUpgrades = upgrades.filter(u => u.synergy === 'click').reduce((s, u) => s + u.owned, 0);
    return 1 + Math.floor(clickUpgrades / 10) * 0.10; // +10% per 10 click upgrades
}

function getAutoSynergyBonus() {
    const autoUpgrades = upgrades.filter(u => u.synergy === 'auto').reduce((s, u) => s + u.owned, 0);
    return 1 + Math.floor(autoUpgrades / 5) * 0.05; // +5% per 5 auto upgrades
}

function getChaosScore() {
    const chaosUpgrades = ['motivationalPoster', 'mysterySupp', 'giraffeSpotter', 'theVortex'];
    return chaosUpgrades.reduce((s, id) => s + (upgrades.find(u => u.id === id)?.owned || 0), 0);
}

function getChaosSynergyBonus() {
    const score = getChaosScore();
    // At 4+ chaos upgrades, random multiplier 0.5–10x rerolled every 60s
    if (score < 4) return 1;
    return chaosSynergyMultiplier;
}
let chaosSynergyMultiplier = 1;
let chaosRerollIntervalId = null;

function startChaosReroll() {
    if (chaosRerollIntervalId) clearInterval(chaosRerollIntervalId);
    chaosRerollIntervalId = setInterval(() => {
        if (getChaosScore() >= 4) {
            chaosSynergyMultiplier = 0.5 + Math.random() * 9.5;
            showMessage(`🌀 CHAOS SYNERGY REROLLED: ${chaosSynergyMultiplier.toFixed(2)}x`, 'event');
        }
    }, 60000);
}

// ==================== HELPERS ====================
function calculateCost(upgrade) {
    if (upgrade.basePrice === 0) return 0;
    return Math.floor(upgrade.basePrice * Math.pow(upgrade.growth, upgrade.owned));
}

function getTotalUpgrades() {
    return upgrades.reduce((s, u) => s + u.owned, 0);
}

function getNextReward() {
    return rewards.find(r => !r.earned && !r.secret) || rewards.find(r => !r.earned) || null;
}

function getProgressToReward() {
    const r = getNextReward();
    if (!r) return 100;
    const cur = getReqValue(r);
    return Math.min(100, (cur / r.val) * 100);
}

function getReqValue(reward) {
    switch (reward.req) {
        case 'reps': return reps;
        case 'upgrades': return getTotalUpgrades();
        case 'autoGym': return autoGymLevel;
        case 'clicks': return totalClicks;
        case 'prestige': return prestigeCount;
        case 'ascension': return ascensionStars;
        case 'goblin': return rewards.find(r => r.id === 'goblinCaught')?.earned ? 1 : 0;
        case 'lifetime_seconds': return lifetimeSeconds;
        case 'secret_69clicks': return secretNoBuyClickCount;
        case 'secret_midnight': {
            const h = new Date().getHours();
            return (h >= 2 && h < 4) ? 1 : 0;
        }
        default: return 0;
    }
}

function getVisibleUpgrades() {
    return upgrades.filter(u => {
        if (u.maxOwned && u.owned >= u.maxOwned) return true;
        const threshold = u.unlockAt;
        return (reps >= threshold || lifetimeReps >= threshold * 0.5);
    });
}

function getAutoRps() {
    if (autoGymLevel === 0) return 0;
    let base = 0;
    if (autoGymLevel === 1) base = repsPerClick / 3;
    else if (autoGymLevel === 2) base = repsPerClick;
    else if (autoGymLevel >= 3) base = repsPerClick * 2;

    const speaker = upgrades.find(u => u.id === 'bluetoothSpeaker')?.owned || 0;
    if (speaker > 0) base *= 2;

    const grandpa = upgrades.find(u => u.id === 'chairGrandpa')?.owned || 0;
    base += grandpa * 5;

    const robots = upgrades.find(u => u.id === 'robotGymCrew')?.owned || 0;
    base += robots * 50;

    const aiTrainer = upgrades.find(u => u.id === 'aiTrainer')?.owned || 0;
    if (aiTrainer > 0) base *= 1.5 * aiTrainer;

    const giraffe = upgrades.find(u => u.id === 'giraffeSpotter')?.owned || 0;
    if (giraffe > 0) base *= 1.10;

    // Vortex: rps based on lifetime playtime in seconds
    const vortex = upgrades.find(u => u.id === 'theVortex')?.owned || 0;
    if (vortex > 0) base += Math.floor(lifetimeSeconds / 60) * 1000;

    base *= getAutoSynergyBonus();
    base *= gainsMultiplier;
    base *= getMomentumBonus();
    base *= getRestXpBonus();
    base *= getRadioBonus('auto');
    base *= getChaosSynergyBonus();
    base *= getAscensionBonus();

    // Event multiplier (equipment malfunction = 0)
    const ev = getEventMultiplier();
    if (ev === 0) base = 0;
    else base *= ev;

    return base;
}

function getEffectiveRepsPerClick() {
    let rpc = repsPerClick;

    // Steak therapy doubles click
    const steak = upgrades.find(u => u.id === 'steakTherapy')?.owned || 0;
    if (steak > 0) rpc *= 2;

    const giraffe = upgrades.find(u => u.id === 'giraffeSpotter')?.owned || 0;
    if (giraffe > 0) rpc *= 1.10;

    rpc *= getClickSynergyBonus();
    rpc *= gainsMultiplier;
    rpc *= getMomentumBonus();
    rpc *= getRestXpBonus();
    rpc *= getRadioBonus('click');
    rpc *= getChaosSynergyBonus();
    rpc *= getAscensionBonus();

    return rpc;
}

function getMomentumBonus() { return 1 + (momentumTicks * 0.02); } // +2% per tick, max +50%
function getRestXpBonus() { return Date.now() < restXpEndTime ? restXpMultiplier : 1; }
function getAscensionBonus() { return Math.pow(2, ascensionStars); } // x2 per star

function getRadioBonus(type) {
    if (!activeStation) return 1;
    if (activeStation === 'rock'  && type === 'click') return 1.15;
    if (activeStation === 'lofi'  && type === 'auto')  return 1.20;
    if (activeStation === 'metal' && type === 'combo') return 1.25;
    return 1;
}

function getMysteryEffect() {
    if (!mysterySupplementEffect) return 1;
    return mysterySupplementEffect.mult;
}

// ==================== WEB AUDIO ====================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function playTone(freq, type = 'sine', duration = 0.15, vol = 0.25) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}
function playClickSound() { playTone(440 + Math.min(comboStreak * 15, 200), 'sine', 0.06, 0.1); }
function playMilestoneSound() { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 'triangle', 0.3, 0.4), i * 100)); }
function playGoblinSound() { [300,250,200].forEach((f,i) => setTimeout(() => playTone(f, 'sawtooth', 0.2, 0.35), i * 80)); }
function playUltraEventSound() { [400,600,800,1200,1600].forEach((f,i) => setTimeout(() => playTone(f, 'triangle', 0.4, 0.5), i * 80)); }

// ==================== COMBO SYSTEM ====================
function updateCombo() {
    const now = Date.now();
    const comboWindow = maxComboWindow + (upgrades.find(u => u.id === 'comboWindow')?.owned || 0) * 200
        + (gymCorpUpgrades.find(c => c.id === 'comboMaster')?.owned ? 400 : 0);

    if (lastClickTime > 0 && (now - lastClickTime) <= comboWindow) {
        const capBoost = upgrades.filter(u => u.id === 'rhythmTraining').reduce((s,u) => s + u.owned, 0);
        const cap = Math.min(20 + capBoost * 10, 100);
        comboStreak = Math.min(comboStreak + 1, cap);
    } else {
        comboStreak = 1;
    }
    lastClickTime = now;
    comboMultiplier = 1 + Math.floor(comboStreak / 3) * 0.25 * (getRadioBonus('combo'));

    if (comboTimeoutId) clearTimeout(comboTimeoutId);
    comboTimeoutId = setTimeout(() => {
        comboStreak = 0; comboMultiplier = 1;
        updateComboDisplay();
    }, comboWindow + 100);

    updateComboDisplay();
}

function updateComboDisplay() {
    const el = document.getElementById('comboDisplay');
    if (!el) return;
    if (comboStreak >= 3) {
        el.textContent = `🔥 x${comboMultiplier.toFixed(2)} COMBO (${comboStreak} streak)`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// ==================== MOMENTUM ====================
function startMomentum() {
    if (momentumIntervalId) clearInterval(momentumIntervalId);
    const tickTime = MOMENTUM_TICK_MS * (gymCorpUpgrades.find(c => c.id === 'morningRoutine')?.owned ? 0.5 : 1);
    momentumIntervalId = setInterval(() => {
        if (momentumTicks < MAX_MOMENTUM) {
            momentumTicks++;
            updateMomentumDisplay();
            if (momentumTicks === MAX_MOMENTUM) showMessage('🔥 MAX MOMENTUM! +50% all gains!', 'event');
        }
    }, tickTime);
}

function updateMomentumDisplay() {
    const el = document.getElementById('momentumDisplay');
    if (el) {
        el.textContent = `⚡ Momentum: ${momentumTicks}/${MAX_MOMENTUM} (+${(momentumTicks*2)}%)`;
        el.style.color = momentumTicks >= MAX_MOMENTUM ? '#ffd700' : '#4ecdc4';
    }
}

// ==================== REST XP ====================
function applyRestXp(elapsedSeconds) {
    const cappedHours = Math.min(elapsedSeconds / 3600, MAX_OFFLINE_HOURS);
    const durationMinutes = Math.min(cappedHours * 5, 30);
    restXpMultiplier = 2;
    restXpEndTime = Date.now() + durationMinutes * 60000;
    updateRestXpDisplay();
    setTimeout(() => { restXpMultiplier = 1; updateRestXpDisplay(); }, durationMinutes * 60000);
}

function updateRestXpDisplay() {
    const el = document.getElementById('restXpDisplay');
    if (!el) return;
    if (Date.now() < restXpEndTime) {
        const remaining = Math.ceil((restXpEndTime - Date.now()) / 1000);
        el.textContent = `😴 Rest Bonus: x2 (${remaining}s)`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// ==================== EVENTS ====================
function scheduleNextEvent() {
    if (eventTimeoutId) clearTimeout(eventTimeoutId);
    const broNetwork = gymCorpUpgrades.find(c => c.id === 'broNetwork')?.owned;
    const chaosMagnet = upgrades.find(u => u.id === 'chaosMagnet')?.owned || 0;
    const baseDelay = 30000 + Math.random() * 60000;
    const delay = baseDelay * (chaosMagnet > 0 ? 0.7 : 1);
    eventTimeoutId = setTimeout(triggerRandomEvent, delay);
}

function triggerRandomEvent() {
    // Ultra event check (0.5% chance, once per session)
    if (!sessionUltraEventFired && Math.random() < 0.005) {
        const ultraEvents = gymEvents.filter(e => e.ultra);
        if (ultraEvents.length) {
            const ev = ultraEvents[Math.floor(Math.random() * ultraEvents.length)];
            sessionUltraEventFired = true;
            fireEvent(ev);
            return;
        }
    }

    // Gains Goblin (3% chance, special logic)
    if (!gainsGoblinActive && Math.random() < 0.03) {
        triggerGainsGoblin();
        return;
    }

    // Normal events — bias positive if Bro Network owned
    const broNetwork = gymCorpUpgrades.find(c => c.id === 'broNetwork')?.owned;
    let pool = gymEvents.filter(e => !e.ultra);
    if (broNetwork) {
        const positives = pool.filter(e => e.multiplier >= 1);
        // Double the weight of positive events
        pool = [...pool, ...positives];
    }
    const ev = pool[Math.floor(Math.random() * pool.length)];
    fireEvent(ev);
}

function fireEvent(ev) {
    const chaser = gymCorpUpgrades.find(c => c.id === 'eventChaser')?.owned;
    const duration = ev.duration * (chaser ? 1.5 : 1);

    activeEvent = { ...ev, endTime: Date.now() + duration };
    const isPositive = ev.multiplier >= 1;

    if (ev.ultra) playUltraEventSound();
    else if (isPositive) playTone(660, 'triangle', 0.2, 0.3);
    else playTone(200, 'sawtooth', 0.3, 0.3);

    showEventBanner(ev, ev.ultra);

    // Special event effects
    if (ev.oneHourDump) {
        const dump = Math.floor(getAutoRps() * 3600);
        reps += dump;
        showMessage(`📸 VIRAL MOMENT: +${formatReps(dump)} reps!`, 'event');
    }
    if (ev.giftUpgrade) giveSwoleSantaGift();
    if (ev.tempUpgrade) giveCoachBonus();

    // Check for event chain (negative events → 5% chain)
    if (!isPositive && Math.random() < 0.05) {
        pendingChainEvent = true;
        setTimeout(() => {
            if (pendingChainEvent) {
                const chain = chainEvents[Math.floor(Math.random() * chainEvents.length)];
                fireEvent({ ...chain, id: 'chain_event', rare: false });
                pendingChainEvent = false;
            }
        }, duration + 5000);
    }

    setTimeout(() => {
        activeEvent = null;
        hideEventBanner();
        scheduleNextEvent();
    }, duration);
}

function giveSwoleSantaGift() {
    const affordable = upgrades.filter(u => !u.maxOwned || u.owned < u.maxOwned);
    if (!affordable.length) return;
    const gift = affordable[Math.floor(Math.random() * affordable.length)];
    gift.owned++;
    applyUpgradeEffect(gift);
    showMessage(`🎅 Swole Santa gifted: ${gift.emoji} ${gift.name}!`, 'event');
}

function giveCoachBonus() {
    // Temporary 10x click multiplier for 60 seconds
    const prev = repsPerClick;
    repsPerClick *= 10;
    showMessage(`🦁 THE COACH: Click power x10 for 60 seconds!`, 'event');
    setTimeout(() => {
        repsPerClick = prev;
        showMessage(`🦁 The Coach left. Your gains remain.`, 'success');
    }, 60000);
}

function triggerGainsGoblin() {
    const stolen = Math.floor(reps * 0.05);
    reps = Math.max(0, reps - stolen);
    gainsGoblinStolen = stolen;
    gainsGoblinActive = true;

    playGoblinSound();
    showEventBanner({ text: `👹 GAINS GOBLIN stole ${formatReps(stolen)} reps! CLICK FAST to recover + 50% interest! (15s)` }, false, false, true);

    gainsGoblinTimeoutId = setTimeout(() => {
        gainsGoblinActive = false;
        gainsGoblinStolen = 0;
        hideEventBanner();
        showMessage('👹 Goblin escaped with your gains. RIP.', 'error');
        scheduleNextEvent();
    }, 15000);
}

function handleGoblinChase() {
    if (!gainsGoblinActive) return;
    gainsGoblinStolen = Math.max(0, gainsGoblinStolen - repsPerClick * 5);
    if (gainsGoblinStolen <= 0) {
        // Caught the goblin!
        const bonus = Math.floor(gainsGoblinStolen * -1.5) + Math.floor(reps * 0.05 * 1.5);
        reps += bonus;
        gainsGoblinActive = false;
        clearTimeout(gainsGoblinTimeoutId);
        hideEventBanner();
        playMilestoneSound();
        showCongrats(`👹 GOBLIN CAUGHT! +${formatReps(bonus)} reps (50% interest)!`);
        rewards.find(r => r.id === 'goblinCaught').earned = true;
        renderRewards();
        scheduleNextEvent();
    }
}

function getEventMultiplier() {
    if (!activeEvent || Date.now() > activeEvent.endTime) {
        activeEvent = null;
        return 1;
    }
    // Equipment malfunction
    if (activeEvent.autoOffline) return 0; // only affects auto, handled in getAutoRps
    return activeEvent.multiplier;
}

function showEventBanner(ev, ultra = false, chain = false, goblin = false) {
    const banner = document.getElementById('eventBanner');
    if (!banner) return;
    const text = ev.text || ev;
    banner.textContent = text;
    const isPositive = !goblin && (ev.multiplier >= 1);
    banner.className = `event-banner ${ultra ? 'ultra' : goblin ? 'goblin' : isPositive ? 'positive' : 'negative'}`;
    banner.classList.remove('hidden');
}

function hideEventBanner() {
    const el = document.getElementById('eventBanner');
    if (el) el.classList.add('hidden');
}

// ==================== OFFLINE PROGRESS ====================
function applyOfflineProgress() {
    const lastSave = localStorage.getItem('gymSimulatorLastSave');
    if (!lastSave) return;

    const elapsed = (Date.now() - parseInt(lastSave, 10)) / 1000;
    if (elapsed < 30) return;

    // Apply rest XP spike
    if (elapsed > 60) applyRestXp(elapsed);

    if (autoGymLevel === 0) {
        if (elapsed > 60) showOfflineModal(elapsed, 0);
        return;
    }

    const cappedSec = Math.min(elapsed, MAX_OFFLINE_HOURS * 3600);
    const rps = getAutoRps();
    const earned = Math.floor(rps * cappedSec);
    if (earned > 0) reps += earned;

    lifetimeReps += earned;
    showOfflineModal(elapsed, earned);
}

function showOfflineModal(elapsed, earned) {
    const modal = document.getElementById('offlineModal');
    if (!modal) return;
    const humanTime = elapsed >= 3600 ? `${(elapsed/3600).toFixed(1)} hours` : `${Math.floor(elapsed/60)} minutes`;
    document.getElementById('offlineTime').textContent = humanTime;
    document.getElementById('offlineEarned').textContent = formatReps(earned);
    const restMsg = document.getElementById('offlineRestMsg');
    if (restMsg) {
        const restMins = Math.min((elapsed / 3600) * 5, 30).toFixed(0);
        restMsg.textContent = elapsed > 60 ? `⚡ Rest Bonus active: x2 gains for ${restMins} minutes!` : '';
    }
    modal.classList.remove('hidden');
}

// ==================== DAILY GOAL ====================
function initDailyGoal() {
    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem('gymSimulatorDaily') || '{}');

    if (saved.date === today) {
        dailyGoal = saved.goal;
        dailyGoalEarned = saved.earned || false;
    } else {
        // Generate new goal based on prestige
        const base = [500, 5000, 50000, 500000, 5000000][Math.min(prestigeCount, 4)];
        dailyGoal = { target: base, coins: 2 + prestigeCount };
        dailyGoalEarned = false;
        localStorage.setItem('gymSimulatorDaily', JSON.stringify({ date: today, goal: dailyGoal, earned: false }));
    }
    updateDailyGoalDisplay();
}

function checkDailyGoal() {
    if (!dailyGoal || dailyGoalEarned || reps < dailyGoal.target) return;
    dailyGoalEarned = true;
    const coins = dailyGoal.coins;
    gymCoins += coins;
    totalGymCoinsEarned += coins;
    playMilestoneSound();
    flashScreen();
    showCongrats(`📅 DAILY GOAL! +${coins} GymCoins!`);
    const saved = JSON.parse(localStorage.getItem('gymSimulatorDaily') || '{}');
    saved.earned = true;
    localStorage.setItem('gymSimulatorDaily', JSON.stringify(saved));
    updateDailyGoalDisplay();
    updateGymCorpDisplay();
}

function updateDailyGoalDisplay() {
    const el = document.getElementById('dailyGoalDisplay');
    if (!el || !dailyGoal) return;
    if (dailyGoalEarned) {
        el.textContent = `📅 Daily Goal: COMPLETE ✅ (+${dailyGoal.coins} GymCoins earned)`;
        el.style.color = '#4ecdc4';
    } else {
        const pct = Math.min(100, (reps / dailyGoal.target) * 100).toFixed(0);
        el.textContent = `📅 Daily: ${formatReps(reps)}/${formatReps(dailyGoal.target)} reps (${pct}%) → +${dailyGoal.coins} 🪙`;
        el.style.color = reps >= dailyGoal.target * 0.8 ? '#ffd700' : '#888';
    }
}

// ==================== MIRROR SIMULATOR ====================
function updateMirror() {
    const el = document.getElementById('mirrorStat');
    if (!el) return;
    // Fake body fat % — decreases as reps increase, min 3%
    const fakeBF = Math.max(3, 35 - Math.log10(Math.max(1, lifetimeReps)) * 3).toFixed(1);
    el.textContent = `🪞 Body Fat: ${fakeBF}%`;
    el.title = 'This is a completely made-up number. You look great though.';
}

// ==================== PRESTIGE ====================
function canPrestige() { return reps >= PRESTIGE_THRESHOLD; }
function canAscend() { return lifetimePrestigesEverDone >= ASCENSION_THRESHOLD && ascensionStars < 5; }

function computeGymCoinsFromPrestige() {
    const logReps = Math.max(1, Math.log10(lifetimeReps));
    const influencer = gymCorpUpgrades.find(c => c.id === 'gymInfluencer')?.owned ? 2 : 1;
    return Math.max(1, Math.floor(logReps * influencer));
}

function performPrestige() {
    if (!canPrestige()) return;
    document.getElementById('prestigeModal').classList.add('hidden');

    const coinsEarned = computeGymCoinsFromPrestige();
    gymCoins += coinsEarned;
    totalGymCoinsEarned += coinsEarned;
    prestigeCount++;
    lifetimePrestigesEverDone++;
    gainsMultiplier = 1 + prestigeCount * 0.5;

    // Hard reset
    if (autoClickIntervalId) { clearInterval(autoClickIntervalId); autoClickIntervalId = null; }
    reps = 0; repsPerClick = 1; totalClicks = 0; autoGymLevel = 0;
    upgrades.forEach(u => { u.owned = 0; });
    rewards.forEach(r => { if (r.id !== 'wentPro') r.earned = false; });
    if (prestigeCount >= 1) rewards.find(r => r.id === 'wentPro').earned = true;

    // Gym Corp perks applied to new run
    if (gymCorpUpgrades.find(c => c.id === 'startingSupps')?.owned) {
        const ps = upgrades.find(u => u.id === 'proteinShake');
        ps.owned = 10; repsPerClick += 10;
    }
    if (gymCorpUpgrades.find(c => c.id === 'vipMembership')?.owned) {
        const ag = upgrades.find(u => u.id === 'autoGym');
        ag.owned = 1; autoGymLevel = 1; updateAutoGym();
    }

    momentumTicks = 0;
    playMilestoneSound(); flashScreen();
    const pt = getPrestigeTitle();
    showCongrats(`🌟 WENT PRO! Now: ${pt.title}! +${coinsEarned} 🪙 GymCoins!`);

    saveGame(); updateDisplay(); renderRewards(); updateGymCorpDisplay();
}

function performAscension() {
    if (!canAscend()) return;
    document.getElementById('ascensionModal').classList.add('hidden');

    ascensionStars++;
    // Wipe prestige count and gymcoins (they reset) but keep ascension stars
    prestigeCount = 0;
    gainsMultiplier = 1;
    gymCoins = 0; // wiped!
    lifetimePrestigesEverDone = 0;
    gymCorpUpgrades.forEach(u => { u.owned = false; });
    upgrades.forEach(u => { u.owned = 0; });
    rewards.forEach(r => { if (!['longHaul','midnightGains','methodActor'].includes(r.id)) r.earned = false; });

    if (autoClickIntervalId) { clearInterval(autoClickIntervalId); autoClickIntervalId = null; }
    reps = 0; repsPerClick = 1; totalClicks = 0; autoGymLevel = 0;

    rewards.find(r => r.id === 'ascended').earned = true;

    playUltraEventSound(); flashScreen('#ffd700');
    showCongrats(`✨ ASCENDED! Star ${ascensionStars}/5! All gains x${getAscensionBonus()}!`);
    saveGame(); updateDisplay(); renderRewards();
}

// ==================== SCREEN FLASH ====================
function flashScreen(color = null) {
    document.body.style.setProperty('--flash-color', color || 'rgba(255,215,0,0.4)');
    document.body.classList.add('milestone-flash');
    setTimeout(() => document.body.classList.remove('milestone-flash'), 700);
}

// ==================== CORE CLICK ====================
function handleWorkout() {
    updateCombo();
    playClickSound();

    // Secret: method actor (69 clicks without buying)
    secretNoBuyClickCount++;
    if (secretNoBuyClickCount === 69) {
        unlockSecret('methodActor');
    }

    // Handle Gains Goblin chase
    if (gainsGoblinActive) {
        handleGoblinChase();
        return;
    }

    // Bro Science Degree bad advice: every 10th click = 0 reps
    const bsd = upgrades.find(u => u.id === 'broScienceDegree')?.owned || 0;
    if (bsd > 0) {
        broScienceBadAdviceCounter = (broScienceBadAdviceCounter + 1) % 10;
        if (broScienceBadAdviceCounter === 0) {
            showFloatingText('BAD ADVICE!', document.getElementById('workoutBtn'), false, '#ff6b6b');
            showMessage('🧠 You gave yourself bad advice. 0 reps.', 'error');
            totalClicks++;
            updateDisplay(); checkRewards(); saveGame();
            return;
        }
    }

    const rpc = getEffectiveRepsPerClick();
    const ev = (!activeEvent?.autoOffline) ? getEventMultiplier() : 1;
    const mystery = getMysteryEffect();
    const gained = Math.floor(rpc * comboMultiplier * ev * mystery);

    reps += gained;
    lifetimeReps += gained;
    totalClicks++;

    // Steak therapy: 1% MEAT EVENT
    const steak = upgrades.find(u => u.id === 'steakTherapy')?.owned || 0;
    if (steak > 0 && Math.random() < 0.01) {
        const meatBonus = Math.floor(gained * 2);
        reps += meatBonus;
        showMessage('🥩 MEAT EVENT! 3x gains for 5s!', 'event');
        const prev = repsPerClick;
        repsPerClick *= 3;
        setTimeout(() => { repsPerClick = prev; }, 5000);
    }

    // Flavor text
    const instr = document.querySelector('.instruction');
    if (instr && Math.random() < 0.15) instr.textContent = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];

    showFloatingText(`+${formatReps(gained)}`, document.getElementById('workoutBtn'), comboMultiplier > 1.5);
    updateDisplay(); checkRewards(); checkDailyGoal(); saveGame();
    updateMirror();

    // Secret midnight check
    const h = new Date().getHours();
    if (h >= 2 && h < 4 && !rewards.find(r => r.id === 'midnightGains')?.earned) {
        unlockSecret('midnightGains');
    }
}

// ==================== BUY UPGRADE ====================
function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    if (upgrade.maxOwned && upgrade.owned >= upgrade.maxOwned) {
        showMessage("Already maxed!", 'error'); return;
    }
    const cost = calculateCost(upgrade);
    if (reps < cost) { showMessage('Not enough reps! Grind harder. 💪', 'error'); return; }

    reps -= cost;
    upgrade.owned++;
    secretNoBuyClickCount = 0; // reset method actor counter on any purchase

    // Mystery Supplement: roll random effect on first purchase
    if (upgrade.id === 'mysterySupp' && upgrade.owned === 1) {
        rollMysteryEffect();
    }

    applyUpgradeEffect(upgrade);

    // Chaos synergy
    if (getChaosScore() >= 4 && !chaosRerollIntervalId) startChaosReroll();

    playTone(550, 'triangle', 0.12, 0.3);
    updateDisplay(); checkRewards(); saveGame();
    showMessage(`Purchased ${upgrade.emoji} ${upgrade.name}!`, 'success');
}

function applyUpgradeEffect(upgrade) {
    if (upgrade.type === 'click') repsPerClick += upgrade.effect;
    else if (upgrade.type === 'auto') { autoGymLevel++; updateAutoGym(); }
    else if (upgrade.type === 'broscience') repsPerClick += upgrade.effect;
    else if (['autoBoost', 'morale', 'autoFlat', 'autoMult', 'giraffeBonus', 'vortex'].includes(upgrade.type)) {
        if (autoGymLevel > 0) updateAutoGym();
    }
    else if (upgrade.type === 'comboWindow') { /* handled dynamically */ }
    else if (upgrade.type === 'comboBoost')  { /* handled dynamically */ }
}

function rollMysteryEffect() {
    const effects = [
        { name: '💪 Massive gains',     mult: 5.0,  msg: '💊 Mystery Supplement: MASSIVE GAINS! x5 everything!' },
        { name: '⚡ Energy boost',       mult: 2.0,  msg: '💊 Mystery Supplement: Energy boost! x2 gains.' },
        { name: '🤏 Micro gains',       mult: 0.5,  msg: '💊 Mystery Supplement: ...Micro gains. x0.5.' },
        { name: '🌀 Transcendence',     mult: 10.0, msg: '💊 Mystery Supplement: TRANSCENDENCE!!! x10 ALL GAINS!' },
        { name: '💀 Nothing happened',  mult: 1.0,  msg: '💊 Mystery Supplement: Nothing happened. You feel watched.' },
        { name: '🔥 Moderate gains',    mult: 3.0,  msg: '💊 Mystery Supplement: Solid 3x gains. Respectable.' },
        { name: '🧊 Ice cold',          mult: 0.25, msg: '💊 Mystery Supplement: Ice cold. Everything slowed down.' },
        { name: '✨ Pure chaos',        mult: 7.5,  msg: '💊 Mystery Supplement: Pure chaos. 7.5x. Is this real?' },
    ];
    mysterySupplementEffect = effects[Math.floor(Math.random() * effects.length)];
    showMessage(mysterySupplementEffect.msg, 'event');
    if (mysterySupplementEffect.mult >= 5) { playMilestoneSound(); flashScreen(); }
}

// ==================== AUTO GYM ====================
function updateAutoGym() {
    if (autoClickIntervalId) { clearInterval(autoClickIntervalId); autoClickIntervalId = null; }
    if (autoGymLevel === 0) return;
    const interval = autoGymLevel === 1 ? 3000 : autoGymLevel === 2 ? 1000 : 500;
    autoClickIntervalId = setInterval(() => {
        if (activeEvent?.autoOffline) return; // equipment malfunction
        const earned = getAutoRps() * (interval / 1000);
        reps += earned;
        lifetimeReps += earned;
        updateDisplay(); checkRewards(); checkDailyGoal();
        if (Math.random() < 0.05) saveGame();
    }, interval);
}

// ==================== REWARDS CHECK ====================
function checkRewards() {
    let changed = false;
    rewards.forEach(r => {
        if (r.earned) return;
        if (r.secret) {
            // handled by unlockSecret()
            if (r.req === 'lifetime_seconds' && lifetimeSeconds >= r.val) unlockSecret(r.id);
            return;
        }
        const cur = getReqValue(r);
        if (cur >= r.val) {
            r.earned = true; changed = true;
            playMilestoneSound(); flashScreen();
            showCongrats(`${r.emoji} ${r.name} Unlocked!`);
        }
    });
    if (changed) renderRewards();
}

function unlockSecret(id) {
    const r = rewards.find(x => x.id === id);
    if (!r || r.earned) return;
    r.earned = true;
    r.name = r.revealAfter;
    r.emoji = r.revealAfter.split(' ')[0];

    // Apply bonus
    if (id === 'longHaul') gainsMultiplier *= 1.25;
    if (id === 'midnightGains') { /* passive +10% via nocturnalBonus in save */ }

    playMilestoneSound(); flashScreen('#da70d6');
    showCongrats(`🔓 SECRET UNLOCKED: ${r.revealAfter}`);
    renderRewards(); saveGame();
}

// ==================== GYM CORP ====================
function buyGymCorpUpgrade(id) {
    const upgrade = gymCorpUpgrades.find(u => u.id === id);
    if (!upgrade || upgrade.owned) { showMessage('Already owned!', 'error'); return; }
    if (gymCoins < upgrade.cost) { showMessage(`Need ${upgrade.cost} 🪙 GymCoins!`, 'error'); return; }
    gymCoins -= upgrade.cost;
    upgrade.owned = true;
    playMilestoneSound(); flashScreen();
    showMessage(`✅ ${upgrade.emoji} ${upgrade.name} permanently unlocked!`, 'success');
    updateGymCorpDisplay(); saveGame();
}

function updateGymCorpDisplay() {
    const el = document.getElementById('gymCorpContainer');
    if (!el) return;
    document.getElementById('gymCoinCount').textContent = formatReps(gymCoins);
    el.innerHTML = '';
    gymCorpUpgrades.forEach(upg => {
        const canAfford = gymCoins >= upg.cost;
        const card = document.createElement('div');
        card.className = `gymcorp-card ${upg.owned ? 'owned' : canAfford ? 'affordable' : 'not-affordable'}`;
        card.innerHTML = `
            <div class="upgrade-info">
                <div class="upgrade-name">${upg.emoji} ${upg.name}${upg.owned ? ' ✅' : ''}</div>
                <div class="upgrade-description">${upg.desc}</div>
            </div>
            <button class="gymcorp-buy-btn" data-corp-id="${upg.id}" ${upg.owned || !canAfford ? 'disabled' : ''}>
                ${upg.owned ? 'Owned' : `${upg.cost} 🪙`}
            </button>`;
        el.appendChild(card);
    });
    document.querySelectorAll('.gymcorp-buy-btn').forEach(btn => {
        btn.addEventListener('click', e => buyGymCorpUpgrade(e.target.getAttribute('data-corp-id')));
    });
}

// ==================== VIEW ====================
function updateDisplay() {
    document.getElementById('totalReps').textContent = `${formatReps(reps)} REPS`;
    document.getElementById('repsPerClick').textContent = formatReps(Math.floor(getEffectiveRepsPerClick() * comboMultiplier));
    document.getElementById('autoGymLevel').textContent = autoGymLevel;
    document.getElementById('totalUpgrades').textContent = getTotalUpgrades();
    document.getElementById('repsPerSecond').textContent = formatReps(getAutoRps());
    document.getElementById('lifetimeReps').textContent = formatReps(lifetimeReps);

    const pt = getPrestigeTitle();
    const ptEl = document.getElementById('prestigeTitle');
    if (ptEl) { ptEl.textContent = `${pt.title} (x${gainsMultiplier.toFixed(1)} gains)`; ptEl.style.color = pt.color; }

    document.getElementById('prestigeCount').textContent = prestigeCount;
    document.getElementById('ascensionStars').textContent = '⭐'.repeat(ascensionStars) || '—';

    renderUpgrades();
    updateProgressBar();
    updatePrestigeUI();
    updateMomentumDisplay();
    updateRestXpDisplay();
    updateDailyGoalDisplay();
    updateMirror();
    updateGymCorpDisplay();
}

function renderUpgrades() {
    const container = document.getElementById('upgradesContainer');
    const visible = getVisibleUpgrades();
    if (!visible.length) {
        container.innerHTML = '<p style="color:#555;font-size:0.88rem;padding:8px;">Earn more reps to unlock upgrades...</p>';
        return;
    }
    container.innerHTML = '';
    visible.forEach(upgrade => {
        const cost = calculateCost(upgrade);
        const canAfford = reps >= cost;
        const maxed = upgrade.maxOwned && upgrade.owned >= upgrade.maxOwned;
        let star = '';
        if (upgrade.owned >= 50) star = ' 🌟';
        else if (upgrade.owned >= 25) star = ' ⭐⭐';
        else if (upgrade.owned >= 10) star = ' ⭐';
        const card = document.createElement('div');
        card.className = `upgrade-card ${canAfford && !maxed ? 'affordable' : 'not-affordable'} synergy-${upgrade.synergy || 'none'}`;
        card.innerHTML = `
            <div class="upgrade-info">
                <div class="upgrade-name">${upgrade.emoji} ${upgrade.name}${star}</div>
                <div class="upgrade-description">${upgrade.desc}</div>
                <div class="upgrade-owned">Owned: ${upgrade.owned}${upgrade.maxOwned ? `/${upgrade.maxOwned}` : ''}</div>
            </div>
            <button class="upgrade-buy-btn" data-upgrade-id="${upgrade.id}" ${(!canAfford || maxed) ? 'disabled' : ''}>
                ${maxed ? 'MAXED' : formatReps(cost) + ' reps'}
            </button>`;
        container.appendChild(card);
    });
    document.querySelectorAll('.upgrade-buy-btn').forEach(btn => {
        btn.addEventListener('click', e => buyUpgrade(e.target.getAttribute('data-upgrade-id')));
    });
}

function renderRewards() {
    const container = document.getElementById('rewardsContainer');
    container.innerHTML = '';
    const earned = rewards.filter(r => r.earned).length;
    document.getElementById('rewardCount').textContent = `(${earned}/${rewards.length})`;

    // Impossible dream always last
    const sorted = [...rewards.filter(r => r.id !== 'becomeTheGym'), rewards.find(r => r.id === 'becomeTheGym')];
    sorted.forEach(reward => {
        if (!reward) return;
        const badge = document.createElement('div');
        const isDream = reward.id === 'becomeTheGym';
        badge.className = `reward-badge ${reward.earned ? 'earned' : 'not-earned'} ${isDream ? 'dream-trophy' : ''}`;
        const name = reward.secret && !reward.earned ? '???' : reward.name;
        badge.innerHTML = `<span class="reward-icon">${reward.earned ? reward.emoji : reward.secret ? '🔒' : reward.emoji}</span><div class="reward-name">${name}</div>`;
        if (isDream) {
            const pct = Math.min(100, (lifetimeReps / reward.val) * 100).toFixed(6);
            badge.title = `Become The Gym: ${pct}% there`;
        }
        container.appendChild(badge);
    });
}

function updateProgressBar() {
    const r = getNextReward();
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    if (r) {
        fill.style.width = `${getProgressToReward()}%`;
        const valStr = ['reps','clicks','lifetime_seconds'].includes(r.req) ? formatReps(r.val) + (r.req === 'lifetime_seconds' ? 's playtime' : r.req === 'clicks' ? ' clicks' : ' reps') : r.val;
        label.textContent = r.secret ? `Next secret: ???` : `Next: ${r.name} — ${valStr}`;
    } else {
        fill.style.width = '100%';
        label.textContent = 'All trophies earned! 🎉';
    }
}

function updatePrestigeUI() {
    const goProBtn = document.getElementById('goProBtn');
    if (goProBtn) goProBtn.classList.toggle('hidden', !canPrestige());
    const ascendBtn = document.getElementById('ascendBtn');
    if (ascendBtn) ascendBtn.classList.toggle('hidden', !canAscend());
    const prestigeInfoEl = document.getElementById('prestigeCoinsPreview');
    if (prestigeInfoEl) prestigeInfoEl.textContent = `Will earn: ~${computeGymCoinsFromPrestige()} 🪙 GymCoins`;
}

function showFloatingText(text, element, big = false, color = null) {
    const el = document.createElement('div');
    el.className = `floating-text${big ? ' big' : ''}`;
    if (color) el.style.color = color;
    el.textContent = text;
    const rect = element.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    el.style.top = `${rect.top + window.scrollY - 10}px`;
    el.style.transform = 'translateX(-50%)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showMessage(text, type) {
    const el = document.getElementById('messageArea');
    el.textContent = text;
    el.style.backgroundColor = type === 'error' ? '#ff6b6b' : type === 'event' ? '#9b59b6' : '#4ecdc4';
    el.style.color = type === 'error' ? '#fff' : '#111';
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
}

function showCongrats(message) {
    const popup = document.getElementById('congratsPopup');
    popup.textContent = message;
    popup.classList.remove('hidden');
    clearTimeout(popup._timeout);
    popup._timeout = setTimeout(() => popup.classList.add('hidden'), 3500);
}

// ==================== RADIO ====================
function setStation(station) {
    activeStation = activeStation === station ? null : station;
    ['rock', 'lofi', 'metal'].forEach(s => {
        const btn = document.getElementById(`radio-${s}`);
        if (btn) btn.classList.toggle('active', activeStation === s);
    });
    const msgs = { rock: '🎸 Rock: +15% click power', lofi: '🎵 Lo-fi: +20% auto gains', metal: '🤘 Metal: +25% combo multiplier' };
    if (activeStation) showMessage(msgs[activeStation], 'success');
    else showMessage('📻 Radio off. Silence is also gains.', 'success');
}

// ==================== HELP PANEL ====================
function toggleHelp() {
    const panel = document.getElementById('helpPanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) populateHelpPanel();
}

function populateHelpPanel() {
    const ul = document.getElementById('helpUpgradesList');
    ul.innerHTML = '';
    upgrades.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${u.emoji} ${u.name}</strong>: ${u.desc} <em style="color:#555">(unlocks at ${u.unlockAt === 0 ? 'start' : formatReps(u.unlockAt)})</em>`;
        ul.appendChild(li);
    });
    const rl = document.getElementById('helpRewardsList');
    rl.innerHTML = '';
    rewards.filter(r => !r.secret).forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${r.emoji} ${r.name}</strong>: ${r.req} ≥ ${formatReps(r.val)}`;
        rl.appendChild(li);
    });
}

// ==================== SAVE/LOAD ====================
function saveGame() {
    lifetimeSeconds += Math.floor((Date.now() - sessionStartTime) / 1000);
    sessionStartTime = Date.now();

    const state = {
        reps, repsPerClick, totalClicks, autoGymLevel, lifetimeReps, lifetimeSeconds,
        gymCoins, totalGymCoinsEarned, prestigeCount, gainsMultiplier,
        ascensionStars, lifetimePrestigesEverDone,
        upgrades: upgrades.map(u => ({ id: u.id, owned: u.owned })),
        rewards: rewards.map(r => ({ id: r.id, earned: r.earned, name: r.name, emoji: r.emoji })),
        gymCorpUpgrades: gymCorpUpgrades.map(u => ({ id: u.id, owned: u.owned })),
        mysterySupplementEffect,
        runNumber
    };
    localStorage.setItem('gymSimulatorSave', JSON.stringify(state));
    localStorage.setItem('gymSimulatorLastSave', Date.now().toString());
}

function loadGame() {
    const raw = localStorage.getItem('gymSimulatorSave');
    if (!raw) return;
    try {
        const s = JSON.parse(raw);
        reps = s.reps || 0;
        repsPerClick = s.repsPerClick || 1;
        totalClicks = s.totalClicks || 0;
        autoGymLevel = s.autoGymLevel || 0;
        lifetimeReps = s.lifetimeReps || 0;
        lifetimeSeconds = s.lifetimeSeconds || 0;
        gymCoins = s.gymCoins || 0;
        totalGymCoinsEarned = s.totalGymCoinsEarned || 0;
        prestigeCount = s.prestigeCount || 0;
        gainsMultiplier = s.gainsMultiplier || 1;
        ascensionStars = s.ascensionStars || 0;
        lifetimePrestigesEverDone = s.lifetimePrestigesEverDone || 0;
        mysterySupplementEffect = s.mysterySupplementEffect || null;
        runNumber = s.runNumber || 0;

        if (s.upgrades) s.upgrades.forEach(su => { const u = upgrades.find(x => x.id === su.id); if (u) u.owned = su.owned; });
        if (s.rewards) s.rewards.forEach(sr => { const r = rewards.find(x => x.id === sr.id); if (r) { r.earned = sr.earned; if (sr.name) r.name = sr.name; if (sr.emoji) r.emoji = sr.emoji; } });
        if (s.gymCorpUpgrades) s.gymCorpUpgrades.forEach(sc => { const u = gymCorpUpgrades.find(x => x.id === sc.id); if (u) u.owned = sc.owned; });

        if (autoGymLevel > 0) updateAutoGym();
        if (getChaosScore() >= 4) startChaosReroll();
    } catch(e) { console.error('Load error:', e); }
}

function openResetModal() { document.getElementById('resetModal').classList.remove('hidden'); }
function closeResetModal() { document.getElementById('resetModal').classList.add('hidden'); }

function performReset() {
    ['gymSimulatorSave','gymSimulatorLastSave'].forEach(k => localStorage.removeItem(k));
    if (autoClickIntervalId) { clearInterval(autoClickIntervalId); autoClickIntervalId = null; }
    if (eventTimeoutId) { clearTimeout(eventTimeoutId); eventTimeoutId = null; }
    if (momentumIntervalId) { clearInterval(momentumIntervalId); momentumIntervalId = null; }
    if (chaosRerollIntervalId) { clearInterval(chaosRerollIntervalId); chaosRerollIntervalId = null; }

    reps = 0; repsPerClick = 1; totalClicks = 0; autoGymLevel = 0;
    lifetimeReps = 0; lifetimeSeconds = 0; gymCoins = 0; totalGymCoinsEarned = 0;
    prestigeCount = 0; gainsMultiplier = 1; ascensionStars = 0; lifetimePrestigesEverDone = 0;
    momentumTicks = 0; comboStreak = 0; comboMultiplier = 1;
    mysterySupplementEffect = null; activeEvent = null; gainsGoblinActive = false;

    upgrades.forEach(u => { u.owned = 0; });
    rewards.forEach(r => { r.earned = false; });
    gymCorpUpgrades.forEach(u => { u.owned = false; });

    updateDisplay(); renderRewards(); hideEventBanner();
    document.getElementById('helpPanel').classList.add('hidden');
    closeResetModal();
    showMessage('Complete reset. The gains begin again. 💪', 'success');
    scheduleNextEvent(); startMomentum(); initDailyGoal();
}

// ==================== INIT ====================
window.addEventListener('load', () => {
    loadGame();
    applyOfflineProgress();
    initDailyGoal();

    // Core events
    document.getElementById('workoutBtn').addEventListener('click', handleWorkout);
    document.getElementById('helpBtn').addEventListener('click', toggleHelp);
    document.getElementById('closeHelp').addEventListener('click', toggleHelp);
    document.getElementById('resetBtn').addEventListener('click', openResetModal);
    document.getElementById('cancelReset').addEventListener('click', closeResetModal);
    document.getElementById('confirmReset').addEventListener('click', performReset);

    // Prestige
    const goProBtn = document.getElementById('goProBtn');
    if (goProBtn) goProBtn.addEventListener('click', () => document.getElementById('prestigeModal').classList.remove('hidden'));
    document.getElementById('cancelPrestige')?.addEventListener('click', () => document.getElementById('prestigeModal').classList.add('hidden'));
    document.getElementById('confirmPrestige')?.addEventListener('click', performPrestige);

    // Ascension
    const ascendBtn = document.getElementById('ascendBtn');
    if (ascendBtn) ascendBtn.addEventListener('click', () => document.getElementById('ascensionModal').classList.remove('hidden'));
    document.getElementById('cancelAscension')?.addEventListener('click', () => document.getElementById('ascensionModal').classList.add('hidden'));
    document.getElementById('confirmAscension')?.addEventListener('click', performAscension);

    // Offline modal
    document.getElementById('closeOfflineModal')?.addEventListener('click', () => {
        document.getElementById('offlineModal').classList.add('hidden');
        updateDisplay(); checkRewards(); saveGame();
    });

    // Gym Corp tab
    document.getElementById('gymCorpTab')?.addEventListener('click', () => {
        document.getElementById('gymCorpPanel').classList.toggle('hidden');
        updateGymCorpDisplay();
    });

    // Radio
    ['rock','lofi','metal'].forEach(s => {
        document.getElementById(`radio-${s}`)?.addEventListener('click', () => setStation(s));
    });

    updateDisplay();
    renderRewards();
    updateGymCorpDisplay();
    scheduleNextEvent();
    startMomentum();
    startChaosReroll();

    // Lifetime seconds ticker (every minute)
    setInterval(() => {
        lifetimeSeconds += 60;
        if (lifetimeSeconds >= 86400) checkRewards();
    }, 60000);

    // Save every 30 seconds
    setInterval(saveGame, 30000);
});