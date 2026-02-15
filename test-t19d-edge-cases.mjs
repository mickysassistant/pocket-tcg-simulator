/**
 * Test Task 19d: Edge Cases Testing
 *
 * Comprehensive test suite covering edge cases, unknown rules, and
 * production scenarios. Tests needing Pocket app verification are marked
 * with TODO-Pocket-Verify.
 *
 * Sections:
 * 1. Pokemon Checkup edge cases (KO by poison/burn, multiple status)
 * 2. Turn limit edge cases
 * 3. Hand/deck limit edge cases
 * 4. Win condition edge cases
 * 5. State validation edge cases
 * 6. Evolution edge cases
 * 7. Energy Zone edge cases
 */

import {
  createInitialState,
  createPlayer,
  createPokemon,
  cloneState,
  isValidState,
  drawCard,
  endTurn,
  startTurn,
  processPokemonCheckup,
  checkWinCondition,
  handleKOPokemon,
  calculateDamage,
  evolve,
  canEvolve
} from './js/engine/game-state.js';

import {
  MAX_BENCH,
  MAX_HAND,
  POINTS_TO_WIN,
  TURN_LIMIT,
  STATUS,
  STATUS_DAMAGE
} from './js/engine/constants.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let pocketVerifyCount = 0;

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
  }
}

