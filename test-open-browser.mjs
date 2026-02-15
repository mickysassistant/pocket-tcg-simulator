/**
 * Simple Browser Test - Opens the simulator for manual testing
 * Usage: node test-open-browser.mjs
 */

import puppeteer from 'puppeteer';

const SIMULATOR_URL = 'http://localhost:3000';

async function openBrowser() {
    console.log('🎮 Opening simulator browser...');
    console.log(`🌐 URL: ${SIMULATOR_URL}\n`);

    const browser = await puppeteer.launch({
        headless: false,  // NOT headless so you can see it
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log('⏳ Loading page...');
        await page.goto(SIMULATOR_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log('✅ Page loaded!');
        console.log('\n========================================');
        console.log('READY FOR TESTING');
        console.log('========================================');
        console.log('\n📌 Browser will remain open for manual testing.');
        console.log('📌 Press Ctrl+C in this terminal to close.\n');
        console.log('\n📝 Suggested tests:');
        console.log('   1. Click "Load Scenario" button');
        console.log('   2. Paste the scenario JSON from scenarios/demo-start-game.json');
        console.log('   3. Click "Apply" to load it');
        console.log('   4. Click "Step" to advance turn');
        console.log('   5. Click "Play" to start game loop');
        console.log('   6. Try dragging cards to Active/Bench');
        console.log('\n');

        // Keep browser open until user presses Ctrl+C
        await new Promise(() => {}); // Never resolves

    } catch (e) {
        console.error('❌ Failed to open browser:', e.message);
        console.error('Stack:', e.stack);
        await browser.close();
        process.exit(1);
    }
}

// Run
openBrowser().catch(e => {
    console.error('❌ Fatal error:', e);
    process.exit(2);
});
