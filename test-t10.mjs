/**
 * Test T10: Status Effects + Pokemon Checkup
 * Automated test for Pokemon Checkup functionality
 */

import { createInitialState, createPokemon, processPokemonCheckup, validateState } from './js/engine/game-state.js';
import { STATUS, STATUS_DAMAGE } from './js/engine/constants.js';

// Test counters
let passCount = 0;
let failCount = 0;

// Simple getCard function for testing
function getCard(cardId) {
  const cards = {
    'A1-001': { id: 'A1-001', name: 'Bulbasaur', hp: 70, element: 'G', attacks: [], weakness: 'R' },
    'A1-003': { id: 'A1-003', name: 'Venusaur', hp: 180, element: 'G', attacks: [], weakness: 'R' },
    'A1-012': { id: 'A1-012', name: 'Charizard', hp: 180, element: 'R', attacks: [], weakness: 'W' },
  };
  return cards[cardId] || { id: cardId, name: 'Unknown', hp: 100, element: 'C', attacks: [], weakness: null };
}

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    failCount++;
  }
}

function assertEquals(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName} (${expected})`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${testName} (expected: ${expected}, got: ${actual})`);
    failCount++;
  }
}

console.log('Running T10 Tests: Status Effects + Pokemon Checkup\n');
console.log('=' .repeat(60));

// Test 1: Poison damage
{
  console.log('\n[Test 1] Poison applies 10 damage');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.POISON;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.currentHp, 60, 'Poison damage');
  assertEquals(newState.player1.active.status, STATUS.POISON, 'Poison remains');
}

// Test 2: Poison+ damage
{
  console.log('\n[Test 2] Poison+ applies 20 damage');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-003');
  state.player1.active.currentHp = 180;
  state.player1.active.status = STATUS.POISON_PLUS;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.currentHp, 160, 'Poison+ damage');
  assertEquals(newState.player1.active.status, STATUS.POISON_PLUS, 'Poison+ remains');
}

// Test 3: Burn damage + heads (cured)
{
  console.log('\n[Test 3] Burn applies 20 damage and cures on heads');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-012');
  state.player1.active.currentHp = 180;
  state.player1.active.status = STATUS.BURN;
  state.coinQueue = [true, false, true, true, false]; // heads first

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.currentHp, 160, 'Burn damage');
  assertEquals(newState.player1.active.status, null, 'Burn cured on heads');
  assertEquals(newState.coinQueue.length, 4, 'One coin consumed');
}

// Test 4: Burn damage + tails (not cured)
{
  console.log('\n[Test 4] Burn applies 20 damage, remains on tails');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-012');
  state.player1.active.currentHp = 180;
  state.player1.active.status = STATUS.BURN;
  state.coinQueue = [false, true, true, true, false]; // tails first

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.currentHp, 160, 'Burn damage');
  assertEquals(newState.player1.active.status, STATUS.BURN, 'Burn remains on tails');
  assertEquals(newState.coinQueue.length, 4, 'One coin consumed');
}

// Test 5: Sleep - wake up on heads
{
  console.log('\n[Test 5] Sleep cures on heads');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.SLEEP;
  state.coinQueue = [true, false, true, true, false]; // heads first

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.status, null, 'Sleep cured on heads');
  assertEquals(newState.coinQueue.length, 4, 'One coin consumed');
}

// Test 6: Sleep - remain asleep on tails
{
  console.log('\n[Test 6] Sleep remains on tails');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.SLEEP;
  state.coinQueue = [false, true, true, true, false]; // tails first

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.status, STATUS.SLEEP, 'Sleep remains on tails');
  assertEquals(newState.coinQueue.length, 4, 'One coin consumed');
}

// Test 7: Paralysis auto-cure (without coin flip)
{
  console.log('\n[Test 7] Paralysis auto-cures without coin flip');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.PARALYSIS;
  state.coinQueue = [true, false, true, true, false]; // should not consume coin

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.status, null, 'Paralysis auto-cured');
  assertEquals(newState.coinQueue.length, 5, 'No coin consumed for Paralysis');
}

// Test 8: KO from Poison
{
  console.log('\n[Test 8] KO from Poison awards 1 point to opponent');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 10; // Low HP
  state.player1.active.status = STATUS.POISON;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active, null, 'Active Pokemon KO\'d');
  assertEquals(newState.player2.points, 1, 'Opponent awarded 1 point');
}

// Test 9: KO from Burn
{
  console.log('\n[Test 9] KO from Burn awards 1 point to opponent');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 20; // Exactly burn damage
  state.player1.active.status = STATUS.BURN;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active, null, 'Active Pokemon KO\'d');
  assertEquals(newState.player2.points, 1, 'Opponent awarded 1 point');
}

// Test 10: Multiple Pokemon with status (active + bench)
{
  console.log('\n[Test 10] Multiple Pokemon processed correctly');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.POISON;

  state.player1.bench = [
    createPokemon('A1-003'),
    createPokemon('A1-012'),
    null
  ];
  state.player1.bench[0].currentHp = 180;
  state.player1.bench[0].status = STATUS.BURN;
  state.player1.bench[1].currentHp = 180;
  state.player1.bench[1].status = STATUS.SLEEP;

  state.coinQueue = [true, true, true, true, true]; // All heads

  const newState = processPokemonCheckup(state);

  const activeOk = newState.player1.active.currentHp === 60 && newState.player1.active.status === STATUS.POISON;
  const bench0Ok = newState.player1.bench[0].currentHp === 160 && newState.player1.bench[0].status === null;
  const bench1Ok = newState.player1.bench[1].status === null;

  assert(activeOk, 'Active Pokemon processed (Poison)');
  assert(bench0Ok, 'Bench[0] processed (Burn + heads)');
  assert(bench1Ok, 'Bench[1] processed (Sleep + heads)');
}

// Test 11: No status - no changes
{
  console.log('\n[Test 11] No status - no changes');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = null;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.currentHp, 70, 'HP unchanged');
  assertEquals(newState.coinQueue.length, 5, 'No coins consumed');
}

// Test 12: Log entries created
{
  console.log('\n[Test 12] Checkup log entry created');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.POISON;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  const logEntry = newState.log.find(entry => entry.action === 'checkup');
  assert(logEntry !== undefined, 'Checkup log entry exists');
  assert(logEntry.details.includes('Poison'), 'Log entry contains Poison');
}

// Test 13: Empty bench handled correctly
{
  console.log('\n[Test 13] Empty bench handled correctly');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.POISON;
  state.player1.bench = [null, null, null]; // Empty bench
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);

  assertEquals(newState.player1.active.currentHp, 60, 'Active Pokemon processed');
  assertEquals(newState.player1.bench.length, 3, 'Bench still has 3 slots');
}

// Test 14: State validation after checkup
{
  console.log('\n[Test 14] State validation after checkup');
  const state = createInitialState();
  state.player1.active = createPokemon('A1-001');
  state.player1.active.currentHp = 70;
  state.player1.active.status = STATUS.POISON;
  state.coinQueue = [true, false, true, true, false];

  const newState = processPokemonCheckup(state);
  const validation = validateState(newState);

  assert(validation.valid, 'State remains valid after checkup');
}

console.log('\n' + '='.repeat(60));
const total = passCount + failCount;
const percentage = Math.round((passCount / total) * 100);
console.log(`\nResults: ${passCount}/${total} tests passed (${percentage}%)`);

if (failCount > 0) {
  process.exit(1);
}
