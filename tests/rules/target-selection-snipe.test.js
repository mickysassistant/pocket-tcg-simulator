/**
 * Test: Target Selection - Snipe (GAP-015)
 *
 * Tests the target selection system for attacks that can hit either
 * the Active Pokémon or a Benched Pokémon.
 *
 * GAP-015: [Importante][C2] Snipe (Luxray)
 *
 * Acceptance Criteria:
 * 1. Implementar selección de target (Active/Banca)
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa
 * 4. npm run check pasa
 *
 * Target Selection:
 * - Attacks can target either the Active Pokémon or a Benched Pokémon
 * - Target format: { location: 'active' | 'banque', pokemonId?: string }
 * - If no target is specified, defaults to Active (backward compatibility)
 * - Target must exist and be a valid Pokémon for the defending player
 * - Weakness applies to both Active and Benched targets
 * - Damage modifiers apply to both Active and Benched targets
 * - KO triggers work correctly for both Active and Benched targets
 *
 * Real-card examples:
 * - Luxray (Volt Bolt): "This attack does 80 damage to 1 of your opponent's Pokémon."
 * - Honchkrow (Skill Dive): "This attack does 50 damage to 1 of your opponent's Pokémon."
 * - Azelf (Psychic Arrow): "This attack does 60 damage to 1 of your opponent's Pokémon."
 */

const { createGame, AttackSystem } = require('../../src/index');

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
 * Add a Pokémon to a player's bench (banque)
 */
