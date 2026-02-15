#!/usr/bin/env node
/**
 * T11: Evolution - Standalone Node.js Test Suite
 *
 * This test uses mock card data instead of loading from files,
 * so it can run directly with node without card-loader.js.
 *
 * Run with: node test-t11-standalone.mjs
 */

import {
  createInitialState,
  canEvolve,
  evolve,
  isEvolutionCard,
  getValidEvolutions,
  validateState
} from './js/engine/game-state.js';

// Mock card data
const mockCards = {
  'A1-001': { // Bulbasaur (Basic)
    id: 'A1-001',
    name: 'Bulbasaur',
    supertype: 'Pokémon',
    subtype: 'Basic',
    stage: null,
    element: 'Grass',
    hp: 60,
    weakness: 'Fire',
    retreat: 2
  },
  'A1-002': { // Ivysaur (Stage 1)
    id: 'A1-002',
    name: 'Ivysaur',
    supertype: 'Pokémon',
    subtype: 'Stage 1',
    stage: 'Bulbasaur',
    element: 'Grass',
    hp: 90,
    weakness: 'Fire',
    retreat: 2
  },
  'A1-003': { // Venusaur (Stage 2)
    id: 'A1-003',
    name: 'Venusaur',
    supertype: 'Pokémon',
    subtype: 'Stage 2',
    stage: 'Ivysaur',
    element: 'Grass',
    hp: 160,
    weakness: 'Fire',
    retreat: 3
  },
  'A1-131': { // Some random card
    id: 'A1-131',
    name: 'Potion',
    supertype: 'Trainer',
    subtype: 'Item',
    stage: null
  }
};

// Mock getCard function
function getCard(cardId) {
  return mockCards[cardId] || null;
}

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

console.log('=== T11: Evolution Tests ===\n');

// Test 1: Basic -> Stage 1 evolution validation
console.log('Test 1: Basic -> Stage 1 evolution validation');
{
  const state = createInitialState();
  state.turn = 2;
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

  const canEv = canEvolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(canEv, 'Can evolve Bulbasaur to Ivysaur');
}

// Test 2: Stage 1 -> Stage 2 evolution validation
console.log('\nTest 2: Stage 1 -> Stage 2 evolution validation');
{
  const state = createInitialState();
  state.turn = 5;
  state.player1.active = {
    cardId: 'A1-002',
    currentHp: 90,
    energy: ['G', 'G', 'G'],
    status: null,
    turnPlayed: 2,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-003'];

  const canEv = canEvolve(state, 'player1', 'active', 'A1-003', getCard);
  assert(canEv, 'Can evolve Ivysaur to Venusaur');
}

// Test 3: Can't evolve on first turn
console.log('\nTest 3: Can\'t evolve on first turn');
{
  const state = createInitialState();
  state.turn = 0;
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
    turnPlayed: 2,
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
    lastEvolved: 3,
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
  state.player1.hand = ['A1-003'];

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
    cardId: 'A1-001',
    currentHp: 30,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

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
    cardId: 'A1-001',
    currentHp: 0,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

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

// Test 19: All status effects cured on evolve
console.log('\nTest 19: All status effects cured on evolve');
{
  const statusEffects = ['poison', 'poisonPlus', 'burn', 'sleep', 'paralysis', 'confusion'];
  let allCured = true;

  for (const status of statusEffects) {
    const state = createInitialState();
    state.turn = 3;
    state.player1.active = {
      cardId: 'A1-001',
      currentHp: 30,
      energy: ['G', 'G'],
      status: status,
      turnPlayed: 1,
      lastEvolved: null,
      tool: null,
      effects: []
    };
    state.player1.hand = ['A1-002'];

    const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
    if (newState.player1.active.status !== null) {
      allCured = false;
      console.error(`  Status ${status} not cured`);
    }
  }

  assert(allCured, 'All status effects cured on evolve');
}

// Test 20: Tool preserved on evolve
console.log('\nTest 20: Tool preserved on evolve');
{
  const state = createInitialState();
  state.turn = 3;
  const mockTool = { cardId: 'A1-131', name: 'Tool' };
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: mockTool,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assertEqual(newState.player1.active.tool, mockTool, 'Tool preserved on evolve');
}

// Test 21: Effects preserved on evolve
console.log('\nTest 21: Effects preserved on evolve');
{
  const state = createInitialState();
  state.turn = 3;
  const mockEffects = [{ type: 'custom', data: 'test' }];
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 1,
    lastEvolved: null,
    tool: null,
    effects: mockEffects
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assertEqual(newState.player1.active.effects, mockEffects, 'Effects preserved on evolve');
}

// Test 22: turnPlayed preserved on evolve
console.log('\nTest 22: turnPlayed preserved on evolve');
{
  const state = createInitialState();
  state.turn = 5;
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: ['G', 'G'],
    status: null,
    turnPlayed: 2,
    lastEvolved: null,
    tool: null,
    effects: []
  };
  state.player1.hand = ['A1-002'];

  const newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  assert(newState.player1.active.turnPlayed === 2, 'turnPlayed preserved');
}

// Test 23: Evolution to higher HP with no damage
console.log('\nTest 23: Evolution to higher HP with no damage');
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
  assert(newState.player1.active.currentHp === 90, 'Full HP preserved');
}

// Test 24: Multiple evolutions on same turn (different Pokemon)
console.log('\nTest 24: Multiple evolutions on same turn (different Pokemon)');
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
  state.player1.hand = ['A1-002', 'A1-002'];

  let newState = evolve(state, 'player1', 'active', 'A1-002', getCard);
  newState = evolve(newState, 'player1', 0, 'A1-002', getCard);

  assert(newState.player1.active.cardId === 'A1-002', 'Active evolved');
  assert(newState.player1.bench[0].cardId === 'A1-002', 'Bench Pokemon evolved');
}

// Summary
console.log('\n=== Summary ===');
console.log(`Total: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

process.exit(failCount > 0 ? 1 : 0);
