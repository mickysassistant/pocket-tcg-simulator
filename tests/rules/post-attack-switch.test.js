/**
 * Tests for GAP-020: Switch del atacante (Magikarp)
 *
 * This file tests the postAttackSwitch effect in AttackSystem.
 * Magikarp's attack pattern:
 * - Attack deals damage
 * - After attacking, switch with a Benched Pokémon
 * - All special conditions are cleared during the switch
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

function assertThrows(fn, testName) {
  try {
    fn();
    throw new Error(`${testName}: Expected function to throw, but it didn't`);
  } catch (e) {
    if (e.message.includes('Expected function to throw')) {
      throw e;
    }
    // Expected error - test passes
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

// Test 1: Post-attack switch with no configuration does nothing
runTest('Post-attack switch with no configuration does nothing', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.success !== false, 'Attack should execute');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'magikarp', 'Magikarp should still be active (no switch)');
});

// Test 2: Post-attack switch to any bench Pokemon
runTest('Post-attack switch to any bench Pokemon', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult !== undefined, 'Result should include postAttackSwitchResult');
  assertTrue(result.postAttackSwitchResult.success, 'Switch should succeed');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'eevee', 'Eevee should now be active');
  assertEqual(game.gameState.players.player1.banque[0].id, 'magikarp', 'Magikarp should be on bench');
});

// Test 3: Post-attack switch to specific Pokemon
runTest('Post-attack switch to specific Pokemon', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const bulbasaur = createSimplePokemon('bulbasaur', 'Bulbasaur', 'Grass', 70);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee, bulbasaur];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench', pokemonId: 'bulbasaur' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should succeed');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'bulbasaur', 'Bulbasaur should now be active');
  assertTrue(game.gameState.players.player1.banque.some(p => p.id === 'magikarp'), 'Magikarp should be on bench');
});

// Test 4: Post-attack switch cleans special conditions from attacker
runTest('Post-attack switch cleans special conditions from attacker', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  // Apply a special condition to the attacker
  game.statusConditionSystem.applyCondition('player1', 'magikarp', SPECIAL_CONDITIONS.POISONED);

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should succeed');

  // Check that Magikarp (now on bench) has no condition
  const magikarpCondition = game.statusConditionSystem.getCondition('player1', 'magikarp');
  assertEqual(magikarpCondition, null, 'Magikarp should have no condition after switch');
  assertEqual(result.postAttackSwitchResult.details.conditionsRemoved.length, 1, 'One condition should be removed');
  assertEqual(result.postAttackSwitchResult.details.conditionsRemoved[0].pokemonId, 'magikarp', 'Removed condition from Magikarp');
});

// Test 5: Post-attack switch cleans special conditions from target
runTest('Post-attack switch cleans special conditions from target', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  // Apply a special condition to the bench Pokemon
  game.statusConditionSystem.applyCondition('player1', 'eevee', SPECIAL_CONDITIONS.SLEEP);

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should succeed');

  // Check that Eevee (now active) has no condition
  const eeveeCondition = game.statusConditionSystem.getCondition('player1', 'eevee');
  assertEqual(eeveeCondition, null, 'Eevee should have no condition after becoming active');
});

// Test 6: Post-attack switch cleans all special condition types
runTest('Post-attack switch cleans all special condition types', () => {
  const conditions = [
    SPECIAL_CONDITIONS.POISONED,
    SPECIAL_CONDITIONS.BURNED,
    SPECIAL_CONDITIONS.SLEEP,
    SPECIAL_CONDITIONS.PARALYZED,
    SPECIAL_CONDITIONS.CONFUSED
  ];

  for (const condition of conditions) {
    const game = createGame([], []);

    const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
    const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
    const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

    game.gameState.players.player1.activePokemon = magikarp;
    game.gameState.players.player1.banque = [eevee];
    game.gameState.players.player2.activePokemon = pikachu;

    // Apply condition to attacker
    game.statusConditionSystem.applyCondition('player1', 'magikarp', condition);

    const attack = {
      name: 'Splash',
      damage: 10,
      postAttackSwitch: { to: 'bench' }
    };

    const result = game.attackSystem.executeAttack('player1', attack);

    assertTrue(result.postAttackSwitchResult.success, `Switch should succeed for ${condition}`);

    // Check condition was cleaned
    const magikarpCondition = game.statusConditionSystem.getCondition('player1', 'magikarp');
    assertEqual(magikarpCondition, null, `Magikarp should have no ${condition} after switch`);
  }
});

// Test 7: Post-attack switch fails if no bench Pokemon available
runTest('Post-attack switch fails if no bench Pokemon available', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = []; // Empty bench
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.postAttackSwitchResult.success, 'Switch should fail with empty bench');
  assertEqual(result.postAttackSwitchResult.reason, 'no_valid_targets', 'Reason should be no_valid_targets');
});

// Test 8: Post-attack switch fails if attacker is KO'd
runTest('Post-attack switch fails if attacker is KO\'d', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    recoilDamage: 100, // KO the attacker
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.postAttackSwitchResult.success, 'Switch should fail if attacker is KO\'d');
  assertEqual(result.postAttackSwitchResult.reason, 'attacker_ko', 'Reason should be attacker_ko');
  assertTrue(result.attackerIsKO, 'Attacker should be KO\'d from recoil');
});

// Test 9: Post-attack switch fails if target Pokemon is KO'd
runTest('Post-attack switch fails if target Pokemon is KO\'d', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  // KO the bench Pokemon
  eevee.currentHp = 0;

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench', pokemonId: 'eevee' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.postAttackSwitchResult.success, 'Switch should fail if target is KO\'d');
  assertEqual(result.postAttackSwitchResult.reason, 'target_ko', 'Reason should be target_ko');
});

// Test 10: Post-attack switch finds first non-KO Pokemon on bench
runTest('Post-attack switch finds first non-KO Pokemon on bench', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const bulbasaur = createSimplePokemon('bulbasaur', 'Bulbasaur', 'Grass', 70);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  // KO first bench Pokemon
  eevee.currentHp = 0;

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee, bulbasaur];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should succeed');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'bulbasaur', 'Should switch to Bulbasaur (first non-KO)');
});

// Test 11: Turn log contains post-attack switch event
runTest('Turn log contains post-attack switch event', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  game.attackSystem.executeAttack('player1', attack);

  const switchLog = game.gameState.turnLog.find(log => log.type === 'post_attack_switch');
  assertTrue(switchLog !== undefined, 'Turn log should contain post-attack switch event');
  assertEqual(switchLog.fromPokemonId, 'magikarp', 'Log should show from Pokemon');
  assertEqual(switchLog.toPokemonId, 'eevee', 'Log should show to Pokemon');
});

// Test 12: Post-attack switch logs removed conditions
runTest('Post-attack switch logs removed conditions', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  // Apply conditions to both
  game.statusConditionSystem.applyCondition('player1', 'magikarp', SPECIAL_CONDITIONS.POISONED);
  game.statusConditionSystem.applyCondition('player1', 'eevee', SPECIAL_CONDITIONS.SLEEP);

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should succeed');
  assertEqual(result.postAttackSwitchResult.details.conditionsRemoved.length, 2, 'Both conditions should be removed');

  const switchLog = game.gameState.turnLog.find(log => log.type === 'post_attack_switch');
  assertTrue(switchLog !== undefined, 'Turn log should contain switch event');
  assertEqual(switchLog.conditionsRemoved.length, 2, 'Log should show both conditions removed');
});

// Test 13: Post-attack switch happens after recoil damage
runTest('Post-attack switch happens after recoil damage', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 100, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    recoilDamage: 20,
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should happen after recoil');
  assertEqual(result.recoilDamageApplied, 20, 'Recoil should be applied');
  assertEqual(result.attackerHpAfter, 80, 'Attacker HP should be reduced by recoil');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'eevee', 'Switch should still occur after recoil');
});

// Test 14: Post-attack switch happens after spread damage
runTest('Post-attack switch happens after spread damage', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);
  const rattata = createSimplePokemon('rattata', 'Rattata', 'Colorless', 40);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;
  game.gameState.players.player2.banque = [rattata];

  const attack = {
    name: 'Splash',
    damage: 10,
    spreadDamage: { amount: 5, target: 'banque' },
    postAttackSwitch: { to: 'bench' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertTrue(result.postAttackSwitchResult.success, 'Switch should happen after spread damage');
  assertTrue(result.spreadDamageResults.length > 0, 'Spread damage should be applied');
  assertEqual(game.gameState.players.player1.activePokemon.id, 'eevee', 'Switch should occur');
});

// Test 15: Post-attack switch with specific target not found fails
runTest('Post-attack switch with specific target not found fails', () => {
  const game = createGame([], []);

  const magikarp = createSimplePokemon('magikarp', 'Magikarp', 'Water', 30, [{ type: 'water' }]);
  const eevee = createSimplePokemon('eevee', 'Eevee', 'Colorless', 60);
  const pikachu = createSimplePokemon('pikachu', 'Pikachu', 'Electric', 70);

  game.gameState.players.player1.activePokemon = magikarp;
  game.gameState.players.player1.banque = [eevee];
  game.gameState.players.player2.activePokemon = pikachu;

  const attack = {
    name: 'Splash',
    damage: 10,
    postAttackSwitch: { to: 'bench', pokemonId: 'nonexistent' }
  };

  const result = game.attackSystem.executeAttack('player1', attack);

  assertFalse(result.postAttackSwitchResult.success, 'Switch should fail for non-existent target');
  assertEqual(result.postAttackSwitchResult.reason, 'target_not_found', 'Reason should be target_not_found');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
