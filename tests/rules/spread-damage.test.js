/**
 * Test: Spread Damage (GAP-016)
 *
 * Tests the spread damage implementation for attacks that deal damage
 * to multiple opponent Pokémon (typically Benched Pokémon).
 *
 * GAP-016: [Importante][C2] Spread damage (Raichu (Gigashock))
 *
 * Acceptance Criteria:
 * 1. Implementar daño múltiple a Banca
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa
 * 4. npm run check pasa
 *
 * Spread Damage Format:
 * - spreadDamage: { amount: number, target: 'banque' | 'all' }
 * - target: 'banque' - damage to each Benched Pokémon only (Raichu Gigashock pattern)
 * - target: 'all' - damage to all opponent's Pokémon (Active + Banque)
 *
 * Real-card examples:
 * - Raichu (Gigashock): "This attack also does 20 damage to each of your opponent's Benched Pokémon."
 * - Palkia ex (Dimensional Storm): "This attack also does 20 damage to each of your opponent's Benched Pokémon."
 * - Alolan Ninetales (Frost Breath): "This attack also does 10 damage to each of your opponent's Benched Pokémon."
 *
 * Behavior:
 * - Each Benched Pokémon receives the same base damage amount
 * - Damage modifiers (bonus, reduction) apply to each Benched Pokémon separately
 * - Weakness applies to each Benched Pokémon separately
 * - KO triggers fire for each Benched Pokémon that is KO'd
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
 * Add a Pokémon to the bench (banque) of a player
 */
function addToBanque(game, playerId, props) {
  if (!game.gameState.players[playerId].banque) {
    game.gameState.players[playerId].banque = [];
  }

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
// TESTS: Spread Damage - Basic Functionality
// ---------------------------------------------------------------------------

// 1. AttackSystem has applySpreadDamage method
runTest('AttackSystem has applySpreadDamage method', () => {
  const game = makeGame();
  assert(game.attackSystem.applySpreadDamage !== undefined, 'applySpreadDamage should exist');
});

// 2. No spread damage config returns empty results
runTest('applySpreadDamage: no config = empty results', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });

  const attacker = game.gameState.players.player1.activePokemon;

  const results = attackSystem.applySpreadDamage('player1', attacker, null);
  assertEqual(results.length, 0, 'No config should return empty results');
});

// 3. Spread damage to Banque - single target
runTest('executeAttack: spread damage to single Benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add one Benched Pokémon
  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');
  assertEqual(result.spreadDamageResults[0].damage, 20, 'Spread damage should be 20');
  assertEqual(result.spreadDamageResults[0].pokemonName, 'Pikachu', 'Should hit Benched Pikachu');
  assertEqual(result.spreadDamageResults[0].location, 'banque', 'Should target Banque');
  assertEqual(result.spreadDamageResults[0].hpAfter, 40, 'Pikachu HP should be 60 - 20 = 40');
});

// 4. Spread damage to Banque - multiple targets
runTest('executeAttack: spread damage to multiple Benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add three Benched Pokémon
  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  addToBanque(game, 'player2', {
    id: 'bulbasaur-1',
    name: 'Bulbasaur',
    type: 'grass',
    hp: 60
  });

  addToBanque(game, 'player2', {
    id: 'charmander-1',
    name: 'Charmander',
    type: 'fire',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 3, 'Should have 3 spread damage results');

  // Check first target
  assertEqual(result.spreadDamageResults[0].damage, 20, 'First target should take 20 damage');
  assertEqual(result.spreadDamageResults[0].hpAfter, 40, 'Pikachu HP should be 60 - 20 = 40');

  // Check second target
  assertEqual(result.spreadDamageResults[1].damage, 20, 'Second target should take 20 damage');
  assertEqual(result.spreadDamageResults[1].hpAfter, 40, 'Bulbasaur HP should be 60 - 20 = 40');

  // Check third target
  assertEqual(result.spreadDamageResults[2].damage, 20, 'Third target should take 20 damage');
  assertEqual(result.spreadDamageResults[2].hpAfter, 40, 'Charmander HP should be 60 - 20 = 40');
});

// 5. Spread damage doesn't affect Active Pokémon when target is 'banque'
runTest('executeAttack: spread to banque does not hit Active', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add Benched Pokémon
  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  // Active should only take main attack damage (40), not spread damage (20)
  assertEqual(result.defenderHpAfter, 20, 'Active Eevee should have 20 HP (60 - 40)');

  // Benched should take spread damage (20), not main attack damage
  assertEqual(result.spreadDamageResults[0].damage, 20, 'Benched Pikachu should take 20 spread damage');
  assertEqual(result.spreadDamageResults[0].hpAfter, 40, 'Benched Pikachu should have 40 HP (60 - 20)');
});

