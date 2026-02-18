/**
 * Tests for GAP-013: Auto-daño (recoil) (Arcanine)
 *
 * Recoil damage is self-inflicted damage dealt to the attacking Pokémon
 * after it uses an attack. It bypasses all damage modifiers.
 *
 * Real-card examples:
 * - Arcanine (Heat Tackle): "This Pokémon also does 20 damage to itself."
 * - Arcanine ex (Inferno Onrush): "This Pokémon also does 30 damage to itself."
 * - Rampardos (Head Smash): "This Pokémon also does 30 damage to itself."
 * - Conditional: "If your opponent's Pokémon is KO'd, this Pokémon also does 50 damage to itself."
 */

'use strict';

const { createGame } = require('../../src/index.js');

function createDeck(n = 20) {
  return Array.from({ length: n }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` }));
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function runTest(name, fn) {
  console.log(`\nTest: ${name}`);
  try {
    fn();
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    console.error(err.stack);
    failed++;
  }
}

// Helper: create a fresh game with two Pokémon facing each other
function setupGame() {
  const { gameState, attackSystem } = createGame(createDeck(), createDeck());

  gameState.players.player1.activePokemon = {
    id: 'arcanine-1',
    name: 'Arcanine',
    hp: 120,
    currentHp: 120,
    type: 'fire',
    energy: [{ type: 'fire' }, { type: 'fire' }, { type: 'fire' }]
  };

  gameState.players.player2.activePokemon = {
    id: 'magikarp-1',
    name: 'Magikarp',
    hp: 30,
    currentHp: 30,
    type: 'water'
  };

  return { gameState, attackSystem };
}

// ---------------------------------------------------------------------------
// Basic Recoil
// ---------------------------------------------------------------------------

runTest('Fixed recoil damage: attacker takes damage after attack', () => {
  const { gameState, attackSystem } = setupGame();

  const result = attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 80,
    recoilDamage: 20
  });

  assert(result.recoilDamageApplied === 20, 'recoilDamageApplied should be 20');
  assert(gameState.players.player1.activePokemon.currentHp === 100, 'Arcanine should have 100 HP after 20 recoil (120-20)');
  assert(!result.attackerIsKO, 'Attacker should not be KO\'d');
  assert(result.attackerHpAfter === 100, 'attackerHpAfter should be 100');
});

runTest('Recoil damage reduces attacker HP independently of defender HP', () => {
  const { gameState, attackSystem } = setupGame();

  // Set defender to have lots of HP so it's not KO'd
  gameState.players.player2.activePokemon.hp = 200;
  gameState.players.player2.activePokemon.currentHp = 200;

  const result = attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 80,
    recoilDamage: 30
  });

  assert(result.recoilDamageApplied === 30, 'Recoil should be 30');
  assert(gameState.players.player1.activePokemon.currentHp === 90, 'Arcanine should have 90 HP (120-30)');
  assert(gameState.players.player2.activePokemon.currentHp === 120, 'Defender should have 120 HP (200-80)');
  assert(!result.attackerIsKO, 'Attacker should not be KO\'d');
});

runTest('No recoil when recoilDamage is not specified', () => {
  const { gameState, attackSystem } = setupGame();

  const result = attackSystem.executeAttack('player1', {
    name: 'Flare Blitz',
    damage: 100
  });

  assert(result.recoilDamageApplied === 0, 'No recoil should be applied');
  assert(!result.attackerIsKO, 'Attacker should not be KO\'d');
  assert(gameState.players.player1.activePokemon.currentHp === 120, 'Attacker HP should be unchanged');
});

runTest('No recoil when recoilDamage is 0', () => {
  const { gameState, attackSystem } = setupGame();

  const result = attackSystem.executeAttack('player1', {
    name: 'Flare Blitz',
    damage: 100,
    recoilDamage: 0
  });

  assert(result.recoilDamageApplied === 0, 'No recoil when recoilDamage is 0');
  assert(gameState.players.player1.activePokemon.currentHp === 120, 'Attacker HP unchanged');
});

// ---------------------------------------------------------------------------
// Recoil KOs the Attacker
// ---------------------------------------------------------------------------

runTest('Recoil can KO the attacker', () => {
  const { gameState, attackSystem } = setupGame();

  // Set attacker to low HP
  gameState.players.player1.activePokemon.currentHp = 20;

  const result = attackSystem.executeAttack('player1', {
    name: 'Head Smash',
    damage: 80,
    recoilDamage: 30 // More than remaining HP
  });

  assert(result.recoilDamageApplied === 30, 'Recoil should be 30');
  assert(result.attackerIsKO, 'Attacker should be KO\'d by recoil');
  assert(gameState.players.player1.activePokemon.currentHp === 0, 'Attacker HP should be 0');
  assert(result.attackerHpAfter === 0, 'attackerHpAfter should be 0');
});

runTest('Recoil HP does not go below 0', () => {
  const { gameState, attackSystem } = setupGame();

  // Set attacker to 10 HP with 30 recoil
  gameState.players.player1.activePokemon.currentHp = 10;

  const result = attackSystem.executeAttack('player1', {
    name: 'Head Smash',
    damage: 80,
    recoilDamage: 30
  });

  assert(result.recoilDamageApplied === 30, 'Recoil should be 30');
  assert(gameState.players.player1.activePokemon.currentHp === 0, 'Attacker HP floor is 0, not negative');
  assert(result.attackerIsKO, 'Attacker should be KO\'d');
});

// ---------------------------------------------------------------------------
// Conditional Recoil: on_ko
// ---------------------------------------------------------------------------

runTest('Conditional recoil (on_ko): applies when defender is KO\'d', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 30 HP, will be KO'd by the attack
  const result = attackSystem.executeAttack('player1', {
    name: 'Reckless Charge',
    damage: 100, // Kills Magikarp (30 HP)
    recoilDamage: { amount: 50, condition: 'on_ko' }
  });

  assert(result.isKO, 'Defender should be KO\'d');
  assert(result.recoilDamageApplied === 50, 'Recoil should apply since defender was KO\'d');
  assert(gameState.players.player1.activePokemon.currentHp === 70, 'Attacker should have 70 HP (120-50)');
});

runTest('Conditional recoil (on_ko): does NOT apply when defender survives', () => {
  const { gameState, attackSystem } = setupGame();

  // Set defender to 200 HP so it survives
  gameState.players.player2.activePokemon.hp = 200;
  gameState.players.player2.activePokemon.currentHp = 200;

  const result = attackSystem.executeAttack('player1', {
    name: 'Reckless Charge',
    damage: 50, // Does not kill defender
    recoilDamage: { amount: 50, condition: 'on_ko' }
  });

  assert(!result.isKO, 'Defender should NOT be KO\'d');
  assert(result.recoilDamageApplied === 0, 'Recoil should NOT apply since defender was NOT KO\'d');
  assert(gameState.players.player1.activePokemon.currentHp === 120, 'Attacker HP unchanged');
});

// ---------------------------------------------------------------------------
// Object format without condition (equivalent to fixed)
// ---------------------------------------------------------------------------

runTest('Object format without condition: always applies', () => {
  const { gameState, attackSystem } = setupGame();

  const result = attackSystem.executeAttack('player1', {
    name: 'Inferno Onrush',
    damage: 120,
    recoilDamage: { amount: 30 }
  });

  assert(result.recoilDamageApplied === 30, 'Recoil should be 30 (object without condition)');
  assert(gameState.players.player1.activePokemon.currentHp === 90, 'Attacker HP should be 90 (120-30)');
});

// ---------------------------------------------------------------------------
// Event Logging
// ---------------------------------------------------------------------------

runTest('Recoil damage is logged to turnLog', () => {
  const { gameState, attackSystem } = setupGame();

  attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 80,
    recoilDamage: 20
  });

  const recoilLog = gameState.turnLog.find(e => e.type === 'recoil_damage');
  assert(recoilLog !== undefined, 'recoil_damage event should be logged');
  assert(recoilLog.playerId === 'player1', 'recoil_damage should be for the attacking player');
  assert(recoilLog.pokemonId === 'arcanine-1', 'recoil_damage should reference attacker pokemonId');
  assert(recoilLog.pokemonName === 'Arcanine', 'recoil_damage should reference attacker name');
  assert(recoilLog.recoilDamage === 20, 'recoil_damage event should have recoilDamage = 20');
  assert(!recoilLog.attackerIsKO, 'attackerIsKO should be false when attacker survives');
  assert(recoilLog.attackerHpAfter === 100, 'attackerHpAfter should be 100 in log');
});

runTest('No recoil_damage event logged when no recoil', () => {
  const { gameState, attackSystem } = setupGame();

  attackSystem.executeAttack('player1', {
    name: 'Flare Blitz',
    damage: 80
  });

  const recoilLog = gameState.turnLog.find(e => e.type === 'recoil_damage');
  assert(recoilLog === undefined, 'No recoil_damage event should be logged when no recoil');
});

runTest('Recoil event logs attackerIsKO when attacker is knocked out', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player1.activePokemon.currentHp = 10;

  attackSystem.executeAttack('player1', {
    name: 'Head Smash',
    damage: 80,
    recoilDamage: 30
  });

  const recoilLog = gameState.turnLog.find(e => e.type === 'recoil_damage');
  assert(recoilLog !== undefined, 'recoil_damage event should be logged');
  assert(recoilLog.attackerIsKO === true, 'attackerIsKO should be true in log');
  assert(recoilLog.attackerHpAfter === 0, 'attackerHpAfter should be 0 in log');
});

// ---------------------------------------------------------------------------
// Recoil with other attack properties
// ---------------------------------------------------------------------------

runTest('Recoil damage coexists with weakness bonus', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender weak to fire
  gameState.players.player2.activePokemon.weakness = 'fire';
  gameState.players.player2.activePokemon.hp = 200;
  gameState.players.player2.activePokemon.currentHp = 200;

  const result = attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 80,
    recoilDamage: 20
  });

  // Weakness adds +20, so defender takes 100 damage
  assert(result.weaknessApplied === 20, 'Weakness should be applied');
  assert(result.finalDamage === 100, 'Final damage should be 100 (80 + 20 weakness)');
  assert(result.recoilDamageApplied === 20, 'Recoil should still be 20');
  assert(gameState.players.player1.activePokemon.currentHp === 100, 'Attacker HP should be 100 after recoil');
});

runTest('Recoil bypasses damage modifiers (is self-inflicted)', () => {
  const { gameState, abilitySystem, attackSystem } = createGame(createDeck(), createDeck());

  // Setup attacker with 120 HP
  gameState.players.player1.activePokemon = {
    id: 'arcanine-2',
    name: 'Arcanine',
    hp: 120,
    currentHp: 120,
    type: 'fire',
    energy: [{ type: 'fire' }, { type: 'fire' }]
  };

  // Setup defender
  gameState.players.player2.activePokemon = {
    id: 'target-1',
    name: 'Target',
    hp: 200,
    currentHp: 200,
    type: 'water'
  };

  // Register a damage reduction ability for player1 (should NOT affect recoil)
  abilitySystem.registerAbility('player1', 'resilience', {
    name: 'Resilience Link',
    effect: {
      type: 'damage_reduction',
      amount: 30
    },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 60,
    recoilDamage: 20
  });

  // Recoil should be 20, NOT affected by damage_reduction ability
  assert(result.recoilDamageApplied === 20, 'Recoil should be 20 (not reduced by damage_reduction ability)');
  assert(gameState.players.player1.activePokemon.currentHp === 100, 'Attacker HP should be 100 (120-20 recoil, bypass modifier)');
});

runTest('calculateRecoilDamage: simple number', () => {
  const { attackSystem } = createGame(createDeck(), createDeck());
  assert(attackSystem.calculateRecoilDamage(20, false) === 20, 'Simple 20 recoil, defender not KO');
  assert(attackSystem.calculateRecoilDamage(20, true) === 20, 'Simple 20 recoil, defender KO (no change)');
  assert(attackSystem.calculateRecoilDamage(0, true) === 0, '0 recoil is 0');
  assert(attackSystem.calculateRecoilDamage(null, true) === 0, 'Null recoil is 0');
  assert(attackSystem.calculateRecoilDamage(undefined, true) === 0, 'Undefined recoil is 0');
});

runTest('calculateRecoilDamage: on_ko condition', () => {
  const { attackSystem } = createGame(createDeck(), createDeck());
  const config = { amount: 50, condition: 'on_ko' };
  assert(attackSystem.calculateRecoilDamage(config, true) === 50, 'on_ko: returns 50 when defender KO\'d');
  assert(attackSystem.calculateRecoilDamage(config, false) === 0, 'on_ko: returns 0 when defender NOT KO\'d');
});

runTest('calculateRecoilDamage: object without condition', () => {
  const { attackSystem } = createGame(createDeck(), createDeck());
  const config = { amount: 30 };
  assert(attackSystem.calculateRecoilDamage(config, false) === 30, 'Object without condition always applies');
  assert(attackSystem.calculateRecoilDamage(config, true) === 30, 'Object without condition always applies (KO case)');
});

// ---------------------------------------------------------------------------
// Attacker HP lazy initialization
// ---------------------------------------------------------------------------

runTest('Recoil initializes attacker currentHp from hp if not set', () => {
  const { gameState, attackSystem } = createGame(createDeck(), createDeck());

  gameState.players.player1.activePokemon = {
    id: 'arcanine-3',
    name: 'Arcanine',
    hp: 120,
    // currentHp NOT set — should lazy init from hp
    type: 'fire',
    energy: [{ type: 'fire' }, { type: 'fire' }]
  };

  gameState.players.player2.activePokemon = {
    id: 'target-2',
    name: 'Target',
    hp: 50,
    currentHp: 50
  };

  const result = attackSystem.executeAttack('player1', {
    name: 'Heat Tackle',
    damage: 30,
    recoilDamage: 20
  });

  assert(result.recoilDamageApplied === 20, 'Recoil should be 20');
  // Attacker currentHp should be lazily initialized to 120 then -20 = 100
  assert(gameState.players.player1.activePokemon.currentHp === 100,
    'Attacker HP should be 100 (lazy init 120 - 20 recoil)');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n========================================`);
console.log(`GAP-013 Recoil Damage Tests`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
