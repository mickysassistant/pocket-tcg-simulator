/**
 * CLI Command: deck
 * 
 * Manage and analyze decks for the tcgp CLI.
 * 
 * Subcommands:
 * - validate <file>  Validate a deck file
 * - stats <file>     Show statistics for a deck file
 */

const deckService = require('../services/deck');

/**
 * Execute deck command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for deck command
  if (argv.help) {
    console.log(`
USAGE: tcgp deck <subcommand> [options]

Manage and analyze decks for the tcgp CLI.

SUBCOMMANDS:
  validate <file>   Validate a deck file
  stats <file>      Show statistics for a deck file

OPTIONS:
  --json           Output in JSON format
  -h, --help       Show this help

EXAMPLES:
  tcgp deck validate data/A1a.json
  tcgp deck stats data/A1a.json
  tcgp deck --json validate data/A1a.json
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp deck <validate|stats> [options]',
      subcommands: ['validate', 'stats']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'validate': {
        const deckPath = argv.positionalArgs[1];
        if (!deckPath) {
          const errorData = {
            error: 'Missing deck file argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp deck validate <file>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        const result = deckService.validateDeck(deckPath);

        if (argv.json) {
          argv.formatOutput(result);
          // Exit with error code if deck is invalid
          if (!result.valid) {
            process.exit(1);
          }
        } else {
          if (result.valid) {
            console.log(`✓ ${result.message}`);
            console.log(`  File: ${result.deckPath}`);
            console.log(`  Cards: ${result.cardCount}`);
          } else {
            console.log(`✗ ${result.message}`);
            if (result.errors && result.errors.length > 0) {
              console.log('  Errors:');
              result.errors.forEach(err => console.log(`    - ${err}`));
            }
            process.exit(1);
          }
        }
        break;
      }

      case 'stats': {
        const deckPath = argv.positionalArgs[1];
        if (!deckPath) {
          const errorData = {
            error: 'Missing deck file argument',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp deck stats <file>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        const result = deckService.getDeckStats(deckPath);

        if (result.error) {
          const errorData = {
            error: result.error,
            reason: result.reason
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Deck Statistics: ${result.deckPath}\n`);
          console.log(`  Total Cards: ${result.totalCards}`);
          console.log(`  Valid Size (${deckService.DECK_SIZE}): ${result.isValidSize ? 'Yes' : 'No'}`);
          console.log(`  Duplicate Cards: ${result.duplicates}\n`);

          if (Object.keys(result.supertypes).length > 0) {
            console.log('  Card Types:');
            for (const [type, count] of Object.entries(result.supertypes)) {
              console.log(`    ${type}: ${count}`);
            }
            console.log('');
          }

          if (result.elements.length > 0) {
            console.log('  Elements:');
            for (const [element, count] of Object.entries(result.elementCounts)) {
              console.log(`    ${element}: ${count}`);
            }
            console.log('');
          }

          if (Object.keys(result.stages).length > 0) {
            console.log('  Stages:');
            for (const [stage, count] of Object.entries(result.stages)) {
              console.log(`    ${stage}: ${count}`);
            }
            console.log('');
          }

          if (result.hpDistribution.min !== null) {
            console.log('  HP Distribution:');
            console.log(`    Min: ${result.hpDistribution.min}`);
            console.log(`    Max: ${result.hpDistribution.max}`);
            console.log(`    Avg: ${result.hpDistribution.avg}`);
            console.log('');
          }

          if (Object.keys(result.energyCosts).length > 0) {
            console.log('  Energy Costs:');
            for (const [cost, count] of Object.entries(result.energyCosts)) {
              console.log(`    ${cost}: ${count}`);
            }
          }
        }
        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: `Valid subcommands are: validate, stats`,
          validSubcommands: ['validate', 'stats']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'DECK_ERROR',
      message: 'Failed to analyze deck'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

module.exports = handler;
