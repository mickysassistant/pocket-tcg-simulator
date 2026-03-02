/**
 * Tests for GAP-008: Switch desde Banca a Activo (Solgaleo ex (Rising Road))
 *
 * This file tests the switch_pokemon effect in ActivatedAbilitySystem.
 * Solgaleo ex's Rising Road ability:
 * - Once during your turn
 * - If this Pokémon is on your Bench
 * - You may switch it with your Active Pokémon
 */

const { createGame, ActivatedAbilitySystem, StatusConditionSystem, SPECIAL_CONDITIONS } = require('../../src/index');

// ---------------------------------------------------------------------------
// Test Utilities
// ---------------------------------------------------------------------------

let testsPassed = 0;
let testsFailed = 0;

function assertEqual(actual, expected, testName) {
  if (actual !== expected) {
    throw new Error(`${testName}: Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, testName) {
  if (!value) {
    throw new Error(`${testName}: Expected true, got ${value}`);
  }
}

function assertFalse(value, testName) {
  if (value) {
    throw new Error(`${testName}: Expected false, got ${value}`);
  }
}

function assertThrows(fn, testName) {
  try {
    fn();
    throw new Error(`${testName}: Expected function to throw, but it didn't`);
  } catch (e) {
    if (e.message.includes('Expected function to throw')) {
      throw e;
    }
    // Expected error - test passes
  }
}

function runTest(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    testsFailed++;
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function createSimplePokemon(id, name, type, hp) {
  return {
    id,
    name,
    type,
    hp,
    energy: []
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Test 1: ActivatedAbilitySystem is exported from index
runTest('ActivatedAbilitySystem is exported from index', () => {
  assertTrue(ActivatedAbilitySystem !== undefined, 'ActivatedAbilitySystem should be exported');
});

// Test 2: Can register a switch ability
runTest('Can register a switch ability', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const abilities = game.activatedAbilitySystem.getAllAbilities();
  assertTrue(abilities.length > 0, 'Should have at least one ability');
  assertEqual(abilities[0].id, 'rising-road', 'Ability ID should match');
});

// Test 3: Basic switch from bench to active
runTest('Basic switch from bench to active', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertTrue(result.success, 'Activation should succeed');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'solgaleo', 'Solgaleo should be active');
  assertEqual(game.gameState.players.player1.banque[0].id, 'pikachu', 'Pikachu should be on bench');
});

// Test 4: Switch cleans special conditions from the Pokemon moving to bench
runTest('Switch cleans special conditions from the Pokemon moving to bench', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  // Apply a special condition to the active Pokemon
  game.statusConditionSystem.applyCondition('player1', 'pikachu', SPECIAL_CONDITIONS.POISONED);

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertTrue(result.success, 'Activation should succeed');

  // Check that Pikachu (now on bench) has no condition
  const pikachuCondition = game.statusConditionSystem.getCondition('player1', 'pikachu');
  assertEqual(pikachuCondition, null, 'Pikachu should have no condition after moving to bench');
});

// Test 5: Switch cleans special conditions from the Pokemon moving to active
runTest('Switch cleans special conditions from the Pokemon moving to active', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  // Apply a special condition to the bench Pokemon
  game.statusConditionSystem.applyCondition('player1', 'solgaleo', SPECIAL_CONDITIONS.SLEEP);

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertTrue(result.success, 'Activation should succeed');

  // Check that Solgaleo (now active) has no condition
  const solgaleoCondition = game.statusConditionSystem.getCondition('player1', 'solgaleo');
  assertEqual(solgaleoCondition, null, 'Solgaleo should have no condition after moving to active');
});

// Test 6: Switch cleans all special condition types
runTest('Switch cleans all special condition types', () => {
  const conditions = [
    SPECIAL_CONDITIONS.POISONED,
    SPECIAL_CONDITIONS.BURNED,
    SPECIAL_CONDITIONS.SLEEP,
    SPECIAL_CONDITIONS.PARALYZED,
    SPECIAL_CONDITIONS.CONFUSED
  ];

  for (const condition of conditions) {
    const game = createGame([], []);

    const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
    const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

    game.gameState.players.player1.banque = [solgaleo];
    game.gameState.players.player1.activePokemon = pikachu;

    // Apply condition to active Pokemon
    game.statusConditionSystem.applyCondition('player1', 'pikachu', condition);

    const switchAbility = {
      id: 'rising-road',
      name: 'Rising Road',
      pokemonId: 'solgaleo',
      type: 'activated',
      effect: {
        type: 'switch_pokemon'
      },
      usageLimit: 'once_per_turn'
    };

    game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

    const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

    assertTrue(result.success, `Activation should succeed for ${condition}`);

    // Check condition was cleaned
    const pikachuCondition = game.statusConditionSystem.getCondition('player1', 'pikachu');
    assertEqual(pikachuCondition, null, `Pikachu should have no ${condition} condition after switch`);
  }
});

// Test 7: Cannot switch if Pokemon is not on bench
runTest('Cannot switch if Pokemon is not on bench', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  // Put Solgaleo as active (not on bench)
  game.gameState.players.player1.activePokemon = solgaleo;
  game.gameState.players.player1.banque = [pikachu];

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertFalse(result.success, 'Activation should fail if Pokemon is not on bench');
  assertEqual(result.reason, 'pokemon_not_on_bench', 'Reason should be pokemon_not_on_bench');
});

