/**
 * Test: Hand-Limit Draw Behavior (R004)
 * 
 * Tests that draw actions stop at hand size 10 and do not mill cards to discard.
 * 
 * Acceptance Criteria:
 * 1. When hand size is 10, draw attempts leave deck, hand, and discard sizes unchanged.
 * 2. Draw log entry clearly records that draw was skipped due to hand limit.
 * 3. When hand size is 9, draw succeeds and hand reaches 10.
 * 4. Tests for hand-limit draw behavior pass.
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

// AC1: When hand size is 10, draw attempts leave deck, hand, and discard sizes unchanged
runTest('AC1.1 - Draw at hand size 10 leaves deck unchanged', () => {
  const game = createTestGame(60, 60, 10, 5); // Player1 has full hand
  
  const initialDeckSize = game.gameState.players.player1.deck.length;
  const initialHandSize = game.gameState.players.player1.hand.length;
  
  // Try to draw
  const result = game.drawSystem.drawCards('player1', 1, true);
  
  // Deck should be unchanged
  assertEqual(game.gameState.players.player1.deck.length, initialDeckSize, 
    'Deck size should remain unchanged');
  
  // No cards should be drawn
  assertEqual(result.drawn, 0, 'Should have drawn 0 cards');
  assertEqual(result.blocked, 1, 'Should have blocked 1 draw');
  assert(result.handLimitReached, 'Should flag hand limit as reached');
});

// AC1: When hand size is 10, draw attempts leave deck, hand, and discard sizes unchanged
runTest('AC1.2 - Draw at hand size 10 leaves hand unchanged', () => {
  const game = createTestGame(60, 60, 10, 5); // Player1 has full hand
  
  const initialHandSize = game.gameState.players.player1.hand.length;
  
  // Try to draw
  const result = game.drawSystem.drawCards('player1', 1, true);
  
  // Hand should remain at 10
  assertEqual(game.gameState.players.player1.hand.length, initialHandSize, 
    'Hand size should remain at 10');
  assertEqual(game.gameState.players.player1.hand.length, 10, 'Hand should be exactly 10');
});

// AC1: When hand size is 10, draw attempts leave deck, hand, and discard sizes unchanged
runTest('AC1.3 - Draw at hand size 10 leaves discard unchanged (no discard pile exists)', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  // Try to draw
  game.drawSystem.drawCards('player1', 1, true);
  
  // Verify no discard pile was created or modified
  assert(game.gameState.players.player1.banque !== undefined, 
    'Banque (discard pile) should exist');
  assertEqual(game.gameState.players.player1.banque.length, 0, 
    'Banque (discard pile) should remain empty');
});

// AC1: Multiple draw attempts at hand size 10 all blocked
runTest('AC1.4 - Multiple draw attempts at hand size 10 all blocked', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  const initialDeckSize = game.gameState.players.player1.deck.length;
  const initialHandSize = game.gameState.players.player1.hand.length;
  
  // Try to draw 3 times
  game.drawSystem.drawCards('player1', 1, true);
  game.drawSystem.drawCards('player1', 2, true);
  game.drawSystem.drawCards('player1', 1, true);
  
  // Everything should be unchanged
  assertEqual(game.gameState.players.player1.deck.length, initialDeckSize, 
    'Deck size should remain unchanged after multiple draws');
  assertEqual(game.gameState.players.player1.hand.length, initialHandSize, 
    'Hand size should remain unchanged after multiple draws');
});

// AC2: Draw log entry clearly records that draw was skipped due to hand limit
runTest('AC2.1 - Blocked draw creates clear log entry', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  // Clear any existing logs
  game.gameState.turnLog = [];
  
  // Try to draw
  game.drawSystem.drawCards('player1', 1, true);
  
  // Check for blocked draw log
  const blockedDraws = game.gameState.turnLog.filter(log => log.type === 'draw_blocked');
  assert(blockedDraws.length > 0, 'Should have draw_blocked log entry');
  
  const blockedLog = blockedDraws[0];
  assertEqual(blockedLog.type, 'draw_blocked', 'Log type should be draw_blocked');
  assertEqual(blockedLog.reason, 'hand_limit', 'Reason should be hand_limit');
  assertEqual(blockedLog.player, 'player1', 'Player should be player1');
  assertEqual(blockedLog.handSize, 10, 'Hand size should be recorded as 10');
});

// AC2: Log entry is deterministic and contains required information
runTest('AC2.2 - Blocked draw log contains all required information', () => {
  const game = createTestGame(60, 60, 10, 5);
  game.gameState.turnLog = [];
  
  game.drawSystem.drawCards('player1', 1, true);
  
  const blockedLog = game.gameState.turnLog.find(log => log.type === 'draw_blocked');
  assert(blockedLog !== undefined, 'Should find blocked draw log');
  
  // Check all required fields
  assert(blockedLog.type !== undefined, 'Should have type field');
  assert(blockedLog.player !== undefined, 'Should have player field');
  assert(blockedLog.reason !== undefined, 'Should have reason field');
  assert(blockedLog.handSize !== undefined, 'Should have handSize field');
});

// AC2: Log clearly indicates hand limit was the reason
runTest('AC2.3 - Log reason clearly indicates hand limit', () => {
  const game = createTestGame(60, 60, 10, 5);
  game.gameState.turnLog = [];
  
  game.drawSystem.drawCards('player1', 1, true);
  
  const blockedLog = game.gameState.turnLog.find(log => log.type === 'draw_blocked');
  assert(blockedLog !== undefined, 'Should find blocked draw log');
  assertEqual(blockedLog.reason, 'hand_limit', 'Reason should clearly be "hand_limit"');
});

// AC3: When hand size is 9, draw succeeds and hand reaches 10
runTest('AC3.1 - Draw at hand size 9 succeeds and hand reaches 10', () => {
  const game = createTestGame(60, 60, 9, 5); // Player1 has 9 cards
  
  const initialHandSize = game.gameState.players.player1.hand.length;
  assertEqual(initialHandSize, 9, 'Initial hand size should be 9');
  
  // Draw 1 card
  const result = game.drawSystem.drawCards('player1', 1, true);
  
  // Hand should now be 10
  assertEqual(game.gameState.players.player1.hand.length, 10, 'Hand should reach 10');
  assertEqual(result.drawn, 1, 'Should have drawn 1 card');
  assertEqual(result.blocked, 0, 'Should not have blocked any draw');
});

// AC3: Drawing at hand size 9 reduces deck size
runTest('AC3.2 - Draw at hand size 9 reduces deck by 1', () => {
  const game = createTestGame(60, 60, 9, 5);
  
  const initialDeckSize = game.gameState.players.player1.deck.length;
  
  game.drawSystem.drawCards('player1', 1, true);
  
  assertEqual(game.gameState.players.player1.deck.length, initialDeckSize - 1, 
    'Deck should decrease by 1');
});

// AC3: Drawing multiple cards when at 9 draws only 1 then blocks
runTest('AC3.3 - Drawing multiple cards at hand size 9 draws to 10 then blocks', () => {
  const game = createTestGame(60, 60, 9, 5);
  
  const initialDeckSize = game.gameState.players.player1.deck.length;
  
  // Try to draw 3 cards
  const result = game.drawSystem.drawCards('player1', 3, true);
  
  // Should draw 1, block (hand limit reached)
  assertEqual(result.drawn, 1, 'Should draw 1 card');
  assertEqual(result.blocked, 1, 'Should record hand limit blocking');
  assert(result.handLimitReached, 'Should flag hand limit as reached');
  assertEqual(game.gameState.players.player1.hand.length, 10, 'Hand should be at 10');
  assertEqual(game.gameState.players.player1.deck.length, initialDeckSize - 1, 
    'Deck should decrease by only 1');
});

// AC3: Draw at hand size 8 reaches 9, not 10
runTest('AC3.4 - Draw at hand size 8 reaches 9 (not 10)', () => {
  const game = createTestGame(60, 60, 8, 5);
  
  game.drawSystem.drawCards('player1', 1, true);
  
  assertEqual(game.gameState.players.player1.hand.length, 9, 'Hand should be at 9');
});

// Additional: Turn draw also respects hand limit
runTest('Turn draw at hand size 10 is blocked', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  const initialDeckSize = game.gameState.players.player1.deck.length;
  const initialHandSize = game.gameState.players.player1.hand.length;
  
  // Start turn (which triggers a draw)
  game.turnManager.startTurn('player1');
  
  // Deck and hand should be unchanged
  assertEqual(game.gameState.players.player1.deck.length, initialDeckSize, 
    'Deck should remain unchanged on turn draw');
  assertEqual(game.gameState.players.player1.hand.length, initialHandSize, 
    'Hand should remain unchanged on turn draw');
});

// Additional: Effect-based draw respects hand limit
runTest('Effect-based draw respects hand limit', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  const initialDeckSize = game.gameState.players.player1.deck.length;
  
  // Simulate an effect that draws 3 cards
  game.drawSystem.drawCards('player1', 3, true);
  
  // Deck should be unchanged
  assertEqual(game.gameState.players.player1.deck.length, initialDeckSize, 
    'Effect-based draw should be blocked at hand limit');
});

// Additional: Hand limit check is optional via parameter
runTest('Hand limit can be bypassed with respectHandLimit=false', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  const initialHandSize = game.gameState.players.player1.hand.length;
  
  // Draw without respecting hand limit
  const result = game.drawSystem.drawCards('player1', 1, false);
  
  // Hand should increase
  assertEqual(game.gameState.players.player1.hand.length, initialHandSize + 1, 
    'Hand should increase when hand limit is not respected');
  assertEqual(result.drawn, 1, 'Should draw 1 card');
});

// Additional: canDraw correctly predicts hand limit blocking
runTest('canDraw returns false when hand would exceed 10', () => {
  const game = createTestGame(60, 60, 10, 5);
  
  // Should not be able to draw when hand is at 10
  const canDraw1 = game.drawSystem.canDraw('player1', 1, true);
  assertEqual(canDraw1, false, 'Should not be able to draw at hand limit');
  
  const canDraw2 = game.drawSystem.canDraw('player1', 2, true);
  assertEqual(canDraw2, false, 'Should not be able to draw 2 at hand limit');
});

// Additional: canDraw returns true when drawing to exactly 10
runTest('canDraw returns true when drawing to exactly 10', () => {
  const game = createTestGame(60, 60, 9, 5);
  
  // Should be able to draw 1 to reach 10
  const canDraw1 = game.drawSystem.canDraw('player1', 1, true);
  assertEqual(canDraw1, true, 'Should be able to draw 1 to reach hand limit');
  
  // Should not be able to draw 2 (would exceed)
  const canDraw2 = game.drawSystem.canDraw('player1', 2, true);
  assertEqual(canDraw2, false, 'Should not be able to draw 2 (would exceed limit)');
});

// Additional: Both GameState.drawCards and DrawSystem.drawCards behave the same
runTest('Both draw methods have consistent hand limit behavior', () => {
  const game1 = createTestGame(60, 60, 10, 5);
  const game2 = createTestGame(60, 60, 10, 5);
  
  // Use DrawSystem.drawCards
  const result1 = game1.drawSystem.drawCards('player1', 1, true);
  
  // Use GameState.drawCards
  const result2 = game2.gameState.drawCards('player1', 1, true);
  
  // Both should block the draw
  assertEqual(result1.drawn, 0, 'DrawSystem should block draw');
  assertEqual(result2, 0, 'GameState should block draw');
  assertEqual(game1.gameState.players.player1.hand.length, 10, 
    'DrawSystem should keep hand at 10');
  assertEqual(game2.gameState.players.player1.hand.length, 10, 
    'GameState should keep hand at 10');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('HAND-LIMIT DRAW BEHAVIOR TEST SUMMARY');
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
