/**
 * T19c Tests - Empty State Placeholders
 *
 * Tests that empty state placeholders are properly configured in i18n files
 * and that the rendering logic produces correct placeholder HTML.
 *
 * Run: node test-t19c.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${message}`);
    } else {
        failed++;
        console.error(`  ❌ ${message}`);
    }
}

// ============================================================================
// Test 1: i18n keys exist in both languages
// ============================================================================

console.log('\n📋 Test Group 1: i18n keys for empty states');

const es = JSON.parse(readFileSync(join(__dirname, 'js/i18n/es.json'), 'utf-8'));
const en = JSON.parse(readFileSync(join(__dirname, 'js/i18n/en.json'), 'utf-8'));

// Required empty state keys
const requiredKeys = [
    { path: ['ui', 'noActions'], desc: 'Log empty state' },
    { path: ['ui', 'noActionsSimple'], desc: 'Log empty hint' },
    { path: ['ui', 'emptyHandHint'], desc: 'Hand empty hint' },
    { path: ['ui', 'emptyBenchHint'], desc: 'Bench empty hint' },
    { path: ['ui', 'emptyActiveHint'], desc: 'Active empty hint' },
    { path: ['ui', 'stadiumHint'], desc: 'Stadium empty hint' },
    { path: ['game', 'empty'], desc: 'Generic empty' },
    { path: ['game', 'emptyActive'], desc: 'Active empty text' },
    { path: ['game', 'emptyBench'], desc: 'Bench empty text' },
    { path: ['game', 'emptyHand'], desc: 'Hand empty text' },
];

function getNestedValue(obj, path) {
    let val = obj;
    for (const key of path) {
        if (val && typeof val === 'object') val = val[key];
        else return undefined;
    }
    return val;
}

for (const { path, desc } of requiredKeys) {
    const keyStr = path.join('.');
    const esVal = getNestedValue(es, path);
    const enVal = getNestedValue(en, path);
    assert(esVal !== undefined && esVal !== '', `ES has key "${keyStr}" (${desc})`);
    assert(enVal !== undefined && enVal !== '', `EN has key "${keyStr}" (${desc})`);
}

// ============================================================================
// Test 2: i18n values are non-trivial (not just the key name)
// ============================================================================

console.log('\n📋 Test Group 2: i18n values are meaningful');

assert(es.ui.noActions.length > 10, `ES noActions is descriptive: "${es.ui.noActions}"`);
assert(en.ui.noActions.length > 10, `EN noActions is descriptive: "${en.ui.noActions}"`);
assert(es.ui.emptyActiveHint.length > 5, `ES emptyActiveHint is descriptive`);
assert(en.ui.emptyActiveHint.length > 5, `EN emptyActiveHint is descriptive`);

// ============================================================================
// Test 3: CSS files contain empty state styles
// ============================================================================

console.log('\n📋 Test Group 3: CSS styles for empty states');

const battlefieldCss = readFileSync(join(__dirname, 'css/battlefield.css'), 'utf-8');
const logCss = readFileSync(join(__dirname, 'css/log.css'), 'utf-8');

assert(battlefieldCss.includes('.empty-slot'), 'battlefield.css has .empty-slot');
assert(battlefieldCss.includes('.empty-icon'), 'battlefield.css has .empty-icon');
assert(battlefieldCss.includes('.empty-text'), 'battlefield.css has .empty-text');
assert(battlefieldCss.includes('.empty-hint'), 'battlefield.css has .empty-hint');
assert(battlefieldCss.includes('.empty-slot.empty-active'), 'battlefield.css has .empty-slot.empty-active');
assert(battlefieldCss.includes('.empty-slot.empty-bench'), 'battlefield.css has .empty-slot.empty-bench');
assert(battlefieldCss.includes('.empty-slot.empty-hand'), 'battlefield.css has .empty-slot.empty-hand');
assert(battlefieldCss.includes('.stadium-placeholder'), 'battlefield.css has .stadium-placeholder');
assert(battlefieldCss.includes('.stadium-icon'), 'battlefield.css has .stadium-icon');
assert(battlefieldCss.includes('.stadium-hint'), 'battlefield.css has .stadium-hint');
assert(logCss.includes('.log-empty'), 'log.css has .log-empty');
assert(logCss.includes('.log-empty::before'), 'log.css has .log-empty::before (game icon)');

// ============================================================================
// Test 4: Bench slots have visual enhancement styles
// ============================================================================

console.log('\n📋 Test Group 4: Bench slot visual enhancements');

assert(battlefieldCss.includes('.bench-slot:hover'), 'bench-slot has hover effect');
assert(battlefieldCss.includes('.bench-slot.drop-target'), 'bench-slot has drop-target style');
assert(battlefieldCss.includes('.active-zone:hover'), 'active-zone has hover effect');
assert(battlefieldCss.includes('.active-zone.drop-target'), 'active-zone has drop-target style');
assert(battlefieldCss.includes('@keyframes pulse'), 'pulse animation defined');

// ============================================================================
// Test 5: main.js renders placeholders with hints
// ============================================================================

console.log('\n📋 Test Group 5: main.js placeholder rendering');

const mainJs = readFileSync(join(__dirname, 'js/main.js'), 'utf-8');

assert(mainJs.includes('empty-hint'), 'main.js renders empty-hint class');
assert(mainJs.includes('emptyActiveHint'), 'main.js uses emptyActiveHint key');
assert(mainJs.includes('emptyBenchHint'), 'main.js uses emptyBenchHint key');
assert(mainJs.includes('stadium-icon'), 'main.js renders stadium-icon');
assert(mainJs.includes('stadium-hint'), 'main.js renders stadium-hint');
assert(mainJs.includes('data-hint'), 'main.js uses data-hint for log empty state');

// ============================================================================
// Summary
// ============================================================================

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