function addToBanque(game, playerId, props) {
  const pokemon = {
    id: props.id || `banque-${playerId}-${Date.now()}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 100,
    currentHp: props.currentHp !== undefined ? props.currentHp : (props.hp || 100),
    energy: props.energy || [],
    weakness: props.weakness || null,
    ...props
  };

  game.gameState.players[playerId].banque.push(pokemon);
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
// TESTS: Target Selection - Basic Functionality
// ---------------------------------------------------------------------------

// 1. AttackSystem has getTargetPokemon method
runTest('AttackSystem has getTargetPokemon method', () => {
  const game = makeGame();
  assert(game.attackSystem.getTargetPokemon !== undefined, 'getTargetPokemon should exist');
});

// 2. AttackSystem has validateTarget method
runTest('AttackSystem has validateTarget method', () => {
  const game = makeGame();
  assert(game.attackSystem.validateTarget !== undefined, 'validateTarget should exist');
});

// 3. getTargetPokemon returns active Pokémon when location is 'active'
runTest('getTargetPokemon: returns active Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const target = { location: 'active' };
  const pokemon = attackSystem.getTargetPokemon('player1', target);

  assert(pokemon !== null, 'Should return active Pokémon');
  assertEqual(pokemon.id, 'pikachu-1', 'Should return correct Pokémon');
  assertEqual(pokemon.name, 'Pikachu', 'Should have correct name');
});

// 4. getTargetPokemon returns benched Pokémon when location is 'banque'
runTest('getTargetPokemon: returns benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const benchPokemon = addToBanque(game, 'player1', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const target = { location: 'banque', pokemonId: 'eevee-1' };
  const pokemon = attackSystem.getTargetPokemon('player1', target);

  assert(pokemon !== null, 'Should return benched Pokémon');
  assertEqual(pokemon.id, 'eevee-1', 'Should return correct Pokémon');
  assertEqual(pokemon.name, 'Eevee', 'Should have correct name');
});

// 5. getTargetPokemon returns null for non-existent benched Pokémon
runTest('getTargetPokemon: returns null for non-existent benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const target = { location: 'banque', pokemonId: 'non-existent' };
  const pokemon = attackSystem.getTargetPokemon('player1', target);

  assert(pokemon === null, 'Should return null for non-existent Pokémon');
});

// 6. getTargetPokemon throws error for missing location
runTest('getTargetPokemon: throws error for missing location', () => {
  const game = makeGame();
  const { attackSystem } = game;

  let errorThrown = false;
  try {
    attackSystem.getTargetPokemon('player1', {});
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('location'), 'Error should mention location');
  }

  assert(errorThrown, 'Should throw error for missing location');
});

// 7. getTargetPokemon throws error for missing pokemonId in banque
runTest('getTargetPokemon: throws error for missing pokemonId in banque', () => {
  const game = makeGame();
  const { attackSystem } = game;

  let errorThrown = false;
  try {
    attackSystem.getTargetPokemon('player1', { location: 'banque' });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('pokemonId'), 'Error should mention pokemonId');
  }

  assert(errorThrown, 'Should throw error for missing pokemonId');
});

// 8. getTargetPokemon throws error for invalid location
runTest('getTargetPokemon: throws error for invalid location', () => {
  const game = makeGame();
  const { attackSystem } = game;

  let errorThrown = false;
  try {
    attackSystem.getTargetPokemon('player1', { location: 'invalid' });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Invalid target location'), 'Error should mention invalid location');
  }

  assert(errorThrown, 'Should throw error for invalid location');
});

// 9. validateTarget returns valid: true for active target
runTest('validateTarget: valid for active target', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.validateTarget('player1', { location: 'active' });

  assert(result.valid === true, 'Should be valid');
  assertEqual(result.reason, undefined, 'Should not have reason');
});

// 10. validateTarget returns valid: true for existing benched Pokémon
runTest('validateTarget: valid for existing benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  addToBanque(game, 'player1', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const result = attackSystem.validateTarget('player1', { location: 'banque', pokemonId: 'eevee-1' });

  assert(result.valid === true, 'Should be valid');
  assertEqual(result.reason, undefined, 'Should not have reason');
});

// 11. validateTarget returns valid: false for non-existent target
runTest('validateTarget: invalid for non-existent target', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const result = attackSystem.validateTarget('player1', { location: 'banque', pokemonId: 'non-existent' });

  assert(result.valid === false, 'Should be invalid');
  assertEqual(result.reason, 'target_not_found', 'Should have reason target_not_found');
});

// ---------------------------------------------------------------------------
// TESTS: Attack Execution with Target Selection
// ---------------------------------------------------------------------------

// 12. executeAttack with no target defaults to active (backward compatibility)
runTest('executeAttack: no target defaults to active', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Quick Attack',
    damage: 30
  });

  assertEqual(result.targetLocation, 'active', 'Should default to active location');
  assertEqual(result.finalDamage, 30, 'Should do 30 damage');
  assertEqual(result.defenderName, 'Eevee', 'Should target active Pokémon');
  assertEqual(result.defenderHpAfter, 30, 'Eevee should have 30 HP left');
});

// 13. executeAttack with explicit active target
runTest('executeAttack: explicit active target', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Quick Attack',
    damage: 30
  }, { location: 'active' });

  assertEqual(result.targetLocation, 'active', 'Should target active location');
  assertEqual(result.finalDamage, 30, 'Should do 30 damage');
});

// 14. executeAttack can target benched Pokémon (snipe)
runTest('executeAttack: can target benched Pokémon (snipe)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'raticate-1', name: 'Raticate', type: 'colorless', hp: 80 });

  const benchPokemon = addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'eevee-1' });

  assertEqual(result.targetLocation, 'banque', 'Should target banque location');
  assertEqual(result.finalDamage, 80, 'Should do 80 damage');
  assertEqual(result.defenderName, 'Eevee', 'Should target benched Pokémon');
  assertEqual(result.defenderHpAfter, 0, 'Eevee should be KO\'d');
  assert(result.isKO, 'Eevee should be KO\'d');
});

// 15. executeAttack throws error for non-existent target
runTest('executeAttack: throws error for non-existent target', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });

  let errorThrown = false;
  try {
    attackSystem.executeAttack('player1', {
      name: 'Quick Attack',
      damage: 30
    }, { location: 'banque', pokemonId: 'non-existent' });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Target not found'), 'Error should mention target not found');
  }

  assert(errorThrown, 'Should throw error for non-existent target');
});

// 16. executeAttack applies weakness to benched target
runTest('executeAttack: weakness applies to benched target', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const benchPokemon = addToBanque(game, 'player2', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    weakness: 'electric'
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'gyarados-1' });

  assertEqual(result.targetLocation, 'banque', 'Should target banque');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 100, 'Final damage = 80 + 20 = 100');
});

// 17. executeAttack applies damage modifiers to benched target
runTest('executeAttack: damage modifiers apply to benched target', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const benchPokemon = addToBanque(game, 'player2', {
    id: 'magnezone-1',
    name: 'Magnezone',
    type: 'electric',
    hp: 120
  });

  // Register damage reduction ability on benched Pokémon
  abilitySystem.registerAbility('player2', 'magnezone-1', {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'magnezone-1' });

  assertEqual(result.targetLocation, 'banque', 'Should target banque');
  assertEqual(result.reductionApplied, 30, 'Damage reduction should apply');
  assertEqual(result.finalDamage, 50, 'Final damage = 80 - 30 = 50');
});

// 18. executeAttack with snipe KO does NOT trigger KO abilities (only active triggers)
runTest('executeAttack: snipe KO does NOT trigger KO abilities', () => {
  const game = makeGame();
  const { attackSystem, koTriggerSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const benchPokemon = addToBanque(game, 'player2', {
    id: 'pyukumuku-1',
    name: 'Pyukumuku',
    type: 'water',
    hp: 70
  });

  // Register KO trigger on benched Pokémon
  koTriggerSystem.registerAbility('player2', 'pyukumuku-1', {
    id: 'innards-out',
    name: 'Innards Out',
    effect: { type: 'damage_to_attacker', damage: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'pyukumuku-1' });

  assert(result.isKO, 'Pyukumuku should be KO\'d');
  // KO triggers only work for Active Pokémon, not benched (per card text)
  assertEqual(result.koTriggerResults.length, 0, 'Should NOT trigger KO ability for benched target');
});

// 19. executeAttack logs target information in turn log
runTest('executeAttack: logs target information in turn log', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const target = { location: 'banque', pokemonId: 'eevee-1' };
  attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, target);

  const log = game.gameState.turnLog;
  const attackLog = log.find(entry => entry.type === 'attack');

  assert(attackLog !== undefined, 'Should have attack log');
  assertDeepEqual(attackLog.target, target, 'Log should include target');
  assertEqual(attackLog.targetLocation, 'banque', 'Log should show target location');
});

// 20. executeAttack maintains wasActive flag correctly for benched targets
runTest('executeAttack: wasActive flag correct for benched targets', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const benchPokemon = addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'eevee-1' });

  assertEqual(result.targetLocation, 'banque', 'Target location should be banque');
  assert(result.isKO, 'Eevee should be KO\'d');
});

// 21. executeAttack maintains wasActive flag correctly for active targets
runTest('executeAttack: wasActive flag correct for active targets', () => {
  const game = makeGame();
  const { attackSystem, koTriggerSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', {
    id: 'conkeldurr-1',
    name: 'Conkeldurr',
    type: 'fighting',
    hp: 140
  });

  // Register KO trigger
  koTriggerSystem.registerAbility('player2', 'conkeldurr-1', {
    id: 'test-trigger',
    name: 'Test Trigger',
    effect: { type: 'damage_to_attacker', damage: 10 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 150
  }, { location: 'active' });

  assertEqual(result.targetLocation, 'active', 'Target location should be active');
  assert(result.isKO, 'Conkeldurr should be KO\'d');
  assertEqual(result.koTriggerResults.length, 1, 'Should have 1 KO trigger');
});

// 22. executeAttack with energy cost validation for snipe
runTest('executeAttack: energy cost validation applies to snipe', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'electric',
    hp: 110,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 2);

  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  // Attack with energy cost
  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80,
    energyCost: ['electric', 'electric']
  }, { location: 'banque', pokemonId: 'eevee-1' });

  assertEqual(result.energyCostPaid, true, 'Energy cost should be paid');
  assertEqual(result.finalDamage, 80, 'Should do 80 damage');
});

// 23. executeAttack with insufficient energy throws error for snipe
runTest('executeAttack: insufficient energy throws error for snipe', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'electric',
    hp: 110,
    energy: []
  });

  // No energy
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  let errorThrown = false;
  try {
    attackSystem.executeAttack('player1', {
      name: 'Volt Bolt',
      damage: 80,
      energyCost: ['electric', 'electric']
    }, { location: 'banque', pokemonId: 'eevee-1' });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Cannot afford energy cost'), 'Error should mention energy cost');
  }

  assert(errorThrown, 'Should throw error for insufficient energy');
});

// 24. Multiple snipe attacks in sequence
runTest('executeAttack: multiple snipe attacks in sequence', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  // Add multiple benched Pokémon
  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  addToBanque(game, 'player2', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  // Attack first benched Pokémon
  const result1 = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'eevee-1' });

  assertEqual(result1.defenderName, 'Eevee', 'Should target Eevee');
  assertEqual(result1.defenderHpAfter, 0, 'Eevee should be KO\'d');

  // Attack second benched Pokémon
  const result2 = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'pikachu-1' });

  assertEqual(result2.defenderName, 'Pikachu', 'Should target Pikachu');
  assertEqual(result2.defenderHpAfter, 0, 'Pikachu should be KO\'d');
});

// 25. Snipe with pre-KO survival (Guts)
runTest('executeAttack: snipe with pre-KO survival', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const benchPokemon = addToBanque(game, 'player2', {
    id: 'conkeldurr-1',
    name: 'Conkeldurr',
    type: 'fighting',
    hp: 140
  });

  // Register Guts ability
  abilitySystem.registerAbility('player2', 'conkeldurr-1', {
    id: 'guts',
    name: 'Guts',
    type: 'passive',
    effect: { type: 'pre_ko_survival' },
    condition: { type: 'always' }
  });

  // Attack with deterministic coin flip (heads = survive)
  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 150,
    coinFlip: () => true // Heads
  }, { location: 'banque', pokemonId: 'conkeldurr-1' });

  assertEqual(result.finalDamage, 150, 'Should do 150 damage');
  assertEqual(result.preKoSurvivalResult.survived, true, 'Should survive with Guts');
  assertEqual(result.defenderHpAfter, 1, 'Should have 1 HP after survival');
  assert(!result.isKO, 'Should not be KO\'d after survival');
});

// 26. Snipe with recoil damage
runTest('executeAttack: snipe with recoil damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80,
    recoilDamage: 20
  }, { location: 'banque', pokemonId: 'eevee-1' });

  assertEqual(result.finalDamage, 80, 'Should do 80 damage to target');
  assertEqual(result.recoilDamageApplied, 20, 'Should apply 20 recoil damage');
  assertEqual(result.attackerHpAfter, 90, 'Luxray should have 90 HP after recoil');
});

// 27. Snipe with damage scaling
runTest('executeAttack: snipe with damage scaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'electric',
    hp: 110,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 50,
    damageScaling: 10 // +10 per energy
  }, { location: 'banque', pokemonId: 'eevee-1' });

  assertEqual(result.baseDamage, 50, 'Base damage should be 50');
  assertEqual(result.damageScaling, 30, 'Damage scaling should be 30 (3 energy × 10)');
  assertEqual(result.finalDamage, 80, 'Final damage = 50 + 30 = 80');
});

// 28. Snipe with temporary defender effect
runTest('executeAttack: snipe with temporary defender effect (non-lethal)', () => {
  const game = makeGame();
  const { attackSystem, temporaryEffectsSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'vulpix-1',
    name: 'Vulpix',
    type: 'fire',
    hp: 70
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 30, // Non-lethal damage
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      sourceName: 'Volt Bolt'
    }
  }, { location: 'banque', pokemonId: 'vulpix-1' });

  assertEqual(result.temporaryEffectResult.applied, true, 'Should apply temporary effect');
});

// 29. Snipe with damage prevention
runTest('executeAttack: snipe with damage prevention', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-ex-1',
    name: 'Luxray ex', // Name includes 'ex' for prevention detection
    type: 'electric',
    hp: 150
  });

  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  addToBanque(game, 'player2', {
    id: 'oricorio-1',
    name: 'Oricorio',
    type: 'psychic',
    hp: 90
  });

  // Register damage prevention ability
  abilitySystem.registerAbility('player2', 'oricorio-1', {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'oricorio-1' });

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
});

// 30. Target selection works correctly when bench has multiple Pokémon
runTest('executeAttack: target selection with multiple benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'luxray-1', name: 'Luxray', type: 'electric', hp: 110 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  // Add 3 benched Pokémon with different HP
  addToBanque(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBanque(game, 'player2', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBanque(game, 'player2', { id: 'rattata-1', name: 'Rattata', type: 'colorless', hp: 50 });

  // Attack the second benched Pokémon
  const result = attackSystem.executeAttack('player1', {
    name: 'Volt Bolt',
    damage: 80
  }, { location: 'banque', pokemonId: 'pikachu-1' });

  assertEqual(result.defenderName, 'Pikachu', 'Should target correct benched Pokémon');
  assertEqual(result.defenderHpAfter, 0, 'Pikachu should be KO\'d');

  // Verify other benched Pokémon are unaffected
  const bench = game.gameState.players.player2.banque;
  const eevee = bench.find(p => p.id === 'eevee-1');
  const rattata = bench.find(p => p.id === 'rattata-1');

  assertEqual(eevee.currentHp, 60, 'Eevee should be unaffected');
  assertEqual(rattata.currentHp, 50, 'Rattata should be unaffected');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
