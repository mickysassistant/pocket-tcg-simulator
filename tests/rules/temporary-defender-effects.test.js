/**
 * Tests for GAP-014: Efectos temporales sobre el defensor (Vulpix (Tail Whip))
 *
 * Temporary effects are placed on a defending Pokémon after an attack resolves.
 * They last for a limited number of turns and are cleared when the Pokémon
 * switches out or evolves.
 *
 * Real-card examples:
 * - Vulpix (Tail Whip):        Flip a coin. If heads, opponent's Active Pokémon
 *                               can't attack during opponent's next turn.
 * - Mr. Mime (Barrier Attack): Opponent's Active Pokémon can't attack during
 *                               opponent's next turn.
 * - Clefable (Moonblast):      Opponent's Active Pokémon does -20 damage during
 *                               opponent's next turn.
 */

'use strict';

const { createGame, TemporaryEffectsSystem, TEMPORARY_EFFECT_TYPES } = require('../../src/index.js');

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

function setupGame() {
  const { gameState, attackSystem, temporaryEffectsSystem } = createGame(createDeck(), createDeck());

  gameState.players.player1.activePokemon = {
    id: 'player1-active',
    name: 'Pidgey',
    hp: 60,
    currentHp: 60,
    type: 'colorless',
    energy: [{ type: 'colorless' }, { type: 'colorless' }]
  };

  gameState.players.player2.activePokemon = {
    id: 'player2-active',
    name: 'Vulpix',
    hp: 60,
    currentHp: 60,
    type: 'fire',
    energy: [{ type: 'fire' }, { type: 'colorless' }]
  };

  return { gameState, attackSystem, temporaryEffectsSystem };
}

// =============================================================================
// Section 1: TemporaryEffectsSystem standalone tests
// =============================================================================

runTest('TEMPORARY_EFFECT_TYPES constants are exported', () => {
  assert(TEMPORARY_EFFECT_TYPES, 'TEMPORARY_EFFECT_TYPES exists');
  assert(TEMPORARY_EFFECT_TYPES.CANNOT_ATTACK === 'cannot_attack', 'CANNOT_ATTACK constant');
  assert(TEMPORARY_EFFECT_TYPES.DAMAGE_REDUCTION === 'damage_reduction', 'DAMAGE_REDUCTION constant');
});

runTest('TemporaryEffectsSystem is exported and instantiatable', () => {
  const { temporaryEffectsSystem } = setupGame();
  assert(temporaryEffectsSystem instanceof TemporaryEffectsSystem, 'temporaryEffectsSystem is a TemporaryEffectsSystem');
});

runTest('TemporaryEffectsSystem - no effects by default', () => {
  const { temporaryEffectsSystem } = setupGame();
  assert(!temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'no effects initially');
  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'cannotAttack is false initially');
  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 0, 'damage reduction is 0 initially');
});

runTest('applyEffect - cannot_attack (no coin flip)', () => {
  const { gameState, temporaryEffectsSystem } = setupGame();

  const result = temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  assert(result.applied === true, 'effect was applied');
  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'Pokémon cannot attack');
  assert(temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'Pokémon has effects');

  // Log event was emitted
  const logEntry = gameState.turnLog.find(e => e.type === 'temporary_effect_applied');
  assert(logEntry !== undefined, 'temporary_effect_applied logged');
  assert(logEntry.effectType === 'cannot_attack', 'logged correct effect type');
  assert(logEntry.turnsRemaining === 1, 'logged turnsRemaining');
});

runTest('applyEffect - damage_reduction (no coin flip)', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'damage_reduction',
    value: 20,
    duration: 1
  });

  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'Pokémon can still attack');
  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 20, 'damage reduction is 20');
});

runTest('getEffects returns a copy of the effects array', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  const effects = temporaryEffectsSystem.getEffects('player1', 'player1-active');
  assert(Array.isArray(effects), 'getEffects returns an array');
  assert(effects.length === 1, 'one effect');
  assert(effects[0].type === 'cannot_attack', 'correct type');

  // Mutating the returned array does not affect internal state
  effects.pop();
  assert(temporaryEffectsSystem.getEffects('player1', 'player1-active').length === 1, 'internal state unchanged');
});

// =============================================================================
// Section 2: Coin flip gate (Vulpix - Tail Whip)
// =============================================================================