// 6. Spread damage amount different from main attack
runTest('executeAttack: spread amount independent of main damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'palkia-ex-1',
    name: 'Palkia ex',
    type: 'water',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Dimensional Storm',
    damage: 90,
    energyCost: ['water', 'water', 'water', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  // Main attack does 90 to Active
  assertEqual(result.finalDamage, 90, 'Main attack damage should be 90');
  assertEqual(result.defenderHpAfter, 0, 'Active Eevee should be KO\'d');

  // Spread damage does 20 to Benched
  assertEqual(result.spreadDamageResults[0].damage, 20, 'Spread damage should be 20');
  assertEqual(result.spreadDamageResults[0].hpAfter, 40, 'Benched Pikachu should have 40 HP');
});

// 7. Spread damage with weakness applied to Benched Pokémon
runTest('executeAttack: spread damage with weakness on Benched', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add Benched Pokémon weak to electric
  addToBanque(game, 'player2', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    weakness: 'electric'
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');

  // Weakness should add +20 to spread damage
  assertEqual(result.spreadDamageResults[0].damage, 40, 'Spread damage should be 20 + 20 weakness = 40');
  assertEqual(result.spreadDamageResults[0].weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.spreadDamageResults[0].hpAfter, 90, 'Gyarados HP should be 130 - 40 = 90');
});

// 8. Spread damage KO's Benched Pokémon
runTest('executeAttack: spread damage KO\'s Benched Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add Benched Pokémon with low HP
  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    currentHp: 15 // Only 15 HP left
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');
  assert(result.spreadDamageResults[0].isKO, 'Benched Pikachu should be KO\'d');
  assertEqual(result.spreadDamageResults[0].hpAfter, 0, 'HP should be 0');
});

// 9. Spread damage with damage reduction on Benched Pokémon
runTest('executeAttack: spread damage with reduction on Benched', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add Benched Pokémon with damage reduction ability
  addToBanque(game, 'player2', {
    id: 'magnezone-1',
    name: 'Magnezone',
    type: 'electric',
    hp: 120
  });

  // Register damage reduction ability
  abilitySystem.registerAbility('player2', 'magnezone-1', {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 10 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');

  // Damage reduction should apply to spread damage
  assertEqual(result.spreadDamageResults[0].damage, 10, 'Spread damage should be 20 - 10 = 10');
  assertEqual(result.spreadDamageResults[0].reductionApplied, 10, 'Reduction should be 10');
  assertEqual(result.spreadDamageResults[0].hpAfter, 110, 'Magnezone HP should be 120 - 10 = 110');
});

// 10. Spread damage with damage bonus on attacker
runTest('executeAttack: spread damage with bonus from attacker', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'electric',
    hp: 110,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  // Register damage bonus ability
  abilitySystem.registerAbility('player1', 'luxray-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 15 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');

  // Damage bonus should apply to spread damage
  assertEqual(result.spreadDamageResults[0].damage, 35, 'Spread damage should be 20 + 15 = 35');
  assertEqual(result.spreadDamageResults[0].bonusApplied, 15, 'Bonus should be 15');
  assertEqual(result.spreadDamageResults[0].hpAfter, 25, 'Pikachu HP should be 60 - 35 = 25');
});

// 11. Spread damage to empty Banque
runTest('executeAttack: spread damage to empty Banque', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // No Benched Pokémon

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 0, 'Should have no spread damage results');
});

// 12. Spread damage logs to turn log
runTest('executeAttack: spread damage logged to turn log', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  const log = game.gameState.turnLog;
  const spreadLogs = log.filter(entry => entry.type === 'spread_damage');

  assertEqual(spreadLogs.length, 1, 'Should have 1 spread_damage log entry');
  assertEqual(spreadLogs[0].damage, 20, 'Log should show damage amount');
  assertEqual(spreadLogs[0].targetName, 'Pikachu', 'Log should show target name');
  assertEqual(spreadLogs[0].targetLocation, 'banque', 'Log should show target location');
});

// 13. Multiple Benched Pokémon KO'd by spread damage
runTest('executeAttack: multiple Benched KO\'d by spread', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add two Benched Pokémon with low HP
  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    currentHp: 10
  });

  addToBanque(game, 'player2', {
    id: 'bulbasaur-1',
    name: 'Bulbasaur',
    type: 'grass',
    hp: 60,
    currentHp: 15
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 2, 'Should have 2 spread damage results');

  // Both should be KO'd
  assert(result.spreadDamageResults[0].isKO, 'Pikachu should be KO\'d');
  assertEqual(result.spreadDamageResults[0].hpAfter, 0, 'Pikachu HP should be 0');

  assert(result.spreadDamageResults[1].isKO, 'Bulbasaur should be KO\'d');
  assertEqual(result.spreadDamageResults[1].hpAfter, 0, 'Bulbasaur HP should be 0');
});

