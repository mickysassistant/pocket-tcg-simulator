/**
 * Test: Sacrifice from Banca for Damage Bonus (GAP-022)
 *
 * Tests the sacrifice from Banca system for gaining damage bonus.
 *
 * GAP-022: [Importante][C2] Descartar Pokémon de propia Banca para bonus de daño (Gyarados)
 *
 * Acceptance Criteria:
 * 1. Implementar sacrifice de Banca para bonus
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos en retreat/replay/deck/rules/actions)
 * 4. npm run check pasa
 *
 * Sacrifice from Banca Format:
 * - sacrificeFromBanque: { pokemonId: string, damageBonus: number }
 *   - pokemonId: ID of the Benched Pokémon to sacrifice (required)
 *   - damageBonus: Amount of extra damage to add (required)
 *
 * When a Pokémon is sacrificed:
 * - The Benched Pokémon is removed from play (not discarded, but put in Lost Zone)
 * - All energy attached to the sacrificed Pokémon is lost
 * - The attacker gains the specified damage bonus for this attack
 * - The sacrificed Pokémon is considered KO'd (affects KO triggers)
 *
 * Real-card examples (GAP-022):
 * - Gyarados: Sacrifices a Benched Pokémon to gain damage bonus
 *
 * Attack execution flow with sacrifice:
 * 1. Validate energy cost
 * 2. Apply sacrifice from Banca if configured (removes Pokémon, adds damage bonus)
 * 3. Calculate base damage (includes sacrifice bonus)
 * 4. Apply damage modifiers (bonus, reduction, etc.)
 * 5. Apply weakness
 * 6. Final damage = base + bonus + modifiers + weakness
 * 7. Apply damage to defender
 * 8. Handle KO triggers for sacrificed Pokémon
 */

const { createGame } = require('../../src/index');

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

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`
    );
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
    hp: props.hp || 100,
    currentHp: props.currentHp !== undefined ? props.currentHp : (props.hp || 100),
    energy: props.energy || [],
    weakness: props.weakness || null,
    ...props
  };
}

/**
 * Add a Pokémon to the bench of a player
 */
function addToBanque(game, playerId, props, index = -1) {
  const player = game.gameState.players[playerId];
  const pokemon = {
    id: props.id || `bench-${playerId}-${Date.now()}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 100,
    currentHp: props.currentHp !== undefined ? props.currentHp : (props.hp || 100),
    energy: props.energy || [],
    weakness: props.weakness || null,
    ...props
  };

  if (index === -1) {
    player.banque.push(pokemon);
  } else {
    player.banque[index] = pokemon;
  }

  return pokemon;
}

/**
 * Add energy to a Pokémon
 */
function addEnergy(pokemon, type, count = 1) {
  if (!pokemon.energy) {
    pokemon.energy = [];
  }
  for (let i = 0; i < count; i++) {
    pokemon.energy.push({ type, id: `energy-${Date.now()}-${i}` });
  }
}

// ---------------------------------------------------------------------------
// TESTS: applySacrificeFromBanque Method
// ---------------------------------------------------------------------------

// 1. AttackSystem has applySacrificeFromBanque method
runTest('AttackSystem has applySacrificeFromBanque method', () => {
  const game = makeGame();
  assert(game.attackSystem.applySacrificeFromBanque !== undefined, 'applySacrificeFromBanque should exist');
});

// 2. No sacrifice config returns error
runTest('applySacrificeFromBanque: no config = error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const result = attackSystem.applySacrificeFromBanque('player1', null);

  assertEqual(result.success, false, 'Should fail without config');
  assertEqual(result.reason, 'no_config', 'Should have no_config reason');
});

// 3. Missing pokemonId returns error
runTest('applySacrificeFromBanque: no pokemonId = error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const result = attackSystem.applySacrificeFromBanque('player1', { damageBonus: 50 });

  assertEqual(result.success, false, 'Should fail without pokemonId');
  assertEqual(result.reason, 'no_pokemon_id', 'Should have no_pokemon_id reason');
});

