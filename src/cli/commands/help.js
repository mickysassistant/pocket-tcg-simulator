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
        description: 'Perform in-game actions (TBD)'
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
