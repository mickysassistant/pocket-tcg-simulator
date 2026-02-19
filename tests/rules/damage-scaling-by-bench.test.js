/**
 * Test: Damage Scaling by Bench Count (GAP-017)
 *
 * Tests the damage scaling system based on number of Pokémon in Banca.
 *
 * GAP-017: [Importante][C2] Daño escalado por Pokémon en Banca (Cinccino)
 *
 * Acceptance Criteria:
 * 1. Implementar cálculo de daño por conteo de Banca
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos)
 * 4. npm run check pasa
 *
 * Bench Scaling Formats:
 * - Simple: benchScaling: number - adds this much damage per Pokémon in your bench
 *   Example: benchScaling: 30 adds 30 damage per Benched Pokémon
 * - Object: benchScaling: { perPokemon: number, player?: 'self' | 'opponent', type?: string, name?: string }
 *   Example: { perPokemon: 30 } adds 30 per Benched Pokémon (your bench)
 *   Example: { perPokemon: 20, player: 'opponent' } adds 20 per opponent's Benched Pokémon
 *   Example: { perPokemon: 10, player: 'self', type: 'electric' } adds 10 per electric Pokémon in your bench
 *   Example: { perPokemon: 50, player: 'self', name: 'Nidoking' } adds 50 per Nidoking in your bench
 *
 * Real-card examples:
 * - Cinccino (Do the Wave): "This attack does 30 damage for each of your Benched Pokémon." → { perPokemon: 30, player: 'self' }
 * - Pikachu (Circle Circuit): "This attack does 10 damage for each of your Benched [L] Pokémon." → { perPokemon: 10, player: 'self', type: 'electric' }
 * - Pikachu ex (Circle Circuit): Same as Pikachu
 * - Beheeyem (Mind Jack): "This attack does 20 more damage for each of your opponent's Benched Pokémon." → { perPokemon: 20, player: 'opponent' }
 * - Nidoqueen (Lovestrike): "This attack does 50 more damage for each of your Benched Nidoking." → { perPokemon: 50, player: 'self', name: 'Nidoking' }
 *
 * Attack execution flow with bench scaling:
 * 1. Get base damage from attack definition
 * 2. Apply damageScaling (energy-based)
 * 3. Apply benchScaling (bench-based)
 * 4. Apply damage modifiers (bonus, reduction, etc.)
 * 5. Apply weakness
 * 6. Final damage = base + energyScaling + benchScaling + modifiers + weakness
 *
 * Note: In Pocket TCG, the maximum bench size is 3 Pokémon (vs 5 in physical TCG).
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
 * Add a Pokémon to a player's bench (banque)
 */
function addToBench(game, playerId, props) {
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

  game.gameState.players[playerId].banque = game.gameState.players[playerId].banque || [];
  game.gameState.players[playerId].banque.push(pokemon);
  return pokemon;
}

/**
 * Clear a player's bench
 */
function clearBench(game, playerId) {
  game.gameState.players[playerId].banque = [];
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
// TESTS: Bench Scaling Calculation
// ---------------------------------------------------------------------------

// 1. AttackSystem has calculateBenchScaling method
runTest('AttackSystem has calculateBenchScaling method', () => {
  const game = makeGame();
  assert(game.attackSystem.calculateBenchScaling !== undefined, 'calculateBenchScaling should exist');
});

// 2. No benchScaling returns 0
runTest('calculateBenchScaling: no benchScaling = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    energy: []
  });

  const scaling = attackSystem.calculateBenchScaling('player1', undefined);
  assertEqual(scaling, 0, 'No benchScaling should return 0');
});

// 3. Empty bench returns 0
runTest('calculateBenchScaling: empty bench = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  clearBench(game, 'player1');

  const scaling = attackSystem.calculateBenchScaling('player1', 10);
  assertEqual(scaling, 0, 'Empty bench should return 0');
});

// 4. Simple benchScaling: 10 per Pokémon with 2 on bench = 20
runTest('calculateBenchScaling: simple format - 2 Pokémon on bench = 20', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', 10);
  assertEqual(scaling, 20, '2 Pokémon on bench with 10 per Pokémon should be 20');
});