runTest('applyEffect with requiresCoinFlip=true, heads - effect applied', () => {
  const { gameState, temporaryEffectsSystem } = setupGame();
  const alwaysHeads = () => true;

  const result = temporaryEffectsSystem.applyEffect(
    'player1', 'player1-active',
    { type: 'cannot_attack', duration: 1, requiresCoinFlip: true },
    alwaysHeads
  );

  assert(result.applied === true, 'effect applied on heads');
  assert(result.coinFlipResult === 'heads', 'coinFlipResult is heads');
  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'cannot attack after heads');
});

runTest('applyEffect with requiresCoinFlip=true, tails - effect NOT applied', () => {
  const { gameState, temporaryEffectsSystem } = setupGame();
  const alwaysTails = () => false;

  const result = temporaryEffectsSystem.applyEffect(
    'player1', 'player1-active',
    { type: 'cannot_attack', duration: 1, requiresCoinFlip: true },
    alwaysTails
  );

  assert(result.applied === false, 'effect NOT applied on tails');
  assert(result.coinFlipResult === 'tails', 'coinFlipResult is tails');
  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'can still attack after tails');

  // Failed coin flip is logged
  const logEntry = gameState.turnLog.find(e => e.type === 'temporary_effect_failed_coin_flip');
  assert(logEntry !== undefined, 'failed coin flip logged');
  assert(logEntry.coinFlip === 'tails', 'logged tails');
});

// =============================================================================
// Section 3: advanceTurn - expiry
// =============================================================================

runTest('advanceTurn expires effects with duration 1 after one call', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'blocked before advance');

  temporaryEffectsSystem.advanceTurn();

  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'unblocked after advance');
  assert(!temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'no effects after advance');
});

runTest('advanceTurn with duration 2 - effect lasts for 2 advances', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'damage_reduction',
    value: 20,
    duration: 2
  });

  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 20, 'effect active t=0');

  temporaryEffectsSystem.advanceTurn();
  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 20, 'effect active after 1 advance');

  temporaryEffectsSystem.advanceTurn();
  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 0, 'effect expired after 2 advances');
});

// =============================================================================
// Section 4: clearEffectsForPokemon (switch / evolve cleanup)
// =============================================================================

runTest('clearEffectsForPokemon removes effects on switch', () => {
  const { gameState, temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  assert(temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'effect exists before switch');

  temporaryEffectsSystem.clearEffectsForPokemon('player1', 'player1-active', 'switch');

  assert(!temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'effect cleared after switch');
  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'can attack after switch');

  // Log event
  const logEntry = gameState.turnLog.find(e => e.type === 'temporary_effects_cleared');
  assert(logEntry !== undefined, 'temporary_effects_cleared logged');
  assert(logEntry.reason === 'switch', 'reason is switch');
});

runTest('clearEffectsForPokemon with reason evolve', () => {
  const { gameState, temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'damage_reduction',
    value: 20,
    duration: 1
  });

  temporaryEffectsSystem.clearEffectsForPokemon('player1', 'player1-active', 'evolve');

  assert(!temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'effect cleared after evolve');
  const logEntry = gameState.turnLog.find(e => e.type === 'temporary_effects_cleared');
  assert(logEntry !== undefined, 'cleared logged');
  assert(logEntry.reason === 'evolve', 'reason is evolve');
});

runTest('clearEffectsForPokemon is a no-op if Pokémon has no effects', () => {
  const { gameState, temporaryEffectsSystem } = setupGame();
  const initialLogLength = gameState.turnLog.length;

  temporaryEffectsSystem.clearEffectsForPokemon('player1', 'non-existent-id', 'switch');

  // No extra log entries expected
  assert(gameState.turnLog.length === initialLogLength, 'no log entry added for empty clear');
});

runTest('clearAll removes all effects', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'cannot_attack', duration: 1 });
  temporaryEffectsSystem.applyEffect('player2', 'player2-active', { type: 'damage_reduction', value: 20, duration: 1 });

  temporaryEffectsSystem.clearAll();

  assert(!temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'player1 effects cleared');
  assert(!temporaryEffectsSystem.hasEffects('player2', 'player2-active'), 'player2 effects cleared');
});

// =============================================================================
// Section 5: Multiple effects stack
// =============================================================================

runTest('Multiple damage_reduction effects stack', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'damage_reduction', value: 20, duration: 1 });
  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'damage_reduction', value: 10, duration: 1 });

  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 30, 'stacked reduction = 30');
});

runTest('cannot_attack from any effect blocks attack', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'damage_reduction', value: 20, duration: 1 });
  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'cannot_attack', duration: 1 });

  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'still cannot attack');
  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 20, 'damage reduction still applies');
});

