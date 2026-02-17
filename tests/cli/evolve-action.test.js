/**
 * Tests for Action Execution (ACT-005)
 *
 * Tests that verify evolve action:
 * - Evolves a Pokemon in active or bench from Basic to Stage 1 or Stage 2
 * - Returns error INVALID_EVOLUTION if card is not valid evolution
 * - Returns error ALREADY_EVOLVED if Pokemon already evolved this turn
 * - Returns error FIRST_TURN_RESTRICTION if it's turn 0
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

// ==================== TESTS ====================

console.log('=== Testing ACT-005: evolve action ===\n');

// Test 1: AC1 - evolve action executes without error
runTest('AC1: evolve action executes without error for active Pokemon', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Evolve active Pokemon from Basic to Stage 1
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(evolveResult.status, 0, 'evolve should succeed');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.actionId, 'evolve', 'Should have correct actionId');
    assert.strictEqual(json.pokemonId, 'B1-155', 'Should have correct pokemonId');
    assert.strictEqual(json.evolutionCardId, 'B1-157', 'Should have correct evolutionCardId');
    assert.strictEqual(json.pokemon.name, 'Zweilous', 'Pokemon should be evolved to Zweilous');
    assert.strictEqual(json.currentStage, 'Stage 1', 'Pokemon should be Stage 1');
    assert.strictEqual(json.previousStage, 'Basic', 'Previous stage should be Basic');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 2: AC1 - evolve action executes without error for bench Pokemon
runTest('AC1: evolve action executes without error for bench Pokemon', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Evolve bench Pokemon from Basic to Stage 1
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155-2","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(evolveResult.status, 0, 'evolve should succeed');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.pokemonId, 'B1-155-2', 'Should have correct pokemonId');
    assert.strictEqual(json.pokemon.name, 'Zweilous', 'Pokemon should be evolved to Zweilous');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 3: AC2 - INVALID_EVOLUTION error for non-evolution card
runTest('AC2: INVALID_EVOLUTION error when card is not in hand', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Try to evolve with non-existent card
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"NONEXISTENT"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'CARD_NOT_IN_HAND', 'Should have CARD_NOT_IN_HAND reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 4: AC2 - INVALID_EVOLUTION error for invalid evolution card (Basic Pokemon)
runTest('AC2: INVALID_EVOLUTION error when card is Basic Pokemon', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Try to evolve with Basic Pokemon (not evolution card)
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-155-hand"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_EVOLUTION', 'Should have INVALID_EVOLUTION reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 5: AC2 - INVALID_EVOLUTION error for wrong evolution chain
runTest('AC2: INVALID_EVOLUTION error for wrong evolution chain (Stage 2 on Basic)', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Try to evolve Basic directly to Stage 2
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-159"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_EVOLUTION', 'Should have INVALID_EVOLUTION reason');
    assert(json.message.includes('Stage 2 evolution requires Stage 1'), 'Should mention stage requirement');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 6: AC3 - ALREADY_EVOLVED error
runTest('AC3: ALREADY_EVOLVED error when Pokemon already evolved this turn', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // First evolution: Basic to Stage 1
    const evolveResult1 = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(evolveResult1.status, 0, 'First evolve should succeed');

    // Try to evolve the same Pokemon again in the same turn
    const evolveResult2 = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-159"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult2.status, 0, 'Second evolve should fail');

    const json = parseJson(evolveResult2.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'ALREADY_EVOLVED', 'Should have ALREADY_EVOLVED reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 7: AC4 - FIRST_TURN_RESTRICTION error
runTest('AC4: FIRST_TURN_RESTRICTION error on turn 0', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // Try to evolve on turn 0
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail on turn 0');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'FIRST_TURN_RESTRICTION', 'Should have FIRST_TURN_RESTRICTION reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 8: WRONG_PHASE error
runTest('WRONG_PHASE error when not in main phase', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0) - phase should be 'main' after start_turn
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // Phase should be 'main', so this should work
    // But let's check state after start_turn
    const stateResult = execTcgp(['--json', 'session', 'show', sessionName]);
    const stateJson = parseJson(stateResult.stdout);
    // After start_turn, phase should be 'main', so let's proceed

    // End turn to go to draw phase
    const endResult = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult.status, 0, 'end_turn should succeed');

    // Try to evolve during draw phase
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player2","pokemonId":"A3a-042","evolutionCardId":"A3a-044"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail during draw phase');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'WRONG_PHASE', 'Should have WRONG_PHASE reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 9: WRONG_TURN error
runTest('WRONG_TURN error when not current player', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Try to evolve player2's Pokemon during player1's turn
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player2","pokemonId":"A3a-042","evolutionCardId":"A3a-044"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail for wrong player');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'WRONG_TURN', 'Should have WRONG_TURN reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 10: Evolution chain: Basic -> Stage 1 -> Stage 2
runTest('Evolution chain: Basic to Stage 1 to Stage 2 across turns', () => {
  const sessionName = createTestSession();

  try {
    // Turn 0
    const startResult1 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult1.status, 0, 'start_turn should succeed');
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Turn 1
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Turn 2: Evolve Basic to Stage 1
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    const evolveResult1 = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(evolveResult1.status, 0, 'First evolve should succeed');

    const json1 = parseJson(evolveResult1.stdout);
    assert.strictEqual(json1.pokemon.name, 'Zweilous', 'Pokemon should be Zweilous (Stage 1)');

    const endResult3 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult3.status, 0, 'end_turn should succeed');

    // Turn 3
    const startResult4 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult4.status, 0, 'start_turn should succeed');
    const endResult4 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult4.status, 0, 'end_turn should succeed');

    // Turn 4: Evolve Stage 1 to Stage 2
    const startResult5 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult5.status, 0, 'start_turn should succeed');

    const evolveResult2 = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-159"}', '--session', sessionName]);
    assert.strictEqual(evolveResult2.status, 0, 'Second evolve should succeed');

    const json2 = parseJson(evolveResult2.stdout);
    assert.strictEqual(json2.pokemon.name, 'Hydreigon', 'Pokemon should be Hydreigon (Stage 2)');
    assert.strictEqual(json2.currentStage, 'Stage 2', 'Pokemon should be Stage 2');
    assert.strictEqual(json2.previousStage, 'Stage 1', 'Previous stage should be Stage 1');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 11: player2 can evolve on their turn
runTest('player2 can evolve their Pokemon on their turn', () => {
  const sessionName = createTestSession();

  try {
    // Turn 0
    const startResult1 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult1.status, 0, 'start_turn should succeed');
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Turn 1: player2's turn
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Turn 2
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');
    const endResult3 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult3.status, 0, 'end_turn should succeed');

    // Turn 3: player2 can now evolve
    const startResult4 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult4.status, 0, 'start_turn should succeed');

    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player2","pokemonId":"A3a-042","evolutionCardId":"A3a-044"}', '--session', sessionName]);
    assert.strictEqual(evolveResult.status, 0, 'evolve should succeed');

    const json = parseJson(evolveResult.stdout);
    assert.strictEqual(json.playerId, 'player2', 'Should be player2');
    assert.strictEqual(json.pokemon.name, 'Naganadel', 'Pokemon should be Naganadel');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 12: INVALID_TARGET error when Pokemon not found
runTest('INVALID_TARGET error when Pokemon not found', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Try to evolve non-existent Pokemon
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"NONEXISTENT","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.notStrictEqual(evolveResult.status, 0, 'evolve should fail');

    const json = parseJson(evolveResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.reason, 'INVALID_TARGET', 'Should have INVALID_TARGET reason');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 13: evolve removes card from hand
runTest('evolve removes evolution card from hand', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 (turn 0)
    const startResult = execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult.status, 0, 'start_turn should succeed');

    // End turn for player1
    const endResult1 = execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(endResult1.status, 0, 'end_turn should succeed');

    // Start turn for player2 (turn 1)
    const startResult2 = execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(startResult2.status, 0, 'start_turn should succeed');

    // End turn for player2
    const endResult2 = execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    assert.strictEqual(endResult2.status, 0, 'end_turn should succeed');

    // Start turn for player1 again (turn 2)
    const startResult3 = execTcgp(['--json', 'action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    assert.strictEqual(startResult3.status, 0, 'start_turn should succeed');

    // Get initial hand size from start_turn result
    const startJson = parseJson(startResult3.stdout);
    const initialHandSize = startJson.handSize;

    // Evolve
    const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(evolveResult.status, 0, 'evolve should succeed');

    const json = parseJson(evolveResult.stdout);
    assert.strictEqual(json.handSize, initialHandSize - 1, 'Hand size should decrease by 1');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 14: JSON output format
runTest('evolve action returns JSON output with --json flag', () => {
  const sessionName = createTestSession();

  try {
    // Setup turns
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Test JSON output
    const jsonResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(jsonResult.status, 0, 'evolve should succeed with --json');
    const json = parseJson(jsonResult.stdout);
    assert(json !== null, 'Should return valid JSON');
    assert.strictEqual(json.actionId, 'evolve');
  } finally {
    cleanupSession(sessionName);
  }
});

// Test 15: Plain text output format
runTest('evolve action returns plain text output without --json flag', () => {
  const sessionName = createTestSession();

  try {
    // Setup turns
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Test plain text output
    const textResult = execTcgp(['action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
    assert.strictEqual(textResult.status, 0, 'evolve should succeed with plain text');
    assert(textResult.stdout.includes('Zweilous'), 'Plain text should include Pokemon name');
    assert(textResult.stdout.includes('Deino'), 'Plain text should include original Pokemon name');
  } finally {
    cleanupSession(sessionName);
  }
});

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);
