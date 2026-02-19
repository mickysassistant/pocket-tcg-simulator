/**
 * Test: Activated Abilities - Energy Movement (GAP-004)
 *
 * Tests the activated ability system for managing activatable abilities with usage limits,
 * specifically energy movement abilities like Vaporeon's "Wash Out".
 *
 * GAP-004: [Crítico][C1] Habilidades de movimiento de energía (Vaporeon (Wash Out))
 *
 * Acceptance Criteria:
 * 1. Implementar sistema de habilidades activables con límites de uso
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos)
 * 4. npm run check pasa
 */

const { createGame, ActivatedAbilitySystem } = require('../../src/index');

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
  }
}

function assertEqualArray(actual, expected, message) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    throw new Error(`Assertion failed: ${message} - not arrays`);
  }
  if (actual.length !== expected.length) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected length: ${expected.length}\n  Actual length:   ${actual.length}`
    );
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        `Assertion failed: ${message}\n  At index ${i}:\n    Expected: ${expected[i]}\n    Actual:   ${actual[i]}`
      );
    }
  }
}

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    testsFailed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDeck(n = 20) {
  return Array.from({ length: n }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` }));
}

function makeGame() {
  return createGame(createDeck(), createDeck());
}

/**
 * Place a Pokémon in the active spot of a player with given properties
 */
function setActive(game, playerId, props) {
  game.gameState.players[playerId].activePokemon = {
    id: props.id || `active-${playerId}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 60,
    energy: props.energy || [],
    ...props
  };
}

/**
 * Add a Pokémon to a player's bench
 */
function addToBench(game, playerId, props) {
  if (!game.gameState.players[playerId].banque) {
    game.gameState.players[playerId].banque = [];
  }
  game.gameState.players[playerId].banque.push({
    id: props.id || `bench-${playerId}-${Date.now()}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 60,
    energy: props.energy || [],
    ...props
  });
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

// 1. ActivatedAbilitySystem is exported and instantiable
runTest('ActivatedAbilitySystem is exported from index', () => {
  assert(ActivatedAbilitySystem !== undefined, 'ActivatedAbilitySystem should be exported');

  const game = makeGame();
  assert(game.activatedAbilitySystem !== undefined, 'game.activatedAbilitySystem should exist');
  assert(game.activatedAbilitySystem instanceof ActivatedAbilitySystem, 'Should be instance of ActivatedAbilitySystem');
});

// 2. Register and retrieve activated ability
runTest('Register and retrieve activated ability', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  const all = activatedAbilitySystem.getAllAbilities();
  assertEqual(all.length, 1, 'Should have 1 ability registered');
  assertEqual(all[0].id, 'wash-out', 'Ability ID should match');
});

// 3. Basic energy movement from bench to active
runTest('Move 1 energy from bench to active', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  // Set up active Pokemon
  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  // Set up bench Pokemon with energy
  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }]
  });

  // Register Vaporeon's ability
  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  // Activate the ability
  const result = activatedAbilitySystem.activateAbility('wash-out', 'player1');

  assert(result.success, 'Ability activation should succeed');

  // Check energy was moved
  const active = game.gameState.players['player1'].activePokemon;
  const bench = game.gameState.players['player1'].banque[0];

  assertEqual(active.energy.length, 1, 'Active Pokemon should have 1 energy');
  assertEqual(bench.energy.length, 1, 'Bench Pokemon should have 1 energy remaining');
  assertEqual(active.energy[0].type, 'water', 'Energy type should be water');
});

// 4. Move multiple energy at once
runTest('Move 2 energy from bench to active', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }, { type: 'grass' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 2
    },
    usageLimit: 'unlimited'
  });

  const result = activatedAbilitySystem.activateAbility('wash-out', 'player1');

  assert(result.success, 'Ability activation should succeed');
  assertEqual(result.details.count, 2, 'Should have moved 2 energy');

  const active = game.gameState.players['player1'].activePokemon;
  const bench = game.gameState.players['player1'].banque[0];

  assertEqual(active.energy.length, 2, 'Active Pokemon should have 2 energy');
  assertEqual(bench.energy.length, 1, 'Bench Pokemon should have 1 energy remaining');
});

// 5. Unlimited usage limit allows multiple activations
runTest('Unlimited usage: can activate multiple times per turn', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }, { type: 'water' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  // Activate multiple times
  const result1 = activatedAbilitySystem.activateAbility('wash-out', 'player1');
  const result2 = activatedAbilitySystem.activateAbility('wash-out', 'player1');
  const result3 = activatedAbilitySystem.activateAbility('wash-out', 'player1');

  assert(result1.success, 'First activation should succeed');
  assert(result2.success, 'Second activation should succeed');
  assert(result3.success, 'Third activation should succeed');

  const active = game.gameState.players['player1'].activePokemon;
  assertEqual(active.energy.length, 3, 'Active Pokemon should have all 3 energy');
});

