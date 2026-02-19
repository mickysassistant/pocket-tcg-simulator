/**
 * Test: Bonus por "energía extra" adjunta (GAP-019)
 *
 * Tests the extra energy bonus system based on energy beyond the attack cost.
 *
 * GAP-019: [Importante][C2] Bonus por "energía extra" adjunta (Blastoise)
 *
 * Acceptance Criteria:
 * 1. Implementar validación de coste + extra
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos)
 * 4. npm run check pasa
 *
 * Extra Energy Bonus Formats:
 * - perExtraEnergy: number - damage to add per extra energy
 *   Example: { energyType: 'water', perExtraEnergy: 30 } adds 30 per extra [W] Energy
 * - threshold + bonusAmount: number - fixed bonus if extra energy >= threshold
 *   Example: { energyType: 'water', threshold: 2, bonusAmount: 50 } adds 50 if >=2 extra [W] Energy
 * - energyType: string - only count energy of this type (optional)
 *
 * "Extra energy" = total energy attached - energy required by attack cost
 * Example: Attack costs 3 [W] Energy, Pokémon has 5 [W] Energy attached → 2 extra [W] Energy
 *
 * Real-card examples:
 * - Blastoise (Hydro Pump): "This attack does 30 more damage for each extra [W] Energy attached."
 * - Lapras (Hydro Pump): "If this Pokémon has at least 2 extra [W] Energy attached, this attack does 50 more damage."
 * - Dhelmise (Energy Whip): "This attack does 20 more damage for each extra [G] Energy attached."
 * - Electivire (Exciting Voltage): "If this Pokémon has at least 3 extra [L] Energy attached, this attack does 90 more damage."
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
// TESTS: calculateExtraEnergyBonus Method
// ---------------------------------------------------------------------------

// 1. AttackSystem has calculateExtraEnergyBonus method
runTest('AttackSystem has calculateExtraEnergyBonus method', () => {
  const game = makeGame();
  assert(game.attackSystem.calculateExtraEnergyBonus !== undefined, 'calculateExtraEnergyBonus should exist');
});

// 2. No extraEnergyBonus returns 0
runTest('calculateExtraEnergyBonus: no config = 0', () => {
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

  const bonus = attackSystem.calculateExtraEnergyBonus(attacker, ['water', 'water', 'water'], undefined);
  assertEqual(bonus, 0, 'No config should return 0');
});

// 3. No energy returns 0
runTest('calculateExtraEnergyBonus: no energy = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130
  });

  const attacker = game.gameState.players.player1.activePokemon;

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 0, 'No energy should return 0');
});

// 4. Energy equals cost = 0 extra energy (no bonus)
runTest('calculateExtraEnergyBonus: energy = cost = 0 bonus', () => {
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
  addEnergy(attacker, 'water', 3); // Exactly matches cost

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 0, '3 energy with cost 3 = 0 extra = 0 bonus');
});

// 5. Simple per-extra energy: 1 extra [W] = 30 bonus
runTest('calculateExtraEnergyBonus: 1 extra water = 30', () => {
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
  addEnergy(attacker, 'water', 4); // Cost is 3, so 1 extra

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 30, '1 extra water * 30 = 30');
});

// 6. Simple per-extra energy: 2 extra [W] = 60 bonus
runTest('calculateExtraEnergyBonus: 2 extra water = 60', () => {
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
  addEnergy(attacker, 'water', 5); // Cost is 3, so 2 extra

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 60, '2 extra water * 30 = 60');
});

// 7. Simple per-extra energy: 3 extra [G] = 60 bonus
runTest('calculateExtraEnergyBonus: 3 extra grass = 60', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'dhelmise-1',
    name: 'Dhelmise',
    type: 'grass',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 4); // Cost is 1, so 3 extra

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['grass'],
    { energyType: 'grass', perExtraEnergy: 20 }
  );
  assertEqual(bonus, 60, '3 extra grass * 20 = 60');
});

// 8. Threshold mode: meets threshold = bonusAmount
runTest('calculateExtraEnergyBonus: threshold met = bonusAmount', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 5); // Cost is 3, so 2 extra (meets threshold)

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', threshold: 2, bonusAmount: 50 }
  );
  assertEqual(bonus, 50, '2 extra water >= threshold 2 = bonus 50');
});

// 9. Threshold mode: below threshold = 0 bonus
runTest('calculateExtraEnergyBonus: below threshold = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4); // Cost is 3, so 1 extra (below threshold)

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', threshold: 2, bonusAmount: 50 }
  );
  assertEqual(bonus, 0, '1 extra water < threshold 2 = 0 bonus');
});

// 10. Threshold mode: 3 extra meets threshold 3 = bonusAmount
runTest('calculateExtraEnergyBonus: 3 extra meets threshold 3', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'electivire-1',
    name: 'Electivire',
    type: 'electric',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 4); // Cost is 1, so 3 extra (meets threshold)

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['electric'],
    { energyType: 'electric', threshold: 3, bonusAmount: 90 }
  );
  assertEqual(bonus, 90, '3 extra electric >= threshold 3 = bonus 90');
});

// 11. Mixed energy types with energyType filter
runTest('calculateExtraEnergyBonus: mixed types with filter', () => {
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
  addEnergy(attacker, 'water', 4);
  addEnergy(attacker, 'colorless', 2);

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 30, 'Only water energy counted: 1 extra water * 30 = 30');
});

// 12. No energyType filter = counts all energy
runTest('calculateExtraEnergyBonus: no filter counts all', () => {
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
  addEnergy(attacker, 'fire', 2);
  addEnergy(attacker, 'water', 1);
  addEnergy(attacker, 'grass', 1);
  addEnergy(attacker, 'colorless', 1);

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['colorless', 'colorless'], // Cost 2
    { perExtraEnergy: 10 } // No energyType filter
  );
  assertEqual(bonus, 30, '5 total - 2 cost = 3 extra * 10 = 30');
});

// 13. Colorless energy in cost with specific energyType filter
runTest('calculateExtraEnergyBonus: colorless cost + type filter', () => {
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
  addEnergy(attacker, 'water', 4);
  addEnergy(attacker, 'colorless', 1);

  // Cost: 3 [W][W][C] - specific water + colorless
  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'colorless'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  // Cost: [W,W,C] - requires 2 specific water energy (colorless can be satisfied by any energy)
  // Available: 4 water energy
  // Extra water: 4 - 2 = 2
  // Bonus: 2 * 30 = 60
  assertEqual(bonus, 60, '4 water available - 2 water required = 2 extra water * 30 = 60');
});

// 14. Zero perExtraEnergy returns 0
runTest('calculateExtraEnergyBonus: perExtraEnergy = 0 = 0', () => {
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

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 0 }
  );
  assertEqual(bonus, 0, '0 perExtraEnergy = 0 regardless of extra count');
});

// 15. Zero bonusAmount returns 0
runTest('calculateExtraEnergyBonus: bonusAmount = 0 = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 5);

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', threshold: 2, bonusAmount: 0 }
  );
  assertEqual(bonus, 0, '0 bonusAmount = 0 even if threshold met');
});

// 16. Default threshold = 1
runTest('calculateExtraEnergyBonus: default threshold = 1', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4); // 1 extra

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', bonusAmount: 50 } // No threshold specified
  );
  assertEqual(bonus, 50, '1 extra >= default threshold 1 = bonus 50');
});

// 17. Exactly at threshold = bonus
runTest('calculateExtraEnergyBonus: exactly at threshold', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'electivire-1',
    name: 'Electivire',
    type: 'electric',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 4); // Cost 1, so 3 extra exactly

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['electric'],
    { energyType: 'electric', threshold: 3, bonusAmount: 90 }
  );
  assertEqual(bonus, 90, '3 extra = threshold 3 = bonus 90');
});

// 18. Just above threshold = bonus
runTest('calculateExtraEnergyBonus: above threshold = bonus', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 6); // Cost 3, so 3 extra (above threshold 2)

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', threshold: 2, bonusAmount: 50 }
  );
  assertEqual(bonus, 50, '3 extra > threshold 2 = bonus 50 (fixed bonus)');
});

// 19. Energy type mismatch = 0 extra counted
runTest('calculateExtraEnergyBonus: wrong energy type = 0', () => {
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
  addEnergy(attacker, 'fire', 2);
  addEnergy(attacker, 'grass', 2);

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 0, 'No water energy = 0 extra water = 0 bonus');
});

// 20. High extra energy count scales correctly
runTest('calculateExtraEnergyBonus: high extra count', () => {
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
  addEnergy(attacker, 'water', 10); // Cost 3, so 7 extra

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['water', 'water', 'water'],
    { energyType: 'water', perExtraEnergy: 30 }
  );
  assertEqual(bonus, 210, '7 extra water * 30 = 210');
});

// 21. No energy cost = all energy is extra
runTest('calculateExtraEnergyBonus: no cost = all energy is extra', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'eevee-1',
    name: 'Eevee',
    type: 'colorless',
    hp: 60,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'colorless', 3);

  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    [], // No energy cost
    { perExtraEnergy: 10 }
  );
  assertEqual(bonus, 30, 'No cost = 3 extra * 10 = 30');
});

// 22. Both perExtraEnergy and bonusAmount specified = perExtraEnergy wins
runTest('calculateExtraEnergyBonus: both modes = perExtraEnergy wins', () => {
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

  // Both perExtraEnergy and bonusAmount specified
  const bonus = attackSystem.calculateExtraEnergyBonus(
    attacker,
    ['colorless', 'colorless'],
    { perExtraEnergy: 10, threshold: 1, bonusAmount: 50 }
  );
  // perExtraEnergy should take precedence
  assertEqual(bonus, 30, 'perExtraEnergy (10 * 3 = 30) should win over bonusAmount');
});

// ---------------------------------------------------------------------------
// TESTS: executeAttack with Extra Energy Bonus
// ---------------------------------------------------------------------------

// 23. executeAttack includes extraEnergyBonus in result
runTest('executeAttack: result includes extraEnergyBonus', () => {
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
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  assert(result.extraEnergyBonus !== undefined, 'Result should have extraEnergyBonus field');
  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
});

// 24. executeAttack: base + extraEnergyBonus = correct total
runTest('executeAttack: base + extraEnergyBonus = total', () => {
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

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  assertEqual(result.baseDamage, 50, 'Base damage should be 50');
  assertEqual(result.extraEnergyBonus, 60, 'Extra energy bonus should be 60 (2 extra * 30)');
  assertEqual(result.finalDamage, 110, 'Final damage should be 110 (50 + 60)');
});

// 25. executeAttack: threshold mode bonus
runTest('executeAttack: threshold mode bonus', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 5);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 60,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', threshold: 2, bonusAmount: 50 }
  });

  assertEqual(result.extraEnergyBonus, 50, 'Extra energy bonus should be 50 (threshold met)');
  assertEqual(result.finalDamage, 110, 'Final damage should be 110 (60 + 50)');
});

// 26. executeAttack: threshold mode below threshold = 0
runTest('executeAttack: threshold mode below threshold = 0', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'lapras-1',
    name: 'Lapras',
    type: 'water',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4); // Only 1 extra, below threshold 2

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 60,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', threshold: 2, bonusAmount: 50 }
  });

  assertEqual(result.extraEnergyBonus, 0, 'Extra energy bonus should be 0 (below threshold)');
  assertEqual(result.finalDamage, 60, 'Final damage should be 60 (base only)');
});

// 27. executeAttack: extraEnergyBonus + damage bonus ability
runTest('executeAttack: extraEnergyBonus + damage bonus ability', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  // Add damage bonus ability
  abilitySystem.registerAbility('player1', 'blastoise-1', {
    id: 'test-bonus',
    name: 'Test Bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  assertEqual(result.baseDamage, 50, 'Base damage should be 50');
  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
  assertEqual(result.bonusApplied, 20, 'Ability bonus should be 20');
  assertEqual(result.finalDamage, 100, 'Final damage = 50 + 30 + 20 = 100');
});

// 28. executeAttack: extraEnergyBonus + damage reduction
runTest('executeAttack: extraEnergyBonus + damage reduction', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 5);

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
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  assertEqual(result.extraEnergyBonus, 60, 'Extra energy bonus should be 60');
  assertEqual(result.reductionApplied, 30, 'Reduction should be 30');
  assertEqual(result.finalDamage, 80, 'Final damage = 50 + 60 - 30 = 80');
});

// 29. executeAttack: extraEnergyBonus + weakness
runTest('executeAttack: extraEnergyBonus + weakness', () => {
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
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'water'
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 100, 'Final damage = 50 + 30 + 20 = 100');
});

// 30. executeAttack: extraEnergyBonus + all modifiers
runTest('executeAttack: extraEnergyBonus + all modifiers', () => {
  const game = makeGame();
  const { attackSystem, abilitySystem } = game;

  setActive(game, 'player1', {
    id: 'blastoise-1',
    name: 'Blastoise',
    type: 'water',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', {
    id: 'snorlax-1',
    name: 'Snorlax',
    type: 'colorless',
    hp: 130
  });

  // Attacker bonus
  abilitySystem.registerAbility('player1', 'blastoise-1', {
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
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  // Calculation: 50 (base) + 30 (extra) + 15 (bonus) - 20 (reduction) = 75
  assertEqual(result.baseDamage, 50, 'Base damage should be 50');
  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
  assertEqual(result.bonusApplied, 15, 'Bonus should be 15');
  assertEqual(result.reductionApplied, 20, 'Reduction should be 20');
  assertEqual(result.finalDamage, 75, 'Final damage = 50 + 30 + 15 - 20 = 75');
});

// 31. executeAttack: extraEnergyBonus from different energy types
runTest('executeAttack: extraEnergyBonus with grass type', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'dhelmise-1',
    name: 'Dhelmise',
    type: 'grass',
    hp: 130,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'grass', 5);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Energy Whip',
    damage: 40,
    energyCost: ['grass'],
    extraEnergyBonus: { energyType: 'grass', perExtraEnergy: 20 }
  });

  assertEqual(result.extraEnergyBonus, 80, 'Extra energy bonus should be 80 (4 extra * 20)');
  assertEqual(result.finalDamage, 120, 'Final damage = 40 + 80 = 120');
});

// 32. executeAttack: extraEnergyBonus with electric type
runTest('executeAttack: extraEnergyBonus with electric type', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', {
    id: 'electivire-1',
    name: 'Electivire',
    type: 'electric',
    hp: 140,
    energy: []
  });

  const attacker = game.gameState.players.player1.activePokemon;
  addEnergy(attacker, 'electric', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Exciting Voltage',
    damage: 30,
    energyCost: ['electric'],
    extraEnergyBonus: { energyType: 'electric', threshold: 3, bonusAmount: 90 }
  });

  assertEqual(result.extraEnergyBonus, 90, 'Extra energy bonus should be 90 (threshold 3 met)');
  assertEqual(result.finalDamage, 120, 'Final damage = 30 + 90 = 120');
});

// 33. executeAttack: extraEnergyBonus with 0 base damage
runTest('executeAttack: extraEnergyBonus with 0 base damage', () => {
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
  addEnergy(attacker, 'colorless', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Test Attack',
    damage: 0,
    energyCost: ['colorless', 'colorless'],
    extraEnergyBonus: { perExtraEnergy: 15 }
  });

  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
  assertEqual(result.finalDamage, 30, 'Final damage = 0 + 30 = 30');
});

// 34. executeAttack: extraEnergyBonus with halveHp = ignored
runTest('executeAttack: extraEnergyBonus ignored with halveHp', () => {
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

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60, currentHp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Test Attack',
    damage: 0,
    halveHp: true,
    energyCost: ['colorless', 'colorless'],
    extraEnergyBonus: { perExtraEnergy: 15 }
  });

  // When halveHp is true, extraEnergyBonus should be 0 (skipped)
  assertEqual(result.extraEnergyBonus, 0, 'Extra energy bonus should be 0 with halveHp');
  assertEqual(result.halveHpApplied, true, 'halveHp should be applied');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30 (60 / 2)');
});

// 35. executeAttack logs extraEnergyBonus in turn log
runTest('executeAttack: logs extraEnergyBonus in turn log', () => {
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
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  attackSystem.executeAttack('player1', {
    name: 'Hydro Pump',
    damage: 50,
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  const log = game.gameState.turnLog;
  const attackLog = log.find(entry => entry.type === 'attack');

  assert(attackLog !== undefined, 'Should have attack log');
  assertEqual(attackLog.extraEnergyBonus, 30, 'Log should show extraEnergyBonus');
});

// 36. executeAttack: energy cost validated before bonus calculation
runTest('executeAttack: validates energy cost before bonus', () => {
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
  addEnergy(attacker, 'water', 2); // Not enough for cost

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  let errorCaught = false;
  try {
    attackSystem.executeAttack('player1', {
      name: 'Hydro Pump',
      damage: 50,
      energyCost: ['water', 'water', 'water'],
      extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
    });
  } catch (err) {
    errorCaught = true;
    assert(err.message.includes('Cannot afford energy cost'), 'Should fail with energy cost error');
  }

  assert(errorCaught, 'Should throw error for insufficient energy');
});

// 37. executeAttack: extraEnergyBonus + damageScaling combined
runTest('executeAttack: extraEnergyBonus + damageScaling', () => {
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
  addEnergy(attacker, 'colorless', 6);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Test Attack',
    damage: 20,
    energyCost: ['colorless', 'colorless'],
    damageScaling: 10, // +10 per energy (total 6 = +60)
    extraEnergyBonus: { perExtraEnergy: 15 } // +15 per extra (4 extra = +60)
  });

  assertEqual(result.damageScaling, 60, 'Damage scaling should be 60 (6 * 10)');
  assertEqual(result.extraEnergyBonus, 60, 'Extra energy bonus should be 60 (4 * 15)');
  assertEqual(result.finalDamage, 140, 'Final damage = 20 + 60 + 60 = 140');
});

// 38. executeAttack: extraEnergyBonus + benchScaling combined
runTest('executeAttack: extraEnergyBonus + benchScaling', () => {
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

  // Add 2 Pokémon to bench
  game.gameState.players.player1.banque = [
    { id: 'bench-1', name: 'Bench 1', type: 'colorless', hp: 60, currentHp: 60, energy: [] },
    { id: 'bench-2', name: 'Bench 2', type: 'colorless', hp: 60, currentHp: 60, energy: [] }
  ];

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.executeAttack('player1', {
    name: 'Test Attack',
    damage: 30,
    energyCost: ['colorless', 'colorless'],
    benchScaling: 20, // +20 per bench Pokémon (2 bench = +40)
    extraEnergyBonus: { perExtraEnergy: 15 } // +15 per extra (3 extra = +45)
  });

  assertEqual(result.benchScaling, 40, 'Bench scaling should be 40 (2 * 20)');
  assertEqual(result.extraEnergyBonus, 45, 'Extra energy bonus should be 45 (3 * 15)');
  assertEqual(result.finalDamage, 115, 'Final damage = 30 + 40 + 45 = 115');
});

// 39. calculateDamage includes extraEnergyBonus
runTest('calculateDamage: includes extraEnergyBonus', () => {
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
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', { id: 'eevee-1', name: 'Eevee', type: 'colorless', hp: 60 });

  const result = attackSystem.calculateDamage('player1', 'player2', 50, {
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  assert(result.extraEnergyBonus !== undefined, 'Result should have extraEnergyBonus');
  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
  assertEqual(result.finalDamage, 80, 'Final damage = 50 + 30 = 80');
});

// 40. calculateDamage is a dry-run (no state mutation)
runTest('calculateDamage: dry-run with extraEnergyBonus', () => {
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
  addEnergy(attacker, 'water', 4);

  setActive(game, 'player2', {
    id: 'charizard-1',
    name: 'Charizard',
    type: 'fire',
    hp: 120,
    weakness: 'water'
  });

  const defender = game.gameState.players.player2.activePokemon;
  const hpBefore = defender.currentHp;

  const result = attackSystem.calculateDamage('player1', 'player2', 50, {
    energyCost: ['water', 'water', 'water'],
    extraEnergyBonus: { energyType: 'water', perExtraEnergy: 30 }
  });

  // Check calculation
  assertEqual(result.extraEnergyBonus, 30, 'Extra energy bonus should be 30');
  assertEqual(result.weaknessApplied, 20, 'Weakness should be 20');
  assertEqual(result.finalDamage, 100, 'Final damage = 50 + 30 + 20 = 100');

  // Verify no state mutation
  assertEqual(defender.currentHp, hpBefore, 'Defender HP should not change in dry-run');
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
