/**
 * Tests for GAP-021: Forzar switch del oponente (Grapploct)
 *
 * This file tests the forcedOpponentSwitch effect in AttackSystem.
 * Grapploct's attack pattern:
 * - Attack deals damage
 * - Forces opponent to switch their Active Pokémon with one from their Bench
 * - All special conditions are cleared during the switch
 * - Opponent chooses which Pokémon to switch to
 */

const { createGame, StatusConditionSystem, SPECIAL_CONDITIONS } = require('../../src/index');

// ---------------------------------------------------------------------------
// Test Utilities
// ---------------------------------------------------------------------------

let testsPassed = 0;
let testsFailed = 0;

function assertEqual(actual, expected, testName) {
  if (actual !== expected) {
    throw new Error(`${testName}: Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, testName) {
  if (!value) {
    throw new Error(`${testName}: Expected true, got ${value}`);
  }
}

function assertFalse(value, testName) {
  if (value) {
    throw new Error(`${testName}: Expected false, got ${value}`);
  }
}

function runTest(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    testsFailed++;
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function createSimplePokemon(id, name, type, hp, energy = []) {
  return {
    id,
    name,
    type,
    hp,
    energy: energy,
    currentHp: hp
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Test 1: Forced opponent switch with no configuration does nothing
runTest('Forced opponent switch with no configuration does nothing', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Tackle',
    damage: 10
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.success !== false, 'Attack should execute');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'eevee', 'Eevee should still be active (no forced switch)');
});

// Test 2: Forced opponent switch to any bench Pokemon
runTest('Forced opponent switch to any bench Pokemon', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult !== undefined, 'Result should include forcedOpponentSwitchResult');
  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'magikarp', 'Magikarp should now be opponent\'s active');
  assertEqual(game.gameState.players.player2.banque[0].id, 'eevee', 'Eevee should be on opponent\'s bench');
});

// Test 3: Forced opponent switch to specific Pokemon
runTest('Forced opponent switch to specific Pokemon', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);
  const bulbasaur = createSimplePokemon('bulbasaur', 'Bulbasaur', 'Grass', 70);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp, bulbasaur];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench', pokemonId: 'bulbasaur' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'bulbasaur', 'Bulbasaur should now be opponent\'s active');
  assertTrue(game.gameState.players.player2.banque.some(p => p.id === 'eevee'), 'Eevee should be on opponent\'s bench');
});

// Test 4: Forced opponent switch cleans special conditions from opponent's Active
runTest('Forced opponent switch cleans special conditions from opponent\'s Active', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  // Apply a special condition to the opponent's Active
  game.statusConditionSystem.applyCondition('player2', 'eevee', SPECIAL_CONDITIONS.POISONED);

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');

  // Check that Eevee (now on bench) has no condition
  const eeveeCondition = game.statusConditionSystem.getCondition('player2', 'eevee');
  assertEqual(eeveeCondition, null, 'Eevee should have no condition after forced switch');
  assertEqual(result.forcedOpponentSwitchResult.details.conditionsRemoved.length, 1, 'One condition should be removed');
  assertEqual(result.forcedOpponentSwitchResult.details.conditionsRemoved[0].pokemonId, 'eevee', 'Removed condition from Eevee');
});

// Test 5: Forced opponent switch cleans special conditions from target Pokemon
runTest('Forced opponent switch cleans special conditions from target Pokemon', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  // Apply a special condition to the bench Pokemon
  game.statusConditionSystem.applyCondition('player2', 'magikarp', SPECIAL_CONDITIONS.SLEEP);

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');

  // Check that Magikarp (now active) has no condition
  const magikarpCondition = game.statusConditionSystem.getCondition('player2', 'magikarp');
  assertEqual(magikarpCondition, null, 'Magikarp should have no condition after becoming active');
});

// Test 6: Forced opponent switch cleans all special condition types
runTest('Forced opponent switch cleans all special condition types', () => {
  const conditions = [
    SPECIAL_CONDITIONS.POISONED,
    SPECIAL_CONDITIONS.BURNED,
    SPECIAL_CONDITIONS.SLEEP,
    SPECIAL_CONDITIONS.PARALYZED,
    SPECIAL_CONDITIONS.CONFUSED
  ];

  for (const condition of conditions) {
    const game = createGame([], []);

    const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
    const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
    const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

    game.gameState.players.player1.activePokemon = pikachu;
    game.gameState.players.player2.activePokemon = eevee;
    game.gameState.players.player2.banque = [magikarp];

    // Apply condition to opponent's Active
    game.statusConditionSystem.applyCondition('player2', 'eevee', condition);

    const attack = {
      name: 'Octolock',
      damage: 30,
      forcedOpponentSwitch: { to: 'bench' }
    };

    const result = game.attackSystem.executeAttack('player1', attack);

    assertTrue(result.forcedOpponentSwitchResult.success, `Forced switch should succeed for ${condition}`);

    // Check condition was cleaned
    const eeveeCondition = game.statusConditionSystem.getCondition('player2', 'eevee');
    assertEqual(eeveeCondition, null, `Eevee should have no ${condition} after forced switch`);
  }
});

// Test 7: Forced opponent switch fails if opponent has no bench Pokemon
runTest('Forced opponent switch fails if opponent has no bench Pokemon', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = []; // Empty bench

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.forcedOpponentSwitchResult.success, 'Forced switch should fail with empty opponent bench');
  assertEqual(result.forcedOpponentSwitchResult.reason, 'no_valid_targets', 'Reason should be no_valid_targets');
});

// Test 8: Forced opponent switch fails if opponent's Active is KO'd
runTest('Forced opponent switch fails if opponent\'s Active is KO\'d', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 100, // KO the opponent's Active
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.forcedOpponentSwitchResult.success, 'Forced switch should fail if opponent\'s Active is KO\'d');
  assertEqual(result.forcedOpponentSwitchResult.reason, 'opponent_active_ko', 'Reason should be opponent_active_ko');
  assertTrue(result.isKO, 'Opponent\'s Active should be KO\'d');
});

// Test 9: Forced opponent switch fails if target Pokemon is KO'd
runTest('Forced opponent switch fails if target Pokemon is KO\'d', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  // KO the bench Pokemon
  magikarp.currentHp = 0;

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench', pokemonId: 'magikarp' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.forcedOpponentSwitchResult.success, 'Forced switch should fail if target is KO\'d');
  assertEqual(result.forcedOpponentSwitchResult.reason, 'target_ko', 'Reason should be target_ko');
});

// Test 10: Forced opponent switch finds first non-KO Pokemon on bench
runTest('Forced opponent switch finds first non-KO Pokemon on bench', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);
  const bulbasaur = createSimplePokemon('bulbasaur', 'Bulbasaur', 'Grass', 70);

  // KO first bench Pokemon
  magikarp.currentHp = 0;

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp, bulbasaur];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'bulbasaur', 'Should switch to Bulbasaur (first non-KO)');
});

// Test 11: Turn log contains forced opponent switch event
runTest('Turn log contains forced opponent switch event', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  game.attackSystem.executeAttack('player1', attack);

  const switchLog = game.gameState.turnLog.find(log => log.type === 'forced_opponent_switch');
  assertTrue(switchLog !== undefined, 'Turn log should contain forced opponent switch event');
  assertEqual(switchLog.fromPokemonId, 'eevee', 'Log should show from Pokemon');
  assertEqual(switchLog.toPokemonId, 'magikarp', 'Log should show to Pokemon');
  assertEqual(switchLog.attacker, 'player1', 'Log should show attacker');
  assertEqual(switchLog.defendingPlayer, 'player2', 'Log should show defending player');
});

// Test 12: Forced opponent switch logs removed conditions
runTest('Forced opponent switch logs removed conditions', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  // Apply conditions to both
  game.statusConditionSystem.applyCondition('player2', 'eevee', SPECIAL_CONDITIONS.POISONED);
  game.statusConditionSystem.applyCondition('player2', 'magikarp', SPECIAL_CONDITIONS.SLEEP);

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');
  assertEqual(result.forcedOpponentSwitchResult.details.conditionsRemoved.length, 2, 'Both conditions should be removed');

  const switchLog = game.gameState.turnLog.find(log => log.type === 'forced_opponent_switch');
  assertTrue(switchLog !== undefined, 'Turn log should contain switch event');
  assertEqual(switchLog.conditionsRemoved.length, 2, 'Log should show both conditions removed');
});

// Test 13: Forced opponent switch happens after recoil damage
runTest('Forced opponent switch happens after recoil damage', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 100, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    recoilDamage: 20,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should happen after recoil');
  assertEqual(result.recoilDamageApplied, 20, 'Recoil should be applied');
  assertEqual(result.attackerHpAfter, 80, 'Attacker HP should be reduced by recoil');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'magikarp', 'Forced switch should still occur after recoil');
});

// Test 14: Forced opponent switch happens after spread damage
runTest('Forced opponent switch happens after spread damage', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);
  const rattata = createSimplePokemon('rattata', 'Rattata', 'Colorless', 40);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];
  game.gameState.players.player1.banque = [rattata];

  const attack = {
    name: 'Octolock',
    damage: 30,
    spreadDamage: { amount: 5, target: 'banque' },
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should happen after spread damage');
  assertTrue(result.spreadDamageResults.length > 0, 'Spread damage should be applied');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'magikarp', 'Forced switch should occur');
});

// Test 15: Forced opponent switch with specific target not found fails
runTest('Forced opponent switch with specific target not found fails', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench', pokemonId: 'nonexistent' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.forcedOpponentSwitchResult.success, 'Forced switch should fail for non-existent target');
  assertEqual(result.forcedOpponentSwitchResult.reason, 'target_not_found', 'Reason should be target_not_found');
});

// Test 16: Forced opponent switch with player2 attacking
runTest('Forced opponent switch with player2 attacking', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60, [{ type: 'colorless' }]);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player1.banque = [magikarp];
  game.gameState.players.player2.activePokemon = eevee;

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player2', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed for player2 attacking');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'magikarp', 'Player1\'s active should be switched');
  assertEqual(game.gameState.players.player1.banque[0].id, 'pikachu', 'Player1\'s old active should be on bench');
});

// Test 17: Forced opponent switch does not affect attacker
runTest('Forced opponent switch does not affect attacker', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);
  const bulbasaur = createSimplePokemon('bulbasaur', 'Bulbasaur', 'Grass', 70);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player1.banque = [bulbasaur];
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' }
  };

  game.attackSystem.executeAttack('player1', attack);

  // Attacker should not change
  assertEqual(game.gameState.players.player1.activePokemon.id, 'pikachu', 'Attacker\'s active should not change');
  assertEqual(game.gameState.players.player1.banque[0].id, 'bulbasaur', 'Attacker\'s bench should not change');
});

// Test 18: Forced opponent switch and post-attack switch can both happen
runTest('Forced opponent switch and post-attack switch can both happen', () => {
  const game = createGame([], []);

  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 100, [{ type: 'electric' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30);
  const bulbasaur = createSimplePokemon('bulbasaur', 'Bulbasaur', 'Grass', 70);

  game.gameState.players.player1.activePokemon = pikachu;
  game.gameState.players.player1.banque = [bulbasaur];
  game.gameState.players.player2.activePokemon = eevee;
  game.gameState.players.player2.banque = [magikarp];

  const attack = {
    name: 'Octolock',
    damage: 30,
    forcedOpponentSwitch: { to: 'bench' },
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.forcedOpponentSwitchResult.success, 'Forced switch should succeed');
  assertTrue(result.postAttackSwitchResult.success, 'Post-attack switch should succeed');
  assertEqual(game.gameState.players.player2.activePokemon.id, 'magikarp', 'Opponent\'s active should be switched');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'bulbasaur', 'Attacker\'s active should be switched');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
