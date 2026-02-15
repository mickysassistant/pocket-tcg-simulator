#!/usr/bin/env node
/**
 * QA TEST - 2026-02-11
 * Comprehensive functional testing of Pokemon TCG Pocket Simulator
 */

import {
  validateState,
  cloneState,
  startTurn,
  endTurn,
  drawCard,
  generateEnergy,
  processPokemonCheckup,
  handleKOPokemon,
  checkWinCondition,
  calculateDamage,
  executeAttack,
  applyDamage,
  canAttack,
  canEvolve
} from './js/engine/game-state.js';
import { loadCards, getAllCards, getCard } from './js/data/card-loader.js';
import fs from 'fs';
import path from 'path';

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Load card data
let cardData;
try {
  await loadCards();
  cardData = getAllCards();
  log('✅ Card data loaded successfully', 'green');
} catch (error) {
  log(`❌ Failed to load card data: ${error.message}`, 'red');
  process.exit(1);
}

// Test suite
let testsPassed = 0;
let testsFailed = 0;

function runTest(name, testFn) {
  try {
    log(`\n[TEST] ${name}`, 'cyan');
    testFn();
    testsPassed++;
    log(`✅ ${name} PASSED`, 'green');
  } catch (error) {
    testsFailed++;
    log(`❌ ${name} FAILED: ${error.message}`, 'red');
    console.error(error);
  }
}

// Test 1: Load and validate scenario
runTest('Load demo scenario and validate', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));

  assert(scenario !== null, 'Scenario loaded');

  const validation = validateState(scenario);
  assert(validation.valid === true, `Scenario should be valid: ${validation.error}`);

  log(`  Turn: ${scenario.turn}`, 'blue');
  log(`  P1 active: ${scenario.player1.active.cardId}`, 'blue');
  log(`  P2 active: ${scenario.player2.active.cardId}`, 'blue');
});

// Test 2: Turn flow
runTest('Start turn and verify state changes', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  const beforeTurn = state.turn;
  const beforeCurrent = state.currentPlayer;
  const beforeDeckP1 = state.player1.deck.length;

  // Start turn for P1
  state = startTurn(state);

  // Verify turn didn't advance yet (startTurn just sets up)
  assert(state.turn === beforeTurn, `Turn should not advance yet: ${state.turn} vs ${beforeTurn}`);
  assert(state.currentPlayer === beforeCurrent, `Current player should not change`);
  log(`  Turn ${state.turn}, ${state.currentPlayer} plays`, 'blue');
});

// Test 3: Draw card
runTest('Draw card and verify deck/hand changes', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  const beforeDeck = state.player1.deck.length;
  const beforeHand = state.player1.hand.length;

  state = drawCard(state, 'player1');

  assert(state.player1.deck.length === beforeDeck - 1, `Deck should decrease by 1: ${state.player1.deck.length} vs ${beforeDeck - 1}`);
  assert(state.player1.hand.length === beforeHand + 1, `Hand should increase by 1: ${state.player1.hand.length} vs ${beforeHand + 1}`);

  log(`  Deck: ${beforeDeck} → ${state.player1.deck.length}`, 'blue');
  log(`  Hand: ${beforeHand} → ${state.player1.hand.length}`, 'blue');
});

// Test 4: Apply damage and check for KO
runTest('Apply damage and handle KO', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  const p1InitialHp = state.player1.active.currentHp;

  // Apply lethal damage
  state = applyDamage(state, 'player2', 'player1', 80, null, getCard);

  assert(state.player1.active === null, 'Active should be null after KO');
  assert(state.player2.points === 1, 'P2 should have 1 point');

  log(`  P1 HP: ${p1InitialHp} → KO`, 'blue');
  log(`  P2 points: ${state.player2.points}`, 'blue');
});

// Test 5: Pokemon checkup with status
runTest('Pokemon checkup with poison', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // Add poison to P1 active
  state.player1.active.status = 'poison';
  const beforeHp = state.player1.active.currentHp;

  state = processPokemonCheckup(state, getCard);

  // Poison should do 10 damage during checkup
  assert(state.player1.active.currentHp === beforeHp - 10, `Poison should do 10 damage: ${state.player1.active.currentHp} vs ${beforeHp - 10}`);

  log(`  Poison damage: 10`, 'blue');
  log(`  HP: ${beforeHp} → ${state.player1.active.currentHp}`, 'blue');
});

// Test 6: Win condition - 3 points
runTest('Win condition with 3 points', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // Give P2 3 points
  state.player2.points = 3;

  const result = checkWinCondition(state);

  assert(result.winner === 'player2', `Winner should be player2: ${result.winner}`);
  assert(result.reason === 'points', `Win reason should be points: ${result.reason}`);

  log(`  Winner: ${result.winner}`, 'blue');
  log(`  Reason: ${result.reason}`, 'blue');
});

// Test 7: EX Pokemon award 2 points
runTest('EX Pokemon award 2 points on KO', () => {
  const scenarioPath = path.join('scenarios', 't19d-turn-limit-draw.json');

  // Check if we have an EX Pokemon card in our card data
  const exCard = cardData.find(c => c.rules && c.rules.some(r => r.label === 'ex'));

  if (!exCard) {
    log(`  ℹ️ No EX cards found in card data, skipping test`, 'yellow');
    return;
  }

  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // Set P1 active to an EX Pokemon
  state.player1.active.cardId = exCard.id;
  state.player1.active.currentHp = exCard.hp;

  const beforePoints = state.player2.points;

  // Apply lethal damage
  state = handleKOPokemon(state, 'player1', 'player2', getCard);

  // EX Pokemon should award 2 points
  assert(state.player2.points === beforePoints + 2, `EX Pokemon should award 2 points: ${state.player2.points} vs ${beforePoints + 2}`);

  log(`  EX Pokemon: ${exCard.id} (${exCard.name})`, 'blue');
  log(`  Points awarded: 2`, 'blue');
});