// 6. Once per turn limit restricts usage
runTest('Once per turn: cannot activate twice in same turn', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'lunala-ex', {
    id: 'psychic-connect',
    name: 'Psychic Connect',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'once_per_turn'
  });

  const result1 = activatedAbilitySystem.activateAbility('psychic-connect', 'player1');
  const result2 = activatedAbilitySystem.activateAbility('psychic-connect', 'player1');

  assert(result1.success, 'First activation should succeed');
  assert(!result2.success, 'Second activation should fail');
  assertEqual(result2.reason, 'usage_limit_reached', 'Should fail with usage_limit_reached');
});

// 7. Once per turn resets between turns
runTest('Once per turn: can activate again after turn change', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'lunala-ex', {
    id: 'psychic-connect',
    name: 'Psychic Connect',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'once_per_turn'
  });

  // First turn
  const result1 = activatedAbilitySystem.activateAbility('psychic-connect', 'player1');
  const result2 = activatedAbilitySystem.activateAbility('psychic-connect', 'player1');

  assert(result1.success, 'First activation should succeed');
  assert(!result2.success, 'Second activation in same turn should fail');

  // Reset for new turn (simulating turn start)
  game.gameState.turnNumber = 1;
  activatedAbilitySystem.resetUsageForNewTurn();

  // Next turn
  const result3 = activatedAbilitySystem.activateAbility('psychic-connect', 'player1');

  assert(result3.success, 'Activation should succeed after turn reset');
});

// 8. Per Pokemon once per turn limit
runTest('Per Pokemon once: same Pokemon cannot activate twice', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'bench-p1', {
    id: 'some-ability',
    name: 'Some Ability',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'per_pokemon_once'
  });

  const result1 = activatedAbilitySystem.activateAbility('some-ability', 'player1');
  const result2 = activatedAbilitySystem.activateAbility('some-ability', 'player1');

  assert(result1.success, 'First activation should succeed');
  assert(!result2.success, 'Second activation should fail');
});

// 9. Cannot activate opponent's ability
runTest('Cannot activate opponent\'s ability', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  // Player 2 tries to activate player 1's ability
  const result = activatedAbilitySystem.activateAbility('wash-out', 'player2');

  assert(!result.success, 'Should fail to activate opponent\'s ability');
  assertEqual(result.reason, 'not_owner', 'Should fail with not_owner reason');
});

// 10. Move energy from active to bench
runTest('Move energy from active to bench', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }]
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: []
  });

  activatedAbilitySystem.registerAbility('player1', 'bench-p1', {
    id: 'energy-relay',
    name: 'Energy Relay',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'active',
      to: 'bench',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  const result = activatedAbilitySystem.activateAbility('energy-relay', 'player1');

  assert(result.success, 'Ability activation should succeed');

  const active = game.gameState.players['player1'].activePokemon;
  const bench = game.gameState.players['player1'].banque[0];

  assertEqual(active.energy.length, 1, 'Active Pokemon should have 1 energy remaining');
  assertEqual(bench.energy.length, 1, 'Bench Pokemon should have 1 energy');
});

// 11. Move specific energy type
runTest('Move only water energy when type specified', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [
      { type: 'water' },
      { type: 'water' },
      { type: 'grass' },
      { type: 'fire' }
    ]
  });

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 2,
      energyType: 'water'
    },
    usageLimit: 'unlimited'
  });

  const result = activatedAbilitySystem.activateAbility('wash-out', 'player1');

  assert(result.success, 'Ability activation should succeed');

  const active = game.gameState.players['player1'].activePokemon;
  const bench = game.gameState.players['player1'].banque[0];

  assertEqual(active.energy.length, 2, 'Active Pokemon should have 2 energy');
  assertEqual(bench.energy.length, 2, 'Bench Pokemon should have 2 energy remaining');
  assertEqual(active.energy[0].type, 'water', 'Energy should be water type');
  assertEqual(active.energy[1].type, 'water', 'Energy should be water type');
});

// 12. Cannot activate if condition not met
runTest('Cannot activate ability when condition is not met', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'vaporeon-1',
    name: 'Vaporeon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    condition: {
      type: 'is_active'
    },
    usageLimit: 'unlimited'
  });

  // Vaporeon is active, so condition should be met
  const result = activatedAbilitySystem.activateAbility('wash-out', 'player1');
  assert(result.success, 'Activation should succeed when condition is met');

  // Reset and make Vaporeon not active
  game.gameState.players['player1'].activePokemon = {
    id: 'other-pokemon',
    name: 'Other',
    energy: []
  };
  activatedAbilitySystem._usedThisTurn.clear(); // Clear usage tracking

  const result2 = activatedAbilitySystem.activateAbility('wash-out', 'player1');
  assert(!result2.success, 'Activation should fail when condition is not met');
  assertEqual(result2.reason, 'condition_not_met', 'Should fail with condition_not_met');
});

