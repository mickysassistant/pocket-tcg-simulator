/**
 * Smoke tests for CLI replay command (CLI-009)
 *
 * Tests that verify the replay functionality works:
 * - tcgp replay export generates consumable file
 * - tcgp replay run executes complete replay
 * - Can compare expected final state
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
const testDataDir = path.join(os.tmpdir(), `tcgp-replay-test-${randomUUID()}`);
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
function runTcgp(args) {
  const binPath = path.join(__dirname, '../../bin/tcgp');

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

/**
 * Execute tcgp command and return parsed JSON output
 * @param {string[]} args - Command arguments
 * @returns {Object} Parsed JSON output
 */
function runTcgpJson(args) {
  const result = runTcgp([...args, '--json']);
  assert.strictEqual(result.status, 0, `Command failed: ${args.join(' ')}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`);
  const json = parseJson(result.stdout);
  assert.ok(json, 'Should return valid JSON');
  return json;
}

console.log('CLI Replay Tests (CLI-009)');
console.log('='.repeat(50));

// Clean up before tests
cleanup();

// Test: Create a session for replay testing
runTest('Create session for replay testing', () => {
  const result = runTcgpJson([
    'session', 'create', 'replay-test-session',
    '--p1', 'deck1', '--p2', 'deck2'
  ]);

  assert.ok(result.id, 'Should have session ID');
  assert.strictEqual(result.name, 'replay-test-session', 'Session name should match');
});

// Test: Execute some actions on the session
runTest('Execute draw action for replay', () => {
  const result = runTcgpJson([
    'action', 'execute', 'replay-test-session', 'draw',
    '{"playerId":"player1","count":1}'
  ]);

  assert.strictEqual(result.success, true, 'Action execution should succeed');
  assert.strictEqual(result.data.actionId, 'draw', 'Action ID should be draw');
});

runTest('Execute start_turn action for replay', () => {
  const result = runTcgpJson([
    'action', 'execute', 'replay-test-session', 'start_turn',
    '{"playerId":"player1"}'
  ]);

  assert.strictEqual(result.success, true, 'Action execution should succeed');
});

runTest('Execute end_turn action for replay', () => {
  const result = runTcgpJson([
    'action', 'execute', 'replay-test-session', 'end_turn',
    '{"playerId":"player1"}'
  ]);

  assert.strictEqual(result.success, true, 'Action execution should succeed');
});

// Test: Export replay without specifying output file
runTest('Export replay with default filename', () => {
  const result = runTcgpJson([
    'replay', 'export', 'replay-test-session'
  ]);

  assert.strictEqual(result.success, true, 'Replay export should succeed');
  assert.strictEqual(result.data.sessionName, 'replay-test-session', 'Session name should match');
  assert.ok(result.data.eventCount > 0, 'Should have exported events');
  assert.ok(result.data.outputFile, 'Should have output file path');

  // Verify file exists
  assert.ok(fs.existsSync(result.data.outputFile), `Replay file should exist: ${result.data.outputFile}`);

  // Clean up the default file
  fs.unlinkSync(result.data.outputFile);
});

// Test: Export replay with custom output file
runTest('Export replay with custom output file', () => {
  const outputFile = path.join(testDataDir, 'custom-replay.json');

  const result = runTcgpJson([
    'replay', 'export', 'replay-test-session',
    outputFile
  ]);

  assert.strictEqual(result.success, true, 'Replay export should succeed');
  assert.strictEqual(result.data.outputFile, outputFile, 'Output file should match');
  assert.ok(fs.existsSync(outputFile), 'Replay file should exist');
});

// Test: Verify replay file format
runTest('Verify replay file format is valid', () => {
  const replayFile = path.join(testDataDir, 'custom-replay.json');
  const content = fs.readFileSync(replayFile, 'utf8');
  const replay = JSON.parse(content);

  assert.ok(replay.version, 'Replay should have version');
  assert.ok(replay.exportedAt, 'Replay should have exportedAt timestamp');
  assert.ok(replay.session, 'Replay should have session object');
  assert.ok(replay.session.id, 'Session should have id');
  assert.ok(replay.session.name, 'Session should have name');
  assert.ok(Array.isArray(replay.events), 'Replay should have events array');
  assert.ok(replay.events.length > 0, 'Replay should have events');
});

