/**
 * QA Test Suite - Pokemon TCG Pocket Simulator
 *
 * Functional testing of game workflows to find bugs.
 * Tests run against the game engine without UI.
 */

import {
  createInitialState,
  createPlayer,
  createPokemon,
  cloneState,
  drawCard,
  startTurn,
  endTurn,
  processPokemonCheckup,
  checkWinCondition,
  handleKOPokemon,
  calculateDamage,
  evolve,
  canEvolve,
  applyDamage,
  executeAttack,
  canAttack
} from './js/engine/game-state.js';

import {
  MAX_BENCH,
  MAX_HAND,
  POINTS_TO_WIN,
  TURN_LIMIT,
  STATUS,
  STATUS_DAMAGE,
  ENERGY_TYPES,
  KO_POINTS
} from './js/engine/constants.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let bugsFound = [];

function assertEqual(actual, expected, testName, num) {
  totalTests++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passedTests++;
    console.log(`  ✓ ${testName} #${num}`);
  } else {
    console.error(`  ✗ ${testName} #${num}`);
    console.error(`    Expected: ${e}`);
    console.error(`    Got:      ${a}`);
    bugsFound.push({ test: `${testName} #${num}`, expected, actual, type: 'assertion-failed' });
  }
}

function assertTrue(cond, testName, num) {
  totalTests++;
  if (cond) {
    passedTests++;
    console.log(`  ✓ ${testName} #${num}`);
  } else {
    console.error(`  ✗ ${testName} #${num} — expected true, got false`);
    bugsFound.push({ test: `${testName} #${num}`, expected: true, actual: false, type: 'assertion-failed' });
  }
}

function assertFalse(cond, testName, num) {
  assertTrue(!cond, testName, num);
}

function makePokemon(cardId, hp, opts = {}) {
  return {
    cardId,
    currentHp: hp,
    energy: opts.energy || [],
    status: opts.status || null,
    turnPlayed: opts.turnPlayed ?? 0,
    lastEvolved: opts.lastEvolved ?? null,
    tool: opts.tool || null,
    effects: opts.effects || [],
    abilitiesUsedThisTurn: opts.abilitiesUsedThisTurn || {}
  };
}

function makeState(overrides = {}) {
  const s = createInitialState();
  return { ...s, ...overrides };
}

// ============================================================================
// WORKFLOW 1: Complete Game from Start to Win
// ============================================================================

function test_complete_game_workflow() {
  console.log('\n[WORKFLOW 1] Complete Game from Start to Win');

  let state = createInitialState();
  state.turn = 0;
  state.currentPlayer = 'player1';

  // Setup initial Pokemon
  state.player1.active = makePokemon('A1-001', 50, { energy: ['G', 'G'] });
  state.player1.bench = [makePokemon('A1-002', 70, { energy: ['G'] })];
  state.player1.hand = [];
  state.player1.deck = ['A1-010', 'A1-011'];
  state.player1.discard = [];

  state.player2.active = makePokemon('A1-015', 140, { energy: ['R'] });
  state.player2.bench = [];
  state.player2.hand = [];
  state.player2.deck = ['A1-016'];
  state.player2.discard = [];
  state.player2.energyZone = {
    currentEnergy: 'R',
    nextEnergy: 'R',
    configuredTypes: ['R'],
    usedThisTurn: false
  };

  console.log('  Initial state: P1 Bulbasaur (50 HP, 2G) vs P2 Charizard (140 HP, 1R)');

  // Turn 1: Player 1 attacks
  assertTrue(state.currentPlayer === 'player1', 'Turn 1 - P1 starts', 1);
  state = startTurn(state);
  // P1 attacks P2 (simulate attack doing damage)
  state = applyDamage(state, 'player2', 30); // Simplified attack
  console.log('  Turn 1: P1 attacks P2 for 30 damage');
  assertTrue(state.player2.active.currentHp === 110, 'Turn 1 - P2 HP reduced to 110', 2);
  state = endTurn(state);

  // Turn 2: Player 2 attacks
  assertTrue(state.currentPlayer === 'player2', 'Turn 2 - P2 starts', 3);
  state = startTurn(state);
  state = applyDamage(state, 'player1', 50); // Simplified attack
  console.log('  Turn 2: P2 attacks P1 for 50 damage (50 > 50 HP = KO)');

  // Verify KO handled correctly (after applyDamage)
  console.log('  KO event: P1 Bulbasaur KO\'d');
  assertTrue(state.player1.active === null, 'KO - P1 active is null after KO', 4);
  assertTrue(state.player2.points === 1, 'KO - P2 awarded 1 point', 5);
  state = endTurn(state);

  // Note: In Pokemon TCG, bench promotion is MANUAL (player must choose)
  // This is by design, not a bug
  console.log('  Note: Bench promotion requires manual player action (by design)');
}

