/**
 * Test Suite for Task 13: Abilities
 *
 * Tests ability parsing, once-per-turn tracking, passive abilities, and triggers.
 */

import {
  createInitialState,
  createPokemon,
  cloneState,
  activateAbility,
  canUseAbility,
  getAbilities,
  isOncePerTurnAbility,
  wasAbilityUsedThisTurn,
  markAbilityUsed,
  resetAbilityUsage,
  getActivePassiveAbilities,
  canPlaySupporter,
  getAvailableAbilities,
  endTurn
} from './js/engine/game-state.js';

// Mock getCard function
const mockCards = {
  'A1-007': {
    id: 'A1-007',
    name: 'Butterfree',
    hp: 120,
    abilities: [
      {
        name: 'Powder Heal',
        effect: 'Once during your turn, you may heal 20 damage from each of your Pokémon.'
      }
    ]
  },
  'A1-089': {
    id: 'A1-089',
    name: 'Greninja',
    hp: 120,
    abilities: [
      {
        name: 'Water Shuriken',
        effect: 'Once during your turn, you may do 20 damage to 1 of your opponent\'s Pokémon.'
      }
    ]
  },
  'A1-123': {
    id: 'A1-123',
    name: 'Gengar ex',
    hp: 170,
    abilities: [
      {
        name: 'Shadowy Spellbind',
        effect: 'As long as this Pokémon is in the Active Spot, your opponent can\'t use any Supporter cards from their hand.'
      }
    ]
  },
  'A1-001': {
    id: 'A1-001',
    name: 'Bulbasaur',
    hp: 70,
    abilities: []
  }
};

function getCard(cardId) {
  return mockCards[cardId];
}