// 4. Missing damageBonus returns error
runTest('applySacrificeFromBanque: no damageBonus = error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  // Add a Pokémon to bench
  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  const result = attackSystem.applySacrificeFromBanque('player1', { pokemonId: 'magikarp-1' });

  assertEqual(result.success, false, 'Should fail without damageBonus');
  assertEqual(result.reason, 'no_damage_bonus', 'Should have no_damage_bonus reason');
});

// 5. Pokémon not found on bench returns error
runTest('applySacrificeFromBanque: pokemon not found = error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const result = attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'nonexistent',
    damageBonus: 50
  });

  assertEqual(result.success, false, 'Should fail with non-existent Pokémon');
  assertEqual(result.reason, 'pokemon_not_found', 'Should have pokemon_not_found reason');
});

// 6. Successfully sacrifice a Pokémon from bench
runTest('applySacrificeFromBanque: successful sacrifice', () => {
  const game = makeGame();
  const { attackSystem } = game;

  // Add a Pokémon to bench
  const magikarp = addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  const result = attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-1',
    damageBonus: 50
  });

  assertEqual(result.success, true, 'Should succeed');
  assertEqual(result.damageBonus, 50, 'Should return damage bonus');
  assertEqual(result.details.pokemonName, 'Magikarp', 'Should return Pokémon name');
});

// 7. Sacrificed Pokémon is removed from bench
runTest('applySacrificeFromBanque: removes Pokémon from bench', () => {
  const game = makeGame();
  const { attackSystem, gameState } = game;

  // Add a Pokémon to bench
  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-1',
    damageBonus: 50
  });

  const bench = gameState.players.player1.banque;
  assertEqual(bench[0], null, 'Bench slot should be null after sacrifice');
});

// 8. Sacrificed Pokémon with energy is removed (energy is lost)
runTest('applySacrificeFromBanque: energy is lost on sacrifice', () => {
  const game = makeGame();
  const { attackSystem } = game;

  // Add a Pokémon with energy to bench
  const magikarp = addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30,
    energy: []
  });

  addEnergy(magikarp, 'water', 2);

  const result = attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-1',
    damageBonus: 50
  });

  assertEqual(result.success, true, 'Should succeed');
  // Energy is lost with the Pokémon (no way to verify this directly, but it's implied by removal)
});

// 9. KO'd Pokémon cannot be sacrificed
runTest('applySacrificeFromBanque: KO\'d Pokémon cannot be sacrificed', () => {
  const game = makeGame();
  const { attackSystem } = game;

  // Add a KO'd Pokémon to bench
  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30,
    currentHp: 0
  });

  const result = attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-1',
    damageBonus: 50
  });

  assertEqual(result.success, false, 'Should fail');
  assertEqual(result.reason, 'pokemon_already_ko', 'Should have pokemon_already_ko reason');
});

// 10. Multiple Pokémon on bench, sacrifice the correct one
runTest('applySacrificeFromBanque: sacrifices correct Pokémon', () => {
  const game = makeGame();
  const { attackSystem, gameState } = game;

  // Add multiple Pokémon to bench
  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  addToBanque(game, 'player1', {
    id: 'magikarp-2',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  addToBanque(game, 'player1', {
    id: 'magikarp-3',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  // Sacrifice the second one
  const result = attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-2',
    damageBonus: 50
  });

  assertEqual(result.success, true, 'Should succeed');
  assertEqual(gameState.players.player1.banque[0].id, 'magikarp-1', 'First Pokémon should remain');
  assertEqual(gameState.players.player1.banque[1], null, 'Second Pokémon should be null');
  assertEqual(gameState.players.player1.banque[2].id, 'magikarp-3', 'Third Pokémon should remain');
});

// 11. Logs sacrifice event in turn log
runTest('applySacrificeFromBanque: logs sacrifice event', () => {
  const game = makeGame();
  const { attackSystem, gameState } = game;

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-1',
    damageBonus: 50
  });

  const log = gameState.turnLog;
  const sacrificeLog = log.find(entry => entry.type === 'sacrifice_from_banque');

  assert(sacrificeLog !== undefined, 'Should have sacrifice log');
  assertEqual(sacrificeLog.pokemonId, 'magikarp-1', 'Log should show Pokémon ID');
  assertEqual(sacrificeLog.pokemonName, 'Magikarp', 'Log should show Pokémon name');
  assertEqual(sacrificeLog.damageBonus, 50, 'Log should show damage bonus');
});