// 13. Remove abilities when Pokemon is removed
runTest('Remove abilities for a specific Pokemon', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  assertEqual(activatedAbilitySystem.getAllAbilities().length, 1, 'Should have 1 ability');

  activatedAbilitySystem.removeAbilities('player1', 'vaporeon-1');

  assertEqual(activatedAbilitySystem.getAllAbilities().length, 0, 'Should have 0 abilities after removal');
});

// 14. Remove all abilities for a player
runTest('Remove all abilities for a player', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  activatedAbilitySystem.registerAbility('player1', 'pokemon-1', {
    id: 'ability-1',
    name: 'Ability 1',
    type: 'activated',
    effect: { type: 'move_energy', from: 'bench', to: 'active', count: 1 },
    usageLimit: 'unlimited'
  });

  activatedAbilitySystem.registerAbility('player1', 'pokemon-2', {
    id: 'ability-2',
    name: 'Ability 2',
    type: 'activated',
    effect: { type: 'move_energy', from: 'bench', to: 'active', count: 1 },
    usageLimit: 'unlimited'
  });

  activatedAbilitySystem.registerAbility('player2', 'pokemon-3', {
    id: 'ability-3',
    name: 'Ability 3',
    type: 'activated',
    effect: { type: 'move_energy', from: 'bench', to: 'active', count: 1 },
    usageLimit: 'unlimited'
  });

  assertEqual(activatedAbilitySystem.getAllAbilities().length, 3, 'Should have 3 abilities');

  activatedAbilitySystem.removeAllAbilitiesForPlayer('player1');

  assertEqual(activatedAbilitySystem.getAllAbilities().length, 1, 'Should have 1 ability remaining');
});

// 15. Cannot activate if source has no energy
runTest('Cannot move energy when source has no energy', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: []  // No energy
  });

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  const result = activatedAbilitySystem.activateAbility('wash-out', 'player1');

  assert(!result.success, 'Should fail when source has no energy');
  assertEqual(result.reason, 'no_energy', 'Should fail with no_energy reason');
});

// 16. Cannot activate ability that doesn't exist
runTest('Cannot activate non-existent ability', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  const result = activatedAbilitySystem.activateAbility('non-existent', 'player1');

  assert(!result.success, 'Should fail for non-existent ability');
  assertEqual(result.reason, 'ability_not_found', 'Should fail with ability_not_found reason');
});

// 17. Explicit Pokemon ID targeting
runTest('Move energy using explicit Pokemon IDs', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon 1',
    energy: [{ type: 'water' }]
  });

  addToBench(game, 'player1', {
    id: 'bench-p2',
    name: 'Bench Pokemon 2',
    energy: [{ type: 'grass' }]
  });

  activatedAbilitySystem.registerAbility('player1', 'active-p1', {
    id: 'any-move',
    name: 'Any Move',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'any',
      to: 'any',
      count: 1
    },
    usageLimit: 'unlimited'
  });

  // Move from bench-p1 to active-p1 using explicit IDs
  const result = activatedAbilitySystem.activateAbility('any-move', 'player1', {
    fromPokemonId: 'bench-p1',
    toPokemonId: 'active-p1'
  });

  assert(result.success, 'Activation should succeed');
  assertEqual(result.details.fromPokemonId, 'bench-p1', 'Source should be bench-p1');
  assertEqual(result.details.toPokemonId, 'active-p1', 'Destination should be active-p1');
});

// 18. Move energy limited by available count
runTest('Move only available energy when requesting more than exists', () => {
  const game = makeGame();
  const { activatedAbilitySystem } = game;

  setActive(game, 'player1', {
    id: 'active-p1',
    name: 'Active Pokemon',
    energy: []
  });

  addToBench(game, 'player1', {
    id: 'bench-p1',
    name: 'Bench Pokemon',
    energy: [{ type: 'water' }, { type: 'water' }]  // Only 2 energy
  });

  activatedAbilitySystem.registerAbility('player1', 'vaporeon-1', {
    id: 'wash-out',
    name: 'Wash Out',
    type: 'activated',
    effect: {
      type: 'move_energy',
      from: 'bench',
      to: 'active',
      count: 5  // Request 5 but only 2 available
    },
    usageLimit: 'unlimited'
  });

  const result = activatedAbilitySystem.activateAbility('wash-out', 'player1');

  assert(result.success, 'Activation should succeed');
  assertEqual(result.details.count, 2, 'Should only move 2 energy (available count)');

  const active = game.gameState.players['player1'].activePokemon;
  const bench = game.gameState.players['player1'].banque[0];

  assertEqual(active.energy.length, 2, 'Active Pokemon should have 2 energy');
  assertEqual(bench.energy.length, 0, 'Bench Pokemon should have 0 energy remaining');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n====================`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`====================`);

if (testsFailed > 0) {
  process.exit(1);
}
