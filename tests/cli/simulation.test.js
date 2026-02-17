/**
 * Test: Simulation Command (CLI-012)
 *
 * Tests the batch simulation functionality for balance analysis.
 *
 * Acceptance Criteria:
 * 1. tcgp sim run --games N --parallel M works
 * 2. Report includes winrate and average turns
 * 3. Includes first-player advantage metric
 */

const simulation = require('../../src/cli/services/simulation');
const { createGame } = require('../../src/index');

// Test utility functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected} ± ${tolerance}\nActual: ${actual}`);
  }
}

// Test counter
let testsPassed = 0;
let testsFailed = 0;
let testPromises = [];

function runTest(testName, testFn) {
  const promise = (async () => {
    try {
      await testFn();
      testsPassed++;
      console.log(`✓ ${testName}`);
    } catch (error) {
      testsFailed++;
      console.error(`✗ ${testName}`);
      console.error(`  Error: ${error.message}`);
    }
  })();

  testPromises.push(promise);
}

// Helper: Create a simple deck
function createDeck(size = 20) {
  return Array.from({ length: size }, (_, i) => ({
    id: `card-${i}`,
    name: `Test Card ${i}`,
    supertype: 'Pokémon',
    hp: 60
  }));
}

// =============================================================================
// SERVICE TESTS
// =============================================================================

// Test 1: Simulate a single game with seed
runTest('simulateGame runs a single game with seed', () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const result = simulation.simulateGame(deck1, deck2, 'test-seed-1');

  assert(result !== null, 'Result should not be null');
  assert(result.seed === 'test-seed-1', 'Seed should be preserved');
  assert(result.turnCount > 0, 'Turn count should be positive');
  assert(result.turnCount <= 30, 'Turn count should not exceed 30 (turn limit)');
});

// Test 2: Simulate same seed produces same result
runTest('simulateGame is deterministic with same seed', () => {
  const deck1 = createDeck();
  const deck2 = createDeck();

  const result1 = simulation.simulateGame(deck1, deck2, 'deterministic-seed');
  const result2 = simulation.simulateGame(deck1, deck2, 'deterministic-seed');

  assertEqual(result1.turnCount, result2.turnCount, 'Turn count should be the same');
  assertEqual(result1.winner, result2.winner, 'Winner should be the same');
});

// Test 3: Different seeds produce potentially different results
runTest('simulateGame runs successfully with different seeds', () => {
  const deck1 = createDeck();
  const deck2 = createDeck();

  const result1 = simulation.simulateGame(deck1, deck2, 'seed-1');
  const result2 = simulation.simulateGame(deck1, deck2, 'seed-2');

  // Both should complete successfully with valid results
  assert(result1.turnCount > 0, 'First result should have positive turn count');
  assert(result2.turnCount > 0, 'Second result should have positive turn count');
  assert(result1.winner !== null || result1.isDraw, 'First result should have winner or be a draw');
  assert(result2.winner !== null || result2.isDraw, 'Second result should have winner or be a draw');
});

// Test 4: Batch simulation runs correct number of games
runTest('runBatchSimulation runs correct number of games', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 10;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  assertEqual(results.totalGames, numGames, 'Should run exactly 10 games');
  assertEqual(results.games.length, numGames, 'Games array should have 10 entries');
  assertEqual(results.player1Wins + results.player2Wins + results.draws, numGames, 'Sum of outcomes should equal total games');
});

// Test 5: Batch simulation tracks player 1 wins
runTest('runBatchSimulation tracks player 1 wins correctly', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 50;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Player 1 should have some wins (not guaranteed to be all)
  assert(results.player1Wins >= 0, 'Player 1 wins should be non-negative');
  assert(results.player1Wins <= numGames, 'Player 1 wins should not exceed total games');
});

// Test 6: Batch simulation tracks player 2 wins
runTest('runBatchSimulation tracks player 2 wins correctly', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 50;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Player 2 should have some wins (not guaranteed to be all)
  assert(results.player2Wins >= 0, 'Player 2 wins should be non-negative');
  assert(results.player2Wins <= numGames, 'Player 2 wins should not exceed total games');
});

// Test 7: Batch simulation tracks draws
runTest('runBatchSimulation tracks draws correctly', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 50;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Draws should be counted
  assert(results.draws >= 0, 'Draws should be non-negative');
  assert(results.draws <= numGames, 'Draws should not exceed total games');
});

// Test 8: Batch simulation calculates average turns correctly
runTest('runBatchSimulation calculates average turns correctly', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 100;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Average turns should be between 1 and 30 (turn limit)
  assert(results.averageTurns > 0, 'Average turns should be positive');
  assert(results.averageTurns <= 30, 'Average turns should not exceed turn limit');
  assert(results.totalTurns === results.games.reduce((sum, g) => sum + g.turnCount, 0), 'Total turns should match sum of game turns');
});

