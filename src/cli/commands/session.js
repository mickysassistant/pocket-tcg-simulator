/**
 * CLI Command: session
 *
 * Manage game sessions.
 *
 * Subcommands:
 * - create <name> --p1 <deck> --p2 <deck> [--seed <seed>]  Create a new session
 * - list [--status <status>]                              List all sessions
 * - show <name|id>                                        Show session details
 * - close <name|id>                                       Close a session
 */

const sessions = require('../services/sessions');
const state = require('../services/state');
const events = require('../services/events');
const { createGame } = require('../../index');
const { randomUUID } = require('crypto');

/**
 * Parse --p1, --p2, --seed, --coin-queue flags from positional args
 * @param {string[]} args - Positional args
 * @returns {Object} { name, p1, p2, seed, coinQueue }
 */
function parseSessionArgs(args) {
  const result = {
    name: null,
    p1: null,
    p2: null,
    seed: null,
    coinQueue: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--p1' && args[i + 1]) {
      result.p1 = args[++i];
    } else if (arg === '--p2' && args[i + 1]) {
      result.p2 = args[++i];
    } else if (arg === '--seed' && args[i + 1]) {
      result.seed = args[++i];
    } else if (arg === '--coin-queue' && args[i + 1]) {
      // Parse coin queue as JSON array of booleans: [true, false, true, ...]
      try {
        result.coinQueue = JSON.parse(args[++i]);
      } catch (e) {
        result.coinQueue = null;
      }
    } else if (!arg.startsWith('--') && !result.name) {
      result.name = arg;
    }
  }

  return result;
}