// 14. Spread damage with damage prevention on Benched Pokémon
runTest('executeAttack: spread damage with prevention on Benched', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-1',
    name: 'Charizard ex',
    type: 'fire',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fire', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'oricorio-1',
    name: 'Oricorio',
    type: 'psychic',
    hp: 90
  });

  // Register damage prevention ability (prevents damage from Pokémon ex)
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
    name: 'Flamethrower',
    damage: 40,
    energyCost: ['fire', 'fire', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');

  // Damage should be prevented
  assertEqual(result.spreadDamageResults[0].damage, 0, 'Spread damage should be 0 (prevented)');
  assertEqual(result.spreadDamageResults[0].damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.spreadDamageResults[0].hpAfter, 90, 'Oricorio HP should still be 90');
});

// 15. Spread damage result includes all required fields
runTest('executeAttack: spread result includes required fields', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  const spreadResult = result.spreadDamageResults[0];

  assert(spreadResult.pokemonId !== undefined, 'Should have pokemonId');
  assert(spreadResult.pokemonName !== undefined, 'Should have pokemonName');
  assert(spreadResult.location !== undefined, 'Should have location');
  assert(spreadResult.hpBefore !== undefined, 'Should have hpBefore');
  assert(spreadResult.hpAfter !== undefined, 'Should have hpAfter');
  assert(spreadResult.damage !== undefined, 'Should have damage');
  assert(spreadResult.isKO !== undefined, 'Should have isKO');
  assert(spreadResult.damagePrevented !== undefined, 'Should have damagePrevented');
  assert(spreadResult.weaknessApplied !== undefined, 'Should have weaknessApplied');
  assert(spreadResult.bonusApplied !== undefined, 'Should have bonusApplied');
  assert(spreadResult.reductionApplied !== undefined, 'Should have reductionApplied');
});

// 16. Spread damage does not apply to already KO'd Benched Pokémon
runTest('executeAttack: spread damage skips KO\'d Benched', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add one healthy and one already KO'd Benched Pokémon
  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  addToBanque(game, 'player2', {
    id: 'bulbasaur-1',
    name: 'Bulbasaur',
    type: 'grass',
    hp: 60,
    currentHp: 0 // Already KO'd
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  // Should only hit the healthy one, skip the KO'd one
  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result (KO\'d skipped)');
  assertEqual(result.spreadDamageResults[0].pokemonName, 'Pikachu', 'Should hit Pikachu');
});

// 17. Main attack result includes spreadDamageResults field
runTest('executeAttack: result includes spreadDamageResults field', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Quick Attack',
    damage: 30,
    energyCost: ['electric', 'colorless']
    // No spread damage config
  });

  // Should have spreadDamageResults field (even if empty array)
  assert(result.spreadDamageResults !== undefined, 'Should have spreadDamageResults field');
  assertEqual(result.spreadDamageResults.length, 0, 'Should be empty array when no spread damage config');
});

// 18. Invalid spread damage target throws error
runTest('applySpreadDamage: invalid target throws error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });

  const attacker = game.gameState.players.player1.activePokemon;

  let errorThrown = false;
  try {
    attackSystem.applySpreadDamage('player1', attacker, {
      amount: 20,
      target: 'invalid_target'
    });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Invalid spread damage target'), 'Error should mention invalid target');
  }

  assert(errorThrown, 'Should throw error for invalid target');
});

// 19. Spread damage with zero amount
runTest('executeAttack: spread damage with zero amount', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 0,
      target: 'banque'
    }
  });

  // Zero amount should still apply (0 damage to each Benched)
  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');
  assertEqual(result.spreadDamageResults[0].damage, 0, 'Damage should be 0');
  assertEqual(result.spreadDamageResults[0].hpAfter, 60, 'HP should not change');
});

// 20. Spread damage combined with recoil damage
runTest('executeAttack: spread damage + recoil damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'arcanine-1',
    name: 'Arcanine',
    type: 'fire',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fire', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 50,
    energyCost: ['fire', 'fire', 'colorless'],
    recoilDamage: 20,
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  // Check spread damage was applied
  assertEqual(result.spreadDamageResults.length, 1, 'Should have spread damage results');
  assertEqual(result.spreadDamageResults[0].damage, 20, 'Spread damage should be 20');

  // Check recoil was applied
  assertEqual(result.recoilDamageApplied, 20, 'Recoil damage should be 20');
  assertEqual(result.attackerHpAfter, 100, 'Arcanine HP should be 120 - 20 = 100');
});

