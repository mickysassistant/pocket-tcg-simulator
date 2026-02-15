/**
 * T19b: Loading States - Test Suite
 * Tests loading overlay, progress bar, and button loading states
 *
 * Run: node test-t19b.mjs
 */

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) {
        console.log(`  ✅ ${name}`);
        passed++;
    } else {
        console.log(`  ❌ ${name}`);
        failed++;
    }
}

console.log('=== T19b: Loading States Tests ===\n');

// Test 1: Translation keys exist in both languages
console.log('📋 Test 1: Translation keys for loading states');
import { readFileSync } from 'fs';

const es = JSON.parse(readFileSync('./js/i18n/es.json', 'utf8'));
const en = JSON.parse(readFileSync('./js/i18n/en.json', 'utf8'));

const requiredUiKeys = ['loadingScenario', 'savingScenario', 'readingFile', 'loading', 'loadingTranslations', 'loadingCards', 'setupInterface'];
for (const key of requiredUiKeys) {
    assert(es.ui?.[key], `es.json has ui.${key}: "${es.ui?.[key]}"`);
    assert(en.ui?.[key], `en.json has ui.${key}: "${en.ui?.[key]}"`);
}

// Test 2: Alert keys for file operations
console.log('\n📋 Test 2: Alert keys for file operations');
const requiredAlertKeys = ['failedToReadFile', 'failedToSaveScenario', 'scenarioLoaded', 'scenarioSaved'];
for (const key of requiredAlertKeys) {
    assert(es.alerts?.[key], `es.json has alerts.${key}`);
    assert(en.alerts?.[key], `en.json has alerts.${key}`);
}

// Test 3: Error suggestion keys
console.log('\n📋 Test 3: Error suggestion keys');
assert(es.error?.suggestionTryAgain, `es.json has error.suggestionTryAgain`);
assert(en.error?.suggestionTryAgain, `en.json has error.suggestionTryAgain`);

// Test 4: HTML loading overlay structure
console.log('\n📋 Test 4: HTML loading overlay structure');
const html = readFileSync('./index.html', 'utf8');
assert(html.includes('id="status-overlay"'), 'HTML has status-overlay');
assert(html.includes('class="spinner"'), 'HTML has spinner');
assert(html.includes('id="status-text"'), 'HTML has status-text');
assert(html.includes('id="status-progress"'), 'HTML has progress container');
assert(html.includes('id="status-progress-fill"'), 'HTML has progress fill bar');
assert(html.includes('id="status-progress-text"'), 'HTML has progress text');

// Test 5: CSS has loading-related styles
console.log('\n📋 Test 5: CSS loading styles');
const css = readFileSync('./css/dialogs.css', 'utf8');
assert(css.includes('#status-overlay'), 'CSS has #status-overlay');
assert(css.includes('.spinner'), 'CSS has .spinner');
assert(css.includes('.progress-bar'), 'CSS has .progress-bar');
assert(css.includes('.progress-fill'), 'CSS has .progress-fill');
assert(css.includes('.btn-loading'), 'CSS has .btn-loading');
assert(css.includes('#status-progress'), 'CSS has #status-progress');

// Test 6: main.js has loading functions
console.log('\n📋 Test 6: main.js loading functions');
const mainJs = readFileSync('./js/main.js', 'utf8');
assert(mainJs.includes('function showLoading('), 'main.js has showLoading()');
assert(mainJs.includes('function hideLoading('), 'main.js has hideLoading()');
assert(mainJs.includes('function updateLoadingProgress('), 'main.js has updateLoadingProgress()');
assert(mainJs.includes('function setButtonLoading('), 'main.js has setButtonLoading()');
assert(mainJs.includes('function clearButtonLoading('), 'main.js has clearButtonLoading()');

// Test 7: Loading used in scenario operations
console.log('\n📋 Test 7: Loading states in scenario operations');
assert(mainJs.includes("showLoading(t('ui.loadingScenario')"), 'loadScenario shows loading');
assert(mainJs.includes("showLoading(t('ui.savingScenario')"), 'saveScenario shows loading');
assert(mainJs.includes("showLoading(t('ui.readingFile')"), 'File reader shows loading');

// Test 8: Init uses progress
console.log('\n📋 Test 8: Init uses progress bar');
assert(mainJs.includes('progress: 10'), 'Init step 1 has progress');
assert(mainJs.includes('progress: 40'), 'Init step 2 has progress');
assert(mainJs.includes('progress: 80'), 'Init step 3 has progress');
assert(mainJs.includes('updateLoadingProgress(100'), 'Init completes at 100%');

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
} else {
    console.log('✅ ALL TESTS PASSED');
}