// 5. Simple benchScaling: 30 per Pokémon with 3 on bench = 90
runTest('calculateBenchScaling: simple format - 3 Pokémon on bench = 90', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  // Maximum bench size in Pocket TCG is 3
  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', 30);
  assertEqual(scaling, 90, '3 Pokémon on bench with 30 per Pokémon should be 90');
});

// 6. Object format: player: 'self' counts own bench (default)
runTest('calculateBenchScaling: object format - player: self', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', { perPokemon: 20, player: 'self' });
  assertEqual(scaling, 40, '2 Pokémon on own bench with 20 per should be 40');
});

// 7. Object format: player: 'opponent' counts opponent's bench
runTest('calculateBenchScaling: object format - player: opponent', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'beheeyem-1',
    name: 'Beheeyem',
    type: 'psychic',
    hp: 90,
    energy: []
  });

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120
  });

  // Add 3 Pokémon to opponent's bench
  addToBench(game, 'player2', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player2', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player2', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', { perPokemon: 20, player: 'opponent' });
  assertEqual(scaling, 60, '3 Pokémon on opponent bench with 20 per should be 60');
});

// 8. Object format: type filter counts only matching type
runTest('calculateBenchScaling: object format - type filter', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Raichu', type: 'electric', hp: 90 });

  const scaling = attackSystem.calculateBenchScaling('player1', { perPokemon: 10, player: 'self', type: 'electric' });
  assertEqual(scaling, 20, '2 electric Pokémon on bench with 10 per should be 20');
});

// 9. Object format: name filter counts only matching name
runTest('calculateBenchScaling: object format - name filter', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'nidoqueen-1',
    name: 'Nidoqueen',
    type: 'poison',
    hp: 120,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Eevee', type: 'colorless', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', { perPokemon: 50, player: 'self', name: 'Nidoking' });
  assertEqual(scaling, 100, '2 Nidoking on bench with 50 per should be 100');
});

// 10. Object format: perPokemon = 0 returns 0
runTest('calculateBenchScaling: perPokemon = 0 returns 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', { perPokemon: 0 });
  assertEqual(scaling, 0, '0 perPokemon should return 0 regardless of bench count');
});

// 11. KO'd Pokémon on bench are not counted
runTest('calculateBenchScaling: KO\'d Pokémon are not counted', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60, currentHp: 0 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60, currentHp: -10 });

  const scaling = attackSystem.calculateBenchScaling('player1', 20);
  assertEqual(scaling, 20, 'Only 1 alive Pokémon on bench with 20 per should be 20');
});

// 12. Combination of type and name filters
runTest('calculateBenchScaling: type + name filters (both must match)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'test-1',
    name: 'Test',
    type: 'colorless',
    hp: 100,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Nidoking', type: 'ground', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Eevee', type: 'poison', hp: 60 });

  const scaling = attackSystem.calculateBenchScaling('player1', { perPokemon: 50, player: 'self', type: 'poison', name: 'Nidoking' });
  assertEqual(scaling, 50, 'Only 1 Nidoking that is poison type on bench with 50 per should be 50');
});

// 13. Invalid player parameter throws error
runTest('calculateBenchScaling: invalid player throws error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'test-1',
    name: 'Test',
    type: 'colorless',
    hp: 100
  });

  let errorThrown = false;
  try {
    attackSystem.calculateBenchScaling('player1', { perPokemon: 10, player: 'invalid' });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Invalid bench scaling player'), 'Error should mention invalid player');
  }

  assert(errorThrown, 'Should throw error for invalid player parameter');
});

// ---------------------------------------------------------------------------
// TESTS: executeAttack with Bench Scaling
// ---------------------------------------------------------------------------

// 14. executeAttack includes benchScaling in result
runTest('executeAttack: result includes benchScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assert(result.benchScaling !== undefined, 'Result should have benchScaling field');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60 (2 Pokémon * 30)');
});

// 15. executeAttack: baseDamage + benchScaling = correct total
runTest('executeAttack: baseDamage + benchScaling = correct total', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.benchScaling, 90, 'Bench scaling should be 90 (3 Pokémon * 30)');
  assertEqual(result.finalDamage, 100, 'Final damage should be 100 (10 + 90)');
});

