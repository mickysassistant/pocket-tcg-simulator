/**
 * Smoke tests for CLI snapshot command (CLI-008)
 *
 * Tests that verify the snapshot functionality works:
 * - tcgp snapshot save works
 * - tcgp snapshot load works
 * - State integrity after restore is validated
 */

const { execSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

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

// Set up test environment
const testDataDir = path.join(os.tmpdir(), `tcgp-snapshot-test-${randomUUID()}`);
process.env.XDG_DATA_HOME = testDataDir;

// Clean up function
function cleanup() {
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

/**
 * Execute tcgp command and return output
 * @param {string[]} args - Command arguments
 * @returns {Object} { stdout, stderr, status }
 */
function execTcgp(args) {
  const binPath = process.cwd() + '/bin/tcgp';

  try {
    const stdout = execSync(`node ${binPath} ${args.join(' ')}`, {
      encoding: 'utf8',
      env: { ...process.env, XDG_DATA_HOME: testDataDir }
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

// =============================================================================
// SETUP
// =============================================================================

cleanup();
let sessionId;
let sessionName = 'test-snapshot-session';

// Create a test session
const setupResult = execTcgp(['session', 'create', sessionName, '--p1', 'deck1', '--p2', 'deck2', '--json']);
assert.strictEqual(setupResult.status, 0, 'Failed to create test session');
const setupData = parseJson(setupResult.stdout);
assert.ok(setupData, 'Failed to parse session creation response');
sessionId = setupData.id;

console.log(`Test session created: ${sessionName} (${sessionId})\n`);

// =============================================================================
// TESTS
// =============================================================================

// AC1: tcgp snapshot save funciona
runTest('AC1a: snapshot save with label works', () => {
  const result = execTcgp(['snapshot', 'save', sessionName, 'before-attack', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot save should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.sessionName, sessionName);
  assert.strictEqual(data.label, 'before-attack');
  assert.strictEqual(typeof data.id, 'number');
  assert.strictEqual(typeof data.turnNumber, 'number');
  assert.strictEqual(typeof data.phase, 'string');
  assert.strictEqual(typeof data.currentPlayer, 'string');
});

runTest('AC1b: snapshot save using session ID works', () => {
  const result = execTcgp(['snapshot', 'save', sessionId, 'checkpoint-1', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot save should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.sessionId, sessionId);
  assert.strictEqual(data.label, 'checkpoint-1');
});

runTest('AC1c: snapshot save returns error for missing session', () => {
  const result = execTcgp(['snapshot', 'save', 'nonexistent', 'label', '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for nonexistent session');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Session not found');
  assert.strictEqual(data.reason, 'SESSION_NOT_FOUND');
});

runTest('AC1d: snapshot save returns error for missing label', () => {
  const result = execTcgp(['snapshot', 'save', sessionName, '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for missing label');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Missing snapshot label');
  assert.strictEqual(data.reason, 'MISSING_ARGUMENT');
});

runTest('AC1e: snapshot save prevents duplicate labels', () => {
  // Save first snapshot
  const result1 = execTcgp(['snapshot', 'save', sessionName, 'duplicate-label']);
  assert.strictEqual(result1.status, 0, 'First save should succeed');

  // Try to save with same label
  const result2 = execTcgp(['snapshot', 'save', sessionName, 'duplicate-label', '--json']);
  assert.strictEqual(result2.status, 1, 'Second save should fail');

  const data = parseJson(result2.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Snapshot label already exists');
  assert.strictEqual(data.reason, 'SNAPSHOT_LABEL_EXISTS');
});

// AC2: tcgp snapshot load funciona
runTest('AC2a: snapshot load by label works', () => {
  const result = execTcgp(['snapshot', 'load', sessionName, 'before-attack', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot load should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.sessionName, sessionName);
  assert.strictEqual(data.label, 'before-attack');
  assert.strictEqual(typeof data.snapshotId, 'number');
  assert.strictEqual(typeof data.restoredStateId, 'number');
  assert.strictEqual(typeof data.turnNumber, 'number');
  assert.strictEqual(typeof data.phase, 'string');
  assert.strictEqual(typeof data.currentPlayer, 'string');
  assert.strictEqual(typeof data.validation, 'object');
});

runTest('AC2b: snapshot load using session ID works', () => {
  const result = execTcgp(['snapshot', 'load', sessionId, 'checkpoint-1', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot load should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.sessionId, sessionId);
  assert.strictEqual(data.label, 'checkpoint-1');
});

runTest('AC2c: snapshot load returns error for missing session', () => {
  const result = execTcgp(['snapshot', 'load', 'nonexistent', 'label', '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for nonexistent session');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Session not found');
  assert.strictEqual(data.reason, 'SESSION_NOT_FOUND');
});

runTest('AC2d: snapshot load returns error for missing snapshot', () => {
  const result = execTcgp(['snapshot', 'load', sessionName, 'nonexistent-label', '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for nonexistent snapshot');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Snapshot not found');
  assert.strictEqual(data.reason, 'SNAPSHOT_NOT_FOUND');
});

runTest('AC2e: snapshot load returns error for missing label argument', () => {
  const result = execTcgp(['snapshot', 'load', sessionName, '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for missing label');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Missing snapshot label');
  assert.strictEqual(data.reason, 'MISSING_ARGUMENT');
});

// AC3: Integridad de estado tras restore validada
runTest('AC3a: snapshot load validates state integrity', () => {
  const result = execTcgp(['snapshot', 'load', sessionName, 'before-attack', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot load should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.validation.valid, true);
  assert.strictEqual(Array.isArray(data.validation.issues), true);
  assert.strictEqual(data.validation.issues.length, 0);
});

runTest('AC3b: snapshot load preserves state values', () => {
  // Save a new snapshot
  const saveResult = execTcgp(['snapshot', 'save', sessionName, 'consistency-test', '--json']);
  const saveData = parseJson(saveResult.stdout);
  assert.ok(saveData, 'Save response should be valid JSON');

  // Load the snapshot
  const loadResult = execTcgp(['snapshot', 'load', sessionName, 'consistency-test', '--json']);
  const loadData = parseJson(loadResult.stdout);
  assert.ok(loadData, 'Load response should be valid JSON');

  // Check that key values are consistent
  assert.strictEqual(saveData.turnNumber, loadData.turnNumber, 'Turn number should match');
  assert.strictEqual(saveData.phase, loadData.phase, 'Phase should match');
  assert.strictEqual(saveData.currentPlayer, loadData.currentPlayer, 'Current player should match');
});

runTest('AC3c: snapshot load creates new state record', () => {
  // Load a snapshot
  const result = execTcgp(['snapshot', 'load', sessionName, 'checkpoint-1', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot load should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.ok(data.restoredStateId, 'Should create a new state record');
  assert.strictEqual(typeof data.restoredStateId, 'number');
});

// Additional tests: snapshot list
runTest('snapshot list works', () => {
  const result = execTcgp(['snapshot', 'list', sessionName, '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot list should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.sessionName, sessionName);
  assert.strictEqual(typeof data.count, 'number');
  assert.strictEqual(Array.isArray(data.snapshots), true);
  assert.strictEqual(data.snapshots.length, data.count);
});

runTest('snapshot list shows saved snapshots', () => {
  // Save some snapshots
  execTcgp(['snapshot', 'save', sessionName, 'list-test-1']);
  execTcgp(['snapshot', 'save', sessionName, 'list-test-2']);

  const result = execTcgp(['snapshot', 'list', sessionName, '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot list should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.ok(data.count >= 2, 'Should have at least 2 snapshots');

  // Check snapshot structure
  const snapshot1 = data.snapshots.find(s => s.label === 'list-test-1');
  const snapshot2 = data.snapshots.find(s => s.label === 'list-test-2');
  assert.ok(snapshot1, 'Should find snapshot 1');
  assert.ok(snapshot2, 'Should find snapshot 2');
});

runTest('snapshot list returns error for missing session', () => {
  const result = execTcgp(['snapshot', 'list', 'nonexistent', '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for nonexistent session');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Session not found');
  assert.strictEqual(data.reason, 'SESSION_NOT_FOUND');
});

// Additional tests: snapshot delete
runTest('snapshot delete works', () => {
  // Save a snapshot
  execTcgp(['snapshot', 'save', sessionName, 'delete-test']);

  // Verify snapshot exists
  const listResult1 = execTcgp(['snapshot', 'list', sessionName, '--json']);
  const data1 = parseJson(listResult1.stdout);
  const beforeCount = data1.count;
  assert.ok(beforeCount > 0, 'Should have at least one snapshot before delete');

  // Delete snapshot
  const result = execTcgp(['snapshot', 'delete', sessionName, 'delete-test', '--json']);
  assert.strictEqual(result.status, 0, 'Snapshot delete should succeed');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Response should be valid JSON');
  assert.strictEqual(data.sessionName, sessionName);
  assert.strictEqual(data.label, 'delete-test');

  // Verify snapshot is gone
  const listResult2 = execTcgp(['snapshot', 'list', sessionName, '--json']);
  const data2 = parseJson(listResult2.stdout);
  assert.strictEqual(data2.count, beforeCount - 1, 'Snapshot count should decrease by 1');
});

runTest('snapshot delete returns error for missing snapshot', () => {
  const result = execTcgp(['snapshot', 'delete', sessionName, 'nonexistent-label', '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for nonexistent snapshot');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Snapshot not found');
  assert.strictEqual(data.reason, 'SNAPSHOT_NOT_FOUND');
});

// Command help and error tests
runTest('snapshot command shows help', () => {
  const result = execTcgp(['snapshot', '--help']);
  assert.strictEqual(result.status, 0, 'Help should succeed');

  const stdout = result.stdout;
  assert.ok(stdout.includes('USAGE: tcgp snapshot'), 'Should show usage');
  assert.ok(stdout.includes('save'), 'Should show save subcommand');
  assert.ok(stdout.includes('load'), 'Should show load subcommand');
  assert.ok(stdout.includes('list'), 'Should show list subcommand');
  assert.ok(stdout.includes('delete'), 'Should show delete subcommand');
});

runTest('snapshot command returns error for unknown subcommand', () => {
  const result = execTcgp(['snapshot', 'unknown', sessionName, '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for unknown subcommand');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Unknown subcommand: unknown');
  assert.strictEqual(data.reason, 'UNKNOWN_SUBCOMMAND');
});

runTest('snapshot command returns error for missing subcommand', () => {
  const result = execTcgp(['snapshot', '--json']);
  assert.strictEqual(result.status, 1, 'Should fail for missing subcommand');

  const data = parseJson(result.stdout);
  assert.ok(data, 'Error response should be valid JSON');
  assert.strictEqual(data.error, 'Missing subcommand');
  assert.strictEqual(data.reason, 'MISSING_SUBCOMMAND');
});

// =============================================================================
// SUMMARY
// =============================================================================

cleanup();

console.log(`\n==================================================`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`==================================================`);

if (testsFailed > 0) {
  process.exit(1);
}
