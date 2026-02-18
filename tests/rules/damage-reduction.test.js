/**
 * Test: Damage Reduction Abilities (GAP-002)
 *
 * Tests the attack system's integration of passive damage reduction modifiers,
 * as seen in cards like Magnezone (Resilience Link), Regirock (Exoskeleton),
 * and Shuckle ex (Solid Shell).
 *
 * GAP-002: [Crítico][C1] Reducción de daño recibido
 *
 * Acceptance Criteria:
 * 1. Damage reduction modifiers are applied in attack calculation
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa
 * 4. npm run check pasa
 */

const { createGame, AttackSystem, AbilitySystem } = require('../../src/index');

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
// Helpers
// ---------------------------------------------------------------------------

function createDeck(n = 20) {
  return Array.from({ length: n }, (_, i) => ({ id: `card-${i}`, name: `Card ${i}` }));
}

function makeGame() {
  return createGame(createDeck(), createDeck());
}

function setActive(game, playerId, props) {
  game.gameState.players[playerId].activePokemon = {
    id: props.id || `active-${playerId}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 100,
    currentHp: props.currentHp !== undefined ? props.currentHp : (props.hp || 100),
    energy: props.energy || [],
    ...props
  };
}

function addToBench(game, playerId, props) {
  if (!game.gameState.players[playerId].banque) {
    game.gameState.players[playerId].banque = [];
  }
  game.gameState.players[playerId].banque.push({
    id: props.id || `bench-${playerId}-${Date.now()}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 100,
    energy: props.energy || [],
    ...props
  });
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

// 1. AttackSystem is exported and instantiable
runTest('AttackSystem is exported from index', () => {
  assert(AttackSystem !== undefined, 'AttackSystem should be exported');
  const game = makeGame();
  assert(game.attackSystem !== undefined, 'game.attackSystem should exist');
  assert(game.attackSystem instanceof AttackSystem, 'Should be instance of AttackSystem');
});

// 2. getDamageReduction returns 0 with no abilities registered
runTest('getDamageReduction returns 0 when no abilities registered', () => {
  const game = makeGame();
  const { abilitySystem } = game;
  assertEqual(abilitySystem.getDamageReduction('player2'), 0, 'No abilities → 0 reduction');
});

// 3. Magnezone pattern: reduce damage received by 30 (always-on)
runTest('Magnezone Resilience Link pattern: -30 damage reduction (always active)', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player2', { id: 'magnezone-1', name: 'Magnezone', hp: 120 });

  abilitySystem.registerAbility('player2', 'magnezone-1', {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageReduction('player2'), 30, 'Magnezone → 30 reduction');
  assertEqual(abilitySystem.getDamageReduction('player1'), 0, 'Player1 unaffected');
});

// 4. Regirock pattern: reduce damage by 30 conditionally (when certain rock-type in play)
runTest('Regirock Exoskeleton pattern: conditional damage reduction', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player2', { id: 'regirock-1', name: 'Regirock', hp: 130, type: 'fighting' });

  // Exoskeleton: reduce damage by 30 when active (is_active condition)
  abilitySystem.registerAbility('player2', 'regirock-1', {
    id: 'exoskeleton',
    name: 'Exoskeleton',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'is_active' }
  });

  // Regirock is active → condition met → -30
  assertEqual(abilitySystem.getDamageReduction('player2'), 30, 'Regirock active → -30 reduction');

  // Move to bench (no longer active)
  game.gameState.players['player2'].activePokemon = null;
  assertEqual(abilitySystem.getDamageReduction('player2'), 0, 'Regirock not active → 0 reduction');
});

// 5. Shuckle ex pattern: reduce damage by 20 (always-on)
runTest('Shuckle ex Solid Shell pattern: -20 damage reduction', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player2', { id: 'shuckle-ex-1', name: 'Shuckle ex', hp: 100 });

  abilitySystem.registerAbility('player2', 'shuckle-ex-1', {
    id: 'solid-shell',
    name: 'Solid Shell',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageReduction('player2'), 20, 'Shuckle ex → 20 reduction');
});

