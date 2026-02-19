/**
 * Tests for KO-Triggered Abilities (GAP-005)
 *
 * Tests the KoTriggerSystem which handles abilities that trigger when a Pokémon
 * is knocked out by attack damage.
 *
 * Examples covered:
 * - Pyukumuku (Innards Out): do 50 damage to attacker when KO'd
 * - Passimian ex (Offload Pass): move energy when KO'd
 */

const assert = require('assert');
const { createGame } = require('../../src/index');

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    throw error;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
  }
}

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createBasicDeck() {
  return Array(20).fill({
    id: 'card-1',
    name: 'Basic Pokémon',
    type: 'Colorless',
    hp: 60,
    attacks: [{ name: 'Tackle', damage: 20, cost: [] }]
  });
}

function setupPyukumukuScenario() {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();

  const game = createGame(deck1, deck2);

  // Set up Pyukumuku for player 1 (will be KO'd)
  const pyukumuku = {
    id: 'pyukumuku-p1',
    name: 'Pyukumuku',
    type: 'Water',
    hp: 60,
    energy: [],
    playedThisTurn: false,
    currentHp: 60
  };

  // Set up attacker for player 2
  const attacker = {
    id: 'attacker-p2',
    name: 'Charizard',
    type: 'Fire',
    hp: 150,
    energy: [{ type: 'Fire', count: 1 }],
    playedThisTurn: false,
    currentHp: 150
  };

  game.gameState.players.player1.activePokemon = pyukumuku;
  game.gameState.players.player2.activePokemon = attacker;

  // Register Innards Out ability
  game.koTriggerSystem.registerAbility('player1', 'pyukumuku-p1', {
    id: 'innards-out',
    name: 'Innards Out',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'damage_to_attacker',
      damage: 50
    }
  });

  return { game, pyukumuku, attacker };
}

function setupPassimianScenario() {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();

  const game = createGame(deck1, deck2);

  // Set up Passimian ex for player 1 (will be KO'd) with Fighting energy
  const passimian = {
    id: 'passimian-p1',
    name: 'Passimian ex',
    type: 'Fighting',
    hp: 150,
    energy: [
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 },
      { type: 'Colorless', count: 1 }
    ],
    playedThisTurn: false,
    currentHp: 150
  };

  // Set up attacker for player 2
  const attacker = {
    id: 'attacker-p2',
    name: 'Mewtwo',
    type: 'Psychic',
    hp: 150,
    energy: [{ type: 'Psychic', count: 1 }],
    playedThisTurn: false,
    currentHp: 150
  };

  // Set up benched Pokémon for player 1 to receive energy
  const benchTarget = {
    id: 'bench-target-p1',
    name: 'Machop',
    type: 'Fighting',
    hp: 60,
    energy: [{ type: 'Fighting', count: 1 }],
    playedThisTurn: false,
    currentHp: 60
  };

  game.gameState.players.player1.activePokemon = passimian;
  game.gameState.players.player2.activePokemon = attacker;
  game.gameState.players.player1.banque = [benchTarget];

  // Register Offload Pass ability with specific target
  game.koTriggerSystem.registerAbility('player1', 'passimian-p1', {
    id: 'offload-pass',
    name: 'Offload Pass',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'move_energy_on_ko',
      energyType: 'Fighting',
      targetPokemonId: 'bench-target-p1'
    }
  });

  return { game, passimian, attacker, benchTarget };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('Testing KO-Triggered Abilities (GAP-005)\n');

// Test 1: Register and retrieve KO-triggered ability
runTest('Register and retrieve KO-triggered ability', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  const abilityId = game.koTriggerSystem.registerAbility('player1', 'pokemon-1', {
    id: 'test-ability',
    name: 'Test Ability',
    type: 'triggered',
    effect: {
      type: 'damage_to_attacker',
      damage: 30
    }
  });

  assert(abilityId, 'Ability ID should be returned');

  const abilities = game.koTriggerSystem.getAllAbilities();
  assertEqual(abilities.length, 1, 'Should have 1 registered ability');
  assertEqual(abilities[0].name, 'Test Ability', 'Ability name should match');
});

