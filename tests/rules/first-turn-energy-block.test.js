/**
 * Test: First-Turn Energy Attachment Restriction (R003)
 * 
 * Tests the rule that the player going first CANNOT attach energy from Energy Zone
 * on their first turn. This restriction is independent of the opening-turn draw rule.
 * 
 * Acceptance Criteria:
 * 1. On turn 0 for player1, manual attachment from Energy Zone is rejected with the existing validation reason key or message.
 * 2. Player2 on their first playable turn is not blocked by this first-turn attachment rule.
 * 3. Attachment behavior on turns after opening turn is unchanged.
 * 4. Tests for first-turn energy attachment restriction pass.
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
function createTestGame(p1DeckSize = 60, p2DeckSize = 60) {
  const p1Deck = createDeck(p1DeckSize);
  const p2Deck = createDeck(p2DeckSize);
  const game = createGame(p1Deck, p2Deck);
  return game;
}

// Helper: Add energy to a player's Energy Zone
function addEnergyToZone(game, playerId, count = 1) {
  for (let i = 0; i < count; i++) {
    game.gameState.players[playerId].energyZone.push({
      id: `energy-${playerId}-${i}`,
      type: 'basic',
      element: 'psychic'
    });
  }
}

// Helper: Set up active Pokemon for testing
function setupActivePokemon(game, playerId) {
  game.gameState.players[playerId].activePokemon = {
    id: `${playerId}-active-pokemon`,
    name: 'Test Pokemon',
    hp: 100,
    energy: []
  };
}

// =============================================================================
// TESTS
// =============================================================================

// Test 1: Player1 cannot attach energy on turn 0 (first turn)
runTest('AC1: Player1 on turn 0 - energy attachment rejected with validation reason', () => {
  const game = createTestGame();
  
  // Add energy to player1's Energy Zone
  addEnergyToZone(game, 'player1', 1);
  assertEqual(game.energySystem.getEnergyZoneSize('player1'), 1, 'Player1 should have 1 energy in zone');
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Try to attach energy - should be blocked
  const result = game.energySystem.attachEnergy('player1', 'active-pokemon');
  
  assertEqual(result.success, false, 'Energy attachment should fail');
  assertEqual(result.reason, 'first_turn_restriction', 'Reason should be first_turn_restriction');
  assertEqual(result.message, 'Cannot attach energy on the first turn when going first', 'Message should match');
  
  // Check turn log contains blocked event
  const blockedLogs = game.gameState.turnLog.filter(log => 
    log.type === 'energy_attach_blocked' && 
    log.reason === 'first_turn_restriction'
  );
  assert(blockedLogs.length > 0, 'Turn log should contain energy_attach_blocked event');
  
  // Energy should still be in the zone
  assertEqual(game.energySystem.getEnergyZoneSize('player1'), 1, 'Energy should remain in zone');
});

// Test 2: Player2 on first playable turn CAN attach energy
runTest('AC2: Player2 first turn - energy attachment allowed', () => {
  const game = createTestGame();

  // Add energy to both players' Energy Zones
  addEnergyToZone(game, 'player1', 1);
  addEnergyToZone(game, 'player2', 1);

  // Complete player1's first turn
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  // Start player2's first turn (turn 1)
  game.turnManager.startTurn('player2');

  // Set up active Pokemon
  setupActivePokemon(game, 'player2');

  // Player2 should be able to attach energy
  const result = game.energySystem.attachEnergy('player2', 'player2-active-pokemon');

  assertEqual(result.success, true, 'Energy attachment should succeed for player2');
  assert(result.energy !== undefined, 'Should return energy object');

  // Energy should be removed from zone
  assertEqual(game.energySystem.getEnergyZoneSize('player2'), 0, 'Energy should be removed from zone');

  // Check turn log contains attached event
  const attachLogs = game.gameState.turnLog.filter(log => log.type === 'energy_attached');
  assert(attachLogs.length > 0, 'Turn log should contain energy_attached event');
});

// Test 3: Player1 can attach energy on turn 2 (not first turn)
runTest('AC3: Player1 turn 2 - energy attachment allowed', () => {
  const game = createTestGame();

  // Add energy to player1's Energy Zone
  addEnergyToZone(game, 'player1', 1);

  // Complete first full round
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();

  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();

  // Start player1's turn 2 (not first turn anymore)
  game.turnManager.startTurn('player1');

  // Set up active Pokemon
  setupActivePokemon(game, 'player1');

  // Player1 should be able to attach energy
  const result = game.energySystem.attachEnergy('player1', 'player1-active-pokemon');

  assertEqual(result.success, true, 'Energy attachment should succeed for player1 on turn 2');

  // Energy should be removed from zone
  assertEqual(game.energySystem.getEnergyZoneSize('player1'), 0, 'Energy should be removed from zone');
});

// Test 4: Attachment behavior unchanged after first turn
runTest('AC3: Later turns - attachment behavior unchanged', () => {
  const game = createTestGame();

  // Play several turns
  for (let turn = 0; turn < 5; turn++) {
    const currentPlayer = turn % 2 === 0 ? 'player1' : 'player2';

    // Add energy to current player
    addEnergyToZone(game, currentPlayer, 1);

    // Start turn
    game.turnManager.startTurn(currentPlayer);

    // Set up active Pokemon (if not already set up)
    if (!game.gameState.players[currentPlayer].activePokemon) {
      setupActivePokemon(game, currentPlayer);
    }

    // Try to attach energy (should succeed unless it's player1 turn 0)
    const result = game.energySystem.attachEnergy(currentPlayer, `${currentPlayer}-active-pokemon`);

    if (turn === 0 && currentPlayer === 'player1') {
      assertEqual(result.success, false, `Turn ${turn} ${currentPlayer}: Should be blocked`);
    } else {
      assertEqual(result.success, true, `Turn ${turn} ${currentPlayer}: Should succeed`);
    }

    game.turnManager.endTurn();
  }
});

// Test 5: First-turn restriction only applies to player going first
runTest('First-turn restriction - only blocks player1 on turn 0', () => {
  const game = createTestGame();

  // Test player1 on turn 0
  addEnergyToZone(game, 'player1', 1);
  setupActivePokemon(game, 'player1');
  game.turnManager.startTurn('player1');
  const p1Result = game.energySystem.attachEnergy('player1', 'player1-active-pokemon');
  assertEqual(p1Result.success, false, 'Player1 on turn 0 should be blocked');
  assertEqual(p1Result.reason, 'first_turn_restriction', 'Reason should match');

  game.turnManager.endTurn();

  // Test player2 on turn 1
  addEnergyToZone(game, 'player2', 1);
  setupActivePokemon(game, 'player2');
  game.turnManager.startTurn('player2');
  const p2Result = game.energySystem.attachEnergy('player2', 'player2-active-pokemon');
  assertEqual(p2Result.success, true, 'Player2 on turn 1 should succeed');
});

// Test 6: Energy attachment respects Energy Zone availability
runTest('Energy attachment - respects Energy Zone availability', () => {
  const game = createTestGame();
  
  // Don't add any energy to player1's zone
  assertEqual(game.energySystem.getEnergyZoneSize('player1'), 0, 'Player1 zone should be empty');
  
  // Complete first turn
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Try to attach on turn 2
  game.turnManager.startTurn('player1');
  const result = game.energySystem.attachEnergy('player1', 'active-pokemon');
  
  assertEqual(result.success, false, 'Should fail when no energy in zone');
  assertEqual(result.reason, 'no_energy_available', 'Reason should be no_energy_available');
});

// Test 7: canAttachEnergy validation method works correctly
runTest('canAttachEnergy - validation method correct', () => {
  const game = createTestGame();
  
  // Turn 0, player1
  const check1 = game.energySystem.canAttachEnergy('player1');
  assertEqual(check1.allowed, false, 'Player1 on turn 0 should not be allowed');
  assertEqual(check1.reason, 'first_turn_restriction', 'Reason should match');
  
  // Turn 0, player2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  const check2 = game.energySystem.canAttachEnergy('player2');
  assertEqual(check2.allowed, true, 'Player2 on turn 1 should be allowed');
  assertEqual(check2.reason, null, 'Reason should be null');
  
  // Turn 2, player1
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  const check3 = game.energySystem.canAttachEnergy('player1');
  assertEqual(check3.allowed, true, 'Player1 on turn 2 should be allowed');
  assertEqual(check3.reason, null, 'Reason should be null');
});

// Test 8: Restriction is decoupled from draw logic
runTest('Restriction decoupled - energy block independent of draw', () => {
  const game = createTestGame();
  
  // Add energy to player1's zone
  addEnergyToZone(game, 'player1', 1);
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Verify player1 DID draw a card (from R002)
  const drawLogs = game.gameState.turnLog.filter(log => log.type === 'draw');
  assert(drawLogs.length > 0, 'Player1 should have drawn a card');
  
  // But still cannot attach energy
  const energyResult = game.energySystem.attachEnergy('player1', 'active-pokemon');
  assertEqual(energyResult.success, false, 'Energy attachment should still be blocked');
  assertEqual(energyResult.reason, 'first_turn_restriction', 'Reason should be first_turn_restriction');
  
  // Verify both events are logged separately
  const energyBlockLogs = game.gameState.turnLog.filter(log => 
    log.type === 'energy_attach_blocked'
  );
  assert(energyBlockLogs.length > 0, 'Energy block should be logged separately');
});

// Test 9: Multiple first-turn energy attempts all blocked
runTest('Multiple attempts - all first-turn attempts blocked', () => {
  const game = createTestGame();
  
  // Add multiple energy to player1's zone
  addEnergyToZone(game, 'player1', 5);
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Try to attach multiple times - all should fail
  for (let i = 0; i < 5; i++) {
    const result = game.energySystem.attachEnergy('player1', `pokemon-${i}`);
    assertEqual(result.success, false, `Attempt ${i+1} should be blocked`);
    assertEqual(result.reason, 'first_turn_restriction', `Reason should match for attempt ${i+1}`);
  }
  
  // All energy should still be in zone
  assertEqual(game.energySystem.getEnergyZoneSize('player1'), 5, 'All energy should remain in zone');
  
  // Check for multiple blocked logs
  const blockedLogs = game.gameState.turnLog.filter(log => 
    log.type === 'energy_attach_blocked'
  );
  assertEqual(blockedLogs.length, 5, 'Should have 5 blocked log entries');
});

// Test 10: Energy system correctly identifies first turn for player going first
runTest('Energy system - correctly identifies first turn', () => {
  const game = createTestGame();
  
  // Before any turn starts
  assert(game.energySystem.isFirstTurnGoingFirst(), 'Should be first turn before turn starts');
  
  // After starting player1 turn 0
  game.turnManager.startTurn('player1');
  assert(game.energySystem.isFirstTurnGoingFirst(), 'Should be first turn on player1 turn 0');
  
  // After ending turn 0
  game.turnManager.endTurn();
  assert(!game.energySystem.isFirstTurnGoingFirst(), 'Should NOT be first turn after turn 0 ends');
  
  // On player2 turn 1
  game.turnManager.startTurn('player2');
  assert(!game.energySystem.isFirstTurnGoingFirst(), 'Should NOT be first turn on player2 turn 1');
  
  // On player1 turn 2
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  assert(!game.energySystem.isFirstTurnGoingFirst(), 'Should NOT be first turn on player1 turn 2');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('FIRST-TURN ENERGY BLOCK TEST SUMMARY');
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
