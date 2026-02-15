/**
 * Test Task 14: Win Conditions + Points (Node.js)
 *
 * Tests:
 * 1. Points awarded on KO (normal Pokemon)
 * 2. Points awarded on KO (EX Pokemon)
 * 3. 3 points win condition
 * 4. No winner before 3 points
 * 5. Simultaneous KO - player1 has bench, player2 doesn't
 * 6. Simultaneous KO - player2 has bench, player1 doesn't
 * 7. Simultaneous KO - both have bench (draw)
 * 8. Simultaneous KO - neither has bench (draw)
 * 9. Turn limit - player1 has more points
 * 10. Turn limit - player2 has more points
 * 11. Turn limit - equal points (draw)
 * 12. Before turn limit - no winner even with points
 * 13. Game over logging (tie case)
 * 14. Game over logging (winner case)
 */

import {
  createInitialState,
  checkWinCondition,
  endTurn,
  handleKOPokemon
} from './js/engine/game-state.js';
import { POINTS_TO_WIN, TURN_LIMIT } from './js/engine/constants.js';

// Test utilities
let totalTests = 0;
let passedTests = 0;

function assertEqual(actual, expected, testName, assertionNum) {
  totalTests++;
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  const passed = actualStr === expectedStr;

  if (passed) {
    passedTests++;
    console.log(`  ✓ ${testName} - Assertion ${assertionNum}`);
  } else {
    console.error(`  ✗ ${testName} - Assertion ${assertionNum}`);
    console.error(`    Expected: ${expectedStr}`);
    console.error(`    Got: ${actualStr}`);
  }

  return passed;
}

function assertTrue(condition, testName, assertionNum) {
  totalTests++;
  const passed = condition === true;

  if (passed) {
    passedTests++;
    console.log(`  ✓ ${testName} - Assertion ${assertionNum}`);
  } else {
    console.error(`  ✗ ${testName} - Assertion ${assertionNum}`);
    console.error(`    Expected: true, Got: ${condition}`);
  }

  return passed;
}

function assertFalse(condition, testName, assertionNum) {
  totalTests++;
  const passed = condition === false;

  if (passed) {
    passedTests++;
    console.log(`  ✓ ${testName} - Assertion ${assertionNum}`);
  } else {
    console.error(`  ✗ ${testName} - Assertion ${assertionNum}`);
    console.error(`    Expected: false, Got: ${condition}`);
  }

  return passed;
}

// Test 1: Points awarded on KO (normal Pokemon)
function test1_PointsAwardedOnKO() {
  console.log('\nTest 1: Points Awarded on KO (normal Pokemon)');

  let state = createInitialState();

  // Create a normal Pokemon in active spot
  state.player1.active = {
    cardId: 'A1-001',
    currentHp: 60,
    energy: [],
    status: null,
    turnPlayed: 0
  };

  state = handleKOPokemon(state, 'player1', 'active');

  // Player 2 should get 1 point
  assertEqual(state.player2.points, 1, 'Test 1', 1);
  // Player 1 active should be null
  assertEqual(state.player1.active, null, 'Test 1', 2);
  // Card should be in discard
  assertTrue(state.player1.discard.length > 0, 'Test 1', 3);
}

// Test 2: Points awarded on KO (EX Pokemon)
function test2_PointsAwardedOnEXKO() {
  console.log('\nTest 2: Points Awarded on KO (EX Pokemon)');

  let state = createInitialState();

  // Create an EX Pokemon (cardId contains 'ex')
  state.player1.active = {
    cardId: 'A1-123ex',
    currentHp: 0,
    energy: [],
    status: null,
    turnPlayed: 0
  };

  state = handleKOPokemon(state, 'player1', 'active');

  // Player 2 should get 2 points for EX KO
  assertEqual(state.player2.points, 2, 'Test 2', 1);
  // Player 1 active should be null
  assertEqual(state.player1.active, null, 'Test 2', 2);
}