// Test 2: Pyukumuku Innards Out - deals 50 damage to attacker on KO
runTest('Pyukumuku Innards Out deals 50 damage to attacker', () => {
  const { game, pyukumuku, attacker } = setupPyukumukuScenario();

  // Attack that KOs Pyukumuku
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Flamethrower',
    damage: 70
  });

  assertEqual(result.isKO, true, 'Pyukumuku should be KOd');
  assertEqual(pyukumuku.currentHp, 0, 'Pyukumuku HP should be 0');
  assertEqual(attacker.currentHp, 100, 'Attacker should take 50 damage (150 - 50 = 100)');

  // Check KO trigger result
  assertEqual(result.koTriggerResults.length, 1, 'Should have 1 KO trigger result');
  assertEqual(result.koTriggerResults[0].effectType, 'damage_to_attacker', 'Effect type should match');
  assertEqual(result.koTriggerResults[0].damage, 50, 'Damage should be 50');
  assertEqual(result.koTriggerResults[0].isKO, false, 'Attacker should not be KOd');
});

// Test 3: Pyukumuku Innards Out - attacker can also be KOd
runTest('Pyukumuku Innards Out can KO the attacker', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  // Set up Pyukumuku with low HP attacker
  const pyukumuku = {
    id: 'pyukumuku-p1',
    name: 'Pyukumuku',
    type: 'Water',
    hp: 60,
    energy: [],
    playedThisTurn: false,
    currentHp: 60
  };

  const weakAttacker = {
    id: 'weak-attacker-p2',
    name: 'Magikarp',
    type: 'Water',
    hp: 40,
    energy: [],
    playedThisTurn: false,
    currentHp: 40
  };

  game.gameState.players.player1.activePokemon = pyukumuku;
  game.gameState.players.player2.activePokemon = weakAttacker;

  game.koTriggerSystem.registerAbility('player1', 'pyukumuku-p1', {
    id: 'innards-out',
    name: 'Innards Out',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'damage_to_attacker',
      damage: 50
    }
  });

  // Attack that KOs Pyukumuku
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Splash',
    damage: 70
  });

  assertEqual(result.isKO, true, 'Pyukumuku should be KOd');
  assertEqual(weakAttacker.currentHp, 0, 'Weak attacker should be KOd by Innards Out');

  // Check KO trigger result
  assertEqual(result.koTriggerResults[0].isKO, true, 'Attacker should be KOd');
});

// Test 4: Passimian ex Offload Pass - moves Fighting energy to bench
runTest('Passimian ex Offload Pass moves Fighting energy to bench', () => {
  const { game, passimian, benchTarget } = setupPassimianScenario();

  // Count initial energy
  const initialFightingOnPassimian = passimian.energy.filter(e => e.type === 'Fighting').length;
  const initialFightingOnBench = benchTarget.energy.filter(e => e.type === 'Fighting').length;

  assertEqual(initialFightingOnPassimian, 2, 'Passimian should start with 2 Fighting energy');
  assertEqual(initialFightingOnBench, 1, 'Bench should start with 1 Fighting energy');

  // Attack that KOs Passimian
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Psychic',
    damage: 160
  });

  assertEqual(result.isKO, true, 'Passimian should be KOd');

  // Check energy movement
  const finalFightingOnPassimian = passimian.energy.filter(e => e.type === 'Fighting').length;
  const finalFightingOnBench = benchTarget.energy.filter(e => e.type === 'Fighting').length;

  assertEqual(finalFightingOnPassimian, 0, 'Passimian should have 0 Fighting energy after KO');
  assertEqual(finalFightingOnBench, 3, 'Bench should have 3 Fighting energy (1 initial + 2 moved)');

  // Check that non-Fighting energy remains on Passimian (it goes to discard on KO)
  assertEqual(passimian.energy.length, 1, 'Passimian should still have 1 non-Fighting energy');
  assertEqual(passimian.energy[0].type, 'Colorless', 'Remaining energy should be Colorless');

  // Check KO trigger result
  assertEqual(result.koTriggerResults.length, 1, 'Should have 1 KO trigger result');
  assertEqual(result.koTriggerResults[0].effectType, 'move_energy_on_ko', 'Effect type should match');
  assertEqual(result.koTriggerResults[0].energyMoved, 2, 'Should move 2 Fighting energy');
});