// Test 8: Cannot switch if no active Pokemon
runTest('Cannot switch if no active Pokemon', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = null;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertFalse(result.success, 'Activation should fail if no active Pokemon');
  assertEqual(result.reason, 'no_active_pokemon', 'Reason should be no_active_pokemon');
});

// Test 9: Once per turn usage limit works
runTest('Once per turn usage limit works', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  // First activation should succeed
  const result1 = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});
  assertTrue(result1.success, 'First activation should succeed');

  // Second activation should fail (once per turn)
  const result2 = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});
  assertFalse(result2.success, 'Second activation should fail due to usage limit');
});

// Test 10: Once per turn can be used again after turn change
runTest('Once per turn can be used again after turn change', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);

  game.gameState.players.player1.banque = [solgaleo, eevee];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  // First activation - Solgaleo switches with Pikachu
  const result1 = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});
  assertTrue(result1.success, 'First activation should succeed');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'solgaleo', 'Solgaleo should be active after first switch');

  // Switch back manually (Solgaleo to bench, Pikachu to active)
  game.gameState.players.player1.banque[0] = solgaleo;
  game.gameState.players.player1.activePokemon = pikachu;

  // Reset usage for new turn
  game.activatedAbilitySystem.resetUsageForNewTurn();

  // Second activation should now succeed (Solgaleo is back on bench)
  const result2 = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});
  assertTrue(result2.success, 'Second activation should succeed after turn reset and Solgaleo back on bench');
});

// Test 11: Condition validation prevents activation when not met
runTest('Condition validation prevents activation when not met', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  // Add condition that requires Solgaleo to be active (but it's on bench)
  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    condition: {
      type: 'is_active'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertFalse(result.success, 'Activation should fail when condition not met');
  assertEqual(result.reason, 'condition_not_met', 'Reason should be condition_not_met');
});

// Test 12: Cannot activate opponent's ability
runTest('Cannot activate opponent\'s ability', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  // Try to activate as player2 (opponent)
  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player2', {});

  assertFalse(result.success, 'Opponent should not be able to activate player1\'s ability');
  assertEqual(result.reason, 'not_owner', 'Reason should be not_owner');
});

// Test 13: Switch with multiple Pokemon on bench finds the correct one
runTest('Switch with multiple Pokemon on bench finds the correct one', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);

  game.gameState.players.player1.banque = [eevee, solgaleo, pikachu]; // Solgaleo in middle
  game.gameState.players.player1.activePokemon = createSimplePokemon('charizard', 'Charizard', 'Fire', 150);

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertTrue(result.success, 'Activation should succeed');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'solgaleo', 'Solgaleo should be active');
  assertTrue(game.gameState.players.player1.banque.some(p => p.id === 'charizard'), 'Charizard should be on bench');
  assertTrue(game.gameState.players.player1.banque.some(p => p.id === 'eevee'), 'Eevee should still be on bench');
});

// Test 14: Turn log contains switch event
runTest('Turn log contains switch event', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertTrue(result.success, 'Activation should succeed');

  const switchLog = game.gameState.turnLog.find(log => log.type === 'ability_activated' && log.effect.type === 'switch_pokemon');
  assertTrue(switchLog !== undefined, 'Turn log should contain switch event');
  assertEqual(switchLog.fromPokemonId, 'solgaleo', 'Log should show from Pokemon');
  assertEqual(switchLog.toPokemonId, 'pikachu', 'Log should show to Pokemon');
});

// Test 15: Remove abilities cleans up switch ability
runTest('Remove abilities cleans up switch ability', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  // Remove ability
  game.activatedAbilitySystem.removeAbilities('player1', 'solgaleo');

  // Try to activate - should fail
  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertFalse(result.success, 'Activation should fail after removal');
  assertEqual(result.reason, 'ability_not_found', 'Reason should be ability_not_found');
});

// Test 16: Switch cleans conditions and logs them
runTest('Switch cleans conditions and logs them', () => {
  const game = createGame([], []);

  const solgaleo = createSimplePokemon('solgaleo', 'Solgaleo ex', 'Metal', 180);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.banque = [solgaleo];
  game.gameState.players.player1.activePokemon = pikachu;

  // Apply conditions to both
  game.statusConditionSystem.applyCondition('player1', 'pikachu', SPECIAL_CONDITIONS.POISONED);
  game.statusConditionSystem.applyCondition('player1', 'solgaleo', SPECIAL_CONDITIONS.SLEEP);

  const switchAbility = {
    id: 'rising-road',
    name: 'Rising Road',
    pokemonId: 'solgaleo',
    type: 'activated',
    effect: {
      type: 'switch_pokemon'
    },
    usageLimit: 'once_per_turn'
  };

  game.activatedAbilitySystem.registerAbility('player1', 'solgaleo', switchAbility);

  const result = game.activatedAbilitySystem.activateAbility('rising-road', 'player1', {});

  assertTrue(result.success, 'Activation should succeed');
  assertTrue(result.details.conditionsRemoved !== undefined, 'Result should include conditionsRemoved');
  assertEqual(result.details.conditionsRemoved.length, 2, 'Both conditions should be removed');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