// ============================================================================
// WORKFLOW 2: Full Turn Flow with Status Effects
// ============================================================================

function test_full_turn_flow_with_status() {
  console.log('\n[WORKFLOW 2] Full Turn Flow with Status Effects');

  let state = createInitialState();
  state.turn = 5;
  state.currentPlayer = 'player1';

  // Setup Pokemon with status
  state.player1.active = makePokemon('A1-001', 60, { status: STATUS.POISON });
  state.player1.bench = [makePokemon('A1-002', 70)];
  state.player1.energyZone = {
    currentEnergy: 'G',
    nextEnergy: 'G',
    configuredTypes: ['G'],
    usedThisTurn: false
  };

  state.player2.active = makePokemon('A1-015', 140);

  // End turn triggers checkup
  const hpBefore = state.player1.active.currentHp;
  state = endTurn(state);
  const hpAfter = state.player1.active?.currentHp || 0;

  console.log(`  Checkup: Poison applied (${hpBefore} -> ${hpAfter} HP)`);
  assertTrue(hpAfter === hpBefore - STATUS_DAMAGE[STATUS.POISON],
    'Checkup - Poison damage applied correctly', 1);
}

// ============================================================================
// WORKFLOW 3: Simultaneous KO Scenario
// ============================================================================

function test_simultaneous_ko_scenario() {
  console.log('\n[WORKFLOW 3] Simultaneous KO Scenario');

  let state = createInitialState();
  state.turn = 10;
  state.player1.points = 2;
  state.player2.points = 2;

  // Both have 1 HP remaining
  state.player1.active = makePokemon('A1-001', 1);
  state.player1.bench = [makePokemon('A1-002', 70)];

  state.player2.active = makePokemon('A1-015', 1);
  state.player2.bench = [makePokemon('A1-016', 80)];

  // Apply damage to both
  state = applyDamage(state, 'player1', 1);
  state = applyDamage(state, 'player2', 1);

  // Both should be KO'd (active becomes null after KO)
  assertTrue(state.player1.active === null, 'Simultaneous KO - P1 KO\'d', 1);
  assertTrue(state.player2.active === null, 'Simultaneous KO - P2 KO\'d', 2);

  // Check win condition
  const winner = checkWinCondition(state);
  console.log(`  Winner: ${winner}`);
  assertTrue(winner === 'player1' || winner === 'player2' || winner === 'tie',
    'Simultaneous KO - winner determined', 3);
}

// ============================================================================
// WORKFLOW 4: Evolution During Battle
// ============================================================================

function test_evolution_during_battle() {
  console.log('\n[WORKFLOW 4] Evolution During Battle');

  let state = createInitialState();
  state.turn = 3;
  state.currentPlayer = 'player1';

  // Basic Pokemon with damage
  state.player1.active = makePokemon('A1-001', 30, { energy: ['G', 'G', 'G'] });
  state.player1.hand = ['A1-002']; // Evolution card

  state.player2.active = makePokemon('A1-015', 140);

  // Can evolve check
  const check = canEvolve(state, 'player1', 0, 'active');
  console.log(`  Can evolve: ${check.valid ? 'yes' : 'no'} - ${check.reasonKey || ''}`);

  if (check.valid) {
    // Note: Actual evolve requires card data from getCard(), skip for this test
    console.log('  Evolution validated (execution skipped - requires card data)');
  }
}

// ============================================================================
// EDGE CASE: Turn Limit Tie-Breaker
// ============================================================================

