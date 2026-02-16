#!/usr/bin/env node

/**
 * Stage 1 Controls Panel Test
 *
 * Tests the collapsible right-side controls panel implementation.
 * This is a smoke test that verifies:
 * 1. HTML structure is correct
 * 2. CSS classes exist
 * 3. Toggle functionality works
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;
let testResults = [];

function assert(condition, testName, details = null) {
    if (condition) {
        testsPassed++;
        testResults.push({ name: testName, passed: true, details });
        console.log(`✓ ${testName}`);
        if (details) console.log(`  Details: ${JSON.stringify(details)}`);
    } else {
        testsFailed++;
        testResults.push({ name: testName, passed: false, details });
        console.log(`✗ ${testName}`);
        if (details) console.log(`  Details: ${JSON.stringify(details)}`);
    }
}

function testHTML() {
    console.log('\n=== Testing HTML Structure ===');

    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

    // Test 1: Controls panel has correct class
    assert(
        html.includes('class="controls-panel"'),
        'Controls panel has "controls-panel" class'
    );

    // Test 2: Toggle button exists
    assert(
        html.includes('id="controls-toggle"'),
        'Toggle button with id="controls-toggle" exists'
    );

    // Test 3: Controls content wrapper exists
    assert(
        html.includes('class="controls-content"'),
        'Controls content wrapper with "controls-content" class exists'
    );

    // Test 4: All control buttons exist
    const requiredButtons = [
        'play-btn',
        'pause-btn',
        'step-btn',
        'new-game-btn',
        'load-btn',
        'save-btn',
        'edit-btn',
        'coins-btn',
        'lang-btn'
    ];
    const missingButtons = requiredButtons.filter(id => !html.includes(`id="${id}"`));
    assert(
        missingButtons.length === 0,
        'All 9 control buttons exist',
        { requiredButtons, missingButtons }
    );

    // Test 5: Speed select exists
    assert(
        html.includes('id="speed-select"'),
        'Speed select with id="speed-select" exists'
    );

    // Test 6: Controls sections exist
    assert(
        html.includes('class="controls-section"'),
        'Controls sections with "controls-section" class exist'
    );

    // Test 7: Section titles exist
    assert(
        html.includes('class="controls-section-title"'),
        'Control section titles with "controls-section-title" class exist'
    );

    // Test 8: Toggle button has aria-label
    assert(
        html.includes('aria-label="Toggle controls panel"'),
        'Toggle button has accessibility aria-label'
    );
}

function testCSS() {
    console.log('\n=== Testing CSS Styles ===');

    const battlefieldCSS = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');
    const dialogsCSS = readFileSync(join(__dirname, 'css/dialogs.css'), 'utf-8');

    // Test 9: App grid layout updated
    assert(
        battlefieldCSS.includes('grid-template-rows: 1fr'),
        'App grid layout updated to single row (1fr)'
    );

    // Test 10: Controls panel styles exist
    assert(
        dialogsCSS.includes('.controls-panel'),
        'Controls panel CSS styles defined'
    );

    // Test 11: Collapsed state styles exist
    assert(
        dialogsCSS.includes('.controls-panel.collapsed'),
        'Collapsed state CSS styles defined'
    );

    // Test 12: Toggle button styles exist
    assert(
        dialogsCSS.includes('.controls-toggle-btn'),
        'Toggle button CSS styles defined'
    );

    // Test 13: Controls content styles exist
    assert(
        dialogsCSS.includes('.controls-content'),
        'Controls content CSS styles defined'
    );

    // Test 14: Transition effects exist
    assert(
        dialogsCSS.includes('transition') && dialogsCSS.includes('0.3s ease'),
        'Smooth transition effects (0.3s ease) defined'
    );

    // Test 15: Responsive breakpoint for 1024px exists
    assert(
        dialogsCSS.includes('@media (max-width: 1024px)'),
        'Responsive breakpoint for 1024px defined'
    );

    // Test 16: Responsive breakpoint for 768px exists
    assert(
        dialogsCSS.includes('@media (max-width: 768px)'),
        'Responsive breakpoint for 768px defined'
    );

    // Test 17: Responsive breakpoint for 480px exists
    assert(
        dialogsCSS.includes('@media (max-width: 480px)'),
        'Responsive breakpoint for 480px defined'
    );

    // Test 18: Collapsed width defined
    assert(
        dialogsCSS.includes('.controls-panel.collapsed') && dialogsCSS.includes('width: 40px'),
        'Collapsed panel width set to 40px'
    );

    // Test 19: Expanded width defined
    assert(
        dialogsCSS.includes('width: 280px'),
        'Expanded panel width set to 280px'
    );
}

function testJavaScript() {
    console.log('\n=== Testing JavaScript Functionality ===');

    const mainJS = readFileSync(join(__dirname, 'js/main.js'), 'utf-8');

    // Test 20: Controls toggle event listener exists
    assert(
        mainJS.includes('#controls-toggle') && mainJS.includes('addEventListener'),
        'Controls toggle event listener is set up'
    );

    // Test 21: Toggle class logic exists
    assert(
        mainJS.includes('classList.toggle') && mainJS.includes('collapsed'),
        'Toggle class logic for collapsed state exists'
    );

    // Test 22: LocalStorage persistence exists
    assert(
        mainJS.includes('localStorage') && mainJS.includes('controlsPanelCollapsed'),
        'LocalStorage persistence for panel state exists'
    );

    // Test 23: State restoration on load exists
    assert(
        mainJS.includes('localStorage.getItem') && mainJS.includes('controlsPanelCollapsed'),
        'Panel state restoration from localStorage exists'
    );
}

function testAccessibility() {
    console.log('\n=== Testing Accessibility ===');

    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

    // Test 24: Toggle button has aria-label
    assert(
        html.includes('aria-label='),
        'Toggle button has aria-label for accessibility'
    );

    // Test 25: Toggle button uses semantic element
    assert(
        html.includes('<button') && html.includes('id="controls-toggle"'),
        'Toggle button is a semantic button element'
    );
}

function testBackwardCompatibility() {
    console.log('\n=== Testing Backward Compatibility ===');

    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

    // Test 26: All original button IDs preserved
    const originalIds = [
        'play-btn',
        'pause-btn',
        'step-btn',
        'speed-select',
        'new-game-btn',
        'load-btn',
        'save-btn',
        'edit-btn',
        'coins-btn',
        'lang-btn'
    ];
    const allPresent = originalIds.every(id => html.includes(`id="${id}"`));
    assert(
        allPresent,
        'All original button IDs preserved for backward compatibility',
        { originalIds, allPresent }
    );

    // Test 27: Data-i18n attributes preserved
    assert(
        html.includes('data-i18n="ui.play"') &&
        html.includes('data-i18n="ui.pause"') &&
        html.includes('data-i18n="ui.step"'),
        'Internationalization data attributes preserved'
    );
}

// Run all tests
console.log('Stage 1 Controls Panel Test Suite');
console.log('==================================');

try {
    testHTML();
    testCSS();
    testJavaScript();
    testAccessibility();
    testBackwardCompatibility();

    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);

    if (testsFailed === 0) {
        console.log('\n✓ All tests passed!');
        process.exit(0);
    } else {
        console.log('\n✗ Some tests failed.');
        process.exit(1);
    }
} catch (error) {
    console.error('\n✗ Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
}
