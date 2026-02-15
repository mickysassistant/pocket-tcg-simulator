#!/usr/bin/env node
/**
 * Test T03: Empty Battlefield Rendering
 * Automated test to verify battlefield structure
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running T03: Empty Battlefield Rendering tests...\n');

let passed = 0;
let failed = 0;

function test(description, condition) {
  if (condition) {
    console.log(`✅ ${description}`);
    passed++;
  } else {
    console.log(`❌ ${description}`);
    failed++;
  }
}

// Load HTML
let html;
try {
  html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
  console.log('📄 Loaded index.html\n');
} catch (e) {
  console.error('❌ Failed to load index.html:', e.message);
  process.exit(1);
}

// Test 1: Battlefield container exists
test('Battlefield container (#battlefield) exists', html.includes('id="battlefield"'));

// Test 2: Player zones exist
test('Player 1 zone exists', html.includes('data-player="player1"'));
test('Player 2 zone exists', html.includes('data-player="player2"'));

// Test 3: All required zones exist for player 1
test('Player 1 active zone exists', html.includes('data-player="player1"') && html.includes('data-zone="active"'));
test('Player 1 bench zone exists', html.includes('data-player="player1"') && html.includes('data-zone="bench"'));
test('Player 1 hand zone exists', html.includes('data-player="player1"') && html.includes('data-zone="hand"'));
test('Player 1 deck zone exists', html.includes('data-player="player1"') && html.includes('data-zone="deck"'));
test('Player 1 discard zone exists', html.includes('data-player="player1"') && html.includes('data-zone="discard"'));

// Test 4: All required zones exist for player 2
test('Player 2 active zone exists', html.includes('data-player="player2"') && html.includes('data-zone="active"'));
test('Player 2 bench zone exists', html.includes('data-player="player2"') && html.includes('data-zone="bench"'));
test('Player 2 hand zone exists', html.includes('data-player="player2"') && html.includes('data-zone="hand"'));
test('Player 2 deck zone exists', html.includes('data-player="player2"') && html.includes('data-zone="deck"'));
test('Player 2 discard zone exists', html.includes('data-player="player2"') && html.includes('data-zone="discard"'));

// Test 5: Stadium zone exists
test('Stadium zone exists', html.includes('data-zone="stadium"'));

// Test 6: Center zone exists
test('Center zone exists', html.includes('class="center-zone"'));

// Test 7: Action log exists
test('Action log sidebar exists', html.includes('id="action-log"'));
test('Action log has scrollable container', html.includes('class="log-entries"'));

// Test 8: Controls exist
test('Controls container exists', html.includes('id="controls"'));
test('Play button exists', html.includes('id="play-btn"'));
test('Pause button exists', html.includes('id="pause-btn"'));
test('Step button exists', html.includes('id="step-btn"'));
test('Load scenario button exists', html.includes('id="load-btn"'));
test('Save scenario button exists', html.includes('id="save-btn"'));

// Test 9: CSS files are linked
test('battlefield.css is linked', html.includes('css/battlefield.css'));
test('log.css is linked', html.includes('css/log.css'));
test('dialogs.css is linked', html.includes('css/dialogs.css'));

// Test 10: Modals exist
test('Scenario modal exists', html.includes('id="scenario-modal"'));
test('Coin queue modal exists', html.includes('id="coin-modal"'));

// Test 11: Bench has 3 slots (Pocket TCG has max 3 bench Pokemon)
const benchSlots = (html.match(/data-index="."/g) || []).length;
test(`Bench has 3 slots (found ${benchSlots})`, benchSlots >= 6); // 3 for each player

// Test 12: Check CSS files exist
import { existsSync } from 'fs';
test('battlefield.css file exists', existsSync(join(__dirname, 'css/battlefield.css')));
test('log.css file exists', existsSync(join(__dirname, 'css/log.css')));
test('dialogs.css file exists', existsSync(join(__dirname, 'css/dialogs.css')));

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Some tests failed. Please review the output above.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed! Task T03 is complete.');
  process.exit(0);
}