// 16. executeAttack: benchScaling applies before damage bonus
runTest('executeAttack: benchScaling before damage bonus', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add damage bonus ability
  abilitySystem.registerAbility('player1', 'cinccino-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60');
  assertEqual(result.bonusApplied, 20, 'Bonus should be 20');
  assertEqual(result.finalDamage, 90, 'Final damage = 10 + 60 + 20 = 90');
});

// 17. executeAttack: benchScaling with damage reduction
runTest('executeAttack: benchScaling + damage reduction', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

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
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60');
  assertEqual(result.reductionApplied, 30, 'Reduction should be 30');
  assertEqual(result.finalDamage, 40, 'Final damage = 10 + 60 - 30 = 40');
});

// 18. executeAttack: benchScaling with weakness
runTest('executeAttack: benchScaling + weakness', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'colorless'  // Charizard is weak to colorless
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 90, 'Final damage = 10 + 60 + 20 = 90');
});

// 19. executeAttack: benchScaling with all modifiers
runTest('executeAttack: benchScaling + bonus + reduction + weakness', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130,
    weakness: 'colorless'
  });

  // Attacker bonus
  abilitySystem.registerAbility('player1', 'cinccino-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 15 },
    condition: { type: 'always' }
  });

  // Defender reduction
  abilitySystem.registerAbility('player2', 'snorlax-1', {
    id: 'test-reduction',
    name: 'Test Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  // Calculation: 10 (base) + 60 (bench) + 15 (bonus) - 20 (reduction) + 20 (weakness) = 85
  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60');
  assertEqual(result.bonusApplied, 15, 'Bonus should be 15');
  assertEqual(result.reductionApplied, 20, 'Reduction should be 20');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 85, 'Final damage = 10 + 60 + 15 - 20 + 20 = 85');
});

// 20. executeAttack: benchScaling counting opponent's bench
runTest('executeAttack: benchScaling counting opponent bench', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'beheeyem-1',
    name: 'Beheeyem',
    type: 'psychic',
    hp: 90,
    energy: []
  });

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120
  });

  // Add 3 Pokémon to opponent's bench
  addToBench(game, 'player2', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player2', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player2', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Mind Jack',
    damage: 30,
    benchScaling: { perPokemon: 20, player: 'opponent' },
    energyCost: []
  });

  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60 (3 opponent Pokémon * 20)');
  assertEqual(result.finalDamage, 90, 'Final damage = 30 + 60 = 90');
});

// 21. executeAttack: benchScaling with type filter
runTest('executeAttack: benchScaling with type filter', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Raichu', type: 'electric', hp: 90 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Circle Circuit',
    damage: 20,
    benchScaling: { perPokemon: 10, player: 'self', type: 'electric' },
    energyCost: []
  });

  assertEqual(result.benchScaling, 20, 'Bench scaling should be 20 (2 electric Pokémon * 10)');
  assertEqual(result.finalDamage, 40, 'Final damage = 20 + 20 = 40');
});

// 22. executeAttack: benchScaling with name filter
runTest('executeAttack: benchScaling with name filter', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'nidoqueen-1',
    name: 'Nidoqueen',
    type: 'poison',
    hp: 120,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Eevee', type: 'colorless', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Lovestrike',
    damage: 30,
    benchScaling: { perPokemon: 50, player: 'self', name: 'Nidoking' },
    energyCost: []
  });

  assertEqual(result.benchScaling, 100, 'Bench scaling should be 100 (2 Nidoking * 50)');
  assertEqual(result.finalDamage, 130, 'Final damage = 30 + 100 = 130');
});

// 23. executeAttack: benchScaling + damageScaling combined
runTest('executeAttack: benchScaling + damageScaling combined', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'test-1',
    name: 'Test Pokemon',
    type: 'colorless',
    hp: 100,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'colorless', 3);

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Combined Attack',
    damage: 10,
    damageScaling: 10,
    benchScaling: 20,
    energyCost: ['colorless', 'colorless']
  });

  assertEqual(result.damageScaling, 30, 'Energy scaling should be 30 (3 energy * 10)');
  assertEqual(result.benchScaling, 40, 'Bench scaling should be 40 (2 Pokémon * 20)');
  assertEqual(result.finalDamage, 80, 'Final damage = 10 + 30 + 40 = 80');
});