// Test 5: KO trigger only works when in Active Spot
runTest('KO trigger only works when in Active Spot', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  // Set up scenario where Pokémon is on bench (not active)
  const benchPokemon = {
    id: 'bench-pokemon-p1',
    name: 'Pyukumuku',
    type: 'Water',
    hp: 60,
    energy: [],
    playedThisTurn: false,
    currentHp: 60
  };

  const attacker = {
    id: 'attacker-p2',
    name: 'Charizard',
    type: 'Fire',
    hp: 150,
    energy: [{ type: 'Fire', count: 1 }],
    playedThisTurn: false,
    currentHp: 150
  };

  // Active Pokémon is different
  const activePokemon = {
    id: 'active-pokemon-p1',
    name: 'Pikachu',
    type: 'Electric',
    hp: 60,
    energy: [],
    playedThisTurn: false,
    currentHp: 60
  };

  game.gameState.players.player1.activePokemon = activePokemon;
  game.gameState.players.player2.activePokemon = attacker;
  game.gameState.players.player1.banque = [benchPokemon];

  // Register ability on bench Pokémon
  game.koTriggerSystem.registerAbility('player1', 'bench-pokemon-p1', {
    id: 'innards-out',
    name: 'Innards Out',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'damage_to_attacker',
      damage: 50
    }
  });

  // Attack active Pokémon (not the one with Innards Out)
  const result = game.attackSystem.executeAttack('player2', {
    name: 'Flamethrower',
    damage: 70
  });

  assertEqual(result.isKO, true, 'Active Pokémon should be KOd');
  assertEqual(attacker.currentHp, 150, 'Attacker should NOT take damage (trigger not active)');
  assertEqual(result.koTriggerResults.length, 0, 'Should have 0 KO trigger results');
});

// Test 6: Remove KO-triggered abilities
runTest('Remove KO-triggered abilities', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  game.koTriggerSystem.registerAbility('player1', 'pokemon-1', {
    id: 'test-ability-1',
    name: 'Test Ability 1',
    type: 'triggered',
    effect: { type: 'damage_to_attacker', damage: 30 }
  });

  game.koTriggerSystem.registerAbility('player1', 'pokemon-1', {
    id: 'test-ability-2',
    name: 'Test Ability 2',
    type: 'triggered',
    effect: { type: 'move_energy_on_ko', energyType: 'Water' }
  });

  assertEqual(game.koTriggerSystem.getAllAbilities().length, 2, 'Should have 2 abilities');

  game.koTriggerSystem.removeAbilities('player1', 'pokemon-1');

  assertEqual(game.koTriggerSystem.getAllAbilities().length, 0, 'Should have 0 abilities after removal');
});

// Test 7: removeAllAbilitiesForPlayer
runTest('removeAllAbilitiesForPlayer removes all abilities for a player', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  game.koTriggerSystem.registerAbility('player1', 'pokemon-1', {
    id: 'ability-1',
    name: 'Ability 1',
    type: 'triggered',
    effect: { type: 'damage_to_attacker', damage: 30 }
  });

  game.koTriggerSystem.registerAbility('player1', 'pokemon-2', {
    id: 'ability-2',
    name: 'Ability 2',
    type: 'triggered',
    effect: { type: 'damage_to_attacker', damage: 30 }
  });

  game.koTriggerSystem.registerAbility('player2', 'pokemon-3', {
    id: 'ability-3',
    name: 'Ability 3',
    type: 'triggered',
    effect: { type: 'damage_to_attacker', damage: 30 }
  });

  assertEqual(game.koTriggerSystem.getAllAbilities().length, 3, 'Should have 3 abilities total');

  game.koTriggerSystem.removeAllAbilitiesForPlayer('player1');

  assertEqual(game.koTriggerSystem.getAllAbilities().length, 1, 'Should have 1 ability after removal (player2)');
  assertEqual(game.koTriggerSystem.getAllAbilities()[0]._playerId, 'player2', 'Remaining ability should be for player2');
});

