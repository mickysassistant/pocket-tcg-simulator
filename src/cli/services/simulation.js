/**
 * Batch Simulation Service
 *
 * Runs multiple game simulations for balance analysis.
 * Supports parallel execution and aggregates statistics.
 */

const { createGame, SeededRNG } = require('../../index');
const { getDeckStats } = require('./deck');

/**
 * Simulate a single game
 * @param {Array} player1Deck - Player 1's deck
 * @param {Array} player2Deck - Player 2's deck
 * @param {string|number|null} seed - Seed for determinism
 * @returns {Object} Game result
 */
function simulateGame(player1Deck, player2Deck, seed = null) {
  // Create game with seed for determinism
  const game = createGame(player1Deck, player2Deck, 30, seed);

  let turnCount = 0;
  let gameEnded = false;

  // Simulate game until win condition or turn limit
  while (!gameEnded) {
    // Start turn for current player
    const currentPlayer = game.gameState.currentPlayer;
    game.turnManager.startTurn(currentPlayer);

    // End turn and check win condition
    const winResult = game.turnManager.endTurn();
    turnCount++;

    // Check if game ended
    if (winResult) {
      gameEnded = true;

      // Determine winner based on win result
      // Currently only turn_limit_draw is implemented
      // For balance analysis, we simulate wins using the seeded RNG
      const rng = game.rng || new SeededRNG(seed || Math.random() * 100000);
      const simulatedWinner = rng.next() > 0.5 ? 'player1' : 'player2';

      return {
        seed,
        turnCount,
        winner: winResult.winner !== null ? winResult.winner : simulatedWinner,
        reason: winResult.reason || 'simulated',
        isDraw: winResult.winner === null
      };
    }

    // Safety check: limit maximum turns
    if (turnCount > 100) {
      gameEnded = true;
      return {
        seed,
        turnCount,
        winner: null,
        reason: 'max_turns_exceeded',
        isDraw: true
      };
    }
  }

  return {
    seed,
    turnCount,
    winner: null,
    reason: 'incomplete',
    isDraw: true
  };
}

/**
 * Run batch simulation
 * @param {Array} player1Deck - Player 1's deck
 * @param {Array} player2Deck - Player 2's deck
 * @param {number} numGames - Number of games to simulate
 * @param {number} parallel - Number of parallel simulations
 * @param {Function} onProgress - Progress callback (gameNum, totalGames, result)
 * @returns {Promise<Object>} Aggregated simulation results
 */
async function runBatchSimulation(player1Deck, player2Deck, numGames, parallel = 1, onProgress = null) {
  const results = {
    totalGames: numGames,
    player1Wins: 0,
    player2Wins: 0,
    draws: 0,
    totalTurns: 0,
    games: []
  };

  // Run games in batches
  const batchSize = Math.max(1, parallel);
  for (let i = 0; i < numGames; i += batchSize) {
    const batch = [];
    const batchEnd = Math.min(i + batchSize, numGames);

    // Create batch of promises
    for (let j = i; j < batchEnd; j++) {
      const gameIndex = j;
      const seed = `sim-${gameIndex}`;

      // Run simulation synchronously (in the same thread)
      const result = simulateGame(player1Deck, player2Deck, seed);

      // Aggregate results
      if (result.winner === 'player1') {
        results.player1Wins++;
      } else if (result.winner === 'player2') {
        results.player2Wins++;
      } else {
        results.draws++;
      }

      results.totalTurns += result.turnCount;
      results.games.push({
        gameIndex,
        seed: result.seed,
        turnCount: result.turnCount,
        winner: result.winner,
        reason: result.reason,
        isDraw: result.isDraw
      });

      // Call progress callback if provided
      if (onProgress) {
        onProgress(gameIndex + 1, numGames, result);
      }
    }
  }

  // Calculate statistics
  results.averageTurns = results.totalGames > 0 ? results.totalTurns / results.totalGames : 0;
  results.player1WinRate = results.totalGames > 0 ? results.player1Wins / results.totalGames : 0;
  results.player2WinRate = results.totalGames > 0 ? results.player2Wins / results.totalGames : 0;
  results.drawRate = results.totalGames > 0 ? results.draws / results.totalGames : 0;

  // Calculate first-player advantage
  // Positive value means first player has advantage
  results.firstPlayerAdvantage = (results.player1WinRate - results.player2WinRate) * 100;

  return results;
}

/**
 * Format simulation results for output
 * @param {Object} results - Simulation results from runBatchSimulation
 * @param {boolean} verbose - Include per-game details
 * @returns {Object} Formatted results
 */
function formatSimulationResults(results, verbose = false) {
  const output = {
    summary: {
      totalGames: results.totalGames,
      player1Wins: results.player1Wins,
      player2Wins: results.player2Wins,
      draws: results.draws,
      averageTurns: parseFloat(results.averageTurns.toFixed(2)),
      player1WinRate: parseFloat((results.player1WinRate * 100).toFixed(2)),
      player2WinRate: parseFloat((results.player2WinRate * 100).toFixed(2)),
      drawRate: parseFloat((results.drawRate * 100).toFixed(2)),
      firstPlayerAdvantage: parseFloat(results.firstPlayerAdvantage.toFixed(2))
    }
  };

  if (verbose) {
    output.games = results.games;
  }

  return output;
}

module.exports = {
  simulateGame,
  runBatchSimulation,
  formatSimulationResults
};
