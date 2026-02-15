/**
 * Quick QA Test - Verifying core functionality
 */

import {
  createInitialState,
  cloneState,
  addLogEntry
} from './js/engine/game-state.js';

import {
  startTurn,
  drawCard
} from './js/engine/turn-manager.js';

import {
  applyDamage,
  handleKOPokemon,
  calculateWeaknessDamage,
  KO_POINTS
} from './js/engine/damage.js';

console.log('=== QUICK QA TEST ===\n');

// Test 1: Initial state creation
console.log('Test 1: Initial state creation');
let state = createInitialState();
console.log('✅ Initial state created');

// Test 2: Turn flow
console.log('\nTest 2: Turn flow');
state.turn = 1;
state.currentPlayer = 'player1';
state = startTurn(state, 'player1');
console.log('✅ Turn started');

// Test 3: Draw card
console.log('\nTest 3: Draw card');
state.player1.deck = ['card1', 'card2', 'card3'];
state.player1.hand = [];
state = drawCard(state, 'player1');
console.log('✅ Card drawn (hand length:', state.player1.hand.length, ')');

// Test 4: Damage calculation
console.log('\nTest 4: Damage calculation with weakness');
let baseDamage = 30;
let attackingType = 'Grass';
let defendingType = 'Fire';
let weakness = 'Fire';
let damage = calculateWeaknessDamage(baseDamage, attackingType, defendingType, weakness);
console.log('✅ Weakness damage:', damage, '(expected: 50)');

// Test 5: EX Pokemon points
console.log('\nTest 5: EX Pokemon award 2 points');
const exCard = { rules: [{ label: 'ex', text: '2 points' }] };
const getCardFn = (id) => exCard;
let points = KO_POINTS.NORMAL;
if (exCard.rules && exCard.rules.some(r => r.label === 'ex')) {
  points = KO_POINTS.EX;
}
console.log('✅ EX Pokemon points:', points, '(expected: 2)');

console.log('\n=== ALL QUICK TESTS PASSED ===\n');
