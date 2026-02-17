/**
 * CLI Command: rules
 *
 * Check game rules and action validity in game context.
 *
 * Subcommands:
 * - check-action              Check if an action is valid in game state context
 */

const sessions = require('../services/sessions');
const rules = require('../services/rules');

/**
 * Execute rules command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for rules command
  if (argv.help) {
    console.log(`
USAGE: tcgp rules <subcommand> [options]

Check game rules and action validity in game context.

SUBCOMMANDS:
  check-action                Check if an action is valid in the context of a session's game state

OPTIONS:
  --json                       Output in JSON format
  -h, --help                   Show this help

ARGUMENTS:
  session                      Session name or ID to check rules against
  actionId                     Action identifier (e.g., draw, attach_energy, evolve)
  payload                      Action payload (JSON object)

EXAMPLES:
  tcgp rules check-action my-session draw '{"playerId":"player1","count":2}'
  tcgp rules check-action my-session attach_energy '{"playerId":"player1","targetPokemonId":"p1"}'
  tcgp --json rules check-action my-session evolve '{"playerId":"player1","pokemonId":"p1","evolutionCard":{"id":"e1","name":"Venusaur","stage":"stage2","hp":160}}'

  # Check why action is invalid
  tcgp rules check-action my-session draw '{"playerId":"player1","count":15}'
  # Output: Not valid because deck doesn't have enough cards or hand limit would be exceeded

See README.md for full action contracts and game rules.
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp rules <check-action> [options]',
      subcommands: ['check-action']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'check-action': {
        const sessionIdentifier = argv.positionalArgs[1];
        const actionId = argv.positionalArgs[2];
        const payloadStr = argv.positionalArgs[3];

        // Debug: log arguments
        if (process.env.DEBUG_RULES) {
          console.error('DEBUG: sessionIdentifier =', sessionIdentifier);
          console.error('DEBUG: actionId =', actionId);
          console.error('DEBUG: payloadStr =', payloadStr);
          console.error('DEBUG: positionalArgs =', argv.positionalArgs);
        }

        // Validate arguments
        if (!sessionIdentifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp rules check-action <session> <actionId> [payload]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!actionId) {
          const errorData = {
            error: 'Missing action ID',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp rules check-action <session> <actionId> [payload]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Get session (try by ID first, then by name)
        let session;
        try {
          session = sessions.get(sessionIdentifier);
        } catch (error) {
          if (process.env.DEBUG_RULES) {
            console.error('DEBUG: sessions.get() error:', error.message);
          }
          throw error;
        }

        if (process.env.DEBUG_RULES) {
          console.error('DEBUG: session after get():', session ? session.id : 'null');
        }

        if (!session) {
          try {
            session = sessions.getByName(sessionIdentifier);
          } catch (error) {
            if (process.env.DEBUG_RULES) {
              console.error('DEBUG: sessions.getByName() error:', error.message);
            }
            throw error;
          }
        }

        if (process.env.DEBUG_RULES) {
          console.error('DEBUG: session after getByName():', session ? session.id : 'null');
        }

        if (!session) {
          const errorData = {
            error: `Session not found: ${sessionIdentifier}`,
            reason: 'SESSION_NOT_FOUND',
            message: 'Use "tcgp session list" to see available sessions'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Get latest state for the session
        const stateRepository = require('../services/state');
        const latestState = await stateRepository.getLatest(session.id);

        if (!latestState) {
          const errorData = {
            error: `Session ${session.name} has no saved state`,
            reason: 'NO_STATE_FOUND',
            message: 'Session must have at least one saved state to check rules'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Parse game state
        const gameState = latestState.stateData;

        // Parse payload if provided, otherwise use empty object
        let payload = {};
        if (payloadStr) {
          try {
            payload = JSON.parse(payloadStr);
          } catch (error) {
            const errorData = {
              error: 'Invalid JSON payload',
              reason: 'INVALID_JSON',
              message: `Failed to parse payload: ${error.message}`
            };
            argv.formatOutput(errorData);
            process.exit(1);
          }
        }

        // Check action rules
        const checkResult = rules.checkAction(gameState, actionId, payload);

        const result = {
          sessionId: session.id,
          sessionName: session.name,
          actionId,
          valid: checkResult.valid,
          reason: checkResult.reason || null,
          message: checkResult.message || null
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Session: ${session.name} (${session.id})`);
          console.log(`Action: ${actionId}`);
          console.log(`Valid: ${result.valid ? 'Yes' : 'No'}`);

          if (result.reason) {
            console.log(`Reason: ${result.reason}`);
          }

          if (result.message) {
            console.log(`Message: ${result.message}`);
          }

          if (result.valid) {
            console.log('\nAction is valid according to game rules!');
          }
        }

        // Exit with error code if check failed
        if (!result.valid) {
          process.exit(1);
        }
        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: 'Valid subcommands are: check-action',
          validSubcommands: ['check-action']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'RULES_ERROR',
      message: 'Failed to process rules command'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
