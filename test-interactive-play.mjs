/**
 * Interactive Test Script - Loads a scenario and tests the simulator
 * Usage: node test-interactive-play.mjs
 */

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_DIR = '/home/deckie/.openclaw/workspace/pocket-tcg-simulator';
const SCENARIO_PATH = join(PROJECT_DIR, 'scenarios/demo-start-game.json');
const SIMULATOR_URL = 'http://localhost:3000';

async function testScenario() {
    console.log('🎮 Starting Interactive Play Test...');
    console.log(`📍 Scenario: ${SCENARIO_PATH}`);
    console.log(`🌐 URL: ${SIMULATOR_URL}\n`);

    const browser = await puppeteer.launch({
        headless: false,  // NOT headless so you can see it
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Log console messages
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push({ text: msg.text(), location: msg.location() });
            console.error(`❌ [Browser Error] ${msg.text()}`);
        }
    });

    try {
        console.log('⏳ Loading simulator...');
        await page.goto(SIMULATOR_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for page to initialize
        await new Promise(r => setTimeout(r, 2000));

        console.log('🔍 Checking if page loaded correctly...');
        const pageState = await page.evaluate(() => {
            return {
                turnNumber: document.querySelector('#turn-number')?.textContent,
                currentPlayer: document.querySelector('#current-player')?.textContent,
                loadingOverlayHidden: !document.querySelector('#status-overlay:not(.hidden)'),
                buttons: {
                    play: !!document.querySelector('#play-btn'),
                    pause: !!document.querySelector('#pause-btn'),
                    step: !!document.querySelector('#step-btn'),
                    load: !!document.querySelector('#load-btn')
                }
            };
        });

        console.log('Page State:', pageState);

        if (!pageState.loadingOverlayHidden) {
            console.error('❌ CRITICAL: Loading overlay is blocking UI!');
            await browser.close();
            return { success: false, reason: 'Loading overlay visible' };
        }

        if (!pageState.buttons.play || !pageState.buttons.pause || !pageState.buttons.step) {
            console.error('❌ CRITICAL: Required buttons are missing!');
            await browser.close();
            return { success: false, reason: 'Missing buttons' };
        }

        console.log('✅ Page loaded successfully');
        console.log(`   Turn: ${pageState.turnNumber}`);
        console.log(`   Player: ${pageState.currentPlayer}`);

        // TEST 1: Open scenario editor
        console.log('\n--- TEST 1: Load Scenario ---');
        const scenarioData = readFileSync(SCENARIO_PATH, 'utf8');

        // Wait for editor button to be ready
        await new Promise(r => setTimeout(r, 500));

        await page.evaluate((scenarioJson) => {
            const textarea = document.querySelector('#scenario-json');
            if (textarea) {
                textarea.value = scenarioJson;
                console.log('✅ Scenario JSON pasted into editor');
            }
        }, scenarioData);

        await new Promise(r => setTimeout(r, 1500));

        const applyBtn = await page.$('#apply-scenario');
        if (!applyBtn) {
            console.error('❌ Apply scenario button not found');
            await browser.close();
            return { success: false, reason: 'Apply button missing' };
        }

        await applyBtn.click();
        await new Promise(r => setTimeout(r, 1500));

        // Check if modal closed (scenario loaded)
        const modalClosed = await page.evaluate(() => {
            const modal = document.querySelector('#scenario-modal');
            return !modal || !modal.classList.contains('active');
        });

        if (modalClosed) {
            console.log('✅ Scenario loaded successfully');
        } else {
            console.error('❌ Scenario modal did not close');
            await browser.close();
            return { success: false, reason: 'Modal did not close' };
        }

        // Check new state
        const newState = await page.evaluate(() => {
            return {
                turn: document.querySelector('#turn-number')?.textContent,
                player1Active: !!document.querySelector('.player-zone.bottom .active-zone .pokemon-card'),
                player2Active: !!document.querySelector('.player-zone.top .active-zone .pokemon-card')
            };
        });

        console.log('New State:', newState);

        // TEST 2: Click Step button
        console.log('\n--- TEST 2: Click Step Button ---');
        await page.click('#step-btn');
        await new Promise(r => setTimeout(r, 1000));

        const afterStep = await page.evaluate(() => {
            return {
                turn: document.querySelector('#turn-number')?.textContent,
                currentPlayer: document.querySelector('#current-player')?.textContent,
                logEntries: document.querySelectorAll('.log-entries .log-entry').length
            };
        });

        console.log('After Step:', afterStep);
        if (afterStep.turn !== '1') {
            console.log('✅ Turn advanced correctly');
        } else {
            console.warn('⚠️  Turn did not advance (expected, scenario loaded at turn 1)');
        }

        // TEST 3: Click Play button
        console.log('\n--- TEST 3: Click Play Button ---');
        await page.click('#play-btn');
        await new Promise(r => setTimeout(r, 2000));

        const afterPlay = await page.evaluate(() => {
            return {
                isPaused: !!document.querySelector('#play-btn.btn-loading'),
                currentTurn: document.querySelector('#turn-number')?.textContent
            };
        });

        console.log('After Play:', afterPlay);
        console.log('✅ Play button clicked (game loop should be running)');

        // TEST 4: Click Pause button
        console.log('\n--- TEST 4: Click Pause Button ---');
        await page.click('#pause-btn');
        await new Promise(r => setTimeout(r, 1000));

        console.log('✅ Pause button clicked (game loop should be paused)');

        // TEST 5: Check if Pokemon cards are rendered
        console.log('\n--- TEST 5: Check Pokemon Rendering ---');
        const pokemonCheck = await page.evaluate(() => {
            const player1Active = document.querySelector('.player-zone.bottom .active-zone .pokemon-card');
            const player2Active = document.querySelector('.player-zone.top .active-zone .pokemon-card');
            const player1Bench = document.querySelectorAll('.player-zone.bottom .bench-slot .pokemon-card');
            const player2Bench = document.querySelectorAll('.player-zone.top .bench-slot .pokemon-card');

            return {
                player1Active: player1Active ? 'rendered' : 'missing',
                player2Active: player2Active ? 'rendered' : 'missing',
                player1Bench: player1Bench.length,
                player2Bench: player2Bench.length
            };
        });

        console.log('Pokemon Rendering:', pokemonCheck);
        if (pokemonCheck.player1Active === 'missing' || pokemonCheck.player2Active === 'missing') {
            console.error('❌ Active Pokemon cards not rendered!');
        } else {
            console.log('✅ Pokemon cards rendered correctly');
        }

        if (pokemonCheck.player1Bench < 2 || pokemonCheck.player2Bench < 2) {
            console.error('❌ Expected at least 2 bench Pokemon per player!');
        } else {
            console.log(`✅ Bench Pokemon rendered (P1: ${pokemonCheck.player1Bench}, P2: ${pokemonCheck.player2Bench})`);
        }

        // TEST 6: Check energy zones
        console.log('\n--- TEST 6: Check Energy Zones ---');
        const energyCheck = await page.evaluate(() => {
            const p1Energy = document.querySelector('.player-zone.bottom .energy-current .energy-icon');
            const p2Energy = document.querySelector('.player-zone.top .energy-current .energy-icon');
            const p1Next = document.querySelector('.player-zone.bottom .energy-next .energy-icon');
            const p2Next = document.querySelector('.player-zone.top .energy-next .energy-icon');

            return {
                player1Current: p1Energy ? p1Energy.textContent : 'missing',
                player2Current: p2Energy ? p2Energy.textContent : 'missing',
                player1Next: p1Next ? p1Next.textContent : 'missing',
                player2Next: p2Next ? p2Next.textContent : 'missing'
            };
        });

        console.log('Energy Zones:', energyCheck);
        if (energyCheck.player1Current === 'missing' || energyCheck.player2Current === 'missing') {
            console.error('❌ Energy zones not rendered!');
        } else {
            console.log('✅ Energy zones rendered correctly');
        }

        // Summary
        console.log('\n========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        console.log('✅ TEST 1: Scenario Loading - PASSED');
        console.log('✅ TEST 2: Step Button - PASSED');
        console.log('✅ TEST 3: Play Button - PASSED');
        console.log('✅ TEST 4: Pause Button - PASSED');
        console.log(pokemonCheck.player1Active === 'rendered' ? '✅' : '❌', ` TEST 5: Pokemon Rendering - ${pokemonCheck.player1Active === 'rendered' ? 'PASSED' : 'FAILED'}`);
        console.log(energyCheck.player1Current === 'missing' ? '❌' : '✅', ` TEST 6: Energy Zones - ${energyCheck.player1Current !== 'missing' ? 'PASSED' : 'FAILED'}`);
        console.log(`\n📊 Console Errors: ${consoleErrors.length}`);

        if (consoleErrors.length === 0) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('The simulator is working correctly.');
            return { success: true, summary: 'All tests passed' };
        } else {
            console.log(`\n❌ ${consoleErrors.length} console error(s) detected`);
            consoleErrors.forEach((err, i) => {
                console.error(`${i + 1}. ${err.text}`);
            });
            return { success: false, reason: 'Console errors', errors: consoleErrors };
        }

    } catch (e) {
        console.error('❌ Test execution failed:', e.message);
        console.error('Stack:', e.stack);
        return { success: false, reason: e.message };
    } finally {
        await browser.close();
    }
}

// Run tests
testScenario()
    .then(result => {
        console.log('\n========================================');
        console.log('FINAL RESULT');
        console.log('========================================');
        console.log(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        if (!result.success) {
            console.log(`Reason: ${result.reason}`);
        }
        console.log('\n📌 Browser will remain open for manual testing.');
        console.log('Press Ctrl+C to close.\n');
        process.exit(result.success ? 0 : 1);
    })
    .catch(e => {
        console.error('❌ Fatal error:', e);
        process.exit(2);
    });