// Test 9: Batch simulation calculates player 1 win rate
runTest('runBatchSimulation calculates player 1 win rate', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 100;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Win rate should be between 0 and 1
  assert(results.player1WinRate >= 0, 'Player 1 win rate should be non-negative');
  assert(results.player1WinRate <= 1, 'Player 1 win rate should not exceed 1');

  // Win rate should equal wins / total games
  const expectedWinRate = results.player1Wins / numGames;
  assertClose(results.player1WinRate, expectedWinRate, 0.0001, 'Win rate calculation should match');
});

// Test 10: Batch simulation calculates player 2 win rate
runTest('runBatchSimulation calculates player 2 win rate', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 100;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Win rate should be between 0 and 1
  assert(results.player2WinRate >= 0, 'Player 2 win rate should be non-negative');
  assert(results.player2WinRate <= 1, 'Player 2 win rate should not exceed 1');

  // Win rate should equal wins / total games
  const expectedWinRate = results.player2Wins / numGames;
  assertClose(results.player2WinRate, expectedWinRate, 0.0001, 'Win rate calculation should match');
});

// Test 11: Batch simulation calculates draw rate
runTest('runBatchSimulation calculates draw rate', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 100;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // Draw rate should be between 0 and 1
  assert(results.drawRate >= 0, 'Draw rate should be non-negative');
  assert(results.drawRate <= 1, 'Draw rate should not exceed 1');

  // Draw rate should equal draws / total games
  const expectedDrawRate = results.draws / numGames;
  assertClose(results.drawRate, expectedDrawRate, 0.0001, 'Draw rate calculation should match');
});

// Test 12: Batch simulation calculates first-player advantage
runTest('runBatchSimulation calculates first-player advantage metric', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 100;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, 1);

  // First-player advantage should be calculated
  assert(typeof results.firstPlayerAdvantage === 'number', 'First-player advantage should be a number');

  // Should equal (player1WinRate - player2WinRate) * 100
  const expectedAdvantage = (results.player1WinRate - results.player2WinRate) * 100;
  assertClose(results.firstPlayerAdvantage, expectedAdvantage, 0.01, 'First-player advantage calculation should match');

  // Advantage can range from -100 to +100
  assert(results.firstPlayerAdvantage >= -100, 'First-player advantage should not be less than -100');
  assert(results.firstPlayerAdvantage <= 100, 'First-player advantage should not exceed 100');
});

// Test 13: Batch simulation supports parallel execution
runTest('runBatchSimulation runs with parallel > 1', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 20;
  const parallel = 4;

  const results = await simulation.runBatchSimulation(deck1, deck2, numGames, parallel);

  assertEqual(results.totalGames, numGames, 'Should run all 20 games');
  assertEqual(results.games.length, numGames, 'Games array should have 20 entries');
});

// Test 14: Batch simulation progress callback is called
runTest('runBatchSimulation calls progress callback', async () => {
  const deck1 = createDeck();
  const deck2 = createDeck();
  const numGames = 10;

  let callbackCount = 0;
  const progressCallback = (gameNum, totalGames, result) => {
    callbackCount++;
    assert(gameNum > 0, 'Game number should be positive');
    assert(gameNum <= totalGames, 'Game number should not exceed total');
    assert(result !== null, 'Result should not be null');
  };

  await simulation.runBatchSimulation(deck1, deck2, numGames, 1, progressCallback);

  assertEqual(callbackCount, numGames, 'Progress callback should be called for each game');
});

// Test 15: formatSimulationResults returns summary
runTest('formatSimulationResults returns summary statistics', () => {
  const results = {
    totalGames: 100,
    player1Wins: 50,
    player2Wins: 40,
    draws: 10,
    totalTurns: 3000,
    games: [],
    player1WinRate: 0.5,
    player2WinRate: 0.4,
    drawRate: 0.1,
    averageTurns: 30,
    firstPlayerAdvantage: 10
  };

  const formatted = simulation.formatSimulationResults(results, false);

  assert(formatted.summary !== undefined, 'Should have summary object');
  assertEqual(formatted.summary.totalGames, 100, 'Total games should match');
  assertEqual(formatted.summary.player1Wins, 50, 'Player 1 wins should match');
  assertEqual(formatted.summary.player2Wins, 40, 'Player 2 wins should match');
  assertEqual(formatted.summary.draws, 10, 'Draws should match');
});

// Test 16: formatSimulationResults includes average turns
runTest('formatSimulationResults includes average turns', () => {
  const results = {
    totalGames: 100,
    player1Wins: 50,
    player2Wins: 40,
    draws: 10,
    totalTurns: 3000,
    games: [],
    player1WinRate: 0.5,
    player2WinRate: 0.4,
    drawRate: 0.1,
    averageTurns: 30,
    firstPlayerAdvantage: 10
  };

  const formatted = simulation.formatSimulationResults(results, false);

  assertEqual(formatted.summary.averageTurns, 30, 'Average turns should match');
  assert(typeof formatted.summary.averageTurns === 'number', 'Average turns should be a number');
});

