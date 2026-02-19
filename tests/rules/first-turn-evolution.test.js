/**
 * Test: First-Turn Evolution Restriction (R007)
 * 
 * Tests the rule that evolution is blocked on the global opening turn (turn 0).
 * After turn 0, evolution is allowed subject to other constraints.
 * 
 * Acceptance Criteria:
 * 1. Evolution is rejected on global opening turn per rule lock.
 * 2. Evolution eligibility on subsequent turns follows existing per-Pokemon timing constraints.
 * 3. No contradictory turn-boundary logic remains between move and engine validation paths.
 * 4. Tests for evolution first-turn restriction pass.
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

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
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

// =============================================================================
// SETUP HELPERS
// =============================================================================

// Create a simple deck of cards
function createDeck(size) {
  return Array.from({ length: size }, (_, i) => ({ id: i, name: `Card ${i}` }));
}

// Create game with custom decks
function createTestGame(p1DeckSize = 60, p2DeckSize = 60) {
  const p1Deck = createDeck(p1DeckSize);
  const p2Deck = createDeck(p2DeckSize);
  const game = createGame(p1Deck, p2Deck);
  return game;
}

// Create a basic Pokemon
function createBasicPokemon(id, name) {
  return {
    id: id,
    name: name,
    stage: 'basic',
    hp: 60,
    type: 'grass'
  };
}

// Create a Stage 1 evolution card
function createStage1Evolution(id, name) {
  return {
    id: id,
    name: name,
    stage: 'stage1',
    hp: 90,
    type: 'grass'
  };
}

// Create a Stage 2 evolution card
function createStage2Evolution(id, name) {
  return {
    id: id,
    name: name,
    stage: 'stage2',
    hp: 150,
    type: 'grass'
  };
}

// Setup game with active Pokemon
function setupWithActivePokemon(game) {
  const p1Pokemon = createBasicPokemon('p1-basic-1', 'Bulbasaur');
  const p2Pokemon = createBasicPokemon('p2-basic-1', 'Charmander');
  
  game.evolutionSystem.setActivePokemon('player1', p1Pokemon);
  game.evolutionSystem.setActivePokemon('player2', p2Pokemon);
  
  return { p1Pokemon, p2Pokemon };
}

// =============================================================================
// ACCEPTANCE CRITERION 1: Evolution is rejected on global opening turn
// =============================================================================

// AC1.1: Player1 cannot evolve on turn 0 (global opening turn)
runTest('AC1.1: Player1 cannot evolve on turn 0 (global opening turn)', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  
  // Try to evolve player1's active Pokemon
  const evolutionCard = createStage1Evolution('evo-1', 'Ivysaur');
  const result = game.evolutionSystem.evolve('player1', 'p1-basic-1', evolutionCard);
  
  assertEqual(result.success, false, 'Evolution should fail');
  assertEqual(result.reason, 'opening_turn_restriction', 'Reason should be opening_turn_restriction');
  assertEqual(result.message, 'Cannot evolve on the opening turn of the game', 'Message should match');
  
  // Check turn log contains blocked event
  const blockedLogs = game.gameState.turnLog.filter(log => 
    log.type === 'evolution_blocked' && 
    log.reason === 'opening_turn_restriction'
  );
  assert(blockedLogs.length > 0, 'Turn log should contain evolution_blocked event');
});

// AC1.2: Global opening turn is only turn 0, not player2's first turn
runTest('AC1.2: Global opening turn is only turn 0, not player2\'s first turn', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Start turn 0 for player1, then end it
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Now it's player2's turn, turnNumber is 1 (NOT the global opening turn)
  assertEqual(game.gameState.turnNumber, 1, 'Turn number should be 1');
  
  // Player2 should be able to evolve on turn 1 (their first turn, but not the global opening turn)
  const evolutionCard = createStage1Evolution('evo-1', 'Charmeleon');
  const result = game.evolutionSystem.evolve('player2', 'p2-basic-1', evolutionCard);
  
  assertEqual(result.success, true, 'Evolution should succeed on turn 1');
  assertEqual(result.reason, undefined, 'No reason for successful evolution');
});

// AC1.3: canEvolve returns false on turn 0
runTest('AC1.3: canEvolve returns false on turn 0', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Start turn 0
  game.turnManager.startTurn('player1');
  
  // Check canEvolve
  const validation = game.evolutionSystem.canEvolve('player1', 'p1-basic-1');
  
  assertEqual(validation.canEvolve, false, 'canEvolve should be false');
  assertEqual(validation.reason, 'opening_turn_restriction', 'Reason should be opening_turn_restriction');
});

// AC1.4: isOpeningTurn correctly identifies turn 0
runTest('AC1.4: isOpeningTurn correctly identifies turn 0', () => {
  const game = createTestGame();
  
  // Before starting any turn, turnNumber is 0
  assertEqual(game.gameState.turnNumber, 0, 'Turn number should be 0 initially');
  assertEqual(game.evolutionSystem.isOpeningTurn(), true, 'Should be opening turn');
  
  // Start turn 0 for player1
  game.turnManager.startTurn('player1');
  assertEqual(game.evolutionSystem.isOpeningTurn(), true, 'Should still be opening turn');
  
  // End turn 0, now turnNumber is 1
  game.turnManager.endTurn();
  assertEqual(game.gameState.turnNumber, 1, 'Turn number should be 1');
  assertEqual(game.evolutionSystem.isOpeningTurn(), false, 'Should not be opening turn anymore');
});

// AC1.5: Multiple evolution attempts on turn 0 all blocked
runTest('AC1.5: Multiple evolution attempts on turn 0 all blocked', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Add Pokemon to bench
  game.evolutionSystem.addToBanque('player1', createBasicPokemon('p1-bench-1', 'Squirtle'));
  
  // Start turn 0
  game.turnManager.startTurn('player1');
  
  // Try to evolve multiple Pokemon - all should fail
  const result1 = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
  const result2 = game.evolutionSystem.evolve('player1', 'p1-bench-1', createStage1Evolution('evo-2', 'Wartortle'));
  
  assertEqual(result1.success, false, 'First evolution should fail');
  assertEqual(result1.reason, 'opening_turn_restriction', 'First evolution reason should match');
  assertEqual(result2.success, false, 'Second evolution should fail');
  assertEqual(result2.reason, 'opening_turn_restriction', 'Second evolution reason should match');
});

// =============================================================================
// ACCEPTANCE CRITERION 2: Evolution eligibility on subsequent turns
// =============================================================================

// AC2.1: Player1 can evolve on turn 2 (after opening turn)
runTest('AC2.1: Player1 can evolve on turn 2 (after opening turn)', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Complete turn 0 (player1) and turn 1 (player2)
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Now it's turn 2, player1's turn
  game.turnManager.startTurn('player1');
  assertEqual(game.gameState.turnNumber, 2, 'Turn number should be 2');
  
  // Try to evolve - should succeed
  const evolutionCard = createStage1Evolution('evo-1', 'Ivysaur');
  const result = game.evolutionSystem.evolve('player1', 'p1-basic-1', evolutionCard);
  
  assertEqual(result.success, true, 'Evolution should succeed');
  
  // Verify Pokemon was evolved
  const pokemon = game.evolutionSystem.getPokemon('player1', 'p1-basic-1');
  assertEqual(pokemon.stage, 'stage1', 'Pokemon stage should be stage1');
  assertEqual(pokemon.name, 'Ivysaur', 'Pokemon name should be Ivysaur');
});

// AC2.2: Player2 can evolve on their first turn (turn 1)
runTest('AC2.2: Player2 can evolve on their first turn (turn 1)', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Complete turn 0
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  
  // Now it's player2's turn, turnNumber is 1
  game.turnManager.startTurn('player2');
  assertEqual(game.gameState.turnNumber, 1, 'Turn number should be 1');
  
  // Try to evolve - should succeed (turn 1 is not opening turn)
  const evolutionCard = createStage1Evolution('evo-1', 'Charmeleon');
  const result = game.evolutionSystem.evolve('player2', 'p2-basic-1', evolutionCard);
  
  assertEqual(result.success, true, 'Evolution should succeed');
  assertEqual(result.reason, undefined, 'No reason should be set for successful evolution');
});

// AC2.3: Cannot evolve Pokemon played this turn
runTest('AC2.3: Cannot evolve Pokemon played this turn', () => {
  const game = createTestGame();
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  // Play a new Pokemon (marks as played this turn)
  game.evolutionSystem.addToBanque('player1', createBasicPokemon('new-pokemon', 'Pikachu'));
  
  // Try to evolve the newly played Pokemon - should fail
  const evolutionCard = createStage1Evolution('evo-1', 'Raichu');
  const result = game.evolutionSystem.evolve('player1', 'new-pokemon', evolutionCard);
  
  assertEqual(result.success, false, 'Evolution should fail');
  assertEqual(result.reason, 'played_this_turn', 'Reason should be played_this_turn');
});

// AC2.4: Cannot evolve same Pokemon twice in one turn
runTest('AC2.4: Cannot evolve same Pokemon twice in one turn', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  // First evolution - should succeed
  const evo1 = createStage1Evolution('evo-1', 'Ivysaur');
  const result1 = game.evolutionSystem.evolve('player1', 'p1-basic-1', evo1);
  assertEqual(result1.success, true, 'First evolution should succeed');
  
  // Second evolution on same Pokemon - should fail
  const evo2 = createStage2Evolution('evo-2', 'Venusaur');
  const result2 = game.evolutionSystem.evolve('player1', 'p1-basic-1', evo2);
  
  assertEqual(result2.success, false, 'Second evolution should fail');
  assertEqual(result2.reason, 'already_evolved', 'Reason should be already_evolved');
});

// AC2.5: Multiple different Pokemon can evolve in same turn
runTest('AC2.5: Multiple different Pokemon can evolve in same turn', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Add more Pokemon to bench
  game.evolutionSystem.addToBanque('player1', createBasicPokemon('p1-bench-1', 'Squirtle'));
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  // Mark bench Pokemon as not played this turn (it was played in setup)
  game.gameState.players.player1.banque[0].playedThisTurn = false;
  
  // Evolve two different Pokemon - both should succeed
  const evo1 = createStage1Evolution('evo-1', 'Ivysaur');
  const evo2 = createStage1Evolution('evo-2', 'Wartortle');
  
  const result1 = game.evolutionSystem.evolve('player1', 'p1-basic-1', evo1);
  const result2 = game.evolutionSystem.evolve('player1', 'p1-bench-1', evo2);
  
  assertEqual(result1.success, true, 'First evolution should succeed');
  assertEqual(result2.success, true, 'Second evolution should succeed');
});

// =============================================================================
// ACCEPTANCE CRITERION 3: No contradictory turn-boundary logic
// =============================================================================

// AC3.1: canEvolve and evolve use same boundary rule
runTest('AC3.1: canEvolve and evolve use same boundary rule', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Turn 0 - both should block
  game.turnManager.startTurn('player1');
  
  const validation = game.evolutionSystem.canEvolve('player1', 'p1-basic-1');
  const result = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
  
  assertEqual(validation.canEvolve, false, 'canEvolve should be false');
  assertEqual(result.success, false, 'evolve should fail');
  assertEqual(validation.reason, result.reason, 'Both should have same reason');
});

// AC3.2: Turn boundary consistent across multiple games
runTest('AC3.2: Turn boundary consistent across multiple games', () => {
  // Test 3 games to ensure deterministic behavior
  for (let i = 0; i < 3; i++) {
    const game = createTestGame();
    setupWithActivePokemon(game);
    
    game.turnManager.startTurn('player1');
    
    const result = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
    
    assertEqual(result.success, false, `Game ${i}: Evolution should fail on turn 0`);
    assertEqual(result.reason, 'opening_turn_restriction', `Game ${i}: Reason should match`);
  }
});

// AC3.3: Engine helper isOpeningTurn matches turn tracking
runTest('AC3.3: Engine helper isOpeningTurn matches turn tracking', () => {
  const game = createTestGame();
  
  // Before any turns
  assertEqual(game.evolutionSystem.isOpeningTurn(), true, 'Should be opening turn initially');
  assertEqual(game.gameState.getCurrentTurnInfo().isFirstTurn, true, 'GameState should report first turn');
  
  // Start turn 0
  game.turnManager.startTurn('player1');
  assertEqual(game.evolutionSystem.isOpeningTurn(), true, 'Should be opening turn after start');
  
  // End turn 0
  game.turnManager.endTurn();
  assertEqual(game.evolutionSystem.isOpeningTurn(), false, 'Should not be opening turn after end');
  assertEqual(game.gameState.getCurrentTurnInfo().isFirstTurn, false, 'GameState should report not first turn');
});

// =============================================================================
// REGRESSION TESTS: Turn 0 vs Turn 1 behavior
// =============================================================================

// Regression 1: Turn 0 blocks both players, turn 1 allows player2
runTest('Regression.1: Turn 0 blocks both players, turn 1 allows player2', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Turn 0 for player1 - blocked
  game.turnManager.startTurn('player1');
  const result0 = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
  assertEqual(result0.success, false, 'Turn 0 should block player1');
  game.turnManager.endTurn();
  
  // Turn 1 for player2 - allowed
  game.turnManager.startTurn('player2');
  const result1 = game.evolutionSystem.evolve('player2', 'p2-basic-1', createStage1Evolution('evo-2', 'Charmeleon'));
  assertEqual(result1.success, true, 'Turn 1 should allow player2');
});

// Regression 2: Turn 2 allows player1 evolution
runTest('Regression.2: Turn 2 allows player1 evolution', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Complete turns 0 and 1
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Turn 2 for player1 - allowed
  game.turnManager.startTurn('player1');
  const result2 = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
  assertEqual(result2.success, true, 'Turn 2 should allow player1');
});

// Regression 3: playedThisTurn flag resets each turn
runTest('Regression.3: playedThisTurn flag resets each turn', () => {
  const game = createTestGame();
  
  // Turn 0 - play Pokemon
  game.turnManager.startTurn('player1');
  game.evolutionSystem.addToBanque('player1', createBasicPokemon('new-pokemon', 'Pikachu'));
  
  const pokemon = game.evolutionSystem.getPokemon('player1', 'new-pokemon');
  assertEqual(pokemon.playedThisTurn, true, 'Pokemon should be marked as played this turn');
  
  // End turn
  game.turnManager.endTurn();
  
  // Turn 1 - start player2's turn (resets flags)
  game.turnManager.startTurn('player2');
  
  // Check that player1's Pokemon flag was reset
  const pokemonAfterReset = game.evolutionSystem.getPokemon('player1', 'new-pokemon');
  assertEqual(pokemonAfterReset.playedThisTurn, false, 'Pokemon flag should be reset');
});

// Regression 4: evolvedThisTurn tracking resets each turn
runTest('Regression.4: evolvedThisTurn tracking resets each turn', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Turn 2 - evolve Pokemon
  game.turnManager.startTurn('player1');
  const result1 = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
  assertEqual(result1.success, true, 'First evolution should succeed');
  
  // End turn
  game.turnManager.endTurn();
  
  // Turn 3 - start player2's turn (resets tracking)
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  
  // Turn 4 - evolve same Pokemon again (should work after reset)
  game.turnManager.startTurn('player1');
  const result2 = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage2Evolution('evo-2', 'Venusaur'));
  assertEqual(result2.success, true, 'Evolution should succeed after tracking reset');
});

// =============================================================================
// ADDITIONAL TESTS: Edge cases and consistency
// =============================================================================

// Test: Evolution logs contain correct information
runTest('Additional.1: Evolution logs contain correct information', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  // Evolve
  const evolutionCard = createStage1Evolution('evo-1', 'Ivysaur');
  game.evolutionSystem.evolve('player1', 'p1-basic-1', evolutionCard);
  
  // Check logs
  const evoLogs = game.gameState.turnLog.filter(log => log.type === 'evolution');
  assert(evoLogs.length > 0, 'Should have evolution log');
  
  const evoLog = evoLogs[0];
  assertEqual(evoLog.player, 'player1', 'Log should have correct player');
  assertEqual(evoLog.pokemonId, 'p1-basic-1', 'Log should have correct pokemonId');
  assertEqual(evoLog.from, 'basic', 'Log should have correct from stage');
  assertEqual(evoLog.to, 'stage1', 'Log should have correct to stage');
  assertEqual(evoLog.cardId, 'evo-1', 'Log should have correct cardId');
});

// Test: Active and bench Pokemon can both evolve
runTest('Additional.2: Active and bench Pokemon can both evolve', () => {
  const game = createTestGame();
  setupWithActivePokemon(game);
  game.evolutionSystem.addToBanque('player1', createBasicPokemon('p1-bench-1', 'Squirtle'));
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  // Mark bench Pokemon as not played this turn
  game.gameState.players.player1.banque[0].playedThisTurn = false;
  
  // Evolve both
  const result1 = game.evolutionSystem.evolve('player1', 'p1-basic-1', createStage1Evolution('evo-1', 'Ivysaur'));
  const result2 = game.evolutionSystem.evolve('player1', 'p1-bench-1', createStage1Evolution('evo-2', 'Wartortle'));
  
  assertEqual(result1.success, true, 'Active Pokemon should evolve');
  assertEqual(result2.success, true, 'Bench Pokemon should evolve');
});

// Test: canEvolve returns correct reasons for different failures
runTest('Additional.3: canEvolve returns correct reasons for different failures', () => {
  const game = createTestGame();
  
  // Skip to turn 2
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  // Test played_this_turn
  game.evolutionSystem.addToBanque('player1', createBasicPokemon('new-pokemon', 'Pikachu'));
  const playedResult = game.evolutionSystem.canEvolve('player1', 'new-pokemon');
  assertEqual(playedResult.canEvolve, false, 'Should not evolve');
  assertEqual(playedResult.reason, 'played_this_turn', 'Should have correct reason');
  
  // Test already_evolved
  game.gameState.players.player1.banque[0].playedThisTurn = false;
  game.evolutionSystem.evolve('player1', 'new-pokemon', createStage1Evolution('evo-1', 'Raichu'));
  const alreadyResult = game.evolutionSystem.canEvolve('player1', 'new-pokemon');
  assertEqual(alreadyResult.canEvolve, false, 'Should not evolve again');
  assertEqual(alreadyResult.reason, 'already_evolved', 'Should have correct reason');
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n========================================');
console.log('Test Summary:');
console.log(`  Passed: ${testsPassed}`);
console.log(`  Failed: ${testsFailed}`);
console.log(`  Total:  ${testsPassed + testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
