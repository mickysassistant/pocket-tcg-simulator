#!/usr/bin/env node

/**
 * STAGE 3: Evolution UX Discoverability Tests
 *
 * Tests for evolution UI discoverability features:
 * - Visual indicators for evolution cards in hand
 * - Valid evolution target highlighting
 * - Help tooltip functionality
 * - Evolution discoverability flow
 *
 * Run with: node test-stage3-evolution-ux.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import simulator modules
const gameStatePath = join(__dirname, 'js/engine/game-state.js');
const movesPath = join(__dirname, 'js/engine/moves.js');

console.log('Loading modules...');
const {
    createInitialState,
    cloneState,
    addLogEntry
} = await import(gameStatePath);

const {
    canEvolve,
    executeEvolve,
    canPlayToBench,
    executePlayToBench,
    canPlayToActive,
    executePlayToActive
} = await import(movesPath);

// Mock card loader for testing
const mockCards = {
    'base-pikachu': {
        id: 'base-pikachu',
        name: 'Pikachu',
        supertype: 'Pokémon',
        subtypes: ['Basic'],
        hp: 60,
        evolvesFrom: null
    },
    'evolution-raichu': {
        id: 'evolution-raichu',
        name: 'Raichu',
        supertype: 'Pokémon',
        subtypes: ['Stage 1'],
        hp: 90,
        evolvesFrom: 'Pikachu'
    },
    'base-bulbasaur': {
        id: 'base-bulbasaur',
        name: 'Bulbasaur',
        supertype: 'Pokémon',
        subtypes: ['Basic'],
        hp: 60,
        evolvesFrom: null
    },
    'evolution-ivysaur': {
        id: 'evolution-ivysaur',
        name: 'Ivysaur',
        supertype: 'Pokémon',
        subtypes: ['Stage 1'],
        hp: 90,
        evolvesFrom: 'Bulbasaur'
    }
};

function getCard(cardId) {
    return mockCards[cardId] || null;
}

// ============================================================================
// TEST RESULTS TRACKING
// ============================================================================

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    testsRun++;
    try {
        fn();
        console.log(`✅ Test ${testsRun}: ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ Test ${testsRun}: ${description}`);
        console.error(`   ${error.message}`);
        testsFailed++;
    }
}

// ============================================================================
// HELPER FUNCTIONS (simulating Stage 3 UI helpers)
// ============================================================================

function isBasicPokemonCard(card) {
    if (!card) return false;
    if (card.subtypes && card.subtypes.includes('Basic')) return true;
    if (card.stage === 'Basic' || card.stage === 0) return true;
    if (card.supertype === 'Pokémon' && !card.evolvesFrom) return true;
    return false;
}

function isEvolutionCard(card) {
    if (!card) return false;
    return card.supertype === 'Pokémon' && !isBasicPokemonCard(card);
}

function getEvolvesFrom(card) {
    if (!card) return null;
    return card.evolvesFrom || card.stage || null;
}

function getValidEvolutionTargets(state, playerId, evoCard, getCardFn) {
    const player = state[playerId];
    if (!player) return [];

    const evolvesFrom = getEvolvesFrom(evoCard);
    if (!evolvesFrom) return [];

    const targets = [];

    // Check active Pokemon
    if (player.active) {
        const activeCard = getCardFn(player.active.cardId);
        if (activeCard && activeCard.name === evolvesFrom) {
            // Find the hand index for this evolution card
            const handIndex = player.hand.findIndex(id => id === evoCard.id);
            if (handIndex >= 0) {
                const check = canEvolve(state, playerId, handIndex, 'active', getCardFn);
                if (check.valid) {
                    targets.push({ location: 'active', cardName: activeCard.name });
                }
            }
        }
    }

    // Check bench Pokemon
    for (let i = 0; i < player.bench.length; i++) {
        const benchPokemon = player.bench[i];
        if (benchPokemon) {
            const benchCard = getCardFn(benchPokemon.cardId);
            if (benchCard && benchCard.name === evolvesFrom) {
                // Find the hand index for this evolution card
                const handIndex = player.hand.findIndex(id => id === evoCard.id);
                if (handIndex >= 0) {
                    const check = canEvolve(state, playerId, handIndex, i, getCardFn);
                    if (check.valid) {
                        targets.push({ location: i, cardName: benchCard.name });
                    }
                }
            }
        }
    }

    return targets;
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('\n========================================');
console.log('STAGE 3: Evolution UX Discoverability Tests');
console.log('========================================\n');

// Category 1: Evolution Card Identification
console.log('Category 1: Evolution Card Identification');
console.log('----------------------------------------');

test('1.1: isBasicPokemonCard correctly identifies Basic Pokemon', () => {
    const basicCard = mockCards['base-pikachu'];
    if (!isBasicPokemonCard(basicCard)) {
        throw new Error('Basic Pokemon card not identified as Basic');
    }
});

test('1.2: isBasicPokemonCard correctly rejects evolution cards', () => {
    const evoCard = mockCards['evolution-raichu'];
    if (isBasicPokemonCard(evoCard)) {
        throw new Error('Evolution card incorrectly identified as Basic');
    }
});

test('1.3: isEvolutionCard correctly identifies evolution cards', () => {
    const evoCard = mockCards['evolution-raichu'];
    if (!isEvolutionCard(evoCard)) {
        throw new Error('Evolution card not identified');
    }
});

test('1.4: isEvolutionCard correctly rejects Basic Pokemon', () => {
    const basicCard = mockCards['base-pikachu'];
    if (isEvolutionCard(basicCard)) {
        throw new Error('Basic Pokemon incorrectly identified as evolution card');
    }
});

test('1.5: getEvolvesFrom returns correct value for evolution cards', () => {
    const evoCard = mockCards['evolution-raichu'];
    const evolvesFrom = getEvolvesFrom(evoCard);
    if (evolvesFrom !== 'Pikachu') {
        throw new Error(`Expected evolvesFrom 'Pikachu', got '${evolvesFrom}'`);
    }
});

test('1.6: getEvolvesFrom returns null for Basic Pokemon', () => {
    const basicCard = mockCards['base-pikachu'];
    const evolvesFrom = getEvolvesFrom(basicCard);
    if (evolvesFrom !== null) {
        throw new Error(`Expected null for Basic Pokemon, got '${evolvesFrom}'`);
    }
});

// Category 2: Valid Evolution Target Detection
console.log('\nCategory 2: Valid Evolution Target Detection');
console.log('---------------------------------------------');

test('2.1: Detects valid evolution target on active zone', () => {
    let state = createInitialState();
    state.turn = 2; // Turn > 1 to allow evolution

    // Set up player1 with Pikachu in active (played on turn 0, so can evolve on turn 2)
    state.player1.hand = ['base-pikachu'];
    const check = canPlayToActive(state, 'player1', 0);
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);
    state.player1.active.turnPlayed = 0; // Simulate Pokemon played earlier

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    // Test that canEvolve works directly
    const evolveCheck = canEvolve(state, 'player1', 0, 'active', getCard);
    if (!evolveCheck.valid) {
        throw new Error(`Evolution should be valid but got: ${evolveCheck.reasonKey}`);
    }

    const evoCard = mockCards['evolution-raichu'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 1) {
        throw new Error(`Expected 1 target, found ${targets.length}`);
    }
    if (targets[0].location !== 'active') {
        throw new Error(`Expected target on active, got ${targets[0].location}`);
    }
});

test('2.2: Detects valid evolution targets on bench', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Bulbasaur on bench (played on turn 0, so can evolve on turn 2)
    state.player1.hand = ['base-bulbasaur'];
    state = executePlayToBench(state, 'player1', 0, mockCards['base-bulbasaur']);
    state.player1.bench[0].turnPlayed = 0; // Simulate Pokemon played earlier

    // Add Ivysaur to hand
    state.player1.hand = ['evolution-ivysaur'];

    const evoCard = mockCards['evolution-ivysaur'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 1) {
        throw new Error(`Expected 1 target, found ${targets.length}`);
    }
    if (targets[0].location !== 0) {
        throw new Error(`Expected target on bench[0], got bench[${targets[0].location}]`);
    }
});

test('2.3: Returns empty array when no valid targets exist', () => {
    let state = createInitialState();
    state.turn = 2;

    // Add Raichu to hand but no Pikachu on field
    state.player1.hand = ['evolution-raichu'];

    const evoCard = mockCards['evolution-raichu'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 0) {
        throw new Error(`Expected 0 targets, found ${targets.length}`);
    }
});

test('2.4: Respects evolution rules (no evolution on turn 0 or 1)', () => {
    let state = createInitialState();
    state.turn = 0; // Turn 0 - evolution not allowed

    // Set up player1 with Pikachu in active
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    const evoCard = mockCards['evolution-raichu'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 0) {
        throw new Error('Should not detect targets when evolution is not allowed (turn 0)');
    }
});

test('2.5: Respects evolution rules (no evolution on turn 1)', () => {
    let state = createInitialState();
    state.turn = 1; // Turn 1 - evolution not allowed

    // Set up player1 with Pikachu in active
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    const evoCard = mockCards['evolution-raichu'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 0) {
        throw new Error('Should not detect targets when evolution is not allowed (turn 1)');
    }
});

test('2.6: Cannot evolve Pokemon played this turn', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Pikachu in active (played this turn)
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);
    state.player1.active.turnPlayed = state.turn; // Force turnPlayed to current turn

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    const evoCard = mockCards['evolution-raichu'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 0) {
        throw new Error('Should not detect targets when Pokemon was played this turn');
    }
});

test('2.7: Detects multiple valid targets (active + bench)', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Pikachu in active and on bench (played on turn 0, so can evolve on turn 2)
    state.player1.hand = ['base-pikachu', 'base-pikachu'];
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);
    state = executePlayToBench(state, 'player1', 0, mockCards['base-pikachu']);
    state.player1.active.turnPlayed = 0; // Simulate Pokemon played earlier
    state.player1.bench[0].turnPlayed = 0; // Simulate Pokemon played earlier

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    const evoCard = mockCards['evolution-raichu'];
    const targets = getValidEvolutionTargets(state, 'player1', evoCard, getCard);

    if (targets.length !== 2) {
        throw new Error(`Expected 2 targets, found ${targets.length}`);
    }
});

// Category 3: Evolution Flow Integration
console.log('\nCategory 3: Evolution Flow Integration');
console.log('---------------------------------------');

test('3.1: Evolution mechanics remain unchanged (valid evolution succeeds)', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Pikachu in active
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    // Execute evolution
    const newState = executeEvolve(state, 'player1', 0, 'active', mockCards['evolution-raichu'], getCard);

    if (!newState.player1.active) {
        throw new Error('Active Pokemon missing after evolution');
    }
    if (newState.player1.active.cardId !== 'evolution-raichu') {
        throw new Error('Pokemon did not evolve');
    }
    // Check that the card was removed from hand
    if (newState.player1.hand.length !== 0) {
        throw new Error('Evolution card not removed from hand');
    }
});

test('3.2: Evolution preserves HP correctly', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Pikachu in active, damaged to 40/60
    state.player1.hand = ['base-pikachu'];
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);
    state.player1.active.currentHp = 40; // Damaged by 20

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    // Execute evolution
    const newState = executeEvolve(state, 'player1', 0, 'active', mockCards['evolution-raichu'], getCard);

    // Damage counters should be preserved: 90 (Raichu HP) - 20 (damage) = 70
    const raichuCard = getCard('evolution-raichu');
    const pikachuCard = getCard('base-pikachu');
    const damageCounters = pikachuCard.hp - 40; // 60 - 40 = 20
    const expectedHp = raichuCard.hp - damageCounters; // 90 - 20 = 70
    if (newState.player1.active.currentHp !== expectedHp) {
        throw new Error(`HP not preserved correctly. Expected ${expectedHp}, got ${newState.player1.active.currentHp}`);
    }
});

test('3.3: Evolution cures status effects', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Pikachu in active with status
    state = executePlayToActive(state, 'player1', 0, mockCards['base-pikachu']);
    state.player1.active.status = 'poison';

    // Add Raichu to hand
    state.player1.hand = ['evolution-raichu'];

    // Execute evolution
    const newState = executeEvolve(state, 'player1', 0, 'active', mockCards['evolution-raichu'], getCard);

    if (newState.player1.active.status !== null) {
        throw new Error(`Status not cured. Expected null, got ${newState.player1.active.status}`);
    }
});

test('3.4: Invalid evolution is still rejected (evolvesFrom mismatch)', () => {
    let state = createInitialState();
    state.turn = 2;

    // Set up player1 with Bulbasaur in active
    state = executePlayToActive(state, 'player1', 0, mockCards['base-bulbasaur']);

    // Add Raichu to hand (Raichu evolves from Pikachu, not Bulbasaur)
    state.player1.hand = ['evolution-raichu'];

    // Check evolution validity
    const check = canEvolve(state, 'player1', 0, 'active', getCard);

    if (check.valid) {
        throw new Error('Invalid evolution (evolvesFrom mismatch) was not rejected');
    }
});

// Category 4: Translation Keys
console.log('\nCategory 4: Translation Keys');
console.log('--------------------------------');

test('4.1: Evolution UI translations exist in English', async () => {
    const enPath = join(__dirname, 'js/i18n/en.json');
    const { readFileSync } = await import('fs');
    const translations = JSON.parse(readFileSync(enPath, 'utf-8'));

    if (!translations.ui.evolveHint) {
        throw new Error('Missing ui.evolveHint in English translations');
    }
    if (!translations.ui.evolveBadge) {
        throw new Error('Missing ui.evolveBadge in English translations');
    }
    if (!translations.ui.evolveHelpTitle) {
        throw new Error('Missing ui.evolveHelpTitle in English translations');
    }
    if (!translations.ui.evolveHelpText) {
        throw new Error('Missing ui.evolveHelpText in English translations');
    }
});

test('4.2: Evolution UI translations exist in Spanish', async () => {
    const esPath = join(__dirname, 'js/i18n/es.json');
    const { readFileSync } = await import('fs');
    const translations = JSON.parse(readFileSync(esPath, 'utf-8'));

    if (!translations.ui.evolveHint) {
        throw new Error('Missing ui.evolveHint in Spanish translations');
    }
    if (!translations.ui.evolveBadge) {
        throw new Error('Missing ui.evolveBadge in Spanish translations');
    }
    if (!translations.ui.evolveHelpTitle) {
        throw new Error('Missing ui.evolveHelpTitle in Spanish translations');
    }
    if (!translations.ui.evolveHelpText) {
        throw new Error('Missing ui.evolveHelpText in Spanish translations');
    }
});

// Category 5: CSS Classes for Evolution UX
console.log('\nCategory 5: CSS Classes for Evolution UX');
console.log('-------------------------------------------');

test('5.1: CSS file contains evolution-card class', async () => {
    const { readFileSync } = await import('fs');
    const css = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');

    if (!css.includes('.evolution-card')) {
        throw new Error('Missing .evolution-card CSS class');
    }
});

test('5.2: CSS file contains evolution-target class', async () => {
    const { readFileSync } = await import('fs');
    const css = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');

    if (!css.includes('.evolution-target')) {
        throw new Error('Missing .evolution-target CSS class');
    }
});

test('5.3: CSS file contains evolution-tooltip class', async () => {
    const { readFileSync } = await import('fs');
    const css = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');

    if (!css.includes('.evolution-tooltip')) {
        throw new Error('Missing .evolution-tooltip CSS class');
    }
});

test('5.4: CSS file contains evolvePulse animation', async () => {
    const { readFileSync } = await import('fs');
    const css = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');

    if (!css.includes('@keyframes evolvePulse')) {
        throw new Error('Missing @keyframes evolvePulse animation');
    }
});

test('5.5: CSS file contains targetPulse animation', async () => {
    const { readFileSync } = await import('fs');
    const css = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');

    if (!css.includes('@keyframes targetPulse')) {
        throw new Error('Missing @keyframes targetPulse animation');
    }
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total Tests: ${testsRun}`);
console.log(`Passed: ${testsPassed} ✅`);
console.log(`Failed: ${testsFailed} ❌`);
console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
}