// Test 17: formatSimulationResults includes win rates
runTest('formatSimulationResults includes win rates', () => {
  const results = {
    totalGames: 100,
    player1Wins: 50,
    player2Wins: 40,
    draws: 10,
    totalTurns: 3000,
    games: [],
    player1WinRate: 0.5,
    player2WinRate: 0.4,
    drawRate: 0.1,
    averageTurns: 30,
    firstPlayerAdvantage: 10
  };

  const formatted = simulation.formatSimulationResults(results, false);

  assertEqual(formatted.summary.player1WinRate, 50, 'Player 1 win rate should be 50%');
  assertEqual(formatted.summary.player2WinRate, 40, 'Player 2 win rate should be 40%');
  assertEqual(formatted.summary.drawRate, 10, 'Draw rate should be 10%');
});

// Test 18: formatSimulationResults includes first-player advantage
runTest('formatSimulationResults includes first-player advantage', () => {
  const results = {
    totalGames: 100,
    player1Wins: 50,
    player2Wins: 40,
    draws: 10,
    totalTurns: 3000,
    games: [],
    player1WinRate: 0.5,
    player2WinRate: 0.4,
    drawRate: 0.1,
    averageTurns: 30,
    firstPlayerAdvantage: 10
  };

  const formatted = simulation.formatSimulationResults(results, false);

  assertEqual(formatted.summary.firstPlayerAdvantage, 10, 'First-player advantage should be 10%');
  assert(typeof formatted.summary.firstPlayerAdvantage === 'number', 'First-player advantage should be a number');
});

// Test 19: formatSimulationResults with verbose includes games
runTest('formatSimulationResults with verbose includes games array', () => {
  const results = {
    totalGames: 2,
    player1Wins: 1,
    player2Wins: 1,
    draws: 0,
    totalTurns: 60,
    games: [
      { gameIndex: 0, seed: 'sim-0', turnCount: 30, winner: 'player1', reason: 'simulated' },
      { gameIndex: 1, seed: 'sim-1', turnCount: 30, winner: 'player2', reason: 'simulated' }
    ],
    player1WinRate: 0.5,
    player2WinRate: 0.5,
    drawRate: 0,
    averageTurns: 30,
    firstPlayerAdvantage: 0
  };

  const formatted = simulation.formatSimulationResults(results, true);

  assert(formatted.games !== undefined, 'Should include games array');
  assertEqual(formatted.games.length, 2, 'Games array should have 2 entries');
  assertEqual(formatted.games[0].gameIndex, 0, 'First game index should be 0');
});

// Test 20: formatSimulationResults without verbose excludes games
runTest('formatSimulationResults without verbose excludes games array', () => {
  const results = {
    totalGames: 2,
    player1Wins: 1,
    player2Wins: 1,
    draws: 0,
    totalTurns: 60,
    games: [
      { gameIndex: 0, seed: 'sim-0', turnCount: 30, winner: 'player1', reason: 'simulated' },
      { gameIndex: 1, seed: 'sim-1', turnCount: 30, winner: 'player2', reason: 'simulated' }
    ],
    player1WinRate: 0.5,
    player2WinRate: 0.5,
    drawRate: 0,
    averageTurns: 30,
    firstPlayerAdvantage: 0
  };

  const formatted = simulation.formatSimulationResults(results, false);

  assert(formatted.games === undefined, 'Should not include games array when verbose is false');
});

// =============================================================================
// INTEGRATION TESTS (with CLI)
// =============================================================================

const simCmd = require('../../src/cli/commands/sim');
const fs = require('fs');
const path = require('path');