// =============================================================================
// Section 6: AttackSystem integration - cannot_attack blocks executeAttack
// =============================================================================

runTest('AttackSystem - blocked by cannot_attack effect', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();

  // Apply cannot_attack to player1's active Pokémon
  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  let threw = false;
  try {
    attackSystem.executeAttack('player1', { name: 'Gust', damage: 20 });
  } catch (err) {
    threw = true;
    assert(err.message.includes('cannot attack'), `error message mentions cannot attack: ${err.message}`);
  }

  assert(threw, 'executeAttack throws when cannot_attack is active');

  // Block logged
  const logEntry = gameState.turnLog.find(e => e.type === 'attack_blocked_by_temporary_effect');
  assert(logEntry !== undefined, 'block logged in turnLog');
  assert(logEntry.reason === 'cannot_attack', 'logged reason');
});

runTest('AttackSystem - blocked attack does NOT damage defender', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  const defenderHpBefore = gameState.players.player2.activePokemon.currentHp;

  try {
    attackSystem.executeAttack('player1', { name: 'Gust', damage: 30 });
  } catch (_) { /* expected */ }

  assert(gameState.players.player2.activePokemon.currentHp === defenderHpBefore, 'defender HP unchanged');
});

runTest('AttackSystem - after advanceTurn the Pokémon can attack again', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'cannot_attack',
    duration: 1
  });

  // Simulate turn passing
  temporaryEffectsSystem.advanceTurn();

  // Now player1 should be able to attack
  const result = attackSystem.executeAttack('player1', { name: 'Gust', damage: 20 });
  assert(result.finalDamage === 20, 'attack succeeds after effect expires');
});

// =============================================================================
// Section 7: AttackSystem integration - damage_reduction reduces outgoing damage
// =============================================================================

runTest('AttackSystem - damage_reduction effect reduces outgoing damage', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  // Apply -20 damage penalty to player1's attacker
  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'damage_reduction',
    value: 20,
    duration: 1
  });

  const result = attackSystem.executeAttack('player1', { name: 'Gust', damage: 40 });
  assert(result.finalDamage === 20, `final damage is 20 (40 - 20 reduction), got ${result.finalDamage}`);
});

runTest('AttackSystem - damage_reduction does not reduce below 0', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', {
    type: 'damage_reduction',
    value: 50,
    duration: 1
  });

  const result = attackSystem.executeAttack('player1', { name: 'Gust', damage: 20 });
  assert(result.finalDamage === 0, 'damage clamped to 0');
});

// =============================================================================
// Section 8: AttackSystem integration - temporaryDefenderEffect applied via attack
// =============================================================================

runTest('Attack with temporaryDefenderEffect - applies cannot_attack to defender', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();

  // Player2 (Vulpix) attacks player1 with Tail Whip
  // Coin flip always heads → effect applied
  const alwaysHeads = () => true;

  const result = attackSystem.executeAttack('player2', {
    name: 'Tail Whip',
    damage: 20,
    coinFlip: alwaysHeads,
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      duration: 1,
      requiresCoinFlip: true
    }
  });

  assert(result.temporaryEffectResult !== null, 'temporaryEffectResult in attack result');
  assert(result.temporaryEffectResult.applied === true, 'effect was applied');
  assert(result.temporaryEffectResult.coinFlipResult === 'heads', 'coin flip heads');

  // Player1's Pokémon should now have cannot_attack
  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'player1 cannot attack');
});

runTest('Attack with temporaryDefenderEffect - tails prevents effect', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  const alwaysTails = () => false;

  const result = attackSystem.executeAttack('player2', {
    name: 'Tail Whip',
    damage: 20,
    coinFlip: alwaysTails,
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      duration: 1,
      requiresCoinFlip: true
    }
  });

  assert(result.temporaryEffectResult !== null, 'temporaryEffectResult exists');
  assert(result.temporaryEffectResult.applied === false, 'effect NOT applied on tails');
  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'player1 can still attack');
});

runTest('Attack with temporaryDefenderEffect - Mr. Mime (Barrier Attack) no coin flip', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  // No coin flip required
  attackSystem.executeAttack('player2', {
    name: 'Barrier Attack',
    damage: 30,
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      duration: 1
    }
  });

  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'player1 cannot attack');
});

runTest('Attack with temporaryDefenderEffect - Clefable (Moonblast) damage reduction', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  attackSystem.executeAttack('player2', {
    name: 'Moonblast',
    damage: 30,
    temporaryDefenderEffect: {
      type: 'damage_reduction',
      value: 20,
      duration: 1
    }
  });

  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player1', 'player1-active') === 20, 'player1 has -20 damage penalty');
});

