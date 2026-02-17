/**
 * CLI Command: action
 *
 * Manage and perform game actions.
 *
 * Subcommands:
 * - list                       List all available actions
 * - validate <actionId>        Validate an action payload
 * - <actionId>                 Execute an action (future feature)
 */

const actions = require('../services/actions');

/**
 * Execute action command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for action command
  if (argv.help) {
    console.log(`
USAGE: tcgp action <subcommand> [options]

Manage and perform game actions.

SUBCOMMANDS:
  list                         List all available actions
  validate <actionId>          Validate an action payload against its schema
  <actionId>                   Execute an action (not yet implemented)

OPTIONS:
  --json                       Output in JSON format
  -h, --help                   Show this help

ARGUMENTS:
  actionId                     Action identifier (e.g., draw, attach_energy, evolve)
  payload                      Action payload (for validate command)

EXAMPLES:
  tcgp action list
  tcgp --json action list

  tcgp action validate draw
  tcgp action validate draw '{"playerId":"player1","count":2}'
  tcgp --json action validate evolve '{"playerId":"player1","pokemonId":"p1","evolutionCard":{"id":"e1","name":"Venusaur","stage":"stage2","hp":160}}'

See README.md for full action contracts and schemas.
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp action <list|validate|actionId> [options]',
      subcommands: ['list', 'validate']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'list': {
        const actionList = actions.listActions();

        const result = {
          actions: actionList,
          count: actionList.length
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          if (actionList.length === 0) {
            console.log('No actions available');
          } else {
            console.log(`Available Actions (${actionList.length}):\n`);
            for (const action of actionList) {
              console.log(`  ${action.id}`);
              console.log(`    Name: ${action.name}`);
              console.log(`    Description: ${action.description}`);
              console.log(`    Requires Session: ${action.sessionRequired}`);
              console.log('');
            }
          }
        }
        break;
      }

      case 'validate': {
        const actionId = argv.positionalArgs[1];
        const payloadStr = argv.positionalArgs[2];

        if (!actionId) {
          const errorData = {
            error: 'Missing action ID',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp action validate <actionId> [payload]'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Get action definition
        const action = actions.getAction(actionId);
        if (!action) {
          const errorData = {
            actionId,
            valid: false,
            error: `Unknown action: ${actionId}`,
            reason: 'UNKNOWN_ACTION',
            errors: [`Unknown action: ${actionId}`],
            message: 'Use "tcgp action list" to see available actions',
            validActions: Object.keys(actions.getAllActions())
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // If no payload provided, just show action info
        if (!payloadStr) {
          const result = {
            actionId,
            actionName: action.name,
            description: action.description,
            sessionRequired: action.sessionRequired,
            schema: action.schema
          };

          if (argv.json) {
            argv.formatOutput(result);
          } else {
            console.log(`Action: ${action.name} (${actionId})`);
            console.log(`Description: ${action.description}`);
            console.log(`Requires Session: ${action.sessionRequired}`);
            console.log(`\nSchema:`);
            console.log(`  Required fields: ${action.schema.required.join(', ')}`);
            console.log(`  Properties:`);
            for (const [propName, propSchema] of Object.entries(action.schema.properties)) {
              console.log(`    ${propName}:`);
              console.log(`      Type: ${propSchema.type}`);
              if (propSchema.enum) {
                console.log(`      Allowed values: ${propSchema.enum.join(', ')}`);
              }
              if (propSchema.minimum !== undefined) {
                console.log(`      Minimum: ${propSchema.minimum}`);
              }
              if (propSchema.maximum !== undefined) {
                console.log(`      Maximum: ${propSchema.maximum}`);
              }
            }
          }
          break;
        }

        // Parse payload if provided
        let payload;
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

        // Validate payload
        const validationResult = actions.validatePayload(actionId, payload);

        const result = {
          actionId,
          actionName: action.name,
          valid: validationResult.valid,
          reason: validationResult.reason || null,
          errors: validationResult.errors || null
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Action: ${action.name} (${actionId})`);
          console.log(`Valid: ${result.valid ? 'Yes' : 'No'}`);
          if (result.reason) {
            console.log(`Reason: ${result.reason}`);
          }
          if (result.errors && result.errors.length > 0) {
            console.log('\nErrors:');
            for (const error of result.errors) {
              console.log(`  - ${error}`);
            }
          }
          if (result.valid) {
            console.log('\nPayload is valid!');
          }
        }

        // Exit with error code if validation failed
        if (!result.valid) {
          process.exit(1);
        }
        break;
      }

      default: {
        // Check if it's a valid action ID (for future execution)
        const action = actions.getAction(subcommand);
        if (action) {
          const errorData = {
            error: 'Action execution not yet implemented',
            reason: 'NOT_IMPLEMENTED',
            message: `Action "${subcommand}" exists but execution is not yet implemented. See CLI roadmap for details.`,
            actionId: subcommand,
            actionName: action.name
          };
          argv.formatOutput(errorData);
          process.exit(1);
        } else {
          const errorData = {
            error: `Unknown subcommand: ${subcommand}`,
            reason: 'UNKNOWN_SUBCOMMAND',
            message: 'Valid subcommands are: list, validate, or a valid action ID',
            validSubcommands: ['list', 'validate']
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'ACTION_ERROR',
      message: 'Failed to process action command'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