// Test 8: Passimian ex Offload Pass - no benched Pokémon
runTest('Passimian ex Offload Pass fails with no benched Pokémon', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  const passimian = {
    id: 'passimian-p1',
    name: 'Passimian ex',
    type: 'Fighting',
    hp: 150,
    energy: [
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 }
    ],
    playedThisTurn: false,
    currentHp: 150
  };

  const attacker = {
    id: 'attacker-p2',
    name: 'Mewtwo',
    type: 'Psychic',
    hp: 150,
    energy: [{ type: 'Psychic', count: 1 }],
    playedThisTurn: false,
    currentHp: 150
  };

  game.gameState.players.player1.activePokemon = passimian;
  game.gameState.players.player2.activePokemon = attacker;
  game.gameState.players.player1.banque = []; // No benched Pokémon

  game.koTriggerSystem.registerAbility('player1', 'passimian-p1', {
    id: 'offload-pass',
    name: 'Offload Pass',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'move_energy_on_ko',
      energyType: 'Fighting'
    }
  });

  const result = game.attackSystem.executeAttack('player2', {
    name: 'Psychic',
    damage: 160
  });

  assertEqual(result.isKO, true, 'Passimian should be KOd');

  // Energy should not move (no target)
  assertEqual(result.koTriggerResults.length, 1, 'Should have 1 KO trigger result');
  assertEqual(result.koTriggerResults[0].energyMoved, 0, 'Should move 0 energy (no benched Pokémon)');
  assertEqual(result.koTriggerResults[0].reason, 'no_benched_pokemon', 'Reason should be no_benched_pokemon');
});

// Test 9: Passimian ex Offload Pass - respects 4 energy limit
runTest('Passimian ex Offload Pass respects 4 energy limit per Pokémon', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  const passimian = {
    id: 'passimian-p1',
    name: 'Passimian ex',
    type: 'Fighting',
    hp: 150,
    energy: [
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 }
    ],
    playedThisTurn: false,
    currentHp: 150
  };

  const attacker = {
    id: 'attacker-p2',
    name: 'Mewtwo',
    type: 'Psychic',
    hp: 150,
    energy: [{ type: 'Psychic', count: 1 }],
    playedThisTurn: false,
    currentHp: 150
  };

  // Bench Pokémon with 3 Fighting energy already (limit is 4, so only 1 can be added)
  const benchTarget = {
    id: 'bench-target-p1',
    name: 'Machamp',
    type: 'Fighting',
    hp: 150,
    energy: [
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 }
    ],
    playedThisTurn: false,
    currentHp: 150
  };

  game.gameState.players.player1.activePokemon = passimian;
  game.gameState.players.player2.activePokemon = attacker;
  game.gameState.players.player1.banque = [benchTarget];

  game.koTriggerSystem.registerAbility('player1', 'passimian-p1', {
    id: 'offload-pass',
    name: 'Offload Pass',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'move_energy_on_ko',
      energyType: 'Fighting',
      targetPokemonId: 'bench-target-p1'
    }
  });

  const result = game.attackSystem.executeAttack('player2', {
    name: 'Psychic',
    damage: 160
  });

  assertEqual(result.isKO, true, 'Passimian should be KOd');

  // Only 1 energy should move (to reach limit of 4)
  assertEqual(result.koTriggerResults[0].energyMoved, 1, 'Should move only 1 energy (respecting 4 limit)');
  assertEqual(benchTarget.energy.length, 4, 'Bench should have 4 energy total');
});

// Test 10: Turn log contains KO trigger events
runTest('Turn log contains KO trigger events', () => {
  const { game } = setupPyukumukuScenario();

  game.attackSystem.executeAttack('player2', {
    name: 'Flamethrower',
    damage: 70
  });

  const koTriggerLog = game.gameState.turnLog.filter(e =>
    e.type === 'ko_trigger_damage_to_attacker'
  );

  assertEqual(koTriggerLog.length, 1, 'Should have 1 KO trigger log entry');
  assertEqual(koTriggerLog[0].abilityName, 'Innards Out', 'Ability name should be logged');
  assertEqual(koTriggerLog[0].damage, 50, 'Damage should be logged');
  assertEqual(koTriggerLog[0].targetPokemonName, 'Charizard', 'Target Pokémon name should be logged');
});

