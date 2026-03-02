/**
 * Test: Turn-Limit Resolution Rule (R006)
 * 
 * Tests the rule that the game ends in a DRAW when the turn limit is reached.
 * 
 * Rule-Locked Behavior (from limite-de-turnos.md):
 * - PvP battles: max 30 turns
 * - Solo battles: max 50 turns
 * - When turn limit is reached, game ends in DRAW (tie)
 * - Turn 30 IS played (check happens after turn completion)
 * - Turn counter is 0-indexed (turn 0 = turn 1, turn 29 = turn 30)
 * 
 * Acceptance Criteria:
 * 1. At configured turn limit, winner or draw outcome matches the locked rule definition.
 * 2. Before turn limit, no premature turn-limit winner is declared.
 * 3. Beyond turn limit, result remains stable and deterministic.
 * 4. Tests for turn-limit resolution pass.
 * 5. Typecheck passes (N/A - plain JavaScript project)
 */

const { createGame } = require('../../src/index');

// Test utility functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

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
  }
}

// Helper: Create a simple deck of cards
function createDeck(size) {
  return Array.from({ length: size }, (_, i) => ({ id: i, name: `Card ${i}` }));
}

// Helper: Create game with custom turn limit
function createGameWithTurnLimit(turnLimit = 30) {
  const p1Deck = createDeck(60);
  const p2Deck = createDeck(60);
  return createGame(p1Deck, p2Deck, turnLimit);
}

// Helper: Simulate N turns
function simulateNTurns(game, turnCount) {
  for (let i = 0; i < turnCount; i++) {
    const currentPlayer = game.gameState.currentPlayer;
    game.turnManager.startTurn(currentPlayer);
    game.turnManager.endTurn();
  }
}

// =============================================================================
// TESTS
// =============================================================================

// AC1: At configured turn limit, winner or draw outcome matches locked rule

// Test 1: At turn limit (30), game ends in DRAW for PvP mode
runTest('AC1.1 - PvP mode (30 turns) - game ends in DRAW at limit', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate 30 turns
  simulateNTurns(game, 30);
  
  // Check turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 30, 'Turn number should be 30 after 30 turns');
  
  // Check win condition
  const winResult = game.winCondition.checkWinCondition();
  
  // Should return draw result
  assert(winResult !== null, 'Win condition should be detected at turn limit');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
  assert(winResult.message.includes('draw'), 'Message should indicate draw');
});

// Test 2: At turn limit (50), game ends in DRAW for solo mode
runTest('AC1.2 - Solo mode (50 turns) - game ends in DRAW at limit', () => {
  const game = createGameWithTurnLimit(50);
  
  // Simulate 50 turns
  simulateNTurns(game, 50);
  
  // Check turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 50, 'Turn number should be 50 after 50 turns');
  
  // Check win condition
  const winResult = game.winCondition.checkWinCondition();
  
  // Should return draw result
  assert(winResult !== null, 'Win condition should be detected at turn limit');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
});

// Test 3: At exact turn boundary (30), endTurn returns win condition
runTest('AC1.3 - endTurn returns win condition at turn limit', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate 29 turns (no win condition yet)
  simulateNTurns(game, 29);
  let winResult = game.winCondition.checkWinCondition();
  assert(winResult === null, 'No win condition before turn 30');
  
  // Play turn 30 (should detect win condition during endTurn)
  game.turnManager.startTurn(game.gameState.currentPlayer);
  winResult = game.turnManager.endTurn();
  
  // Should return draw result
  assert(winResult !== null, 'endTurn should return win condition at turn 30');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
});

// AC2: Before turn limit, no premature turn-limit winner is declared

// Test 4: Before turn limit (turn 29), no win condition for PvP
runTest('AC2.1 - PvP mode - no win condition at turn 29 (before limit)', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate 29 turns (before limit)
  simulateNTurns(game, 29);
  
  // Check turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 29, 'Turn number should be 29');
  
  // Check win condition
  const winResult = game.winCondition.checkWinCondition();
  
  // Should return null (game continues)
  assert(winResult === null, 'No win condition should be detected before turn limit');
});

// Test 4b: At turn limit (turn 30), win condition detected for PvP
runTest('AC2.1b - PvP mode - win condition detected at turn 30 (at limit)', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate 30 turns
  simulateNTurns(game, 30);
  
  // Check turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 30, 'Turn number should be 30');
  
  // Check win condition
  const winResult = game.winCondition.checkWinCondition();
  
  // Should NOT return null (game ended at limit)
  assert(winResult !== null, 'Win condition should be detected at turn limit');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
});

