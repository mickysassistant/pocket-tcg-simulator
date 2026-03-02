/**
 * Integration Regression Suite - Rule-Locked Micro-Story Set (R002-R008)
 * 
 * This integration test suite executes the locked rule scenarios together
 * to prevent regressions between independently delivered stories.
 * 
 * Stories covered:
 * - R002: Opening-turn draw (player going first DOES draw)
 * - R003: First-turn energy attachment blocked for player1
 * - R004: Hand-limit at 10 cards
 * - R005: No deck-out loss
 * - R006: Turn-limit resolution
 * - R007: First-turn evolution restriction
 * - R008: Supporter first-turn allowance
 * 
 * Run this suite with: node tests/integration/regression-suite.test.js
 */

const { createGame } = require('../../src/index');

// Test helpers
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}\n  Expected true, got false`);
  }
}

function assertNull(value, message) {
  if (value !== null) {
    throw new Error(`Assertion failed: ${message}\n  Expected null, got: ${value}`);
  }
}

console.log('Running integration regression suite for R002-R008...\n');

let testCount = 0;
let passedCount = 0;
let failedTests = [];

function runTest(storyId, testId, name, testFn) {
  testCount++;
  const testName = `[${storyId}] ${testId} - ${name}`;
  try {
    testFn();
    passedCount++;
    console.log(`✓ ${testName}`);
  } catch (error) {
    failedTests.push({ storyId, testId, name, error: error.message });
    console.log(`✗ ${testName}`);
    console.log(`  ERROR: ${error.message}`);
  }
}

// ============================================================================
// R002: Opening-turn draw (player going first DOES draw)
// ============================================================================

runTest('R002', 'AC1.1', 'Player1 draws 1 card on opening turn (turn 0)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Player1 should draw 1 card (opening turn draw rule)
  // Initial hand was 5, now should be 6
  assertEqual(game.gameState.players.player1.hand.length, 6, 'Player1 hand size after opening turn draw');

  // Verify log confirms draw happened
  const drawLog = game.gameState.turnLog.filter(l => l.type === 'draw' && l.player === 'player1');
  assertTrue(drawLog.length > 0, 'Draw logged on opening turn');
});

runTest('R002', 'AC1.2', 'Player2 draws 1 card on their first turn (turn 1)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Start player1 turn
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  // Start player2 turn (their first turn)
  game.turnManager.startTurn('player2');

  // Player2 should draw 1 card
  assertEqual(game.gameState.players.player2.hand.length, 6, 'Player2 hand size after first turn draw');
});

runTest('R002', 'AC2', 'Opening turn does not skip draw (no skip message in logs)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  game.turnManager.startTurn('player1');

  // Check that there's no "skip draw" message
  const skipLog = game.gameState.turnLog.filter(l => 
    l.message && l.message.toLowerCase().includes('skip') && l.message.toLowerCase().includes('draw')
  );
  assertTrue(skipLog.length === 0, 'No skip draw message in logs');

  // Verify draw actually happened
  const drawLog = game.gameState.turnLog.filter(l => l.type === 'draw');
  assertTrue(drawLog.length > 0, 'Draw event exists in logs');
});

// ============================================================================
// R003: First-turn energy attachment blocked for player1
// ============================================================================

runTest('R003', 'AC1', 'Player1 cannot attach energy on turn 0 (opening turn)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Add energy to player1's energy zone
  game.gameState.players.player1.energyZone.push('energy1');

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Try to attach energy on first turn - should be blocked
  const canAttach = game.energySystem.canAttachEnergy('player1');
  assertTrue(!canAttach.allowed, 'First-turn energy attachment blocked for player1');

  // Verify the reason is first-turn restriction
  assertEqual(canAttach.reason, 'first_turn_restriction', 'Correct first-turn restriction reason');
});

runTest('R003', 'AC2', 'Player2 can attach energy on their first turn (turn 1)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Add energy to player2's energy zone
  game.gameState.players.player2.energyZone.push('energy1');

  // Start player1 turn and end it
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  // Start player2 turn (their first turn)
  game.turnManager.startTurn('player2');

  // Player2 should be able to attach energy on their first turn
  const canAttach = game.energySystem.canAttachEnergy('player2');
  assertTrue(canAttach.allowed, 'Player2 can attach energy on first turn');
});

runTest('R003', 'AC3', 'Player1 can attach energy on turn 2 (after opening turn)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Add energy to player1's energy zone
  game.gameState.players.player1.energyZone.push('energy1');

  // Complete player1 first turn
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  // Complete player2 first turn
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();

  // Start player1 second turn
  game.turnManager.startTurn('player1');

  // Player1 should now be able to attach energy
  const canAttach = game.energySystem.canAttachEnergy('player1');
  assertTrue(canAttach.allowed, 'Player1 can attach energy on second turn');
});

// ============================================================================
// R004: Hand-limit at 10 cards
// ============================================================================

runTest('R004', 'AC1', 'Draw at hand size 10 leaves hand unchanged (deck unchanged)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Fill player1's hand to 10 cards
  while (game.gameState.players.player1.hand.length < 10) {
    game.gameState.players.player1.hand.push('card');
  }

  const handSizeBefore = game.gameState.players.player1.hand.length;
  const deckSizeBefore = game.gameState.players.player1.deck.length;

  // Try to draw - should be blocked by hand limit
  const result = game.drawSystem.drawCards('player1', 1, true);

  assertEqual(result.drawn, 0, 'No cards drawn due to hand limit');
  assertEqual(result.handLimitReached, true, 'Hand limit reached flag set');
  assertEqual(game.gameState.players.player1.hand.length, handSizeBefore, 'Hand size unchanged');
  assertEqual(game.gameState.players.player1.deck.length, deckSizeBefore, 'Deck size unchanged');
});

runTest('R004', 'AC2', 'Draw log entry records hand limit blocking', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Fill hand to 10
  while (game.gameState.players.player1.hand.length < 10) {
    game.gameState.players.player1.hand.push('card');
  }

  // Try to draw
  game.drawSystem.drawCards('player1', 1, true);

  // Verify log entry exists for hand limit
  const handLimitLogs = game.gameState.turnLog.filter(l => l.type === 'draw_blocked' && l.reason === 'hand_limit');
  assertTrue(handLimitLogs.length > 0, 'Hand limit log entry created');
});

runTest('R004', 'AC3', 'Draw at hand size 9 succeeds and hand reaches 10', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Fill hand to 9 cards
  while (game.gameState.players.player1.hand.length < 9) {
    game.gameState.players.player1.hand.push('card');
  }

  // Draw should succeed
  const result = game.drawSystem.drawCards('player1', 1, true);

  assertEqual(result.drawn, 1, 'One card drawn');
  assertEqual(result.handLimitReached, false, 'Hand limit not reached');
  assertEqual(game.gameState.players.player1.hand.length, 10, 'Hand size is now 10');
});

// ============================================================================
// R005: No deck-out loss
// ============================================================================

runTest('R005', 'AC1', 'Draw from empty deck does not set winner or throw', () => {
  const game = createGame(
    Array(5).fill('card'),
    Array(15).fill('card')
  );

  // Empty player1's deck by drawing all cards
  game.turnManager.startTurn('player1');
  while (game.gameState.players.player1.deck.length > 0) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // Verify deck is empty
  assertEqual(game.gameState.players.player1.deck.length, 0, 'Deck is empty');

  // Try to draw from empty deck
  const result = game.drawSystem.drawCards('player1', 1, true);

  assertEqual(result.drawn, 0, 'No cards drawn from empty deck');
  assertEqual(result.deckEmpty, true, 'Deck empty flag set');

  // Verify no winner was declared
  assertNull(game.turnManager.winCondition.checkWinCondition(), 'No winner from deck out');
});

runTest('R005', 'AC2', 'Game state remains playable after empty-deck draw attempts', () => {
  const game = createGame(
    Array(5).fill('card'),
    Array(15).fill('card')
  );

  // Empty player1's deck
  game.turnManager.startTurn('player1');
  while (game.gameState.players.player1.deck.length > 0) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // Try to draw from empty deck
  game.drawSystem.drawCards('player1', 1, true);

  // Verify we can still end the turn
  const endTurnResult = game.turnManager.endTurn();
  assertNull(endTurnResult, 'Turn ended without win condition');

  // Verify we can start the next player's turn
  game.turnManager.startTurn('player2');
  assertEqual(game.gameState.currentPlayer, 'player2', 'Player2 turn started');
});

runTest('R005', 'AC3', 'Log captures empty-deck no-draw outcome', () => {
  const game = createGame(
    Array(5).fill('card'),
    Array(15).fill('card')
  );

  // Empty player1's deck
  game.turnManager.startTurn('player1');
  while (game.gameState.players.player1.deck.length > 0) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // Try to draw from empty deck
  game.drawSystem.drawCards('player1', 1, true);

  // Verify log entry exists for empty deck
  const emptyDeckLogs = game.gameState.turnLog.filter(l => l.type === 'draw_failed' && l.reason === 'deck_empty');
  assertTrue(emptyDeckLogs.length > 0, 'Empty deck log entry created');
});

// ============================================================================
// R006: Turn-limit resolution
// ============================================================================

runTest('R006', 'AC1', 'At turn limit, game ends in DRAW (no winner)', () => {
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
  assertNull(winResult.winner, 'No winner in draw');
});

runTest('R006', 'AC2', 'Before turn limit, no premature winner declared', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card'),
    30 // Set turn limit to 30
  );

  // Play 29 turns (one before limit)
  for (let i = 0; i < 29; i++) {
    const currentPlayer = game.gameState.currentPlayer;
    game.turnManager.startTurn(currentPlayer);
    game.turnManager.endTurn();
  }

  // No win condition should trigger yet
  const winResult = game.turnManager.winCondition.checkWinCondition();
  assertNull(winResult, 'No win condition before turn limit');
});

runTest('R006', 'AC3', 'Beyond turn limit, result remains stable/deterministic', () => {
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

  // Check multiple times - should always return the same result
  const result1 = game.turnManager.winCondition.checkWinCondition();
  const result2 = game.turnManager.winCondition.checkWinCondition();
  const result3 = game.turnManager.winCondition.checkWinCondition();

  assertEqual(result1.reason, 'turn_limit_draw', 'First check returns draw');
  assertEqual(result2.reason, 'turn_limit_draw', 'Second check returns draw');
  assertEqual(result3.reason, 'turn_limit_draw', 'Third check returns draw');
});

// ============================================================================
// R007: First-turn evolution restriction
// ============================================================================

runTest('R007', 'AC1', 'Evolution rejected on global opening turn (turn 0)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Set up active Pokemon for player1
  game.evolutionSystem.setActivePokemon('player1', {
    id: 'basic1',
    name: 'Basic Pokemon',
    stage: 'basic',
    hp: 60
  });

  const evolutionCard = {
    id: 'stage1-1',
    name: 'Stage 1 Pokemon',
    stage: 'stage1',
    hp: 90
  };

  // Start first turn (turn 0)
  game.turnManager.startTurn('player1');

  // Try to evolve - should be blocked on opening turn
  const canEvolve = game.evolutionSystem.canEvolve('player1', 'basic1');
  assertTrue(!canEvolve.canEvolve, 'Evolution blocked on opening turn');
  assertEqual(canEvolve.reason, 'opening_turn_restriction', 'Correct opening turn restriction reason');
});

runTest('R007', 'AC2.1', 'Player1 can evolve on turn 2 (after opening turn)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Set up active Pokemon for player1
  game.evolutionSystem.setActivePokemon('player1', {
    id: 'basic1',
    name: 'Basic Pokemon',
    stage: 'basic',
    hp: 60
  });

  // Complete player1 first turn
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  // Complete player2 first turn
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();

  // Start player1 second turn
  game.turnManager.startTurn('player1');

  // Evolution should now be allowed
  const canEvolve = game.evolutionSystem.canEvolve('player1', 'basic1');
  assertTrue(canEvolve.canEvolve, 'Player1 can evolve on turn 2');
});

runTest('R007', 'AC2.2', 'Player2 can evolve on their first turn (turn 1)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Set up active Pokemon for player2
  game.evolutionSystem.setActivePokemon('player2', {
    id: 'basic2',
    name: 'Basic Pokemon',
    stage: 'basic',
    hp: 60
  });

  // Complete player1 first turn
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  // Start player2 first turn (turn 1)
  game.turnManager.startTurn('player2');

  // Player2 can evolve on their first turn (it's not the global opening turn)
  const canEvolve = game.evolutionSystem.canEvolve('player2', 'basic2');
  assertTrue(canEvolve.canEvolve, 'Player2 can evolve on their first turn');
});

// ============================================================================
// R008: Supporter first-turn allowance
// ============================================================================

runTest('R008', 'AC1', 'Player1 can play Supporter on turn 0 (opening turn)', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Player1 should be able to play a Supporter on turn 0
  const canPlay = game.supporterSystem.canPlaySupporter('player1', 'supporter-card');
  assertTrue(canPlay.allowed, 'Player1 can play Supporter on opening turn');
});

runTest('R008', 'AC2', 'Once-per-turn limit still applies', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Play first Supporter
  game.supporterSystem.playSupporter('player1', 'supporter-card-1');

  // Try to play second Supporter in same turn
  const canPlaySecond = game.supporterSystem.canPlaySupporter('player1', 'supporter-card-2');
  assertTrue(!canPlaySecond.allowed, 'Cannot play second Supporter in same turn');
  assertEqual(canPlaySecond.reason, 'already_played', 'Correct once-per-turn restriction reason');
});

runTest('R008', 'AC3', 'Once-per-turn limit resets at start of next turn', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Start player1 first turn
  game.turnManager.startTurn('player1');

  // Play Supporter
  game.supporterSystem.playSupporter('player1', 'supporter-card-1');

  // End turn
  game.turnManager.endTurn();

  // Start player2 turn
  game.turnManager.startTurn('player2');

  // Player2 can play Supporter on their first turn
  const canPlayP2 = game.supporterSystem.canPlaySupporter('player2', 'supporter-card-2');
  assertTrue(canPlayP2.allowed, 'Player2 can play Supporter on their first turn');

  // End player2 turn
  game.turnManager.endTurn();

  // Start player1 second turn
  game.turnManager.startTurn('player1');

  // Player1 can play Supporter again on their second turn
  const canPlayP1T2 = game.supporterSystem.canPlaySupporter('player1', 'supporter-card-3');
  assertTrue(canPlayP1T2.allowed, 'Player1 can play Supporter on second turn');
});

// ============================================================================
// Cross-story integration tests (rules working together)
// ============================================================================

runTest('R002+R003', 'INT1', 'Opening turn draw + first-turn energy block work together', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Add energy to player1's energy zone
  game.gameState.players.player1.energyZone.push('energy1');

  // Start first turn for player1
  game.turnManager.startTurn('player1');

  // Verify draw worked (R002)
  assertEqual(game.gameState.players.player1.hand.length, 6, 'Opening turn draw worked (R002)');

  // Verify energy attachment blocked (R003)
  const canAttach = game.energySystem.canAttachEnergy('player1');
  assertTrue(!canAttach.allowed, 'First-turn energy blocked (R003)');
  assertEqual(canAttach.reason, 'first_turn_restriction', 'Correct restriction reason (R003)');
});

runTest('R004+R005', 'INT2', 'Hand limit checked before deck out', () => {
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

  assertEqual(result.drawn, 0, 'No cards drawn (R004)');
  assertEqual(result.handLimitReached, true, 'Hand limit reached (R004)');
  assertEqual(result.deckEmpty, false, 'Deck not empty (R004 took precedence over R005)');
});

runTest('R007+R008', 'INT3', 'Evolution blocked but Supporter allowed on opening turn', () => {
  const game = createGame(
    Array(15).fill('card'),
    Array(15).fill('card')
  );

  // Set up active Pokemon for player1
  game.evolutionSystem.setActivePokemon('player1', {
    id: 'basic1',
    name: 'Basic Pokemon',
    stage: 'basic',
    hp: 60
  });

  // Start first turn (turn 0)
  game.turnManager.startTurn('player1');

  // Evolution should be blocked (R007)
  const canEvolve = game.evolutionSystem.canEvolve('player1', 'basic1');
  assertTrue(!canEvolve.canEvolve, 'Evolution blocked on opening turn (R007)');

  // But Supporter should be allowed (R008)
  const canPlaySupporter = game.supporterSystem.canPlaySupporter('player1', 'supporter-card');
  assertTrue(canPlaySupporter.allowed, 'Supporter allowed on opening turn (R008)');
});

runTest('R002+R003+R004+R005+R006+R007+R008', 'INT4', 'All rules work together over multiple turns', () => {
  // Use deck sizes that allow testing both hand limit and deck out
  const game = createGame(
    Array(15).fill('card'),  // Deck for player1 (enough to test hand limit + deck out)
    Array(15).fill('card'),
    50 // Higher turn limit
  );

  // Set up Pokemon before turns start (so they're not flagged as playedThisTurn)
  game.evolutionSystem.setActivePokemon('player1', {
    id: 'basic1',
    name: 'Basic Pokemon',
    stage: 'basic',
    hp: 60
  });
  game.evolutionSystem.setActivePokemon('player2', {
    id: 'basic2',
    name: 'Basic Pokemon',
    stage: 'basic',
    hp: 60
  });

  // === Turn 0 (player1 opening turn) ===
  game.turnManager.startTurn('player1');

  // R002: Opening turn draw works
  assertEqual(game.gameState.players.player1.hand.length, 6, 'R002: Opening turn draw');

  // R003: Energy attachment blocked
  const canAttachP1T0 = game.energySystem.canAttachEnergy('player1');
  assertTrue(!canAttachP1T0.allowed, 'R003: Energy blocked on opening turn');

  // R007: Evolution blocked
  const canEvolveP1T0 = game.evolutionSystem.canEvolve('player1', 'basic1');
  assertTrue(!canEvolveP1T0.canEvolve, 'R007: Evolution blocked on opening turn');

  // R008: Supporter allowed
  const canPlaySupporterP1T0 = game.supporterSystem.canPlaySupporter('player1', 'supporter-card');
  assertTrue(canPlaySupporterP1T0.allowed, 'R008: Supporter allowed on opening turn');

  // Play Supporter to test once-per-turn limit
  game.supporterSystem.playSupporter('player1', 'supporter-card');
  const canPlaySecond = game.supporterSystem.canPlaySupporter('player1', 'supporter-card-2');
  assertTrue(!canPlaySecond.allowed, 'R008: Once-per-turn limit applies');

  game.turnManager.endTurn();

  // === Turn 1 (player2 first turn) ===
  game.turnManager.startTurn('player2');

  // R002: Player2 draws on their first turn
  assertEqual(game.gameState.players.player2.hand.length, 6, 'R002: Player2 draws on first turn');

  // R003: Player2 can attach energy
  game.gameState.players.player2.energyZone.push('energy2');
  const canAttachP2T1 = game.energySystem.canAttachEnergy('player2');
  assertTrue(canAttachP2T1.allowed, 'R003: Player2 can attach energy on first turn');

  // R007: Player2 can evolve (turn 1 is not global opening turn)
  const canEvolveP2T1 = game.evolutionSystem.canEvolve('player2', 'basic2');
  assertTrue(canEvolveP2T1.canEvolve, 'R007: Player2 can evolve on turn 1');

  // R008: Player2 can play Supporter
  const canPlaySupporterP2T1 = game.supporterSystem.canPlaySupporter('player2', 'supporter-card');
  assertTrue(canPlaySupporterP2T1.allowed, 'R008: Player2 can play Supporter on turn 1');

  game.turnManager.endTurn();

  // === Turn 2 (player1 second turn) ===
  game.turnManager.startTurn('player1');

  // R003: Player1 can now attach energy
  const canAttachP1T2 = game.energySystem.canAttachEnergy('player1');
  assertTrue(canAttachP1T2.allowed, 'R003: Player1 can attach energy on turn 2');

  // R007: Player1 can evolve on turn 2
  const canEvolveP1T2 = game.evolutionSystem.canEvolve('player1', 'basic1');
  assertTrue(canEvolveP1T2.canEvolve, 'R007: Player1 can evolve on turn 2');

  // R008: Player1 can play Supporter again (once-per-turn reset)
  const canPlaySupporterP1T2 = game.supporterSystem.canPlaySupporter('player1', 'supporter-card-2');
  assertTrue(canPlaySupporterP1T2.allowed, 'R008: Player1 can play Supporter on turn 2');

  // R004: Test hand limit (need enough cards in deck)
  const deckBeforeFill = game.gameState.players.player1.deck.length;
  while (game.gameState.players.player1.hand.length < 10 && game.gameState.players.player1.deck.length > 0) {
    game.drawSystem.drawCards('player1', 1, false);
  }

  // If we filled to 10, test hand limit
  if (game.gameState.players.player1.hand.length >= 10) {
    const handLimitResult = game.drawSystem.drawCards('player1', 1, true);
    assertEqual(handLimitResult.handLimitReached, true, 'R004: Hand limit enforced');
  } else {
    // If deck ran out before filling hand, we can still test that draw was blocked by deck empty
    assertTrue(game.gameState.players.player1.deck.length === 0, 'R004: Deck empty before hand limit reached');
  }

  // R005: Test deck out (draw from empty deck)
  // First remove cards from hand to allow drawing from deck
  game.gameState.players.player1.hand = [];
  // Now empty the deck
  while (game.gameState.players.player1.deck.length > 0) {
    game.drawSystem.drawCards('player1', 1, false);
  }
  const deckOutResult = game.drawSystem.drawCards('player1', 1, true);
  assertEqual(deckOutResult.deckEmpty, true, 'R005: Deck empty detected');
  assertNull(game.turnManager.winCondition.checkWinCondition(), 'R005: No loss from deck out');

  game.turnManager.endTurn();

  // === R006: Turn limit not reached ===
  const winResult = game.turnManager.winCondition.checkWinCondition();
  assertNull(winResult, 'R006: No win condition before turn limit');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log(`INTEGRATION REGRESSION SUITE SUMMARY (R002-R008)`);
console.log('='.repeat(80));
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${testCount - passedCount}`);
console.log('='.repeat(80));

if (failedTests.length > 0) {
  console.log('\nFailed tests by story ID:');
  const failuresByStory = {};
  failedTests.forEach(test => {
    if (!failuresByStory[test.storyId]) {
      failuresByStory[test.storyId] = [];
    }
    failuresByStory[test.storyId].push(test);
  });

  Object.keys(failuresByStory).sort().forEach(storyId => {
    console.log(`\n${storyId}:`);
    failuresByStory[storyId].forEach(test => {
      console.log(`  - ${test.testId}: ${test.name}`);
      console.log(`    ERROR: ${test.error}`);
    });
  });
}

console.log('='.repeat(80));

if (passedCount === testCount) {
  console.log('✅ All integration regression tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!\n');
  process.exit(1);
}