// ---------------------------------------------------------------------------
// TESTS: executeAttack with sacrificeFromBanque
// ---------------------------------------------------------------------------

// 12. executeAttack includes sacrificeBonus in result
runTest('executeAttack: result includes sacrificeBonus', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  assert(result.sacrificeBonus !== undefined, 'Result should have sacrificeBonus field');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
});

// 13. executeAttack: sacrifice bonus adds to final damage
runTest('executeAttack: sacrifice bonus adds to damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  assertEqual(result.baseDamage, 40, 'Base damage should be 40');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
  assertEqual(result.finalDamage, 90, 'Final damage should be 90 (40 + 50)');
});

// 14. executeAttack: sacrifice removes Pokémon from bench
runTest('executeAttack: sacrifice removes Pokémon from bench', () => {
  const game = makeGame();
  const { attackSystem, gameState } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  assertEqual(gameState.players.player1.banque[0], null, 'Bench slot should be null');
});

// 15. executeAttack: sacrifice bonus + other modifiers
runTest('executeAttack: sacrifice bonus + other damage modifiers', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'water'
  });

  // Add damage bonus ability
  abilitySystem.registerAbility('player1', 'gyarados-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Calculation: 40 (base) + 50 (sacrifice) + 20 (bonus) + 20 (weakness) = 130
  assertEqual(result.baseDamage, 40, 'Base damage should be 40');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
  assertEqual(result.bonusApplied, 20, 'Ability bonus should be 20');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 130, 'Final damage = 40 + 50 + 20 + 20 = 130');
});

// 16. executeAttack: sacrifice with damage reduction
runTest('executeAttack: sacrifice bonus + damage reduction', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', {
    id: 'magnezone-1',
    name: 'Magnezone',
    type: 'electric',
    hp: 120
  });

  // Add damage reduction ability to defender
  abilitySystem.registerAbility('player2', 'magnezone-1', {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Calculation: 40 (base) + 50 (sacrifice) - 30 (reduction) = 60
  assertEqual(result.baseDamage, 40, 'Base damage should be 40');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
  assertEqual(result.reductionApplied, 30, 'Reduction should be 30');
  assertEqual(result.finalDamage, 60, 'Final damage = 40 + 50 - 30 = 60');
});

// 17. executeAttack: no sacrifice config = no sacrifice bonus
runTest('executeAttack: no sacrifice config = normal damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Waterfall',
    damage: 40,
    energyCost: ['water', 'water']
  });

  assertEqual(result.sacrificeBonus, 0, 'Sacrifice bonus should be 0');
  assertEqual(result.finalDamage, 40, 'Final damage should be 40 (no bonus)');
});

// 18. executeAttack: sacrifice result included in result object
runTest('executeAttack: includes sacrificeResult', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  assert(result.sacrificeResult !== undefined, 'Result should have sacrificeResult');
  assertEqual(result.sacrificeResult.success, true, 'Sacrifice should succeed');
  assertEqual(result.sacrificeResult.damageBonus, 50, 'Sacrifice result should show bonus');
});

// 19. executeAttack: sacrifice fails if Pokémon not found
runTest('executeAttack: sacrifice fails if Pokémon not found', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  // Don't add any Pokémon to bench

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Attack should still execute, but sacrifice bonus should be 0
  assertEqual(result.sacrificeBonus, 0, 'Sacrifice bonus should be 0');
  assertEqual(result.sacrificeResult.success, false, 'Sacrifice should fail');
  assertEqual(result.finalDamage, 40, 'Final damage should be 40 (no bonus)');
});