// Test 5: Before turn limit (turn 49), no win condition for solo
runTest('AC2.2 - Solo mode - no win condition at turn 49 (before limit)', () => {
  const game = createGameWithTurnLimit(50);
  
  // Simulate 49 turns (before limit)
  simulateNTurns(game, 49);
  
  // Check turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 49, 'Turn number should be 49');
  
  // Check win condition
  const winResult = game.winCondition.checkWinCondition();
  
  // Should return null (game continues)
  assert(winResult === null, 'No win condition should be detected before turn limit');
});

// Test 5b: At turn limit (turn 50), win condition detected for solo
runTest('AC2.2b - Solo mode - win condition detected at turn 50 (at limit)', () => {
  const game = createGameWithTurnLimit(50);
  
  // Simulate 50 turns
  simulateNTurns(game, 50);
  
  // Check turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 50, 'Turn number should be 50');
  
  // Check win condition
  const winResult = game.winCondition.checkWinCondition();
  
  // Should NOT return null (game ended at limit)
  assert(winResult !== null, 'Win condition should be detected at turn limit');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
});

// Test 6: Early turns (turns 0-10) always return no win condition
runTest('AC2.3 - Early turns (0-10) - no win condition', () => {
  const game = createGameWithTurnLimit(30);
  
  // Check each early turn
  for (let turn = 0; turn <= 10; turn++) {
    simulateNTurns(game, 1);
    const winResult = game.winCondition.checkWinCondition();
    assert(winResult === null, `No win condition at turn ${turn}`);
  }
});

// Test 7: Mid-game turns (turns 10-20) always return no win condition
runTest('AC2.4 - Mid-game turns (10-20) - no win condition', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate to turn 10
  simulateNTurns(game, 10);
  
  // Check mid-game turns
  for (let turn = 11; turn <= 20; turn++) {
    simulateNTurns(game, 1);
    const winResult = game.winCondition.checkWinCondition();
    assert(winResult === null, `No win condition at turn ${turn}`);
  }
});

// Test 8: Late turns before limit (turns 20-29) - win condition at 30
runTest('AC2.5 - Late turns (20-29) - no win condition before limit, win condition at 30', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate to turn 20
  simulateNTurns(game, 20);
  
  // Check late turns before limit (21-29)
  for (let turn = 21; turn <= 29; turn++) {
    simulateNTurns(game, 1);
    const winResult = game.winCondition.checkWinCondition();
    assert(winResult === null, `No win condition at turn ${turn}`);
  }
  
  // At turn 30, win condition should be detected
  simulateNTurns(game, 1);
  const winResult = game.winCondition.checkWinCondition();
  assert(winResult !== null, 'Win condition should be detected at turn 30');
});

// Test 9: endTurn returns null before turn limit, returns win condition at limit
runTest('AC2.6 - endTurn returns null before turn limit, returns win condition at limit', () => {
  const game = createGameWithTurnLimit(30);
  
  // Play turns 0-29 and check endTurn return value (should be null)
  for (let i = 0; i < 29; i++) {
    game.turnManager.startTurn(game.gameState.currentPlayer);
    const winResult = game.turnManager.endTurn();
    assert(winResult === null, `endTurn should return null at turn ${i}`);
  }
  
  // Play turn 30, endTurn should return win condition
  game.turnManager.startTurn(game.gameState.currentPlayer);
  const winResult = game.turnManager.endTurn();
  assert(winResult !== null, 'endTurn should return win condition at turn 30');
});

// AC3: Beyond turn limit, result remains stable and deterministic

// Test 10: After turn limit (turn 30+), still returns DRAW consistently
runTest('AC3.1 - Beyond turn limit (turns 30-39) - consistently returns DRAW', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate to turn 30 (limit reached)
  simulateNTurns(game, 30);
  
  // Check win condition is detected
  let winResult = game.winCondition.checkWinCondition();
  assert(winResult !== null, 'Win condition should be detected at turn 30');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
  
  // Check turns beyond limit remain deterministic
  for (let turn = 31; turn <= 40; turn++) {
    // Note: In a real game, we wouldn't continue after limit, but testing determinism
    winResult = game.winCondition.checkWinCondition();
    assert(winResult !== null, 'Win condition should still be detected');
    assertEqual(winResult.winner, null, 'Winner should remain null (draw)');
    assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should remain turn_limit_draw');
    
    // Simulate another turn (even though game would be over)
    game.turnManager.startTurn(game.gameState.currentPlayer);
    game.turnManager.endTurn();
  }
});

