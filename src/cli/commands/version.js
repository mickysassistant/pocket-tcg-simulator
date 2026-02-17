/**
 * CLI Command: version
 * 
 * Display version information for the tcgp CLI
 */

const packageInfo = require('../../../package.json');

/**
 * Execute version command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const versionData = {
    name: packageInfo.name,
    version: packageInfo.version,
    description: packageInfo.description,
    cli: 'tcgp'
  };

  argv.formatOutput(versionData);
}

module.exports = handler;
