// Test T15: Action Log Panel - Node.js Automated Test
import { readFileSync } from 'fs';

console.log('=== Test T15: Action Log Panel ===\n');

// Read main.js and verify implementation
const mainJs = readFileSync('./js/main.js', 'utf-8');

let passCount = 0;
let failCount = 0;

function assert(testName, condition, details = '') {
    if (condition) {
        console.log(`✅ ${testName}: PASS${details ? ' - ' + details : ''}`);
        passCount++;
    } else {
        console.log(`❌ ${testName}: FAIL${details ? ' - ' + details : ''}`);
        failCount++;
    }
}

// Test 1: renderLog function exists
console.log('--- renderLog Function ---');
assert('Test 1.1: renderLog function defined', mainJs.includes('function renderLog(log)'));
assert('Test 1.2: Group by turn logic present', mainJs.includes('groupedByTurn'));
assert('Test 1.3: Sorted turns present', mainJs.includes('.sort((a, b) => a - b)'));

// Test 2: Color coding
console.log('\n--- Color Coding ---');
assert('Test 2.1: log-action-damage class', mainJs.includes('log-action-damage'));
assert('Test 2.2: log-action-healing class', mainJs.includes('log-action-healing'));
assert('Test 2.3: log-action-status class', mainJs.includes('log-action-status'));
assert('Test 2.4: log-action-card class', mainJs.includes('log-action-card'));
assert('Test 2.5: log-action-ability class', mainJs.includes('log-action-ability'));
assert('Test 2.6: Damage actions mapped', mainJs.includes("['damage', 'attack', 'ko'].includes(entry.action)"));
assert('Test 2.7: Status actions mapped', mainJs.includes("['checkup', 'status', 'poison', 'burn', 'sleep', 'paralysis'].includes(entry.action)"));
assert('Test 2.8: Card actions mapped', mainJs.includes("['draw', 'drawCard', 'evolve', 'playCard', 'attachEnergy'].includes(entry.action)"));

// Test 3: Turn grouping
console.log('\n--- Turn Grouping ---');
assert('Test 3.1: log-turn-header class', mainJs.includes('log-turn-header'));
assert('Test 3.2: Turn header generation', mainJs.includes('Turn ${turn}'));

// Test 4: Export functionality
console.log('\n--- Export Functionality ---');
assert('Test 4.1: exportLog function defined', mainJs.includes('function exportLog()'));
assert('Test 4.2: Export text file generation', mainJs.includes('Blob([content]'));
assert('Test 4.3: Export file naming', mainJs.includes('action-log-turn-'));
assert('Test 4.4: Export format (text/plain)', mainJs.includes("'text/plain'"));

// Test 5: Auto-scroll
console.log('\n--- Auto-scroll ---');
assert('Test 5.1: scrollHeight assignment', mainJs.includes('el.scrollTop = el.scrollHeight'));

// Test 6: Event listener
console.log('\n--- Event Listener ---');
assert('Test 6.1: export-log-btn event listener', mainJs.includes('#export-log-btn') && mainJs.includes('addEventListener(\'click\', exportLog)'));

// Test 7: CSS classes exist
console.log('\n--- CSS Classes ---');
const logCss = readFileSync('./css/log.css', 'utf-8');
assert('Test 7.1: log-action-damage CSS', logCss.includes('.log-action-damage'));
assert('Test 7.2: log-action-healing CSS', logCss.includes('.log-action-healing'));
assert('Test 7.3: log-action-status CSS', logCss.includes('.log-action-status'));
assert('Test 7.4: log-action-card CSS', logCss.includes('.log-action-card'));
assert('Test 7.5: log-action-ability CSS', logCss.includes('.log-action-ability'));
assert('Test 7.6: log-turn-header CSS', logCss.includes('.log-turn-header'));

// Test 8: HTML button exists
console.log('\n--- HTML Elements ---');
const indexHtml = readFileSync('./index.html', 'utf-8');
assert('Test 8.1: export-log-btn button exists', indexHtml.includes('id="export-log-btn"'));

// Summary
console.log('\n=== Summary ===');
console.log(`Total tests: ${passCount + failCount}`);
console.log(`Passed: ${passCount} ✅`);
console.log(`Failed: ${failCount} ❌`);
console.log(`Success rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

if (failCount > 0) {
    process.exit(1);
}