// Test 11: Multiple checkWinCondition calls return identical results
runTest('AC3.2 - Multiple checkWinCondition calls return identical results at limit', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate to turn 30 (at limit)
  simulateNTurns(game, 30);
  
  // Call checkWinCondition multiple times
  const result1 = game.winCondition.checkWinCondition();
  const result2 = game.winCondition.checkWinCondition();
  const result3 = game.winCondition.checkWinCondition();
  
  // All results should be identical
  assertEqual(result1.winner, result2.winner, 'Winner should be consistent');
  assertEqual(result1.reason, result2.reason, 'Reason should be consistent');
  assertEqual(result2.winner, result3.winner, 'Winner should be consistent');
  assertEqual(result2.reason, result3.reason, 'Reason should be consistent');
});

// Test 12: Turn limit boundary check (turn 30)
runTest('AC3.3 - Turn limit boundary: no win condition before turn 30, win condition at 30', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate 29 turns (before limit)
  simulateNTurns(game, 29);
  
  // At turn 29, no win condition yet
  let winResult = game.winCondition.checkWinCondition();
  assert(winResult === null, 'No win condition at turn 29 (before limit)');
  
  // Complete turn 30
  game.turnManager.startTurn(game.gameState.currentPlayer);
  winResult = game.turnManager.endTurn();
  
  // At turn 30, win condition detected
  assert(winResult !== null, 'Win condition detected at turn 30 completion');
  assertEqual(winResult.winner, null, 'Winner should be null (draw)');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
  
  // Verify turn number
  const turnInfo = game.gameState.getCurrentTurnInfo();
  assertEqual(turnInfo.turnNumber, 30, 'Turn number should be 30');
});

// Additional tests

// Test 13: getTurnLimit returns configured limit
runTest('getTurnLimit returns configured limit', () => {
  const game30 = createGameWithTurnLimit(30);
  assertEqual(game30.winCondition.getTurnLimit(), 30, 'PvP limit should be 30');
  
  const game50 = createGameWithTurnLimit(50);
  assertEqual(game50.winCondition.getTurnLimit(), 50, 'Solo limit should be 50');
});

// Test 14: setTurnLimit changes the limit
runTest('setTurnLimit changes the limit', () => {
  const game = createGameWithTurnLimit(30);
  
  // Initial limit
  assertEqual(game.winCondition.getTurnLimit(), 30, 'Initial limit should be 30');
  
  // Change limit
  game.winCondition.setTurnLimit(25);
  assertEqual(game.winCondition.getTurnLimit(), 25, 'Updated limit should be 25');
  
  // Simulate 25 turns (at new limit)
  simulateNTurns(game, 25);
  
  // Win condition should now be detected
  const winResult = game.winCondition.checkWinCondition();
  assert(winResult !== null, 'Win condition should be detected at new limit');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Reason should be turn_limit_draw');
});

// Test 15: isTurnLimitReached utility method
runTest('isTurnLimitReached utility method works correctly', () => {
  const game = createGameWithTurnLimit(30);
  
  // Below limit
  assert(!game.winCondition.isTurnLimitReached(29), 'Turn 29 should not reach limit');
  
  // At limit
  assert(game.winCondition.isTurnLimitReached(30), 'Turn 30 should reach limit');
  
  // Beyond limit
  assert(game.winCondition.isTurnLimitReached(31), 'Turn 31 should reach limit');
});

// Test 16: Default turn limit is 30 (PvP)
runTest('Default turn limit is 30 (PvP)', () => {
  const p1Deck = createDeck(60);
  const p2Deck = createDeck(60);
  const game = createGame(p1Deck, p2Deck); // No turnLimit specified
  
  assertEqual(game.winCondition.getTurnLimit(), 30, 'Default limit should be 30');
});

// Test 17: Turn log records win condition at limit
runTest('Turn log records win condition at limit', () => {
  const game = createGameWithTurnLimit(30);
  
  // Simulate to turn 30 (at limit)
  simulateNTurns(game, 30);
  
  // Check turn log
  const winConditionLogs = game.gameState.turnLog.filter(log => log.type === 'win_condition');
  assert(winConditionLogs.length > 0, 'Turn log should contain win_condition event');
  
  const winLog = winConditionLogs[0];
  assertEqual(winLog.result.winner, null, 'Log should record null winner');
  assertEqual(winLog.result.reason, 'turn_limit_draw', 'Log should record turn_limit_draw');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