runTest('temporaryDefenderEffect not applied when defender is KO\'d', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();

  // Weaken defender to almost KO
  gameState.players.player1.activePokemon.currentHp = 10;

  // Attack for 60 damage to KO
  const result = attackSystem.executeAttack('player2', {
    name: 'Tail Whip',
    damage: 60,
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      duration: 1
    }
  });

  assert(result.isKO === true, 'defender is KO\'d');
  // Effect should not be applied since defender is KO'd
  assert(result.temporaryEffectResult === null, 'no effect applied on KO');
  assert(!temporaryEffectsSystem.hasEffects('player1', 'player1-active'), 'no effects on KO\'d Pokémon');
});

// =============================================================================
// Section 9: Full scenario - Vulpix Tail Whip sequence
// =============================================================================

runTest('Full scenario: Tail Whip sequence', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();
  const alwaysHeads = () => true;

  // Player2 (Vulpix) uses Tail Whip on player1 - coin flip heads → effect applied
  attackSystem.executeAttack('player2', {
    name: 'Tail Whip',
    damage: 20,
    coinFlip: alwaysHeads,
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      duration: 1,
      requiresCoinFlip: true,
      sourceName: 'Tail Whip'
    }
  });

  // Player1's Pokémon has the effect
  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'player1 cannot attack (turn blocked)');

  // Player1 tries to attack → should be blocked
  let blocked = false;
  try {
    attackSystem.executeAttack('player1', { name: 'Gust', damage: 20 });
  } catch (err) {
    blocked = true;
  }
  assert(blocked, 'player1 attack was blocked');

  // Next turn: advance turn (effect expires)
  temporaryEffectsSystem.advanceTurn();
  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'effect expired');

  // Player1 can attack again
  const result2 = attackSystem.executeAttack('player1', { name: 'Gust', damage: 20 });
  assert(result2.finalDamage === 20, 'player1 attacks successfully after effect expires');
});

runTest('Full scenario: Clefable Moonblast reduces next attack', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  // Player2 (Clefable) uses Moonblast: deals 30 dmg + -20 to next opponent attack
  attackSystem.executeAttack('player2', {
    name: 'Moonblast',
    damage: 30,
    temporaryDefenderEffect: {
      type: 'damage_reduction',
      value: 20,
      duration: 1,
      sourceName: 'Moonblast'
    }
  });

  // Player1 attacks with 40 base damage — should be reduced to 20
  const result = attackSystem.executeAttack('player1', { name: 'Gust', damage: 40 });
  assert(result.finalDamage === 20, `player1 damage reduced to 20, got ${result.finalDamage}`);

  // After advance, reduction expires
  temporaryEffectsSystem.advanceTurn();
  const result2 = attackSystem.executeAttack('player1', { name: 'Gust', damage: 40 });
  assert(result2.finalDamage === 40, 'player1 damage back to 40 after effect expires');
});

runTest('Effects isolated per player/Pokémon', () => {
  const { temporaryEffectsSystem } = setupGame();

  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'cannot_attack', duration: 1 });

  // player2 is not affected
  assert(!temporaryEffectsSystem.cannotAttack('player2', 'player2-active'), 'player2 not affected');
  assert(temporaryEffectsSystem.getOutgoingDamageReduction('player2', 'player2-active') === 0, 'player2 no damage reduction');
});

runTest('clearEffectsForPokemon simulates switch-out clearing effect', () => {
  const { attackSystem, temporaryEffectsSystem } = setupGame();

  // Apply cannot_attack to player1
  temporaryEffectsSystem.applyEffect('player1', 'player1-active', { type: 'cannot_attack', duration: 1 });

  assert(temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'effect before switch');

  // Player1 switches out (brings in a new Pokémon)
  temporaryEffectsSystem.clearEffectsForPokemon('player1', 'player1-active', 'switch');

  // The old Pokémon's effects are gone
  assert(!temporaryEffectsSystem.cannotAttack('player1', 'player1-active'), 'effect cleared on switch');

  // New Pokémon (not the old one) can attack freely
  // (In a real game the new Pokémon has a different ID, but the old ID is now clear)
  const result = attackSystem.executeAttack('player1', { name: 'Gust', damage: 20 });
  assert(result.finalDamage === 20, 'new Pokémon can attack freely');
});

// =============================================================================
// Summary
// =============================================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