// Test 3: 3 points win condition
function test3_3PointsWinCondition() {
  console.log('\nTest 3: 3 Points Win Condition');

  let state = createInitialState();

  // Give player1 exactly 3 points
  state.player1.points = POINTS_TO_WIN;

  const winner = checkWinCondition(state);

  assertEqual(winner, 'player1', 'Test 3', 1);
}

// Test 4: No winner before 3 points
function test4_NoWinnerBefore3Points() {
  console.log('\nTest 4: No Winner Before 3 Points');

  let state = createInitialState();

  // Both have 2 points
  state.player1.points = 2;
  state.player2.points = 2;

  const winner = checkWinCondition(state);

  // No winner yet
  assertEqual(winner, null, 'Test 4', 1);
}

// Test 5: Simultaneous KO - player1 has bench, player2 doesn't
function test5_SimultaneousKO_Player1Bench() {
  console.log('\nTest 5: Simultaneous KO - Player1 Has Bench');

  let state = createInitialState();

  // Both players have 3 points
  state.player1.points = POINTS_TO_WIN;
  state.player2.points = POINTS_TO_WIN;

  // Player1 has bench Pokemon, player2 doesn't
  state.player1.bench = [
    { cardId: 'A1-001', currentHp: 60, energy: [], status: null, turnPlayed: 0 },
    null,
    null
  ];
  state.player2.bench = [null, null, null];

  const winner = checkWinCondition(state);

  // Player1 should win (has bench Pokemon)
  assertEqual(winner, 'player1', 'Test 5', 1);
}

// Test 6: Simultaneous KO - player2 has bench, player1 doesn't
function test6_SimultaneousKO_Player2Bench() {
  console.log('\nTest 6: Simultaneous KO - Player2 Has Bench');

  let state = createInitialState();

  state.player1.points = POINTS_TO_WIN;
  state.player2.points = POINTS_TO_WIN;

  // Player2 has bench Pokemon, player1 doesn't
  state.player1.bench = [null, null, null];
  state.player2.bench = [
    { cardId: 'A1-002', currentHp: 60, energy: [], status: null, turnPlayed: 0 },
    null,
    null
  ];

  const winner = checkWinCondition(state);

  // Player2 should win (has bench Pokemon)
  assertEqual(winner, 'player2', 'Test 6', 1);
}

// Test 7: Simultaneous KO - both have bench (draw)
function test7_SimultaneousKO_BothBench() {
  console.log('\nTest 7: Simultaneous KO - Both Have Bench (Draw)');

  let state = createInitialState();

  state.player1.points = POINTS_TO_WIN;
  state.player2.points = POINTS_TO_WIN;

  // Both players have bench Pokemon
  state.player1.bench = [
    { cardId: 'A1-001', currentHp: 60, energy: [], status: null, turnPlayed: 0 },
    null,
    null
  ];
  state.player2.bench = [
    { cardId: 'A1-002', currentHp: 60, energy: [], status: null, turnPlayed: 0 },
    null,
    null
  ];

  const winner = checkWinCondition(state);

  // Should be a tie
  assertEqual(winner, 'tie', 'Test 7', 1);
}

// Test 8: Simultaneous KO - neither has bench (draw)
function test8_SimultaneousKO_NoBench() {
  console.log('\nTest 8: Simultaneous KO - Neither Has Bench (Draw)');

  let state = createInitialState();

  state.player1.points = POINTS_TO_WIN;
  state.player2.points = POINTS_TO_WIN;

  // Neither player has bench Pokemon
  state.player1.bench = [null, null, null];
  state.player2.bench = [null, null, null];

  const winner = checkWinCondition(state);

  // Should be a tie
  assertEqual(winner, 'tie', 'Test 8', 1);
}

// Test 9: Turn limit - player1 has more points
function test9_TurnLimit_Player1MorePoints() {
  console.log('\nTest 9: Turn Limit - Player1 Has More Points');

  let state = createInitialState();

  state.turn = TURN_LIMIT;
  state.player1.points = 2;
  state.player2.points = 1;

  const winner = checkWinCondition(state);

  // Player1 should win by points
  assertEqual(winner, 'player1', 'Test 9', 1);
}

