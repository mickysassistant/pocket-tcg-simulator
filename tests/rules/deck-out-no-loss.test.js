/**
 * Test: Empty-Deck No-Loss Behavior (R005)
 * 
 * Tests that drawing from an empty deck does NOT cause automatic loss (deck out).
 * 
 * Acceptance Criteria:
 * 1. A draw attempt from an empty deck does not set winner and does not throw.
 * 2. Game state remains playable after empty-deck draw attempts.
 * 3. Log captures empty-deck no-draw outcome.
 * 4. Tests for empty-deck no-loss behavior pass.
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

// Helper: Create game with custom decks and hand sizes
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

// AC1: A draw attempt from an empty deck does not set winner and does not throw
runTest('AC1.1 - Empty deck draw does not throw error', () => {
  const game = createTestGame(0, 60, 5, 5); // Player1 has empty deck
  
  // This should NOT throw
  const result = game.drawSystem.drawCards('player1', 1, true);
  
  // Result should indicate failure
  assertEqual(result.drawn, 0, 'Should draw 0 cards');
  assertEqual(result.failed, 1, 'Should record 1 failed draw');
  assert(result.deckEmpty, 'Should flag deck as empty');
});

// AC1: A draw attempt from an empty deck does not set winner
runTest('AC1.2 - Empty deck draw does not set winner', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Draw from empty deck
  game.drawSystem.drawCards('player1', 1, true);
  
  // Verify no winner is set
  assert(game.gameState.winner === undefined, 'Winner should not be set');
  assert(game.gameState.phase !== 'game_over', 'Game should not be in game_over phase');
  assert(game.gameState.phase === 'setup', 'Game should still be in setup phase');
});

// AC1: Multiple empty deck draws do not set winner
runTest('AC1.3 - Multiple empty deck draws do not set winner', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Try to draw multiple times
  game.drawSystem.drawCards('player1', 1, true);
  game.drawSystem.drawCards('player1', 2, true);
  game.drawSystem.drawCards('player1', 1, true);
  
  // Still no winner
  assert(game.gameState.winner === undefined, 'Winner should still not be set');
  assert(game.gameState.phase !== 'game_over', 'Game should still not be over');
});

// AC2: Game state remains playable after empty-deck draw attempts
runTest('AC2.1 - Game continues after empty deck draw', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Draw from empty deck
  game.drawSystem.drawCards('player1', 1, true);
  
  // Game should still be in playable state
  assertEqual(game.gameState.phase, 'setup', 'Game should remain in setup phase');
  assertEqual(game.gameState.currentPlayer, 'player1', 'Current player should still be player1');
});

// AC2: Can still start turn after empty deck draw
runTest('AC2.2 - Can start turn after empty deck draw', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Draw from empty deck
  game.drawSystem.drawCards('player1', 1, true);
  
  // Should be able to start a turn without error
  game.turnManager.startTurn('player1');
  
  assertEqual(game.gameState.phase, 'main', 'Game should be in main phase');
  assertEqual(game.gameState.currentPlayer, 'player1', 'Current player should be player1');
});

// AC2: Can still end turn after empty deck draw
runTest('AC2.3 - Can end turn after empty deck draw', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  game.turnManager.startTurn('player1');
  
  // End turn (player1 has empty deck, tried to draw at start)
  game.turnManager.endTurn();
  
  assertEqual(game.gameState.currentPlayer, 'player2', 'Current player should be player2');
  assertEqual(game.gameState.turnNumber, 0, 'Turn number should still be 0');
});

// AC2: Player2 can still play after player1 empties deck
runTest('AC2.4 - Other player can continue playing after opponent empties deck', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Player1 turn (draw fails due to empty deck)
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Player2 turn (should be able to draw and play)
  const initialHandSize = game.drawSystem.getHandSize('player2');
  game.turnManager.startTurn('player2');
  const finalHandSize = game.drawSystem.getHandSize('player2');
  
  // Player2 should have drawn normally
  assertEqual(finalHandSize, initialHandSize + 1, 'Player2 should draw 1 card');
});

// AC3: Log captures empty-deck no-draw outcome
runTest('AC3.1 - Empty deck draw creates log entry', () => {
  const game = createTestGame(0, 60, 5, 5);
  game.gameState.turnLog = [];
  
  game.drawSystem.drawCards('player1', 1, true);
  
  // Should have log entry
  const failedDraws = game.gameState.turnLog.filter(log => log.type === 'draw_failed');
  assert(failedDraws.length > 0, 'Should have draw_failed log entry');
});

// AC3: Log clearly indicates deck empty reason
runTest('AC3.2 - Log entry clearly indicates deck empty reason', () => {
  const game = createTestGame(0, 60, 5, 5);
  game.gameState.turnLog = [];
  
  game.drawSystem.drawCards('player1', 1, true);
  
  const failedLog = game.gameState.turnLog.find(log => log.type === 'draw_failed');
  assert(failedLog !== undefined, 'Should find failed draw log');
  assertEqual(failedLog.reason, 'deck_empty', 'Reason should be deck_empty');
  assertEqual(failedLog.player, 'player1', 'Player should be player1');
});

// AC3: Log includes message about no automatic loss
runTest('AC3.3 - Log includes message about no automatic loss', () => {
  const game = createTestGame(0, 60, 5, 5);
  game.gameState.turnLog = [];
  
  game.drawSystem.drawCards('player1', 1, true);
  
  const failedLog = game.gameState.turnLog.find(log => log.type === 'draw_failed');
  assert(failedLog !== undefined, 'Should find failed draw log');
  assert(failedLog.message !== undefined, 'Should have message field');
  assert(failedLog.message.includes('no automatic loss'), 'Message should mention no automatic loss');
});

// Regression: Start-turn draw with empty deck
runTest('Regression.1 - Start-turn draw with empty deck does not cause loss', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Start turn for player1 (triggers draw from empty deck)
  game.turnManager.startTurn('player1');
  
  // Should not set winner or end game
  assert(game.gameState.winner === undefined, 'Winner should not be set');
  assert(game.gameState.phase !== 'game_over', 'Game should not be over');
  
  // Should have failed draw log
  const failedDraws = game.gameState.turnLog.filter(log => log.type === 'draw_failed');
  assert(failedDraws.length > 0, 'Should have failed draw log');
  assertEqual(failedDraws[0].reason, 'deck_empty', 'Reason should be deck_empty');
});

// Regression: Effect-driven draw from empty deck
runTest('Regression.2 - Effect-driven draw from empty deck does not cause loss', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Simulate an effect that draws 3 cards
  const result = game.drawSystem.drawCards('player1', 3, true);
  
  // Should not set winner or end game
  assert(game.gameState.winner === undefined, 'Winner should not be set');
  assert(game.gameState.phase !== 'game_over', 'Game should not be over');
  
  // Should have recorded failed draw
  assertEqual(result.drawn, 0, 'Should draw 0 cards');
  assertEqual(result.failed, 1, 'Should record 1 failed draw');
});

// Regression: Empty deck on multiple consecutive turns
runTest('Regression.3 - Empty deck on consecutive turns does not cause loss', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Player1 turn 0 (empty deck)
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Player2 turn 1
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Player1 turn 2 (still empty deck)
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Player2 turn 2
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Game should still be playable
  assert(game.gameState.winner === undefined, 'Winner should not be set');
  assertEqual(game.gameState.currentPlayer, 'player1', 'Should be player1 turn');
  assertEqual(game.gameState.turnNumber, 2, 'Should be turn 2');
});

// DeckManager: isDeckEmpty correctly identifies empty deck
runTest('DeckManager.1 - isDeckEmpty returns true for empty deck', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  assert(game.deckManager.isDeckEmpty('player1'), 'Player1 deck should be empty');
  assert(!game.deckManager.isDeckEmpty('player2'), 'Player2 deck should not be empty');
});

// DeckManager: getDeckSize returns correct size
runTest('DeckManager.2 - getDeckSize returns correct deck size', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  assertEqual(game.deckManager.getDeckSize('player1'), 0, 'Player1 deck size should be 0');
  assert(game.deckManager.getDeckSize('player2') > 0, 'Player2 deck size should be > 0');
});

// DeckManager: canDraw returns false for empty deck
runTest('DeckManager.3 - canDraw returns false for empty deck', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  const canDraw1 = game.deckManager.canDraw('player1', 1, true);
  assertEqual(canDraw1, false, 'Should not be able to draw from empty deck');
  
  const canDraw2 = game.deckManager.canDraw('player2', 1, true);
  assertEqual(canDraw2, true, 'Should be able to draw from non-empty deck');
});

// DeckManager: shouldDeckOutCauseLoss always returns false
runTest('DeckManager.4 - shouldDeckOutCauseLoss always returns false', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  assertEqual(game.deckManager.shouldDeckOutCauseLoss(), false, 
    'Empty deck should NOT cause loss');
});

// DeckManager: getDrawBlockReason returns correct reason
runTest('DeckManager.5 - getDrawBlockReason returns deck_empty for empty deck', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  const reason = game.deckManager.getDrawBlockReason('player1', 1, true);
  assertEqual(reason, 'deck_empty', 'Reason should be deck_empty');
});

// DeckManager: drawTopCard returns null for empty deck
runTest('DeckManager.6 - drawTopCard returns null for empty deck', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  const card = game.deckManager.drawTopCard('player1');
  assertEqual(card, null, 'Should return null for empty deck');
});

// DeckManager: getDeckInfo returns correct info
runTest('DeckManager.7 - getDeckInfo returns correct info for empty deck', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  const info = game.deckManager.getDeckInfo('player1');
  assertEqual(info.size, 0, 'Size should be 0');
  assertEqual(info.isEmpty, true, 'isEmpty should be true');
  assertEqual(info.canDrawAny, false, 'canDrawAny should be false');
  assertEqual(info.blockReason, 'deck_empty', 'blockReason should be deck_empty');
});

// Both GameState and DrawSystem handle empty deck consistently
runTest('Consistency.1 - Both draw methods handle empty deck', () => {
  const game1 = createTestGame(0, 60, 5, 5);
  const game2 = createTestGame(0, 60, 5, 5);
  
  // Use DrawSystem.drawCards
  game1.drawSystem.drawCards('player1', 1, true);
  
  // Use GameState.drawCards
  game2.gameState.drawCards('player1', 1, true);
  
  // Both should create draw_failed log
  const failed1 = game1.gameState.turnLog.find(log => log.type === 'draw_failed');
  const failed2 = game2.gameState.turnLog.find(log => log.type === 'draw_failed');
  
  assert(failed1 !== undefined, 'DrawSystem should log failed draw');
  assert(failed2 !== undefined, 'GameState should log failed draw');
  
  assertEqual(failed1.reason, 'deck_empty', 'DrawSystem reason should be deck_empty');
  assertEqual(failed2.reason, 'deck_empty', 'GameState reason should be deck_empty');
  
  // Both should NOT set winner
  assert(game1.gameState.winner === undefined, 'DrawSystem should not set winner');
  assert(game2.gameState.winner === undefined, 'GameState should not set winner');
});

// Empty deck does not affect other player
runTest('Isolation.1 - Player1 empty deck does not affect player2', () => {
  const game = createTestGame(0, 60, 5, 5);
  
  // Player1 tries to draw (fails)
  game.drawSystem.drawCards('player1', 1, true);
  
  // Player2 should still be able to draw
  const initialDeckSize = game.drawSystem.getDeckSize('player2');
  const initialHandSize = game.drawSystem.getHandSize('player2');
  
  game.drawSystem.drawCards('player2', 1, true);
  
  assertEqual(game.drawSystem.getDeckSize('player2'), initialDeckSize - 1, 
    'Player2 deck should decrease by 1');
  assertEqual(game.drawSystem.getHandSize('player2'), initialHandSize + 1, 
    'Player2 hand should increase by 1');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('EMPTY-DECK NO-LOSS BEHAVIOR TEST SUMMARY');
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