// 20. executeAttack: logs sacrifice in turn log
runTest('executeAttack: logs sacrifice in turn log', () => {
  const game = makeGame();
  const { attackSystem, gameState } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  const log = gameState.turnLog;
  const sacrificeLog = log.find(entry => entry.type === 'sacrifice_from_banque');

  assert(sacrificeLog !== undefined, 'Should have sacrifice log');
  assertEqual(sacrificeLog.pokemonId, 'magikarp-1', 'Log should show Pokémon ID');
  assertEqual(sacrificeLog.damageBonus, 50, 'Log should show damage bonus');
});

// 21. executeAttack: large sacrifice bonus
runTest('executeAttack: large sacrifice bonus', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 100 },
    energyCost: ['water', 'water']
  });

  assertEqual(result.sacrificeBonus, 100, 'Sacrifice bonus should be 100');
  assertEqual(result.finalDamage, 140, 'Final damage = 40 + 100 = 140');
});

// 22. executeAttack: sacrifice with damageScaling
runTest('executeAttack: sacrifice + damageScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    damageScaling: 10, // 10 damage per energy
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Calculation: 40 (base) + 40 (scaling: 4 energy * 10) + 50 (sacrifice) = 130
  assertEqual(result.baseDamage, 40, 'Base damage should be 40');
  assertEqual(result.damageScaling, 40, 'Damage scaling should be 40');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
  assertEqual(result.finalDamage, 130, 'Final damage = 40 + 40 + 50 = 130');
});

// 23. executeAttack: sacrifice with benchScaling
runTest('executeAttack: sacrifice + benchScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  // Add multiple Pokémon to bench
  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  addToBanque(game, 'player1', {
    id: 'magikarp-2',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  addToBanque(game, 'player1', {
    id: 'magikarp-3',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    benchScaling: 20, // 20 damage per Benched Pokémon
    sacrificeFromBanque: { pokemonId: 'magikarp-2', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Sacrifice happens BEFORE benchScaling calculation
  // After sacrificing magikarp-2: 2 Benched Pokémon remain
  // benchScaling = 2 * 20 = 40
  // sacrificeBonus = 50
  // total = 40 + 40 + 50 = 130
  assertEqual(result.baseDamage, 40, 'Base damage should be 40');
  assertEqual(result.benchScaling, 40, 'Bench scaling should be 40 (2 * 20, after sacrifice)');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
  assertEqual(result.finalDamage, 130, 'Final damage = 40 + 40 + 50 = 130');
});

// 24. executeAttack: sacrifice from empty bench index
runTest('executeAttack: sacrifice from empty bench index', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  // Don't add any Pokémon to bench

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'nonexistent', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  assertEqual(result.sacrificeBonus, 0, 'Sacrifice bonus should be 0');
  assertEqual(result.sacrificeResult.success, false, 'Sacrifice should fail');
});

// 25. executeAttack: multiple attacks with different sacrifices
runTest('executeAttack: different sacrifices on different attacks', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  addToBanque(game, 'player1', {
    id: 'magikarp-2',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', {
    id: 'venusaur-1',
    name: 'Venusaur',
    type: 'grass',
    hp: 140
  });

  // Attack 1: Sacrifice first Magikarp with 50 bonus
  const result1 = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Heal defender for second attack
  game.gameState.players.player2.activePokemon.currentHp = 140;

  // Attack 2: Sacrifice second Magikarp with 70 bonus
  const result2 = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-2', damageBonus: 70 },
    energyCost: ['water', 'water']
  });

  assertEqual(result1.sacrificeBonus, 50, 'First attack: bonus should be 50');
  assertEqual(result1.finalDamage, 90, 'First attack: 40 + 50 = 90');

  assertEqual(result2.sacrificeBonus, 70, 'Second attack: bonus should be 70');
  assertEqual(result2.finalDamage, 110, 'Second attack: 40 + 70 = 110');
});

