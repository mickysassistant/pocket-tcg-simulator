/**
 * Test: On-Energy-Attach Abilities (GAP-009)
 *
 * Tests for abilities that trigger when energy is attached to a Pokémon,
 * specifically the Komala (Comatose) ability that applies Asleep condition.
 *
 * Acceptance Criteria:
 * 1. Implementar triggers on-Energy-attach que aplican estados
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos en retreat/replay/deck/rules/actions)
 * 4. npm run check pasa
 *
 * Story: GAP-009: [Importante][C1] Auto-aplicación de Special Condition (Komala (Comatose))
 */

const { createGame } = require('../../src/index');
const { SPECIAL_CONDITIONS } = require('../../src/game/status-condition-system');

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

// Helper: Create a test Pokémon
function createPokemon(id, name, hp = 100) {
  return {
    id,
    name,
    hp,
    energy: [],
    specialCondition: null
  };
}

// =============================================================================
// TESTS
// =============================================================================

// Test 1: Komala Comatose ability applies Asleep when energy is attached
runTest('AC1: Komala Comatose - applies Asleep when energy attached to active Pokemon', () => {
  const game = createTestGame();

  // Set up Komala in active spot
  const komala = createPokemon('komala-1', 'Komala', 100);
  game.gameState.players.player1.activePokemon = komala;

  // Register Comatose ability
  game.abilitySystem.registerAbility('player1', 'komala-1', {
    id: 'komala-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Start turn (skip first turn restriction)
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy to Komala
  const result = game.energySystem.attachEnergy('player1', 'komala-1');

  assert(result.success, 'Energy attachment should succeed');
  assert(komala.energy.length === 1, 'Komala should have 1 energy');
  assertEqual(komala.specialCondition, SPECIAL_CONDITIONS.SLEEP, 'Komala should be Asleep');
  assert(result.triggerResults.length === 1, 'Should have 1 trigger result');
  assertEqual(result.triggerResults[0].abilityName, 'Comatose', 'Ability name should be Comatose');
  assertEqual(result.triggerResults[0].conditionApplied, true, 'Condition should be applied');
});

// Test 2: Komala Comatose ability does not trigger when Pokemon is on bench
runTest('AC2: Komala Comatose - does not trigger when on bench (is_active condition)', () => {
  const game = createTestGame();

  // Set up Komala on bench and another Pokemon active
  const komala = createPokemon('komala-1', 'Komala', 100);
  game.gameState.players.player1.banque = [komala];
  game.gameState.players.player1.activePokemon = createPokemon('other-1', 'Other', 100);

  // Register Comatose ability with is_active condition
  game.abilitySystem.registerAbility('player1', 'komala-1', {
    id: 'komala-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy to Komala on bench
  const result = game.energySystem.attachEnergy('player1', 'komala-1');

  assert(result.success, 'Energy attachment should succeed');
  assert(komala.energy.length === 1, 'Komala should have 1 energy');
  assert(komala.specialCondition === null, 'Komala should NOT be Asleep');
  assert(result.triggerResults.length === 0, 'Should have no trigger results (condition not met)');
});

// Test 3: Multiple energy attachments each trigger the ability
runTest('AC3: Multiple energy attachments - each triggers the ability', () => {
  const game = createTestGame();

  // Set up Komala in active spot
  const komala = createPokemon('komala-1', 'Komala', 100);
  game.gameState.players.player1.activePokemon = komala;

  // Register Comatose ability
  game.abilitySystem.registerAbility('player1', 'komala-1', {
    id: 'komala-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add multiple energy to zone
  addEnergyToZone(game, 'player1', 3);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach first energy
  let result = game.energySystem.attachEnergy('player1', 'komala-1');
  assert(result.triggerResults.length === 1, 'First attachment should trigger ability');
  assertEqual(komala.specialCondition, SPECIAL_CONDITIONS.SLEEP, 'Komala should be Asleep after first');

  // Attach second energy (already Asleep, but ability still triggers)
  result = game.energySystem.attachEnergy('player1', 'komala-1');
  assert(result.triggerResults.length === 1, 'Second attachment should trigger ability');
  assertEqual(komala.specialCondition, SPECIAL_CONDITIONS.SLEEP, 'Komala should still be Asleep');

  // Attach third energy
  result = game.energySystem.attachEnergy('player1', 'komala-1');
  assert(result.triggerResults.length === 1, 'Third attachment should trigger ability');
  assertEqual(komala.specialCondition, SPECIAL_CONDITIONS.SLEEP, 'Komala should still be Asleep');
  assert(komala.energy.length === 3, 'Komala should have 3 energy');
});

// Test 4: Energy actually attaches to Pokemon's energy array
runTest('AC4: Energy attachment - actually adds energy to Pokemon array', () => {
  const game = createTestGame();

  // Set up a Pokemon in active spot
  const pokemon = createPokemon('pikachu-1', 'Pikachu', 60);
  game.gameState.players.player1.activePokemon = pokemon;

  // Add energy to zone
  addEnergyToZone(game, 'player1', 2);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach first energy
  let result = game.energySystem.attachEnergy('player1', 'pikachu-1');
  assert(result.success, 'First energy attachment should succeed');
  assert(pokemon.energy.length === 1, 'Pokemon should have 1 energy');
  assertEqual(pokemon.energy[0].element, 'psychic', 'Energy should be psychic type');

  // Attach second energy
  result = game.energySystem.attachEnergy('player1', 'pikachu-1');
  assert(result.success, 'Second energy attachment should succeed');
  assert(pokemon.energy.length === 2, 'Pokemon should have 2 energy');
});

// Test 5: Energy attaches to bench Pokemon correctly
runTest('AC5: Energy attachment - works with bench Pokemon', () => {
  const game = createTestGame();

  // Set up Pokemon on bench
  const benchPokemon = createPokemon('bench-1', 'Bulbasaur', 70);
  game.gameState.players.player1.banque = [benchPokemon];
  game.gameState.players.player1.activePokemon = createPokemon('active-1', 'Pikachu', 60);

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy to bench Pokemon
  const result = game.energySystem.attachEnergy('player1', 'bench-1');
  assert(result.success, 'Energy attachment to bench should succeed');
  assert(benchPokemon.energy.length === 1, 'Bench Pokemon should have 1 energy');
});

// Test 6: Energy attachment to non-existent Pokemon fails gracefully
runTest('AC6: Energy attachment - fails gracefully for non-existent Pokemon', () => {
  const game = createTestGame();

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Try to attach to non-existent Pokemon
  const result = game.energySystem.attachEnergy('player1', 'non-existent-pokemon');

  assertEqual(result.success, false, 'Should fail for non-existent Pokemon');
  assertEqual(result.reason, 'pokemon_not_found', 'Reason should be pokemon_not_found');

  // Energy should still be in zone
  assertEqual(game.energySystem.getEnergyZoneSize('player1'), 1, 'Energy should remain in zone');
});

// Test 7: First turn energy restriction still works
runTest('AC7: First turn restriction - still blocks energy attachment', () => {
  const game = createTestGame();

  // Set up a Pokemon
  const pokemon = createPokemon('pikachu-1', 'Pikachu', 60);
  game.gameState.players.player1.activePokemon = pokemon;

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Start first turn (player1 turn 0)
  game.turnManager.startTurn('player1');

  // Try to attach - should be blocked by first turn restriction
  const result = game.energySystem.attachEnergy('player1', 'pikachu-1');

  assertEqual(result.success, false, 'Should be blocked on first turn');
  assertEqual(result.reason, 'first_turn_restriction', 'Reason should be first_turn_restriction');
  assert(pokemon.energy.length === 0, 'Pokemon should have no energy');
});

// Test 8: Energy attachment logged correctly
runTest('AC8: Energy attachment - logged correctly in turnLog', () => {
  const game = createTestGame();

  // Set up Komala in active spot
  const komala = createPokemon('komala-1', 'Komala', 100);
  game.gameState.players.player1.activePokemon = komala;

  // Register Comatose ability
  game.abilitySystem.registerAbility('player1', 'komala-1', {
    id: 'komala-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy
  game.energySystem.attachEnergy('player1', 'komala-1');

  // Check turn log
  const attachLogs = game.gameState.turnLog.filter(log => log.type === 'energy_attached');
  assert(attachLogs.length > 0, 'Should have energy_attached log');
  assertEqual(attachLogs[0].player, 'player1', 'Log should show correct player');
  assertEqual(attachLogs[0].target, 'komala-1', 'Log should show correct target');

  const triggerLogs = game.gameState.turnLog.filter(log => log.type === 'on_energy_attach_condition_applied');
  assert(triggerLogs.length > 0, 'Should have trigger log');
  assertEqual(triggerLogs[0].abilityName, 'Comatose', 'Trigger log should show ability name');
  assertEqual(triggerLogs[0].condition, SPECIAL_CONDITIONS.SLEEP, 'Trigger log should show condition');
  assertEqual(triggerLogs[0].applied, true, 'Trigger log should show condition was applied');
});

// Test 9: Pokemon already Asleep - condition stays same
runTest('AC9: Pokemon already Asleep - condition stays same on re-attach', () => {
  const game = createTestGame();

  // Set up Komala in active spot, already Asleep
  const komala = createPokemon('komala-1', 'Komala', 100);
  komala.specialCondition = SPECIAL_CONDITIONS.SLEEP;
  game.gameState.players.player1.activePokemon = komala;

  // Register Comatose ability
  game.abilitySystem.registerAbility('player1', 'komala-1', {
    id: 'komala-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy
  const result = game.energySystem.attachEnergy('player1', 'komala-1');

  // Ability should still trigger, but condition is already Asleep
  assert(result.triggerResults.length === 1, 'Ability should still trigger');
  assertEqual(result.triggerResults[0].conditionApplied, true, 'Condition applied should still be true');
  assertEqual(komala.specialCondition, SPECIAL_CONDITIONS.SLEEP, 'Komala should still be Asleep');
});

// Test 10: Pokemon immune to special conditions - Comatose blocked
runTest('AC10: Pokemon immune - Comatose blocked by immunity', () => {
  const game = createTestGame();

  // Set up Arceus ex with immunity in active spot
  const arceus = createPokemon('arceus-1', 'Arceus ex', 150);
  game.gameState.players.player1.activePokemon = arceus;

  // Register immunity ability (Arceus ex Fabled Luster)
  game.abilitySystem.registerAbility('player1', 'arceus-1', {
    id: 'arceus-fabled-luster',
    name: 'Fabled Luster',
    type: 'passive',
    effect: {
      type: 'special_condition_immunity'
    },
    condition: {
      type: 'is_active'
    }
  });

  // Register Comatose-like ability to Arceus (simulating edge case)
  game.abilitySystem.registerAbility('player1', 'arceus-1', {
    id: 'arceus-comatose-like',
    name: 'Comatose-like',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy
  const result = game.energySystem.attachEnergy('player1', 'arceus-1');

  // Energy should attach but condition should NOT be applied (immune)
  assert(result.success, 'Energy attachment should succeed');
  assert(arceus.energy.length === 1, 'Arceus should have 1 energy');
  assert(result.triggerResults.length === 1, 'Ability should trigger');
  assertEqual(result.triggerResults[0].conditionApplied, false, 'Condition should NOT be applied (immune)');
  assertEqual(result.triggerResults[0].conditionApplyReason, 'immune', 'Reason should be immune');
  assert(arceus.specialCondition === null, 'Arceus should NOT be Asleep (immune)');
});

// Test 11: No on_energy_attach ability - energy attaches normally
runTest('AC11: No ability - energy attaches normally without triggers', () => {
  const game = createTestGame();

  // Set up a Pokemon without any abilities
  const pokemon = createPokemon('pikachu-1', 'Pikachu', 60);
  game.gameState.players.player1.activePokemon = pokemon;

  // Add energy to zone
  addEnergyToZone(game, 'player1', 1);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach energy
  const result = game.energySystem.attachEnergy('player1', 'pikachu-1');

  // Should attach without any triggers
  assert(result.success, 'Energy attachment should succeed');
  assert(pokemon.energy.length === 1, 'Pokemon should have 1 energy');
  assert(result.triggerResults.length === 0, 'Should have no trigger results');
});

// Test 12: triggerOnEnergyAttach returns empty array when no abilities
runTest('AC12: triggerOnEnergyAttach - returns empty array when no abilities registered', () => {
  const game = createTestGame();

  // Set up a Pokemon
  const pokemon = createPokemon('pikachu-1', 'Pikachu', 60);
  game.gameState.players.player1.activePokemon = pokemon;

  // Call trigger directly
  const triggers = game.abilitySystem.triggerOnEnergyAttach('player1', 'pikachu-1', { type: 'psychic' });

  assert(Array.isArray(triggers), 'Should return an array');
  assert(triggers.length === 0, 'Should be empty when no abilities registered');
});

// Test 13: triggerOnEnergyAttach returns empty array when abilities don't match
runTest('AC13: triggerOnEnergyAttach - returns empty for non-matching abilities', () => {
  const game = createTestGame();

  // Set up a Pokemon with non-on_energy_attach abilities
  const pokemon = createPokemon('pikachu-1', 'Pikachu', 60);
  game.gameState.players.player1.activePokemon = pokemon;

  // Register damage bonus ability (not on_energy_attach)
  game.abilitySystem.registerAbility('player1', 'pikachu-1', {
    id: 'pikachu-bonus',
    name: 'Damage Bonus',
    type: 'passive',
    effect: {
      type: 'damage_bonus',
      amount: 10
    },
    condition: {
      type: 'always'
    }
  });

  // Call trigger
  const triggers = game.abilitySystem.triggerOnEnergyAttach('player1', 'pikachu-1', { type: 'psychic' });

  assert(triggers.length === 0, 'Should be empty for non-matching ability types');
});

// Test 14: Multiple Pokemon with on_energy_attach abilities
runTest('AC14: Multiple Pokemon - each triggers independently', () => {
  const game = createTestGame();

  // Set up two Pokemon, each with Comatose-like ability
  const komala1 = createPokemon('komala-1', 'Komala', 100);
  const komala2 = createPokemon('komala-2', 'Komala', 100);
  game.gameState.players.player1.activePokemon = komala1;
  game.gameState.players.player1.banque = [komala2];

  // Register abilities for both
  game.abilitySystem.registerAbility('player1', 'komala-1', {
    id: 'komala-1-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  game.abilitySystem.registerAbility('player1', 'komala-2', {
    id: 'komala-2-comatose',
    name: 'Comatose',
    type: 'passive',
    effect: {
      type: 'on_energy_attach',
      applyCondition: SPECIAL_CONDITIONS.SLEEP
    },
    condition: {
      type: 'is_active'
    }
  });

  // Add energy to zone
  addEnergyToZone(game, 'player1', 2);

  // Skip first turn restriction
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');

  // Attach to active Komala (should trigger)
  let result = game.energySystem.attachEnergy('player1', 'komala-1');
  assert(result.triggerResults.length === 1, 'Active Komala should trigger');
  assertEqual(komala1.specialCondition, SPECIAL_CONDITIONS.SLEEP, 'Active Komala should be Asleep');

  // Attach to bench Komala (should NOT trigger - is_active condition not met)
  result = game.energySystem.attachEnergy('player1', 'komala-2');
  assert(result.triggerResults.length === 0, 'Bench Komala should NOT trigger (is_active condition)');
  assert(komala2.specialCondition === null, 'Bench Komala should NOT be Asleep');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('ON-ENERGY-ATTACH ABILITIES TEST SUMMARY');
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
