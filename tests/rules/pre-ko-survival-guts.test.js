/**
 * Test: Pre-KO Survival Abilities (GAP-007)
 *
 * Tests the ability system's support for pre-KO survival abilities (Guts),
 * as seen in cards like Conkeldurr.
 *
 * GAP-007: [Importante][C1] Guts (Conkeldurr (Guts))
 *
 * Acceptance Criteria:
 * 1. Implementar sistema de pre-KO coin flip
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa
 * 4. npm run check pasa
 */

const { createGame, AbilitySystem, AttackSystem } = require('../../src/index');

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
// Test helpers
// ---------------------------------------------------------------------------

function createDeck(n = 20) {
  return Array.from({ length: n }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` }));
}

/**
 * Create a basic game setup with two players and Pokémon in active spots
 */
function createBasicGame() {
  const game = createGame(createDeck(), createDeck());

  // Set up player 1's active Pokémon
  game.gameState.players.player1.activePokemon = {
    id: 'p1-attacker',
    name: 'Pikachu',
    hp: 60,
    type: 'Electric',
    energy: []
  };

  // Set up player 2's active Pokémon
  game.gameState.players.player2.activePokemon = {
    id: 'p2-defender',
    name: 'Conkeldurr',
    hp: 150,
    type: 'Fighting',
    energy: []
  };

  return game;
}

/**
 * Register a Guts ability on a Pokémon
 */
function registerGutsAbility(game, abilitySystem, playerId, pokemonId) {
  abilitySystem.registerAbility(playerId, pokemonId, {
    id: 'guts',
    name: 'Guts',
    type: 'passive',
    effect: {
      type: 'pre_ko_survival'
    },
    condition: {
      type: 'always'
    }
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('Testing Pre-KO Survival (Guts) - GAP-007\n');

// ---------------------------------------------------------------------------
// Test 1: Guts ability registration
// ---------------------------------------------------------------------------

runTest('Guts ability is registered correctly', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  const hasGuts = abilitySystem.hasPreKoSurvival('player2', 'p2-defender');
  assert(hasGuts !== null, 'Guts ability should be present');
  assertEqual(hasGuts.name, 'Guts', 'Ability name should be Guts');
});

// ---------------------------------------------------------------------------
// Test 2: hasPreKoSurvival returns null when no ability
// ---------------------------------------------------------------------------

runTest('hasPreKoSurvival returns null when Pokémon has no Guts', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);

  const hasGuts = abilitySystem.hasPreKoSurvival('player2', 'p2-defender');
  assert(hasGuts === null, 'Should return null when no Guts ability');
});

// ---------------------------------------------------------------------------
// Test 3: Guts triggers on lethal damage (coin flip heads)
// ---------------------------------------------------------------------------

runTest('Guts triggers on lethal damage with heads coin flip', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Attack with 150 damage (should KO Conkeldurr without Guts)
  const attack = {
    name: 'Heavy Slam',
    damage: 150,
    coinFlip: () => true // Force heads for deterministic test
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.finalDamage, 150, 'Damage should be 150');
  assertEqual(result.isKO, false, 'Should NOT be KO (Guts survived)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 1, 'Should survive with 1 HP');
  assert(result.preKoSurvivalResult !== null, 'Should have pre-KO survival result');
  assertEqual(result.preKoSurvivalResult.coinFlip, 'heads', 'Coin flip should be heads');
  assertEqual(result.preKoSurvivalResult.survived, true, 'Should have survived');

  // Check turn log
  const lastLog = game.gameState.turnLog[game.gameState.turnLog.length - 1];
  assertEqual(lastLog.type, 'pre_ko_survival', 'Last log should be pre_ko_survival');
  assertEqual(lastLog.survived, true, 'Log should show survived');
});

// ---------------------------------------------------------------------------
// Test 4: Guts fails on lethal damage (coin flip tails)
// ---------------------------------------------------------------------------

runTest('Guts fails on lethal damage with tails coin flip', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Attack with 150 damage
  const attack = {
    name: 'Heavy Slam',
    damage: 150,
    coinFlip: () => false // Force tails for deterministic test
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.finalDamage, 150, 'Damage should be 150');
  assertEqual(result.isKO, true, 'Should be KO (Guts failed)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 0, 'HP should be 0');
  assert(result.preKoSurvivalResult !== null, 'Should have pre-KO survival result');
  assertEqual(result.preKoSurvivalResult.coinFlip, 'tails', 'Coin flip should be tails');
  assertEqual(result.preKoSurvivalResult.survived, false, 'Should not have survived');

  // Check turn log
  const lastLog = game.gameState.turnLog[game.gameState.turnLog.length - 1];
  assertEqual(lastLog.type, 'pre_ko_survival', 'Last log should be pre_ko_survival');
  assertEqual(lastLog.survived, false, 'Log should show not survived');
});

// ---------------------------------------------------------------------------
// Test 5: Guts does not trigger on non-lethal damage
// ---------------------------------------------------------------------------

runTest('Guts does not trigger on non-lethal damage', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Attack with 100 damage (Conkeldurr has 150 HP, should survive normally)
  const attack = {
    name: 'Dynamic Punch',
    damage: 100
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.finalDamage, 100, 'Damage should be 100');
  assertEqual(result.isKO, false, 'Should not be KO');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 50, 'Should have 50 HP remaining');
  assert(result.preKoSurvivalResult === null, 'Should NOT have pre-KO survival result');
});

// ---------------------------------------------------------------------------
// Test 6: Guts works with conditions (e.g., is_active)
// ---------------------------------------------------------------------------

runTest('Guts respects condition (is_active)', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // Register Guts with is_active condition
  abilitySystem.registerAbility('player2', 'p2-defender', {
    id: 'guts-active',
    name: 'Guts',
    type: 'passive',
    effect: {
      type: 'pre_ko_survival'
    },
    condition: {
      type: 'is_active'
    }
  });

  // Attack with lethal damage - should trigger (Pokémon is active)
  const attack = {
    name: 'Heavy Slam',
    damage: 150,
    coinFlip: () => true
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.isKO, false, 'Should NOT be KO (Guts saved it)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 1, 'Should have 1 HP');
});

// ---------------------------------------------------------------------------
// Test 7: Guts with unmet condition does not trigger
// ---------------------------------------------------------------------------

runTest('Guts does not trigger when condition not met', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // Register Guts with has_energy_count condition (Conkeldurr has no energy)
  abilitySystem.registerAbility('player2', 'p2-defender', {
    id: 'guts-powered',
    name: 'Guts',
    type: 'passive',
    effect: {
      type: 'pre_ko_survival'
    },
    condition: {
      type: 'has_energy_count',
      count: 1
    }
  });

  // Attack with lethal damage - should NOT trigger (condition not met)
  const attack = {
    name: 'Heavy Slam',
    damage: 150
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.isKO, true, 'Should be KO (Guts condition not met)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 0, 'HP should be 0');
  assert(result.preKoSurvivalResult === null, 'Should NOT have pre-KO survival result');
});

// ---------------------------------------------------------------------------
// Test 8: Guts works in combination with damage reduction
// ---------------------------------------------------------------------------

runTest('Guts works with damage reduction', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // Register Guts
  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Also register damage reduction (Resilience Link -30)
  abilitySystem.registerAbility('player2', 'p2-defender', {
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

  // Attack with 180 damage - should be reduced to 150, then KO'd, then Guts saves it
  const attack = {
    name: 'Giga Impact',
    damage: 180,
    coinFlip: () => true
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.reductionApplied, 30, 'Damage reduction should be 30');
  assertEqual(result.finalDamage, 150, 'Final damage should be 150 (180 - 30)');
  assertEqual(result.isKO, false, 'Should NOT be KO (Guts saved it)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 1, 'Should have 1 HP');
});

// ---------------------------------------------------------------------------
// Test 9: Guts works in combination with damage bonus (attacker)
// ---------------------------------------------------------------------------

runTest('Guts works with damage bonus on attacker', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // Register Guts on defender
  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Register damage bonus on attacker
  abilitySystem.registerAbility('player1', 'p1-attacker', {
    id: 'power-link',
    name: 'Power Link',
    type: 'passive',
    effect: {
      type: 'damage_bonus',
      amount: 30
    },
    condition: {
      type: 'always'
    }
  });

  // Attack with 120 damage - should be boosted to 150, then KO'd, then Guts saves it
  const attack = {
    name: 'Thunder',
    damage: 120,
    coinFlip: () => true
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.bonusApplied, 30, 'Damage bonus should be 30');
  assertEqual(result.finalDamage, 150, 'Final damage should be 150 (120 + 30)');
  assertEqual(result.isKO, false, 'Should NOT be KO (Guts saved it)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 1, 'Should have 1 HP');
});

// ---------------------------------------------------------------------------
// Test 10: Multiple attacks with same Guts Pokémon
// ---------------------------------------------------------------------------

runTest('Guts works on multiple attacks (survives first, KO\'d second)', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // First attack - lethal, but Guts saves it (heads)
  let attack = {
    name: 'Heavy Slam',
    damage: 150,
    coinFlip: () => true // Heads
  };

  let result = attackSystem.executeAttack('player1', attack);
  assertEqual(result.isKO, false, 'First attack: Should NOT be KO');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 1, 'First attack: Should have 1 HP');

  // Second attack - lethal, Guts fails (tails)
  attack = {
    name: 'Quick Attack',
    damage: 10,
    coinFlip: () => false // Tails
  };

  result = attackSystem.executeAttack('player1', attack);
  assertEqual(result.isKO, true, 'Second attack: Should be KO');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 0, 'Second attack: HP should be 0');
});

// ---------------------------------------------------------------------------
// Test 11: Guts does not interfere with normal KO for non-Guts Pokémon
// ---------------------------------------------------------------------------

runTest('Normal KO works for Pokémon without Guts', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // No Guts ability registered

  // Attack with lethal damage
  const attack = {
    name: 'Heavy Slam',
    damage: 150
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.isKO, true, 'Should be KO (no Guts)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 0, 'HP should be 0');
  assert(result.preKoSurvivalResult === null, 'Should NOT have pre-KO survival result');
});

// ---------------------------------------------------------------------------
// Test 12: Guts ability removal
// ---------------------------------------------------------------------------

runTest('Guts ability can be removed', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Verify Guts is registered
  let hasGuts = abilitySystem.hasPreKoSurvival('player2', 'p2-defender');
  assert(hasGuts !== null, 'Guts should be registered');

  // Remove the ability
  abilitySystem.removeAbilities('player2', 'p2-defender');

  // Verify Guts is removed
  hasGuts = abilitySystem.hasPreKoSurvival('player2', 'p2-defender');
  assert(hasGuts === null, 'Guts should be removed');

  // Attack - should KO normally
  const attack = {
    name: 'Heavy Slam',
    damage: 150
  };

  const result = attackSystem.executeAttack('player1', attack);
  assertEqual(result.isKO, true, 'Should be KO (Guts removed)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 0, 'HP should be 0');
});

// ---------------------------------------------------------------------------
// Test 13: Attack with damage prevention and Guts
// ---------------------------------------------------------------------------

runTest('Damage prevention takes precedence over Guts', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // Register Guts
  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Register damage prevention (Safeguard - prevents damage from Pokémon ex)
  game.gameState.players.player1.activePokemon.name = 'Charizard ex'; // Make attacker an ex

  abilitySystem.registerAbility('player2', 'p2-defender', {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // Attack with lethal damage - should be prevented, so Guts doesn't trigger
  const attack = {
    name: 'Heavy Slam',
    damage: 150
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
  assertEqual(result.isKO, false, 'Should not be KO');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 150, 'HP should be unchanged');
  assert(result.preKoSurvivalResult === null, 'Should NOT have pre-KO survival result (no damage dealt)');
});

// ---------------------------------------------------------------------------
// Test 14: Guts event logging
// ---------------------------------------------------------------------------

runTest('Guts event is logged correctly', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  const initialLogLength = game.gameState.turnLog.length;

  // Attack with lethal damage - Guts saves it
  const attack = {
    name: 'Heavy Slam',
    damage: 150,
    coinFlip: () => true
  };

  attackSystem.executeAttack('player1', attack);

  // Check that we have 2 new log entries: attack and pre_ko_survival
  assertEqual(game.gameState.turnLog.length, initialLogLength + 2, 'Should have 2 new log entries');

  const preKoLog = game.gameState.turnLog[game.gameState.turnLog.length - 1];
  assertEqual(preKoLog.type, 'pre_ko_survival', 'Last log should be pre_ko_survival');
  assertEqual(preKoLog.playerId, 'player2', 'Should log correct player');
  assertEqual(preKoLog.pokemonId, 'p2-defender', 'Should log correct Pokémon');
  assertEqual(preKoLog.pokemonName, 'Conkeldurr', 'Should log correct name');
  assertEqual(preKoLog.coinFlip, 'heads', 'Should log heads');
  assertEqual(preKoLog.survived, true, 'Should log survived');
  assertEqual(preKoLog.hpAfter, 1, 'Should log HP after');
});

// ---------------------------------------------------------------------------
// Test 15: Guts works when currentHp is already initialized
// ---------------------------------------------------------------------------

runTest('Guts works when currentHp is already set', () => {
  const game = createBasicGame();
  const abilitySystem = new AbilitySystem(game.gameState);
  const attackSystem = new AttackSystem(game.gameState, abilitySystem);

  // Initialize currentHp explicitly
  game.gameState.players.player2.activePokemon.currentHp = 150;

  registerGutsAbility(game, abilitySystem, 'player2', 'p2-defender');

  // Attack with lethal damage
  const attack = {
    name: 'Heavy Slam',
    damage: 150,
    coinFlip: () => true
  };

  const result = attackSystem.executeAttack('player1', attack);

  assertEqual(result.isKO, false, 'Should NOT be KO (Guts saved it)');
  assertEqual(game.gameState.players.player2.activePokemon.currentHp, 1, 'Should have 1 HP');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`${'='.repeat(60)}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\nAll tests passed!');
