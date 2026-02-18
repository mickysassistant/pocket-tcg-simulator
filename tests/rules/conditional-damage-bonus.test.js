/**
 * Test: Conditional Damage Bonus Abilities (GAP-001)
 *
 * Tests the ability system's support for passive conditional damage bonuses,
 * as seen in cards like Carnivine and Tyranitar (Power Link).
 *
 * GAP-001: [Crítico][C1] Bonus de daño condicional
 *
 * Acceptance Criteria:
 * 1. Implementar sistema de abilities con evaluación continua de condiciones
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa
 * 4. npm run check pasa
 */

const { createGame, AbilitySystem } = require('../../src/index');

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

/**
 * Place a Pokémon in the active spot of a player with given properties
 */
function setActive(game, playerId, props) {
  game.gameState.players[playerId].activePokemon = {
    id: props.id || `active-${playerId}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 60,
    energy: props.energy || [],
    ...props
  };
}

/**
 * Add a Pokémon to a player's bench
 */
function addToBench(game, playerId, props) {
  if (!game.gameState.players[playerId].banque) {
    game.gameState.players[playerId].banque = [];
  }
  game.gameState.players[playerId].banque.push({
    id: props.id || `bench-${playerId}-${Date.now()}`,
    name: props.name || 'Unnamed',
    type: props.type || 'colorless',
    hp: props.hp || 60,
    energy: props.energy || [],
    ...props
  });
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

// 1. AbilitySystem is exported and instantiable
runTest('AbilitySystem is exported from index', () => {
  assert(AbilitySystem !== undefined, 'AbilitySystem should be exported');
  const game = makeGame();
  assert(game.abilitySystem !== undefined, 'game.abilitySystem should exist');
  assert(game.abilitySystem instanceof AbilitySystem, 'Should be instance of AbilitySystem');
});

// 2. Register ability and retrieve it
runTest('Register and retrieve ability', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'carnivine-1', {
    id: 'sweet-scent',
    name: 'Sweet Scent',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'always' }
  });

  const all = abilitySystem.getAllAbilities();
  assertEqual(all.length, 1, 'Should have 1 ability registered');
  assertEqual(all[0].id, 'sweet-scent', 'Ability ID should match');
});

// 3. Passive "always" condition gives damage bonus
runTest('Passive always-on ability adds damage bonus', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'carnivine-1', {
    id: 'always-bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageBonus('player1'), 20, 'Should return 20 bonus');
  assertEqual(abilitySystem.getDamageBonus('player2'), 0, 'Player2 should have no bonus');
});

// 4. Carnivine pattern: bonus when Arceus is in play (pokemon_in_play condition)
runTest('Carnivine pattern: +30 when specific Pokémon is in play on own side', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player1', { id: 'carnivine-1', name: 'Carnivine' });

  // Register Carnivine's ability: +30 if Arceus is in play
  abilitySystem.registerAbility('player1', 'carnivine-1', {
    id: 'carnivine-power',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Arceus' }
  });

  // Without Arceus in play → no bonus
  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'No Arceus → no bonus');

  // Place Arceus on bench
  addToBench(game, 'player1', { id: 'arceus-1', name: 'Arceus' });

  // Now Arceus is in play → +30 bonus
  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Arceus on bench → +30 bonus');
});

// 5. Condition fails if Arceus is on opponent's side
runTest('pokemon_in_play self: opponent Arceus does NOT trigger own bonus', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player1', { id: 'carnivine-1', name: 'Carnivine' });
  abilitySystem.registerAbility('player1', 'carnivine-1', {
    id: 'carnivine-power',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Arceus' }
  });

  // Arceus on opponent's bench
  addToBench(game, 'player2', { id: 'arceus-opp', name: 'Arceus' });

  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'Opponent Arceus should not trigger own bonus');
});

// 6. pokemon_in_play checks active spot too
runTest('pokemon_in_play detects Pokémon in active spot', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player1', { id: 'larvitar-1', name: 'Larvitar' });
  addToBench(game, 'player1', { id: 'tyranitar-1', name: 'Tyranitar' });

  abilitySystem.registerAbility('player1', 'tyranitar-1', {
    id: 'power-link',
    name: 'Power Link',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Larvitar' }
  });

  // Larvitar is active → condition met
  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Larvitar active → +30 from Power Link');

  // Remove Larvitar
  game.gameState.players['player1'].activePokemon = null;
  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'No Larvitar → no bonus');
});

// 7. Tyranitar Power Link: +30 when own Larvitar or Pupitar is in play
// Note: Tyranitar is active and checks if pre-evolution is also in play
runTest('Tyranitar Power Link pattern: bonus when pre-evolution in play', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  // Tyranitar is active
  setActive(game, 'player1', { id: 'tyranitar-1', name: 'Tyranitar' });

  // Register ability: +30 if Larvitar is in play on own side
  abilitySystem.registerAbility('player1', 'tyranitar-1', {
    id: 'power-link-larvitar',
    name: 'Power Link',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Larvitar' }
  });

  // Also registers for Pupitar
  abilitySystem.registerAbility('player1', 'tyranitar-1', {
    id: 'power-link-pupitar',
    name: 'Power Link',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Pupitar' }
  });

  // Neither Larvitar nor Pupitar in play → 0
  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'No pre-evo in play → 0');

  // Place Pupitar on bench → +30
  addToBench(game, 'player1', { id: 'pupitar-1', name: 'Pupitar' });
  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Pupitar on bench → +30');

  // Also place Larvitar on bench → both conditions met → +60
  addToBench(game, 'player1', { id: 'larvitar-1', name: 'Larvitar' });
  assertEqual(abilitySystem.getDamageBonus('player1'), 60, 'Both pre-evos in play → +60');
});

// 8. Multiple abilities stack
runTest('Multiple passive damage bonus abilities stack additively', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'poke-a', {
    id: 'bonus-a',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 10 },
    condition: { type: 'always' }
  });
  abilitySystem.registerAbility('player1', 'poke-b', {
    id: 'bonus-b',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Two always-on abilities stack to +30');
});

// 9. applyDamageModifiers combines base + bonus - reduction
runTest('applyDamageModifiers: base + bonus = final damage', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'attacker', {
    id: 'bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'always' }
  });

  const result = abilitySystem.applyDamageModifiers('player1', 'player2', 50);
  assertEqual(result.baseDamage, 50, 'Base damage should be 50');
  assertEqual(result.bonusApplied, 30, 'Bonus should be 30');
  assertEqual(result.reductionApplied, 0, 'No reduction active');
  assertEqual(result.finalDamage, 80, 'Final damage = 50 + 30 = 80');
});

// 10. applyDamageModifiers with both bonus and reduction
runTest('applyDamageModifiers: bonus on attacker, reduction on defender', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'attacker', {
    id: 'bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'always' }
  });

  abilitySystem.registerAbility('player2', 'defender', {
    id: 'reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 20 },
    condition: { type: 'always' }
  });

  const result = abilitySystem.applyDamageModifiers('player1', 'player2', 50);
  assertEqual(result.finalDamage, 60, 'Final damage = 50 + 30 - 20 = 60');
});

// 11. Damage never goes below 0
runTest('applyDamageModifiers: damage cannot go below 0', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player2', 'defender', {
    id: 'huge-reduction',
    type: 'passive',
    effect: { type: 'damage_reduction', amount: 100 },
    condition: { type: 'always' }
  });

  const result = abilitySystem.applyDamageModifiers('player1', 'player2', 10);
  assertEqual(result.finalDamage, 0, 'Damage cannot go below 0');
});

// 12. removeAbilities removes all abilities for a Pokémon
runTest('removeAbilities removes a specific Pokémon abilities', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'poke-1', {
    id: 'bonus-1',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Before remove: +30');

  abilitySystem.removeAbilities('player1', 'poke-1');
  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'After remove: 0');
});

// 13. Condition: pokemon_type_in_play
runTest('Condition pokemon_type_in_play matches by type field', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player1', { id: 'attacker-1', name: 'Attacker' });

  abilitySystem.registerAbility('player1', 'attacker-1', {
    id: 'type-bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'pokemon_type_in_play', player: 'self', pokemonType: 'fire' }
  });

  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'No fire type → 0');

  addToBench(game, 'player1', { id: 'fire-poke', name: 'Charizard', type: 'fire' });
  assertEqual(abilitySystem.getDamageBonus('player1'), 20, 'Fire type on bench → +20');
});

// 14. Condition: is_active
runTest('Condition is_active: ability only fires when Pokémon is in active spot', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  addToBench(game, 'player1', { id: 'bench-poke', name: 'Bench Poke' });

  abilitySystem.registerAbility('player1', 'bench-poke', {
    id: 'active-bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'is_active' }
  });

  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'Bench → condition not met');

  // Move to active
  game.gameState.players['player1'].activePokemon = {
    id: 'bench-poke',
    name: 'Bench Poke'
  };
  game.gameState.players['player1'].banque = [];

  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Active → condition met → +30');
});

// 15. getActiveAbilities returns only condition-met abilities
runTest('getActiveAbilities returns only currently active abilities', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'poke-1', {
    id: 'always-on',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 10 },
    condition: { type: 'always' }
  });

  abilitySystem.registerAbility('player1', 'poke-1', {
    id: 'conditional',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Arceus' }
  });

  const active = abilitySystem.getActiveAbilities('player1');
  assertEqual(active.length, 1, 'Only the always-on ability should be active');
  assertEqual(active[0].id, 'always-on', 'Active ability should be always-on');

  addToBench(game, 'player1', { id: 'arceus-1', name: 'Arceus' });
  const active2 = abilitySystem.getActiveAbilities('player1');
  assertEqual(active2.length, 2, 'Both abilities should be active with Arceus in play');
});

// 16. Condition evaluates continuously as game state changes
runTest('Continuous evaluation: bonus changes as Pokémon enter/leave play', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  setActive(game, 'player1', { id: 'carnivine-1', name: 'Carnivine' });
  abilitySystem.registerAbility('player1', 'carnivine-1', {
    id: 'carnivine-power',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'Arceus' }
  });

  // Step 1: No Arceus → 0
  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'Step 1: no Arceus → 0');

  // Step 2: Add Arceus → +30
  addToBench(game, 'player1', { id: 'arceus-1', name: 'Arceus' });
  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Step 2: Arceus added → +30');

  // Step 3: Remove Arceus → 0
  game.gameState.players['player1'].banque = [];
  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'Step 3: Arceus removed → 0');

  // Step 4: Arceus in active spot → +30
  setActive(game, 'player1', { id: 'arceus-1', name: 'Arceus' });
  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Step 4: Arceus active → +30');
});

// 17. Case-insensitive name matching
runTest('pokemon_in_play condition is case-insensitive', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'poke-1', {
    id: 'bonus',
    type: 'passive',
    effect: { type: 'damage_bonus', amount: 30 },
    condition: { type: 'pokemon_in_play', player: 'self', pokemonName: 'ARCEUS' }
  });

  addToBench(game, 'player1', { id: 'arceus-1', name: 'Arceus' });
  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Case-insensitive match → +30');
});

// 18. removeAllAbilitiesForPlayer clears all for that player
runTest('removeAllAbilitiesForPlayer clears all abilities for player', () => {
  const game = makeGame();
  const { abilitySystem } = game;

  abilitySystem.registerAbility('player1', 'poke-1', {
    id: 'a1', type: 'passive',
    effect: { type: 'damage_bonus', amount: 10 },
    condition: { type: 'always' }
  });
  abilitySystem.registerAbility('player1', 'poke-2', {
    id: 'a2', type: 'passive',
    effect: { type: 'damage_bonus', amount: 20 },
    condition: { type: 'always' }
  });
  abilitySystem.registerAbility('player2', 'poke-3', {
    id: 'a3', type: 'passive',
    effect: { type: 'damage_bonus', amount: 15 },
    condition: { type: 'always' }
  });

  assertEqual(abilitySystem.getDamageBonus('player1'), 30, 'Before: player1 has +30');
  assertEqual(abilitySystem.getDamageBonus('player2'), 15, 'Before: player2 has +15');

  abilitySystem.removeAllAbilitiesForPlayer('player1');

  assertEqual(abilitySystem.getDamageBonus('player1'), 0, 'After: player1 has 0');
  assertEqual(abilitySystem.getDamageBonus('player2'), 15, 'After: player2 unaffected');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60));
console.log('CONDITIONAL DAMAGE BONUS (GAP-001) TEST SUMMARY');
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
