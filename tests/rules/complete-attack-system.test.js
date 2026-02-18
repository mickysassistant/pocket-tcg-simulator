/**
 * Test: Complete Attack System (GAP-011)
 *
 * Tests the complete attack system implementation including:
 * - Energy cost validation
 * - Weakness calculation (+20 damage)
 * - Integration with existing damage modifiers
 *
 * GAP-011: [Crítico][C2] Sistema completo de ataques
 *
 * Acceptance Criteria:
 * 1. Implementar sistema de ataque completo (energy costs + weakness)
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa
 * 4. npm run check pasa
 *
 * Energy Cost Validation:
 * - Attacks can have energyCost: ['type1', 'type2', ...]
 * - Colorless energy can be satisfied by any energy type
 * - Specific energy types require that exact type
 * - Throws error if energy cost cannot be paid
 *
 * Weakness Calculation:
 * - Weakness adds +20 damage when defender is weak to attacker's type
 * - Weakness can be string, array, or object format
 * - Weakness is applied after damage modifiers
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
// TESTS: Energy Cost Validation
// ---------------------------------------------------------------------------

// 1. AttackSystem is exported and has new methods
runTest('AttackSystem has canAffordEnergyCost method', () => {
  const game = makeGame();
  assert(game.attackSystem.canAffordEnergyCost !== undefined, 'canAffordEnergyCost should exist');
});

runTest('AttackSystem has calculateWeakness method', () => {
  const game = makeGame();
  assert(game.attackSystem.calculateWeakness !== undefined, 'calculateWeakness should exist');
});

// 2. No energy cost means attack is always affordable
runTest('canAffordEnergyCost: no cost = always affordable', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60
  });

  const attacker = game.gameState.players.player1.activePokemon;

  // No energy cost
  const result = attackSystem.canAffordEnergyCost(attacker, []);
  assert(result.canAfford, 'No cost should be affordable');
  assertEqual(result.reason, undefined, 'No reason for success');
});

// 3. Can afford with exact energy match
runTest('canAffordEnergyCost: exact energy match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fire', 2);

  const result = attackSystem.canAffordEnergyCost(attacker, ['fire', 'fire']);
  assert(result.canAfford, 'Should afford exact match');
});

// 4. Cannot afford when missing specific energy type
runTest('canAffordEnergyCost: missing specific energy type', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 1);
  addEnergy(attacker, 'colorless', 1);

  // Need 2 water, only have 1
  const result = attackSystem.canAffordEnergyCost(attacker, ['water', 'water']);
  assert(!result.canAfford, 'Should not afford with missing water');
  assertEqual(result.reason, 'missing_specific_energy', 'Reason should be missing_specific_energy');
  assertDeepEqual(result.missing, ['water'], 'Should report missing water');
});

// 5. Colorless energy can be satisfied by any type
runTest('canAffordEnergyCost: colorless can use any energy', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'venusaur-1',
    name: 'Venusaur',
    type: 'grass',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 2);

  // Need 2 colorless, can use grass energy
  const result = attackSystem.canAffordEnergyCost(attacker, ['colorless', 'colorless']);
  assert(result.canAfford, 'Grass should satisfy colorless requirement');
});

// 6. Cannot afford when total energy insufficient
runTest('canAffordEnergyCost: total energy insufficient for colorless', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pidgeotto-1',
    name: 'Pidgeotto',
    type: 'colorless',
    hp: 80,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'colorless', 1);

  // Need 3 colorless, only have 1
  const result = attackSystem.canAffordEnergyCost(attacker, ['colorless', 'colorless', 'colorless']);
  assert(!result.canAfford, 'Should not afford with insufficient energy');
  assertEqual(result.reason, 'insufficient_total_energy', 'Reason should be insufficient_total_energy');
});

// 7. Mixed specific and colorless costs
runTest('canAffordEnergyCost: mixed specific and colorless', () => {
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
  addEnergy(attacker, 'colorless', 1);

  // Need 1 electric + 2 colorless
  const result = attackSystem.canAffordEnergyCost(attacker, ['electric', 'colorless', 'colorless']);
  assert(result.canAfford, 'Should afford mixed cost');
});

// 8. Mixed cost: missing specific but enough total
runTest('canAffordEnergyCost: mixed cost - missing specific', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'garchomp-1',
    name: 'Garchomp',
    type: 'fighting',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fighting', 1); // Need 2, only have 1

  // Need 2 fighting + 1 colorless
  const result = attackSystem.canAffordEnergyCost(attacker, ['fighting', 'fighting', 'colorless']);
  assert(!result.canAfford, 'Should not afford with missing fighting');
  assertDeepEqual(result.missing, ['fighting'], 'Should report missing fighting');
});

// 9. No energy at all
runTest('canAffordEnergyCost: no energy on Pokémon', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const attacker = game.gameState.players.player1.activePokemon;

  const result = attackSystem.canAffordEnergyCost(attacker, ['colorless']);
  assert(!result.canAfford, 'Should not afford with no energy');
  assertEqual(result.reason, 'no_energy', 'Reason should be no_energy');
});

// 10. No energy cost object
runTest('canAffordEnergyCost: undefined cost = affordable', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130
  });

  const attacker = game.gameState.players.player1.activePokemon;

  const result = attackSystem.canAffordEnergyCost(attacker, undefined);
  assert(result.canAfford, 'Undefined cost should be affordable');
});

// ---------------------------------------------------------------------------
// TESTS: Weakness Calculation
// ---------------------------------------------------------------------------

// 11. No weakness means no extra damage
runTest('calculateWeakness: no weakness = no extra damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 0, 'No weakness should mean 0 extra damage');
});

// 12. Weakness string format matches
runTest('calculateWeakness: string weakness - match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });
  setActive(game, 'player2', { id: 'venusaur-1', name: 'Venusaur', type: 'grass', hp: 140, weakness: 'fire' });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 20, 'Fire weakness to fire should add 20');
});

// 13. Weakness string format no match
runTest('calculateWeakness: string weakness - no match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'blastoise-1', name: 'Blastoise', type: 'water', hp: 130 });
  setActive(game, 'player2', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120, weakness: 'grass' });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 0, 'Water attacking fire (weak to grass) should not trigger weakness');
});

// 14. Weakness array format matches
runTest('calculateWeakness: array weakness - match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'zapdos-1', name: 'Zapdos', type: 'electric', hp: 90 });
  setActive(game, 'player2', { id: 'gyarados-1', name: 'Gyarados', type: 'water', hp: 130, weakness: ['electric', 'grass'] });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 20, 'Electric weakness should add 20');
});

// 15. Weakness array format no match
runTest('calculateWeakness: array weakness - no match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'articuno-1', name: 'Articuno', type: 'water', hp: 100 });
  setActive(game, 'player2', { id: 'raichu-1', name: 'Raichu', type: 'electric', hp: 90, weakness: ['fighting'] });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 0, 'Water attacking electric should not trigger weakness');
});

// 16. Weakness object format matches
runTest('calculateWeakness: object weakness - match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'machamp-1', name: 'Machamp', type: 'fighting', hp: 130 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130, weakness: { type: 'fighting', multiplier: 2 } });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 20, 'Fighting weakness should add 20');
});

// 17. Weakness with no type
runTest('calculateWeakness: no attacker type = no weakness', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'unknown-1', name: 'Unknown', hp: 80 });
  setActive(game, 'player2', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60, weakness: 'fighting' });

  const attacker = game.gameState.players.player1.activePokemon;
  const defender = game.gameState.players.player2.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, defender);
  assertEqual(weakness, 0, 'No attacker type should mean no weakness');
});

// 18. Weakness with no defender
runTest('calculateWeakness: null defender = no weakness', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });

  const attacker = game.gameState.players.player1.activePokemon;

  const weakness = attackSystem.calculateWeakness(attacker, null);
  assertEqual(weakness, 0, 'Null defender should mean no weakness');
});

// ---------------------------------------------------------------------------
// TESTS: Integration - executeAttack with energy costs
// ---------------------------------------------------------------------------

// 19. executeAttack with no energy cost succeeds
runTest('executeAttack: no energy cost succeeds', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Quick Attack',
    damage: 30,
    energyCost: []
  });

  assertEqual(result.baseDamage, 30, 'Base damage should be 30');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30');
  assertEqual(result.energyCostPaid, true, 'Energy cost should be paid');
  assert(!result.isKO, 'Eevee should not be KO\'d');
});

// 20. executeAttack with affordable energy cost succeeds
runTest('executeAttack: affordable energy cost succeeds', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fire', 3);

  setActive(game, 'player2', { id: 'blastoise-1', name: 'Blastoise', type: 'water', hp: 130 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Flamethrower',
    damage: 80,
    energyCost: ['fire', 'fire', 'colorless']
  });

  assertEqual(result.baseDamage, 80, 'Base damage should be 80');
  assertEqual(result.finalDamage, 80, 'Final damage should be 80');
  assertEqual(result.energyCostPaid, true, 'Energy cost should be paid');
});

// 21. executeAttack with insufficient energy throws error
runTest('executeAttack: insufficient energy throws error', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'venusaur-1',
    name: 'Venusaur',
    type: 'grass',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 1); // Need 2, only have 1

  setActive(game, 'player2', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });

  let errorThrown = false;
  try {
    attackSystem.executeAttack('player1', {
      name: 'Solar Beam',
      damage: 90,
      energyCost: ['grass', 'grass']
    });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Cannot afford energy cost'), 'Error should mention energy cost');
  }

  assert(errorThrown, 'Should throw error for insufficient energy');
});

// 22. executeAttack logs energy cost failure
runTest('executeAttack: logs energy cost failure to turnLog', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'electric',
    hp: 60,
    energy: [] // Has no energy
  });

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  try {
    attackSystem.executeAttack('player1', {
      name: 'Thunder',
      damage: 60,
      energyCost: ['electric', 'electric']
    });
  } catch (err) {
    // Expected to fail
  }

  const log = game.gameState.turnLog;
  const failureLog = log.find(entry => entry.type === 'attack_failed');

  assert(failureLog !== undefined, 'Should have attack_failed log entry');
  assertEqual(failureLog.player, 'player1', 'Log should identify player');
  assertEqual(failureLog.attack, 'Thunder', 'Log should identify attack');
  assertEqual(failureLog.reason, 'no_energy', 'Log should show no_energy reason (pokemon has no energy)');
});

// ---------------------------------------------------------------------------
// TESTS: Integration - executeAttack with weakness
// ---------------------------------------------------------------------------

// 23. executeAttack applies weakness damage
runTest('executeAttack: applies weakness damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });
  setActive(game, 'player2', { id: 'venusaur-1', name: 'Venusaur', type: 'grass', hp: 140, weakness: 'fire' });

  const result = attackSystem.executeAttack('player1', {
    name: 'Flame Burst',
    damage: 60,
    energyCost: []
  });

  assertEqual(result.baseDamage, 60, 'Base damage should be 60');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 80, 'Final damage should be 80 (60 + 20)');
  assertEqual(result.defenderHpAfter, 60, 'Venusaur should have 60 HP left (140 - 80)');
});

// 24. executeAttack no weakness when types don't match
runTest('executeAttack: no weakness when types don\'t match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'blastoise-1', name: 'Blastoise', type: 'water', hp: 130 });
  setActive(game, 'player2', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120, weakness: 'grass' });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 70,
    energyCost: []
  });

  assertEqual(result.baseDamage, 70, 'Base damage should be 70');
  assertEqual(result.weaknessApplied, 0, 'No weakness should apply (water attacking fire with grass weakness)');
  assertEqual(result.finalDamage, 70, 'Final damage should be 70');
});

// 25. executeAttack with weakness + damage reduction
runTest('executeAttack: weakness + damage reduction', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', { id: 'zapdos-1', name: 'Zapdos', type: 'electric', hp: 90 });
  setActive(game, 'player2', {
    id: 'gyarados-1',
    name: 'Gyarados',
    type: 'water',
    hp: 130,
    weakness: 'electric'
  });

  // Gyarados has damage reduction (e.g., from an ability)
  abilitySystem.registerAbility('player2', 'gyarados-1', {
    id: 'test-reduction',
    name: 'Test Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Thunderbolt',
    damage: 60,
    energyCost: []
  });

  assertEqual(result.baseDamage, 60, 'Base damage should be 60');
  assertEqual(result.bonusApplied, 0, 'No bonus');
  assertEqual(result.reductionApplied, 30, 'Reduction should be 30');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 50, 'Final damage = 60 - 30 + 20 = 50');
  assertEqual(result.defenderHpAfter, 80, 'Gyarados HP = 130 - 50 = 80');
});

// 26. executeAttack with weakness + damage bonus
runTest('executeAttack: weakness + damage bonus', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'electric',
    hp: 110
  });

  setActive(game, 'player2', {
    id: 'pidgeot-1',
    name: 'Pidgeot',
    type: 'colorless',
    hp: 120,
    weakness: 'electric'
  });

  // Luxray has damage bonus
  abilitySystem.registerAbility('player1', 'luxray-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Crunch',
    damage: 50,
    energyCost: []
  });

  assertEqual(result.baseDamage, 50, 'Base damage should be 50');
  assertEqual(result.bonusApplied, 20, 'Bonus should be 20');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 90, 'Final damage = 50 + 20 + 20 = 90');
  assertEqual(result.defenderHpAfter, 30, 'Pidgeot HP = 120 - 90 = 30');
});

// 27. executeAttack with weakness + damage prevention
runTest('executeAttack: weakness bypassed by damage prevention', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-1',
    name: 'Charizard ex', // Name includes 'ex' for prevention detection
    type: 'fire'
  });

  setActive(game, 'player2', {
    id: 'oricorio-1',
    name: 'Oricorio',
    type: 'psychic',
    hp: 90,
    weakness: 'fire'
  });

  // Oricorio Safeguard: prevents damage from Pokémon ex
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
    damage: 80,
    energyCost: []
  });

  assertEqual(result.baseDamage, 80, 'Base damage should be 80');
  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
  assertEqual(result.weaknessApplied, 0, 'Weakness not applied when damage prevented');
});

// 28. executeAttack logs weakness in turn log
runTest('executeAttack: logs weakness in turn log', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'articuno-1', name: 'Articuno', type: 'water', hp: 100 });
  setActive(game, 'player2', { id: 'zapdos-1', name: 'Zapdos', type: 'electric', hp: 90, weakness: 'water' });

  attackSystem.executeAttack('player1', {
    name: 'Ice Beam',
    damage: 50,
    energyCost: []
  });

  const log = game.gameState.turnLog;
  const attackLog = log.find(entry => entry.type === 'attack');

  assert(attackLog !== undefined, 'Should have attack log entry');
  assertEqual(attackLog.weaknessApplied, 20, 'Log should show weakness applied');
});

// 29. calculateDamage includes weakness
runTest('calculateDamage: includes weakness in calculation', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'moltres-1', name: 'Moltres', type: 'fire', hp: 120 });
  setActive(game, 'player2', { id: 'venusaur-1', name: 'Venusaur', type: 'grass', hp: 140, weakness: 'fire' });

  const result = attackSystem.calculateDamage('player1', 'player2', 70);

  assertEqual(result.baseDamage, 70, 'Base damage should be 70');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 90, 'Final damage = 70 + 20 = 90');
});

// 30. Full integration: energy cost + weakness + modifiers
runTest('executeAttack: full integration - energy cost + weakness + modifiers', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'garchomp-1',
    name: 'Garchomp',
    type: 'fighting',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fighting', 2);
  addEnergy(attacker, 'colorless', 1);

  setActive(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130,
    weakness: 'fighting'
  });

  // Attacker has damage bonus
  abilitySystem.registerAbility('player1', 'garchomp-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 10 },
    condition: { type: 'always' }
  });

  // Defender has damage reduction
  abilitySystem.registerAbility('player2', 'snorlax-1', {
    id: 'test-reduction',
    name: 'Test Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Earthquake',
    damage: 80,
    energyCost: ['fighting', 'fighting', 'colorless']
  });

  // Calculation: 80 (base) + 10 (bonus) - 20 (reduction) + 20 (weakness) = 90
  assertEqual(result.baseDamage, 80, 'Base damage should be 80');
  assertEqual(result.bonusApplied, 10, 'Bonus should be 10');
  assertEqual(result.reductionApplied, 20, 'Reduction should be 20');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 90, 'Final damage = 80 + 10 - 20 + 20 = 90');
  assertEqual(result.energyCostPaid, true, 'Energy cost should be paid');
  assertEqual(result.defenderHpAfter, 40, 'Snorlax HP = 130 - 90 = 40');
});

// ---------------------------------------------------------------------------
// TESTS: Edge Cases
// ---------------------------------------------------------------------------

// 31. Weakness with multiple types - one matches
runTest('calculateWeakness: multiple weakness types - one matches', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'moltres-1', name: 'Moltres', type: 'fire', hp: 120 });
  setActive(game, 'player2', {
    id: 'dragonite-1',
    name: 'Dragonite',
    type: 'dragon',
    hp: 140,
    weakness: ['fire', 'ice', 'fairy']
  });

  const weakness = attackSystem.calculateWeakness(
    game.gameState.players.player1.activePokemon,
    game.gameState.players.player2.activePokemon
  );

  assertEqual(weakness, 20, 'Fire should match one of multiple weaknesses');
});

// 32. Weakness with multiple types - none match
runTest('calculateWeakness: multiple weakness types - none match', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'blastoise-1', name: 'Blastoise', type: 'water', hp: 130 });
  setActive(game, 'player2', {
    id: 'garchomp-1',
    name: 'Garchomp',
    type: 'dragon',
    hp: 140,
    weakness: ['fire', 'ice', 'fairy']
  });

  const weakness = attackSystem.calculateWeakness(
    game.gameState.players.player1.activePokemon,
    game.gameState.players.player2.activePokemon
  );

  assertEqual(weakness, 0, 'Water should not match any weaknesses');
});

// 33. Energy cost with only colorless - can use any mix
runTest('canAffordEnergyCost: only colorless - can use any mix', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'mewtwo-1',
    name: 'Mewtwo',
    type: 'psychic',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'psychic', 1);
  addEnergy(attacker, 'colorless', 1);

  // Need 2 colorless, have 1 psychic + 1 colorless = 2 total
  const result = attackSystem.canAffordEnergyCost(attacker, ['colorless', 'colorless']);
  assert(result.canAfford, 'Any energy can satisfy colorless requirement');
});

// 34. Complex energy cost validation
runTest('canAffordEnergyCost: complex mixed cost', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'tyranitar-1',
    name: 'Tyranitar',
    type: 'fighting',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fighting', 2);
  addEnergy(attacker, 'darkness', 1);
  addEnergy(attacker, 'colorless', 2);

  // Need 2 fighting + 1 darkness + 2 colorless = 5 total, have exactly that
  const result = attackSystem.canAffordEnergyCost(attacker, ['fighting', 'fighting', 'darkness', 'colorless', 'colorless']);
  assert(result.canAfford, 'Complex cost should be affordable');
});

// 35. Weakness doesn't cause negative final damage
runTest('executeAttack: weakness never causes negative damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  setActive(game, 'player2', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60,
    weakness: 'electric',
    currentHp: 1 // Only 1 HP left
  });

  // Small attack, but with weakness should still be 0 minimum
  const result = attackSystem.executeAttack('player1', {
    name: 'Nuzzle',
    damage: 0,
    energyCost: []
  });

  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 20, 'Final damage should be 20 (0 + 20)');
  assert(result.isKO, 'Eevee should be KO\'d');
});

// 36. executeAttack result includes weakness field
runTest('executeAttack: result includes weakness field', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });
  setActive(game, 'player2', { id: 'venusaur-1', name: 'Venusaur', type: 'grass', hp: 140, weakness: 'fire' });

  const result = attackSystem.executeAttack('player1', {
    name: 'Flamethrower',
    damage: 60,
    energyCost: []
  });

  assert(result.weaknessApplied !== undefined, 'Result should have weaknessApplied field');
  assertEqual(typeof result.weaknessApplied, 'number', 'weaknessApplied should be a number');
});

// 37. executeAttack result includes energyCostPaid field
runTest('executeAttack: result includes energyCostPaid field', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 2);

  setActive(game, 'player2', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 70,
    energyCost: ['water', 'water']
  });

  assert(result.energyCostPaid !== undefined, 'Result should have energyCostPaid field');
  assertEqual(result.energyCostPaid, true, 'energyCostPaid should be true when paid');
});

// 38. Multiple weaknesses in array - first matches
runTest('calculateWeakness: array weakness - first element matches', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'mewtwo-1', name: 'Mewtwo', type: 'psychic', hp: 120 });
  setActive(game, 'player2', {
    id: 'gallade-1',
    name: 'Gallade',
    type: 'psychic',
    hp: 150,
    weakness: ['psychic', 'ghost']
  });

  const weakness = attackSystem.calculateWeakness(
    game.gameState.players.player1.activePokemon,
    game.gameState.players.player2.activePokemon
  );

  assertEqual(weakness, 20, 'Psychic should match first weakness type');
});

// 39. executeAttack with KO from weakness
runTest('executeAttack: KO caused by weakness', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'rayquaza-1', name: 'Rayquaza', type: 'dragon', hp: 130 });
  setActive(game, 'player2', {
    id: 'togekiss-1',
    name: 'Togekiss',
    type: 'fairy',
    hp: 140,
    weakness: 'dragon',
    currentHp: 30 // 30 HP left, attack does 100, weakness +20 = 120 damage
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Dragon Ascent',
    damage: 100,
    energyCost: []
  });

  assertEqual(result.baseDamage, 100, 'Base damage should be 100');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 120, 'Final damage = 100 + 20 = 120');
  assert(result.isKO, 'Togekiss should be KO\'d by weakness-enhanced damage');
  assertEqual(result.defenderHpAfter, 0, 'Togekiss HP should be 0');
});

// 40. Energy cost validation with empty pokemon
runTest('canAffordEnergyCost: empty pokemon object', () => {
  const game = makeGame();
  const { attackSystem } = game;

  const result = attackSystem.canAffordEnergyCost(null, ['fire']);
  assert(!result.canAfford, 'Null pokemon should not be affordable');
  assertEqual(result.reason, 'no_energy', 'Reason should be no_energy');
});

// 41. calculateDamage dry-run with weakness
runTest('calculateDamage: dry-run includes weakness', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'entei-1', name: 'Entei', type: 'fire', hp: 120 });
  setActive(game, 'player2', { id: 'virizion-1', name: 'Virizion', type: 'grass', hp: 120, weakness: 'fire' });

  const result = attackSystem.calculateDamage('player1', 'player2', 90);

  assertEqual(result.baseDamage, 90, 'Base damage should be 90');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 110, 'Final damage = 90 + 20 = 110');

  // Verify no state mutation
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 120, 'Defender HP should not change in dry-run');
});

// 42. executeAttack with no energyCost property
runTest('executeAttack: undefined energyCost = no validation', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });
  setActive(game, 'player2', { id: 'snorlax-1', name: 'Snorlax', type: 'colorless', hp: 130 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Tackle',
    damage: 20
    // No energyCost property
  });

  assertEqual(result.baseDamage, 20, 'Base damage should be 20');
  assertEqual(result.energyCostPaid, true, 'Energy cost should be considered paid');
  assertEqual(result.finalDamage, 20, 'Final damage should be 20');
});

// 43. executeAttack with empty energyCost array
runTest('executeAttack: empty energyCost array = no validation', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'pidgey-1', name: 'Pidgey', type: 'colorless', hp: 50 });
  setActive(game, 'player2', { id: 'rattata-1', name: 'Rattata', type: 'colorless', hp: 50 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Gust',
    damage: 10,
    energyCost: []
  });

  assertEqual(result.finalDamage, 10, 'Final damage should be 10');
  assertEqual(result.energyCostPaid, true, 'Empty energy cost should be considered paid');
});

// 44. executeAttack logs all new fields
runTest('executeAttack: log includes weakness and energyCostPaid', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'flareon-1', name: 'Flareon', type: 'fire', hp: 110 });
  setActive(game, 'player2', { id: 'leafeon-1', name: 'Leafeon', type: 'grass', hp: 110, weakness: 'fire' });

  attackSystem.executeAttack('player1', {
    name: 'Flamethrower',
    damage: 70,
    energyCost: []
  });

  const log = game.gameState.turnLog;
  const attackLog = log.find(entry => entry.type === 'attack');

  assert(attackLog !== undefined, 'Should have attack log');
  assertEqual(attackLog.weaknessApplied, 20, 'Log should show weakness');
  assertEqual(attackLog.energyCostPaid, true, 'Log should show energy cost paid');
});

// 45. executeAttack handles weakness array format correctly
runTest('executeAttack: weakness array format works', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'kyogre-1', name: 'Kyogre', type: 'water', hp: 130 });
  setActive(game, 'player2', {
    id: 'groudon-1',
    name: 'Groudon',
    type: 'ground',
    hp: 140,
    weakness: ['water']
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Water Spout',
    damage: 80,
    energyCost: []
  });

  assertEqual(result.weaknessApplied, 20, 'Array weakness format should work');
  assertEqual(result.finalDamage, 100, 'Final damage = 80 + 20 = 100');
});

// 46. executeAttack handles weakness object format correctly
runTest('executeAttack: weakness object format works', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'zekrom-1', name: 'Zekrom', type: 'electric', hp: 130 });
  setActive(game, 'player2', {
    id: 'reshiram-1',
    name: 'Reshiram',
    type: 'fire',
    hp: 140,
    weakness: { type: 'electric', multiplier: 2 }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Bolt Strike',
    damage: 90,
    energyCost: []
  });

  assertEqual(result.weaknessApplied, 20, 'Object weakness format should work');
  assertEqual(result.finalDamage, 110, 'Final damage = 90 + 20 = 110');
});

// 47. Energy cost with all same type
runTest('canAffordEnergyCost: all same type energy', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'blaziken-1',
    name: 'Blaziken',
    type: 'fire',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fire', 3);

  const result = attackSystem.canAffordEnergyCost(attacker, ['fire', 'fire', 'fire']);
  assert(result.canAfford, 'Should afford all same type');
});

// 48. Complex scenario: all modifiers + weakness + energy cost
runTest('executeAttack: complex scenario with all features', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'mewtwo-ex-1',
    name: 'Mewtwo ex', // Name includes 'ex' for prevention detection
    type: 'psychic',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'psychic', 2);
  addEnergy(attacker, 'colorless', 1);

  setActive(game, 'player2', {
    id: 'mew-ex-1',
    name: 'Mew ex', // Name includes 'ex' for prevention detection
    type: 'psychic',
    hp: 120,
    weakness: 'psychic'
  });

  // Attacker has damage bonus
  abilitySystem.registerAbility('player1', 'mewtwo-ex-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'always' }
  });

  // Defender has damage reduction
  abilitySystem.registerAbility('player2', 'mew-ex-1', {
    id: 'test-reduction',
    name: 'Test Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Psychic',
    damage: 90,
    energyCost: ['psychic', 'psychic', 'colorless']
  });

  // Calculation: 90 (base) + 30 (bonus) - 20 (reduction) + 20 (weakness) = 120
  assertEqual(result.baseDamage, 90, 'Base damage should be 90');
  assertEqual(result.bonusApplied, 30, 'Bonus should be 30');
  assertEqual(result.reductionApplied, 20, 'Reduction should be 20');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 120, 'Final damage = 90 + 30 - 20 + 20 = 120');
  assertEqual(result.energyCostPaid, true, 'Energy cost should be paid');
  assert(result.isKO, 'Mew ex should be KO\'d');
});

// 49. Weakness doesn't affect damage prevention
runTest('executeAttack: weakness not applied when damage prevented', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-ex-1',
    name: 'Charizard ex', // Name includes 'ex' for prevention detection
    type: 'fire'
  });

  setActive(game, 'player2', {
    id: 'claydol-1',
    name: 'Claydol',
    type: 'psychic',
    hp: 90,
    weakness: 'fire'
  });

  // Damage prevention ability
  abilitySystem.registerAbility('player2', 'claydol-1', {
    id: 'test-prevention',
    name: 'Test Prevention',
    type: 'passive',
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: { type: 'is_active' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Flamethrower',
    damage: 100,
    energyCost: []
  });

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.weaknessApplied, 0, 'Weakness should not be applied when damage prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
});

// 50. calculateDamage with all modifiers
runTest('calculateDamage: dry-run with bonus, reduction, and weakness', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', { id: 'gengar-1', name: 'Gengar', type: 'ghost', hp: 130 });
  setActive(game, 'player2', {
    id: 'gardevoir-1',
    name: 'Gardevoir',
    type: 'psychic',
    hp: 130,
    weakness: 'ghost'
  });

  // Attacker bonus
  abilitySystem.registerAbility('player1', 'gengar-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 15 },
    condition: { type: 'always' }
  });

  // Defender reduction
  abilitySystem.registerAbility('player2', 'gardevoir-1', {
    id: 'test-reduction',
    name: 'Test Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 10 },
    condition: { type: 'always' }
  });

  const result = attackSystem.calculateDamage('player1', 'player2', 60);

  assertEqual(result.baseDamage, 60, 'Base damage should be 60');
  assertEqual(result.bonusApplied, 15, 'Bonus should be 15');
  assertEqual(result.reductionApplied, 10, 'Reduction should be 10');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 85, 'Final damage = 60 + 15 - 10 + 20 = 85');
});

// 51. Energy cost validation with colorless only requirement
runTest('canAffordEnergyCost: colorless only requirement satisfied by specific energy', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fighting', 2);
  addEnergy(attacker, 'psychic', 1);

  // Need 3 colorless, have 3 total energy
  const result = attackSystem.canAffordEnergyCost(attacker, ['colorless', 'colorless', 'colorless']);
  assert(result.canAfford, 'Specific energy can satisfy colorless requirement');
});

// 52. executeAttack integrates with pre-KO survival and weakness
runTest('executeAttack: weakness + pre-KO survival integration', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', { id: 'machamp-1', name: 'Machamp', type: 'fighting', hp: 130 });
  setActive(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130,
    weakness: 'fighting',
    currentHp: 50 // Will be KO'd by 100 + 20 weakness = 120 damage
  });

  // Register pre-KO survival ability
  abilitySystem.registerAbility('player2', 'snorlax-1', {
    id: 'guts',
    name: 'Guts',
    type: 'passive',
    effect: { type: 'pre_ko_survival' },
    condition: { type: 'always' }
  });

  // Use deterministic coin flip (heads = survive)
  const result = attackSystem.executeAttack('player1', {
    name: 'Dynamic Punch',
    damage: 100,
    energyCost: [],
    coinFlip: () => true // Heads
  });

  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 120, 'Final damage = 100 + 20 = 120');
  assertEqual(result.preKoSurvivalResult.survived, true, 'Should survive with Guts');
  assertEqual(result.defenderHpAfter, 1, 'Should have 1 HP after survival');
  assert(!result.isKO, 'Should not be KO\'d after survival');
});

// 53. executeAttack integrates with KO triggers and weakness
runTest('executeAttack: weakness + KO trigger integration', () => {
  const game = makeGame();
  const { attackSystem, koTriggerSystem } = game;

  setActive(game, 'player1', { id: 'tyranitar-1', name: 'Tyranitar', type: 'fighting', hp: 150 });
  setActive(game, 'player2', {
    id: 'hydreigon-1',
    name: 'Hydreigon',
    type: 'dark',
    hp: 150,
    weakness: 'fighting',
    currentHp: 80
  });

  // Register a KO trigger (damage_to_attacker effect type)
  koTriggerSystem.registerAbility('player2', 'hydreigon-1', {
    id: 'test-ko-trigger',
    name: 'Test KO Trigger',
    effect: { type: 'damage_to_attacker', damage: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Crunch',
    damage: 80,
    energyCost: []
  });

  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 100, 'Final damage = 80 + 20 = 100');
  assert(result.isKO, 'Hydreigon should be KO\'d');
  assertEqual(result.koTriggerResults.length, 1, 'Should have 1 KO trigger result');
});

// 54. getDamageReduction still works after changes
runTest('getDamageReduction: works with new changes', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', { id: 'pikachu-1', name: 'Pikachu', type: 'electric', hp: 60 });
  setActive(game, 'player2', {
    id: 'magnezone-1',
    name: 'Magnezone',
    type: 'electric',
    hp: 120
  });

  abilitySystem.registerAbility('player2', 'magnezone-1', {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  const reduction = attackSystem.getDamageReduction('player2');
  assertEqual(reduction, 30, 'Should still get damage reduction');
});

// 55. AttackSystem constructor accepts koTriggerSystem
runTest('AttackSystem: constructor accepts koTriggerSystem', () => {
  const { GameState, AttackSystem, KoTriggerSystem, AbilitySystem } = require('../../src/index');

  const gameState = new GameState();
  const abilitySystem = new AbilitySystem(gameState);
  const koTriggerSystem = new KoTriggerSystem(gameState);

  const attackSystem = new AttackSystem(gameState, abilitySystem, koTriggerSystem);

  assert(attackSystem !== undefined, 'AttackSystem should be created');
  assertEqual(attackSystem.koTriggerSystem, koTriggerSystem, 'koTriggerSystem should be set');
});

// 56. Weakness calculation is case-sensitive
runTest('calculateWeakness: type matching is case-sensitive', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'charizard-1', name: 'Charizard', type: 'fire', hp: 120 });
  setActive(game, 'player2', { id: 'venusaur-1', name: 'Venusaur', type: 'grass', hp: 140, weakness: 'Fire' }); // Capital F

  const weakness = attackSystem.calculateWeakness(
    game.gameState.players.player1.activePokemon,
    game.gameState.players.player2.activePokemon
  );

  assertEqual(weakness, 0, 'Case should matter in weakness matching');
});

// 57. Energy cost validation is case-sensitive for types
runTest('canAffordEnergyCost: energy type is case-sensitive', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 1);
  addEnergy(attacker, 'Water', 1); // Capital W

  // Require 2 'water' (lowercase)
  const result = attackSystem.canAffordEnergyCost(attacker, ['water', 'water']);
  assert(!result.canAfford, 'Should not afford with case mismatch');
  assertEqual(result.reason, 'missing_specific_energy', 'Should report missing specific energy');
});

// 58. executeAttack with zero base damage and weakness
runTest('executeAttack: zero base damage + weakness = only weakness damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'zapdos-1', name: 'Zapdos', type: 'electric', hp: 90 });
  setActive(game, 'player2', { id: 'gyarados-1', name: 'Gyarados', type: 'water', hp: 130, weakness: 'electric' });

  const result = attackSystem.executeAttack('player1', {
    name: 'Thunder Shock',
    damage: 0,
    energyCost: []
  });

  assertEqual(result.baseDamage, 0, 'Base damage should be 0');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 20, 'Final damage = 0 + 20 = 20');
});

// 59. executeAttack with very high base damage and weakness
runTest('executeAttack: high damage + weakness = capped at defender HP', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'rayquaza-1', name: 'Rayquaza', type: 'dragon', hp: 130 });
  setActive(game, 'player2', {
    id: 'togekiss-1',
    name: 'Togekiss',
    type: 'fairy',
    hp: 140,
    weakness: 'dragon',
    currentHp: 100 // Low HP
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Dragon Ascent',
    damage: 200, // Very high damage
    energyCost: []
  });

  assertEqual(result.baseDamage, 200, 'Base damage should be 200');
  assertEqual(result.weaknessApplied, 20, 'Weakness should add 20');
  assertEqual(result.finalDamage, 220, 'Final damage = 200 + 20 = 220');
  assert(result.isKO, 'Should be KO\'d');
  assertEqual(result.defenderHpAfter, 0, 'HP should be 0 (capped)');
});

// 60. calculateDamage returns all expected fields
runTest('calculateDamage: returns all expected fields', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'lucario-1', name: 'Lucario', type: 'fighting', hp: 110 });
  setActive(game, 'player2', {
    id: 'gengar-1',
    name: 'Gengar',
    type: 'ghost',
    hp: 130,
    weakness: 'fighting'
  });

  const result = attackSystem.calculateDamage('player1', 'player2', 70);

  assert(result.baseDamage !== undefined, 'Should have baseDamage');
  assert(result.bonusApplied !== undefined, 'Should have bonusApplied');
  assert(result.reductionApplied !== undefined, 'Should have reductionApplied');
  assert(result.weaknessApplied !== undefined, 'Should have weaknessApplied');
  assert(result.finalDamage !== undefined, 'Should have finalDamage');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n========================================`);
console.log(`Tests: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
