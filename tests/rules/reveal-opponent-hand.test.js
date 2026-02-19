/**
 * Tests for GAP-023: Revelar mano del oponente (Mew (Psy Report))
 *
 * Hand revelation is an informational attack effect where the opponent's hand
 * becomes visible to both players.
 *
 * Real-card examples:
 * - Mew (Psy Report): "Your opponent reveals their hand."
 *
 * Acceptance Criteria:
 * 1. Implementar revelación de mano rival
 * 2. Tests unitarios cubren el comportamiento implementado
 * 3. npm test pasa (excluyendo fallos pre-existentes conocidos en retreat/replay/deck/rules/actions)
 * 4. npm run check pasa
 */

'use strict';

const { createGame, AttackSystem } = require('../../src/index.js');

function createDeck(n = 20) {
  return Array.from({ length: n }, (_, i) => ({
    id: `card-${i}`,
    name: `Card ${i}`
  }));
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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${expected}`);
    console.error(`    Actual:   ${actual}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${expectedStr}`);
    console.error(`    Actual:   ${actualStr}`);
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
  const { gameState, attackSystem } = createGame(createDeck(), createDeck());

  gameState.players.player1.activePokemon = {
    id: 'player1-active',
    name: 'Mew',
    hp: 60,
    currentHp: 60,
    type: 'psychic',
    energy: [{ type: 'psychic' }, { type: 'colorless' }]
  };

  gameState.players.player2.activePokemon = {
    id: 'player2-active',
    name: 'Pidgey',
    hp: 60,
    currentHp: 60,
    type: 'colorless',
    energy: [{ type: 'colorless' }]
  };

  return { gameState, attackSystem };
}

// =============================================================================
// Section 1: Basic revealHand functionality
// =============================================================================

runTest('Attack with revealHand: true reveals opponent\'s hand', () => {
  const { gameState, attackSystem } = setupGame();

  // Give player2 some cards in hand
  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' },
    { id: 'card-2', name: 'Charmander' },
    { id: 'card-3', name: 'Squirtle' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  assert(result.revealHandResult !== null, 'revealHandResult exists in attack result');
  assert(result.revealHandResult.success === true, 'revealHand was successful');
  assertEqual(result.revealHandResult.details.cardCount, 3, 'correct number of cards revealed');
});

runTest('revealHandResult contains revealed cards with IDs and names', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' },
    { id: 'card-2', name: 'Charmander' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  const revealedCards = result.revealHandResult.details.revealedCards;
  assertEqual(revealedCards.length, 2, 'two cards revealed');
  assertEqual(revealedCards[0].id, 'card-1', 'first card has correct ID');
  assertEqual(revealedCards[0].name, 'Bulbasaur', 'first card has correct name');
  assertEqual(revealedCards[1].id, 'card-2', 'second card has correct ID');
  assertEqual(revealedCards[1].name, 'Charmander', 'second card has correct name');
});

runTest('revealHand: true logs the reveal event to turnLog', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' },
    { id: 'card-2', name: 'Charmander' }
  ];

  attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  const revealLog = gameState.turnLog.find(entry => entry.type === 'reveal_hand');
  assert(revealLog !== undefined, 'reveal_hand event was logged');
  assertEqual(revealLog.attacker, 'player1', 'attacker is logged correctly');
  assertEqual(revealLog.defendingPlayer, 'player2', 'defendingPlayer is logged correctly');
  assertEqual(revealLog.cardCount, 2, 'cardCount is logged correctly');
  assert(revealLog.revealedCards !== undefined, 'revealedCards array is logged');
  assertEqual(revealLog.revealedCards.length, 2, 'revealedCards has correct length');
});

runTest('revealHand reveals player1\'s hand when player2 attacks', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player1.hand = [
    { id: 'card-1', name: 'Pikachu' },
    { id: 'card-2', name: 'Jigglypuff' }
  ];

  const result = attackSystem.executeAttack('player2', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assertEqual(result.revealHandResult.details.playerId, 'player1', 'player1\'s hand was revealed');
  assertEqual(result.revealHandResult.details.cardCount, 2, 'correct number of cards revealed');
});

// =============================================================================
// Section 2: Edge cases
// =============================================================================

runTest('revealHand works when opponent has empty hand', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assert(result.revealHandResult.success === true, 'revealHand was successful with empty hand');
  assertEqual(result.revealHandResult.details.cardCount, 0, 'zero cards revealed');
  assertEqual(result.revealHandResult.details.revealedCards.length, 0, 'empty revealedCards array');
});

runTest('revealHand works when opponent has single card', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Mewtwo' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assertEqual(result.revealHandResult.details.cardCount, 1, 'one card revealed');
  assertEqual(result.revealHandResult.details.revealedCards[0].name, 'Mewtwo', 'correct card name');
});

runTest('revealHand works when opponent has maximum hand size (10 cards)', () => {
  const { gameState, attackSystem } = setupGame();

  // Give player2 10 cards (maximum hand size in Pocket TCG)
  gameState.players.player2.hand = Array.from({ length: 10 }, (_, i) => ({
    id: `card-${i}`,
    name: `Card ${i}`
  }));

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true
  });

  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assertEqual(result.revealHandResult.details.cardCount, 10, 'all 10 cards revealed');
});

// =============================================================================
// Section 3: Combination with other attack effects
// =============================================================================

runTest('revealHand works alongside damage', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 30,
    revealHand: true
  });

  assertEqual(result.finalDamage, 30, 'damage is applied correctly');
  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assertEqual(result.revealHandResult.details.cardCount, 1, 'hand is revealed');
});

runTest('revealHand works alongside damageScaling', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player1.activePokemon.energy = [
    { type: 'psychic' },
    { type: 'psychic' },
    { type: 'colorless' }
  ];

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 10,
    damageScaling: 10, // +10 per energy
    revealHand: true
  });

  assertEqual(result.damageScaling, 30, 'damage scaling is applied (3 energy * 10)');
  assertEqual(result.baseDamage, 10, 'base damage is correct');
  assertEqual(result.finalDamage, 40, 'final damage includes scaling');
  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assertEqual(result.revealHandResult.details.cardCount, 1, 'hand is revealed');
});

runTest('revealHand works alongside temporaryDefenderEffect', () => {
  const { gameState, attackSystem, temporaryEffectsSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Psy Report',
    damage: 20,
    revealHand: true,
    temporaryDefenderEffect: {
      type: 'cannot_attack',
      duration: 1
    }
  });

  assert(result.revealHandResult !== null, 'revealHandResult exists');
  assert(result.temporaryEffectResult !== null, 'temporaryEffectResult exists');
  assert(result.temporaryEffectResult.applied === true, 'temporary effect was applied');
});

// =============================================================================
// Section 4: No revealHand effect
// =============================================================================

runTest('Attack without revealHand does not reveal opponent\'s hand', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' },
    { id: 'card-2', name: 'Charmander' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Tackle',
    damage: 20
    // No revealHand effect
  });

  assert(result.revealHandResult === null, 'revealHandResult is null when effect not present');

  const revealLog = gameState.turnLog.find(entry => entry.type === 'reveal_hand');
  assert(revealLog === undefined, 'no reveal_hand event in turn log');
});

runTest('revealHand: false does not trigger hand revelation', () => {
  const { gameState, attackSystem } = setupGame();

  gameState.players.player2.hand = [
    { id: 'card-1', name: 'Bulbasaur' }
  ];

  const result = attackSystem.executeAttack('player1', {
    name: 'Tackle',
    damage: 20,
    revealHand: false
  });

  assert(result.revealHandResult === null, 'revealHandResult is null when revealHand is false');

  const revealLog = gameState.turnLog.find(entry => entry.type === 'reveal_hand');
  assert(revealLog === undefined, 'no reveal_hand event in turn log');
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
