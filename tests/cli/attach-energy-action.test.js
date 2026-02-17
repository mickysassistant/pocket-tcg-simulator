/**
 * Tests for Action Execution (ACT-003)
 *
 * Tests that verify attach_energy action:
 * - Attaches energy from Energy Zone to target Pokemon
 * - Returns error ENERGY_ALREADY_ATTACHED if already attached this turn
 * - Returns error INVALID_TARGET if Pokemon not in active or banque
 * - Returns error WRONG_PHASE if not main phase
 * - Works correctly in both active and banque
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
  try {
    execTcgp(['session', 'close', sessionName]);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// =============================================================================
// TESTS
// =============================================================================

// AC1: tcgp action attach_energy executes without error
runTest('AC1: attach_energy executes without error', () => {
  const sessionName = createTestSession();
  try {
    // First, start player1 turn and end it (player1 cannot attach on first turn due to rule)
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    // Start player2 turn (can attach on turn 1)
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    // Then attach energy
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName]);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    assert(result.stdout.includes('Attached'), 'Should show success message');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC1: attach_energy returns target Pokemon with energy', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert(json.targetPokemon, 'Should include targetPokemon');
    assert.strictEqual(json.targetPokemon.id, 'A3a-042', 'Target Pokemon ID should be A3a-042');
    assert(json.targetPokemon.attachedEnergy, 'Should include attachedEnergy array');
    assert(json.targetPokemon.attachedEnergy.length > 0, 'Should have at least one energy attached');
    assert(json.energy, 'Should include the attached energy');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC2: Error ENERGY_ALREADY_ATTACHED if already attached this turn
runTest('AC2: ENERGY_ALREADY_ATTACHED error on second attach', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    // First attach should succeed
    const result1 = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName, '--json']);
    assert.strictEqual(result1.status, 0, 'First attach should succeed');

    // Second attach should fail
    const result2 = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName, '--json']);
    assert(result2.status !== 0, 'Second attach should fail');
    const json2 = parseJson(result2.stdout);
    assert(json2, 'Should return valid JSON');
    assert.strictEqual(json2.reason, 'ENERGY_ALREADY_ATTACHED', 'Should have ENERGY_ALREADY_ATTACHED reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC2: ENERGY_ALREADY_ATTACHED after new turn', () => {
  const sessionName = createTestSession();
  try {
    // Turn 1: player1 (cannot attach - first turn restriction)
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Turn 2: player2
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // Turn 3: player1 - should be able to attach now (not first turn anymore)
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player1","targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Should be able to attach again on new turn');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert(json.targetPokemon.attachedEnergy.length >= 1, 'Should have energy from previous turns');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC3: Error INVALID_TARGET if Pokemon not in active or banque
runTest('AC3a: INVALID_TARGET for non-existent Pokemon', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"NON-EXISTENT"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail for non-existent Pokemon');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_TARGET', 'Should have INVALID_TARGET reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC3b: INVALID_TARGET for Pokemon owned by opponent', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    // Try to attach to player1's Pokemon
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail for opponent Pokemon');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_TARGET', 'Should have INVALID_TARGET reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC4: Error WRONG_PHASE if not main phase
runTest('AC4a: WRONG_PHASE in draw phase', () => {
  const sessionName = createTestSession();
  try {
    // Create a session and manually set phase to draw by not starting turn
    // Actually, we need to start a turn then end it to get to draw phase
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    // Now phase should be 'draw', try to attach energy
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player1","targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail in draw phase');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'WRONG_PHASE', 'Should have WRONG_PHASE reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC4b: WRONG_PHASE error includes current and expected phase', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player1","targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail in draw phase');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'WRONG_PHASE', 'Should have WRONG_PHASE reason');
    assert.strictEqual(json.currentPhase, 'draw', 'Should indicate current phase');
    assert.strictEqual(json.expectedPhase, 'main', 'Should indicate expected phase');
  } finally {
    cleanupSession(sessionName);
  }
});

// Additional tests
runTest('attach_energy validates payload (missing playerId)', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with missing playerId');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('attach_energy validates payload (missing targetPokemonId)', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player1"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with missing targetPokemonId');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('attach_energy validates payload (invalid playerId)', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player3","targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with invalid playerId');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('attach_energy validates payload (invalid JSON)', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', 'not-valid-json', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail with invalid JSON');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_JSON', 'Should have INVALID_JSON reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('attach_energy fails with WRONG_TURN when not current player', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    // Try to attach for player1 when it's player2's turn
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player1","targetPokemonId":"B1-155"}', '--session', sessionName, '--json']);
    assert(result.status !== 0, 'Should fail when not current player');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'WRONG_TURN', 'Should have WRONG_TURN reason');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('attach_energy output format without --json flag', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName]);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    assert(result.stdout.includes('Attached'), 'Should show success message');
    assert(result.stdout.includes('Energy:'), 'Should show energy');
    assert(result.stdout.includes('Target:'), 'Should show target Pokemon');
    assert(result.stdout.includes('Total Energy:'), 'Should show total energy count');
    assert(result.stdout.includes('State saved:'), 'Should show state saved');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('State is saved after attach_energy', () => {
  const sessionName = createTestSession();
  try {
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert(json.stateId, 'Should have stateId');
    assert(json.savedAt, 'Should have savedAt timestamp');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('attach_energy works for player2', () => {
  const sessionName = createTestSession();
  try {
    // Start player1 turn and end it
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    // Start player2 turn
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    const result = execTcgp(['action', 'attach_energy', '{"playerId":"player2","targetPokemonId":"A3a-042"}', '--session', sessionName, '--json']);
    assert.strictEqual(result.status, 0, 'Command should succeed');
    const json = parseJson(result.stdout);
    assert(json, 'Should return valid JSON');
    assert.strictEqual(json.playerId, 'player2', 'Should be player2');
    assert(json.targetPokemon, 'Should include targetPokemon');
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
