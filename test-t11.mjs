#!/usr/bin/env node
/**
 * T11: Evolution - Node.js Test Suite
 *
 * Run with: node test-t11.mjs
 */

import { createInitialState, canEvolve, evolve, isEvolutionCard, getValidEvolutions, validateState } from './js/engine/game-state.js';
import { loadCards, getCard } from './js/data/card-loader.js';

// Test results tracker
let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passCount++;
    console.log(`✓ ${testName}`);
  } else {
    failCount++;
    console.error(`✗ ${testName}`);
    if (details) console.error(`  ${details}`);
  }
}

function assertEqual(actual, expected, testName) {
  const condition = JSON.stringify(actual) === JSON.stringify(expected);
  assert(condition, testName,
    `Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
}

// Load card data
await loadCards();

console.log('=== T11: Evolution Tests ===\n');

// Test 1: Basic -> Stage 1 evolution validation
console.log('Test 1: Basic -> Stage 1 evolution validation');
{
  const state = createInitialState();
  state.turn = 2; // Not first turn
  state.player1.active = {
    cardId: 'A1-001', // Bulbasaur (Basic)
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002']; // Ivysaur (Stage 1)

  const canEv = canEvolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(canEv, 'Can evolve Bulbasaur to Ivysaur');
}

// Test 2: Stage 1 -> Stage 2 evolution validation
console.log('\nTest 2: Stage 1 -> Stage 2 evolution validation');
{
  const state = createInitialState();
  state.turn = 5;
  state.player1.active = {
    cardId: 'A1-002', // Ivysaur (Stage 1)
    currentHp: 90,
    energy: ['G', 'G', 'G'],
    status: null,
    turnPlayed: 2,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-003']; // Venusaur (Stage 2)

  const canEv = canEvolve(state, 'player1', 'active', 'A1-003', getCard);
  assert(canEv, 'Can evolve Ivysaur to Venusaur');
}

// Test 3: Can't evolve on first turn
console.log('\nTest 3: Can\'t evolve on first turn');
{
  const state = createInitialState();
  state.turn = 0; // First turn
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 0,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const canEv = canEvolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(!canEv, 'Cannot evolve on first turn');
}

// Test 4: Can't evolve the turn Pokemon was played
console.log('\nTest 4: Can\'t evolve the turn Pokemon was played');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 2, // Played this turn
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const canEv = canEvolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(!canEv, 'Cannot evolve on turn played');
}

// Test 5: Can't evolve twice in same turn
console.log('\nTest 5: Can\'t evolve twice in same turn');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: 3, // Already evolved this turn
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const canEv = canEvolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(!canEv, 'Cannot evolve twice in one turn');
}

// Test 6: Invalid evolution stage mismatch
console.log('\nTest 6: Invalid evolution stage mismatch');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-003']; // Venusaur (Stage 2)

  const canEv = canEvolve(state, 'player1', 'active', 'A1-003', getCard);
  assert(!canEv, 'Cannot skip evolution stage');
}

// Test 7: Status cured on evolve
console.log('\nTest 7: Status cured on evolve');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 30,
    energy: ['G', 'G'],
    status: 'poison',
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.player1.active.status === null, 'Status cured on evolve');
}

// Test 8: Damage preserved on evolve
console.log('\nTest 8: Damage preserved on evolve');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001', // Bulbasaur (60 HP)
    currentHp: 30, // 30 damage
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002']; // Ivysaur (90 HP)

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.player1.active.currentHp === 60, 'Damage preserved (90-30=60)');
}

// Test 9: Energy preserved on evolve
console.log('\nTest 9: Energy preserved on evolve');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G', 'R', 'W'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assertEqual(newState.player1.active.energy, ['G', 'G', 'R', 'W'], 'Energy preserved');
}

// Test 10: Evolution card removed from hand
console.log('\nTest 10: Evolution card removed from hand');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002', 'A1-003', 'A1-131'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.player1.hand.length === 2, 'Evolution card removed');
  assert(!newState.player1.hand.includes('A1-002'), 'A1-002 not in hand');
}

// Test 11: Evolve bench Pokemon
console.log('\nTest 11: Evolve bench Pokemon');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.bench[0] = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 0, 'A1-002', getCard);
  assert(newState.player1.bench[0].cardId === 'A1-002', 'Bench Pokemon evolved');
}

// Test 12: lastEvolved tracking
console.log('\nTest 12: lastEvolved tracking');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.player1.active.lastEvolved === 3, 'lastEvolved=3');
}

// Test 13: isEvolutionCard helper
console.log('\nTest 13: isEvolutionCard helper');
{
  const isBasic = isEvolutionCard('A1-001', getCard);
  const isStage1 = isEvolutionCard('A1-002', getCard);
  const isStage2 = isEvolutionCard('A1-003', getCard);

  assert(!isBasic, 'A1-001 is not evolution');
  assert(isStage1, 'A1-002 is evolution');
  assert(isStage2, 'A1-003 is evolution');
}

// Test 14: getValidEvolutions helper
console.log('\nTest 14: getValidEvolutions helper');
{
  const handCards = ['A1-001', 'A1-002', 'A1-003', 'A1-131'];
  const validEvolutions = getValidEvolutions('A1-001', handCards, getCard);

  assert(validEvolutions.length === 1, '1 valid evolution');
  assert(validEvolutions[0] === 'A1-002', 'Evolution is A1-002');
}

// Test 15: Evolution log entry created
console.log('\nTest 15: Evolution log entry created');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];
  const logLength = state.log.length;

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.log.length === logLength + 1, 'Log entry added');
  assert(newState.log[logLength].action === 'evolve', 'Log action is evolve');
}

// Test 16: Damage doesn't exceed new HP
console.log('\nTest 16: Damage doesn\'t exceed new HP');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001', // 60 HP
    currentHp: 0, // 60 damage
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002']; // 90 HP

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.player1.active.currentHp >= 0, 'HP >= 0 after evolve');
}

// Test 17: Empty bench handled
console.log('\nTest 17: Empty bench handled');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.bench[1] = null;
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 1, 'A1-002', getCard);
  assert(newState.player1.bench[1] === null, 'Empty slot stays null');
}

// Test 18: State validation after evolution
console.log('\nTest 18: State validation after evolution');
{
  const state = createInitialState();
  state.turn = 3;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  const validation = validateState(newState);
  assert(validation.valid, 'State valid after evolution');
}

// Summary
console.log('\n=== Summary ===');
console.log(`Total: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

process.exit(failCount > 0 ? 1 : 0);
