/**
 * Test: Halve HP (Super Fang) (GAP-018)
 *
 * Tests the halve HP attack effect which reduces the opponent's
 * Active Pokémon's remaining HP by half (rounded down).
 *
 * GAP-018: [Importante][C2] Halve HP (Bidoof)
 *
 * Acceptance Criteria:
 * 1. Implementar cálculo de HP restante
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos)
 * 4. npm run check pasa
 *
 * Halve HP Effect:
 * - halveHp: true - damage = Math.floor(defender.currentHp / 2)
 * - Base damage is ignored when halveHp is true
 * - Damage modifiers (bonus, reduction, weakness) still apply to the halved damage
 * - If defender has 1 HP remaining, halveHp does 0 damage (Math.floor(1/2) = 0)
 * - If defender has 0 HP (KO'd), halveHp does 0 damage
 *
 * Real-card example:
 * - Bidoof (Super Fang): "Halve your opponent's Active Pokémon's remaining HP, rounded down."
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
    id: 'bidoof-1',
    name: 'Bidoof',
    hp: 70,
    currentHp: 70,
    type: 'colorless',
    energy: [{ type: 'colorless' }, { type: 'colorless' }]
  };

  gameState.players.player2.activePokemon = {
    id: 'rattata-1',
    name: 'Rattata',
    hp: 60,
    currentHp: 60,
    type: 'colorless'
  };

  return { gameState, attackSystem };
}

// ---------------------------------------------------------------------------
// Basic Halve HP Behavior
// ---------------------------------------------------------------------------

runTest('Halve HP: attack halves remaining HP (60 HP → 30 damage)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 60 HP remaining
  gameState.players.player2.activePokemon.currentHp = 60;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP: 60 / 2 = 30 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.finalDamage === 30, 'finalDamage should be 30');
  assert(gameState.players.player2.activePokemon.currentHp === 30, 'Defender should have 30 HP after attack');
  assert(!result.isKO, 'Defender should not be KO\'d');
});

runTest('Halve HP: attack halves remaining HP (100 HP → 50 damage)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 100 HP remaining
  gameState.players.player2.activePokemon.hp = 100;
  gameState.players.player2.activePokemon.currentHp = 100;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP: 100 / 2 = 50 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 50, 'baseDamage should be 50 (half of 100)');
  assert(result.finalDamage === 50, 'finalDamage should be 50');
  assert(gameState.players.player2.activePokemon.currentHp === 50, 'Defender should have 50 HP after attack');
});

runTest('Halve HP: rounds down for odd HP values (61 HP → 30 damage)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 61 HP remaining (odd number)
  gameState.players.player2.activePokemon.hp = 80;
  gameState.players.player2.activePokemon.currentHp = 61;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP with rounding down: Math.floor(61 / 2) = 30 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (floor of 61/2)');
  assert(result.finalDamage === 30, 'finalDamage should be 30');
  assert(gameState.players.player2.activePokemon.currentHp === 31, 'Defender should have 31 HP after attack (61-30)');
});

runTest('Halve HP: rounds down for odd HP values (59 HP → 29 damage)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 59 HP remaining (odd number)
  gameState.players.player2.activePokemon.hp = 80;
  gameState.players.player2.activePokemon.currentHp = 59;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP with rounding down: Math.floor(59 / 2) = 29 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 29, 'baseDamage should be 29 (floor of 59/2)');
  assert(result.finalDamage === 29, 'finalDamage should be 29');
  assert(gameState.players.player2.activePokemon.currentHp === 30, 'Defender should have 30 HP after attack (59-29)');
});

// ---------------------------------------------------------------------------
// Halve HP with Low Remaining HP
// ---------------------------------------------------------------------------

runTest('Halve HP: with 1 HP remaining, does 0 damage (floor of 0.5 = 0)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 1 HP remaining
  gameState.players.player2.activePokemon.hp = 60;
  gameState.players.player2.activePokemon.currentHp = 1;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP: Math.floor(1 / 2) = 0 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 0, 'baseDamage should be 0 (floor of 1/2)');
  assert(result.finalDamage === 0, 'finalDamage should be 0');
  assert(gameState.players.player2.activePokemon.currentHp === 1, 'Defender should still have 1 HP');
  assert(!result.isKO, 'Defender should not be KO\'d');
});

runTest('Halve HP: with 2 HP remaining, does 1 damage', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 2 HP remaining
  gameState.players.player2.activePokemon.hp = 60;
  gameState.players.player2.activePokemon.currentHp = 2;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP: Math.floor(2 / 2) = 1 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 1, 'baseDamage should be 1 (floor of 2/2)');
  assert(result.finalDamage === 1, 'finalDamage should be 1');
  assert(gameState.players.player2.activePokemon.currentHp === 1, 'Defender should have 1 HP after attack');
});

runTest('Halve HP: with 3 HP remaining, does 1 damage', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 3 HP remaining
  gameState.players.player2.activePokemon.hp = 60;
  gameState.players.player2.activePokemon.currentHp = 3;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP: Math.floor(3 / 2) = 1 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 1, 'baseDamage should be 1 (floor of 3/2)');
  assert(result.finalDamage === 1, 'finalDamage should be 1');
  assert(gameState.players.player2.activePokemon.currentHp === 2, 'Defender should have 2 HP after attack');
});

// ---------------------------------------------------------------------------
// Halve HP on Already Damaged Pokémon
// ---------------------------------------------------------------------------

runTest('Halve HP: works on already damaged Pokémon (120 HP max, 80 current → 40 damage)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 120 max HP but only 80 HP remaining
  gameState.players.player2.activePokemon.hp = 120;
  gameState.players.player2.activePokemon.currentHp = 80;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halve HP: 80 / 2 = 40 damage (based on remaining HP, not max HP)
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 40, 'baseDamage should be 40 (half of 80, not 120)');
  assert(result.finalDamage === 40, 'finalDamage should be 40');
  assert(gameState.players.player2.activePokemon.currentHp === 40, 'Defender should have 40 HP after attack');
});

runTest('Halve HP: multiple applications work correctly (80 → 40 → 20 → 10)', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has 80 HP remaining
  gameState.players.player2.activePokemon.hp = 120;
  gameState.players.player2.activePokemon.currentHp = 80;

  // First attack: 80 → 40
  const result1 = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });
  assert(gameState.players.player2.activePokemon.currentHp === 40, 'After 1st attack: 40 HP');

  // Second attack: 40 → 20
  const result2 = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });
  assert(gameState.players.player2.activePokemon.currentHp === 20, 'After 2nd attack: 20 HP');

  // Third attack: 20 → 10
  const result3 = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });
  assert(gameState.players.player2.activePokemon.currentHp === 10, 'After 3rd attack: 10 HP');

  // Verify halve damage values
  assert(result1.baseDamage === 40, '1st attack should do 40 damage');
  assert(result2.baseDamage === 20, '2nd attack should do 20 damage');
  assert(result3.baseDamage === 10, '3rd attack should do 10 damage');
});

// ---------------------------------------------------------------------------
// Halve HP Ignores Base Damage Property
// ---------------------------------------------------------------------------

runTest('Halve HP: ignores base damage property when halveHp is true', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.activePokemon.currentHp = 60;

  // Attack has both base damage and halveHp - halveHp should take precedence
  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    damage: 100, // This should be ignored
    halveHp: true
  });

  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60), not 100');
  assert(result.finalDamage === 30, 'finalDamage should be 30');
});

runTest('Halve HP: ignores damageScaling and benchScaling when halveHp is true', () => {
  const { gameState, attackSystem } = setupGame();

  // Give attacker 3 energy
  gameState.players.player1.activePokemon.energy = [
    { type: 'colorless' },
    { type: 'colorless' },
    { type: 'colorless' }
  ];

  // Give player1 2 benched Pokémon
  gameState.players.player1.banque = [
    { id: 'bench1', name: 'Pikachu', hp: 40, currentHp: 40, type: 'electric', energy: [] },
    { id: 'bench2', name: 'Raichu', hp: 90, currentHp: 90, type: 'electric', energy: [] }
  ];

  gameState.players.player2.activePokemon.currentHp = 60;

  // Attack has halveHp and scaling - halveHp should ignore scaling
  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    damageScaling: 10, // Should be ignored
    benchScaling: 20, // Should be ignored
    halveHp: true
  });

  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.damageScaling === 0, 'damageScaling should be 0 (ignored when halveHp)');
  assert(result.benchScaling === 0, 'benchScaling should be 0 (ignored when halveHp)');
  assert(result.finalDamage === 30, 'finalDamage should be 30');
});

// ---------------------------------------------------------------------------
// Halve HP with Damage Modifiers (bonus, reduction, weakness)
// ---------------------------------------------------------------------------

runTest('Halve HP: damage bonus adds to halved damage', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.activePokemon.currentHp = 60;

  // Add a passive ability that gives +20 damage bonus
  attackSystem.abilitySystem.registerAbility('player1', 'bidoof-1', {
    id: 'damage-boost',
    name: 'Damage Boost',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (30) + bonus (20) = 50
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.bonusApplied === 20, 'bonusApplied should be 20');
  assert(result.finalDamage === 50, 'finalDamage should be 50 (30 + 20)');
  assert(gameState.players.player2.activePokemon.currentHp === 10, 'Defender should have 10 HP after attack');
});

runTest('Halve HP: damage reduction subtracts from halved damage', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.activePokemon.currentHp = 60;

  // Add a passive ability that reduces incoming damage by 20
  attackSystem.abilitySystem.registerAbility('player2', 'rattata-1', {
    id: 'damage-reduction',
    name: 'Damage Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (30) - reduction (20) = 10
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.reductionApplied === 20, 'reductionApplied should be 20');
  assert(result.finalDamage === 10, 'finalDamage should be 10 (30 - 20)');
  assert(gameState.players.player2.activePokemon.currentHp === 50, 'Defender should have 50 HP after attack');
});

runTest('Halve HP: weakness adds to halved damage', () => {
  const { gameState, attackSystem } = setupGame();

  // Set up type weakness: defender weak to attacker's type
  gameState.players.player1.activePokemon.type = 'fire';
  gameState.players.player2.activePokemon.type = 'grass';
  gameState.players.player2.activePokemon.weakness = 'fire';

  gameState.players.player2.activePokemon.currentHp = 60;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (30) + weakness (20) = 50
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.weaknessApplied === 20, 'weaknessApplied should be 20');
  assert(result.finalDamage === 50, 'finalDamage should be 50 (30 + 20)');
  assert(gameState.players.player2.activePokemon.currentHp === 10, 'Defender should have 10 HP after attack');
});

runTest('Halve HP: combined modifiers work correctly (bonus + reduction + weakness)', () => {
  const { gameState, attackSystem } = setupGame();

  // Set up type weakness
  gameState.players.player1.activePokemon.type = 'fire';
  gameState.players.player2.activePokemon.type = 'grass';
  gameState.players.player2.activePokemon.weakness = 'fire';

  gameState.players.player2.activePokemon.currentHp = 60;

  // Add bonus ability
  attackSystem.abilitySystem.registerAbility('player1', 'bidoof-1', {
    id: 'damage-boost',
    name: 'Damage Boost',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 10 },
    condition: { type: 'always' }
  });

  // Add reduction ability
  attackSystem.abilitySystem.registerAbility('player2', 'rattata-1', {
    id: 'damage-reduction',
    name: 'Damage Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 15 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (30) + bonus (10) + weakness (20) - reduction (15) = 45
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.bonusApplied === 10, 'bonusApplied should be 10');
  assert(result.reductionApplied === 15, 'reductionApplied should be 15');
  assert(result.weaknessApplied === 20, 'weaknessApplied should be 20');
  assert(result.finalDamage === 45, 'finalDamage should be 45 (30 + 10 + 20 - 15)');
  assert(gameState.players.player2.activePokemon.currentHp === 15, 'Defender should have 15 HP after attack');
});

runTest('Halve HP: damage modifiers cannot reduce damage below 0', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.activePokemon.currentHp = 2;

  // Add a huge damage reduction (more than halved damage)
  attackSystem.abilitySystem.registerAbility('player2', 'rattata-1', {
    id: 'huge-reduction',
    name: 'Huge Reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 100 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (1) - reduction (100) = 0 (clamped to minimum 0)
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 1, 'baseDamage should be 1 (floor of 2/2)');
  assert(result.reductionApplied === 100, 'reductionApplied should be 100');
  assert(result.finalDamage === 0, 'finalDamage should be 0 (clamped from negative)');
  assert(gameState.players.player2.activePokemon.currentHp === 2, 'Defender HP should be unchanged');
});

// ---------------------------------------------------------------------------
// Halve HP KO Scenarios
// ---------------------------------------------------------------------------

runTest('Halve HP: can KO if halved damage >= remaining HP', () => {
  const { gameState, attackSystem } = setupGame();

  // Defender has only 5 HP remaining
  gameState.players.player2.activePokemon.hp = 120;
  gameState.players.player2.activePokemon.currentHp = 5;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage: Math.floor(5 / 2) = 2 damage
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 2, 'baseDamage should be 2 (floor of 5/2)');
  assert(result.finalDamage === 2, 'finalDamage should be 2');
  assert(gameState.players.player2.activePokemon.currentHp === 3, 'Defender should have 3 HP after attack');
  assert(!result.isKO, 'Defender should not be KO\'d (5 - 2 = 3 > 0)');
});

runTest('Halve HP: with weakness, can KO Pokémon', () => {
  const { gameState, attackSystem } = setupGame();

  // Set up type weakness
  gameState.players.player1.activePokemon.type = 'fire';
  gameState.players.player2.activePokemon.type = 'grass';
  gameState.players.player2.activePokemon.weakness = 'fire';

  // Defender has 40 HP remaining
  gameState.players.player2.activePokemon.currentHp = 40;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (20) + weakness (20) = 40 damage → KO
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 20, 'baseDamage should be 20 (half of 40)');
  assert(result.weaknessApplied === 20, 'weaknessApplied should be 20');
  assert(result.finalDamage === 40, 'finalDamage should be 40');
  assert(gameState.players.player2.activePokemon.currentHp === 0, 'Defender should have 0 HP (KO\'d)');
  assert(result.isKO, 'Defender should be KO\'d');
});

runTest('Halve HP: with bonus, can KO Pokémon', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.activePokemon.currentHp = 40;

  // Add a +25 damage bonus
  attackSystem.abilitySystem.registerAbility('player1', 'bidoof-1', {
    id: 'big-boost',
    name: 'Big Boost',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 25 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Halved damage (20) + bonus (25) = 45 damage → KO
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 20, 'baseDamage should be 20 (half of 40)');
  assert(result.bonusApplied === 25, 'bonusApplied should be 25');
  assert(result.finalDamage === 45, 'finalDamage should be 45');
  assert(gameState.players.player2.activePokemon.currentHp === 0, 'Defender should have 0 HP (KO\'d)');
  assert(result.isKO, 'Defender should be KO\'d');
});

// ---------------------------------------------------------------------------
// Normal Attack Behavior (without halveHp)
// ---------------------------------------------------------------------------

runTest('Normal attack: without halveHp, uses base damage normally', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.activePokemon.currentHp = 60;

  const result = attackSystem.executeAttack('player1', {
    name: 'Tackle',
    damage: 40
  });

  assert(result.halveHpApplied === false, 'halveHpApplied should be false');
  assert(result.baseDamage === 40, 'baseDamage should be 40');
  assert(result.finalDamage === 40, 'finalDamage should be 40');
  assert(gameState.players.player2.activePokemon.currentHp === 20, 'Defender should have 20 HP after attack');
});

runTest('Normal attack: damageScaling and benchScaling work without halveHp', () => {
  const { gameState, attackSystem } = setupGame();

  // Give attacker 3 energy
  gameState.players.player1.activePokemon.energy = [
    { type: 'colorless' },
    { type: 'colorless' },
    { type: 'colorless' }
  ];

  gameState.players.player2.activePokemon.currentHp = 60;

  const result = attackSystem.executeAttack('player1', {
    name: 'Power Attack',
    damage: 20,
    damageScaling: 10,
    benchScaling: 5
  });

  // Base (20) + scaling (30) + bench (0) = 50
  assert(result.halveHpApplied === false, 'halveHpApplied should be false');
  assert(result.baseDamage === 20, 'baseDamage should be 20');
  assert(result.damageScaling === 30, 'damageScaling should be 30 (3 energy × 10)');
  assert(result.benchScaling === 0, 'benchScaling should be 0 (no bench)');
  assert(result.finalDamage === 50, 'finalDamage should be 50');
  assert(gameState.players.player2.activePokemon.currentHp === 10, 'Defender should have 10 HP after attack');
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

runTest('Halve HP: works correctly when currentHp is undefined (initializes from hp)', () => {
  const { gameState, attackSystem } = setupGame();

  // Remove currentHp to simulate uninitialized state
  delete gameState.players.player2.activePokemon.currentHp;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Should initialize currentHp from hp (60) then halve it
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.finalDamage === 30, 'finalDamage should be 30');
  assert(gameState.players.player2.activePokemon.currentHp === 30, 'Defender should have 30 HP after attack');
});

runTest('Halve HP: works correctly when currentHp is null (initializes from hp)', () => {
  const { gameState, attackSystem } = setupGame();

  // Set currentHp to null
  gameState.players.player2.activePokemon.currentHp = null;

  const result = attackSystem.executeAttack('player1', {
    name: 'Super Fang',
    halveHp: true
  });

  // Should initialize currentHp from hp (60) then halve it
  assert(result.halveHpApplied === true, 'halveHpApplied should be true');
  assert(result.baseDamage === 30, 'baseDamage should be 30 (half of 60)');
  assert(result.finalDamage === 30, 'finalDamage should be 30');
  assert(gameState.players.player2.activePokemon.currentHp === 30, 'Defender should have 30 HP after attack');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60));
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