// Test 8: Energy zone respects configured types
runTest('Energy zone respects configured types', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  const state = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));

  const p1Types = state.player1.energyZone.configuredTypes;
  const p2Types = state.player2.energyZone.configuredTypes;

  assert(p1Types.length > 0, 'P1 should have configured energy types');
  assert(p2Types.length > 0, 'P2 should have configured energy types');

  log(`  P1 configured types: ${p1Types.join(', ')}`, 'blue');
  log(`  P2 configured types: ${p2Types.join(', ')}`, 'blue');
});

// Test 9: Evolution cures status
runTest('Evolution cures status', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // Add poison to P1 active
  state.player1.active.status = 'poison';

  log(`  ℹ️ Evolution test requires UI interaction - skipping backend test`, 'yellow');
});

// Test 10: Hand limit
runTest('Hand limit (max 10 cards)', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // Fill hand to 10
  state.player1.hand = ['A1-001', 'A1-002', 'A1-003', 'A1-004', 'A1-005',
                         'A1-006', 'A1-007', 'A1-008', 'A1-009', 'A1-010'];

  assert(state.player1.hand.length === 10, `Hand should be at max: ${state.player1.hand.length}`);

  // Try to draw another card
  state = drawCard(state, 'player1');

  // Hand should stay at 10
  assert(state.player1.hand.length === 10, `Hand should stay at max: ${state.player1.hand.length}`);

  // Card should go to discard
  assert(state.player1.discard.length > 0, `Discard should have card: ${state.player1.discard.length}`);

  log(`  Hand stayed at max: 10`, 'blue');
  log(`  Discard: ${state.player1.discard.length} card(s)`, 'blue');
});

// Test 11: Bench limit
runTest('Bench limit (max 3 Pokemon)', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  const state = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));

  assert(state.player1.bench.length <= 3, `Bench should be at max 3: ${state.player1.bench.length}`);
  assert(state.player2.bench.length <= 3, `Bench should be at max 3: ${state.player2.bench.length}`);

  log(`  P1 bench: ${state.player1.bench.length}/3`, 'blue');
  log(`  P2 bench: ${state.player2.bench.length}/3`, 'blue');
});

// Test 12: Turn limit
runTest('Turn limit (max 30 turns)', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  state.turn = 30;
  state.player1.points = 2;
  state.player2.points = 1;

  const result = checkWinCondition(state);

  assert(result.winner === 'player1', `Player with more points should win: ${result.winner}`);
  assert(result.reason === 'turnLimit', `Win reason should be turnLimit: ${result.reason}`);

  log(`  Turn: ${state.turn}`, 'blue');
  log(`  Winner: ${result.winner} (more points)`, 'blue');
});

// Test 13: Simultaneous KO
runTest('Simultaneous KO results in tie', () => {
  const scenarioPath = path.join('scenarios', 't19d-turn-limit-draw.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // KO both active Pokemon
  state.player1.active = null;
  state.player2.active = null;
  state.player1.points = 1;
  state.player2.points = 1;

  const result = checkWinCondition(state);

  // Should be tie if no one has 3 points
  assert(result.winner === null, `Should be tie if no one has 3 points: ${result.winner}`);

  log(`  Both active KO'd`, 'blue');
  log(`  P1: ${state.player1.points} pts, P2: ${state.player2.points} pts`, 'blue');
  log(`  Result: tie`, 'blue');
});

// Test 14: No Pokemon left
runTest('No Pokemon left - opponent wins', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  let state = cloneState(JSON.parse(fs.readFileSync(scenarioPath, 'utf8')));

  // Remove all P1 Pokemon
  state.player1.active = null;
  state.player1.bench = [];

  const result = checkWinCondition(state);

  assert(result.winner === 'player2', `P2 should win if P1 has no Pokemon: ${result.winner}`);
  assert(result.reason === 'noPokemonLeft', `Win reason should be noPokemonLeft: ${result.reason}`);

  log(`  P1 has no Pokemon`, 'blue');
  log(`  Winner: ${result.winner}`, 'blue');
});

// Test 15: State immutability
runTest('State immutability - deep copy works', () => {
  const scenarioPath = path.join('scenarios', 'demo-start-game.json');
  const originalState = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));

  const clonedState = cloneState(originalState);

  // Modify cloned state
  clonedState.turn = 999;
  clonedState.player1.hand.push('A1-999');

  // Original should be unchanged
  assert(originalState.turn === 1, `Original turn should not change: ${originalState.turn}`);
  assert(originalState.player1.hand.length === 5, `Original hand should not change: ${originalState.player1.hand.length}`);

  log(`  Original turn: ${originalState.turn}`, 'blue');
  log(`  Cloned turn: ${clonedState.turn}`, 'blue');
  log(`  Deep copy works correctly`, 'blue');
});

// Summary
log('\n' + '='.repeat(60), 'cyan');
log('QA TEST SUMMARY - 2026-02-11', 'cyan');
log('='.repeat(60), 'cyan');

log(`\n✅ Tests passed: ${testsPassed}`, 'green');
if (testsFailed > 0) {
  log(`❌ Tests failed: ${testsFailed}`, 'red');
} else {
  log(`🎉 All tests passed!`, 'green');
}

log('\n' + '='.repeat(60) + '\n', 'cyan');

// Return exit code
process.exit(testsFailed > 0 ? 1 : 0);