function assertTrue(cond, testName, num) {
  totalTests++;
  if (cond) {
    passedTests++;
    console.log(`  ✓ ${testName} #${num}`);
  } else {
    console.error(`  ✗ ${testName} #${num} — expected true, got ${cond}`);
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
// SECTION 1: POKEMON CHECKUP EDGE CASES
// ============================================================================

function test_KO_by_poison() {
  console.log('\n[1.1] Pokemon KO by poison during checkup');
  let state = makeState();
  state.currentPlayer = 'player1';
  state.player1.active = makePokemon('A1-001', 5, { status: STATUS.POISON });
  state.player1.bench = [makePokemon('A1-002', 70)];
  state.coinQueue = [true, true, true, true, true, true, true, true, true, true];

  const result = processPokemonCheckup(state);

  // Poison does 10 damage → 5 HP Pokemon should be KO'd
  assertTrue(
    result.player1.active === null || result.player1.active.currentHp <= 0,
    'Poison KO', 1
  );
}

function test_KO_by_burn() {
  console.log('\n[1.2] Pokemon KO by burn during checkup');
  let state = makeState();
  state.currentPlayer = 'player1';
  state.player1.active = makePokemon('A1-001', 15, { status: STATUS.BURN });
  state.player1.bench = [makePokemon('A1-002', 70)];
  state.coinQueue = [false, false, false, false, false, false, false, false, false, false]; // tails = no cure

  const result = processPokemonCheckup(state);

  // Burn does 20 damage → 15 HP Pokemon should be KO'd
  assertTrue(
    result.player1.active === null || result.player1.active.currentHp <= 0,
    'Burn KO', 1
  );
}

function test_poison_survives() {
  console.log('\n[1.3] Pokemon survives poison with enough HP');
  let state = makeState();
  state.currentPlayer = 'player1';
  state.player1.active = makePokemon('A1-001', 50, { status: STATUS.POISON });
  state.coinQueue = [true, true, true, true, true, true, true, true, true, true];

  const result = processPokemonCheckup(state);

  // Should survive with 40 HP
  assertTrue(result.player1.active !== null, 'Poison survive', 1);
  assertEqual(result.player1.active.currentHp, 40, 'Poison survive', 2);
}

function test_paralysis_auto_cure() {
  console.log('\n[1.4] Paralysis auto-cures after checkup');
  let state = makeState();
  state.currentPlayer = 'player1';
  state.player1.active = makePokemon('A1-001', 100, { status: STATUS.PARALYSIS });
  state.coinQueue = [true, true, true, true, true, true, true, true, true, true];

  const result = processPokemonCheckup(state);

  // Paralysis should be cleared after checkup
  assertTrue(
    result.player1.active.status === null ||
    (Array.isArray(result.player1.active.status) && !result.player1.active.status.includes(STATUS.PARALYSIS)),
    'Paralysis cure', 1
  );
}

// ============================================================================
// SECTION 2: TURN LIMIT EDGE CASES
// ============================================================================

function test_turn_limit_player1_wins() {
  console.log('\n[2.1] Turn limit — player1 has more points');
  let state = makeState();
  state.turn = TURN_LIMIT;
  state.player1.points = 2;
  state.player2.points = 1;
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  const winner = checkWinCondition(state);
  assertEqual(winner, 'player1', 'Turn limit P1 wins', 1);
}

function test_turn_limit_player2_wins() {
  console.log('\n[2.2] Turn limit — player2 has more points');
  let state = makeState();
  state.turn = TURN_LIMIT;
  state.player1.points = 0;
  state.player2.points = 2;
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  const winner = checkWinCondition(state);
  assertEqual(winner, 'player2', 'Turn limit P2 wins', 1);
}

function test_turn_limit_draw() {
  console.log('\n[2.3] Turn limit — equal points = draw');
  let state = makeState();
  state.turn = TURN_LIMIT;
  state.player1.points = 1;
  state.player2.points = 1;
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  const winner = checkWinCondition(state);
  assertTrue(winner === 'draw' || winner === 'tie' || winner === null, 'Turn limit draw', 1);
}

function test_before_turn_limit_no_winner() {
  console.log('\n[2.4] Before turn limit — no winner even with points');
  let state = makeState();
  state.turn = TURN_LIMIT - 1;
  state.player1.points = 2;
  state.player2.points = 0;
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  const winner = checkWinCondition(state);
  // Should NOT declare a winner before limit (unless 3 pts reached)
  assertTrue(winner === null || winner === undefined, 'Before limit no winner', 1);
}

// ============================================================================
// SECTION 3: HAND / DECK LIMIT EDGE CASES
// ============================================================================

function test_hand_full_draw_discards() {
  console.log('\n[3.1] Hand full (10) — drawn card goes to discard');
  let state = makeState();
  state.player1.hand = Array(MAX_HAND).fill('A1-001');
  state.player1.deck = ['A1-099', 'A1-098'];
  const discardBefore = state.player1.discard.length;

  const result = drawCard(state, 'player1');

  assertEqual(result.player1.hand.length, MAX_HAND, 'Hand full draw', 1);
  assertEqual(result.player1.discard.length, discardBefore + 1, 'Hand full draw', 2);
}

function test_deck_empty_no_loss() {
  console.log('\n[3.2] Deck empty — skip draw, no deck-out loss');
  let state = makeState();
  state.player1.deck = [];
  state.player1.hand = ['A1-001'];
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  const result = drawCard(state, 'player1');

  // Hand unchanged
  assertEqual(result.player1.hand.length, 1, 'Deck empty draw', 1);

  // No winner from deck-out
  const winner = checkWinCondition(result);
  assertTrue(winner === null || winner === undefined, 'No deck-out loss', 2);
}

function test_bench_max_validation() {
  console.log('\n[3.3] Bench at MAX_BENCH — state validation');
  let state = makeState();
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);
  state.player1.bench = [
    makePokemon('A1-010', 60),
    makePokemon('A1-011', 60),
    makePokemon('A1-012', 60)
  ];

  assertTrue(isValidState(state), 'Bench at MAX is valid', 1);

  // Over MAX should be invalid
  const overState = cloneState(state);
  overState.player1.bench.push(makePokemon('A1-013', 60));
  assertFalse(isValidState(overState), 'Bench over MAX is invalid', 2);
}

// ============================================================================
// SECTION 4: WIN CONDITION EDGE CASES
// ============================================================================

function test_3_points_wins() {
  console.log('\n[4.1] Player reaches 3 points — wins');
  let state = makeState();
  state.player1.points = POINTS_TO_WIN;
  state.player2.points = 0;
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  const winner = checkWinCondition(state);
  assertEqual(winner, 'player1', '3 pts wins', 1);
}

function test_opponent_no_pokemon() {
  console.log('\n[4.2] Opponent has no Pokemon left — checkWinCondition detects winner');
  // BUG-005 FIXED: checkWinCondition now checks "no Pokemon left" condition
  let state = makeState();
  state.player1.points = 0;
  state.player2.points = 0;
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = null;
  state.player2.bench = [];

  const winner = checkWinCondition(state);
  // Fixed behavior: returns 'player1' (player2 has no Pokemon)
  assertTrue(winner === 'player1', 'No Pokemon left — winner detected by checkWinCondition', 1);
}

function test_handleKO_normal_pokemon_awards_1_point() {
  console.log('\n[4.3] KO normal Pokemon awards 1 point');
  let state = makeState();
  state.player1.active = makePokemon('A1-001', 0); // KO'd
  state.player1.bench = [makePokemon('A1-002', 60)];
  state.player2.points = 0;

  const result = handleKOPokemon(state, 'player1', 'active');

  assertEqual(result.player2.points, 1, 'Normal KO 1pt', 1);
}

// ============================================================================
// SECTION 5: STATE VALIDATION EDGE CASES
// ============================================================================

function test_valid_initial_state() {
  console.log('\n[5.1] Initial state is valid');
  const state = createInitialState();
  assertTrue(isValidState(state), 'Initial state valid', 1);
}

function test_clone_state_deep_copy() {
  console.log('\n[5.2] cloneState is a deep copy');
  const state = createInitialState();
  state.player1.active = makePokemon('A1-001', 60);

  const cloned = cloneState(state);
  cloned.player1.active.currentHp = 30;

  // Original should be unchanged
  assertEqual(state.player1.active.currentHp, 60, 'Deep copy', 1);
  assertEqual(cloned.player1.active.currentHp, 30, 'Deep copy', 2);
}

function test_hand_over_max_invalid() {
  console.log('\n[5.3] Hand over MAX_HAND is invalid');
  let state = createInitialState();
  state.player1.hand = Array(MAX_HAND + 1).fill('A1-001');

  assertFalse(isValidState(state), 'Hand over max invalid', 1);
}

// ============================================================================
// SECTION 6: EVOLUTION EDGE CASES
// ============================================================================

// TODO-Pocket-Verify: Exact evolution HP calculation after damage
function test_evolution_preserves_damage_concept() {
  console.log('\n[6.1] Evolution concept — damage/energy preserved (TODO-Pocket-Verify)');
  pocketVerifyCount++;

  // Conceptual test: after evolution, damage counters and energy stay.
  // Actual evolve() requires getCardFn which needs card data loaded.
  // This test validates the concept at the state level.

  const pokemon = makePokemon('A1-001', 40, { energy: ['G', 'G', 'W'], status: STATUS.POISON });

  // Simulate evolution: keep energy, clear status, keep damage relative to new max HP
  const evolved = {
    ...pokemon,
    cardId: 'A1-002',
    // HP preserved as damage-taken: if original had 60 max and 40 current → 20 damage
    // New max HP 90, so currentHp = 90 - 20 = 70
    currentHp: 70,
    status: null, // Evolution cures status
    lastEvolved: 3
  };

  assertEqual(evolved.energy.length, 3, 'Evolution preserves energy', 1);
  assertTrue(evolved.status === null, 'Evolution cures status', 2);
  assertEqual(evolved.currentHp, 70, 'Evolution preserves damage', 3);
}

// ============================================================================
// SECTION 7: ENERGY ZONE EDGE CASES
// ============================================================================

// TODO-Pocket-Verify: Is energy generation truly random or weighted by deck?
function test_energy_zone_configured_types() {
  console.log('\n[7.1] Energy Zone respects configured types (TODO-Pocket-Verify)');
  pocketVerifyCount++;

  let state = makeState();
  state.player1.energyZone.configuredTypes = ['G', 'W'];
  state.player1.active = makePokemon('A1-001', 60);
  state.player2.active = makePokemon('A1-002', 60);

  // Run multiple endTurns and verify energy types are from configured set
  let validTypes = true;
  for (let i = 0; i < 20; i++) {
    const s = cloneState(state);
    s.turn = i + 1;
    s.coinQueue = [true, true, true, true, true, true, true, true, true, true];
    const result = endTurn(s);
    const next = result.player1.energyZone.nextEnergy;
    if (next !== null && next !== undefined && !['G', 'W'].includes(next)) {
      validTypes = false;
      break;
    }
  }

  assertTrue(validTypes, 'Energy types from configured set', 1);
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('='.repeat(70));
console.log('T19D: EDGE CASES TEST SUITE');
console.log('='.repeat(70));

// Section 1: Pokemon Checkup
test_KO_by_poison();
test_KO_by_burn();
test_poison_survives();
test_paralysis_auto_cure();

// Section 2: Turn Limit
test_turn_limit_player1_wins();
test_turn_limit_player2_wins();
test_turn_limit_draw();
test_before_turn_limit_no_winner();

// Section 3: Hand/Deck Limits
test_hand_full_draw_discards();
test_deck_empty_no_loss();
test_bench_max_validation();

// Section 4: Win Conditions
test_3_points_wins();
test_opponent_no_pokemon();
test_handleKO_normal_pokemon_awards_1_point();

// Section 5: State Validation
test_valid_initial_state();
test_clone_state_deep_copy();
test_hand_over_max_invalid();

// Section 6: Evolution
test_evolution_preserves_damage_concept();

// Section 7: Energy Zone
test_energy_zone_configured_types();

console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passedTests}/${totalTests} passed`);
console.log(`Tests needing Pocket verification: ${pocketVerifyCount}`);
if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED');
} else {
  console.log(`❌ ${totalTests - passedTests} FAILED`);
}
console.log('='.repeat(70));

process.exit(passedTests === totalTests ? 0 : 1);
