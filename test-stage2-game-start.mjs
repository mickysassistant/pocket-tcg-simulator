#!/usr/bin/env node
/**
 * Stage 2 Tests: Game Start Behavior
 *
 * Tests for:
 * 1. Empty state initialization (fresh startup)
 * 2. New game from deck presets
 * 3. Scenario load behavior
 * 4. Backward compatibility with existing scenarios
 *
 * Run with: node test-stage2-game-start.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock DOM for testing
global.document = {
    createElement: () => ({ addEventListener: () => {} }),
    querySelector: () => null,
    querySelectorAll: () => []
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

// Import modules
async function runTests() {
    console.log('🧪 Stage 2: Game Start Behavior Tests\n');
    console.log('=' .repeat(60));

    let passed = 0;
    let failed = 0;
    const results = [];

    // Import game-state module
    const gamestateModule = await import('./js/engine/game-state.js');

    // ========================================================================
    // TEST CATEGORY 1: Empty State Initialization (Fresh Startup)
    // ========================================================================
    console.log('\n📦 Category 1: Empty State Initialization (Fresh Startup)');
    console.log('-'.repeat(60));

    // Test 1.1: createInitialState returns empty state
    try {
        const state = gamestateModule.createInitialState();

        const isEmpty =
            state.turn === 0 &&
            state.currentPlayer === 'player1' &&
            state.player1.active === null &&
            state.player1.bench.length === 0 &&
            state.player1.hand.length === 0 &&
            state.player1.deck.length === 0 &&
            state.player1.discard.length === 0 &&
            state.player1.energyZone.configuredTypes.length === 0 &&
            state.player2.active === null &&
            state.player2.bench.length === 0 &&
            state.player2.hand.length === 0 &&
            state.player2.deck.length === 0 &&
            state.player2.discard.length === 0 &&
            state.player2.energyZone.configuredTypes.length === 0;

        if (isEmpty) {
            console.log('✅ Test 1.1: Empty state has no Pokemon or cards');
            passed++;
            results.push({ test: '1.1', status: 'PASS' });
        } else {
            console.log('❌ Test 1.1: Empty state should have no Pokemon or cards');
            failed++;
            results.push({ test: '1.1', status: 'FAIL', reason: 'State not empty' });
        }
    } catch (e) {
        console.log('❌ Test 1.1:', e.message);
        failed++;
        results.push({ test: '1.1', status: 'FAIL', reason: e.message });
    }

    // Test 1.2: Empty state has valid structure
    try {
        const state = gamestateModule.createInitialState();

        const hasValidStructure =
            state.version !== undefined &&
            typeof state.turn === 'number' &&
            typeof state.currentPlayer === 'string' &&
            Array.isArray(state.coinQueue) &&
            state.coinQueue.length === 10 &&
            typeof state.player1 === 'object' &&
            typeof state.player2 === 'object' &&
            state.stadium === null &&
            Array.isArray(state.turnEffects) &&
            Array.isArray(state.log);

        if (hasValidStructure) {
            console.log('✅ Test 1.2: Empty state has valid structure');
            passed++;
            results.push({ test: '1.2', status: 'PASS' });
        } else {
            console.log('❌ Test 1.2: Empty state structure invalid');
            failed++;
            results.push({ test: '1.2', status: 'FAIL', reason: 'Invalid structure' });
        }
    } catch (e) {
        console.log('❌ Test 1.2:', e.message);
        failed++;
        results.push({ test: '1.2', status: 'FAIL', reason: e.message });
    }

    // Test 1.3: Empty state passes validation
    try {
        const state = gamestateModule.createInitialState();
        const isValid = gamestateModule.isValidState(state);

        if (isValid) {
            console.log('✅ Test 1.3: Empty state passes validation');
            passed++;
            results.push({ test: '1.3', status: 'PASS' });
        } else {
            console.log('❌ Test 1.3: Empty state should pass validation');
            failed++;
            results.push({ test: '1.3', status: 'FAIL', reason: 'Validation failed' });
        }
    } catch (e) {
        console.log('❌ Test 1.3:', e.message);
        failed++;
        results.push({ test: '1.3', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 2: Scenario Load Behavior
    // ========================================================================
    console.log('\n📁 Category 2: Scenario Load Behavior');
    console.log('-'.repeat(60));

    // Test 2.1: Load demo scenario
    try {
        const demoScenario = JSON.parse(
            readFileSync(join(__dirname, 'scenarios/demo-start-game.json'), 'utf8')
        );

        const isValid = gamestateModule.isValidState(demoScenario);

        if (isValid) {
            console.log('✅ Test 2.1: Demo scenario passes validation');
            passed++;
            results.push({ test: '2.1', status: 'PASS' });
        } else {
            console.log('❌ Test 2.1: Demo scenario validation failed');
            failed++;
            results.push({ test: '2.1', status: 'FAIL', reason: 'Validation failed' });
        }
    } catch (e) {
        console.log('❌ Test 2.1:', e.message);
        failed++;
        results.push({ test: '2.1', status: 'FAIL', reason: e.message });
    }

    // Test 2.2: Demo scenario has populated board
    try {
        const demoScenario = JSON.parse(
            readFileSync(join(__dirname, 'scenarios/demo-start-game.json'), 'utf8')
        );

        const isPopulated =
            demoScenario.player1.active !== null &&
            demoScenario.player1.bench.length > 0 &&
            demoScenario.player1.hand.length > 0 &&
            demoScenario.player1.deck.length > 0 &&
            demoScenario.player2.active !== null &&
            demoScenario.player2.bench.length > 0 &&
            demoScenario.player2.hand.length > 0 &&
            demoScenario.player2.deck.length > 0;

        if (isPopulated) {
            console.log('✅ Test 2.2: Demo scenario has populated board');
            passed++;
            results.push({ test: '2.2', status: 'PASS' });
        } else {
            console.log('❌ Test 2.2: Demo scenario should have populated board');
            failed++;
            results.push({ test: '2.2', status: 'FAIL', reason: 'Board not populated' });
        }
    } catch (e) {
        console.log('❌ Test 2.2:', e.message);
        failed++;
        results.push({ test: '2.2', status: 'FAIL', reason: e.message });
    }

    // Test 2.3: Demo scenario has correct deck size (20)
    try {
        const demoScenario = JSON.parse(
            readFileSync(join(__dirname, 'scenarios/demo-start-game.json'), 'utf8')
        );

        const hasCorrectDeckSize =
            demoScenario.player1.deck.length +
            demoScenario.player1.hand.length +
            demoScenario.player1.bench.length + 1 === 20 &&
            demoScenario.player2.deck.length +
            demoScenario.player2.hand.length +
            demoScenario.player2.bench.length + 1 === 20;

        if (hasCorrectDeckSize) {
            console.log('✅ Test 2.3: Demo scenario has correct deck size (20)');
            passed++;
            results.push({ test: '2.3', status: 'PASS' });
        } else {
            console.log('❌ Test 2.3: Demo scenario deck size incorrect');
            console.log('   P1: deck=' + demoScenario.player1.deck.length +
                       ', hand=' + demoScenario.player1.hand.length +
                       ', bench=' + demoScenario.player1.bench.length);
            console.log('   P2: deck=' + demoScenario.player2.deck.length +
                       ', hand=' + demoScenario.player2.hand.length +
                       ', bench=' + demoScenario.player2.bench.length);
            failed++;
            results.push({ test: '2.3', status: 'FAIL', reason: 'Deck size incorrect' });
        }
    } catch (e) {
        console.log('❌ Test 2.3:', e.message);
        failed++;
        results.push({ test: '2.3', status: 'FAIL', reason: e.message });
    }

    // Test 2.4: Demo scenario has hand size (5)
    try {
        const demoScenario = JSON.parse(
            readFileSync(join(__dirname, 'scenarios/demo-start-game.json'), 'utf8')
        );

        const hasCorrectHandSize =
            demoScenario.player1.hand.length === 5 &&
            demoScenario.player2.hand.length === 5;

        if (hasCorrectHandSize) {
            console.log('✅ Test 2.4: Demo scenario has correct hand size (5)');
            passed++;
            results.push({ test: '2.4', status: 'PASS' });
        } else {
            console.log('❌ Test 2.4: Demo scenario hand size incorrect');
            console.log('   P1 hand: ' + demoScenario.player1.hand.length);
            console.log('   P2 hand: ' + demoScenario.player2.hand.length);
            failed++;
            results.push({ test: '2.4', status: 'FAIL', reason: 'Hand size incorrect' });
        }
    } catch (e) {
        console.log('❌ Test 2.4:', e.message);
        failed++;
        results.push({ test: '2.4', status: 'FAIL', reason: e.message });
    }

    // Test 2.5: Demo scenario has energy types configured
    try {
        const demoScenario = JSON.parse(
            readFileSync(join(__dirname, 'scenarios/demo-start-game.json'), 'utf8')
        );

        const hasEnergyTypes =
            Array.isArray(demoScenario.player1.energyZone.configuredTypes) &&
            demoScenario.player1.energyZone.configuredTypes.length > 0 &&
            Array.isArray(demoScenario.player2.energyZone.configuredTypes) &&
            demoScenario.player2.energyZone.configuredTypes.length > 0;

        if (hasEnergyTypes) {
            console.log('✅ Test 2.5: Demo scenario has energy types configured');
            passed++;
            results.push({ test: '2.5', status: 'PASS' });
        } else {
            console.log('❌ Test 2.5: Demo scenario missing energy types');
            failed++;
            results.push({ test: '2.5', status: 'FAIL', reason: 'Missing energy types' });
        }
    } catch (e) {
        console.log('❌ Test 2.5:', e.message);
        failed++;
        results.push({ test: '2.5', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 3: New Game from Deck Presets
    // ========================================================================
    console.log('\n🎴 Category 3: New Game from Deck Presets');
    console.log('-'.repeat(60));

    // Test 3.1: Deck presets module exists
    try {
        const deckPresetsModule = await import('./js/data/deck-presets.js');

        if (typeof deckPresetsModule.getAllDeckPresets === 'function') {
            console.log('✅ Test 3.1: Deck presets module exists and exports getAllDeckPresets');
            passed++;
            results.push({ test: '3.1', status: 'PASS' });
        } else {
            console.log('❌ Test 3.1: Deck presets module missing getAllDeckPresets');
            failed++;
            results.push({ test: '3.1', status: 'FAIL', reason: 'Missing function' });
        }
    } catch (e) {
        console.log('❌ Test 3.1:', e.message);
        failed++;
        results.push({ test: '3.1', status: 'FAIL', reason: e.message });
    }

    // Test 3.2: At least one deck preset exists
    try {
        const deckPresetsModule = await import('./js/data/deck-presets.js');
        const presets = deckPresetsModule.getAllDeckPresets();

        if (presets && presets.length > 0) {
            console.log('✅ Test 3.2: At least one deck preset exists (' + presets.length + ' found)');
            passed++;
            results.push({ test: '3.2', status: 'PASS' });
        } else {
            console.log('❌ Test 3.2: No deck presets found');
            failed++;
            results.push({ test: '3.2', status: 'FAIL', reason: 'No presets' });
        }
    } catch (e) {
        console.log('❌ Test 3.2:', e.message);
        failed++;
        results.push({ test: '3.2', status: 'FAIL', reason: e.message });
    }

    // Test 3.3: Deck preset has valid structure
    try {
        const deckPresetsModule = await import('./js/data/deck-presets.js');
        const presets = deckPresetsModule.getAllDeckPresets();
        const firstPreset = presets[0];

        const hasValidStructure =
            firstPreset.id !== undefined &&
            firstPreset.name !== undefined &&
            Array.isArray(firstPreset.deck) &&
            firstPreset.deck.length === 20 &&
            Array.isArray(firstPreset.energyTypes) &&
            firstPreset.energyTypes.length > 0;

        if (hasValidStructure) {
            console.log('✅ Test 3.3: Deck preset has valid structure');
            passed++;
            results.push({ test: '3.3', status: 'PASS' });
        } else {
            console.log('❌ Test 3.3: Deck preset structure invalid');
            failed++;
            results.push({ test: '3.3', status: 'FAIL', reason: 'Invalid structure' });
        }
    } catch (e) {
        console.log('❌ Test 3.3:', e.message);
        failed++;
        results.push({ test: '3.3', status: 'FAIL', reason: e.message });
    }

    // Test 3.4: Deck preset respects max copies (2 per card)
    try {
        const deckPresetsModule = await import('./js/data/deck-presets.js');
        const presets = deckPresetsModule.getAllDeckPresets();
        const firstPreset = presets[0];

        // Count card IDs
        const cardCounts = {};
        firstPreset.deck.forEach(cardId => {
            cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
        });

        // Check if any card exceeds 2 copies
        const invalidCards = Object.entries(cardCounts)
            .filter(([id, count]) => count > 2)
            .map(([id, count]) => `${id} (${count} copies)`);

        if (invalidCards.length === 0) {
            console.log('✅ Test 3.4: Deck preset respects max copies (2 per card)');
            passed++;
            results.push({ test: '3.4', status: 'PASS' });
        } else {
            console.log('❌ Test 3.4: Deck preset has cards exceeding max copies');
            console.log('   Invalid cards:', invalidCards.join(', '));
            failed++;
            results.push({ test: '3.4', status: 'FAIL', reason: 'Max copies exceeded' });
        }
    } catch (e) {
        console.log('❌ Test 3.4:', e.message);
        failed++;
        results.push({ test: '3.4', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 4: Backward Compatibility
    // ========================================================================
    console.log('\n🔄 Category 4: Backward Compatibility');
    console.log('-'.repeat(60));

    // Test 4.1: Empty scenario file can be loaded
    try {
        const emptyScenario = {
            version: 1,
            turn: 0,
            currentPlayer: 'player1',
            coinQueue: [true, false, true],
            player1: {
                points: 0,
                active: null,
                bench: [],
                hand: [],
                deck: [],
                discard: [],
                energyZone: {
                    currentEnergy: null,
                    nextEnergy: null,
                    configuredTypes: [],
                    usedThisTurn: false
                },
                supporterUsedThisTurn: false,
                retreatedThisTurn: false,
                normalAttachUsedThisTurn: false
            },
            player2: {
                points: 0,
                active: null,
                bench: [],
                hand: [],
                deck: [],
                discard: [],
                energyZone: {
                    currentEnergy: null,
                    nextEnergy: null,
                    configuredTypes: [],
                    usedThisTurn: false
                },
                supporterUsedThisTurn: false,
                retreatedThisTurn: false,
                normalAttachUsedThisTurn: false
            },
            stadium: null,
            turnEffects: [],
            log: []
        };

        const isValid = gamestateModule.isValidState(emptyScenario);

        if (isValid) {
            console.log('✅ Test 4.1: Empty scenario file can be loaded');
            passed++;
            results.push({ test: '4.1', status: 'PASS' });
        } else {
            console.log('❌ Test 4.1: Empty scenario file validation failed');
            failed++;
            results.push({ test: '4.1', status: 'FAIL', reason: 'Validation failed' });
        }
    } catch (e) {
        console.log('❌ Test 4.1:', e.message);
        failed++;
        results.push({ test: '4.1', status: 'FAIL', reason: e.message });
    }

    // Test 4.2: Scenario version 1 is accepted
    try {
        const scenario = {
            version: 1,
            turn: 1,
            currentPlayer: 'player1',
            coinQueue: [],
            player1: {
                points: 0,
                active: null,
                bench: [],
                hand: [],
                deck: [],
                discard: [],
                energyZone: {
                    currentEnergy: null,
                    nextEnergy: null,
                    configuredTypes: [],
                    usedThisTurn: false
                },
                supporterUsedThisTurn: false,
                retreatedThisTurn: false,
                normalAttachUsedThisTurn: false
            },
            player2: {
                points: 0,
                active: null,
                bench: [],
                hand: [],
                deck: [],
                discard: [],
                energyZone: {
                    currentEnergy: null,
                    nextEnergy: null,
                    configuredTypes: [],
                    usedThisTurn: false
                },
                supporterUsedThisTurn: false,
                retreatedThisTurn: false,
                normalAttachUsedThisTurn: false
            },
            stadium: null,
            turnEffects: [],
            log: []
        };

        const isValid = gamestateModule.isValidState(scenario);

        if (isValid) {
            console.log('✅ Test 4.2: Scenario version 1 is accepted');
            passed++;
            results.push({ test: '4.2', status: 'PASS' });
        } else {
            console.log('❌ Test 4.2: Scenario version 1 rejected');
            failed++;
            results.push({ test: '4.2', status: 'FAIL', reason: 'Version rejected' });
        }
    } catch (e) {
        console.log('❌ Test 4.2:', e.message);
        failed++;
        results.push({ test: '4.2', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 5: State Validation
    // ========================================================================
    console.log('\n✓ Category 5: State Validation');
    console.log('-'.repeat(60));

    // Test 5.1: Invalid state is rejected
    try {
        const invalidState = {
            version: 999, // Wrong version
            turn: -1, // Invalid turn
            currentPlayer: 'invalid', // Invalid player
            coinQueue: 'not-an-array', // Invalid type
            player1: null, // Missing
            player2: null // Missing
        };

        const isValid = gamestateModule.isValidState(invalidState);

        if (!isValid) {
            console.log('✅ Test 5.1: Invalid state is rejected');
            passed++;
            results.push({ test: '5.1', status: 'PASS' });
        } else {
            console.log('❌ Test 5.1: Invalid state should be rejected');
            failed++;
            results.push({ test: '5.1', status: 'FAIL', reason: 'Invalid state accepted' });
        }
    } catch (e) {
        console.log('❌ Test 5.1:', e.message);
        failed++;
        results.push({ test: '5.1', status: 'FAIL', reason: e.message });
    }

    // Test 5.2: Empty state does not auto-populate
    try {
        const state1 = gamestateModule.createInitialState();
        const state2 = gamestateModule.createInitialState();

        // Empty states should not have any cards
        const isTrulyEmpty =
            state1.player1.deck.length === 0 &&
            state1.player1.hand.length === 0 &&
            state1.player1.active === null &&
            state1.player1.bench.length === 0 &&
            state2.player2.deck.length === 0 &&
            state2.player2.hand.length === 0 &&
            state2.player2.active === null &&
            state2.player2.bench.length === 0;

        if (isTrulyEmpty) {
            console.log('✅ Test 5.2: Empty state does not auto-populate');
            passed++;
            results.push({ test: '5.2', status: 'PASS' });
        } else {
            console.log('❌ Test 5.2: Empty state appears to auto-populate');
            failed++;
            results.push({ test: '5.2', status: 'FAIL', reason: 'Auto-population detected' });
        }
    } catch (e) {
        console.log('❌ Test 5.2:', e.message);
        failed++;
        results.push({ test: '5.2', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   Test ${r.test}: ${r.reason || 'Unknown error'}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(e => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
});
