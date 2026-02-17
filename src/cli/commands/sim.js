/**
 * CLI Command: sim
 *
 * Run batch simulations for balance analysis.
 *
 * Subcommands:
 * - run --games N --parallel M --p1 <deck> --p2 <deck>  Run batch simulation
 */

const simulation = require('../services/simulation');
const { getDeckStats } = require('../services/deck');
const fs = require('fs');

/**
 * Parse --games, --parallel, --p1, --p2 flags from positional args
 * @param {string[]} args - Positional args
 * @returns {Object} { games, parallel, p1, p2 }
 */
function parseSimArgs(args) {
  const result = {
    games: 100,
    parallel: 1,
    p1: null,
    p2: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--games' && args[i + 1]) {
      result.games = parseInt(args[++i], 10);
    } else if (arg === '--parallel' && args[i + 1]) {
      result.parallel = parseInt(args[++i], 10);
    } else if (arg === '--p1' && args[i + 1]) {
      result.p1 = args[++i];
    } else if (arg === '--p2' && args[i + 1]) {
      result.p2 = args[++i];
    }
  }

  return result;
}

/**
 * Execute sim command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for sim command
  if (argv.help) {
    console.log(`
USAGE: tcgp sim <subcommand> [options]

Run batch simulations for balance analysis.

SUBCOMMANDS:
  run --games N --parallel M --p1 <deck> --p2 <deck>  Run batch simulation

OPTIONS:
  --json           Output in JSON format
  -h, --help       Show this help

ARGUMENTS:
  games            Number of games to simulate (default: 100)
  parallel         Number of parallel simulations (default: 1)
  deck             Deck file path (JSON format)

EXAMPLES:
  tcgp sim run --games 1000 --parallel 4 --p1 deck1.json --p2 deck2.json
  tcgp sim run --games 100 --p1 deck1.json --p2 deck2.json
  tcgp --json sim run --games 50 --p1 deck1.json --p2 deck2.json
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp sim <run> [options]',
      subcommands: ['run']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'run': {
        const { games, parallel, p1, p2 } = parseSimArgs(argv.positionalArgs.slice(1));

        // Validate games argument
        if (isNaN(games) || games < 1) {
          const errorData = {
            error: 'Invalid --games value',
            reason: 'INVALID_ARGUMENT',
            message: '--games must be a positive integer'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Validate parallel argument
        if (isNaN(parallel) || parallel < 1) {
          const errorData = {
            error: 'Invalid --parallel value',
            reason: 'INVALID_ARGUMENT',
            message: '--parallel must be a positive integer'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Validate p1 argument
        if (!p1) {
          const errorData = {
            error: 'Missing --p1 argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp sim run --games N --parallel M --p1 <deck> --p2 <deck>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Validate p2 argument
        if (!p2) {
          const errorData = {
            error: 'Missing --p2 argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp sim run --games N --parallel M --p1 <deck> --p2 <deck>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Check if deck files exist
        if (!fs.existsSync(p1)) {
          const errorData = {
            error: 'Player 1 deck file not found',
            reason: 'FILE_NOT_FOUND',
            message: `Deck file not found: ${p1}`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!fs.existsSync(p2)) {
          const errorData = {
            error: 'Player 2 deck file not found',
            reason: 'FILE_NOT_FOUND',
            message: `Deck file not found: ${p2}`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Load decks
        let player1Deck, player2Deck;
        try {
          player1Deck = JSON.parse(fs.readFileSync(p1, 'utf8'));
        } catch (error) {
          const errorData = {
            error: 'Failed to load player 1 deck',
            reason: 'FILE_READ_ERROR',
            message: error.message
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        try {
          player2Deck = JSON.parse(fs.readFileSync(p2, 'utf8'));
        } catch (error) {
          const errorData = {
            error: 'Failed to load player 2 deck',
            reason: 'FILE_READ_ERROR',
            message: error.message
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Validate decks
        if (!Array.isArray(player1Deck) || player1Deck.length === 0) {
          const errorData = {
            error: 'Invalid player 1 deck',
            reason: 'INVALID_DECK',
            message: 'Player 1 deck must be a non-empty array'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!Array.isArray(player2Deck) || player2Deck.length === 0) {
          const errorData = {
            error: 'Invalid player 2 deck',
            reason: 'INVALID_DECK',
            message: 'Player 2 deck must be a non-empty array'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Show simulation start message if not JSON mode
        if (!argv.json) {
          console.log(`Running ${games} simulations (${parallel} parallel)...`);
          console.log(`Player 1: ${p1}`);
          console.log(`Player 2: ${p2}`);
          console.log('');
        }

        // Run batch simulation with progress callback
        const results = await simulation.runBatchSimulation(
          player1Deck,
          player2Deck,
          games,
          parallel,
          (gameNum, totalGames, result) => {
            // Show progress every 10% or for the last game
            if (gameNum % Math.max(1, Math.floor(totalGames / 10)) === 0 || gameNum === totalGames) {
              if (!argv.json) {
                const progress = ((gameNum / totalGames) * 100).toFixed(0);
                console.log(`Progress: ${progress}% (${gameNum}/${totalGames})`);
              }
            }
          }
        );

        // Format results
        const formatted = simulation.formatSimulationResults(results, argv.json);

        // Output results
        if (argv.json) {
          argv.formatOutput(formatted);
        } else {
          console.log('');
          console.log('Simulation Results:');
          console.log('===================');
          console.log(`Total Games: ${formatted.summary.totalGames}`);
          console.log(`Player 1 Wins: ${formatted.summary.player1Wins} (${formatted.summary.player1WinRate}%)`);
          console.log(`Player 2 Wins: ${formatted.summary.player2Wins} (${formatted.summary.player2WinRate}%)`);
          console.log(`Draws: ${formatted.summary.draws} (${formatted.summary.drawRate}%)`);
          console.log(`Average Turns: ${formatted.summary.averageTurns}`);
          console.log(`First-Player Advantage: ${formatted.summary.firstPlayerAdvantage > 0 ? '+' : ''}${formatted.summary.firstPlayerAdvantage}%`);
          console.log('');
          console.log('Interpretation:');
          console.log(`  - Positive first-player advantage means Player 1 (going first) has an edge`);
          console.log(`  - Negative means Player 2 has an edge`);
          console.log(`  - Near 0% indicates balanced decks`);
        }

        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: 'Valid subcommands are: run',
          validSubcommands: ['run']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'SIMULATION_ERROR',
      message: 'Failed to run simulation'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