/**
 * Execute session command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for session command
  if (argv.help) {
    console.log(`
USAGE: tcgp session <subcommand> [options]

Manage game sessions.

SUBCOMMANDS:
  create <name> --p1 <deck> --p2 <deck> [--seed <seed>] [--coin-queue <queue>]  Create a new session
  list [--status <status>]                                                    List all sessions
  show <name|id>                                                              Show session details
  close <name|id>                                                             Close a session

OPTIONS:
  --json           Output in JSON format
  -h, --help       Show this help

ARGUMENTS:
  name             Session name (for create)
  deck             Deck identifier (for create)
  seed             Random seed for determinism (optional, for create)
  coin-queue       JSON array of coin flip results (e.g., "[true,false,true]") for determinism (optional)
  status           Session status filter: active, completed (for list)
  name|id          Session name or ID (for show, close)

EXAMPLES:
  tcgp session create my-battle --p1 pikachu-deck --p2 bulbasaur-deck
  tcgp session create my-battle --p1 deck1 --p2 deck2 --seed 12345
  tcgp session create my-battle --p1 deck1 --p2 deck2 --seed 12345 --coin-queue "[true,false,true]"
  tcgp session list
  tcgp session list --status active
  tcgp session show my-battle
  tcgp session close my-battle
  tcgp --json session create my-battle --p1 deck1 --p2 deck2
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp session <create|list|show|close> [options]',
      subcommands: ['create', 'list', 'show', 'close']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'create': {
        const { name, p1, p2, seed, coinQueue } = parseSessionArgs(argv.positionalArgs.slice(1));

        if (!name) {
          const errorData = {
            error: 'Missing session name',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp session create <name> --p1 <deck> --p2 <deck> [--seed <seed>] [--coin-queue "[true,false,...]"]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!p1) {
          const errorData = {
            error: 'Missing --p1 argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp session create <name> --p1 <deck> --p2 <deck> [--seed <seed>] [--coin-queue "[true,false,...]"]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!p2) {
          const errorData = {
            error: 'Missing --p2 argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp session create <name> --p1 <deck> --p2 <deck> [--seed <seed>] [--coin-queue "[true,false,...]"]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Create session
        const sessionId = randomUUID();
        const metadata = {};
        if (seed) metadata.seed = seed;
        if (coinQueue) metadata.coinQueue = coinQueue;

        const sessionData = {
          id: sessionId,
          name,
          player1Deck: { id: p1 },
          player2Deck: { id: p2 },
          metadata
        };

        const session = sessions.create(sessionData);

        // Create initial game state with placeholder decks
        // (In future, actual deck content would be loaded here)
        const placeholderDeck = [];
        const game = createGame(placeholderDeck, placeholderDeck, 30, seed, coinQueue);

        // Save initial state
        const initialState = state.save({
          sessionId,
          turnNumber: 0,
          phase: game.gameState.phase,
          currentPlayer: game.gameState.currentPlayer,
          stateData: {
            players: game.gameState.players,
            currentPlayer: game.gameState.currentPlayer,
            turnNumber: game.gameState.turnNumber,
            phase: game.gameState.phase
          }
        });

        // Log session creation event
        events.log({
          sessionId,
          eventType: 'session_created',
          eventData: {
            name,
            p1,
            p2,
            seed,
            coinQueue
          }
        });

        const result = {
          id: session.id,
          name: session.name,
          status: session.status,
          player1Deck: p1,
          player2Deck: p2,
          seed: seed || null,
          coinQueue: coinQueue || null,
          createdAt: session.createdAt,
          initialState: {
            id: initialState.id,
            turnNumber: initialState.turnNumber,
            phase: initialState.phase,
            currentPlayer: initialState.currentPlayer
          },
          message: `Session "${name}" created successfully`
        };

        argv.formatOutput(result);
        break;
      }

      case 'list': {
        // Parse --status flag
        let statusFilter = null;
        for (let i = 1; i < argv.positionalArgs.length; i++) {
          if (argv.positionalArgs[i] === '--status' && argv.positionalArgs[i + 1]) {
            statusFilter = argv.positionalArgs[i + 1];
            break;
          }
        }

        // Validate status filter
        if (statusFilter && !['active', 'completed'].includes(statusFilter)) {
          const errorData = {
            error: 'Invalid status value',
            reason: 'INVALID_ARGUMENT',
            message: 'Status must be "active" or "completed"',
            validValues: ['active', 'completed']
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        const sessionList = sessions.list({ status: statusFilter });

        const result = {
          sessions: sessionList.map(s => ({
            id: s.id,
            name: s.name,
            status: s.status,
            player1Deck: s.player1Deck?.id || null,
            player2Deck: s.player2Deck?.id || null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            seed: s.metadata?.seed || null,
            coinQueue: s.metadata?.coinQueue || null
          })),
          count: sessionList.length
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          if (sessionList.length === 0) {
            console.log('No sessions found');
          } else {
            console.log(`Found ${sessionList.length} session(s):\n`);
            for (const s of sessionList) {
              console.log(`  ${s.name} (${s.id})`);
              console.log(`    Status: ${s.status}`);
              console.log(`    P1: ${s.player1Deck?.id || 'N/A'}`);
              console.log(`    P2: ${s.player2Deck?.id || 'N/A'}`);
              console.log(`    Created: ${new Date(s.createdAt).toISOString()}`);
              if (s.metadata?.seed) {
                console.log(`    Seed: ${s.metadata.seed}`);
              }
              if (s.metadata?.coinQueue) {
                console.log(`    Coin Queue: ${JSON.stringify(s.metadata.coinQueue)}`);
              }
              console.log('');
            }
          }
        }
        break;
      }

      case 'show': {
        const identifier = argv.positionalArgs[1];

        if (!identifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp session show <name|id>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Try to find session by ID first, then by name
        let session = sessions.get(identifier);
        if (!session) {
          session = sessions.getByName(identifier);
        }

        if (!session) {
          const errorData = {
            error: 'Session not found',
            reason: 'SESSION_NOT_FOUND',
            message: `No session found with name or ID "${identifier}"`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Get latest state
        const latestState = state.getLatest(session.id);

        const result = {
          id: session.id,
          name: session.name,
          status: session.status,
          player1Deck: session.player1Deck?.id || null,
          player2Deck: session.player2Deck?.id || null,
          seed: session.metadata?.seed || null,
          coinQueue: session.metadata?.coinQueue || null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          currentState: latestState ? {
            id: latestState.id,
            turnNumber: latestState.turnNumber,
            phase: latestState.phase,
            currentPlayer: latestState.currentPlayer,
            createdAt: latestState.createdAt
          } : null
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Session: ${session.name} (${session.id})`);
          console.log(`Status: ${session.status}`);
          console.log(`P1 Deck: ${session.player1Deck?.id || 'N/A'}`);
          console.log(`P2 Deck: ${session.player2Deck?.id || 'N/A'}`);
          if (session.metadata?.seed) {
            console.log(`Seed: ${session.metadata.seed}`);
          }
          if (session.metadata?.coinQueue) {
            console.log(`Coin Queue: ${JSON.stringify(session.metadata.coinQueue)}`);
          }
          console.log(`Created: ${new Date(session.createdAt).toISOString()}`);
          console.log(`Updated: ${new Date(session.updatedAt).toISOString()}`);

          if (latestState) {
            console.log(`\nCurrent State:`);
            console.log(`  Turn: ${latestState.turnNumber}`);
            console.log(`  Phase: ${latestState.phase}`);
            console.log(`  Current Player: ${latestState.currentPlayer}`);
            console.log(`  State ID: ${latestState.id}`);
          } else {
            console.log(`\nNo game state saved yet`);
          }
        }
        break;
      }

      case 'close': {
        const identifier = argv.positionalArgs[1];

        if (!identifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp session close <name|id>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Try to find session by ID first, then by name
        let session = sessions.get(identifier);
        if (!session) {
          session = sessions.getByName(identifier);
        }

        if (!session) {
          const errorData = {
            error: 'Session not found',
            reason: 'SESSION_NOT_FOUND',
            message: `No session found with name or ID "${identifier}"`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (session.status === 'completed') {
          const errorData = {
            error: 'Session already closed',
            reason: 'SESSION_ALREADY_CLOSED',
            message: `Session "${session.name}" is already closed`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Update session status to completed
        const updatedSession = sessions.update(session.id, { status: 'completed' });

        // Log session close event
        events.log({
          sessionId: session.id,
          eventType: 'session_closed',
          eventData: {
            name: session.name
          }
        });

        const result = {
          id: updatedSession.id,
          name: updatedSession.name,
          status: updatedSession.status,
          closedAt: updatedSession.updatedAt,
          message: `Session "${session.name}" closed successfully`
        };

        argv.formatOutput(result);
        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: 'Valid subcommands are: create, list, show, close',
          validSubcommands: ['create', 'list', 'show', 'close']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'SESSION_ERROR',
      message: 'Failed to manage session'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
