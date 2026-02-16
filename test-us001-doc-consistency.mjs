#!/usr/bin/env node
/**
 * US-001 Tests: Start-of-Game Documentation Consistency
 *
 * Tests for verifying that SPEC.md documentation matches actual implementation:
 * 1. SPEC.md has dedicated 'Start-of-game setup' section
 * 2. SPEC.md includes concrete TODO-Pocket-Verify markers for unknown setup details
 * 3. Documentation rules match implementation behavior
 *
 * Run with: node test-us001-doc-consistency.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import modules
async function runTests() {
    console.log('📚 US-001: Start-of-Game Documentation Consistency Tests\n');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;
    const results = [];

    // Read SPEC.md
    let specContent;
    try {
        specContent = readFileSync(join(__dirname, 'SPEC.md'), 'utf8');
    } catch (e) {
        console.log('❌ Fatal: Cannot read SPEC.md:', e.message);
        process.exit(1);
    }

    // Import game-state module
    const gamestateModule = await import('./js/engine/game-state.js');

    // ========================================================================
    // TEST CATEGORY 1: SPEC.md Has Dedicated Start-of-Game Setup Section
    // ========================================================================
    console.log('\n📖 Category 1: SPEC.md Has Dedicated Start-of-Game Setup Section');
    console.log('-'.repeat(60));

    // Test 1.1: SPEC.md contains "Start-of-Game Setup" heading
    try {
        const hasStartOfGameSetup = specContent.includes('### Start-of-Game Setup') ||
                                    specContent.includes('### Start-of-game setup') ||
                                    specContent.includes('### Start-of-Game setup');

        if (hasStartOfGameSetup) {
            console.log('✅ Test 1.1: SPEC.md contains "Start-of-Game Setup" heading');
            passed++;
            results.push({ test: '1.1', status: 'PASS' });
        } else {
            console.log('❌ Test 1.1: SPEC.md missing "Start-of-Game Setup" heading');
            failed++;
            results.push({ test: '1.1', status: 'FAIL', reason: 'Heading not found' });
        }
    } catch (e) {
        console.log('❌ Test 1.1:', e.message);
        failed++;
        results.push({ test: '1.1', status: 'FAIL', reason: e.message });
    }

    // Test 1.2: Start-of-Game Setup section has three modes documented
    try {
        // Match from "### Start-of-Game Setup" to the next top-level section (### with capital letter after space, not ####)
        const sectionMatch = specContent.match(/### Start-of-[Gg]ame\s+[Ss]etup([\s\S]*?)(?=\n### [A-Z]|\n##[^\#]|$)/);
        const hasModes = sectionMatch &&
                        sectionMatch[1].includes('Mode 1') &&
                        sectionMatch[1].includes('Mode 2') &&
                        sectionMatch[1].includes('Mode 3');

        if (hasModes) {
            console.log('✅ Test 1.2: Start-of-Game Setup section has three modes documented');
            passed++;
            results.push({ test: '1.2', status: 'PASS' });
        } else {
            console.log('❌ Test 1.2: Start-of-Game Setup section missing mode documentation');
            failed++;
            results.push({ test: '1.2', status: 'FAIL', reason: 'Modes not documented' });
        }
    } catch (e) {
        console.log('❌ Test 1.2:', e.message);
        failed++;
        results.push({ test: '1.2', status: 'FAIL', reason: e.message });
    }

    // Test 1.3: Start-of-Game Setup section describes app boot, New Game, and scenario load
    try {
        const sectionMatch = specContent.match(/### Start-of-[Gg]ame\s+[Ss]etup([\s\S]*?)(?=\n### [A-Z]|\n##[^\#]|$)/);
        const hasAllScenarios = sectionMatch &&
                               sectionMatch[1].toLowerCase().includes('app boot') &&
                               sectionMatch[1].toLowerCase().includes('new game') &&
                               sectionMatch[1].toLowerCase().includes('scenario load');

        if (hasAllScenarios) {
            console.log('✅ Test 1.3: Section describes app boot, New Game, and scenario load');
            passed++;
            results.push({ test: '1.3', status: 'PASS' });
        } else {
            console.log('❌ Test 1.3: Section missing description for one or more scenarios');
            failed++;
            results.push({ test: '1.3', status: 'FAIL', reason: 'Missing scenario descriptions' });
        }
    } catch (e) {
        console.log('❌ Test 1.3:', e.message);
        failed++;
        results.push({ test: '1.3', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 2: SPEC.md Includes TODO-Pocket-Verify Markers
    // ========================================================================
    console.log('\n🔍 Category 2: SPEC.md Includes TODO-Pocket-Verify Markers');
    console.log('-'.repeat(60));

    // Test 2.1: SPEC.md contains at least one TODO-Pocket-Verify marker
    try {
        const hasTodoMarker = specContent.includes('TODO-Pocket-Verify');

        if (hasTodoMarker) {
            console.log('✅ Test 2.1: SPEC.md contains at least one TODO-Pocket-Verify marker');
            passed++;
            results.push({ test: '2.1', status: 'PASS' });
        } else {
            console.log('❌ Test 2.1: SPEC.md missing TODO-Pocket-Verify markers');
            failed++;
            results.push({ test: '2.1', status: 'FAIL', reason: 'No TODO markers found' });
        }
    } catch (e) {
        console.log('❌ Test 2.1:', e.message);
        failed++;
        results.push({ test: '2.1', status: 'FAIL', reason: e.message });
    }

    // Test 2.2: SPEC.md contains TODO-Pocket-Verify for setup-related unknowns
    try {
        const sectionMatch = specContent.match(/### Start-of-[Gg]ame\s+[Ss]etup([\s\S]*?)(?=\n### [A-Z]|\n##[^\#]|$)/);
        const hasSetupTodo = sectionMatch && sectionMatch[1].includes('TODO-Pocket-Verify');

        if (hasSetupTodo) {
            console.log('✅ Test 2.2: Start-of-Game Setup section has TODO-Pocket-Verify markers');
            passed++;
            results.push({ test: '2.2', status: 'PASS' });
        } else {
            console.log('❌ Test 2.2: Start-of-Game Setup section missing TODO markers');
            failed++;
            results.push({ test: '2.2', status: 'FAIL', reason: 'No setup TODO markers' });
        }
    } catch (e) {
        console.log('❌ Test 2.2:', e.message);
        failed++;
        results.push({ test: '2.2', status: 'FAIL', reason: e.message });
    }

    // Test 2.3: SPEC.md has concrete research TODO with context
    try {
        const sectionMatch = specContent.match(/### Start-of-[Gg]ame\s+[Ss]etup([\s\S]*?)(?=\n### [A-Z]|\n##[^\#]|$)/);
        // Check for TODO-Pocket-Verify that mentions deck shuffling, bench count, or hand size
        const hasConcreteTodo = sectionMatch &&
                               (sectionMatch[1].includes('shuffling') ||
                                sectionMatch[1].includes('bench') ||
                                sectionMatch[1].includes('hand size'));

        if (hasConcreteTodo) {
            console.log('✅ Test 2.3: SPEC.md has concrete research TODO with context');
            passed++;
            results.push({ test: '2.3', status: 'PASS' });
        } else {
            console.log('❌ Test 2.3: SPEC.md TODO markers lack concrete context');
            failed++;
            results.push({ test: '2.3', status: 'FAIL', reason: 'Missing concrete TODO context' });
        }
    } catch (e) {
        console.log('❌ Test 2.3:', e.message);
        failed++;
        results.push({ test: '2.3', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 3: Documentation Matches Implementation
    // ========================================================================
    console.log('\n🔄 Category 3: Documentation Matches Implementation');
    console.log('-'.repeat(60));

    // Test 3.1: Empty state turn is 0 as documented
    try {
        const emptyState = gamestateModule.createInitialState();
        const docSaysTurn0 = specContent.includes('turn: 0') ||
                            specContent.includes('`turn`: `0`');

        if (docSaysTurn0 && emptyState.turn === 0) {
            console.log('✅ Test 3.1: Empty state turn is 0 as documented');
            passed++;
            results.push({ test: '3.1', status: 'PASS' });
        } else {
            console.log('❌ Test 3.1: Empty state turn documentation mismatch');
            console.log(`   Implementation: turn=${emptyState.turn}`);
            console.log(`   Document says turn 0: ${docSaysTurn0}`);
            failed++;
            results.push({ test: '3.1', status: 'FAIL', reason: 'Turn value mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.1:', e.message);
        failed++;
        results.push({ test: '3.1', status: 'FAIL', reason: e.message });
    }

    // Test 3.2: Empty state has null active Pokemon as documented
    try {
        const emptyState = gamestateModule.createInitialState();
        const docSaysNullActive = specContent.includes('active Pokemon') &&
                                 specContent.includes('null');

        if (docSaysNullActive &&
            emptyState.player1.active === null &&
            emptyState.player2.active === null) {
            console.log('✅ Test 3.2: Empty state has null active Pokemon as documented');
            passed++;
            results.push({ test: '3.2', status: 'PASS' });
        } else {
            console.log('❌ Test 3.2: Empty state active Pokemon documentation mismatch');
            console.log(`   P1 active: ${emptyState.player1.active}`);
            console.log(`   P2 active: ${emptyState.player2.active}`);
            failed++;
            results.push({ test: '3.2', status: 'FAIL', reason: 'Active mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.2:', e.message);
        failed++;
        results.push({ test: '3.2', status: 'FAIL', reason: e.message });
    }

    // Test 3.3: Empty state has empty bench as documented
    try {
        const emptyState = gamestateModule.createInitialState();
        const docSaysEmptyBench = specContent.includes('Empty bench') ||
                                 specContent.includes('0/3');

        if (docSaysEmptyBench &&
            emptyState.player1.bench.length === 0 &&
            emptyState.player2.bench.length === 0) {
            console.log('✅ Test 3.3: Empty state has empty bench as documented');
            passed++;
            results.push({ test: '3.3', status: 'PASS' });
        } else {
            console.log('❌ Test 3.3: Empty state bench documentation mismatch');
            console.log(`   P1 bench: ${emptyState.player1.bench.length}`);
            console.log(`   P2 bench: ${emptyState.player2.bench.length}`);
            failed++;
            results.push({ test: '3.3', status: 'FAIL', reason: 'Bench mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.3:', e.message);
        failed++;
        results.push({ test: '3.3', status: 'FAIL', reason: e.message });
    }

    // Test 3.4: Empty state has empty hand/deck/discard as documented
    try {
        const emptyState = gamestateModule.createInitialState();
        const docSaysEmpty = specContent.includes('Empty hand') ||
                            specContent.includes('Empty deck') ||
                            specContent.includes('0 cards');

        const allEmpty = emptyState.player1.hand.length === 0 &&
                       emptyState.player1.deck.length === 0 &&
                       emptyState.player1.discard.length === 0 &&
                       emptyState.player2.hand.length === 0 &&
                       emptyState.player2.deck.length === 0 &&
                       emptyState.player2.discard.length === 0;

        if (docSaysEmpty && allEmpty) {
            console.log('✅ Test 3.4: Empty state has empty hand/deck/discard as documented');
            passed++;
            results.push({ test: '3.4', status: 'PASS' });
        } else {
            console.log('❌ Test 3.4: Empty state hand/deck/discard documentation mismatch');
            failed++;
            results.push({ test: '3.4', status: 'FAIL', reason: 'Cards mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.4:', e.message);
        failed++;
        results.push({ test: '3.4', status: 'FAIL', reason: e.message });
    }

    // Test 3.5: Empty state has no configured energy types as documented
    try {
        const emptyState = gamestateModule.createInitialState();
        const docSaysNoEnergy = specContent.toLowerCase().includes('no configured types') ||
                              specContent.toLowerCase().includes('empty array') ||
                              specContent.includes('`configuredTypes`: Empty array `[]`');

        const noEnergy = emptyState.player1.energyZone.configuredTypes.length === 0 &&
                       emptyState.player2.energyZone.configuredTypes.length === 0;

        if (docSaysNoEnergy && noEnergy) {
            console.log('✅ Test 3.5: Empty state has no configured energy types as documented');
            passed++;
            results.push({ test: '3.5', status: 'PASS' });
        } else {
            console.log('❌ Test 3.5: Empty state energy types documentation mismatch');
            console.log(`   P1 configured types: ${emptyState.player1.energyZone.configuredTypes.length}`);
            console.log(`   P2 configured types: ${emptyState.player2.energyZone.configuredTypes.length}`);
            console.log(`   Doc says no energy: ${docSaysNoEnergy}`);
            failed++;
            results.push({ test: '3.5', status: 'FAIL', reason: 'Energy mismatch' });
        }
    } catch (e) {
        console.log('❌ Test 3.5:', e.message);
        failed++;
        results.push({ test: '3.5', status: 'FAIL', reason: e.message });
    }

    // Test 3.6: SPEC.md documents that full-board only happens on scenario load
    try {
        const docSaysScenarioOnly = specContent.includes('FULL-BOARD POPULATION ONLY OCCURS') ||
                                   (specContent.includes('scenario load') &&
                                    specContent.includes('completely replaces'));

        if (docSaysScenarioOnly) {
            console.log('✅ Test 3.6: SPEC.md documents full-board only on scenario load');
            passed++;
            results.push({ test: '3.6', status: 'PASS' });
        } else {
            console.log('❌ Test 3.6: SPEC.md missing full-board population clarification');
            failed++;
            results.push({ test: '3.6', status: 'FAIL', reason: 'Missing clarification' });
        }
    } catch (e) {
        console.log('❌ Test 3.6:', e.message);
        failed++;
        results.push({ test: '3.6', status: 'FAIL', reason: e.message });
    }

    // Test 3.7: SPEC.md documents that New Game places cards based on deck presets
    try {
        const docSaysNewGamePopulates = specContent.includes('New Game from Deck Presets') &&
                                      specContent.includes('shuffled') &&
                                      specContent.includes('Basic Pokemon');

        if (docSaysNewGamePopulates) {
            console.log('✅ Test 3.7: SPEC.md documents New Game populates from deck presets');
            passed++;
            results.push({ test: '3.7', status: 'PASS' });
        } else {
            console.log('❌ Test 3.7: SPEC.md missing New Game population details');
            failed++;
            results.push({ test: '3.7', status: 'FAIL', reason: 'Missing details' });
        }
    } catch (e) {
        console.log('❌ Test 3.7:', e.message);
        failed++;
        results.push({ test: '3.7', status: 'FAIL', reason: e.message });
    }

    // ========================================================================
    // TEST CATEGORY 4: SPEC.md Quality
    // ========================================================================
    console.log('\n✓ Category 4: SPEC.md Quality');
    console.log('-'.repeat(60));

    // Test 4.1: Start-of-Game Setup section is comprehensive (has explicit rules)
    try {
        const sectionMatch = specContent.match(/### Start-of-[Gg]ame\s+[Ss]etup([\s\S]*?)(?=\n### [A-Z]|\n##[^\#]|$)/);
        const hasExplicitRules = sectionMatch &&
                               sectionMatch[1].includes('Explicit') &&
                               sectionMatch[1].includes('Rules:');

        if (hasExplicitRules) {
            console.log('✅ Test 4.1: Start-of-Game Setup section has explicit rules');
            passed++;
            results.push({ test: '4.1', status: 'PASS' });
        } else {
            console.log('❌ Test 4.1: Start-of-Game Setup section lacks explicit rules');
            failed++;
            results.push({ test: '4.1', status: 'FAIL', reason: 'Missing explicit rules' });
        }
    } catch (e) {
        console.log('❌ Test 4.1:', e.message);
        failed++;
        results.push({ test: '4.1', status: 'FAIL', reason: e.message });
    }

    // Test 4.2: Start-of-Game Setup section has implementation details
    try {
        const sectionMatch = specContent.match(/### Start-of-[Gg]ame\s+[Ss]etup([\s\S]*?)(?=\n### [A-Z]|\n##[^\#]|$)/);
        const hasImplementation = sectionMatch &&
                                  sectionMatch[1].includes('Called via:') &&
                                  sectionMatch[1].includes('.js');

        if (hasImplementation) {
            console.log('✅ Test 4.2: Start-of-Game Setup section has implementation details');
            passed++;
            results.push({ test: '4.2', status: 'PASS' });
        } else {
            console.log('❌ Test 4.2: Start-of-Game Setup section missing implementation details');
            failed++;
            results.push({ test: '4.2', status: 'FAIL', reason: 'Missing implementation' });
        }
    } catch (e) {
        console.log('❌ Test 4.2:', e.message);
        failed++;
        results.push({ test: '4.2', status: 'FAIL', reason: e.message });
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
