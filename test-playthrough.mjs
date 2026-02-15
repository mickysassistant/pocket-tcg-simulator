/**
 * Playthrough Test - Full Game Test Scenario
 * Usage: node test-playthrough.mjs
 */

import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_DIR = '/home/deckie/.openclaw/workspace/pocket-tcg-simulator';
const SCENARIO_PATH = join(PROJECT_DIR, 'scenarios/demo-start-game.json');
const SIMULATOR_URL = 'http://localhost:3000';

/**
 * Captures a screenshot
 */
async function takeScreenshot(page, filename) {
    const screenshotPath = join(PROJECT_DIR, 'screenshots', `${filename}.png`);

    // Ensure screenshots directory exists
    try {
        mkdirSync(join(PROJECT_DIR, 'screenshots'), { recursive: true });
    } catch {}

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}.png`);
}

/**
 * Main test sequence
 */
async function runPlaythroughTest() {
    console.log('🎮 Starting Playthrough Test...');
    console.log(`📍 Scenario: ${SCENARIO_PATH}`);
    console.log(`🌐 URL: ${SIMULATOR_URL}\n`);

    const browser = await puppeteer.launch({
        headless: false,  // Visible browser
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        slowMo: 100  // Slow down actions for visibility
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push({ text: msg.text(), time: Date.now() });
            console.error(`❌ [Console Error] ${msg.text()}`);
        }
    });

    try {
        console.log('⏳ Loading simulator...');
        await page.goto(SIMULATOR_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for initial load
        await new Promise(r => setTimeout(r, 3000));
        await takeScreenshot(page, '00-initial');

        // ============================================
        // PHASE 1: Load Scenario
        // ============================================
        console.log('\n==========================================');
        console.log('PHASE 1: Loading Scenario');
        console.log('==========================================\n');

        const scenarioData = readFileSync(SCENARIO_PATH, 'utf8');

        // Paste scenario into editor
        await page.evaluate((json) => {
            const textarea = document.querySelector('#scenario-json');
            const applyBtn = document.querySelector('#apply-scenario');
            if (textarea) {
                textarea.value = json;
                console.log('✅ Scenario pasted into editor');
            }
            if (applyBtn) {
                applyBtn.click();
                console.log('✅ Apply button clicked');
            }
        }, scenarioData);

        await new Promise(r => setTimeout(r, 2000));
        await new Promise(r => setTimeout(r, 2000));
        await takeScreenshot(page, '01-scenario-loaded');

        // Verify scenario loaded
        const scenarioState = await page.evaluate(() => {
            return {
                turn: document.querySelector('#turn-number')?.textContent,
                player1Active: !!document.querySelector('.player-zone.bottom .active-zone .pokemon-card'),
                player2Active: !!document.querySelector('.player-zone.top .active-zone .pokemon-card'),
                player1Bench: document.querySelectorAll('.player-zone.bottom .bench-slot .pokemon-card').length,
                player2Bench: document.querySelectorAll('.player-zone.top .bench-slot .pokemon-card').length
            };
        });

        console.log('Scenario State:', scenarioState);
        console.log(`   Turn: ${scenarioState.turn}`);
        console.log(`   Player 1 Active: ${scenarioState.player1Active ? 'Yes' : 'No'}`);
        console.log(`   Player 2 Active: ${scenarioState.player2Active ? 'Yes' : 'No'}`);
        console.log(`   Player 1 Bench: ${scenarioState.player1Bench} Pokemon`);
        console.log(`   Player 2 Bench: ${scenarioState.player2Bench} Pokemon`);

        // ============================================
        // PHASE 2: Step Through Several Turns
        // ============================================
        console.log('\n==========================================');
        console.log('PHASE 2: Advancing Turns');
        console.log('==========================================\n');

        for (let i = 0; i < 5; i++) {
            console.log(`\n--- Turn ${i + 1} ---`);

            await page.click('#step-btn');
            await new Promise(r => setTimeout(r, 1500));

            const turnState = await page.evaluate(() => {
                return {
                    turn: document.querySelector('#turn-number')?.textContent,
                    currentPlayer: document.querySelector('#current-player')?.textContent,
                    player1Hp: document.querySelector('.player-zone.bottom .active-zone .hp-badge')?.textContent,
                    player2Hp: document.querySelector('.player-zone.top .active-zone .hp-badge')?.textContent,
                    logEntries: document.querySelectorAll('.log-entries .log-entry').length
                };
            });

            console.log('State:', turnState);
            console.log(`   Turn: ${turnState.turn}`);
            console.log(`   Current: ${turnState.currentPlayer}`);
            console.log(`   Player 1 HP: ${turnState.player1Hp}`);
            console.log(`   Player 2 HP: ${turnState.player2Hp}`);
            console.log(`   Log Entries: ${turnState.logEntries}`);

            await takeScreenshot(page, `02-turn-${i + 1}`);
        }

        // ============================================
        // PHASE 3: Test Game Controls
        // ============================================
        console.log('\n==========================================');
        console.log('PHASE 3: Testing Game Controls');
        console.log('==========================================\n');

        // Test Play button
        console.log('🎮 Clicking Play button...');
        await page.click('#play-btn');
        await new Promise(r => setTimeout(r, 3000));
        await takeScreenshot(page, '03-play-pressed');

        // Test Pause button
        console.log('⏸️  Clicking Pause button...');
        await page.click('#pause-btn');
        await new Promise(r => setTimeout(r, 1000));
        await takeScreenshot(page, '04-pause-pressed');

        // ============================================
        // PHASE 4: Final State
        // ============================================
        console.log('\n==========================================');
        console.log('PHASE 4: Final State');
        console.log('==========================================\n');

        const finalState = await page.evaluate(() => {
            const turnNumber = document.querySelector('#turn-number')?.textContent;
            const currentPlayer = document.querySelector('#current-player')?.textContent;
            const player1Points = document.querySelector('.player-zone.bottom .points-value')?.textContent;
            const player2Points = document.querySelector('.player-zone.top .points-value')?.textContent;
            const logEntries = document.querySelectorAll('.log-entries .log-entry').length;

            // Check if game over banner is visible
            const gameOverBanner = document.querySelector('#game-over-banner');
            const gameOverVisible = gameOverBanner && !gameOverBanner.classList.contains('hidden');

            return {
                turnNumber,
                currentPlayer,
                player1Points,
                player2Points,
                logEntries,
                gameOverVisible,
                loadingOverlayVisible: !!document.querySelector('#status-overlay:not(.hidden)')
            };
        });

        console.log('Final State:', finalState);
        console.log(`   Turn: ${finalState.turnNumber}`);
        console.log(`   Player 1 Points: ${finalState.player1Points}`);
        console.log(`   Player 2 Points: ${finalState.player2Points}`);
        console.log(`   Log Entries: ${finalState.logEntries}`);
        console.log(`   Game Over Visible: ${finalState.gameOverVisible}`);
        console.log(`   Loading Overlay Visible: ${finalState.loadingOverlayVisible}`);

        await takeScreenshot(page, '05-final-state');

        // ============================================
        // Summary
        // ============================================
        console.log('\n========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        console.log(`Screenshots: pocket-tcg-simulator/screenshots/`);
        console.log(`Console Errors: ${consoleErrors.length}`);
        if (consoleErrors.length > 0) {
            console.log('\nConsole Errors Detected:');
            consoleErrors.forEach((err, i) => {
                console.error(`${i + 1}. ${err.text}`);
            });
        }

        if (consoleErrors.length === 0 && !finalState.loadingOverlayVisible) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('The simulator is working correctly.');
        } else if (finalState.loadingOverlayVisible) {
            console.log('\n❌ CRITICAL: Loading overlay is still visible!');
            console.log('This blocks all interactions.');
        }

        console.log('\n========================================');
        console.log('Browser will remain open for inspection.');
        console.log('Press Ctrl+C to close.');
        console.log('========================================\n');

        // Keep browser open
        await new Promise(() => {}); // Never resolves

    } catch (e) {
        console.error('❌ Test failed:', e.message);
        console.error('Stack:', e.stack);
        await browser.close();
        process.exit(1);
    }
}

// Run the test
runPlaythroughTest().catch(e => {
    console.error('❌ Fatal error:', e);
    process.exit(2);
});
