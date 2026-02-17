/**
 * CLI Command: snapshot
 *
 * Manage labeled game state snapshots.
 *
 * Subcommands:
 * - save <session> <label>                         Save a snapshot with a label
 * - load <session> <label>                         Load/restore from a snapshot
 * - list <session>                                 List all snapshots for a session
 * - delete <session> <label>                       Delete a snapshot
 */

const snapshots = require('../services/snapshots');
const sessions = require('../services/sessions');
const state = require('../services/state');
const events = require('../services/events');

/**
 * Execute snapshot command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];

  // Handle --help flag for snapshot command
  if (argv.help) {
    console.log(`
USAGE: tcgp snapshot <subcommand> [options]

Manage labeled game state snapshots.

SUBCOMMANDS:
  save <session> <label>       Save a snapshot with a label
  load <session> <label>       Load/restore from a snapshot
  list <session>               List all snapshots for a session
  delete <session> <label>     Delete a snapshot

OPTIONS:
  --json           Output in JSON format
  -h, --help       Show this help

ARGUMENTS:
  session          Session name or ID
  label            Snapshot label (for save, load, delete)

EXAMPLES:
  tcgp snapshot save my-battle before-attack
  tcgp snapshot load my-battle before-attack
  tcgp snapshot list my-battle
  tcgp snapshot delete my-battle before-attack
  tcgp --json snapshot save my-battle critical-point
`);
    return;
  }

  // If no subcommand, show help or error
  if (!subcommand) {
    const errorData = {
      error: 'Missing subcommand',
      reason: 'MISSING_SUBCOMMAND',
      message: 'Usage: tcgp snapshot <save|load|list|delete> [options]',
      subcommands: ['save', 'load', 'list', 'delete']
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'save': {
        const identifier = argv.positionalArgs[1];
        const label = argv.positionalArgs[2];

        if (!identifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot save <session> <label>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!label) {
          const errorData = {
            error: 'Missing snapshot label',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot save <session> <label>'
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

        // Check if snapshot with this label already exists
        const existingSnapshot = snapshots.getByLabel(session.id, label);
        if (existingSnapshot) {
          const errorData = {
            error: 'Snapshot label already exists',
            reason: 'SNAPSHOT_LABEL_EXISTS',
            message: `Snapshot "${label}" already exists for this session`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Get the latest state for the session
        const latestState = state.getLatest(session.id);
        if (!latestState) {
          const errorData = {
            error: 'No state found for session',
            reason: 'NO_STATE_FOUND',
            message: `Session "${session.name}" has no saved state`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Save the snapshot
        const snapshot = snapshots.save({
          sessionId: session.id,
          label,
          turnNumber: latestState.turnNumber,
          phase: latestState.phase,
          currentPlayer: latestState.currentPlayer,
          stateData: latestState.stateData
        });

        // Log snapshot save event
        events.log({
          sessionId: session.id,
          eventType: 'snapshot_saved',
          eventData: {
            label,
            snapshotId: snapshot.id,
            turnNumber: latestState.turnNumber
          }
        });

        const result = {
          id: snapshot.id,
          sessionId: session.id,
          sessionName: session.name,
          label: snapshot.label,
          turnNumber: snapshot.turnNumber,
          phase: snapshot.phase,
          currentPlayer: snapshot.currentPlayer,
          createdAt: snapshot.createdAt,
          message: `Snapshot "${label}" saved successfully for session "${session.name}"`
        };

        argv.formatOutput(result);
        break;
      }

      case 'load': {
        const identifier = argv.positionalArgs[1];
        const label = argv.positionalArgs[2];

        if (!identifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot load <session> <label>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!label) {
          const errorData = {
            error: 'Missing snapshot label',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot load <session> <label>'
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

        // Get the snapshot by label
        const snapshot = snapshots.getByLabel(session.id, label);
        if (!snapshot) {
          const errorData = {
            error: 'Snapshot not found',
            reason: 'SNAPSHOT_NOT_FOUND',
            message: `No snapshot found with label "${label}"`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Validate snapshot state integrity
        const validation = validateSnapshotIntegrity(snapshot);

        // Save the restored state as a new state record
        const restoredState = state.save({
          sessionId: session.id,
          turnNumber: snapshot.turnNumber,
          phase: snapshot.phase,
          currentPlayer: snapshot.currentPlayer,
          stateData: snapshot.stateData
        });

        // Log snapshot load event
        events.log({
          sessionId: session.id,
          eventType: 'snapshot_loaded',
          eventData: {
            label,
            snapshotId: snapshot.id,
            turnNumber: snapshot.turnNumber,
            stateId: restoredState.id
          }
        });

        const result = {
          sessionId: session.id,
          sessionName: session.name,
          snapshotId: snapshot.id,
          label: snapshot.label,
          restoredStateId: restoredState.id,
          turnNumber: snapshot.turnNumber,
          phase: snapshot.phase,
          currentPlayer: snapshot.currentPlayer,
          validation,
          message: `Snapshot "${label}" loaded successfully for session "${session.name}"`
        };

        argv.formatOutput(result);
        break;
      }

      case 'list': {
        const identifier = argv.positionalArgs[1];

        if (!identifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot list <session>'
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

        // Get all snapshots for the session
        const snapshotList = snapshots.list(session.id);

        const result = {
          sessionId: session.id,
          sessionName: session.name,
          snapshots: snapshotList.map(s => ({
            id: s.id,
            label: s.label,
            turnNumber: s.turnNumber,
            phase: s.phase,
            currentPlayer: s.currentPlayer,
            createdAt: s.createdAt
          })),
          count: snapshotList.length
        };

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          if (snapshotList.length === 0) {
            console.log(`No snapshots found for session "${session.name}"`);
          } else {
            console.log(`Found ${snapshotList.length} snapshot(s) for session "${session.name}":\n`);
            for (const s of snapshotList) {
              console.log(`  ${s.label} (ID: ${s.id})`);
              console.log(`    Turn: ${s.turnNumber}, Phase: ${s.phase}, Player: ${s.currentPlayer}`);
              console.log(`    Created: ${new Date(s.createdAt).toISOString()}`);
              console.log('');
            }
          }
        }
        break;
      }

      case 'delete': {
        const identifier = argv.positionalArgs[1];
        const label = argv.positionalArgs[2];

        if (!identifier) {
          const errorData = {
            error: 'Missing session identifier',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot delete <session> <label>'
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        if (!label) {
          const errorData = {
            error: 'Missing snapshot label',
            reason: 'MISSING_ARGUMENT',
            message: 'Usage: tcgp snapshot delete <session> <label>'
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

        // Delete the snapshot by label
        const deleted = snapshots.deleteByLabel(session.id, label);

        if (!deleted) {
          const errorData = {
            error: 'Snapshot not found',
            reason: 'SNAPSHOT_NOT_FOUND',
            message: `No snapshot found with label "${label}"`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Log snapshot delete event
        events.log({
          sessionId: session.id,
          eventType: 'snapshot_deleted',
          eventData: {
            label
          }
        });

        const result = {
          sessionId: session.id,
          sessionName: session.name,
          label,
          message: `Snapshot "${label}" deleted successfully from session "${session.name}"`
        };

        argv.formatOutput(result);
        break;
      }

      default: {
        const errorData = {
          error: `Unknown subcommand: ${subcommand}`,
          reason: 'UNKNOWN_SUBCOMMAND',
          message: 'Valid subcommands are: save, load, list, delete',
          validSubcommands: ['save', 'load', 'list', 'delete']
        };
        argv.formatOutput(errorData);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorData = {
      error: error.message,
      reason: error.cause || 'SNAPSHOT_ERROR',
      message: 'Failed to manage snapshot'
    };
    argv.formatOutput(errorData);
    process.exit(1);
  }
}

/**
 * Validate snapshot state integrity
 * @param {Object} snapshot - Snapshot record
 * @returns {Object} Validation result
 */