// 24. executeAttack: benchScaling with empty bench
runTest('executeAttack: benchScaling with empty bench', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  clearBench(game, 'player1');

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.benchScaling, 0, 'Bench scaling should be 0 (empty bench)');
  assertEqual(result.finalDamage, 10, 'Final damage should be 10 (base only)');
});

// 25. executeAttack: benchScaling with opponent's empty bench
runTest('executeAttack: benchScaling with opponent empty bench', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'beheeyem-1',
    name: 'Beheeyem',
    type: 'psychic',
    hp: 90,
    energy: []
  });

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120
  });

  clearBench(game, 'player2');

  const result = attackSystem.executeAttack('player1', {
    name: 'Mind Jack',
    damage: 30,
    benchScaling: { perPokemon: 20, player: 'opponent' },
    energyCost: []
  });

  assertEqual(result.benchScaling, 0, 'Bench scaling should be 0 (opponent empty bench)');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30 (base only)');
});

// ---------------------------------------------------------------------------
// TESTS: calculateDamage with Bench Scaling
// ---------------------------------------------------------------------------

// 26. calculateDamage includes benchScaling
runTest('calculateDamage: includes benchScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.calculateDamage('player1', 'player2', 10, {
    benchScaling: 30
  });

  assert(result.benchScaling !== undefined, 'Result should have benchScaling');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60');
  assertEqual(result.finalDamage, 70, 'Final damage = 10 + 60 = 70');
});

// 27. calculateDamage without attack object
runTest('calculateDamage: no attack object = no benchScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.calculateDamage('player1', 'player2', 30);

  assertEqual(result.benchScaling, 0, 'No attack object should have 0 benchScaling');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30 (no scaling)');
});

// 28. calculateDamage is a dry-run (no state mutation)
runTest('calculateDamage: dry-run with benchScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'colorless'
  });

  const defender = game.gameState.players.player2.activePokemon;
  const hpBefore = defender.currentHp;

  const result = attackSystem.calculateDamage('player1', 'player2', 10, {
    benchScaling: 30
  });

  // Check calculation
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 90, 'Final damage = 10 + 60 + 20 = 90');

  // Verify no state mutation
  assertEqual(defender.currentHp, hpBefore, 'Defender HP should not change in dry-run');
});

// ---------------------------------------------------------------------------
// TESTS: Edge Cases
// ---------------------------------------------------------------------------

// 29. benchScaling with damage prevention
runTest('executeAttack: benchScaling + damage prevention', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-ex-1',
    name: 'Charizard ex',
    type: 'fire',
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', {
    id: 'oricorio-1',
    name: 'Oricorio',
    type: 'psychic',
    hp: 90
  });

  // Damage prevention ability
  abilitySystem.registerAbility('player2', 'oricorio-1', {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: { type: 'is_active' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Flamethrower',
    damage: 20,
    benchScaling: 10,
    energyCost: []
  });

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0 despite bench scaling');
});

// 30. executeAttack logs benchScaling in turn log
runTest('executeAttack: logs benchScaling in turn log', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  const log = game.gameState.turnLog;
  const attackLog = log.find(entry => entry.type === 'attack');

  assert(attackLog !== undefined, 'Should have attack log');
  assertEqual(attackLog.benchScaling, 60, 'Log should show benchScaling');
});

// 31. benchScaling with 0 base damage
runTest('executeAttack: benchScaling with 0 base damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'test-1',
    name: 'Test Pokemon',
    type: 'colorless',
    hp: 100,
    energy: []
  });

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Bench Strike',
    damage: 0,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.baseDamage, 0, 'Base damage should be 0');
  assertEqual(result.benchScaling, 90, 'Bench scaling should be 90');
  assertEqual(result.finalDamage, 90, 'Final damage = 0 + 90 = 90');
});

// 32. benchScaling: maximum bench (3 Pokémon)
runTest('executeAttack: benchScaling with maximum bench (3)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  // Maximum bench size in Pocket TCG is 3
  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: []
  });

  assertEqual(result.benchScaling, 90, 'Bench scaling should be 90 (3 Pokémon * 30)');
  assertEqual(result.finalDamage, 100, 'Final damage = 10 + 90 = 100');
});

