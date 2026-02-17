/**
 * Tests for CLI session command (CLI-004)
 */

const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const os = require('os');

// Set up test environment - use a unique data directory for each test
const testDataDir = path.join(os.tmpdir(), `tcgp-test-${randomUUID()}`);
process.env.XDG_DATA_HOME = testDataDir;

// Clean up function
function cleanup() {
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

// Helper function to run tcgp command
function runTcgp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['bin/tcgp', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, XDG_DATA_HOME: testDataDir }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to parse JSON output
function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${output}`);
  }
}

// Clear module cache before tests
const sessionsPath = path.join(__dirname, '../../src/cli/services/sessions');
const statePath = path.join(__dirname, '../../src/cli/services/state');
const eventsPath = path.join(__dirname, '../../src/cli/services/events');
const storagePath = path.join(__dirname, '../../src/cli/services/storage');

console.log('Running CLI Session Tests...\n');

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;
  const tests = [];

  // Test 1: tcgp session create -- basic functionality
  tests.push(async () => {
    console.log('Test 1: tcgp session create - basic functionality');
    try {
      delete require.cache[require.resolve(sessionsPath)];
      delete require.cache[require.resolve(statePath)];
      delete require.cache[require.resolve(eventsPath)];
      delete require.cache[require.resolve(storagePath)];

      const { stdout, exitCode } = await runTcgp(['session', 'create', 'test-session-1', '--p1', 'deck1', '--p2', 'deck2']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('Session "test-session-1" created successfully'), 'Should show success message');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 2: tcgp session create with --json output
  tests.push(async () => {
    console.log('Test 2: tcgp session create with --json output');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-session-json', '--p1', 'deck1', '--p2', 'deck2']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert.strictEqual(data.name, 'test-session-json', 'Should return session name');
      assert.strictEqual(data.player1Deck, 'deck1', 'Should return p1 deck');
      assert.strictEqual(data.player2Deck, 'deck2', 'Should return p2 deck');
      assert.strictEqual(data.status, 'active', 'Should return active status');
      assert(data.id, 'Should return session ID');
      assert(data.initialState, 'Should return initial state');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 3: tcgp session create with seed
  tests.push(async () => {
    console.log('Test 3: tcgp session create with seed');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-session-seed', '--p1', 'deck1', '--p2', 'deck2', '--seed', '12345']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert.strictEqual(data.seed, '12345', 'Should return seed value');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 4: tcgp session create missing session name
  tests.push(async () => {
    console.log('Test 4: tcgp session create missing session name');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', '--p1', 'deck1', '--p2', 'deck2']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 5: tcgp session create missing --p1 argument
  tests.push(async () => {
    console.log('Test 5: tcgp session create missing --p1 argument');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-session-5', '--p2', 'deck2']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 6: tcgp session create missing --p2 argument
  tests.push(async () => {
    console.log('Test 6: tcgp session create missing --p2 argument');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-session-6', '--p1', 'deck1']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 7: tcgp session list - basic functionality
  tests.push(async () => {
    console.log('Test 7: tcgp session list - basic functionality');
    try {
      // Create some sessions first
      await runTcgp(['session', 'create', 'session-a', '--p1', 'deck1', '--p2', 'deck2']);
      await runTcgp(['session', 'create', 'session-b', '--p1', 'deck1', '--p2', 'deck2']);

      const { stdout, exitCode } = await runTcgp(['session', 'list']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('session-a'), 'Should list session-a');
      assert(stdout.includes('session-b'), 'Should list session-b');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 8: tcgp session list with --json
  tests.push(async () => {
    console.log('Test 8: tcgp session list with --json');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'list']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert(Array.isArray(data.sessions), 'Should return sessions array');
      assert(data.sessions.length >= 2, 'Should have at least 2 sessions');
      assert(data.count >= 2, 'Should return count >= 2');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 9: tcgp session list with --status active
  tests.push(async () => {
    console.log('Test 9: tcgp session list with --status active');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'list', '--status', 'active']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert(Array.isArray(data.sessions), 'Should return sessions array');
      data.sessions.forEach(s => {
        assert.strictEqual(s.status, 'active', 'All sessions should be active');
      });
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 10: tcgp session list with invalid status
  tests.push(async () => {
    console.log('Test 10: tcgp session list with invalid status');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'list', '--status', 'invalid']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'INVALID_ARGUMENT', 'Should return INVALID_ARGUMENT error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 11: tcgp session show - by name
  tests.push(async () => {
    console.log('Test 11: tcgp session show - by name');
    try {
      const { stdout, exitCode } = await runTcgp(['session', 'show', 'session-a']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('session-a'), 'Should show session name');
      assert(stdout.includes('Status:'), 'Should show status');
      assert(stdout.includes('P1 Deck:'), 'Should show P1 deck');
      assert(stdout.includes('P2 Deck:'), 'Should show P2 deck');
      assert(stdout.includes('Current State:'), 'Should show current state');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 12: tcgp session show - by ID
  tests.push(async () => {
    console.log('Test 12: tcgp session show - by ID');
    try {
      // First create a session and get its ID
      const createResult = await runTcgp(['--json', 'session', 'create', 'session-for-id', '--p1', 'deck1', '--p2', 'deck2']);
      const createData = parseJson(createResult.stdout);
      const sessionId = createData.id;

      // Show by ID
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'show', sessionId]);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert.strictEqual(data.id, sessionId, 'Should return correct session ID');
      assert.strictEqual(data.name, 'session-for-id', 'Should return correct session name');
      assert(data.currentState, 'Should have current state');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 13: tcgp session show with --json
  tests.push(async () => {
    console.log('Test 13: tcgp session show with --json');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'show', 'session-a']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert.strictEqual(data.name, 'session-a', 'Should return session name');
      assert.strictEqual(data.status, 'active', 'Should return active status');
      assert(data.id, 'Should return session ID');
      assert(data.createdAt, 'Should return createdAt');
      assert(data.currentState, 'Should return current state');
      assert.strictEqual(data.currentState.phase, 'setup', 'Should return correct phase');
      assert.strictEqual(data.currentState.turnNumber, 0, 'Should return correct turn number');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 14: tcgp session show - session not found
  tests.push(async () => {
    console.log('Test 14: tcgp session show - session not found');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'show', 'nonexistent-session']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'SESSION_NOT_FOUND', 'Should return SESSION_NOT_FOUND error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 15: tcgp session show - missing identifier
  tests.push(async () => {
    console.log('Test 15: tcgp session show - missing identifier');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'show']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 16: tcgp session close - basic functionality
  tests.push(async () => {
    console.log('Test 16: tcgp session close - basic functionality');
    try {
      const { stdout, exitCode } = await runTcgp(['session', 'close', 'session-a']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('Session "session-a" closed successfully'), 'Should show success message');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 17: tcgp session close with --json
  tests.push(async () => {
    console.log('Test 17: tcgp session close with --json');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'close', 'session-b']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert.strictEqual(data.status, 'completed', 'Should return completed status');
      assert.strictEqual(data.name, 'session-b', 'Should return session name');
      assert(data.closedAt, 'Should return closedAt timestamp');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 18: tcgp session close - already closed
  tests.push(async () => {
    console.log('Test 18: tcgp session close - already closed');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'close', 'session-a']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'SESSION_ALREADY_CLOSED', 'Should return SESSION_ALREADY_CLOSED error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 19: tcgp session close - session not found
  tests.push(async () => {
    console.log('Test 19: tcgp session close - session not found');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'close', 'nonexistent-session']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'SESSION_NOT_FOUND', 'Should return SESSION_NOT_FOUND error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 20: tcgp session close - missing identifier
  tests.push(async () => {
    console.log('Test 20: tcgp session close - missing identifier');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'close']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 21: tcgp session list shows closed sessions
  tests.push(async () => {
    console.log('Test 21: tcgp session list shows closed sessions');
    try {
      const { stdout, exitCode } = await runTcgp(['session', 'list']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('session-a'), 'Should show session-a (closed)');
      assert(stdout.includes('session-b'), 'Should show session-b (closed)');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 22: tcgp session list --status active excludes closed
  tests.push(async () => {
    console.log('Test 22: tcgp session list --status active excludes closed');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'list', '--status', 'active']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);
      assert(!data.sessions.find(s => s.name === 'session-a'), 'Should not include closed session-a');
      assert(!data.sessions.find(s => s.name === 'session-b'), 'Should not include closed session-b');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 23: tcgp session --help
  tests.push(async () => {
    console.log('Test 23: tcgp session --help');
    try {
      const { stdout, exitCode } = await runTcgp(['session', '--help']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('create'), 'Should show create subcommand');
      assert(stdout.includes('list'), 'Should show list subcommand');
      assert(stdout.includes('show'), 'Should show show subcommand');
      assert(stdout.includes('close'), 'Should show close subcommand');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 24: tcgp session create - duplicate name should fail
  tests.push(async () => {
    console.log('Test 24: tcgp session create - duplicate name should fail');
    try {
      // Create a session
      await runTcgp(['session', 'create', 'duplicate-test', '--p1', 'deck1', '--p2', 'deck2']);

      // Try to create again with same name
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'duplicate-test', '--p1', 'deck1', '--p2', 'deck2']);
      assert.strictEqual(exitCode, 1, 'Should exit with code 1');
      const data = parseJson(stdout);
      assert.strictEqual(data.reason, 'SESSION_NAME_EXISTS', 'Should return SESSION_NAME_EXISTS error');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 25: tcgp session --json still validates required fields
  tests.push(async () => {
    console.log('Test 25: tcgp session --json still validates required fields');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-validation', '--p1', 'deck1', '--p2', 'deck2']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0 when all fields are present');
      const data = parseJson(stdout);
      assert(data.id, 'Should have session ID');
      assert(data.name, 'Should have session name');
      assert(data.player1Deck, 'Should have p1 deck');
      assert(data.player2Deck, 'Should have p2 deck');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Run all tests
  for (const test of tests) {
    await test();
  }

  // Cleanup
  cleanup();

  // Summary
  console.log('====================================');
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log('====================================');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  cleanup();
  process.exit(1);
});