// Test 11: Multiple KO-triggered abilities on same Pokémon
runTest('Multiple KO-triggered abilities on same Pokémon', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  const pokemon = {
    id: 'pokemon-p1',
    name: 'Custom Pokémon',
    type: 'Colorless',
    hp: 100,
    energy: [],
    playedThisTurn: false,
    currentHp: 100
  };

  const attacker = {
    id: 'attacker-p2',
    name: 'Attacker',
    type: 'Fire',
    hp: 150,
    energy: [],
    playedThisTurn: false,
    currentHp: 150
  };

  game.gameState.players.player1.activePokemon = pokemon;
  game.gameState.players.player2.activePokemon = attacker;

  // Register multiple abilities
  game.koTriggerSystem.registerAbility('player1', 'pokemon-p1', {
    id: 'ability-1',
    name: 'Ability 1',
    type: 'triggered',
    effect: { type: 'damage_to_attacker', damage: 30 }
  });

  game.koTriggerSystem.registerAbility('player1', 'pokemon-p1', {
    id: 'ability-2',
    name: 'Ability 2',
    type: 'triggered',
    effect: { type: 'damage_to_attacker', damage: 20 }
  });

  const result = game.attackSystem.executeAttack('player2', {
    name: 'Attack',
    damage: 120
  });

  assertEqual(result.isKO, true, 'Pokémon should be KOd');
  assertEqual(result.koTriggerResults.length, 2, 'Should trigger both abilities');
  assertEqual(attacker.currentHp, 100, 'Attacker should take total 50 damage (30 + 20)');
});

// Test 12: Offload Pass only moves specified energy type
runTest('Offload Pass only moves specified energy type', () => {
  const deck1 = createBasicDeck();
  const deck2 = createBasicDeck();
  const game = createGame(deck1, deck2);

  const passimian = {
    id: 'passimian-p1',
    name: 'Passimian ex',
    type: 'Fighting',
    hp: 150,
    energy: [
      { type: 'Fighting', count: 1 },
      { type: 'Fighting', count: 1 },
      { type: 'Water', count: 1 },
      { type: 'Colorless', count: 1 }
    ],
    playedThisTurn: false,
    currentHp: 150
  };

  const benchTarget = {
    id: 'bench-target-p1',
    name: 'Machop',
    type: 'Fighting',
    hp: 60,
    energy: [],
    playedThisTurn: false,
    currentHp: 60
  };

  const attacker = {
    id: 'attacker-p2',
    name: 'Mewtwo',
    type: 'Psychic',
    hp: 150,
    energy: [{ type: 'Psychic', count: 1 }],
    playedThisTurn: false,
    currentHp: 150
  };

  game.gameState.players.player1.activePokemon = passimian;
  game.gameState.players.player2.activePokemon = attacker;
  game.gameState.players.player1.banque = [benchTarget];

  game.koTriggerSystem.registerAbility('player1', 'passimian-p1', {
    id: 'offload-pass',
    name: 'Offload Pass',
    type: 'triggered',
    triggerEvent: 'knockout',
    effect: {
      type: 'move_energy_on_ko',
      energyType: 'Fighting',
      targetPokemonId: 'bench-target-p1'
    }
  });

  const result = game.attackSystem.executeAttack('player2', {
    name: 'Psychic',
    damage: 160
  });

  assertEqual(result.isKO, true, 'Passimian should be KOd');

  // Only Fighting energy should move
  assertEqual(result.koTriggerResults[0].energyMoved, 2, 'Should move 2 Fighting energy');
  assertEqual(benchTarget.energy.length, 2, 'Bench should have 2 Fighting energy');
  assertEqual(benchTarget.energy.every(e => e.type === 'Fighting'), true, 'All moved energy should be Fighting');

  // Non-Fighting energy remains on Passimian
  assertEqual(passimian.energy.length, 2, 'Passimian should still have 2 non-Fighting energy');
});

console.log('\n✓ All KO-triggered ability tests passed!');