// 6. executeAttack applies damage reduction to defending Pokémon
runTest('executeAttack: damage reduction reduces HP dealt to defender', () => {
  const game = makeGame();
  const { abilitySystem, attackSystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker', hp: 80 });
  setActive(game, 'player2', { id: 'magnezone-1', name: 'Magnezone', hp: 120 });

  // Magnezone has -30 damage reduction
  abilitySystem.registerAbility('player2', 'magnezone-1', {
    id: 'resilience-link',
    name: 'Resilience Link',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', { name: 'Thunderbolt', damage: 90 });

  assertEqual(result.baseDamage, 90, 'Base damage should be 90');
  assertEqual(result.bonusApplied, 0, 'No bonus applied');
  assertEqual(result.reductionApplied, 30, 'Reduction of 30 applied');
  assertEqual(result.finalDamage, 60, 'Final damage = 90 - 30 = 60');
  assertEqual(result.isKO, false, 'Magnezone not KO\'d (120 - 60 = 60 HP left)');
  assertEqual(result.defenderHpAfter, 60, 'Magnezone HP = 60 after attack');
});

// 7. executeAttack with both damage bonus (attacker) and damage reduction (defender)
runTest('executeAttack: bonus + reduction both applied correctly', () => {
  const game = makeGame();
  const { abilitySystem, attackSystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker', hp: 100 });
  setActive(game, 'player2', { id: 'defender-1', name: 'Defender', hp: 100 });

  // Attacker has +20 bonus
  abilitySystem.registerAbility('player1', 'attacker-1', {
    id: 'power-boost',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  // Defender has -30 reduction
  abilitySystem.registerAbility('player2', 'defender-1', {
    id: 'solid-shell',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  // Base 60, +20 bonus, -30 reduction = 50 final
  const result = attackSystem.executeAttack('player1', { name: 'Attack', damage: 60 });

  assertEqual(result.baseDamage, 60, 'Base damage 60');
  assertEqual(result.bonusApplied, 20, 'Bonus 20 applied');
  assertEqual(result.reductionApplied, 30, 'Reduction 30 applied');
  assertEqual(result.finalDamage, 50, 'Final = 60 + 20 - 30 = 50');
  assertEqual(result.defenderHpAfter, 50, 'Defender HP = 100 - 50 = 50');
});

// 8. Damage reduction cannot make damage go negative (floor = 0)
runTest('Damage reduction floors final damage at 0', () => {
  const game = makeGame();
  const { abilitySystem, attackSystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker', hp: 60 });
  setActive(game, 'player2', { id: 'wall-poke', name: 'WallPoke', hp: 100 });

  // Massive reduction
  abilitySystem.registerAbility('player2', 'wall-poke', {
    id: 'iron-wall',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 200 },
    condition: { type: 'always' }
  });

  const result = attackSystem.executeAttack('player1', { name: 'Tackle', damage: 10 });

  assertEqual(result.finalDamage, 0, 'Final damage cannot go below 0');
  assertEqual(result.isKO, false, 'Defender not KO\'d');
  assertEqual(result.defenderHpAfter, 100, 'Defender HP unchanged (0 damage)');
});

// 9. executeAttack with damage reduction causes KO when HP drops to 0
runTest('executeAttack: KO detection with damage reduction active', () => {
  const game = makeGame();
  const { abilitySystem, attackSystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker', hp: 100 });
  setActive(game, 'player2', { id: 'weakling-1', name: 'Weakling', hp: 30 });

  // Reduction of 20
  abilitySystem.registerAbility('player2', 'weakling-1', {
    id: 'partial-shell',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  // Attack does 50 → 50 - 20 = 30 final → KO (hp = 30)
  const result = attackSystem.executeAttack('player1', { name: 'Mega Punch', damage: 50 });

  assertEqual(result.finalDamage, 30, 'Final damage = 50 - 20 = 30');
  assertEqual(result.isKO, true, 'Weakling is KO\'d');
  assertEqual(result.defenderHpAfter, 0, 'Defender HP = 0');
});

// 10. calculateDamage dry-run does not modify game state
runTest('calculateDamage: preview without applying damage', () => {
  const game = makeGame();
  const { abilitySystem, attackSystem } = game;

  setActive(game, 'player2', { id: 'defender-1', name: 'Defender', hp: 100 });

  abilitySystem.registerAbility('player2', 'defender-1', {
    id: 'reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  const preview = attackSystem.calculateDamage('player1', 'player2', 80);

  assertEqual(preview.baseDamage, 80, 'Base damage 80');
  assertEqual(preview.reductionApplied, 30, 'Reduction 30');
  assertEqual(preview.finalDamage, 50, 'Final 50');

  // HP should NOT have changed (calculateDamage is a dry-run)
  const defender = game.gameState.players['player2'].activePokemon;
  assertEqual(defender.currentHp, 100, 'HP unchanged after calculateDamage');
});

// 11. Multiple reduction abilities stack
runTest('Multiple damage reduction abilities stack additively', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player2', { id: 'poke-a', name: 'PokeA', hp: 200 });
  addToBench(game, 'player2', { id: 'poke-b', name: 'PokeB', hp: 100 });

  abilitySystem.registerAbility('player2', 'poke-a', {
    id: 'shield-a',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  abilitySystem.registerAbility('player2', 'poke-b', {
    id: 'shield-b',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 10 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageReduction('player2'), 30, 'Two reductions stack: 20 + 10 = 30');
});

// 12. Reduction only affects defender, not attacker
runTest('Damage reduction on player2 does not affect player1 attacks', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker', hp: 100 });
  setActive(game, 'player2', { id: 'defender-1', name: 'Defender', hp: 100 });

  // Defender has reduction
  abilitySystem.registerAbility('player2', 'defender-1', {
    id: 'reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'always' }
  });

  // Player2's reduction should not affect player1 as defender
  assertEqual(abilitySystem.getDamageReduction('player1'), 0, 'Player1 has no reduction');
  assertEqual(abilitySystem.getDamageReduction('player2'), 30, 'Player2 has 30 reduction');
});

// 13. Conditional reduction: only applies when condition is met
runTest('Conditional damage reduction: only reduces when pokemon_type_in_play', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player2', { id: 'defender-1', name: 'Defender', hp: 100 });

  // Reduce by 30 only when there's a steel-type Pokémon in own side
  abilitySystem.registerAbility('player2', 'defender-1', {
    id: 'steel-shield',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 30 },
    condition: { type: 'pokemon_type_in_play', player: 'self', pokemonType: 'steel' }
  });

  // No steel type → no reduction
  assertEqual(abilitySystem.getDamageReduction('player2'), 0, 'No steel type → 0 reduction');

  // Add steel type to bench
  addToBench(game, 'player2', { id: 'magnezone-1', name: 'Magnezone', type: 'steel' });
  assertEqual(abilitySystem.getDamageReduction('player2'), 30, 'Steel type present → 30 reduction');
});

// 14. Attack system logs the attack event in turnLog
runTest('executeAttack logs event to gameState.turnLog', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Pikachu', hp: 60 });
  setActive(game, 'player2', { id: 'defender-1', name: 'Squirtle', hp: 60 });

  const logLengthBefore = game.gameState.turnLog.length;
  attackSystem.executeAttack('player1', { name: 'Thunder Shock', damage: 20 });

  assert(
    game.gameState.turnLog.length > logLengthBefore,
    'Attack should add an entry to turnLog'
  );

  const lastLog = game.gameState.turnLog[game.gameState.turnLog.length - 1];
  assertEqual(lastLog.type, 'attack', 'Log entry type should be "attack"');
  assertEqual(lastLog.attackingPlayer, 'player1', 'Attacking player logged');
  assertEqual(lastLog.attack, 'Thunder Shock', 'Attack name logged');
});

// 15. Attack without abilities: no modification to base damage
runTest('executeAttack without any abilities: base damage applied directly', () => {
  const game = makeGame();
  const { attackSystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker', hp: 60 });
  setActive(game, 'player2', { id: 'defender-1', name: 'Defender', hp: 100 });

  const result = attackSystem.executeAttack('player1', { name: 'Tackle', damage: 30 });

  assertEqual(result.baseDamage, 30, 'Base damage 30');
  assertEqual(result.bonusApplied, 0, 'No bonus');
  assertEqual(result.reductionApplied, 0, 'No reduction');
  assertEqual(result.finalDamage, 30, 'Final damage 30 (unchanged)');
  assertEqual(result.defenderHpAfter, 70, 'Defender HP = 100 - 30 = 70');
});

// 16. AttackSystem getDamageReduction delegates to AbilitySystem
runTest('AttackSystem.getDamageReduction delegates to AbilitySystem', () => {
  const game = makeGame();
  const { abilitySystem, attackSystem } = game;

  abilitySystem.registerAbility('player2', 'poke-1', {
    id: 'test-reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 25 },
    condition: { type: 'always' }
  });

  // Both paths should give the same result
  assertEqual(
    attackSystem.getDamageReduction('player2'),
    abilitySystem.getDamageReduction('player2'),
    'AttackSystem delegates to AbilitySystem correctly'
  );
  assertEqual(attackSystem.getDamageReduction('player2'), 25, 'Should return 25');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60));
console.log('DAMAGE REDUCTION (GAP-002) TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
