/**
 * Test: Opening-Turn Draw Rule (R002)
 * 
 * Tests the rule that the player going first DOES draw on their first turn.
 * 
 * Acceptance Criteria:
 * 1. Starting turn 0 for player1 draws exactly 1 card when deck and hand capacity allow.
 * 2. No start-turn log message claims that opening turn skips draw.
 * 3. Existing non-opening turn draw behavior remains unchanged.
 * 4. Tests for opening-turn draw behavior pass.
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

// Helper: Create game with custom decks
function createTestGame(p1DeckSize = 60, p2DeckSize = 60, p1HandSize = 5, p2HandSize = 5) {
  const p1Deck = createDeck(p1DeckSize);
  const p2Deck = createDeck(p2DeckSize);
  
  const game = createGame(p1Deck, p2Deck);
  
  // Override initial hands if needed
  if (p1HandSize !== 5 || p2HandSize !== 5) {
    // Clear and set custom hand sizes
    game.gameState.players.player1.hand = [];
    game.gameState.players.player2.hand = [];
    game.gameState.drawCards('player1', p1HandSize, false);
    game.gameState.drawCards('player2', p2HandSize, false);
  }
  
  return game;
}

// =============================================================================
// TESTS
// =============================================================================

// Test 1: Player1 draws exactly 1 card on opening turn (turn 0)
runTest('Opening turn (turn 0) - player1 draws exactly 1 card', () => {
  const game = createTestGame();
  
  // Initial hand should be 5 cards
  assertEqual(game.drawSystem.getHandSize('player1'), 5, 'Initial hand should be 5 cards');
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Player1 should now have 6 cards (5 initial + 1 drawn)
  assertEqual(game.drawSystem.getHandSize('player1'), 6, 'Player1 should have 6 cards after turn start');
  
  // Check turn log confirms draw happened
  const drawLogs = game.gameState.turnLog.filter(log => log.type === 'draw' && log.player === 'player1');
  assert(drawLogs.length > 0, 'Turn log should contain draw event');
  assertEqual(drawLogs[drawLogs.length - 1].count, 1, 'Draw count should be 1');
});

// Test 2: No log message claims opening turn skips draw
runTest('Opening turn log - no "skip draw" message present', () => {
  const game = createTestGame();
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Check all log messages for "skip" references
  const logText = JSON.stringify(game.gameState.turnLog);
  const hasSkipMessage = logText.includes('skip') || logText.includes('no draw') || logText.includes('no-draw');
  
  assert(!hasSkipMessage, 'Turn log should NOT contain any "skip draw" or "no draw" message');
  
  // Verify there's a positive draw message
  const hasDrawMessage = game.gameState.turnLog.some(log => 
    log.type === 'draw' || 
    (log.message && log.message.includes('Drew'))
  );
  assert(hasDrawMessage, 'Turn log should contain a draw confirmation message');
});

// Test 3: Non-opening turns also draw 1 card (behavior unchanged)
runTest('Non-opening turn - player1 still draws 1 card', () => {
  const game = createTestGame();
  
  // Simulate a few turns
  // Turn 0: player1
  game.turnManager.startTurn('player1');
  assertEqual(game.drawSystem.getHandSize('player1'), 6, 'Player1 hand after turn 0');
  
  // End turn 0
  game.turnManager.endTurn();
  
  // Turn 1: player2
  game.turnManager.startTurn('player2');
  assertEqual(game.drawSystem.getHandSize('player2'), 6, 'Player2 hand after turn 1');
  
  // End turn 1
  game.turnManager.endTurn();
  
  // Turn 2: player1
  game.turnManager.startTurn('player1');
  assertEqual(game.drawSystem.getHandSize('player1'), 7, 'Player1 hand after turn 2');
  
  // Verify player1 drew exactly 1 card on turn 2 (non-opening turn)
  const drawLogs = game.gameState.turnLog.filter(log => log.type === 'draw' && log.player === 'player1');
  const lastDrawLog = drawLogs[drawLogs.length - 1];
  assertEqual(lastDrawLog.count, 1, 'Draw count on non-opening turn should be 1');
});

// Test 4: Player2 also draws on their first turn
runTest('Player2 first turn - draws exactly 1 card', () => {
  const game = createTestGame();
  
  // Player1 turn 0
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Player2 turn 1 (their first turn)
  const initialHandSize = game.drawSystem.getHandSize('player2');
  game.turnManager.startTurn('player2');
  const finalHandSize = game.drawSystem.getHandSize('player2');
  
  assertEqual(finalHandSize, initialHandSize + 1, 'Player2 should draw 1 card on their first turn');
});

// Test 5: Opening turn draw respects hand limit (10 cards)
runTest('Opening turn draw - respects hand limit at 10 cards', () => {
  const game = createTestGame(60, 60, 10, 5); // Player1 starts with full hand
  
  // Player1 already has 10 cards
  assertEqual(game.drawSystem.getHandSize('player1'), 10, 'Player1 should start with 10 cards');
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Player1 should still have 10 cards (draw blocked by hand limit)
  assertEqual(game.drawSystem.getHandSize('player1'), 10, 'Player1 hand should remain at 10');
  
  // Check for blocked draw log
  const blockedDraws = game.gameState.turnLog.filter(log => log.type === 'draw_blocked');
  assert(blockedDraws.length > 0, 'Should have blocked draw log entry');
});

// Test 6: Opening turn draw works with non-empty deck
runTest('Opening turn draw - works when deck has cards', () => {
  const game = createTestGame(10, 10); // Small decks
  
  // Player1 should be able to draw
  const initialDeckSize = game.drawSystem.getDeckSize('player1');
  const initialHandSize = game.drawSystem.getHandSize('player1');
  
  game.turnManager.startTurn('player1');
  
  assertEqual(game.drawSystem.getHandSize('player1'), initialHandSize + 1, 'Player1 should have drawn 1 card');
  assertEqual(game.drawSystem.getDeckSize('player1'), initialDeckSize - 1, 'Deck should have 1 fewer card');
});

// Test 7: Multiple opening-turn draws work correctly
runTest('Multiple games - opening turn draw consistent across games', () => {
  // Test 3 different games
  for (let i = 0; i < 3; i++) {
    const game = createTestGame();
    const initialHandSize = game.drawSystem.getHandSize('player1');
    
    game.turnManager.startTurn('player1');
    
    assertEqual(game.drawSystem.getHandSize('player1'), initialHandSize + 1, `Game ${i+1}: Player1 should draw 1 card`);
  }
});

// Test 8: Turn manager correctly identifies opening turn
runTest('Turn manager - correctly identifies opening turn', () => {
  const game = createTestGame();
  
  // Before any turn starts
  assert(game.turnManager.isOpeningTurn(), 'Should be opening turn before turn starts');
  
  // After starting player1 turn 0
  game.turnManager.startTurn('player1');
  assert(game.turnManager.isOpeningTurn(), 'Should be opening turn on player1 turn 0');
  
  // After ending turn 0
  game.turnManager.endTurn();
  assert(!game.turnManager.isOpeningTurn(), 'Should NOT be opening turn after turn 0 ends');
  
  // On player2 turn 1
  game.turnManager.startTurn('player2');
  assert(!game.turnManager.isOpeningTurn(), 'Should NOT be opening turn on player2 turn 1');
  
  // On player1 turn 2
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  assert(!game.turnManager.isOpeningTurn(), 'Should NOT be opening turn on player1 turn 2');
});

// Test 9: Draw system respects hand limit in general (not just opening turn)
runTest('Draw system - hand limit enforced on non-opening turn', () => {
  const game = createTestGame();
  
  // Play a few turns to fill hand
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Fill player1's hand to 10 cards
  const currentHandSize = game.drawSystem.getHandSize('player1');
  const cardsToDraw = 10 - currentHandSize;
  game.drawSystem.drawCards('player1', cardsToDraw, true);
  
  assertEqual(game.drawSystem.getHandSize('player1'), 10, 'Player1 hand should be at limit');
  
  // Try to draw more on next turn
  game.turnManager.startTurn('player1');
  
  assertEqual(game.drawSystem.getHandSize('player1'), 10, 'Player1 hand should remain at limit');
});

// Test 10: Draw system handles empty deck (no automatic loss)
runTest('Draw system - empty deck does not cause automatic loss', () => {
  const game = createTestGame(2, 60, 5, 5); // Player1 has only 2 cards in deck
  
  // Play turns to empty deck
  // Player1 turn 0: draws 1 (deck now 1)
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Player2 turn 1
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Player1 turn 2: tries to draw but deck is now empty
  // Before turn start, manually remove remaining cards
  game.gameState.players.player1.deck = [];
  
  // This should NOT throw an error or cause a loss
  game.turnManager.startTurn('player1');
  
  // Check for failed draw log (not a game over)
  const failedDraws = game.gameState.turnLog.filter(log => log.type === 'draw_failed');
  assert(failedDraws.length > 0, 'Should have failed draw log entry');
  
  // Game should still be playable (no automatic loss)
  assert(game.gameState.phase !== 'game_over', 'Game should NOT be over');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('OPENING-TURN DRAW TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