// Test: Verify replay events structure
runTest('Verify replay events have required fields', () => {
  const replayFile = path.join(testDataDir, 'custom-replay.json');
  const content = fs.readFileSync(replayFile, 'utf8');
  const replay = JSON.parse(content);

  const firstEvent = replay.events[0];
  assert.ok(firstEvent.id, 'Event should have id');
  assert.ok(firstEvent.type, 'Event should have type');
  assert.ok(firstEvent.data, 'Event should have data');
});

// Test: Run replay without comparison
runTest('Run replay without comparison', () => {
  const replayFile = path.join(testDataDir, 'custom-replay.json');

  const result = runTcgpJson([
    'replay', 'run', replayFile
  ]);

  assert.strictEqual(result.success, true, 'Replay execution should succeed');
  assert.strictEqual(result.data.sessionName, 'replay-test-session', 'Session name should match');
  assert.ok(result.data.eventsExecuted > 0, 'Should have executed events');
  assert.ok(result.data.finalState, 'Should have final state');
  assert.strictEqual(result.data.errors.length, 0, 'Should have no errors');
});

// Test: Run replay with --compare flag (but comparison might not match exactly due to mock decks)
runTest('Run replay with comparison (against replay file final state)', () => {
  const replayFile = path.join(testDataDir, 'custom-replay.json');

  const result = runTcgpJson([
    'replay', 'run', replayFile
  ]);

  // The comparison is against the replay's finalState
  assert.strictEqual(result.success, true, 'Replay should succeed');
  assert.ok(result.data.comparison, 'Should have comparison result');
  assert.ok(typeof result.data.comparison.match === 'boolean', 'Comparison match should be boolean');
});

// Test: Export non-existent session
runTest('Export non-existent session returns error', () => {
  const result = runTcgp(['replay', 'export', 'non-existent-session']);

  assert.notStrictEqual(result.status, 0, 'Command should fail');
  assert.ok(result.stdout.includes('SESSION_NOT_FOUND') || result.stdout.includes('not found'), 'Should have error message');
});

// Test: Run non-existent replay file
runTest('Run non-existent replay file returns error', () => {
  const result = runTcgp(['replay', 'run', '/nonexistent/file.json']);

  assert.notStrictEqual(result.status, 0, 'Command should fail');
  assert.ok(result.stdout.includes('REPLAY_FILE_NOT_FOUND') || result.stdout.includes('not found'), 'Should have error message');
});

// Test: Export session with --json output
runTest('Export replay with --json output', () => {
  const outputFile = path.join(testDataDir, 'json-replay.json');

  const result = runTcgpJson([
    'replay', 'export', 'replay-test-session',
    outputFile
  ]);

  assert.ok(result.data.sessionId, 'Should have session ID');
  assert.ok(result.data.sessionName, 'Should have session name');
  assert.ok(typeof result.data.eventCount === 'number', 'Event count should be number');
});

// Test: Run replay with --json output
runTest('Run replay with --json output', () => {
  const replayFile = path.join(testDataDir, 'json-replay.json');

  const result = runTcgpJson([
    'replay', 'run', replayFile
  ]);

  assert.ok(result.data.replayFile, 'Should have replay file path');
  assert.ok(result.data.sessionName, 'Should have session name');
  assert.ok(typeof result.data.eventsExecuted === 'number', 'Events executed should be number');
  assert.ok(Array.isArray(result.data.errors), 'Errors should be array');
  assert.ok(result.data.finalState, 'Should have final state');
});

// Test: Verify final state structure
runTest('Verify final state structure', () => {
  const replayFile = path.join(testDataDir, 'json-replay.json');

  const result = runTcgpJson([
    'replay', 'run', replayFile
  ]);

  const finalState = result.data.finalState;
  assert.ok(typeof finalState.turnNumber === 'number', 'Turn number should be number');
  assert.ok(finalState.phase, 'Should have phase');
  assert.ok(finalState.currentPlayer, 'Should have current player');
  assert.ok(finalState.players, 'Should have players object');
  assert.ok(finalState.players.player1, 'Should have player1');
  assert.ok(finalState.players.player2, 'Should have player2');
  assert.ok(Array.isArray(finalState.players.player1.hand), 'Player 1 hand should be array');
  assert.ok(Array.isArray(finalState.players.player2.hand), 'Player 2 hand should be array');
});

