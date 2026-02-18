/**
 * Test: Damage Scaling by Attached Energy (GAP-012)
 *
 * Tests the damage scaling system based on attached energy.
 *
 * GAP-012: [Importante][C2] Daño escalado por Energía adjunta (Celebi ex)
 *
 * Acceptance Criteria:
 * 1. Implementar cálculo de daño por energía
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos)
 * 4. npm run check pasa
 *
 * Damage Scaling Formats:
 * - Simple: damageScaling: number - adds this much damage per energy attached
 *   Example: damageScaling: 10 adds 10 damage per energy
 * - Object: damageScaling: { perEnergy: number, energyType?: string }
 *   Example: { perEnergy: 10, energyType: 'grass' } adds 10 per grass energy only
 *   Example: { perEnergy: 10 } adds 10 per any energy (same as simple format)
 *
 * Real-card examples:
 * - Celebi ex: damage 10 + 10 per energy attached
 * - Gallade ex: damage 10 + 10 per energy attached
 *
 * Attack execution flow with damage scaling:
 * 1. Get base damage from attack definition
 * 2. Calculate damageScaling based on attached energy
 * 3. Apply damage modifiers (bonus, reduction, etc.)
 * 4. Apply weakness
 * 5. Final damage = base + scaling + modifiers + weakness
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
// TESTS: Damage Scaling Calculation
// ---------------------------------------------------------------------------

// 1. AttackSystem has calculateDamageScaling method
runTest('AttackSystem has calculateDamageScaling method', () => {
  const game = makeGame();
  assert(game.attackSystem.calculateDamageScaling !== undefined, 'calculateDamageScaling should exist');
});

// 2. No damageScaling returns 0
runTest('calculateDamageScaling: no damageScaling = 0', () => {
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

  const scaling = attackSystem.calculateDamageScaling(attacker, undefined);
  assertEqual(scaling, 0, 'No damageScaling should return 0');
});

// 3. No energy returns 0
runTest('calculateDamageScaling: no energy = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60
  });

  const attacker = game.gameState.players.player1.activePokemon;

  const scaling = attackSystem.calculateDamageScaling(attacker, 10);
  assertEqual(scaling, 0, 'No energy should return 0');
});

// 4. Simple damageScaling: 10 per energy with 3 energy = 30
runTest('calculateDamageScaling: simple format - 3 energy = 30', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 3);

  const scaling = attackSystem.calculateDamageScaling(attacker, 10);
  assertEqual(scaling, 30, '3 energy with 10 per energy should be 30');
});

// 5. Simple damageScaling: 20 per energy with 5 energy = 100
runTest('calculateDamageScaling: simple format - 5 energy = 100', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gallade-ex-1',
    name: 'Gallade ex',
    type: 'psychic',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'psychic', 5);

  const scaling = attackSystem.calculateDamageScaling(attacker, 20);
  assertEqual(scaling, 100, '5 energy with 20 per energy should be 100');
});

// 6. Object format: perEnergy without energyType counts all energy
runTest('calculateDamageScaling: object format - counts all energy', () => {
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
  addEnergy(attacker, 'colorless', 1);
  addEnergy(attacker, 'water', 1);

  const scaling = attackSystem.calculateDamageScaling(attacker, { perEnergy: 10 });
  assertEqual(scaling, 40, '4 total energy with 10 per energy should be 40');
});

// 7. Object format: perEnergy with energyType filters by type
runTest('calculateDamageScaling: object format - filters by energyType', () => {
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
  addEnergy(attacker, 'grass', 3);
  addEnergy(attacker, 'colorless', 2);
  addEnergy(attacker, 'water', 1);

  const scaling = attackSystem.calculateDamageScaling(attacker, { perEnergy: 10, energyType: 'grass' });
  assertEqual(scaling, 30, '3 grass energy with 10 per should be 30 (ignoring others)');
});

// 8. Object format: perEnergy = 0 returns 0
runTest('calculateDamageScaling: perEnergy = 0 returns 0', () => {
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
  addEnergy(attacker, 'water', 5);

  const scaling = attackSystem.calculateDamageScaling(attacker, { perEnergy: 0 });
  assertEqual(scaling, 0, '0 perEnergy should return 0 regardless of energy count');
});

// 9. Object format: energyType with no matches = 0
runTest('calculateDamageScaling: energyType with no matches = 0', () => {
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
  addEnergy(attacker, 'electric', 3);
  addEnergy(attacker, 'colorless', 2);

  const scaling = attackSystem.calculateDamageScaling(attacker, { perEnergy: 10, energyType: 'fire' });
  assertEqual(scaling, 0, 'No fire energy should return 0');
});

// 10. Mixed energy types count correctly
runTest('calculateDamageScaling: mixed energy types', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'rayquaza-1',
    name: 'Rayquaza',
    type: 'dragon',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fire', 1);
  addEnergy(attacker, 'electric', 1);
  addEnergy(attacker, 'grass', 1);
  addEnergy(attacker, 'water', 1);

  const scaling = attackSystem.calculateDamageScaling(attacker, 15);
  assertEqual(scaling, 60, '4 energy types with 15 per energy should be 60');
});

// ---------------------------------------------------------------------------
// TESTS: executeAttack with Damage Scaling
// ---------------------------------------------------------------------------

// 11. executeAttack includes damageScaling in result
runTest('executeAttack: result includes damageScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Leaf Storm',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assert(result.damageScaling !== undefined, 'Result should have damageScaling field');
  assertEqual(result.damageScaling, 20, 'Damage scaling should be 20 (2 energy * 10)');
});

// 12. executeAttack: baseDamage is separate from damageScaling
runTest('executeAttack: baseDamage + damageScaling = correct total', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Leaf Storm',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.damageScaling, 30, 'Damage scaling should be 30 (3 energy * 10)');
  assertEqual(result.finalDamage, 40, 'Final damage should be 40 (10 + 30)');
});

// 13. executeAttack: damageScaling applies before modifiers
runTest('executeAttack: damageScaling before damage bonus', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add damage bonus ability
  abilitySystem.registerAbility('player1', 'celebi-ex-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Leaf Storm',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.damageScaling, 20, 'Damage scaling should be 20');
  assertEqual(result.bonusApplied, 20, 'Bonus should be 20');
  assertEqual(result.finalDamage, 50, 'Final damage = 10 + 20 + 20 = 50');
});

// 14. executeAttack: damageScaling with damage reduction
runTest('executeAttack: damageScaling + damage reduction', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 3);

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
    name: 'Leaf Storm',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.damageScaling, 30, 'Damage scaling should be 30');
  assertEqual(result.reductionApplied, 30, 'Reduction should be 30');
  assertEqual(result.finalDamage, 10, 'Final damage = 10 + 30 - 30 = 10');
});

// 15. executeAttack: damageScaling with weakness
runTest('executeAttack: damageScaling + weakness', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 4);

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'grass'
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Leaf Storm',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.damageScaling, 40, 'Damage scaling should be 40');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 70, 'Final damage = 10 + 40 + 20 = 70');
});

// 16. executeAttack: damageScaling with all modifiers
runTest('executeAttack: damageScaling + bonus + reduction + weakness', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'gallade-ex-1',
    name: 'Gallade ex',
    type: 'psychic',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'psychic', 3);

  setActive(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130,
    weakness: 'psychic'
  });

  // Attacker bonus
  abilitySystem.registerAbility('player1', 'gallade-ex-1', {
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
    name: 'Slash',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  // Calculation: 10 (base) + 30 (scaling) + 15 (bonus) - 20 (reduction) + 20 (weakness) = 55
  assertEqual(result.baseDamage, 10, 'Base damage should be 10');
  assertEqual(result.damageScaling, 30, 'Damage scaling should be 30');
  assertEqual(result.bonusApplied, 15, 'Bonus should be 15');
  assertEqual(result.reductionApplied, 20, 'Reduction should be 20');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 55, 'Final damage = 10 + 30 + 15 - 20 + 20 = 55');
});

// 17. executeAttack: damageScaling with energyType filter
runTest('executeAttack: damageScaling with energyType filter', () => {
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
  addEnergy(attacker, 'grass', 3);
  addEnergy(attacker, 'colorless', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Solar Beam',
    damage: 20,
    damageScaling: { perEnergy: 15, energyType: 'grass' },
    energyCost: []
  });

  assertEqual(result.damageScaling, 45, 'Damage scaling should be 45 (3 grass * 15, ignoring colorless)');
  assertEqual(result.finalDamage, 65, 'Final damage = 20 + 45 = 65');
});

// 18. executeAttack: damageScaling from different attack definitions
runTest('executeAttack: different damageScaling values', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'test-pokemon-1',
    name: 'Test Pokemon',
    type: 'colorless',
    hp: 100,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'colorless', 5);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Attack 1: 5 damage per energy
  const result1 = attackSystem.executeAttack('player1', {
    name: 'Attack 1',
    damage: 10,
    damageScaling: 5,
    energyCost: []
  });

  // Attack 2: 15 damage per energy
  const result2 = attackSystem.executeAttack('player1', {
    name: 'Attack 2',
    damage: 10,
    damageScaling: 15,
    energyCost: []
  });

  assertEqual(result1.damageScaling, 25, 'Attack 1: 5 energy * 5 = 25');
  assertEqual(result1.finalDamage, 35, 'Attack 1: 10 + 25 = 35');

  assertEqual(result2.damageScaling, 75, 'Attack 2: 5 energy * 15 = 75');
  assertEqual(result2.finalDamage, 85, 'Attack 2: 10 + 75 = 85');
});

// 19. executeAttack: damageScaling with 1 energy
runTest('executeAttack: damageScaling with 1 energy', () => {
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
  addEnergy(attacker, 'electric', 1);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Quick Attack',
    damage: 10,
    damageScaling: 20,
    energyCost: []
  });

  assertEqual(result.damageScaling, 20, 'Damage scaling should be 20 (1 energy * 20)');
  assertEqual(result.finalDamage, 30, 'Final damage = 10 + 20 = 30');
});

// 20. executeAttack: damageScaling with 0 base damage
runTest('executeAttack: damageScaling with 0 base damage', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'togekiss-1',
    name: 'Togekiss',
    type: 'fairy',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'fairy', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Fairy Wind',
    damage: 0,
    damageScaling: 15,
    energyCost: []
  });

  assertEqual(result.baseDamage, 0, 'Base damage should be 0');
  assertEqual(result.damageScaling, 60, 'Damage scaling should be 60 (4 * 15)');
  assertEqual(result.finalDamage, 60, 'Final damage = 0 + 60 = 60');
});

// ---------------------------------------------------------------------------
// TESTS: calculateDamage with Damage Scaling
// ---------------------------------------------------------------------------

// 21. calculateDamage includes damageScaling
runTest('calculateDamage: includes damageScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.calculateDamage('player1', 'player2', 10, {
    damageScaling: 10
  });

  assert(result.damageScaling !== undefined, 'Result should have damageScaling');
  assertEqual(result.damageScaling, 30, 'Damage scaling should be 30');
  assertEqual(result.finalDamage, 40, 'Final damage = 10 + 30 = 40');
});

// 22. calculateDamage without attack object
runTest('calculateDamage: no attack object = no damageScaling', () => {
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

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.calculateDamage('player1', 'player2', 30);

  assertEqual(result.damageScaling, 0, 'No attack object should have 0 damageScaling');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30 (no scaling)');
});

// 23. calculateDamage is a dry-run (no state mutation)
runTest('calculateDamage: dry-run with damageScaling', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 4);

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'grass'
  });

  const defender = game.gameState.players.player2.activePokemon;
  const hpBefore = defender.currentHp;

  const result = attackSystem.calculateDamage('player1', 'player2', 10, {
    damageScaling: 10
  });

  // Check calculation
  assertEqual(result.damageScaling, 40, 'Damage scaling should be 40');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 70, 'Final damage = 10 + 40 + 20 = 70');

  // Verify no state mutation
  assertEqual(defender.currentHp, hpBefore, 'Defender HP should not change in dry-run');
});

// ---------------------------------------------------------------------------
// TESTS: Edge Cases
// ---------------------------------------------------------------------------

// 24. damageScaling with damage prevention
runTest('executeAttack: damageScaling + damage prevention', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'charizard-ex-1',
    name: 'Charizard ex',
    type: 'fire',
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'fire', 3);

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
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0 despite scaling');
});

// 25. Large energy count scales correctly
runTest('executeAttack: large energy count', () => {
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
  addEnergy(attacker, 'fighting', 10); // Maximum energy in Pocket TCG

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Earthquake',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.damageScaling, 100, '10 energy * 10 = 100');
  assertEqual(result.finalDamage, 110, 'Final damage = 10 + 100 = 110');
});

// 26. damageScaling with energy cost validation
runTest('executeAttack: damageScaling with energy cost validation', () => {
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
  addEnergy(attacker, 'water', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 30,
    damageScaling: 10,
    energyCost: ['water', 'water', 'water']
  });

  assertEqual(result.damageScaling, 30, 'Damage scaling should be 30 (3 energy * 10)');
  assertEqual(result.finalDamage, 60, 'Final damage = 30 + 30 = 60');
  assertEqual(result.energyCostPaid, true, 'Energy cost should be paid');
});

// 27. damageScaling after removal of some energy
runTest('executeAttack: damageScaling updates after energy change', () => {
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
  addEnergy(attacker, 'grass', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Attack 1 with 4 energy
  const result1 = attackSystem.executeAttack('player1', {
    name: 'Solar Beam',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result1.damageScaling, 40, 'First attack: 4 energy * 10 = 40');

  // Remove 2 energy
  attacker.energy.splice(0, 2);

  // Attack 2 with 2 energy
  const result2 = attackSystem.executeAttack('player1', {
    name: 'Solar Beam',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result2.damageScaling, 20, 'Second attack: 2 energy * 10 = 20');
});

// 28. damageScaling with only colorless energy
runTest('executeAttack: damageScaling with colorless energy', () => {
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
  addEnergy(attacker, 'colorless', 5);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Body Slam',
    damage: 30,
    damageScaling: 5,
    energyCost: []
  });

  assertEqual(result.damageScaling, 25, '5 colorless * 5 = 25');
  assertEqual(result.finalDamage, 55, 'Final damage = 30 + 25 = 55');
});

// 29. damageScaling with energyType that has 0 matches
runTest('executeAttack: energyType with 0 matches = 0 scaling', () => {
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
  addEnergy(attacker, 'electric', 3);
  addEnergy(attacker, 'colorless', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Thunder',
    damage: 50,
    damageScaling: { perEnergy: 10, energyType: 'water' },
    energyCost: []
  });

  assertEqual(result.damageScaling, 0, 'No water energy should mean 0 scaling');
  assertEqual(result.finalDamage, 50, 'Final damage should be 50 (base only)');
});

// 30. executeAttack logs damageScaling in turn log
runTest('executeAttack: logs damageScaling in turn log', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'celebi-ex-1',
    name: 'Celebi ex',
    type: 'grass',
    hp: 120,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 3);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  attackSystem.executeAttack('player1', {
    name: 'Leaf Storm',
    damage: 10,
    damageScaling: 10,
    energyCost: []
  });

  const log = game.gameState.turnLog;
  const attackLog = log.find(entry => entry.type === 'attack');

  assert(attackLog !== undefined, 'Should have attack log');
  assertEqual(attackLog.damageScaling, 30, 'Log should show damageScaling');
});

// 31. damageScaling with negative base damage (clamped to 0)
runTest('executeAttack: negative base damage clamped to 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'test-pokemon-1',
    name: 'Test Pokemon',
    type: 'colorless',
    hp: 100,
    energy: []
  });

  addEnergy(game.gameState.players.player1.activePokemon, 'colorless', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Test Attack',
    damage: -10,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.baseDamage, -10, 'Base damage can be negative');
  assertEqual(result.damageScaling, 20, 'Damage scaling should be 20');
  assertEqual(result.finalDamage, 10, 'Final damage should be clamped to 10 (not negative)');
});

// 32. damageScaling result includes all fields
runTest('executeAttack: result includes all new fields', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'gallade-ex-1',
    name: 'Gallade ex',
    type: 'psychic',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'psychic', 2);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Slash',
    damage: 10,
    damageScaling: { perEnergy: 10, energyType: 'psychic' },
    energyCost: []
  });

  assertEqual(result.baseDamage, 10, 'Should have baseDamage');
  assertEqual(result.damageScaling, 20, 'Should have damageScaling');
  assertEqual(result.finalDamage, 30, 'Should have finalDamage');
  assertEqual(result.defenderHpAfter, 30, 'Should have defenderHpAfter');
});

// 33. damageScaling with maximum energy
runTest('executeAttack: damageScaling with maximum Pocket energy (10)', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'mewtwo-ex-1',
    name: 'Mewtwo ex',
    type: 'psychic',
    hp: 150,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  // Add maximum energy in Pocket TCG
  addEnergy(attacker, 'psychic', 10);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Psychic',
    damage: 20,
    damageScaling: 10,
    energyCost: []
  });

  assertEqual(result.damageScaling, 100, '10 energy * 10 = 100');
  assertEqual(result.finalDamage, 120, 'Final damage = 20 + 100 = 120');
  assert(result.isKO, 'Eevee should be KO\'d');
});

// 34. damageScaling: multiple attacks with different energy
runTest('executeAttack: different attacks have different scaling', () => {
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

  setActive(game, 'player2', {
    id: 'venusaur-1',
    name: 'Venusaur',
    type: 'grass',
    hp: 140
  });

  // Attack 1: Low scaling
  const result1 = attackSystem.executeAttack('player1', {
    name: 'Ember',
    damage: 20,
    damageScaling: 5,
    energyCost: []
  });

  // Attack 2: High scaling (after healing)
  game.gameState.players.player2.activePokemon.currentHp = 140;

  const result2 = attackSystem.executeAttack('player1', {
    name: 'Flamethrower',
    damage: 30,
    damageScaling: 15,
    energyCost: []
  });

  assertEqual(result1.damageScaling, 10, 'Attack 1: 2 * 5 = 10');
  assertEqual(result1.finalDamage, 30, 'Attack 1: 20 + 10 = 30');

  assertEqual(result2.damageScaling, 30, 'Attack 2: 2 * 15 = 30');
  assertEqual(result2.finalDamage, 60, 'Attack 2: 30 + 30 = 60');
});

// 35. damageScaling: energy count includes all types
runTest('calculateDamageScaling: counts all energy types', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'arceus-1',
    name: 'Arceus',
    type: 'colorless',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  // Add 1 of each type
  addEnergy(attacker, 'fire', 1);
  addEnergy(attacker, 'water', 1);
  addEnergy(attacker, 'grass', 1);
  addEnergy(attacker, 'electric', 1);
  addEnergy(attacker, 'psychic', 1);
  addEnergy(attacker, 'fighting', 1);
  addEnergy(attacker, 'colorless', 1);

  const scaling = attackSystem.calculateDamageScaling(attacker, 10);
  assertEqual(scaling, 70, '7 energy * 10 = 70');
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
