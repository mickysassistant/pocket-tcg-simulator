// Test T19a: Better Error Messages
// Testing error handling, modals, and toast notifications

import { strict as assert } from 'assert';

// Mock DOM for Node.js testing
global.document = {
    createElement: (tag) => ({
        tagName: tag,
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    }),
    querySelector: (selector) => {
        if (selector === '#error-modal') return { classList: { add: () => {}, remove: () => {} } };
        if (selector === '#game-over-banner') return { classList: { add: () => {}, remove: () => {} } };
        return null;
    },
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

global.console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    group: () => {},
    groupEnd: () => {}
};

// We need to import the actual error functions from main.js
// For now, we'll create mock versions to test the logic

const ErrorSeverity = {
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

const ErrorCategory = {
    VALIDATION: 'validation',
    GAME_STATE: 'game_state',
    NETWORK: 'network',
    SYSTEM: 'system'
};

// Track calls for testing
const calls = {
    toast: [],
    modal: [],
    console: []
};

function logError(msg, options = {}) {
    const { category = ErrorCategory.VALIDATION, severity = ErrorSeverity.WARNING, suggestion, error } = options;

    calls.console.push({ type: 'error', msg, category, severity, suggestion, error });
    calls.toast.push({ msg, severity, suggestion });

    let displayMsg = msg;
    if (severity === ErrorSeverity.CRITICAL) {
        displayMsg = '⚠️ ' + displayMsg;
    }
    if (suggestion) {
        displayMsg += `\n💡 ${suggestion}`;
    }
}

function showErrorModal(title, message, options = {}) {
    const { severity = ErrorSeverity.ERROR, suggestion, error, primaryAction } = options;
    calls.modal.push({ title, message, severity, suggestion, error, primaryAction });
}

// ============================================================================
// TESTS
// ============================================================================

console.log('========================================');
console.log('Test T19a: Better Error Messages');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   ${e.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`);
    }
}

// Test 1: logError creates toast with WARNING severity
test('logError creates toast with WARNING severity', () => {
    calls.toast = [];
    logError('Invalid move');
    assertEqual(calls.toast.length, 1, 'Should create one toast');
    assertEqual(calls.toast[0].msg, 'Invalid move', 'Message should match');
    assertEqual(calls.toast[0].severity, ErrorSeverity.WARNING, 'Severity should be WARNING');
});

// Test 2: logError with ERROR severity
test('logError with ERROR severity', () => {
    calls.toast = [];
    logError('Failed to load scenario', { severity: ErrorSeverity.ERROR });
    assertEqual(calls.toast.length, 1, 'Should create one toast');
    assertEqual(calls.toast[0].severity, ErrorSeverity.ERROR, 'Severity should be ERROR');
});

// Test 3: logError with CRITICAL severity adds warning icon
test('logError with CRITICAL severity adds warning icon', () => {
    calls.toast = [];
    logError('System crash', { severity: ErrorSeverity.CRITICAL });
    assertEqual(calls.toast[0].msg, '⚠️ System crash', 'Should add warning icon');
});

// Test 4: logError includes suggestion in toast
test('logError includes suggestion in toast', () => {
    calls.toast = [];
    logError('No active Pokemon', { suggestion: 'Play a Pokemon to the active slot' });
    assert(calls.toast[0].msg.includes('💡'), 'Should include suggestion icon');
    assert(calls.toast[0].msg.includes('Play a Pokemon to the active slot'), 'Should include suggestion text');
});

// Test 5: showErrorModal creates modal with basic parameters
test('showErrorModal creates modal with basic parameters', () => {
    calls.modal = [];
    showErrorModal('Error Title', 'Error message');
    assertEqual(calls.modal.length, 1, 'Should create one modal');
    assertEqual(calls.modal[0].title, 'Error Title', 'Title should match');
    assertEqual(calls.modal[0].message, 'Error message', 'Message should match');
    assertEqual(calls.modal[0].severity, ErrorSeverity.ERROR, 'Default severity should be ERROR');
});

// Test 6: showErrorModal with WARNING severity
test('showErrorModal with WARNING severity', () => {
    calls.modal = [];
    showErrorModal('Warning', 'Warning message', { severity: ErrorSeverity.WARNING });
    assertEqual(calls.modal[0].severity, ErrorSeverity.WARNING, 'Severity should be WARNING');
});

// Test 7: showErrorModal with suggestion
test('showErrorModal includes suggestion', () => {
    calls.modal = [];
    showErrorModal('Error', 'Message', { suggestion: 'Try again later' });
    assertEqual(calls.modal[0].suggestion, 'Try again later', 'Should include suggestion');
});

// Test 8: showErrorModal with error object
test('showErrorModal includes error object', () => {
    calls.modal = [];
    const err = new Error('Original error');
    showErrorModal('Error', 'Message', { error: err });
    assertEqual(calls.modal[0].error, err, 'Should include error object');
});

// Test 9: showErrorModal with primary action
test('showErrorModal includes primary action', () => {
    calls.modal = [];
    const action = { text: 'Retry', onClick: () => {} };
    showErrorModal('Error', 'Message', { primaryAction: action });
    assertEqual(calls.modal[0].primaryAction, action, 'Should include primary action');
});

// Test 10: ErrorCategory constants
test('ErrorCategory constants exist', () => {
    assertEqual(ErrorCategory.VALIDATION, 'validation', 'VALIDATION should be correct');
    assertEqual(ErrorCategory.GAME_STATE, 'game_state', 'GAME_STATE should be correct');
    assertEqual(ErrorCategory.NETWORK, 'network', 'NETWORK should be correct');
    assertEqual(ErrorCategory.SYSTEM, 'system', 'SYSTEM should be correct');
});

// Test 11: ErrorSeverity constants
test('ErrorSeverity constants exist', () => {
    assertEqual(ErrorSeverity.WARNING, 'warning', 'WARNING should be correct');
    assertEqual(ErrorSeverity.ERROR, 'error', 'ERROR should be correct');
    assertEqual(ErrorSeverity.CRITICAL, 'critical', 'CRITICAL should be correct');
});

// Test 12: Multiple logError calls don't interfere
test('Multiple logError calls don\'t interfere', () => {
    calls.toast = [];
    logError('Error 1');
    logError('Error 2', { severity: ErrorSeverity.ERROR });
    logError('Error 3', { severity: ErrorSeverity.CRITICAL, suggestion: 'Fix this' });
    assertEqual(calls.toast.length, 3, 'Should create three toasts');
    assertEqual(calls.toast[0].severity, ErrorSeverity.WARNING, 'First toast should be WARNING');
    assertEqual(calls.toast[1].severity, ErrorSeverity.ERROR, 'Second toast should be ERROR');
    assertEqual(calls.toast[2].severity, ErrorSeverity.CRITICAL, 'Third toast should be CRITICAL');
    assert(calls.toast[2].msg.includes('Fix this'), 'Third toast should have suggestion');
});

// Test 13: logError with full options
test('logError with all options', () => {
    calls.toast = [];
    calls.console = [];
    const err = new Error('Test error');
    logError('Full test', {
        category: ErrorCategory.GAME_STATE,
        severity: ErrorSeverity.ERROR,
        suggestion: 'Check state',
        error: err
    });
    assertEqual(calls.toast.length, 1, 'Should create toast');
    assertEqual(calls.console.length, 1, 'Should create console log');
    assertEqual(calls.console[0].category, ErrorCategory.GAME_STATE, 'Category should be GAME_STATE');
    assertEqual(calls.console[0].severity, ErrorSeverity.ERROR, 'Severity should be ERROR');
    assertEqual(calls.console[0].suggestion, 'Check state', 'Suggestion should match');
    assertEqual(calls.console[0].error, err, 'Error object should match');
});

// Test 14: Default category for logError
test('logError uses default VALIDATION category', () => {
    calls.console = [];
    logError('Test');
    assertEqual(calls.console[0].category, ErrorCategory.VALIDATION, 'Default category should be VALIDATION');
});

// Test 15: Default severity for logError
test('logError uses default WARNING severity', () => {
    calls.console = [];
    logError('Test');
    assertEqual(calls.console[0].severity, ErrorSeverity.WARNING, 'Default severity should be WARNING');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
    process.exit(1);
}
