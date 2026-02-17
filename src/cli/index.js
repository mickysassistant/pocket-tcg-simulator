#!/usr/bin/env node
/**
 * Pocket TCG Simulator CLI (tcgp)
 * 
 * Command-line interface for managing Pokemon TCG Pocket battles
 */

const versionCmd = require('./commands/version');
const helpCmd = require('./commands/help');
const configCmd = require('./commands/config');
const sessionCmd = require('./commands/session');
const actionCmd = require('./commands/action');
const snapshotCmd = require('./commands/snapshot');
const replayCmd = require('./commands/replay');
const deckCmd = require('./commands/deck');
const rulesCmd = require('./commands/rules');
const simCmd = require('./commands/sim');

/**
 * Parse CLI arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} { command, options, args }
 */
function parseArgs(args) {
  const result = {
    command: null,
    options: {},
    positionalArgs: []
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long option
      const optName = arg.slice(2);
      if (optName === 'json') {
        result.options.json = true;
      } else if (optName === 'help' || optName === 'h') {
        result.options.help = true;
      } else {
        // Pass through unrecognized -- flags as positional args
        // (for subcommand-specific options like --p1, --p2, --seed)
        result.positionalArgs.push(arg);
      }
      i++;
    } else if (arg.startsWith('-')) {
      // Short option
      const optName = arg.slice(1);
      if (optName === 'h') {
        result.options.help = true;
      }
      i++;
    } else if (!result.command) {
      // First positional arg is the command
      result.command = arg;
      i++;
    } else {
      // Additional positional args
      result.positionalArgs.push(arg);
      i++;
    }
  }

  return result;
}

/**
 * Format output as JSON or plain text
 * @param {Object} data - Data to output
 * @param {boolean} json - Output as JSON
 */
function formatOutput(data, json = false) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (data.message) {
    console.log(data.message);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Show error message
 * @param {string} error - Error message
 * @param {string} reason - Error reason code
 * @param {boolean} json - Output as JSON
 */
function showError(error, reason, json = false) {
  const errorData = { error, reason };
  formatOutput(errorData, json);
  process.exit(1);
}

/**
 * Show general help
 */
function showHelp() {
  console.log(`
Pocket TCG Simulator CLI (tcgp) v${require('../../package.json').version}

USAGE:
  tcgp <command> [options]

COMMANDS:
  version, v        Show version information
  help [command]    Show help information for a command
  config            Manage configuration
  session           Manage game sessions
  action            Manage and perform game actions
  snapshot          Manage game state snapshots
  replay            Export and run replays for regression testing
  deck              Validate and analyze decks
  rules             Check game rules and action validity
  sim               Run batch simulations for balance analysis

OPTIONS:
  --json            Output in JSON format
  -h, --help        Show help information

EXAMPLES:
  tcgp version
  tcgp --json version
  tcgp help config
  tcgp config --help
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Handle --help flag
  if (args.options.help && !args.command) {
    showHelp();
    process.exit(0);
  }

  // Handle missing command - show JSON error
  if (!args.command) {
    showError('You need at least one command', 'MISSING_COMMAND', args.options.json);
  }

  // Execute command
  try {
    const argv = {
      json: args.options.json || false,
      help: args.options.help || false,
      positionalArgs: args.positionalArgs,
      formatOutput: (data) => formatOutput(data, argv.json)
    };

    switch (args.command) {
      case 'version':
      case 'v':
        if (argv.help) {
          console.log(`
USAGE: tcgp version

Show version information for the tcgp CLI.

OPTIONS:
  --json    Output in JSON format
  -h, --help Show this help

EXAMPLES:
  tcgp version
  tcgp --json version
`);
        } else {
          await versionCmd(argv);
        }
        break;

      case 'help':
        if (argv.help) {
          console.log(`
USAGE: tcgp help [command]

Show help information for a command.

ARGUMENTS:
  command   Command to show help for (optional)

OPTIONS:
  --json    Output in JSON format
  -h, --help Show this help

EXAMPLES:
  tcgp help
  tcgp help config
  tcgp --json help
`);
        } else {
          await helpCmd(argv);
        }
        break;

      case 'config':
        await configCmd(argv);
        break;

      case 'session':
        await sessionCmd(argv);
        break;

      case 'action':
        await actionCmd(argv);
        break;

      case 'snapshot':
        await snapshotCmd(argv);
        break;

      case 'replay':
        await replayCmd(argv);
        break;

      case 'deck':
        await deckCmd(argv);
        break;

      case 'rules':
        await rulesCmd(argv);
        break;

      case 'sim':
        await simCmd(argv);
        break;

      default:
        showError(`Unknown command: ${args.command}`, 'UNKNOWN_COMMAND', argv.json);
    }

    process.exit(0);
  } catch (error) {
    showError(error.message, 'UNKNOWN_ERROR', args.options.json);
  }
}

// Export for testing
module.exports = { main, formatOutput, parseArgs };

// Run if called directly
if (require.main === module || process.argv[1].endsWith('bin/tcgp')) {
  main().catch((error) => {
    console.log(JSON.stringify({
      error: error.message,
      reason: 'FATAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, null, 2));
    process.exit(1);
  });
}
