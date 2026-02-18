/**
 * GAP-010: [Importante][C1] Reducción de daño al oponente (Luxray Intimidating Fang)
 *
 * Tests for opponent damage reduction abilities that reduce the damage dealt by the opponent.
 *
 * Example: Luxray (Intimidating Fang) — "Any damage done by your opponent's
 * Active Pokémon is reduced by 20 (after applying Weakness and Resistance)."
 */

const { createGame } = require('../../src/index');

// Test helpers
function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err.message);
    process.exit(1);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

function createDeck(n = 20) {
  return Array.from({ length: n }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` }));
}

function createTestGame() {
  const game = createGame(createDeck(), createDeck());

  // Set up player1 with Luxray (Intimidating Fang) as active
  const luxray = {
    id: 'luxray-1',
    name: 'Luxray',
    type: 'Lightning',
    hp: 140,
    energy: []
  };

  game.gameState.players.player1.activePokemon = luxray;

  // Set up player2 with a basic attacker
  const pikachu = {
    id: 'pikachu-1',
    name: 'Pikachu',
    type: 'Lightning',
    hp: 70,
    energy: []
  };

  game.gameState.players.player2.activePokemon = pikachu;

  return { game, luxray, pikachu };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('Testing GAP-010: Reducción de daño al oponente (Luxray Intimidating Fang)\n');

// Test 1: Basic opponent damage reduction
runTest('Luxray Intimidating Fang reduces opponent damage by 20', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Register Intimidating Fang ability (active condition, reduces by 20)
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'is_active'
    }
  });

  // Player2 attacks with base damage 60
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Damage should be reduced by 20 (60 - 20 = 40)
  assertEqual(result.finalDamage, 40, 'Final damage should be 40 (60 - 20)');
  assertEqual(result.opponentReductionApplied, 20, 'Opponent reduction should be 20');
  assertEqual(luxray.currentHp, 100, 'Luxray should have 100 HP remaining (140 - 40)');
});

// Test 2: No opponent damage reduction when ability is not registered
runTest('No opponent damage reduction when ability not registered', () => {
  const { game, luxray } = createTestGame();

  // Player2 attacks with base damage 60 (no ability registered)
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Damage should not be reduced
  assertEqual(result.finalDamage, 60, 'Final damage should be 60 (no reduction)');
  assertEqual(result.opponentReductionApplied, 0, 'Opponent reduction should be 0');
  assertEqual(luxray.currentHp, 80, 'Luxray should have 80 HP remaining (140 - 60)');
});

// Test 3: Opponent damage reduction with is_active condition
runTest('Opponent damage reduction only applies when Pokémon is active', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Move Luxray to bench (simulate not being active)
  game.gameState.players.player1.activePokemon = null;
  game.gameState.players.player1.banque = [luxray];

  // Add a different active Pokemon for player1
  const raichu = {
    id: 'raichu-1',
    name: 'Raichu',
    type: 'Lightning',
    hp: 120,
    energy: []
  };
  game.gameState.players.player1.activePokemon = raichu;

  // Register Intimidating Fang ability on Luxray (now on bench)
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'is_active'
    }
  });

  // Player2 attacks
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Damage should NOT be reduced (Luxray is not active)
  assertEqual(result.finalDamage, 60, 'Final damage should be 60 (no reduction when not active)');
  assertEqual(result.opponentReductionApplied, 0, 'Opponent reduction should be 0');
});

// Test 4: Multiple opponent damage reductions stack
runTest('Multiple opponent damage reductions stack additively', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Add another Pokemon with opponent damage reduction
  const manectric = {
    id: 'manectric-1',
    name: 'Manectric',
    type: 'Lightning',
    hp: 100,
    energy: []
  };
  game.gameState.players.player1.banque = [manectric];

  // Register two abilities with always condition (stack)
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'always'
    }
  });

  game.abilitySystem.registerAbility('player1', manectric.id, {
    id: 'intimidating-roar',
    name: 'Intimidating Roar',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 10
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks with base damage 60
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Damage should be reduced by 30 (20 + 10)
  assertEqual(result.finalDamage, 30, 'Final damage should be 30 (60 - 20 - 10)');
  assertEqual(result.opponentReductionApplied, 30, 'Opponent reduction should be 30');
});

// Test 5: Opponent damage reduction + damage reduction (both on defending player)
runTest('Opponent damage reduction works with defender damage reduction', () => {
  const { game, luxray } = createTestGame();

  // Register opponent damage reduction on Luxray (reduces opponent's damage)
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'always'
    }
  });

  // Add another Pokemon to player1's bench with damage reduction
  const magnezone = {
    id: 'magnezone-1',
    name: 'Magnezone',
    type: 'Metal',
    hp: 150,
    energy: []
  };
  game.gameState.players.player1.banque = [magnezone];

  // Register damage reduction on Magnezone (reduces damage received by player1)
  game.abilitySystem.registerAbility('player1', magnezone.id, {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: {
      type: 'damage_reduction',
      amount: 30
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks with base damage 100
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Flash Cannon',
    damage: 100
  });

  // Damage should be reduced by 50 total (30 defender reduction + 20 opponent reduction) = 100 - 30 - 20 = 50
  assertEqual(result.finalDamage, 50, 'Final damage should be 50 (100 - 30 - 20)');
  assertEqual(result.reductionApplied, 30, 'Defender reduction should be 30');
  assertEqual(result.opponentReductionApplied, 20, 'Opponent reduction should be 20');
  assertEqual(luxray.currentHp, 90, 'Luxray should have 90 HP remaining (140 - 50)');
});

// Test 6: Opponent damage reduction + damage bonus (attacker vs defender abilities)
runTest('Opponent damage reduction works with attacker damage bonus', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Register opponent damage reduction on Luxray
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'is_active'
    }
  });

  // Register damage bonus on attacker (player2)
  game.abilitySystem.registerAbility('player2', pikachu.id, {
    id: 'voltage-punch',
    name: 'Voltage Punch',
    type: 'passive',
    effect: {
      type: 'damage_bonus',
      amount: 30
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks with base damage 60
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Formula: base (60) + bonus (30) - opponentReduction (20) = 70
  assertEqual(result.finalDamage, 70, 'Final damage should be 70 (60 + 30 - 20)');
  assertEqual(result.bonusApplied, 30, 'Bonus should be 30');
  assertEqual(result.opponentReductionApplied, 20, 'Opponent reduction should be 20');
});

// Test 7: Damage cannot go below 0
runTest('Opponent damage reduction floors final damage at 0', () => {
  const { game, luxray } = createTestGame();

  // Register massive opponent damage reduction
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 100
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks with base damage 60
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Damage should be floored at 0
  assertEqual(result.finalDamage, 0, 'Final damage should be 0 (60 - 100 < 0)');
  assertEqual(result.opponentReductionApplied, 100, 'Opponent reduction should be 100');
  assertEqual(luxray.currentHp, 140, 'Luxray should still have 140 HP (no damage taken)');
  assertFalse(result.isKO, 'Luxray should not be KO\'d');
});

// Test 8: Opponent damage reduction does not affect KO detection with lethal damage
runTest('Opponent damage reduction still allows KO with lethal damage', () => {
  const { game, luxray } = createTestGame();

  // Register opponent damage reduction
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks with base damage 90 (enough to KO even with reduction)
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Thunderbolt',
    damage: 90
  });

  // Damage: 90 - 20 = 70, which is not enough to KO Luxray (140 HP)
  assertEqual(result.finalDamage, 70, 'Final damage should be 70 (90 - 20)');
  assertEqual(result.opponentReductionApplied, 20, 'Opponent reduction should be 20');
  assertEqual(luxray.currentHp, 70, 'Luxray should be at 70 HP');
  assertFalse(result.isKO, 'Luxray should not be KO\'d (140 - 70 = 70)');

  // Attack again with enough damage to KO
  result2 = game.attackSystem.executeAttack('player2', {
    name: 'Thunderbolt',
    damage: 150
  });

  // Damage: 150 - 20 = 130, which is enough to KO Luxray (70 HP remaining)
  assertEqual(result2.finalDamage, 130, 'Final damage should be 130 (150 - 20)');
  assertEqual(luxray.currentHp, 0, 'Luxray should be at 0 HP');
  assertTrue(result2.isKO, 'Luxray should be KO\'d');
});

// Test 9: getOpponentDamageReduction method
runTest('AbilitySystem.getOpponentDamageReduction returns correct value', () => {
  const { game, luxray } = createTestGame();

  // Register opponent damage reduction
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 25
    },
    condition: {
      type: 'is_active'
    }
  });

  // Get opponent damage reduction for player2 (attacker)
  const reduction = game.abilitySystem.getOpponentDamageReduction('player2');

  assertEqual(reduction, 25, 'Opponent damage reduction should be 25');
});

// Test 10: removeAbilities removes opponent damage reduction
runTest('removeAbilities removes opponent damage reduction', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Register opponent damage reduction
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'always'
    }
  });

  // First attack: should have reduction
  let result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });
  assertEqual(result.finalDamage, 40, 'First attack should have reduction');

  // Remove the ability (simulate Luxray being KO'd or retreated)
  game.abilitySystem.removeAbilities('player1', luxray.id);

  // Second attack: should not have reduction
  result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });
  assertEqual(result.finalDamage, 60, 'Second attack should not have reduction after removal');
});

// Test 11: calculateDamage includes opponent damage reduction
runTest('calculateDamage includes opponent damage reduction', () => {
  const { game, luxray } = createTestGame();

  // Register opponent damage reduction
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 15
    },
    condition: {
      type: 'is_active'
    }
  });

  // Calculate damage (preview without applying)
  const result = game.attackSystem.calculateDamage('player2', 'player1', 50);

  assertEqual(result.finalDamage, 35, 'Calculated damage should be 35 (50 - 15)');
  assertEqual(result.opponentReductionApplied, 15, 'Opponent reduction should be 15');
  // HP should not be affected (preview only)
  assertEqual(luxray.currentHp, undefined, 'Luxray HP should not be set (preview)');
});

// Test 12: Turn log includes opponent damage reduction info
runTest('Turn log includes opponent damage reduction information', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Register opponent damage reduction
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks
  game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });

  // Check turn log
  const logs = game.gameState.turnLog;
  assertTrue(logs.length > 0, 'Turn log should have entries');

  const attackLog = logs.find(log => log.type === 'attack');
  assertTrue(attackLog, 'Turn log should have attack entry');
  assertEqual(attackLog.opponentReductionApplied, 20, 'Attack log should include opponent reduction');
});

// Test 13: Condition support (has_energy_count)
runTest('Opponent damage reduction with has_energy_count condition', () => {
  const { game, luxray } = createTestGame();

  // Register opponent damage reduction that requires 2 energy
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'has_energy_count',
      minEnergy: 2
    }
  });

  // Attack without enough energy (Luxray has 0)
  let result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });
  assertEqual(result.finalDamage, 60, 'Damage should not be reduced without energy');
  assertEqual(result.opponentReductionApplied, 0, 'Opponent reduction should be 0');

  // Reset Luxray's HP
  luxray.currentHp = 140;

  // Add 2 energy to Luxray
  luxray.energy = [
    { type: 'Lightning' },
    { type: 'Lightning' }
  ];

  // Attack with enough energy
  result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });
  assertEqual(result.finalDamage, 40, 'Damage should be reduced with 2 energy');
  assertEqual(result.opponentReductionApplied, 20, 'Opponent reduction should be 20');
});

// Test 14: Both players can have opponent damage reduction
runTest('Both players can have opponent damage reduction abilities', () => {
  const { game, luxray, pikachu } = createTestGame();

  // Register opponent damage reduction for player1
  game.abilitySystem.registerAbility('player1', luxray.id, {
    id: 'intimidating-fang',
    name: 'Intimidating Fang',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 20
    },
    condition: {
      type: 'always'
    }
  });

  // Register opponent damage reduction for player2 (on Pikachu)
  game.abilitySystem.registerAbility('player2', pikachu.id, {
    id: 'static-shock',
    name: 'Static Shock',
    type: 'passive',
    effect: {
      type: 'opponent_damage_reduction',
      amount: 10
    },
    condition: {
      type: 'always'
    }
  });

  // Player2 attacks: should be affected by player1's reduction
  let result = game.attackSystem.executeAttack('player2', {
    name: 'Thunder Shock',
    damage: 60
  });
  assertEqual(result.finalDamage, 40, 'Player2 attack should have 20 reduction');
  assertEqual(result.opponentReductionApplied, 20, 'Opponent reduction should be 20 (from player1)');

  // Player1 attacks: should be affected by player2's reduction
  result = game.attackSystem.executeAttack('player1', {
    name: 'Wild Charge',
    damage: 50
  });
  assertEqual(result.finalDamage, 40, 'Player1 attack should have 10 reduction');
  assertEqual(result.opponentReductionApplied, 10, 'Opponent reduction should be 10 (from player2)');
  assertEqual(pikachu.currentHp, 30, 'Pikachu should have 30 HP remaining (70 - 40)');
});

console.log('\nAll GAP-010 tests passed! ✓');
