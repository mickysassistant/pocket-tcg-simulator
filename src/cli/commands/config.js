/**
 * CLI Command: config
 * 
 * Manage configuration for the tcgp CLI.
 * 
 * Subcommands:
 * - get <key>        Get a config value
 * - set <key> <value> Set a config value
 * - list             List all config values
 * - reset            Reset config to defaults
 */

const configService = require('../services/config');

/**
 * Execute config command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for config command
  if (argv.help) {
    console.log(`
USAGE: tcgp config <subcommand> [options]

Manage configuration for the tcgp CLI.

SUBCOMMANDS:
  get <key>        Get a config value
  set <key> <value> Set a config value
  list             List all config values
  reset            Reset config to defaults

OPTIONS:
  --json           Output in JSON format
  -h, --help       Show this help

EXAMPLES:
  tcgp config get editor
  tcgp config set editor nano
  tcgp config list
  tcgp config reset
  tcgp config --json get editor
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp config <get|set|list|reset> [options]',
      subcommands: ['get', 'set', 'list', 'reset']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'get': {
        const key = argv.positionalArgs[1];
        if (!key) {
          const errorData = {
            error: 'Missing key argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp config get <key>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        const value = configService.get(key);
        const result = {
          key,
          value,
          found: value !== undefined
        };

        if (argv.json) {
          argv.formatOutput(result);
          // Exit with error code if not found
          if (value === undefined) {
            process.exit(1);
          }
        } else {
          if (value === undefined) {
            console.log(`Config key "${key}" not found`);
            process.exit(1);
          } else {
            console.log(`${key} = ${JSON.stringify(value)}`);
          }
        }
        break;
      }

      case 'set': {
        const key = argv.positionalArgs[1];
        const rawValue = argv.positionalArgs.slice(2).join(' '); // Join remaining args for values with spaces

        if (!key) {
          const errorData = {
            error: 'Missing key argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp config set <key> <value>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (rawValue === undefined || rawValue === '') {
          const errorData = {
            error: 'Missing value argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp config set <key> <value>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Try to parse as JSON first, otherwise treat as string
        let value;
        try {
          value = JSON.parse(rawValue);
        } catch {
          value = rawValue;
        }

        configService.set(key, value);
        const result = {
          key,
          value,
          message: `Config key "${key}" set successfully`
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Config key "${key}" set to ${JSON.stringify(value)}`);
        }
        break;
      }

      case 'list': {
        const config = configService.getAll();
        const result = {
          config,
          configPath: configService.getConfigPath()
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Config file: ${configService.getConfigPath()}\n`);
          for (const [key, value] of Object.entries(config)) {
            console.log(`${key} = ${JSON.stringify(value)}`);
          }
        }
        break;
      }

      case 'reset': {
        configService.reset();
        const result = {
          message: 'Configuration reset to defaults',
          defaults: configService.getDefaults()
        };

        argv.formatOutput(result);
        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: `Valid subcommands are: get, set, list, reset`,
          validSubcommands: ['get', 'set', 'list', 'reset']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'CONFIG_ERROR',
      message: 'Failed to manage configuration'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