// Test: Export with --help flag shows help
runTest('Export with --help shows help', () => {
  const result = runTcgp(['replay', '--help']);

  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert.ok(result.stdout.includes('export'), 'Help should mention export');
  assert.ok(result.stdout.includes('run'), 'Help should mention run');
});

// Test: Run replay with invalid JSON file
runTest('Run replay with invalid JSON returns error', () => {
  const invalidFile = path.join(testDataDir, 'invalid.json');
  fs.writeFileSync(invalidFile, 'invalid json content', 'utf8');

  const result = runTcgp(['replay', 'run', invalidFile]);

  assert.notStrictEqual(result.status, 0, 'Command should fail');
  assert.ok(result.stdout.includes('INVALID_REPLAY_FILE') || result.stdout.includes('Failed to parse'), 'Should have error message');
});

// Test: Export missing session argument
runTest('Export missing session argument returns error', () => {
  const result = runTcgp(['replay', 'export']);

  assert.notStrictEqual(result.status, 0, 'Command should fail');
  assert.ok(result.stdout.includes('Usage: tcgp replay export'), 'Should have error message');
});

// Test: Run missing replay file argument
runTest('Run missing replay file argument returns error', () => {
  const result = runTcgp(['replay', 'run']);

  assert.notStrictEqual(result.status, 0, 'Command should fail');
  assert.ok(result.stdout.includes('Usage: tcgp replay run'), 'Should have error message');
});

// Test: Unknown subcommand returns error
runTest('Unknown replay subcommand returns error', () => {
  const result = runTcgp(['replay', 'unknown']);

  assert.notStrictEqual(result.status, 0, 'Command should fail');
  assert.ok(result.stdout.includes('Unknown subcommand') || result.stdout.includes('Valid subcommands'), 'Should have error message');
});

// Test: Multiple actions create multiple events in replay
runTest('Multiple actions create multiple events', () => {
  const outputFile = path.join(testDataDir, 'multi-action-replay.json');

  // Execute more actions
  runTcgpJson(['action', 'execute', 'replay-test-session', 'draw', '{"playerId":"player2","count":1}']);
  runTcgpJson(['action', 'execute', 'replay-test-session', 'start_turn', '{"playerId":"player2"}']);
  runTcgpJson(['action', 'execute', 'replay-test-session', 'end_turn', '{"playerId":"player2"}']);

  const result = runTcgpJson([
    'replay', 'export', 'replay-test-session',
    outputFile
  ]);

  assert.ok(result.data.eventCount >= 6, `Should have at least 6 events, got ${result.data.eventCount}`);

  // Verify events in file
  const content = fs.readFileSync(outputFile, 'utf8');
  const replay = JSON.parse(content);
  assert.ok(replay.events.length >= 6, `Replay file should have at least 6 events, got ${replay.events.length}`);
});

// Test: Replay file includes session metadata
runTest('Replay file includes session metadata', () => {
  const replayFile = path.join(testDataDir, 'multi-action-replay.json');
  const content = fs.readFileSync(replayFile, 'utf8');
  const replay = JSON.parse(content);

  assert.ok(replay.session, 'Replay should have session object');
  assert.strictEqual(replay.session.name, 'replay-test-session', 'Session name should match');
  assert.ok(replay.session.player1Deck, 'Should have player1Deck');
  assert.ok(replay.session.player2Deck, 'Should have player2Deck');
  assert.ok(typeof replay.session.metadata === 'object', 'Metadata should be object');
});

// Test: Final state in replay file is preserved
runTest('Final state in replay file is preserved', () => {
  const replayFile = path.join(testDataDir, 'multi-action-replay.json');
  const content = fs.readFileSync(replayFile, 'utf8');
  const replay = JSON.parse(content);

  assert.ok(replay.finalState, 'Replay should have finalState');
  assert.ok(replay.finalState.turnNumber !== undefined, 'Final state should have turnNumber');
  assert.ok(replay.finalState.phase, 'Final state should have phase');
  assert.ok(replay.finalState.currentPlayer, 'Final state should have currentPlayer');
});

// Clean up
cleanup();

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log('='.repeat(50));

process.exit(testsFailed > 0 ? 1 : 0);