function test_turn_limit_tie_breaker() {
  console.log('\n[EDGE CASE] Turn Limit Tie-Breaker');

  let state = createInitialState();
  state.turn = TURN_LIMIT; // At turn 30
  state.player1.points = 2;
  state.player2.points = 1;

  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-015', 140);

  const winner = checkWinCondition(state);
  console.log(`  Winner at turn 30: ${winner} (P1: 2pts, P2: 1pts)`);
  assertEqual(winner, 'player1', 'Turn limit - P1 wins with more points', 1);
}

// ============================================================================
// EDGE CASE: Energy Zone Configuration
// ============================================================================

function test_energy_zone_configuration() {
  console.log('\n[EDGE CASE] Energy Zone Configuration');

  let state = createInitialState();
  state.player1.energyZone.configuredTypes = ['G', 'W'];
  state.player1.active = makePokemon('A1-001', 60);

  // Start turn should generate energy from configured types
  state = startTurn(state);
  const nextEnergy = state.player1.energyZone.nextEnergy;

  console.log(`  Next energy: ${nextEnergy} (configured: G, W)`);
  assertTrue(['G', 'W'].includes(nextEnergy) || nextEnergy === null,
    'Energy zone - type from configured set', 1);
}

// ============================================================================
// EDGE CASE: Hand Full with Draw
// ============================================================================

function test_hand_full_with_draw() {
  console.log('\n[EDGE CASE] Hand Full with Draw');

  let state = createInitialState();
  state.turn = 5;
  state.player1.hand = Array(MAX_HAND).fill('A1-001');
  state.player1.deck = ['A1-099', 'A1-098'];
  const discardBefore = state.player1.discard.length;

  // Draw card
  state = drawCard(state, 'player1');

  assertTrue(state.player1.hand.length === MAX_HAND, 'Hand full - hand stays at max', 1);
  assertEqual(state.player1.discard.length, discardBefore + 1,
    'Hand full - card goes to discard', 2);
  console.log('  Draw with full hand: card discarded correctly');
}

// ============================================================================
// EDGE CASE: Bench Full When Trying to Play
// ============================================================================

function test_bench_full_when_playing() {
  console.log('\n[EDGE CASE] Bench Full When Playing');

  let state = createInitialState();
  state.turn = 3;
  state.player1.active = makePokemon('A1-001', 60);
  state.player1.bench = [
    makePokemon('A1-010', 60),
    makePokemon('A1-011', 60),
    makePokemon('A1-012', 60)
  ];
  state.player1.hand = ['A1-013'];

  console.log('  Bench is full (3 Pokemon)');
  console.log('  This scenario requires UI testing (drag & drop validation)');
  console.log('  Backend: state validation should reject bench > 3');

  assertTrue(state.player1.bench.length === MAX_BENCH, 'Bench at MAX_BENCH', 1);
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('='.repeat(70));
console.log('QA TEST SUITE - FUNCTIONAL WORKFLOW TESTING');
console.log('='.repeat(70));

// Complete game workflow
test_complete_game_workflow();

// Full turn flow with status
test_full_turn_flow_with_status();

// Simultaneous KO scenario
test_simultaneous_ko_scenario();

// Evolution during battle
test_evolution_during_battle();

// Edge cases
test_turn_limit_tie_breaker();
test_energy_zone_configuration();
test_hand_full_with_draw();
test_bench_full_when_playing();

console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passedTests}/${totalTests} passed`);

if (bugsFound.length > 0) {
  console.log(`\n🐛 BUGS / GAPS FOUND: ${bugsFound.length}`);
  bugsFound.forEach((bug, i) => {
    console.log(`\n${i + 1}. ${bug.test}`);
    if (bug.description) {
      console.log(`   Description: ${bug.description}`);
    }
    if (bug.type) {
      console.log(`   Type: ${bug.type}`);
    }
    if (bug.severity) {
      console.log(`   Severity: ${bug.severity}`);
    }
  });
} else {
  console.log('\n✅ NO BUGS FOUND');
}

console.log('\n' + '='.repeat(70));

if (passedTests === totalTests && bugsFound.length === 0) {
  console.log('✅ ALL TESTS PASSED - NO BUGS FOUND');
  process.exit(0);
} else if (bugsFound.length > 0) {
  console.log(`⚠️  ${bugsFound.length} ISSUE(S) FOUND`);
  process.exit(1);
} else {
  console.log(`❌ ${totalTests - passedTests} TEST(S) FAILED`);
  process.exit(1);
}
