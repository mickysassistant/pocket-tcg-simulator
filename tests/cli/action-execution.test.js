/**
 * Tests for Action Execution (ACT-001)
 *
 * Tests that verify action execution works:
 * - start_turn executes without error
 * - State is saved correctly
 * - Response includes hand cards (auto-draw)
 * - SESSION_NOT_FOUND error when no session
 */

const { execSync } = require('child_process');
const assert = require('assert');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    testsPassed++;
    console.log(`✓ ${testName}`);
  } catch (error) {
    testsFailed++;
    console.error(`✗ ${testName}`);
    console.error(`  Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n').slice(1, 3).join('\n')}`);
    }
  }
}

/**
 * Execute tcgp command and return output
 * @param {string[]} args - Command arguments
 * @returns {Object} { stdout, stderr, status }
 */
function execTcgp(args) {
  const binPath = process.cwd() + '/bin/tcgp';

  // Properly escape arguments for shell
  const escapedArgs = args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes('{') || arg.includes('}')) {
      // Single-quote the argument to preserve special characters
      return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    return arg;
  });

  try {
    const stdout = execSync(`node ${binPath} ${escapedArgs.join(' ')}`, {
      encoding: 'utf8'
    });
    return { stdout, stderr: '', status: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : '',
      status: error.status || 1
    };
  }
}

/**
 * Parse JSON output safely
 * @param {string} output - JSON string
 * @returns {Object|null} Parsed JSON or null
 */
function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    return null;
  }
}

/**
 * Create a test session and return its name
 */
function createTestSession() {
  const timestamp = Date.now();
  const sessionName = `test-session-${timestamp}`;
  const result = execTcgp(['session', 'create', sessionName, '--p1', 'deck1', '--p2', 'deck2']);
  if (result.status !== 0) {
    throw new Error(`Failed to create test session: ${result.stdout}`);
  }
  return sessionName;
}

/**
 * Clean up test session
 */
function cleanupSession(sessionName) {
  execTcgp(['session', 'close', sessionName]);
}

// =============================================================================
// TESTS
// =============================================================================

// AC1: tcgp action start_turn executes without error
runTest('AC1: start_turn executes without error', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    assert(result.stdout.includes('Started turn for player1'), 'Should show success message');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC2: State saved in DB reflects new phase (main) and correct turn
runTest('AC2a: State saved with phase=main after start_turn', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.phase, 'main', 'Phase should be main');
    assert.strictEqual(json.turnNumber, 0, 'Should be turn 0');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC2b: State saved with correct currentPlayer after start_turn', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.currentPlayer, 'player1', 'Current player should be player1');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC2c: State saved with stateId', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert(json.stateId, 'Should have stateId');
    assert(json.savedAt, 'Should have savedAt timestamp');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC3: Response includes hand cards (auto-draw happened)
runTest('AC3: Response includes hand after start_turn (auto-draw)', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert(json.hand, 'Should include hand');
    assert(Array.isArray(json.hand), 'Hand should be array');
    assert(json.handSize !== undefined, 'Should include handSize');
    assert.strictEqual(json.handSize, json.hand.length, 'handSize should match array length');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC4: SESSION_NOT_FOUND error when no session
runTest('AC4a: start_turn fails without session flag', () => {
  const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--json']);
  assert(result.status !== 0, 'Should fail without session');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert.strictEqual(json.reason, 'MISSING_SESSION', 'Should have MISSING_SESSION reason');
});

runTest('AC4b: start_turn fails with non-existent session', () => {
  const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', 'non-existent-session', '--json']);
  assert(result.status !== 0, 'Should fail with non-existent session');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert.strictEqual(json.reason, 'SESSION_NOT_FOUND', 'Should have SESSION_NOT_FOUND reason');
});

// Additional validation tests
runTest('start_turn validates payload (missing playerId)', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with missing playerId');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('start_turn validates payload (invalid playerId)', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player3"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with invalid playerId');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('start_turn validates payload (invalid JSON)', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', 'not-valid-json', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with invalid JSON');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_JSON', 'Should have INVALID_JSON reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('start_turn with player2 works', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.phase, 'main', 'Phase should be main');
    assert.strictEqual(json.currentPlayer, 'player2', 'Current player should be player2');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('start_turn twice increases turn number', () => {
  const sessionName = createTestSession();
  try {
    // First turn
    const result1 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName, '--json']);
    assert.strictEqual(result1.status, 0, 'First turn should succeed');
    const json1 = parseJson(result1.stdout);
    assert.strictEqual(json1.turnNumber, 0, 'First turn should be 0');

    // Second turn
    const result2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName, '--json']);
    assert.strictEqual(result2.status, 0, 'Second turn should succeed');
    const json2 = parseJson(result2.stdout);
    assert.strictEqual(json2.turnNumber, 0, 'Turn should still be 0 (not incremented by start_turn)');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('start_turn output format without --json flag', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    assert(result.stdout.includes('Started turn for player1'), 'Should show success message');
    assert(result.stdout.includes('Turn: 0'), 'Should show turn number');
    assert(result.stdout.includes('Phase: main'), 'Should show phase');
    assert(result.stdout.includes('Player: player1'), 'Should show player');
    assert(result.stdout.includes('Hand size:'), 'Should show hand size');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Other actions show NOT_IMPLEMENTED', () => {
  const sessionName = createTestSession();
  try {
    const result = execTcgp(['action', 'draw', '{"playerId":"player1","count":2}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail - not implemented');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'NOT_IMPLEMENTED', 'Should have NOT_IMPLEMENTED reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n========================================');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
