/**
 * CLI Command: help
 * 
 * Display help information for tcgp CLI commands
 */

/**
 * Execute help command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const helpData = {
    name: 'tcgp',
    description: 'Pokemon TCG Pocket Battle Simulator CLI',
    version: require('../../../package.json').version,
    usage: 'tcgp <command> [options]',
    commands: [
      {
        name: 'version, v',
        description: 'Show version information'
      },
      {
        name: 'help [command]',
        description: 'Show help information for a command'
      },
      {
        name: 'config',
        description: 'Manage configuration'
      },
      {
        name: 'session',
        description: 'Manage game sessions'
      },
      {
        name: 'action',
        description: 'Manage and perform game actions'
      },
      {
        name: 'snapshot',
        description: 'Manage game state snapshots'
      },
      {
        name: 'replay',
        description: 'Export and run replays for regression testing'
      },
      {
        name: 'deck',
        description: 'Validate and analyze decks'
      },
      {
        name: 'rules',
        description: 'Check game rules and action validity'
      },
      {
        name: 'sim',
        description: 'Run batch simulations for balance analysis'
      }
    ],
    options: [
      {
        name: '--json',
        description: 'Output in JSON format'
      },
      {
        name: '-h, --help',
        description: 'Show help information'
      }
    ]
  };

  argv.formatOutput(helpData);
}

module.exports = handler;
