#!/usr/bin/env node
/**
 * US-002 Tests: New Game State Builder
 *
 * Tests for the extracted new-game-setup module:
 * 1. isBasicPokemonCard correctly identifies Basic Pokemon
 * 2. shuffleArray produces different orders
 * 3. buildPlayerFromPreset creates valid player states
 * 4. buildNewGameState creates valid game states
 * 5. Output matches documented defaults (no full-board auto population)
 *
 * Run with: node test-us002-new-game-setup.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the module we're testing
const newGameSetupModule = await import('./js/engine/new-game-setup.js');

// Mock card lookup function for testing
function mockCardLookup(cardId) {
    const mockCards = {
        'BASIC-1': { id: 'BASIC-1', name: 'Bulbasaur', supertype: 'Pokémon', subtypes: ['Basic'], hp: 60 },
        'BASIC-2': { id: 'BASIC-2', name: 'Charmander', supertype: 'Pokémon', subtypes: ['Basic'], hp: 60 },
        'BASIC-3': { id: 'BASIC-3', name: 'Squirtle', supertype: 'Pokémon', subtypes: ['Basic'], hp: 60 },
        'BASIC-4': { id: 'BASIC-4', name: 'Pikachu', supertype: 'Pokémon', subtypes: ['Basic'], hp: 60 },
        'BASIC-5': { id: 'BASIC-5', name: 'Jigglypuff', supertype: 'Pokémon', subtypes: ['Basic'], hp: 60 },
        'EVO-1': { id: 'EVO-1', name: 'Ivysaur', supertype: 'Pokémon', subtypes: ['Stage 1'], evolvesFrom: 'Bulbasaur', hp: 90 },
        'EVO-2': { id: 'EVO-2', name: 'Charmeleon', supertype: 'Pokémon', subtypes: ['Stage 1'], evolvesFrom: 'Charmander', hp: 90 },
        'TRAINER-1': { id: 'TRAINER-1', name: 'Potion', supertype: 'Trainer' },
        'TRAINER-2': { id: 'TRAINER-2', name: 'Professor\'s Research', supertype: 'Trainer' },
        'TRAINER-3': { id: 'TRAINER-3', name: 'Poké Ball', supertype: 'Trainer' },
        'ENERGY-1': { id: 'ENERGY-1', name: 'Grass Energy', supertype: 'Energy' },
        'ENERGY-2': { id: 'ENERGY-2', name: 'Fire Energy', supertype: 'Energy' }
    };
    return mockCards[cardId] || null;
}

// Test preset with 20 cards including basics (max 2 copies per card)
const validPreset = {
    id: 'test-preset',
    name: 'Test Deck',
    deck: [
        'BASIC-1', 'BASIC-1', 'BASIC-2', 'BASIC-2', 'BASIC-3',
        'BASIC-3', 'BASIC-4', 'BASIC-4', 'BASIC-5', 'BASIC-5',
        'EVO-1', 'EVO-1', 'EVO-2', 'EVO-2', 'TRAINER-1',
        'TRAINER-1', 'TRAINER-2', 'TRAINER-2', 'TRAINER-3', 'TRAINER-3'
    ],
    energyTypes: ['G', 'C']
};

// Test preset with no basic Pokemon (should fail)
const invalidPresetNoBasics = {
    id: 'invalid-no-basics',
    name: 'Invalid Deck - No Basics',
    deck: [
        'EVO-1', 'EVO-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1',
        'TRAINER-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1',
        'TRAINER-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1',
        'TRAINER-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1', 'TRAINER-1'
    ],
    energyTypes: ['G', 'C']
};

async function runTests() {
    console.log('📦 US-002: New Game State Builder Tests\n');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;
    const results = [];

    // ========================================================================
    // TEST CATEGORY 1: isBasicPokemonCard
    // ========================================================================
    console.log('\n🎴 Category 1: isBasicPokemonCard');
    console.log('-'.repeat(60));

    // Test 1.1: Returns true for Basic Pokemon with subtypes
    try {
        const basicCard = { supertype: 'Pokémon', subtypes: ['Basic'] };
        const result = newGameSetupModule.isBasicPokemonCard(basicCard);
        if (result === true) {
            console.log('✅ Test 1.1: Returns true for Basic Pokemon with subtypes');
            passed++;
            results.push({ test: '1.1', status: 'PASS' });
        } else {
            console.log('❌ Test 1.1: Should return true for Basic Pokemon');
            failed++;
            results.push({ test: '1.1', status: 'FAIL', reason: 'Expected true' });
        }
    } catch (e) {
        console.log('❌ Test 1.1:', e.message);
        failed++;
        results.push({ test: '1.1', status: 'FAIL', reason: e.message });
    }

    // Test 1.2: Returns true for Basic Pokemon with stage
    try {
        const basicCard = { supertype: 'Pokémon', stage: 'Basic' };
        const result = newGameSetupModule.isBasicPokemonCard(basicCard);
        if (result === true) {
            console.log('✅ Test 1.2: Returns true for Basic Pokemon with stage');
            passed++;
            results.push({ test: '1.2', status: 'PASS' });
        } else {
            console.log('❌ Test 1.2: Should return true for Basic Pokemon with stage');
            failed++;
            results.push({ test: '1.2', status: 'FAIL', reason: 'Expected true' });
        }
    } catch (e) {
        console.log('❌ Test 1.2:', e.message);
        failed++;
        results.push({ test: '1.2', status: 'FAIL', reason: e.message });
    }

    // Test 1.3: Returns true for Basic Pokemon without evolvesFrom
    try {
        const basicCard = { supertype: 'Pokémon' };
        const result = newGameSetupModule.isBasicPokemonCard(basicCard);
        if (result === true) {
            console.log('✅ Test 1.3: Returns true for Basic Pokemon without evolvesFrom');
            passed++;
            results.push({ test: '1.3', status: 'PASS' });
        } else {
            console.log('❌ Test 1.3: Should return true for Basic Pokemon');
            failed++;
            results.push({ test: '1.3', status: 'FAIL', reason: 'Expected true' });
        }
    } catch (e) {
        console.log('❌ Test 1.3:', e.message);
        failed++;
        results.push({ test: '1.3', status: 'FAIL', reason: e.message });
    }

    // Test 1.4: Returns false for evolution Pokemon
    try {
        const evoCard = { supertype: 'Pokémon', evolvesFrom: 'Bulbasaur' };
        const result = newGameSetupModule.isBasicPokemonCard(evoCard);
        if (result === false) {
            console.log('✅ Test 1.4: Returns false for evolution Pokemon');
            passed++;
            results.push({ test: '1.4', status: 'PASS' });
        } else {
            console.log('❌ Test 1.4: Should return false for evolution Pokemon');
            failed++;
            results.push({ test: '1.4', status: 'FAIL', reason: 'Expected false' });
        }
    } catch (e) {
        console.log('❌ Test 1.4:', e.message);
        failed++;
        results.push({ test: '1.4', status: 'FAIL', reason: e.message });
    }

    // Test 1.5: Returns false for null/undefined
    try {
        const result1 = newGameSetupModule.isBasicPokemonCard(null);
        const result2 = newGameSetupModule.isBasicPokemonCard(undefined);
        if (result1 === false && result2 === false) {
            console.log('✅ Test 1.5: Returns false for null/undefined');
            passed++;
            results.push({ test: '1.5', status: 'PASS' });
        } else {
            console.log('❌ Test 1.5: Should return false for null/undefined');
            failed++;
            results.push({ test: '1.5', status: 'FAIL', reason: 'Expected false' });
        }
    } catch (e) {
        console.log('❌ Test 1.5:', e.message);
        failed++;
        results.push({ test: '1.5', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 2: shuffleArray
    // ========================================================================
    console.log('\n🔀 Category 2: shuffleArray');
    console.log('-'.repeat(60));

    // Test 2.1: Returns array of same length
    try {
        const input = [1, 2, 3, 4, 5];
        const result = newGameSetupModule.shuffleArray(input);
        if (result.length === input.length) {
            console.log('✅ Test 2.1: Returns array of same length');
            passed++;
            results.push({ test: '2.1', status: 'PASS' });
        } else {
            console.log('❌ Test 2.1: Length mismatch');
            failed++;
            results.push({ test: '2.1', status: 'FAIL', reason: `Length ${result.length} != ${input.length}` });
        }
    } catch (e) {
        console.log('❌ Test 2.1:', e.message);
        failed++;
        results.push({ test: '2.1', status: 'FAIL', reason: e.message });
    }

    // Test 2.2: Does not modify original array
    try {
        const input = [1, 2, 3, 4, 5];
        const result = newGameSetupModule.shuffleArray(input);
        if (JSON.stringify(input) === JSON.stringify([1, 2, 3, 4, 5])) {
            console.log('✅ Test 2.2: Does not modify original array');
            passed++;
            results.push({ test: '2.2', status: 'PASS' });
        } else {
            console.log('❌ Test 2.2: Modified original array');
            failed++;
            results.push({ test: '2.2', status: 'FAIL', reason: 'Original was modified' });
        }
    } catch (e) {
        console.log('❌ Test 2.2:', e.message);
        failed++;
        results.push({ test: '2.2', status: 'FAIL', reason: e.message });
    }

    // Test 2.3: Contains same elements
    try {
        const input = [1, 2, 3, 4, 5];
        const result = newGameSetupModule.shuffleArray(input);
        const sameElements = input.every(el => result.includes(el)) &&
                           result.every(el => input.includes(el));
        if (sameElements) {
            console.log('✅ Test 2.3: Contains same elements');
            passed++;
            results.push({ test: '2.3', status: 'PASS' });
        } else {
            console.log('❌ Test 2.3: Elements differ');
            failed++;
            results.push({ test: '2.3', status: 'FAIL', reason: 'Elements differ' });
        }
    } catch (e) {
        console.log('❌ Test 2.3:', e.message);
        failed++;
        results.push({ test: '2.3', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 3: buildPlayerFromPreset
    // ========================================================================
    console.log('\n👤 Category 3: buildPlayerFromPreset');
    console.log('-'.repeat(60));

    // Test 3.1: Creates valid player state from valid preset
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        if (player && typeof player === 'object') {
            console.log('✅ Test 3.1: Creates valid player state');
            passed++;
            results.push({ test: '3.1', status: 'PASS' });
        } else {
            console.log('❌ Test 3.1: Failed to create player state');
            failed++;
            results.push({ test: '3.1', status: 'FAIL', reason: 'Invalid state' });
        }
    } catch (e) {
        console.log('❌ Test 3.1:', e.message);
        failed++;
        results.push({ test: '3.1', status: 'FAIL', reason: e.message });
    }

    // Test 3.2: Active Pokemon is a Basic Pokemon
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const activeCard = mockCardLookup(player.active.cardId);
        const isBasic = newGameSetupModule.isBasicPokemonCard(activeCard);
        if (isBasic) {
            console.log('✅ Test 3.2: Active Pokemon is a Basic Pokemon');
            passed++;
            results.push({ test: '3.2', status: 'PASS' });
        } else {
            console.log('❌ Test 3.2: Active is not Basic Pokemon');
            failed++;
            results.push({ test: '3.2', status: 'FAIL', reason: 'Active is not basic' });
        }
    } catch (e) {
        console.log('❌ Test 3.2:', e.message);
        failed++;
        results.push({ test: '3.2', status: 'FAIL', reason: e.message });
    }

    // Test 3.3: Bench contains up to 3 Basic Pokemon
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const benchCount = player.bench.length;
        if (benchCount >= 0 && benchCount <= 3) {
            console.log(`✅ Test 3.3: Bench contains ${benchCount} Pokemon (max 3)`);
            passed++;
            results.push({ test: '3.3', status: 'PASS' });
        } else {
            console.log('❌ Test 3.3: Bench count exceeds 3');
            failed++;
            results.push({ test: '3.3', status: 'FAIL', reason: `Bench count: ${benchCount}` });
        }
    } catch (e) {
        console.log('❌ Test 3.3:', e.message);
        failed++;
        results.push({ test: '3.3', status: 'FAIL', reason: e.message });
    }

    // Test 3.4: Hand contains exactly 5 cards
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        if (player.hand.length === 5) {
            console.log('✅ Test 3.4: Hand contains exactly 5 cards');
            passed++;
            results.push({ test: '3.4', status: 'PASS' });
        } else {
            console.log('❌ Test 3.4: Hand does not contain 5 cards');
            failed++;
            results.push({ test: '3.4', status: 'FAIL', reason: `Hand count: ${player.hand.length}` });
        }
    } catch (e) {
        console.log('❌ Test 3.4:', e.message);
        failed++;
        results.push({ test: '3.4', status: 'FAIL', reason: e.message });
    }

    // Test 3.5: Deck + active + bench + hand = 20 cards total
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const total = player.deck.length + 1 + player.bench.length + player.hand.length;
        if (total === 20) {
            console.log('✅ Test 3.5: Total card count is 20');
            passed++;
            results.push({ test: '3.5', status: 'PASS' });
        } else {
            console.log('❌ Test 3.5: Total card count is not 20');
            failed++;
            results.push({ test: '3.5', status: 'FAIL', reason: `Total: ${total}` });
        }
    } catch (e) {
        console.log('❌ Test 3.5:', e.message);
        failed++;
        results.push({ test: '3.5', status: 'FAIL', reason: e.message });
    }

    // Test 3.6: Active Pokemon HP matches card HP
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const activeCard = mockCardLookup(player.active.cardId);
        if (player.active.currentHp === activeCard.hp) {
            console.log('✅ Test 3.6: Active Pokemon HP matches card HP');
            passed++;
            results.push({ test: '3.6', status: 'PASS' });
        } else {
            console.log('❌ Test 3.6: HP mismatch');
            failed++;
            results.push({ test: '3.6', status: 'FAIL', reason: `HP: ${player.active.currentHp} vs ${activeCard.hp}` });
        }
    } catch (e) {
        console.log('❌ Test 3.6:', e.message);
        failed++;
        results.push({ test: '3.6', status: 'FAIL', reason: e.message });
    }

    // Test 3.7: Bench Pokemon HP matches card HP
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const allHpMatch = player.bench.every(p => {
            const card = mockCardLookup(p.cardId);
            return p.currentHp === card.hp;
        });
        if (allHpMatch) {
            console.log('✅ Test 3.7: Bench Pokemon HP matches card HP');
            passed++;
            results.push({ test: '3.7', status: 'PASS' });
        } else {
            console.log('❌ Test 3.7: Bench HP mismatch');
            failed++;
            results.push({ test: '3.7', status: 'FAIL', reason: 'Bench HP mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.7:', e.message);
        failed++;
        results.push({ test: '3.7', status: 'FAIL', reason: e.message });
    }

    // Test 3.8: Energy Zone is configured correctly
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const energyCorrect = player.energyZone.currentEnergy === 'G' &&
                             player.energyZone.nextEnergy === 'C' &&
                             JSON.stringify(player.energyZone.configuredTypes) === JSON.stringify(['G', 'C']);
        if (energyCorrect) {
            console.log('✅ Test 3.8: Energy Zone configured correctly');
            passed++;
            results.push({ test: '3.8', status: 'PASS' });
        } else {
            console.log('❌ Test 3.8: Energy Zone configuration incorrect');
            failed++;
            results.push({ test: '3.8', status: 'FAIL', reason: 'Energy mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.8:', e.message);
        failed++;
        results.push({ test: '3.8', status: 'FAIL', reason: e.message });
    }

    // Test 3.9: Throws error for preset with no Basic Pokemon
    try {
        try {
            const player = newGameSetupModule.buildPlayerFromPreset(invalidPresetNoBasics, mockCardLookup);
            console.log('❌ Test 3.9: Should throw error for no Basic Pokemon');
            failed++;
            results.push({ test: '3.9', status: 'FAIL', reason: 'Did not throw error' });
        } catch (err) {
            if (err.message.includes('Basic Pokemon')) {
                console.log('✅ Test 3.9: Throws error for no Basic Pokemon');
                passed++;
                results.push({ test: '3.9', status: 'PASS' });
            } else {
                console.log('❌ Test 3.9: Wrong error message');
                failed++;
                results.push({ test: '3.9', status: 'FAIL', reason: `Error: ${err.message}` });
            }
        }
    } catch (e) {
        console.log('❌ Test 3.9:', e.message);
        failed++;
        results.push({ test: '3.9', status: 'FAIL', reason: e.message });
    }

    // Test 3.10: Points and flags initialized to 0/false
    try {
        const player = newGameSetupModule.buildPlayerFromPreset(validPreset, mockCardLookup);
        const flagsCorrect = player.points === 0 &&
                             player.supporterUsedThisTurn === false &&
                             player.retreatedThisTurn === false &&
                             player.normalAttachUsedThisTurn === false &&
                             player.attackedThisTurn === false;
        if (flagsCorrect) {
            console.log('✅ Test 3.10: Points and flags initialized correctly');
            passed++;
            results.push({ test: '3.10', status: 'PASS' });
        } else {
            console.log('❌ Test 3.10: Flags not initialized correctly');
            failed++;
            results.push({ test: '3.10', status: 'FAIL', reason: 'Flags mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.10:', e.message);
        failed++;
        results.push({ test: '3.10', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 4: buildNewGameState
    // ========================================================================
    console.log('\n🎮 Category 4: buildNewGameState');
    console.log('-'.repeat(60));

    // Test 4.1: Creates valid game state
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        if (state && typeof state === 'object') {
            console.log('✅ Test 4.1: Creates valid game state');
            passed++;
            results.push({ test: '4.1', status: 'PASS' });
        } else {
            console.log('❌ Test 4.1: Failed to create game state');
            failed++;
            results.push({ test: '4.1', status: 'FAIL', reason: 'Invalid state' });
        }
    } catch (e) {
        console.log('❌ Test 4.1:', e.message);
        console.log('   Error details:', e);
        failed++;
        results.push({ test: '4.1', status: 'FAIL', reason: e.message });
    }

    // Test 4.2: Turn is set to 1
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        if (state.turn === 1) {
            console.log('✅ Test 4.2: Turn is set to 1');
            passed++;
            results.push({ test: '4.2', status: 'PASS' });
        } else {
            console.log('❌ Test 4.2: Turn is not 1');
            failed++;
            results.push({ test: '4.2', status: 'FAIL', reason: `Turn: ${state.turn}` });
        }
    } catch (e) {
        console.log('❌ Test 4.2:', e.message);
        failed++;
        results.push({ test: '4.2', status: 'FAIL', reason: e.message });
    }

    // Test 4.3: Current player is player1
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        if (state.currentPlayer === 'player1') {
            console.log('✅ Test 4.3: Current player is player1');
            passed++;
            results.push({ test: '4.3', status: 'PASS' });
        } else {
            console.log('❌ Test 4.3: Current player is not player1');
            failed++;
            results.push({ test: '4.3', status: 'FAIL', reason: `Player: ${state.currentPlayer}` });
        }
    } catch (e) {
        console.log('❌ Test 4.3:', e.message);
        failed++;
        results.push({ test: '4.3', status: 'FAIL', reason: e.message });
    }

    // Test 4.4: Both players have valid state
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        const bothValid = state.player1.active !== null &&
                         state.player2.active !== null &&
                         typeof state.player1.active === 'object' &&
                         typeof state.player2.active === 'object';
        if (bothValid) {
            console.log('✅ Test 4.4: Both players have valid state');
            passed++;
            results.push({ test: '4.4', status: 'PASS' });
        } else {
            console.log('❌ Test 4.4: Players have invalid state');
            failed++;
            results.push({ test: '4.4', status: 'FAIL', reason: 'Invalid player state' });
        }
    } catch (e) {
        console.log('❌ Test 4.4:', e.message);
        failed++;
        results.push({ test: '4.4', status: 'FAIL', reason: e.message });
    }

    // Test 4.5: State includes initial log entry
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        const hasLog = Array.isArray(state.log) && state.log.length > 0;
        if (hasLog) {
            console.log('✅ Test 4.5: State includes initial log entry');
            passed++;
            results.push({ test: '4.5', status: 'PASS' });
        } else {
            console.log('❌ Test 4.5: Missing log entry');
            failed++;
            results.push({ test: '4.5', status: 'FAIL', reason: 'No log entry' });
        }
    } catch (e) {
        console.log('❌ Test 4.5:', e.message);
        failed++;
        results.push({ test: '4.5', status: 'FAIL', reason: e.message });
    }

    // Test 4.6: Stadium is null (no auto-populated stadium)
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        if (state.stadium === null) {
            console.log('✅ Test 4.6: Stadium is null (no auto-population)');
            passed++;
            results.push({ test: '4.6', status: 'PASS' });
        } else {
            console.log('❌ Test 4.6: Stadium is not null');
            failed++;
            results.push({ test: '4.6', status: 'FAIL', reason: `Stadium: ${state.stadium}` });
        }
    } catch (e) {
        console.log('❌ Test 4.6:', e.message);
        failed++;
        results.push({ test: '4.6', status: 'FAIL', reason: e.message });
    }

    // Test 4.7: Both players start with 0 points
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        if (state.player1.points === 0 && state.player2.points === 0) {
            console.log('✅ Test 4.7: Both players start with 0 points');
            passed++;
            results.push({ test: '4.7', status: 'PASS' });
        } else {
            console.log('❌ Test 4.7: Points not initialized to 0');
            failed++;
            results.push({ test: '4.7', status: 'FAIL', reason: `P1: ${state.player1.points}, P2: ${state.player2.points}` });
        }
    } catch (e) {
        console.log('❌ Test 4.7:', e.message);
        failed++;
        results.push({ test: '4.7', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 5: Documented Defaults Compliance
    // ========================================================================
    console.log('\n📋 Category 5: Documented Defaults Compliance');
    console.log('-'.repeat(60));

    // Test 5.1: No full-board auto-population (Mode 2 behavior)
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        // Mode 2 should NOT auto-populate full board - should only populate based on deck contents
        const notFullBoard = state.player1.bench.length <= 3 &&
                           state.player2.bench.length <= 3;
        if (notFullBoard) {
            console.log('✅ Test 5.1: No full-board auto-population');
            passed++;
            results.push({ test: '5.1', status: 'PASS' });
        } else {
            console.log('❌ Test 5.1: Full-board auto-population detected');
            failed++;
            results.push({ test: '5.1', status: 'FAIL', reason: 'Full-board auto-populated' });
        }
    } catch (e) {
        console.log('❌ Test 5.1:', e.message);
        failed++;
        results.push({ test: '5.1', status: 'FAIL', reason: e.message });
    }

    // Test 5.2: Energy Zone currentEnergy is pre-filled (per SPEC)
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        const hasEnergy = state.player1.energyZone.currentEnergy !== null &&
                         state.player2.energyZone.currentEnergy !== null;
        if (hasEnergy) {
            console.log('✅ Test 5.2: Energy Zone currentEnergy is pre-filled');
            passed++;
            results.push({ test: '5.2', status: 'PASS' });
        } else {
            console.log('❌ Test 5.2: Energy Zone not pre-filled');
            failed++;
            results.push({ test: '5.2', status: 'FAIL', reason: 'Energy missing' });
        }
    } catch (e) {
        console.log('❌ Test 5.2:', e.message);
        failed++;
        results.push({ test: '5.2', status: 'FAIL', reason: e.message });
    }

    // Test 5.3: Hand size is exactly 5 (per SPEC)
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        const handSizeCorrect = state.player1.hand.length === 5 &&
                              state.player2.hand.length === 5;
        if (handSizeCorrect) {
            console.log('✅ Test 5.3: Hand size is exactly 5');
            passed++;
            results.push({ test: '5.3', status: 'PASS' });
        } else {
            console.log('❌ Test 5.3: Hand size not 5');
            failed++;
            results.push({ test: '5.3', status: 'FAIL', reason: `P1: ${state.player1.hand.length}, P2: ${state.player2.hand.length}` });
        }
    } catch (e) {
        console.log('❌ Test 5.3:', e.message);
        failed++;
        results.push({ test: '5.3', status: 'FAIL', reason: e.message });
    }

    // Test 5.4: Active and bench Pokemon are distinct cards
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        const p1Duplicates = state.player1.bench.filter(b => b.cardId === state.player1.active.cardId);
        const p2Duplicates = state.player2.bench.filter(b => b.cardId === state.player2.active.cardId);
        const p1Distinct = p1Duplicates.length === 0;
        const p2Distinct = p2Duplicates.length === 0;
        if (p1Distinct && p2Distinct) {
            console.log('✅ Test 5.4: Active and bench Pokemon are distinct');
            passed++;
            results.push({ test: '5.4', status: 'PASS' });
        } else {
            console.log('❌ Test 5.4: Duplicate cards found');
            console.log(`   P1 active: ${state.player1.active.cardId}, bench duplicates: ${p1Duplicates.map(b => b.cardId).join(', ')}`);
            console.log(`   P2 active: ${state.player2.active.cardId}, bench duplicates: ${p2Duplicates.map(b => b.cardId).join(', ')}`);
            failed++;
            results.push({ test: '5.4', status: 'FAIL', reason: 'Duplicate cards' });
        }
    } catch (e) {
        console.log('❌ Test 5.4:', e.message);
        failed++;
        results.push({ test: '5.4', status: 'FAIL', reason: e.message });
    }

    // Test 5.5: Discard piles are empty
    try {
        const state = newGameSetupModule.buildNewGameState(validPreset, validPreset, mockCardLookup);
        const discardEmpty = state.player1.discard.length === 0 &&
                            state.player2.discard.length === 0;
        if (discardEmpty) {
            console.log('✅ Test 5.5: Discard piles are empty');
            passed++;
            results.push({ test: '5.5', status: 'PASS' });
        } else {
            console.log('❌ Test 5.5: Discard piles not empty');
            failed++;
            results.push({ test: '5.5', status: 'FAIL', reason: 'Discard not empty' });
        }
    } catch (e) {
        console.log('❌ Test 5.5:', e.message);
        failed++;
        results.push({ test: '5.5', status: 'FAIL', reason: e.message });
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
