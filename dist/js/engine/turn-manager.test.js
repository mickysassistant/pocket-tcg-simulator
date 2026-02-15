/**
 * Turn Manager Tests
 *
 * Tests for startTurn, endTurn, drawCard, canAttachEnergy, attachEnergy
 *
 * Run in browser: window.runTurnManagerTests()
 */
import { createInitialState, createPlayer, createPokemon } from './game-state.js';
import { startTurn, endTurn, drawCard, canAttachEnergy, attachEnergy } from './turn-manager.js';
// Test framework
function runTests(tests) {
    let passed = 0;
    let failed = 0;
    const results = [];
    for (const test of tests) {
        try {
            test.fn();
            passed++;
            results.push(`✅ ${test.name}`);
        }
        catch (e) {
            failed++;
            results.push(`❌ ${test.name}: ${e.message}`);
        }
    }
    return { passed, failed, results };
}
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}
function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message || 'Value is null or undefined');
    }
}
// ============================================================================
// Tests
// ============================================================================
const tests = [
    {
        name: 'startTurn creates new state',
        fn: () => {
            const state = createInitialState();
            const newState = startTurn(state);
            assert(newState !== state, 'Should return new state object');
        }
    },
    {
        name: 'startTurn clears turn flags',
        fn: () => {
            const state = createInitialState();
            state.player1.supporterUsedThisTurn = true;
            state.player1.retreatedThisTurn = true;
            state.player1.normalAttachUsedThisTurn = true;
            state.player1.attackedThisTurn = true;
            const newState = startTurn(state);
            assertEqual(newState.player1.supporterUsedThisTurn, false, 'supporterUsedThisTurn should be false');
            assertEqual(newState.player1.retreatedThisTurn, false, 'retreatedThisTurn should be false');
            assertEqual(newState.player1.normalAttachUsedThisTurn, false, 'normalAttachUsedThisTurn should be false');
            assertEqual(newState.player1.attackedThisTurn, false, 'attackedThisTurn should be false');
        }
    },
    {
        name: 'startTurn shifts energy from next to current',
        fn: () => {
            const state = createInitialState();
            state.player1.energyZone.nextEnergy = 'G';
            state.player1.energyZone.currentEnergy = null;
            const newState = startTurn(state);
            assertEqual(newState.player1.energyZone.currentEnergy, 'G', 'Energy should shift from next to current');
            assertNotNull(newState.player1.energyZone.nextEnergy, 'New next energy should be generated');
        }
    },
    {
        name: 'startTurn draws card (not first turn)',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.deck = ['A1-001', 'A1-002', 'A1-003'];
            state.player1.hand = [];
            const newState = startTurn(state);
            assertEqual(newState.player1.deck.length, 2, 'Deck should have 2 cards');
            assertEqual(newState.player1.hand.length, 1, 'Hand should have 1 card');
        }
    },
    {
        name: 'startTurn does NOT draw on first turn going first',
        fn: () => {
            const state = createInitialState();
            state.turn = 0;
            state.player1.deck = ['A1-001', 'A1-002', 'A1-003'];
            state.player1.hand = [];
            const newState = startTurn(state);
            assertEqual(newState.player1.deck.length, 3, 'Deck should still have 3 cards');
            assertEqual(newState.player1.hand.length, 0, 'Hand should still be empty');
        }
    },
    {
        name: 'startTurn draws for player2 on turn 0',
        fn: () => {
            const state = createInitialState();
            state.turn = 0;
            state.currentPlayer = 'player2';
            state.player2.deck = ['A1-001', 'A1-002', 'A1-003'];
            state.player2.hand = [];
            const newState = startTurn(state);
            assertEqual(newState.player2.deck.length, 2, 'Deck should have 2 cards');
            assertEqual(newState.player2.hand.length, 1, 'Hand should have 1 card');
        }
    },
    {
        name: 'startTurn adds log entry',
        fn: () => {
            const state = createInitialState();
            const newState = startTurn(state);
            assert(newState.log.length > 0, 'Log should have entries');
            const lastLog = newState.log[newState.log.length - 1];
            assertEqual(lastLog.action, 'startTurn', 'Last log should be startTurn');
        }
    },
    {
        name: 'drawCard removes from deck',
        fn: () => {
            const state = createInitialState();
            state.player1.deck = ['A1-001', 'A1-002', 'A1-003'];
            state.player1.hand = [];
            const newState = drawCard(state, 'player1');
            assertEqual(newState.player1.deck.length, 2, 'Deck should have 2 cards');
            assertEqual(newState.player1.hand.length, 1, 'Hand should have 1 card');
            assertEqual(newState.player1.hand[0], 'A1-003', 'Should draw top card (last in array)');
        }
    },
    {
        name: 'drawCard does nothing with empty deck',
        fn: () => {
            const state = createInitialState();
            state.player1.deck = [];
            state.player1.hand = [];
            const newState = drawCard(state, 'player1');
            assertEqual(newState.player1.deck.length, 0, 'Deck should still be empty');
            assertEqual(newState.player1.hand.length, 0, 'Hand should still be empty');
        }
    },
    {
        name: 'drawCard respects hand limit (max 10)',
        fn: () => {
            const state = createInitialState();
            state.player1.deck = ['A1-001'];
            state.player1.hand = Array(10).fill('A1-000');
            const newState = drawCard(state, 'player1');
            assertEqual(newState.player1.deck.length, 1, 'Deck should still have 1 card');
            assertEqual(newState.player1.hand.length, 10, 'Hand should still be at limit');
        }
    },
    {
        name: 'canAttachEnergy returns false on first turn going first',
        fn: () => {
            const state = createInitialState();
            state.turn = 0;
            state.currentPlayer = 'player1';
            state.player1.energyZone.currentEnergy = 'G';
            const result = canAttachEnergy(state, 'player1');
            assert(!result.valid, 'Should not be able to attach on first turn going first');
        }
    },
    {
        name: 'canAttachEnergy returns false if already used',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.normalAttachUsedThisTurn = true;
            state.player1.energyZone.currentEnergy = 'G';
            const result = canAttachEnergy(state, 'player1');
            assert(!result.valid, 'Should not be able to attach if already used');
        }
    },
    {
        name: 'canAttachEnergy returns false with no energy',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.energyZone.currentEnergy = null;
            const result = canAttachEnergy(state, 'player1');
            assert(!result.valid, 'Should not be able to attach without energy');
        }
    },
    {
        name: 'canAttachEnergy returns true when valid',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.energyZone.currentEnergy = 'G';
            const result = canAttachEnergy(state, 'player1');
            assert(result.valid, 'Should be able to attach when all conditions met');
        }
    },
    {
        name: 'attachEnergy adds energy to Pokemon',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.energyZone.currentEnergy = 'G';
            state.player1.active = { cardId: 'A1-001', currentHp: 60, maxHp: 60, energy: [] };
            const result = attachEnergy(state, 'player1', 'active');
            assert(result.valid, 'Attach should succeed');
            assertEqual(result.state.player1.active.energy.length, 1, 'Pokemon should have 1 energy');
            assertEqual(result.state.player1.active.energy[0], 'G', 'Energy type should be G');
        }
    },
    {
        name: 'attachEnergy clears current energy',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.energyZone.currentEnergy = 'G';
            state.player1.active = { cardId: 'A1-001', currentHp: 60, maxHp: 60, energy: [] };
            const result = attachEnergy(state, 'player1', 'active');
            assert(result.valid, 'Attach should succeed');
            assertEqual(result.state.player1.energyZone.currentEnergy, null, 'Current energy should be cleared');
        }
    },
    {
        name: 'attachEnergy sets normalAttachUsedThisTurn flag',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.player1.energyZone.currentEnergy = 'G';
            state.player1.active = { cardId: 'A1-001', currentHp: 60, maxHp: 60, energy: [] };
            const result = attachEnergy(state, 'player1', 'active');
            assert(result.valid, 'Attach should succeed');
            assertEqual(result.state.player1.normalAttachUsedThisTurn, true, 'Flag should be set');
        }
    },
    {
        name: 'endTurn switches player',
        fn: () => {
            const state = createInitialState();
            state.turn = 1;
            state.currentPlayer = 'player1';
            const newState = endTurn(state);
            assertEqual(newState.currentPlayer, 'player2', 'Player should switch');
            assertEqual(newState.turn, 2, 'Turn should increment');
        }
    },
    {
        name: 'endTurn adds log entry',
        fn: () => {
            const state = createInitialState();
            const newState = endTurn(state);
            assert(newState.log.length > 0, 'Log should have entries');
            const lastLog = newState.log[newState.log.length - 1];
            assertEqual(lastLog.action, 'endTurn', 'Last log should be endTurn');
        },
    },
    {
        name: 'full turn cycle works',
        fn: () => {
            const state = createInitialState();
            state.player1.deck = ['A1-001', 'A1-002'];
            state.player1.energyZone.nextEnergy = 'G';
            // Start turn
            state = startTurn(state);
            assertEqual(state.currentPlayer, 'player1', 'Should be player1 turn');
            assertEqual(state.player1.energyZone.currentEnergy, 'G', 'Energy should shift');
            // End turn
            state = endTurn(state);
            assertEqual(state.currentPlayer, 'player2', 'Should switch to player2');
            assertEqual(state.turn, 1, 'Turn should increment');
        }
    }
];
// ============================================================================
// Export for browser testing
// ============================================================================
export function runTurnManagerTests() {
    const { passed, failed, results } = runTests(tests);
    console.log('\n========== Turn Manager Tests ==========');
    results.forEach(r => console.log(r));
    console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`);
    console.log('========================================\n');
    return { passed, failed };
}
// Make available globally
if (typeof window !== 'undefined') {
    window.runTurnManagerTests = runTurnManagerTests;
}
