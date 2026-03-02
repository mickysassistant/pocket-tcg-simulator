/**
 * Integration Test - Combined Rules Interaction
 * 
 * This test verifies that multiple rules work correctly together:
 * - R002: Opening-turn draw (player going first DOES draw)
 * - R003: First-turn energy attachment blocked for player1
 * - R004: Hand-limit at 10 cards
 * - R005: No deck-out loss
 * - R006: Turn-limit resolution
 */

const { createGame } = require('../../src/index');

// Test helper
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

// Test helper for boolean
function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}\n  Expected true, got false`);
  }
}

// Test helper for null
function assertNull(value, message) {
  if (value !== null) {
    throw new Error(`Assertion failed: ${message}\n  Expected null, got: ${value}`);
  }
}

console.log('Running combined rules integration tests...\n');

let testCount = 0;
let passedCount = 0;

function runTest(name, testFn) {
  testCount++;
  try {
    testFn();
    passedCount++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

// TEST 1: Opening turn draw + hand limit interaction
runTest('INT.1 - Opening turn draw works with hand limit', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Player1 should draw 1 card (opening turn draw rule)
  // Initial hand was 5, now should be 6
  assertEqual(game.gameState.players.player1.hand.length, 6, 'Player1 hand size after opening turn draw');
});

// TEST 2: First-turn energy block + opening turn draw
runTest('INT.2 - First-turn energy block independent of opening turn draw', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Add some energy to player1's energy zone
  game.gameState.players.player1.energyZone.push('energy1');

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Verify draw worked (hand should be 6, initial 5 + 1 draw)
  assertEqual(game.gameState.players.player1.hand.length, 6, 'Opening turn draw worked');

  // Try to attach energy on first turn - should be blocked
  const canAttach = game.energySystem.canAttachEnergy('player1');
  assertTrue(!canAttach.allowed, 'First-turn energy attachment blocked');

  // Verify the reason is first-turn restriction
  assertEqual(canAttach.reason, 'first_turn_restriction', 'Correct first-turn restriction reason');
});

// TEST 3: Hand limit + deck out interaction
runTest('INT.3 - Hand limit checked before deck out', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Fill player1's hand to 10 cards
  while (game.gameState.players.player1.hand.length < 10) {
    game.gameState.players.player1.hand.push('card');
  }

  // Try to draw - should be blocked by hand limit, not deck out
  const result = game.drawSystem.drawCards('player1', 1, true);

  assertEqual(result.drawn, 0, 'No cards drawn due to hand limit');
  assertEqual(result.handLimitReached, true, 'Hand limit reached flag set');
  assertEqual(result.deckEmpty, false, 'Deck not empty (hand limit took precedence)');

  // Verify log entry exists for hand limit
  const handLimitLogs = game.gameState.turnLog.filter(l => l.type === 'draw_blocked' && l.reason === 'hand_limit');
  assertTrue(handLimitLogs.length > 0, 'Hand limit log entry created');
});

// TEST 4: Deck out + turn continuation (no loss)
runTest('INT.4 - Deck out does not end game, allows turn continuation', () => {
  const game = createGame(
    Array(5).fill('card'), // Small deck
    Array(15).fill('card')
  );

  // Start turn for player1
  game.turnManager.startTurn('player1');

  // Empty player1's deck by drawing all cards
  while (game.gameState.players.player1.deck.length > 0) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // Verify deck is empty
  assertEqual(game.gameState.players.player1.deck.length, 0, 'Deck is empty');

  // Try to draw from empty deck
  const result = game.drawSystem.drawCards('player1', 1, true);

  assertEqual(result.drawn, 0, 'No cards drawn from empty deck');
  assertEqual(result.deckEmpty, true, 'Deck empty flag set');
  assertEqual(result.failed, 1, 'Failed draw count correct');

  // Verify no winner was declared (deck out doesn't cause loss)
  assertNull(game.turnManager.winCondition.checkWinCondition(), 'No winner from deck out');

  // Verify we can still end the turn
  const endTurnResult = game.turnManager.endTurn();
  assertNull(endTurnResult, 'Turn ended without win condition');
});

// TEST 5: Turn limit detection works correctly with other rules
runTest('INT.5 - Turn limit detection independent of other rules', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card'),
    30 // Set turn limit to 30
  );

  // Play 30 turns
  for (let i = 0; i < 30; i++) {
    const currentPlayer = game.gameState.currentPlayer;
    game.turnManager.startTurn(currentPlayer);
    game.turnManager.endTurn();
  }

  // After 30 turns, turn limit should be reached
  const winResult = game.turnManager.winCondition.checkWinCondition();
  assertTrue(winResult !== null, 'Win condition detected at turn limit');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Turn limit results in draw');

  // Verify other systems still work
  const canDraw = game.drawSystem.canDraw('player1', 1);
  assertTrue(typeof canDraw === 'boolean', 'Draw system still functional');
});

// TEST 6: Multiple rules interaction over several turns
runTest('INT.6 - Multiple rules work together over multiple turns', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card'),
    50 // Higher turn limit for this test
  );

  // Turn 1: Player1 first turn
  game.turnManager.startTurn('player1');
  
  // Verify opening turn draw (R002)
  assertEqual(game.gameState.players.player1.hand.length, 6, 'Opening turn draw (5 initial + 1)');

  // Verify first-turn energy block (R003)
  const canAttachP1T1 = game.energySystem.canAttachEnergy('player1');
  assertTrue(!canAttachP1T1.allowed, 'First-turn energy blocked for player1');

  game.turnManager.endTurn();

  // Turn 2: Player2 first turn
  game.turnManager.startTurn('player2');

  // Verify player2 can attach energy (R003 - only player1 blocked on first turn)
  const canAttachP2T1 = game.energySystem.canAttachEnergy('player2');
  assertTrue(canAttachP2T1.allowed, 'Player2 can attach energy on first turn');

  game.turnManager.endTurn();

  // Turn 3: Player1 second turn - should be able to attach energy now
  game.turnManager.startTurn('player1');

  // Verify energy attachment now allowed (R003)
  const canAttachP1T2 = game.energySystem.canAttachEnergy('player1');
  assertTrue(canAttachP1T2.allowed, 'Player1 can attach energy on second turn');

  // Fill hand to test hand limit (R004)
  while (game.gameState.players.player1.hand.length < 10) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // Try to draw at hand limit - should be blocked
  const handLimitResult = game.drawSystem.drawCards('player1', 1, true);
  assertEqual(handLimitResult.drawn, 0, 'Draw blocked at hand limit');
  assertEqual(handLimitResult.handLimitReached, true, 'Hand limit flag set');

  game.turnManager.endTurn();
});

// TEST 7: Deck out + hand limit + turn limit all together
runTest('INT.7 - Deck out, hand limit, and turn limit work together', () => {
  const game = createGame(
    Array(5).fill('card'), // Small deck for player1
    Array(5).fill('card'), // Small deck for player2
    10 // Low turn limit
  );

  // Play turns until deck out and turn limit
  for (let i = 0; i < 10; i++) {
    const currentPlayer = game.gameState.currentPlayer;
    game.turnManager.startTurn(currentPlayer);

    // Fill hand to test hand limit
    while (game.gameState.players[currentPlayer].hand.length < 10 && 
           game.gameState.players[currentPlayer].deck.length > 0) {
      game.drawSystem.drawCards(currentPlayer, 1, false);
    }

    game.turnManager.endTurn();
  }

  // At turn 10, should reach turn limit
  const winResult = game.turnManager.winCondition.checkWinCondition();
  assertTrue(winResult !== null, 'Win condition detected');
  assertEqual(winResult.reason, 'turn_limit_draw', 'Turn limit results in draw');

  // Verify decks are empty but game ended from turn limit, not deck out
  assertEqual(game.gameState.players.player1.deck.length, 0, 'Player1 deck empty');
  assertEqual(game.gameState.players.player2.deck.length, 0, 'Player2 deck empty');
});

// TEST 8: Energy zone + hand limit + draw system integration
runTest('INT.8 - Energy zone independent of hand limit and draw system', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Add energy to energy zone
  game.gameState.players.player1.energyZone.push('energy1', 'energy2');

  // Start turn (triggers draw)
  game.turnManager.startTurn('player1');

  // Verify draw worked
  assertEqual(game.gameState.players.player1.hand.length, 6, 'Draw worked');

  // Verify energy zone is intact
  assertEqual(game.gameState.players.player1.energyZone.length, 2, 'Energy zone intact');

  // Fill hand to test hand limit
  while (game.gameState.players.player1.hand.length < 10) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // Try to draw at hand limit
  const result = game.drawSystem.drawCards('player1', 1, true);
  assertEqual(result.handLimitReached, true, 'Hand limit enforced');

  // Energy zone should still be intact
  assertEqual(game.gameState.players.player1.energyZone.length, 2, 'Energy zone still intact');
});

// TEST 9: Turn number tracking across all rules
runTest('INT.9 - Turn number tracking consistent across all systems', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card'),
    20
  );

  for (let i = 0; i < 10; i++) {
    const currentPlayer = game.gameState.currentPlayer;
    game.turnManager.startTurn(currentPlayer);
    game.turnManager.endTurn();
  }

  // After 10 turns (each endTurn increments turnNumber)
  assertEqual(game.gameState.turnNumber, 10, 'Turn number is 10');

  // Win condition should not trigger yet (turn limit is 20)
  const winResult = game.turnManager.winCondition.checkWinCondition();
  assertNull(winResult, 'No win condition before turn limit');
});

// TEST 10: Cross-player state isolation
runTest('INT.10 - Player states isolated across all rules', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Modify player1's state
  game.turnManager.startTurn('player1');
  game.drawSystem.drawCards('player1', 3, false); // Extra draws
  game.gameState.players.player1.energyZone.push('energy1');

  // End turn, start player2's turn
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');

  // Verify player2's state is unaffected
  // Player2 started with 5 cards (initial draw), then draws 1 on their first turn
  assertEqual(game.gameState.players.player2.hand.length, 6, 'Player2 hand size correct (5 initial + 1 draw)');
  assertEqual(game.gameState.players.player2.energyZone.length, 0, 'Player2 energy zone empty');
  // Player2 deck: 15 - 5 (initial) - 1 (turn draw) = 9
  assertEqual(game.gameState.players.player2.deck.length, 9, 'Player2 deck size correct (15 - 5 initial - 1 draw)');
});

console.log('\n' + '='.repeat(60));
console.log(`COMBINED RULES INTEGRATION TEST SUMMARY`);
console.log('='.repeat(60));
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${testCount - passedCount}`);
console.log('='.repeat(60));

if (passedCount === testCount) {
  console.log('✅ All integration tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!\n');
  process.exit(1);
}
