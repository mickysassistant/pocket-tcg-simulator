/**
 * Test: Damage Prevention Abilities (GAP-006)
 *
 * Tests the attack system's integration of passive damage prevention modifiers,
 * as seen in cards like Oricorio (Safeguard).
 *
 * GAP-006: [Importante][C1] Prevención de daño de Pokémon ex (Oricorio (Safeguard))
 *
 * Acceptance Criteria:
 * 1. Implementar validación de tipo de Pokémon para prevención
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos en retreat/replay/deck/rules/actions)
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

// 1. AbilitySystem has preventDamage method
runTest('AbilitySystem has preventDamage method', () => {
  const game = makeGame();
  assert(game.abilitySystem !== undefined, 'AbilitySystem should exist');
  assert(typeof game.abilitySystem.preventDamage === 'function', 'preventDamage should be a method');
});

// 2. preventDamage returns false when no abilities are registered
runTest('preventDamage returns false with no abilities', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Pikachu', hp: 100 });
  setActive(game, 'player2', { name: 'Charizard', hp: 120 });

  const prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );

  assert(!prevented, 'Damage should not be prevented without abilities');
});

// 3. Oricorio (Safeguard) prevents damage from Pokémon ex
runTest('Oricorio Safeguard prevents damage from Pokémon ex', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120 });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // Check if damage should be prevented
  const prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );

  assert(prevented, 'Damage from Pokémon ex should be prevented');
});

// 4. Oricorio (Safeguard) does NOT prevent damage from non-ex Pokémon
runTest('Oricorio Safeguard does not prevent damage from non-ex Pokémon', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Pikachu', hp: 60 });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // Check if damage should be prevented
  const prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );

  assert(!prevented, 'Damage from non-ex Pokémon should not be prevented');
});

// 5. AttackSystem applies damage prevention
runTest('AttackSystem applies damage prevention', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Psychic', damage: 50 };
  const result = game.attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
  assertEqual(result.defenderHpAfter, 70, 'Defender HP should remain unchanged');
  assertEqual(result.isKO, false, 'Defender should not be KOd');
});

// 6. AttackSystem does NOT apply prevention against non-ex
runTest('AttackSystem does not prevent damage from non-ex attacker', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Pikachu', hp: 60, energy: [{ type: 'L' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Thunder Shock', damage: 30 };
  const result = game.attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, false, 'Damage should not be prevented');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30');
  assertEqual(result.defenderHpAfter, 40, 'Defender HP should be reduced');
});

// 7. Prevention works with is_active condition
runTest('Damage prevention respects is_active condition', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio with is_active condition
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'is_active'
    }
  });

  // Oricorio is active, so damage should be prevented
  const prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );

  assert(prevented, 'Damage should be prevented when condition is met');
});

// 8. Prevention does not apply when condition is not met
runTest('Damage prevention does not apply when condition not met', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });

  // Add Oricorio to bench (not active)
  addToBench(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });
  const oricorio = game.gameState.players.player2.banque[0];

  // Set a different active Pokémon
  setActive(game, 'player2', { name: 'Pikachu', hp: 60, currentHp: 60 });

  // Register Safeguard ability on benched Oricorio with is_active condition
  game.abilitySystem.registerAbility('player2', oricorio.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: oricorio.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'is_active'
    }
  });

  // Oricorio is not active, so damage should not be prevented
  const prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );

  assert(!prevented, 'Damage should not be prevented when condition not met');
});

// 9. Multiple Pokémon ex attackers are prevented
runTest('Multiple Pokémon ex attackers are prevented', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Charizard ex', hp: 140, energy: [{ type: 'R' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Flare Blitz', damage: 80 };
  const result = game.attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, true, 'Damage from Charizard ex should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
});

// 10. Mega Pokémon ex are also prevented
runTest('Mega Pokémon ex are prevented', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mega Kangaskhan ex', hp: 180, energy: [{ type: 'C' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability on Oricorio
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Jaw Lock', damage: 60 };
  const result = game.attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, true, 'Damage from Mega Pokémon ex should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
});

// 11. Damage prevention + reduction do not stack (prevention takes precedence)
runTest('Damage prevention takes precedence over reduction', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability (prevention)
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // Also register a damage reduction ability
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'resilience',
    name: 'Resilience',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_reduction',
      amount: 30
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Psychic', damage: 50 };
  const result = game.attackSystem.executeAttack('player1', attack);

  // Prevention should take precedence - no damage at all
  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
  assertEqual(result.reductionApplied, 0, 'Reduction should not apply');
});

// 12. Damage prevention only applies to defending Pokémon's abilities
runTest('Damage prevention only applies to defending side', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard on ATTACKING side (should not prevent damage to defender)
  game.abilitySystem.registerAbility('player1', game.gameState.players.player1.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player1.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Psychic', damage: 50 };
  const result = game.attackSystem.executeAttack('player1', attack);

  // Damage should NOT be prevented (prevention only works for defending side)
  assertEqual(result.damagePrevented, false, 'Damage should not be prevented');
  assertEqual(result.finalDamage, 50, 'Final damage should be 50');
});

// 13. removeAbilities removes damage prevention
runTest('removeAbilities removes damage prevention', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // Verify damage is prevented
  let prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );
  assert(prevented, 'Damage should be prevented before removal');

  // Remove abilities
  game.abilitySystem.removeAbilities('player2', game.gameState.players.player2.activePokemon.id);

  // Verify damage is no longer prevented
  prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );
  assert(!prevented, 'Damage should not be prevented after removal');
});

// 14. Turn log includes damage prevention events
runTest('Turn log includes damage prevention events', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Psychic', damage: 50 };
  game.attackSystem.executeAttack('player1', attack);

  const lastLog = game.gameState.turnLog[game.gameState.turnLog.length - 1];
  assertEqual(lastLog.type, 'attack', 'Last log should be an attack');
  assertEqual(lastLog.damagePrevented, true, 'Log should indicate damage was prevented');
});

// 15. preventFrom: 'all' prevents all damage
runTest('preventFrom: "all" prevents all damage', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Pikachu', hp: 60, energy: [{ type: 'L' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register ability with preventFrom: 'all'
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'test-ability',
    name: 'Test Prevention',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'all'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Thunder Shock', damage: 30 };
  const result = game.attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, true, 'Damage should be prevented');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
});

// 16. Unknown preventFrom does not prevent damage
runTest('Unknown preventFrom does not prevent damage (safe default)', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Pikachu', hp: 60, energy: [{ type: 'L' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register ability with unknown preventFrom
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'test-ability',
    name: 'Test Prevention',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'unknown_type'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Thunder Shock', damage: 30 };
  const result = game.attackSystem.executeAttack('player1', attack);

  // Unknown criteria → don't prevent (safe default)
  assertEqual(result.damagePrevented, false, 'Damage should not be prevented');
  assertEqual(result.finalDamage, 30, 'Final damage should be 30');
});

// 17. No preventFrom field prevents all damage (default behavior)
runTest('No preventFrom field prevents all damage', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Pikachu', hp: 60, energy: [{ type: 'L' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register ability without preventFrom field
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'test-ability',
    name: 'Test Prevention',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention'
    },
    condition: {
      type: 'always'
    }
  });

  const attack = { name: 'Thunder Shock', damage: 30 };
  const result = game.attackSystem.executeAttack('player1', attack);

  assertEqual(result.damagePrevented, true, 'Damage should be prevented (default to all)');
  assertEqual(result.finalDamage, 0, 'Final damage should be 0');
});

// 18. calculateDamage does not check prevention (preview only)
runTest('calculateDamage does not check prevention', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // calculateDamage is a preview/dry-run and does NOT check prevention
  const result = game.attackSystem.calculateDamage('player1', 'player2', 50);

  // calculateDamage only applies modifiers, not prevention
  assertEqual(result.finalDamage, 50, 'calculateDamage should not apply prevention');
});

// 19. removeAllAbilitiesForPlayer removes damage prevention
runTest('removeAllAbilitiesForPlayer removes damage prevention', () => {
  const game = makeGame();

  setActive(game, 'player1', { name: 'Mewtwo ex', hp: 120, energy: [{ type: 'P' }] });
  setActive(game, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

  // Register Safeguard ability
  game.abilitySystem.registerAbility('player2', game.gameState.players.player2.activePokemon.id, {
    id: 'safeguard',
    name: 'Safeguard',
    type: 'passive',
    pokemonId: game.gameState.players.player2.activePokemon.id,
    effect: {
      type: 'damage_prevention',
      preventFrom: 'pokemon_ex'
    },
    condition: {
      type: 'always'
    }
  });

  // Verify damage is prevented
  let prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );
  assert(prevented, 'Damage should be prevented before removal');

  // Remove all abilities for player2
  game.abilitySystem.removeAllAbilitiesForPlayer('player2');

  // Verify damage is no longer prevented
  prevented = game.abilitySystem.preventDamage(
    'player1',
    game.gameState.players.player1.activePokemon.id,
    'player2',
    game.gameState.players.player2.activePokemon.id
  );
  assert(!prevented, 'Damage should not be prevented after removal');
});

// 20. Case-sensitive ex matching
runTest('Case-sensitive ex matching in Pokémon names', () => {
  const game = makeGame();

  // Test various ex name formats
  const testCases = [
    { name: 'Mewtwo ex', shouldPrevent: true },
    { name: 'Charizard ex', shouldPrevent: true },
    { name: 'Mega Kangaskhan ex', shouldPrevent: true },
    { name: 'Pikachu EX', shouldPrevent: false }, // uppercase EX
    { name: 'Pikachu Ex', shouldPrevent: false }, // mixed case
    { name: 'Pikachu', shouldPrevent: false },
  ];

  for (const testCase of testCases) {
    const testGame = makeGame();

    setActive(testGame, 'player1', { name: testCase.name, hp: 100, energy: [{ type: 'C' }] });
    setActive(testGame, 'player2', { name: 'Oricorio', hp: 70, currentHp: 70 });

    // Register Safeguard ability
    testGame.abilitySystem.registerAbility('player2', testGame.gameState.players.player2.activePokemon.id, {
      id: 'safeguard',
      name: 'Safeguard',
      type: 'passive',
      pokemonId: testGame.gameState.players.player2.activePokemon.id,
      effect: {
        type: 'damage_prevention',
        preventFrom: 'pokemon_ex'
      },
      condition: {
        type: 'always'
      }
    });

    const prevented = testGame.abilitySystem.preventDamage(
      'player1',
      testGame.gameState.players.player1.activePokemon.id,
      'player2',
      testGame.gameState.players.player2.activePokemon.id
    );

    assertEqual(prevented, testCase.shouldPrevent, `"${testCase.name}" should ${testCase.shouldPrevent ? '' : 'not '}be prevented`);
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${testsPassed} tests passed, ${testsFailed} tests failed`);

if (testsFailed > 0) {
  process.exit(1);
}