// 33. benchScaling: real Cinccino example
runTest('executeAttack: real Cinccino (Do the Wave)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'cinccino-1',
    name: 'Cinccino',
    type: 'colorless',
    hp: 90,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'colorless', 2);

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Do the Wave',
    damage: 10,
    benchScaling: 30,
    energyCost: ['colorless', 'colorless']
  });

  // Cinccino's Do the Wave: 10 damage + 30 per Benched Pokémon
  // With 3 Pokémon on bench: 10 + (3 * 30) = 100 damage
  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.benchScaling, 90, 'Bench scaling should be 90');
  assertEqual(result.finalDamage, 100, 'Final damage = 10 + 90 = 100');
});

// 34. benchScaling: real Pikachu example
runTest('executeAttack: real Pikachu (Circle Circuit)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'electric', 2);

  addToBench(game, 'player1', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Raichu', type: 'electric', hp: 90 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Circle Circuit',
    damage: 20,
    benchScaling: { perPokemon: 10, player: 'self', type: 'electric' },
    energyCost: ['electric', 'electric']
  });

  // Pikachu's Circle Circuit: 20 damage + 10 per Benched [L] Pokémon
  // With 2 electric Pokémon on bench: 20 + (2 * 10) = 40 damage
  assertEqual(result.baseDamage, 20, 'Base damage should be 20');
  assertEqual(result.benchScaling, 20, 'Bench scaling should be 20 (2 electric * 10)');
  assertEqual(result.finalDamage, 40, 'Final damage = 20 + 20 = 40');
});

// 35. benchScaling: real Beheeyem example
runTest('executeAttack: real Beheeyem (Mind Jack)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'beheeyem-1',
    name: 'Beheeyem',
    type: 'psychic',
    hp: 90,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'psychic', 1);
  addEnergy(game.gameState.players.player1.activePokemon, 'colorless', 2);

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120
  });

  addToBench(game, 'player2', { id: 'bench-1', name: 'Eevee', type: 'colorless', hp: 60 });
  addToBench(game, 'player2', { id: 'bench-2', name: 'Pikachu', type: 'electric', hp: 60 });
  addToBench(game, 'player2', { id: 'bench-3', name: 'Bulbasaur', type: 'grass', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Mind Jack',
    damage: 30,
    benchScaling: { perPokemon: 20, player: 'opponent' },
    energyCost: ['psychic', 'colorless', 'colorless']
  });

  // Beheeyem's Mind Jack: 30 damage + 20 per opponent's Benched Pokémon
  // With 3 Pokémon on opponent's bench: 30 + (3 * 20) = 90 damage
  assertEqual(result.baseDamage, 30, 'Base damage should be 30');
  assertEqual(result.benchScaling, 60, 'Bench scaling should be 60 (3 opponent * 20)');
  assertEqual(result.finalDamage, 90, 'Final damage = 30 + 60 = 90');
});

// 36. benchScaling: real Nidoqueen example
runTest('executeAttack: real Nidoqueen (Lovestrike)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'nidoqueen-1',
    name: 'Nidoqueen',
    type: 'poison',
    hp: 120,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'poison', 2);
  addEnergy(game.gameState.players.player1.activePokemon, 'colorless', 1);

  addToBench(game, 'player1', { id: 'bench-1', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-2', name: 'Nidoking', type: 'poison', hp: 140 });
  addToBench(game, 'player1', { id: 'bench-3', name: 'Eevee', type: 'colorless', hp: 60 });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Lovestrike',
    damage: 30,
    benchScaling: { perPokemon: 50, player: 'self', name: 'Nidoking' },
    energyCost: ['poison', 'poison', 'colorless']
  });

  // Nidoqueen's Lovestrike: 30 damage + 50 per Benched Nidoking
  // With 2 Nidoking on bench: 30 + (2 * 50) = 130 damage
  assertEqual(result.baseDamage, 30, 'Base damage should be 30');
  assertEqual(result.benchScaling, 100, 'Bench scaling should be 100 (2 Nidoking * 50)');
  assertEqual(result.finalDamage, 130, 'Final damage = 30 + 100 = 130');
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
