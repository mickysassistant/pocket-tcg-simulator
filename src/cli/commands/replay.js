/**
 * CLI Command: replay
 *
 * Manage replay exports and execution.
 *
 * Subcommands:
 * - export <session> [output-file]     Export session events to a replay file
 * - run <replay-file> [--compare <expected-state-file>]  Run a replay and optionally compare with expected state
 */

const replay = require('../services/replay');
const fs = require('fs');

/**
 * Parse --compare flag from positional args
 * @param {string[]} args - Positional args
 * @returns {Object} { sessionOrFile, outputFile, compareFile }
 */
function parseReplayArgs(args) {
  const result = {
    sessionOrFile: null,
    outputFile: null,
    compareFile: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--compare' && args[i + 1]) {
      result.compareFile = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      result.outputFile = args[++i];
    } else if (!arg.startsWith('--')) {
      // Positional arguments: first is session/file, second (if not a flag) is output file
      if (!result.sessionOrFile) {
        result.sessionOrFile = arg;
      } else if (!result.outputFile) {
        result.outputFile = arg;
      }
    }
  }

  return result;
}

/**
 * Execute replay command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for replay command
  if (argv.help) {
    console.log(`
USAGE: tcgp replay <subcommand> [options]

Manage replay exports and execution for regression testing.

SUBCOMMANDS:
  export <session> [output-file]           Export session events to a replay file
  run <replay-file> [--compare <file>]    Run a replay and optionally compare with expected state

OPTIONS:
  --json           Output in JSON format
  -h, --help       Show this help

ARGUMENTS:
  session          Session name or ID (for export)
  output-file      Path to write replay file (optional, defaults to <session-name>.replay.json)
  replay-file      Path to replay file to execute (for run)
  --compare <file> Path to expected state file for comparison (for run)

EXAMPLES:
  tcgp replay export my-battle
  tcgp replay export my-battle my-replay.json
  tcgp replay run my-battle.replay.json
  tcgp replay run my-battle.replay.json --compare expected-state.json
  tcgp --json replay run my-battle.replay.json

REPLAY FILE FORMAT:
  {
    "version": "1.0",
    "exportedAt": "2026-02-17T18:00:00.000Z",
    "session": {
      "id": "...",
      "name": "my-battle",
      "player1Deck": "deck1",
      "player2Deck": "deck2",
      "metadata": { "seed": "12345", "coinQueue": [true, false] }
    },
    "events": [
      {
        "id": 1,
        "type": "action",
        "data": { "action": "draw", "payload": {...} },
        "turnNumber": 1,
        "createdAt": ...
      }
    ],
    "finalState": { ... }
  }
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp replay <export|run> [options]',
      subcommands: ['export', 'run']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'export': {
        const args = parseReplayArgs(argv.positionalArgs.slice(1));
        const sessionId = args.sessionOrFile;
        const outputFile = args.outputFile;

        if (!sessionId) {
          const errorData = {
            error: 'Missing session',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp replay export <session> [output-file]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Export session
        const result = replay.exportSession(sessionId, outputFile);

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          if (result.success) {
            const data = result.data;
            console.log(`Replay exported successfully`);
            console.log(`Session: ${data.sessionName} (${data.sessionId})`);
            console.log(`Output file: ${data.outputFile}`);
            console.log(`Events: ${data.eventCount}`);
            if (data.finalTurn !== null) {
              console.log(`Final turn: ${data.finalTurn}`);
            }
          } else {
            console.log(`Export failed`);
            console.log(`Reason: ${result.error.reason}`);
            console.log(`Message: ${result.error.message}`);
          }
        }

        // Exit with error code if failed
        if (!result.success) {
          process.exit(1);
        }
        break;
      }

      case 'run': {
        const args = parseReplayArgs(argv.positionalArgs.slice(1));
        const replayFile = args.sessionOrFile;
        const compareFile = args.compareFile;

        if (!replayFile) {
          const errorData = {
            error: 'Missing replay file',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp replay run <replay-file> [--compare <expected-state-file>]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Run replay
        const result = replay.runReplay(replayFile, compareFile);

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          if (result.success) {
            const data = result.data;
            console.log(`Replay executed successfully`);
            console.log(`Replay file: ${data.replayFile}`);
            console.log(`Session: ${data.sessionName}`);
            console.log(`Events executed: ${data.eventsExecuted}`);
            console.log(`Errors: ${data.errors.length}`);

            if (data.finalState) {
              console.log(`\nFinal State:`);
              console.log(`  Turn: ${data.finalState.turnNumber}`);
              console.log(`  Phase: ${data.finalState.phase}`);
              console.log(`  Current Player: ${data.finalState.currentPlayer}`);
              console.log(`  Player 1 Hand: ${data.finalState.players.player1.hand.length} cards`);
              console.log(`  Player 1 Deck: ${data.finalState.players.player1.deck.length} cards`);
              console.log(`  Player 2 Hand: ${data.finalState.players.player2.hand.length} cards`);
              console.log(`  Player 2 Deck: ${data.finalState.players.player2.deck.length} cards`);
            }

            if (data.comparison) {
              console.log(`\nComparison:`);
              if (data.comparison.match) {
                console.log(`  ✓ States match`);
              } else {
                console.log(`  ✗ States do not match`);
                console.log(`  Mismatches: ${data.comparison.mismatches.length}`);
                for (const mismatch of data.comparison.mismatches) {
                  console.log(`    - ${mismatch.field}: expected ${mismatch.expected}, got ${mismatch.actual}`);
                }
              }
            }
          } else {
            console.log(`Replay execution failed`);
            console.log(`Reason: ${result.error.reason}`);
            console.log(`Message: ${result.error.message}`);
          }
        }

        // Exit with error code if failed
        if (!result.success) {
          process.exit(1);
        }
        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: 'Valid subcommands are: export, run',
          validSubcommands: ['export', 'run']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: 'REPLAY_ERROR',
      message: 'Failed to process replay command'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
