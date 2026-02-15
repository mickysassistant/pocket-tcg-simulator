#!/usr/bin/env node
/**
 * Test T18: i18n Support
 *
 * This test verifies:
 * 1. Translation files exist and are valid JSON
 * 2. All required keys exist in both languages
 * 3. Translations are not missing or using placeholder values
 * 4. Page title translations exist
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = __dirname;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, errorMessage) {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        testsPassed++;
    } else {
        console.error(`  ❌ ${testName}`);
        if (errorMessage) {
            console.error(`     ${errorMessage}`);
        }
        testsFailed++;
    }
}

console.log('=== T18: i18n Support Tests ===\n');

// Test 1: Translation files exist
console.log('Test 1: Translation files exist');
const esPath = join(ROOT_DIR, 'js/i18n/es.json');
const enPath = join(ROOT_DIR, 'js/i18n/en.json');
assert(existsSync(esPath), 'ES translation file exists', `${esPath} not found`);
assert(existsSync(enPath), 'EN translation file exists', `${enPath} not found`);
console.log();

// Test 2: Translation files are valid JSON
console.log('Test 2: Translation files are valid JSON');
let esTranslations, enTranslations;
try {
    esTranslations = JSON.parse(readFileSync(esPath, 'utf-8'));
    assert(true, 'ES file is valid JSON');
} catch (e) {
    assert(false, 'ES file is valid JSON', e.message);
}

try {
    enTranslations = JSON.parse(readFileSync(enPath, 'utf-8'));
    assert(true, 'EN file is valid JSON');
} catch (e) {
    assert(false, 'EN file is valid JSON', e.message);
}
console.log();

// Test 3: Top-level sections exist
console.log('Test 3: Top-level sections exist');
const expectedSections = ['game', 'ui', 'edit', 'status', 'energyTypes', 'alerts', 'log'];
for (const section of expectedSections) {
    assert(esTranslations.hasOwnProperty(section), `ES has '${section}' section`);
    assert(enTranslations.hasOwnProperty(section), `EN has '${section}' section`);
}
console.log();

// Test 4: Common game keys exist
console.log('Test 4: Common game keys exist');
const gameKeys = ['opponent', 'you', 'points', 'deck', 'discard', 'turn', 'currentPlayer', 'player1', 'player2', 'title'];
for (const key of gameKeys) {
    assert(esTranslations.game && esTranslations.game.hasOwnProperty(key), `ES game.${key} exists`);
    assert(enTranslations.game && enTranslations.game.hasOwnProperty(key), `EN game.${key} exists`);
}
console.log();

// Test 5: UI keys exist
console.log('Test 5: UI keys exist');
const uiKeys = ['actionLog', 'export', 'play', 'pause', 'step', 'speed', 'loadScenario', 'saveScenario', 'editMode', 'coinQueue'];
for (const key of uiKeys) {
    assert(esTranslations.ui && esTranslations.ui.hasOwnProperty(key), `ES ui.${key} exists`);
    assert(enTranslations.ui && enTranslations.ui.hasOwnProperty(key), `EN ui.${key} exists`);
}
console.log();

// Test 6: Status effects exist
console.log('Test 6: Status effects exist');
const statusKeys = ['none', 'poison', 'poisonPlus', 'burn', 'sleep', 'paralysis', 'confusion'];
for (const key of statusKeys) {
    assert(esTranslations.status && esTranslations.status.hasOwnProperty(key), `ES status.${key} exists`);
    assert(enTranslations.status && enTranslations.status.hasOwnProperty(key), `EN status.${key} exists`);
}
console.log();

// Test 7: Energy types exist
console.log('Test 7: Energy types exist');
const energyKeys = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
for (const key of energyKeys) {
    assert(esTranslations.energyTypes && esTranslations.energyTypes.hasOwnProperty(key), `ES energyTypes.${key} exists`);
    assert(enTranslations.energyTypes && enTranslations.energyTypes.hasOwnProperty(key), `EN energyTypes.${key} exists`);
}
console.log();

// Test 8: No placeholder values (keys or empty strings)
console.log('Test 8: No placeholder values');
function hasPlaceholders(obj, path = '') {
    for (const key in obj) {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
            if (hasPlaceholders(value, currentPath)) {
                return true;
            }
        } else if (typeof value === 'string') {
            if (value === '' || value === currentPath) {
                console.error(`     Placeholder found: ${currentPath} = "${value}"`);
                return true;
            }
        }
    }
    return false;
}

assert(!hasPlaceholders(esTranslations), 'ES has no placeholder values');
assert(!hasPlaceholders(enTranslations), 'EN has no placeholder values');
console.log();

// Test 9: Page title translations
console.log('Test 9: Page title translations');
assert(esTranslations.game && esTranslations.game.title === 'Pokemon TCG Pocket - Simulador de Batalla',
       'ES page title is correct', `Got: ${esTranslations.game?.title}`);
assert(enTranslations.game && enTranslations.game.title === 'Pokemon TCG Pocket - Battle Simulator',
       'EN page title is correct', `Got: ${enTranslations.game?.title}`);
console.log();

// Test 10: Alert messages with parameters
console.log('Test 10: Alert messages with parameters');
const alertsWithParams = ['gameOverWinnerWins', 'hpCannotExceedMax', 'evolutionMismatch'];
for (const key of alertsWithParams) {
    assert(esTranslations.alerts && esTranslations.alerts.hasOwnProperty(key), `ES alerts.${key} exists`);
    assert(enTranslations.alerts && enTranslations.alerts.hasOwnProperty(key), `EN alerts.${key} exists`);
    // Check that it contains a parameter placeholder
    if (esTranslations.alerts && esTranslations.alerts[key]) {
        const hasParam = esTranslations.alerts[key].includes('{');
        assert(hasParam, `ES alerts.${key} has parameter placeholder`);
    }
}
console.log();

// Test 11: Count total translation keys
console.log('Test 11: Translation coverage');
function countKeys(obj) {
    let count = 0;
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countKeys(obj[key]);
        } else {
            count++;
        }
    }
    return count;
}

const esCount = countKeys(esTranslations);
const enCount = countKeys(enTranslations);
console.log(`  Total keys in ES: ${esCount}`);
console.log(`  Total keys in EN: ${enCount}`);
assert(esCount >= 50, `ES has sufficient translations (got ${esCount})`);
assert(enCount >= 50, `EN has sufficient translations (got ${enCount})`);
assert(esCount === enCount, `ES and EN have same number of keys`, `ES: ${esCount}, EN: ${enCount}`);
console.log();

// Test 12: Edit mode keys
console.log('Test 12: Edit mode keys');
const editKeys = ['title', 'hp', 'status', 'energy', 'addEnergy', 'apply', 'removePokemon', 'cancel'];
for (const key of editKeys) {
    assert(esTranslations.edit && esTranslations.edit.hasOwnProperty(key), `ES edit.${key} exists`);
    assert(enTranslations.edit && enTranslations.edit.hasOwnProperty(key), `EN edit.${key} exists`);
}
console.log();

// Test 13: Log keys
console.log('Test 13: Log keys');
const logKeys = ['exported', 'totalTurns', 'turnHeader', 'logHeader'];
for (const key of logKeys) {
    assert(esTranslations.log && esTranslations.log.hasOwnProperty(key), `ES log.${key} exists`);
    assert(enTranslations.log && enTranslations.log.hasOwnProperty(key), `EN log.${key} exists`);
}
console.log();

// Summary
console.log('\n=== Test Summary ===');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total: ${testsPassed + testsFailed} tests`);
console.log();

if (testsFailed > 0) {
    process.exit(1);
} else {
    console.log('✅ All i18n tests passed!');
    process.exit(0);
}
