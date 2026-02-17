/**
 * CLI Tests for CLI-007: Determinismo (seed + coin queue)
 * Tests CLI session command with --seed and --coin-queue flags
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

console.log('Running CLI Determinism Tests...\n');

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;
  const tests = [];

  // Test 1: tcgp session create with --seed flag
  tests.push(async () => {
    console.log('Test 1: tcgp session create with --seed flag');
    try {
      delete require.cache[require.resolve(sessionsPath)];
      delete require.cache[require.resolve(statePath)];
      delete require.cache[require.resolve(eventsPath)];
      delete require.cache[require.resolve(storagePath)];

      const { stdout, exitCode } = await runTcgp(['session', 'create', 'test-seed-session', '--p1', 'deck1', '--p2', 'deck2', '--seed', '12345']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      assert(stdout.includes('Session "test-seed-session" created successfully'), 'Should show success message');
      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 2: tcgp session create with --seed and --json output
  tests.push(async () => {
    console.log('Test 2: tcgp session create with --seed and --json output');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-seed-json', '--p1', 'deck1', '--p2', 'deck2', '--seed', 'my-test-seed']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      assert.ok(data.id, 'Output should contain id in JSON response');
      assert.strictEqual(data.name, 'test-seed-json', 'Should return session name');
      assert.strictEqual(data.player1Deck, 'deck1', 'Should return player1 deck');
      assert.strictEqual(data.player2Deck, 'deck2', 'Should return player2 deck');
      assert.strictEqual(data.seed, 'my-test-seed', 'Should return seed value');
      assert.strictEqual(data.coinQueue, null, 'Should return null for coinQueue when not provided');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 3: tcgp session create with --coin-queue flag
  tests.push(async () => {
    console.log('Test 3: tcgp session create with --coin-queue flag');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-coin-queue', '--p1', 'deck1', '--p2', 'deck2', '--coin-queue', '[true,false,true]']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      assert.strictEqual(data.name, 'test-coin-queue', 'Should return session name');
      assert.deepStrictEqual(data.coinQueue, [true, false, true], 'Should return coin queue array');
      assert.strictEqual(data.seed, null, 'Should return null for seed when not provided');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 4: tcgp session create with both --seed and --coin-queue
  tests.push(async () => {
    console.log('Test 4: tcgp session create with both --seed and --coin-queue');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'test-both', '--p1', 'deck1', '--p2', 'deck2', '--seed', '999', '--coin-queue', '[true,true,false]']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      assert.strictEqual(data.name, 'test-both', 'Should return session name');
      assert.strictEqual(data.seed, '999', 'Should return seed value');
      assert.deepStrictEqual(data.coinQueue, [true, true, false], 'Should return coin queue array');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 5: tcgp session list shows seed and coinQueue
  tests.push(async () => {
    console.log('Test 5: tcgp session list shows seed and coinQueue');
    try {
      // Create a session with seed and coin queue
      await runTcgp(['session', 'create', 'list-test', '--p1', 'deck1', '--p2', 'deck2', '--seed', 'abc123', '--coin-queue', '[true]']);

      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'list']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      assert.ok(Array.isArray(data.sessions), 'Should return sessions array');
      const session = data.sessions.find(s => s.name === 'list-test');
      assert.ok(session, 'Should find the created session');

      assert.strictEqual(session.seed, 'abc123', 'Should show seed in list');
      assert.deepStrictEqual(session.coinQueue, [true], 'Should show coinQueue in list');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 6: tcgp session show shows seed and coinQueue
  tests.push(async () => {
    console.log('Test 6: tcgp session show shows seed and coinQueue');
    try {
      // Create a session with seed and coin queue
      await runTcgp(['session', 'create', 'show-test', '--p1', 'deck1', '--p2', 'deck2', '--seed', 'xyz789', '--coin-queue', '[false,true,false]']);

      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'show', 'show-test']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      assert.strictEqual(data.name, 'show-test', 'Should return session name');
      assert.strictEqual(data.seed, 'xyz789', 'Should show seed');
      assert.deepStrictEqual(data.coinQueue, [false, true, false], 'Should show coinQueue');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 7: tcgp session create with seed - reproducible metadata
  tests.push(async () => {
    console.log('Test 7: tcgp session create with seed - reproducible metadata');
    try {
      // Create two sessions with same seed
      await runTcgp(['session', 'create', 'repro-1', '--p1', 'deck1', '--p2', 'deck2', '--seed', 'same-seed']);
      await runTcgp(['session', 'create', 'repro-2', '--p1', 'deck1', '--p2', 'deck2', '--seed', 'same-seed']);

      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'list']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      const session1 = data.sessions.find(s => s.name === 'repro-1');
      const session2 = data.sessions.find(s => s.name === 'repro-2');

      assert.ok(session1, 'Should find first session');
      assert.ok(session2, 'Should find second session');
      assert.strictEqual(session1.seed, 'same-seed', 'First session should have seed');
      assert.strictEqual(session2.seed, 'same-seed', 'Second session should have seed');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 8: tcgp session show human output includes seed and coinQueue
  tests.push(async () => {
    console.log('Test 8: tcgp session show human output includes seed and coinQueue');
    try {
      await runTcgp(['session', 'create', 'human-test', '--p1', 'deck1', '--p2', 'deck2', '--seed', 'human-seed', '--coin-queue', '[true,false]']);

      const { stdout, exitCode } = await runTcgp(['session', 'show', 'human-test']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');

      assert(stdout.includes('human-seed'), 'Human output should include seed');
      assert(stdout.includes('[true,false]'), 'Human output should include coin queue');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 9: tcgp session help shows seed and coin-queue options
  tests.push(async () => {
    console.log('Test 9: tcgp session help shows seed and coin-queue options');
    try {
      const { stdout, exitCode } = await runTcgp(['session', '--help']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');

      assert(stdout.includes('--seed'), 'Help should show --seed option');
      assert(stdout.includes('--coin-queue'), 'Help should show --coin-queue option');
      assert(stdout.includes('coin flip results'), 'Help should describe coin-queue');

      console.log('✓ PASS\n');
      testsPassed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}\n`);
      testsFailed++;
    }
  });

  // Test 10: tcgp session create with empty coin queue
  tests.push(async () => {
    console.log('Test 10: tcgp session create with empty coin queue');
    try {
      const { stdout, exitCode } = await runTcgp(['--json', 'session', 'create', 'empty-queue', '--p1', 'deck1', '--p2', 'deck2', '--coin-queue', '[]']);
      assert.strictEqual(exitCode, 0, 'Should exit with code 0');
      const data = parseJson(stdout);

      assert.deepStrictEqual(data.coinQueue, [], 'Should return empty coin queue array');

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

  console.log(`\n===================`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log(`===================`);

  // Clean up
  cleanup();

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = { runTests };