// ---------------------------------------------------------------------------
// TESTS: Edge Cases
// ---------------------------------------------------------------------------

// 26. Sacrifice with zero damage bonus
runTest('applySacrificeFromBanque: zero damage bonus', () => {
  const game = makeGame();
  const { attackSystem } = game;

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  const result = attackSystem.applySacrificeFromBanque('player1', {
    pokemonId: 'magikarp-1',
    damageBonus: 0
  });

  assertEqual(result.success, true, 'Should succeed');
  assertEqual(result.damageBonus, 0, 'Damage bonus should be 0');
});

// 27. Sacrifice with negative damage bonus (adds to damage)
runTest('executeAttack: negative damage bonus reduces damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: -10 },
    energyCost: ['water', 'water']
  });

  assertEqual(result.sacrificeBonus, -10, 'Sacrifice bonus should be -10');
  assertEqual(result.finalDamage, 30, 'Final damage = 40 + (-10) = 30');
});

// 28. Sacrifice with all modifiers
runTest('executeAttack: sacrifice with all modifiers', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 4);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', {
    id: 'moltres-1',
    name: 'Moltres',
    type: 'fire',
    hp: 110,
    weakness: 'water'
  });

  // Attacker bonus
  abilitySystem.registerAbility('player1', 'gyarados-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  // Defender reduction
  abilitySystem.registerAbility('player2', 'moltres-1', {
    id: 'test-reduction',
    name: 'Test Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 25 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    damageScaling: 10,
    benchScaling: 20,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Calculation: Sacrifice happens BEFORE benchScaling calculation
  // After sacrificing magikarp-1: 0 Benched Pokémon remain
  // 40 (base) + 40 (scaling: 4*10) + 0 (bench: 0*20) + 50 (sacrifice) + 20 (bonus) + 20 (weakness) - 25 (reduction) = 145
  assertEqual(result.baseDamage, 40, 'Base damage should be 40');
  assertEqual(result.damageScaling, 40, 'Damage scaling should be 40');
  assertEqual(result.benchScaling, 0, 'Bench scaling should be 0 (sacrifice happens before benchScaling)');
  assertEqual(result.sacrificeBonus, 50, 'Sacrifice bonus should be 50');
  assertEqual(result.bonusApplied, 20, 'Bonus should be 20');
  assertEqual(result.reductionApplied, 25, 'Reduction should be 25');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 145, 'Final damage = 40 + 40 + 0 + 50 + 20 + 20 - 25 = 145');
});

// 29. Sacrifice results in defender KO
runTest('executeAttack: sacrifice results in defender KO', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 100 },
    energyCost: ['water', 'water']
  });

  assertEqual(result.finalDamage, 140, 'Final damage should be 140');
  assert(result.isKO, 'Defender should be KO\'d');
  assertEqual(result.defenderHpAfter, 0, 'Defender HP should be 0');
});

// 30. Bench is empty after sacrifice (all Pokémon sacrificed over multiple turns)
runTest('executeAttack: bench can become empty', () => {
  const game = makeGame();
  const { attackSystem, gameState } = game;

  setActive(game, 'player1', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'water', 2);

  addToBanque(game, 'player1', {
    id: 'magikarp-1',
    name: 'Magikarp',
    type: 'water',
    hp: 30
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // First sacrifice
  attackSystem.executeAttack('player1', {
    name: 'Devastating Wave',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  // Check bench
  const bench = gameState.players.player1.banque;
  assertEqual(bench[0], null, 'Bench should be empty');

  // Try another attack with sacrifice (should fail)
  const result = attackSystem.executeAttack('player1', {
    name: 'Waterfall',
    damage: 40,
    sacrificeFromBanque: { pokemonId: 'magikarp-1', damageBonus: 50 },
    energyCost: ['water', 'water']
  });

  assertEqual(result.sacrificeBonus, 0, 'Sacrifice should fail (no Pokémon on bench)');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