// Test runner
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function runTest(testName, testFn) {
  try {
    testFn();
    testsPassed++;
    testResults.push(`✅ ${testName}`);
    console.log(`✅ ${testName}`);
  } catch (error) {
    testsFailed++;
    testResults.push(`❌ ${testName}: ${error.message}`);
    console.error(`❌ ${testName}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ============================================================================
// Test 1: Parse Abilities
// ============================================================================

runTest('Test 1.1: Get abilities from card with abilities', () => {
  const abilities = getAbilities('A1-007', getCard);
  assertEqual(abilities.length, 1, 'Should have 1 ability');
  assertEqual(abilities[0].name, 'Powder Heal', 'Ability name should match');
  assertEqual(abilities[0].isOncePerTurn, true, 'Should be once per turn');
});

runTest('Test 1.2: Get abilities from card without abilities', () => {
  const abilities = getAbilities('A1-001', getCard);
  assertEqual(abilities.length, 0, 'Should have 0 abilities');
});

runTest('Test 1.3: Identify "once per turn" ability', () => {
  const oncePerTurn = isOncePerTurnAbility('Once during your turn, you may heal 20 damage from each of your Pokémon.');
  assertEqual(oncePerTurn, true, 'Should identify once per turn ability');
});

runTest('Test 1.4: Identify passive ability', () => {
  const passive = isOncePerTurnAbility('As long as this Pokémon is in the Active Spot, your opponent can\'t use any Supporter cards from their hand.');
  assertEqual(passive, false, 'Should identify passive ability');
});

// ============================================================================
// Test 2: Once Per Turn Tracking
// ============================================================================

runTest('Test 2.1: Mark ability as used', () => {
  const pokemon = createPokemon('A1-007', 0);
  const updated = markAbilityUsed(pokemon, 'Powder Heal', 1);

  assert(updated.abilitiesUsedThisTurn['Powder Heal'] === 1, 'Ability should be marked as used');
  assertEqual(updated.abilitiesUsedThisTurn['Powder Heal'], 1, 'Turn should be 1');
});

runTest('Test 2.2: Check if ability was used this turn', () => {
  const pokemon = {
    ...createPokemon('A1-007', 0),
    abilitiesUsedThisTurn: { 'Powder Heal': 1 }
  };

  const wasUsed = wasAbilityUsedThisTurn(pokemon, 'Powder Heal', 1);
  assertEqual(wasUsed, true, 'Ability should be marked as used on turn 1');
});

runTest('Test 2.3: Check if ability was not used this turn', () => {
  const pokemon = {
    ...createPokemon('A1-007', 0),
    abilitiesUsedThisTurn: { 'Powder Heal': 1 }
  };

  const wasUsed = wasAbilityUsedThisTurn(pokemon, 'Powder Heal', 2);
  assertEqual(wasUsed, false, 'Ability should not be marked as used on turn 2');
});

runTest('Test 2.4: Reset ability usage', () => {
  const pokemon = {
    ...createPokemon('A1-007', 0),
    abilitiesUsedThisTurn: { 'Powder Heal': 1, 'OtherAbility': 1 }
  };

  const updated = resetAbilityUsage(pokemon);

  assertEqual(updated.abilitiesUsedThisTurn['Powder Heal'], undefined, 'Old turn ability should be removed');
  assertEqual(updated.abilitiesUsedThisTurn['OtherAbility'], undefined, 'Old turn ability should be removed');
});

// ============================================================================
// Test 3: Can Use Ability
// ============================================================================

runTest('Test 3.1: Can use ability on active Pokemon', () => {
  const state = createInitialState();
  state.player1.active = createPokemon('A1-007', 1);

  const check = canUseAbility(state, 'player1', 'active', 'Powder Heal', getCard);
  assertEqual(check.canUse, true, 'Should be able to use ability');
  assertEqual(check.reason, '', 'Reason should be empty');
});

runTest('Test 3.2: Cannot use ability from bench', () => {
  const state = createInitialState();
  state.player1.bench[0] = createPokemon('A1-007', 1);

  const check = canUseAbility(state, 'player1', 0, 'Powder Heal', getCard);
  assertEqual(check.canUse, false, 'Should not be able to use ability from bench');
  assert(check.reason.includes('Active Spot'), 'Reason should mention Active Spot');
});

runTest('Test 3.3: Cannot use ability if already used this turn', () => {
  const state = createInitialState();
  state.turn = 2; // Set turn to match ability usage
  state.player1.active = {
    ...createPokemon('A1-007', 1),
    abilitiesUsedThisTurn: { 'Powder Heal': 2 }
  };

  const check = canUseAbility(state, 'player1', 'active', 'Powder Heal', getCard);
  assertEqual(check.canUse, false, 'Should not be able to use ability again');
  assert(check.reason.includes('already used'), 'Reason should mention already used');
});

runTest('Test 3.4: Cannot use non-existent ability', () => {
  const state = createInitialState();
  state.player1.active = createPokemon('A1-007', 1);

  const check = canUseAbility(state, 'player1', 'active', 'FakeAbility', getCard);
  assertEqual(check.canUse, false, 'Should not be able to use non-existent ability');
});

// ============================================================================
// Test 4: Activate Ability - Powder Heal
// ============================================================================

runTest('Test 4.1: Powder Heal heals active Pokemon', () => {
  const state = createInitialState();
  state.turn = 2;

  const card = getCard('A1-007');
  state.player1.active = {
    ...createPokemon('A1-007', 1),
    currentHp: card.hp - 40 // Take 40 damage
  };

  const newState = activateAbility(state, 'player1', 'active', 'Powder Heal', getCard);

  const expectedHp = card.hp - 40 + 20;
  assertEqual(newState.player1.active.currentHp, expectedHp, 'Active Pokemon should be healed by 20');

  const lastLog = newState.log[newState.log.length - 1];
  assertEqual(lastLog.action, 'ability', 'Log should be ability action');
  assertEqual(lastLog.ability, 'Powder Heal', 'Log should record ability name');
});

runTest('Test 4.2: Powder Heal heals bench Pokemon', () => {
  const state = createInitialState();
  state.turn = 2;

  const card1 = getCard('A1-007');
  const card2 = getCard('A1-001');

  state.player1.active = {
    ...createPokemon('A1-007', 1),
    currentHp: card1.hp - 40
  };

  state.player1.bench[0] = {
    ...createPokemon('A1-001', 1),
    currentHp: card2.hp - 30
  };

  const newState = activateAbility(state, 'player1', 'active', 'Powder Heal', getCard);

  assertEqual(newState.player1.active.currentHp, card1.hp - 20, 'Active should be healed by 20');
  assertEqual(newState.player1.bench[0].currentHp, card2.hp - 10, 'Bench should be healed by 20');
});

runTest('Test 4.3: Powder Heal caps at max HP', () => {
  const state = createInitialState();
  state.turn = 2;

  const card = getCard('A1-007');
  state.player1.active = {
    ...createPokemon('A1-007', 1),
    currentHp: card.hp - 10 // Only 10 damage
  };

  const newState = activateAbility(state, 'player1', 'active', 'Powder Heal', getCard);

  assertEqual(newState.player1.active.currentHp, card.hp, 'Should not exceed max HP');
});

runTest('Test 4.4: Powder Heal marks ability as used', () => {
  const state = createInitialState();
  state.turn = 2;
  state.player1.active = createPokemon('A1-007', 1);

  const newState = activateAbility(state, 'player1', 'active', 'Powder Heal', getCard);

  assertEqual(newState.player1.active.abilitiesUsedThisTurn['Powder Heal'], 2, 'Ability should be marked as used');
});

// ============================================================================
// Test 5: Activate Ability - Water Shuriken
// ============================================================================

runTest('Test 5.1: Water Shuriken damages opponent', () => {
  const state = createInitialState();
  state.turn = 2;

  const card = getCard('A1-089');
  const opponentCard = getCard('A1-001');

  state.player1.active = {
    ...createPokemon('A1-089', 1),
    currentHp: card.hp
  };

  state.player2.active = {
    ...createPokemon('A1-001', 1),
    currentHp: opponentCard.hp
  };

  const newState = activateAbility(state, 'player1', 'active', 'Water Shuriken', getCard);

  assertEqual(newState.player2.active.currentHp, opponentCard.hp - 20, 'Opponent should take 20 damage');
});

runTest('Test 5.2: Water Shuriken KO awards points', () => {
  const state = createInitialState();
  state.turn = 2;

  const card = getCard('A1-089');
  const opponentCard = getCard('A1-001');

  state.player1.active = {
    ...createPokemon('A1-089', 1),
    currentHp: card.hp
  };

  state.player2.active = {
    ...createPokemon('A1-001', 1),
    currentHp: 15 // Only 15 HP left
  };

  const newState = activateAbility(state, 'player1', 'active', 'Water Shuriken', getCard);

  // After KO, active is set to null by handleKOPokemon
  assertEqual(newState.player2.active, null, 'Opponent active should be null after KO');
  assertEqual(newState.player1.points, 1, 'Should award 1 point');
  assertEqual(newState.player2.discard.length, 1, 'Card should be in discard');
});

// ============================================================================
// Test 6: Passive Abilities
// ============================================================================

runTest('Test 6.1: Get active passive abilities', () => {
  const state = createInitialState();
  state.player1.active = createPokemon('A1-123', 1); // Gengar ex with Shadowy Spellbind
  state.player2.active = createPokemon('A1-001', 1);

  const passiveAbilities = getActivePassiveAbilities(state, getCard);

  assertEqual(passiveAbilities.length, 1, 'Should have 1 passive ability');
  assertEqual(passiveAbilities[0].abilityName, 'Shadowy Spellbind', 'Should be Shadowy Spellbind');
});

runTest('Test 6.2: Passive abilities don\'t include once-per-turn', () => {
  const state = createInitialState();
  state.player1.active = createPokemon('A1-007', 1); // Butterfree with Powder Heal

  const passiveAbilities = getActivePassiveAbilities(state, getCard);

  const powderHeal = passiveAbilities.find(a => a.abilityName === 'Powder Heal');
  assertEqual(powderHeal, undefined, 'Powder Heal should not be in passive abilities');
});

// ============================================================================
// Test 7: Supporter Blocking
// ============================================================================

runTest('Test 7.1: Shadowy Spellbind blocks supporters', () => {
  const state = createInitialState();
  state.player2.active = createPokemon('A1-123', 1); // Opponent has Gengar ex

  const check = canPlaySupporter(state, getCard);
  assertEqual(check.canPlay, false, 'Should not be able to play supporter');
  assert(check.reason.includes('Shadowy Spellbind'), 'Reason should mention Shadowy Spellbind');
});

runTest('Test 7.2: Can play supporter without blocking ability', () => {
  const state = createInitialState();
  state.player2.active = createPokemon('A1-001', 1); // Opponent has Bulbasaur (no ability)

  const check = canPlaySupporter(state, getCard);
  assertEqual(check.canPlay, true, 'Should be able to play supporter');
});

// ============================================================================
// Test 8: Get Available Abilities
// ============================================================================

runTest('Test 8.1: Get available abilities for active Pokemon', () => {
  const state = createInitialState();
  state.turn = 2;
  state.player1.active = createPokemon('A1-007', 1);

  const abilities = getAvailableAbilities(state, 'player1', 'active', getCard);

  assertEqual(abilities.length, 1, 'Should have 1 available ability');
  assertEqual(abilities[0].name, 'Powder Heal', 'Should be Powder Heal');
  assertEqual(abilities[0].canUse, true, 'Should be usable');
});

runTest('Test 8.2: Get available abilities shows already used status', () => {
  const state = createInitialState();
  state.turn = 2;
  state.player1.active = {
    ...createPokemon('A1-007', 1),
    abilitiesUsedThisTurn: { 'Powder Heal': 2 }
  };

  const abilities = getAvailableAbilities(state, 'player1', 'active', getCard);

  assertEqual(abilities[0].canUse, false, 'Should not be usable');
  assert(abilities[0].reason.includes('already used'), 'Reason should mention already used');
});

runTest('Test 8.3: Get available abilities for bench Pokemon (empty)', () => {
  const state = createInitialState();
  state.player1.bench[0] = createPokemon('A1-007', 1);

  const abilities = getAvailableAbilities(state, 'player1', 0, getCard);

  assertEqual(abilities.length, 0, 'Should have 0 available abilities from bench');
});

// ============================================================================
// Test 9: End Turn Resets Abilities
// ============================================================================

runTest('Test 9.1: End turn resets ability usage', () => {
  const state = createInitialState();
  state.turn = 1;
  state.player1.active = {
    ...createPokemon('A1-007', 1),
    abilitiesUsedThisTurn: { 'Powder Heal': 1 }
  };

  const newState = endTurn(state);

  assertEqual(newState.player1.active.abilitiesUsedThisTurn['Powder Heal'], undefined, 'Ability usage should be reset');
});

// ============================================================================
// Test 10: Multiple Abilities
// ============================================================================

runTest('Test 10.1: Pokemon with multiple abilities', () => {
  // Create a mock card with multiple abilities
  mockCards['TEST-MULTI'] = {
    id: 'TEST-MULTI',
    name: 'Multi-Ability Pokemon',
    hp: 100,
    abilities: [
      {
        name: 'Ability 1',
        effect: 'Once during your turn, do effect 1.'
      },
      {
        name: 'Ability 2',
        effect: 'Once during your turn, do effect 2.'
      },
      {
        name: 'Passive Ability',
        effect: 'As long as this is active, do something.'
      }
    ]
  };

  const abilities = getAbilities('TEST-MULTI', getCard);
  assertEqual(abilities.length, 3, 'Should have 3 abilities');
  assertEqual(abilities[0].isOncePerTurn, true, 'Ability 1 should be once per turn');
  assertEqual(abilities[1].isOncePerTurn, true, 'Ability 2 should be once per turn');
  assertEqual(abilities[2].isOncePerTurn, false, 'Passive Ability should not be once per turn');
});

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log('='.repeat(50));

testResults.forEach(result => console.log(result));

if (testsFailed > 0) {
  process.exit(1);
}