function validateSnapshotIntegrity(snapshot) {
  const issues = [];

  // Check required fields
  if (!snapshot.turnNumber && snapshot.turnNumber !== 0) {
    issues.push('Missing turn number');
  }
  if (!snapshot.phase) {
    issues.push('Missing phase');
  }
  if (!snapshot.currentPlayer) {
    issues.push('Missing current player');
  }
  if (!snapshot.stateData) {
    issues.push('Missing state data');
  } else {
    // Check stateData structure
    if (!snapshot.stateData.players) {
      issues.push('Missing players in state data');
    }
    if (snapshot.stateData.turnNumber === undefined) {
      issues.push('Missing turnNumber in state data');
    }
    if (!snapshot.stateData.phase) {
      issues.push('Missing phase in state data');
    }
  }

  // Check consistency between snapshot fields and stateData
  if (snapshot.stateData && snapshot.stateData.turnNumber !== undefined) {
    if (snapshot.turnNumber !== snapshot.stateData.turnNumber) {
      issues.push(`Turn number mismatch: snapshot.turnNumber=${snapshot.turnNumber}, stateData.turnNumber=${snapshot.stateData.turnNumber}`);
    }
  }
  if (snapshot.stateData && snapshot.stateData.phase) {
    if (snapshot.phase !== snapshot.stateData.phase) {
      issues.push(`Phase mismatch: snapshot.phase=${snapshot.phase}, stateData.phase=${snapshot.stateData.phase}`);
    }
  }
  if (snapshot.stateData && snapshot.stateData.currentPlayer) {
    if (snapshot.currentPlayer !== snapshot.stateData.currentPlayer) {
      issues.push(`Current player mismatch: snapshot.currentPlayer=${snapshot.currentPlayer}, stateData.currentPlayer=${snapshot.stateData.currentPlayer}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

module.exports = handler;