// Test 21: CLI command sim run executes successfully
runTest('CLI sim run executes successfully', async () => {
  const deck1Path = path.join(__dirname, 'fixtures', 'test-deck-1.json');
  const deck2Path = path.join(__dirname, 'fixtures', 'test-deck-2.json');

  // Mock process.exit to prevent CLI from exiting test runner
  const originalExit = process.exit;
  process.exit = () => {}; // No-op mock

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', '10', '--parallel', '1', '--p1', deck1Path, '--p2', deck2Path],
      formatOutput: (data) => { /* capture but don't output */ }
    };

    // Should not throw
    await simCmd(argv);
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// Test 22: CLI sim run with --games flag works
runTest('CLI sim run with --games flag accepts various values', async () => {
  const deck1Path = path.join(__dirname, 'fixtures', 'test-deck-1.json');
  const deck2Path = path.join(__dirname, 'fixtures', 'test-deck-2.json');

  // Mock process.exit to prevent CLI from exiting test runner
  const originalExit = process.exit;
  process.exit = () => {}; // No-op mock

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', '5', '--parallel', '1', '--p1', deck1Path, '--p2', deck2Path],
      formatOutput: (data) => { /* capture */ }
    };

    await simCmd(argv);
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// Test 23: CLI sim run with --parallel flag works
runTest('CLI sim run with --parallel flag accepts various values', async () => {
  const deck1Path = path.join(__dirname, 'fixtures', 'test-deck-1.json');
  const deck2Path = path.join(__dirname, 'fixtures', 'test-deck-2.json');

  // Mock process.exit to prevent CLI from exiting test runner
  const originalExit = process.exit;
  process.exit = () => {}; // No-op mock

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', '10', '--parallel', '2', '--p1', deck1Path, '--p2', deck2Path],
      formatOutput: (data) => { /* capture */ }
    };

    await simCmd(argv);
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// Test 24: CLI sim run validates --games argument
runTest('CLI sim run validates --games argument', async () => {
  const deck1Path = path.join(__dirname, 'fixtures', 'test-deck-1.json');
  const deck2Path = path.join(__dirname, 'fixtures', 'test-deck-2.json');

  let capturedOutput = null;
  let exitCode = null;

  // Mock process.exit to capture exit attempts
  const originalExit = process.exit;
  process.exit = (code) => {
    exitCode = code;
    // Don't throw - just mark that exit was called
  };

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', 'invalid', '--parallel', '1', '--p1', deck1Path, '--p2', deck2Path],
      formatOutput: (data) => {
        if (!capturedOutput) {
          capturedOutput = data; // Capture first call (the error message)
        }
      }
    };

    await simCmd(argv);
    assert(exitCode === 1, 'Should call process.exit(1) for error');
    assert(capturedOutput !== null, 'Should have captured error output');
    assert(capturedOutput.reason === 'INVALID_ARGUMENT', 'Should return INVALID_ARGUMENT for invalid --games');
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// Test 25: CLI sim run validates missing --p1 argument
runTest('CLI sim run validates missing --p1 argument', async () => {
  const deck2Path = path.join(__dirname, 'fixtures', 'test-deck-2.json');

  let capturedOutput = null;
  let exitCode = null;

  // Mock process.exit to capture exit attempts
  const originalExit = process.exit;
  process.exit = (code) => { exitCode = code; };

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', '10', '--parallel', '1', '--p2', deck2Path],
      formatOutput: (data) => {
        if (!capturedOutput) {
          capturedOutput = data; // Capture first call (the error message)
        }
      }
    };

    await simCmd(argv);
    assert(exitCode === 1, 'Should call process.exit(1) for error');
    assert(capturedOutput !== null, 'Should have captured error output');
    assert(capturedOutput.reason === 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT for missing --p1');
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// Test 26: CLI sim run validates missing --p2 argument
runTest('CLI sim run validates missing --p2 argument', async () => {
  const deck1Path = path.join(__dirname, 'fixtures', 'test-deck-1.json');

  let capturedOutput = null;
  let exitCode = null;

  // Mock process.exit to capture exit attempts
  const originalExit = process.exit;
  process.exit = (code) => { exitCode = code; };

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', '10', '--parallel', '1', '--p1', deck1Path],
      formatOutput: (data) => {
        if (!capturedOutput) {
          capturedOutput = data; // Capture first call (the error message)
        }
      }
    };

    await simCmd(argv);
    assert(exitCode === 1, 'Should call process.exit(1) for error');
    assert(capturedOutput !== null, 'Should have captured error output');
    assert(capturedOutput.reason === 'MISSING_ARGUMENT', 'Should return MISSING_ARGUMENT for missing --p2');
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// Test 27: CLI sim run validates file existence
runTest('CLI sim run validates deck file existence', async () => {
  let capturedOutput = null;
  let exitCode = null;

  // Mock process.exit to capture exit attempts
  const originalExit = process.exit;
  process.exit = (code) => { exitCode = code; };

  try {
    const argv = {
      json: true,
      help: false,
      positionalArgs: ['run', '--games', '10', '--parallel', '1', '--p1', 'nonexistent.json', '--p2', 'nonexistent2.json'],
      formatOutput: (data) => {
        if (!capturedOutput) {
          capturedOutput = data; // Capture first call (the error message)
        }
      }
    };

    await simCmd(argv);
    assert(exitCode === 1, 'Should call process.exit(1) for error');
    assert(capturedOutput !== null, 'Should have captured error output');
    assert(capturedOutput.reason === 'FILE_NOT_FOUND', 'Should return FILE_NOT_FOUND for missing deck file');
  } finally {
    // Restore original process.exit
    process.exit = originalExit;
  }
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

(async () => {
  await Promise.all(testPromises);

  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
})();
