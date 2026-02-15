/**
 * Stage 2 Retreat Integration Test
 *
 * This test verifies that the retreat functionality works correctly:
 * 1. Validation of retreat conditions
 * 2. Execution of retreat action
 * 3. Energy discarding
 * 4. Pokemon swapping
 * 5. Status curing
 * 6. Persistence with Load/Save Scenario
 */

import { createInitialState, exportState } from './js/engine/game-state.js';
import { loadCards, getCard } from './js/data/card-loader.js';
import { canRetreat, executeRetreat } from './js/engine/moves.js';

console.log('========================================');
console.log('Stage 2 Retreat Integration Test');
console.log('========================================\n');

// Test results
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        testsPassed++;
    } catch (e) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${e.message}`);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// Initialize cards
await loadCards();

// Get some test cards
const pikachuCard = getCard('A1-001'); // Pikachu (Basic, 70 HP, retreatCost 1)
const bulbasaurCard = getCard('A1-004'); // Bulbasaur (Basic, 70 HP)
const charmanderCard = getCard('A1-008'); // Charmander (Basic, 70 HP)
const mewtwoExCard = getCard('A1-050'); // Mewtwo ex (130 HP, retreatCost 2)

console.log('--- Test Setup ---');
console.log(`Test cards loaded: Pikachu (${pikachuCard?.name}), Bulbasaur (${bulbasaurCard?.name}), Charmander (${charmanderCard?.name}), Mewtwo ex (${mewtwoExCard?.name})`);

// Create a test scenario
function createRetreatTestScenario() {
    const state = createInitialState();

    // Player 1: Active Pokemon with energy, bench Pokemon
    state.player1.active = {
        cardId: 'A1-001', // Pikachu
        currentHp: 70,
        energy: ['L', 'L', 'C'], // 3 energy
        status: null,
        turnPlayed: 0,
        lastEvolved: null,
        tool: null,
        effects: []
    };

    state.player1.bench = [
        {
            cardId: 'A1-004', // Bulbasaur
            currentHp: 70,
            energy: [],
            status: null,
            turnPlayed: 0,
            lastEvolved: null,
            tool: null,
            effects: []
        },
        null,
        null
    ];

    // Player 2: Basic setup
    state.player2.active = {
        cardId: 'A1-008', // Charmander
        currentHp: 70,
        energy: [],
        status: null,
        turnPlayed: 0,
        lastEvolved: null,
        tool: null,
        effects: []
    };

    state.turn = 1;
    state.currentPlayer = 'player1';

    return state;
}

console.log('\n--- Retreat Validation Tests ---');

test('canRetreat: returns valid when conditions are met', () => {
    const state = createRetreatTestScenario();
    const result = canRetreat(state, 'player1', 0);
    assert(result.valid, 'Should be able to retreat when conditions are met');
});

test('canRetreat: returns invalid when no active Pokemon', () => {
    const state = createRetreatTestScenario();
    state.player1.active = null;
    const result = canRetreat(state, 'player1', 0);
    assert(!result.valid, 'Should not be able to retreat without active Pokemon');
    assertEquals(result.reasonKey, 'errors.validation.noActivePokemon');
});

test('canRetreat: returns invalid when already retreated this turn', () => {
    const state = createRetreatTestScenario();
    state.player1.retreatedThisTurn = true;
    const result = canRetreat(state, 'player1', 0);
    assert(!result.valid, 'Should not be able to retreat twice in one turn');
    assertEquals(result.reasonKey, 'errors.validation.alreadyRetreated');
});

test('canRetreat: returns invalid when bench slot is empty', () => {
    const state = createRetreatTestScenario();
    const result = canRetreat(state, 'player1', 1); // Slot 1 is empty
    assert(!result.valid, 'Should not be able to retreat to empty bench slot');
    assertEquals(result.reasonKey, 'errors.validation.benchSlotEmpty');
});

test('canRetreat: returns invalid when asleep', () => {
    const state = createRetreatTestScenario();
    state.player1.active.status = 'sleep';
    const result = canRetreat(state, 'player1', 0);
    assert(!result.valid, 'Should not be able to retreat while asleep');
    assertEquals(result.reasonKey, 'errors.validation.cannotRetreatAsleep');
});

test('canRetreat: returns invalid when paralyzed', () => {
    const state = createRetreatTestScenario();
    state.player1.active.status = 'paralysis';
    const result = canRetreat(state, 'player1', 0);
    assert(!result.valid, 'Should not be able to retreat while paralyzed');
    assertEquals(result.reasonKey, 'errors.validation.cannotRetreatParalyzed');
});

test('canRetreat: returns valid when burned (burn does not block retreat)', () => {
    const state = createRetreatTestScenario();
    state.player1.active.status = 'burn';
    const result = canRetreat(state, 'player1', 0);
    // Note: Burn does not block retreat in Pokemon TCG
    assert(result.valid, 'Should be able to retreat while burned');
});

test('canRetreat: returns valid when poisoned (poison does not block retreat)', () => {
    const state = createRetreatTestScenario();
    state.player1.active.status = 'poison';
    const result = canRetreat(state, 'player1', 0);
    // Note: Poison does not block retreat in Pokemon TCG
    assert(result.valid, 'Should be able to retreat while poisoned');
});

console.log('\n--- Retreat Execution Tests ---');

test('executeRetreat: swaps active and bench Pokemon', () => {
    const state = createRetreatTestScenario();
    const oldActiveId = state.player1.active.cardId;
    const oldBenchId = state.player1.bench[0].cardId;

    // Execute retreat
    const newState = executeRetreat(state, 'player1', 0, 1, [0]); // Retreat cost 1, discard energy at index 0

    assertEquals(newState.player1.active.cardId, oldBenchId, 'Active should now be the bench Pokemon');
    assertEquals(newState.player1.bench[0].cardId, oldActiveId, 'Bench should now be the active Pokemon');
});

test('executeRetreat: discards correct energy', () => {
    const state = createRetreatTestScenario();
    const initialEnergyCount = state.player1.active.energy.length;

    // Execute retreat with retreat cost 1
    const newState = executeRetreat(state, 'player1', 0, 1, [0]);

    assertEquals(newState.player1.bench[0].energy.length, initialEnergyCount - 1, 'Should have discarded 1 energy');
    assertEquals(newState.player1.bench[0].energy[0], 'L', 'Should have kept second energy');
});

test('executeRetreat: clears status when retreated', () => {
    const state = createRetreatTestScenario();
    state.player1.active.status = 'poison';

    const newState = executeRetreat(state, 'player1', 0, 1, [0]);

    assertEquals(newState.player1.bench[0].status, null, 'Status should be cleared after retreat');
});

test('executeRetreat: sets retreatedThisTurn flag', () => {
    const state = createRetreatTestScenario();

    const newState = executeRetreat(state, 'player1', 0, 1, [0]);

    assert(newState.player1.retreatedThisTurn, 'retreatedThisTurn should be set to true');
});

test('executeRetreat: discards multiple energy for higher cost', () => {
    const state = createRetreatTestScenario();
    state.player1.active = {
        cardId: 'A1-050', // Mewtwo ex
        currentHp: 130,
        energy: ['P', 'P', 'C', 'C'], // 4 energy
        status: null,
        turnPlayed: 0,
        lastEvolved: null,
        tool: null,
        effects: []
    };

    state.player1.bench = [{
        cardId: 'A1-001', // Pikachu
        currentHp: 70,
        energy: [],
        status: null,
        turnPlayed: 0,
        lastEvolved: null,
        tool: null,
        effects: []
    }, null, null];

    // Execute retreat with retreat cost 2
    const newState = executeRetreat(state, 'player1', 0, 2, [0, 1]);

    assertEquals(newState.player1.bench[0].energy.length, 2, 'Should have discarded 2 energy');
    assertEquals(newState.player1.bench[0].energy[0], 'C', 'Should have kept third energy');
});

console.log('\n--- Free Retreat Test ---');

test('executeRetreat: handles free retreat (cost 0)', () => {
    const state = createRetreatTestScenario();

    // Execute retreat with cost 0 (no energy to discard)
    const newState = executeRetreat(state, 'player1', 0, 0, []);

    assertEquals(newState.player1.bench[0].energy.length, 3, 'Should keep all energy for free retreat');
    assertEquals(newState.player1.active.cardId, 'A1-004', 'Active should be swapped');
    assertEquals(newState.player1.bench[0].cardId, 'A1-001', 'Bench should be swapped');
});

console.log('\n--- Scenario Persistence Test ---');

test('Load/Save Scenario: preserves retreat state', () => {
    const state = createRetreatTestScenario();

    // Execute retreat
    const retreatedState = executeRetreat(state, 'player1', 0, 1, [0]);

    // Export and re-import
    const exported = exportState(retreatedState);
    const imported = JSON.parse(JSON.stringify(exported));

    assertEquals(imported.player1.active.cardId, retreatedState.player1.active.cardId, 'Active Pokemon should match');
    assertEquals(imported.player1.bench[0].cardId, retreatedState.player1.bench[0].cardId, 'Bench Pokemon should match');
    assertEquals(imported.player1.bench[0].energy.length, retreatedState.player1.bench[0].energy.length, 'Energy count should match');
    assertEquals(imported.player1.bench[0].status, retreatedState.player1.bench[0].status, 'Status should match');
    assert(imported.player1.retreatedThisTurn, 'retreatedThisTurn flag should be preserved');
});

console.log('\n--- Test Summary ---');
console.log(`Total: ${testsPassed + testsFailed} tests`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
} else {
    console.log('\n✗ Some tests failed!');
    process.exit(1);
}
