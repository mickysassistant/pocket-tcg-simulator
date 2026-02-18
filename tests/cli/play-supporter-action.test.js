/**
 * Tests for Action Execution (ACT-008)
 *
 * Tests that verify play_supporter action:
 * - Executes a Supporter card play from hand
 * - Professor's Research discards hand and draws 2 cards
 * - Copycat draws as many cards as opponent has in hand
 * - Error SUPPORTER_ALREADY_PLAYED if already played a supporter this turn
 * - Error CARD_NOT_IN_HAND if card not in hand
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

// === Tests ===

// AC1: play_supporter executes without error
runTest('AC1: play_supporter executes without error', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play supporter
    const result = execTcgp(['action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.ok(result.stdout.includes("Professor's Research"), 'Output should show supporter name');
    assert.ok(result.stdout.includes('A4b-373'), 'Output should show card ID');
    assert.ok(result.stdout.includes('Played'), 'Output should indicate action completed');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('AC1: play_supporter works with JSON output', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play supporter with JSON output
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.actionId, 'play_supporter', 'Action ID should be play_supporter');
    assert.strictEqual(output.cardId, 'A4b-373', 'Card ID should match');
    assert.strictEqual(output.supporterName, "Professor's Research", 'Supporter name should match');
    assert.ok(output.handSize !== undefined, 'Should include hand size');
    assert.ok(output.effect !== undefined, 'Should include effect');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC2: Professor's Research discards hand and draws 2
runTest('AC2: Professor\'s Research discards hand and draws 2', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play Professor's Research
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.effect.effect, 'professor_research', 'Effect should be professor_research');
    assert.ok(output.effect.cardsDiscarded > 0, 'Should discard cards from hand');
    assert.strictEqual(output.effect.cardsDrawn, 2, 'Should draw exactly 2 cards');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC2 continued: verify hand size after Professor's Research
runTest('AC2: Professor\'s Research results in correct hand size', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Get initial hand size
    const beforeResult = execTcgp(['--json', 'action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    const beforeOutput = parseJson(beforeResult.stdout);
    const initialHandSize = beforeOutput.handSize || 0;

    // Play Professor's Research
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    // Hand should be: initial hand + 1 (from start_turn draw) - discarded + 2 drawn
    // Since Professor's Research discards entire hand, final hand size should be 2
    assert.strictEqual(output.handSize, 2, 'Hand size should be exactly 2 after Professor\'s Research');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC3: Copycat draws as many cards as opponent has in hand
runTest('AC3: Copycat draws as many cards as opponent has in hand', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1 to get cards in hand
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // End player1's turn
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Start player2's turn (draws 1 card, now has cards in hand)
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // End player2's turn
    execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // Start player1's turn again
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Get player2's hand size
    const stateResult = execTcgp(['--json', 'session', 'show', sessionName]);
    // We can't directly get hand size from session show, so we'll just test the action

    // Play Copycat
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A1a-045"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.strictEqual(output.effect.effect, 'copycat', 'Effect should be copycat');
    assert.ok(output.effect.opponentHandSize >= 0, 'Should track opponent hand size');
    assert.strictEqual(output.effect.cardsDrawn, output.effect.opponentHandSize, 'Cards drawn should equal opponent hand size');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC4: Error SUPPORTER_ALREADY_PLAYED if already played this turn
runTest('AC4: SUPPORTER_ALREADY_PLAYED error when trying to play second supporter', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play first supporter
    const firstResult = execTcgp(['action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    assert.strictEqual(firstResult.status, 0, 'First supporter should succeed');

    // Try to play second supporter
    const secondResult = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A1a-045"}', '--session', sessionName]);
    const output = parseJson(secondResult.stdout);

    assert.notStrictEqual(secondResult.status, 0, 'Second supporter should fail');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.error, 'Supporter already played this turn', 'Should show error message');
    assert.strictEqual(output.reason, 'SUPPORTER_ALREADY_PLAYED', 'Error reason should be SUPPORTER_ALREADY_PLAYED');
  } finally {
    cleanupSession(sessionName);
  }
});

// AC5: Error CARD_NOT_IN_HAND if card not in hand
runTest('AC5: CARD_NOT_IN_HAND error when card not in hand', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Try to play supporter with non-existent card ID
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"nonexistent-id"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.notStrictEqual(result.status, 0, 'Should fail when card not in hand');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.reason, 'CARD_NOT_IN_HAND', 'Error reason should be CARD_NOT_IN_HAND');
  } finally {
    cleanupSession(sessionName);
  }
});

// Additional tests for edge cases and other supporters

runTest('Generic supporter logs effect but does nothing special', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play generic supporter
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A1a-047"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.strictEqual(output.effect.effect, 'generic', 'Effect should be generic');
    assert.ok(output.effect.message, 'Should have a message for generic effect');
    assert.ok(output.effect.message.includes('Generic Supporter'), 'Message should mention the supporter name');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Cyrus supporter logs not applicable in Pocket TCG', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player2's turn (player2 has Cyrus in hand)
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // Play Cyrus
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player2","cardId":"A1a-046"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.strictEqual(output.effect.effect, 'cyrus', 'Effect should be cyrus');
    assert.ok(output.effect.message, 'Should have a message for Cyrus effect');
    assert.ok(output.effect.message.includes('Pocket TCG'), 'Message should mention Pocket TCG');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Error WRONG_PHASE when not in main phase', () => {
  const sessionName = createTestSession();

  try {
    // Don't start turn, phase is 'setup'
    // Try to play supporter
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.notStrictEqual(result.status, 0, 'Should fail when not in main phase');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.reason, 'WRONG_PHASE', 'Error reason should be WRONG_PHASE');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Error WRONG_TURN when not current player', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Try to play supporter as player2
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player2","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.notStrictEqual(result.status, 0, 'Should fail when not current player');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.reason, 'WRONG_TURN', 'Error reason should be WRONG_TURN');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Error NOT_SUPPORTER when card is not a Supporter', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Try to play a Pokemon card as a supporter
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"B1-155-hand"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.notStrictEqual(result.status, 0, 'Should fail when card is not a Supporter');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.reason, 'NOT_SUPPORTER', 'Error reason should be NOT_SUPPORTER');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Supporter can be played again after turn ends', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play supporter (Copycat, which doesn't discard hand)
    const firstResult = execTcgp(['action', 'play_supporter', '{"playerId":"player1","cardId":"A1a-045"}', '--session', sessionName]);
    assert.strictEqual(firstResult.status, 0, 'First supporter should succeed');

    // End player1's turn
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Start player2's turn
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // End player2's turn
    execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // Start player1's turn again
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play supporter again (should succeed because new turn)
    // Use Generic Supporter which is still in hand (not discarded by Copycat)
    const secondResult = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A1a-047"}', '--session', sessionName]);
    const output = parseJson(secondResult.stdout);

    assert.strictEqual(secondResult.status, 0, 'Second supporter on new turn should succeed');
    assert.ok(output, 'Should have valid JSON output');
    assert.strictEqual(output.actionId, 'play_supporter', 'Should execute play_supporter');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('State is saved after play_supporter', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play supporter
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.ok(output.stateId, 'Should have stateId after saving');
    assert.ok(output.savedAt, 'Should have savedAt timestamp');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('Discard pile size increases after playing supporter', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);

    // Play Professor's Research (which discards entire hand)
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player1","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed');
    assert.ok(output.discardPileSize > 0, 'Discard pile should have cards');
  } finally {
    cleanupSession(sessionName);
  }
});

runTest('play_supporter works for player2', () => {
  const sessionName = createTestSession();

  try {
    // Start turn for player1
    execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
    // End player1's turn
    execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
    // Start player2's turn
    execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);

    // Play supporter as player2
    const result = execTcgp(['--json', 'action', 'play_supporter', '{"playerId":"player2","cardId":"A4b-373"}', '--session', sessionName]);
    const output = parseJson(result.stdout);

    assert.strictEqual(result.status, 0, 'play_supporter should succeed for player2');
    assert.strictEqual(output.playerId, 'player2', 'Player ID should be player2');
    assert.strictEqual(output.supporterName, "Professor's Research", 'Supporter name should match');
  } finally {
    cleanupSession(sessionName);
  }
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