// 21. Spread damage target 'all' hits Active + Banque
runTest('executeAttack: spread target \'all\' hits Active + Banque', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'spiritomb-1',
    name: 'Spiritomb',
    type: 'psychic',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'psychic', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Swirling Disaster',
    damage: 40,
    energyCost: ['psychic', 'colorless'],
    spreadDamage: {
      amount: 10,
      target: 'all'
    }
  });

  // Should hit Active + Banque (2 targets total)
  assertEqual(result.spreadDamageResults.length, 2, 'Should have 2 spread damage results (Active + Banque)');

  // Find Active and Banque targets
  const activeTarget = result.spreadDamageResults.find(r => r.location === 'active');
  const banqueTarget = result.spreadDamageResults.find(r => r.location === 'banque');

  assert(activeTarget !== undefined, 'Should hit Active Pokémon');
  assertEqual(activeTarget.pokemonName, 'Eevee', 'Active should be Eevee');

  assert(banqueTarget !== undefined, 'Should hit Benched Pokémon');
  assertEqual(banqueTarget.pokemonName, 'Pikachu', 'Banque target should be Pikachu');
});

// 22. Spread damage with mixed damage modifiers on different targets
runTest('executeAttack: spread with different modifiers per target', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'electric',
    hp: 110,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add two Benched Pokémon with different weaknesses
  addToBanque(game, 'player2', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    weakness: 'electric'
  });

  addToBanque(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130
  });

  // Register damage bonus ability
  abilitySystem.registerAbility('player1', 'luxray-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 10 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 2, 'Should have 2 spread damage results');

  // Gyarados (weak to electric) should get: 20 + 10 bonus + 20 weakness = 50
  assertEqual(result.spreadDamageResults[0].damage, 50, 'Gyarados should take 50 damage');
  assertEqual(result.spreadDamageResults[0].weaknessApplied, 20, 'Gyarados should have 20 weakness');

  // Snorlax (no weakness) should get: 20 + 10 bonus = 30
  assertEqual(result.spreadDamageResults[1].damage, 30, 'Snorlax should take 30 damage');
  assertEqual(result.spreadDamageResults[1].weaknessApplied, 0, 'Snorlax should have 0 weakness');
});

// 23. executeAttack integrates spread damage with KO triggers on main target
runTest('executeAttack: spread damage + KO trigger on main target', () => {
  const game = makeGame();
  const { attackSystem, koTriggerSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 3);

  // Set Pyukumuku as Active (KO triggers only work on Active)
  setActive(game, 'player2', {
    id: 'pyukumuku-1',
    name: 'Pyukumuku',
    type: 'water',
    hp: 70,
    currentHp: 30 // Will be KO'd by 40 damage from main attack
  });

  addToBanque(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  // Register a KO trigger on Active Pyukumuku
  koTriggerSystem.registerAbility('player2', 'pyukumuku-1', {
    id: 'innards-out',
    name: 'Innards Out',
    effect: { type: 'damage_to_attacker', damage: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    energyCost: ['electric', 'electric', 'colorless'],
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  // Main target (Active) should be KO'd and trigger KO trigger
  assert(result.isKO, 'Pyukumuku (Active) should be KO\'d');
  assertEqual(result.koTriggerResults.length, 1, 'Should have 1 KO trigger result on main target');

  // Spread damage should still be applied to Benched Pokémon
  assertEqual(result.spreadDamageResults.length, 1, 'Should have 1 spread damage result');
  assertEqual(result.spreadDamageResults[0].pokemonName, 'Eevee', 'Spread should hit Benched Eevee');
});

// 24. executeAttack main result includes spreadDamageResults even when empty
runTest('executeAttack: spreadDamageResults always present in result', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // No spread damage config
  const result = attackSystem.executeAttack('player1', {
    name: 'Quick Attack',
    damage: 30,
    energyCost: ['electric', 'colorless']
  });

  // Should always have spreadDamageResults field
  assert(result.spreadDamageResults !== undefined, 'Result should have spreadDamageResults field');
  assertEqual(Array.isArray(result.spreadDamageResults), true, 'spreadDamageResults should be an array');
  assertEqual(result.spreadDamageResults.length, 0, 'Should be empty array when no config');
});

// 25. Spread damage with no energy cost still applies
runTest('executeAttack: spread damage with no energy cost', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'electric',
    hp: 90,
    energy: []
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  addToBanque(game, 'player2', {
    id: 'pikachu-2',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gigashock',
    damage: 40,
    spreadDamage: {
      amount: 20,
      target: 'banque'
    }
  });

  assertEqual(result.spreadDamageResults.length, 1, 'Should have spread damage results');
  assertEqual(result.spreadDamageResults[0].damage, 20, 'Spread damage should be 20');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${testsPassed} tests passed, ${testsFailed} tests failed`);

if (testsFailed > 0) {
  process.exit(1);
}