// Test 10: Turn limit - player2 has more points
function test10_TurnLimit_Player2MorePoints() {
  console.log('\nTest 10: Turn Limit - Player2 Has More Points');

  let state = createInitialState();

  state.turn = TURN_LIMIT;
  state.player1.points = 1;
  state.player2.points = 2;

  const winner = checkWinCondition(state);

  // Player2 should win by points
  assertEqual(winner, 'player2', 'Test 10', 1);
}

// Test 11: Turn limit - equal points (draw)
function test11_TurnLimit_EqualPoints() {
  console.log('\nTest 11: Turn Limit - Equal Points (Draw)');

  let state = createInitialState();

  state.turn = TURN_LIMIT;
  state.player1.points = 2;
  state.player2.points = 2;

  const winner = checkWinCondition(state);

  // Should be a tie (equal points at turn limit)
  assertEqual(winner, 'tie', 'Test 11', 1);
}

// Test 12: Before turn limit - no winner even with points
function test12_BeforeTurnLimit_NoWinner() {
  console.log('\nTest 12: Before Turn Limit - No Winner Even With Points');

  let state = createInitialState();

  state.turn = TURN_LIMIT - 1;
  state.player1.points = 2;
  state.player2.points = 1;

  const winner = checkWinCondition(state);

  // No winner yet (turn limit not reached)
  assertEqual(winner, null, 'Test 12', 1);
}

// Test 13: Game over logging (tie case)
function test13_GameOverLoggingTie() {
  console.log('\nTest 13: Game Over Logging (Tie)');

  let state = createInitialState();

  state.turn = TURN_LIMIT;
  state.player1.points = 2;
  state.player2.points = 2;

  state = endTurn(state);

  // Winner should be 'tie'
  assertEqual(state.winner, 'tie', 'Test 13', 1);
  // Log should have game over entry
  assertTrue(
    state.log.some(entry => entry.action === 'gameOver'),
    'Test 13',
    2
  );
  // Log entry should indicate tie
  assertTrue(
    state.log.some(entry =>
      entry.action === 'gameOver' && entry.details === 'Game ended in a tie!'
    ),
    'Test 13',
    3
  );
}

// Test 14: Game over logging (winner case)
function test14_GameOverLoggingWinner() {
  console.log('\nTest 14: Game Over Logging (Winner)');

  let state = createInitialState();

  state.player1.points = POINTS_TO_WIN;

  state = endTurn(state);

  // Winner should be set
  assertTrue(state.winner !== undefined, 'Test 14', 1);
  assertEqual(state.winner, 'player1', 'Test 14', 2);
  // Log should have game over entry
  assertTrue(
    state.log.some(entry => entry.action === 'gameOver'),
    'Test 14',
    3
  );
  // Log entry should indicate winner
  assertTrue(
    state.log.some(entry =>
      entry.action === 'gameOver' && entry.details === 'player1 wins!'
    ),
    'Test 14',
    4
  );
}

// Run all tests
function runAllTests() {
  console.log('======================================');
  console.log('Task 14: Win Conditions + Points');
  console.log('======================================');

  test1_PointsAwardedOnKO();
  test2_PointsAwardedOnEXKO();
  test3_3PointsWinCondition();
  test4_NoWinnerBefore3Points();
  test5_SimultaneousKO_Player1Bench();
  test6_SimultaneousKO_Player2Bench();
  test7_SimultaneousKO_BothBench();
  test8_SimultaneousKO_NoBench();
  test9_TurnLimit_Player1MorePoints();
  test10_TurnLimit_Player2MorePoints();
  test11_TurnLimit_EqualPoints();
  test12_BeforeTurnLimit_NoWinner();
  test13_GameOverLoggingTie();
  test14_GameOverLoggingWinner();

  console.log('\n======================================');
  console.log(`Results: ${passedTests}/${totalTests} tests passed`);
  console.log('======================================');

  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log(`❌ ${totalTests - passedTests} test(s) failed\n`);
    process.exit(1);
  }
}

runAllTests();
