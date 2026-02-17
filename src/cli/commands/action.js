/**
 * CLI Command: action
 *
 * Manage and perform game actions.
 *
 * Subcommands:
 * - list                       List all available actions
 * - validate <actionId>        Validate an action payload
 * - <actionId>                 Execute an action
 */

const actions = require('../services/actions');
const sessions = require('../services/sessions');
const state = require('../services/state');
const { GameState, TurnManager, EvolutionSystem, SupporterSystem, EnergySystem } = require('../../index');

/**
 * Parse --session flag from positional args
 * @param {string[]} args - Positional args
 * @returns {string|null} Session name or ID
 */
function parseSessionFlag(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session' && args[i + 1]) {
      return args[i + 1];
    }
  }
  return null;
}

/**
 * Execute action command
 * @param {Object} argv - CLI arguments
 */
async function handler(argv) {
  const subcommand = argv.positionalArgs[0];
  const sessionIdentifier = parseSessionFlag(argv.positionalArgs);

  // Handle --help flag for action command
  if (argv.help) {
    console.log(`
USAGE: tcgp action <subcommand> [options]

Manage and perform game actions.

SUBCOMMANDS:
  list                         List all available actions
  validate <actionId>          Validate an action payload against its schema
  <actionId>                   Execute an action

OPTIONS:
  --session <name|id>          Specify the session to use (required for action execution)
  --json                       Output in JSON format
  -h, --help                   Show this help

ARGUMENTS:
  actionId                     Action identifier (e.g., start_turn, draw, attach_energy, evolve)
  payload                      Action payload (JSON string)

EXAMPLES:
  tcgp action list
  tcgp --json action list

  tcgp action validate draw
  tcgp action validate draw '{"playerId":"player1","count":2}'
  tcgp --json action validate evolve '{"playerId":"player1","pokemonId":"p1","evolutionCard":{"id":"e1","name":"Venusaur","stage":"stage2","hp":160}}'

  tcgp action start_turn '{"playerId":"player1"}' --session my-session
  tcgp --json action start_turn '{"playerId":"player1"}' --session my-session

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
        // Check if it's a valid action ID for execution
        const action = actions.getAction(subcommand);
        if (!action) {
          const errorData = {
            error: `Unknown subcommand: ${subcommand}`,
            reason: 'UNKNOWN_SUBCOMMAND',
            message: 'Valid subcommands are: list, validate, or a valid action ID',
            validSubcommands: ['list', 'validate']
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Check if action requires a session
        if (action.sessionRequired && !sessionIdentifier) {
          const errorData = {
            error: 'Missing session',
            reason: 'MISSING_SESSION',
            message: `Action "${subcommand}" requires a session. Use --session <name> to specify which session to use.`,
            actionId: subcommand
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Parse payload from positional args
        const payloadStr = argv.positionalArgs[1];
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

        // Validate payload
        const validationResult = actions.validatePayload(subcommand, payload);
        if (!validationResult.valid) {
          const errorData = {
            error: 'Invalid payload',
            reason: validationResult.reason,
            message: 'Action payload validation failed',
            actionId: subcommand,
            errors: validationResult.errors
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Load session
        let session = sessions.get(sessionIdentifier);
        if (!session) {
          session = sessions.getByName(sessionIdentifier);
        }

        if (!session) {
          const errorData = {
            error: 'Session not found',
            reason: 'SESSION_NOT_FOUND',
            message: `No session found with name or ID "${sessionIdentifier}"`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Check session is active
        if (session.status !== 'active') {
          const errorData = {
            error: 'Session is not active',
            reason: 'SESSION_NOT_ACTIVE',
            message: `Session "${session.name}" is ${session.status}. Only active sessions can execute actions.`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Load latest state
        const latestState = state.getLatest(session.id);
        if (!latestState) {
          const errorData = {
            error: 'No game state found',
            reason: 'NO_STATE_FOUND',
            message: `Session "${session.name}" has no saved game state.`
          };
          argv.formatOutput(errorData);
          process.exit(1);
        }

        // Restore game state from persisted data
        const gameState = GameState.fromJSON(latestState.stateData);

        // Create game systems
        const evolutionSystem = new EvolutionSystem(gameState);
        const supporterSystem = new SupporterSystem(gameState);
        const energySystem = new EnergySystem(gameState);
        const turnManager = new TurnManager(gameState, 30, evolutionSystem, supporterSystem);

        // Execute action based on actionId
        let result;
        switch (subcommand) {
          case 'start_turn': {
            const { playerId } = payload;

            // Execute start_turn
            turnManager.startTurn(playerId);

            // Phase should already be 'main' after startTurn
            if (gameState.phase !== 'main') {
              gameState.phase = 'main';
            }

            // Prepare result
            result = {
              actionId: subcommand,
              sessionId: session.id,
              sessionName: session.name,
              turnNumber: gameState.turnNumber,
              currentPlayer: gameState.currentPlayer,
              phase: gameState.phase,
              playerId,
              hand: gameState.players[playerId].hand,
              handSize: gameState.players[playerId].hand.length,
              message: `Started turn for ${playerId}`
            };
            break;
          }

          case 'end_turn': {
            const { playerId } = payload;

            // Validate that it's this player's turn
            if (gameState.currentPlayer !== playerId) {
              const errorData = {
                error: 'Wrong turn',
                reason: 'WRONG_TURN',
                message: `Cannot end turn: it is currently ${gameState.currentPlayer}'s turn, not ${playerId}'s turn.`,
                currentPlayer: gameState.currentPlayer,
                requestedPlayer: playerId
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Execute end_turn
            const winResult = turnManager.endTurn();

            // Check if game ended due to win condition
            if (winResult) {
              // Update session status to completed
              sessions.update(session.id, { status: 'completed' });

              // Update session object for response
              session.status = 'completed';
            }

            // Prepare result
            result = {
              actionId: subcommand,
              sessionId: session.id,
              sessionName: session.name,
              turnNumber: gameState.turnNumber,
              currentPlayer: gameState.currentPlayer,
              phase: gameState.phase,
              playerId,
              message: `Ended turn for ${playerId}`,
              sessionStatus: session.status,
              gameEnded: !!winResult
            };

            // Include winner info if game ended
            if (winResult) {
              result.winner = winResult.winner;
              result.endReason = winResult.reason;
              result.endMessage = winResult.message;
            }

            break;
          }

          case 'attach_energy': {
            const { playerId, targetPokemonId } = payload;

            // Validate phase is 'main'
            if (gameState.phase !== 'main') {
              const errorData = {
                error: 'Wrong phase',
                reason: 'WRONG_PHASE',
                message: `Energy can only be attached during main phase, current phase is ${gameState.phase}.`,
                currentPhase: gameState.phase,
                expectedPhase: 'main'
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Validate that it's this player's turn
            if (gameState.currentPlayer !== playerId) {
              const errorData = {
                error: 'Wrong turn',
                reason: 'WRONG_TURN',
                message: `Cannot attach energy: it is currently ${gameState.currentPlayer}'s turn, not ${playerId}'s turn.`,
                currentPlayer: gameState.currentPlayer,
                requestedPlayer: playerId
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Validate that energy hasn't been attached this turn
            if (gameState.energyAttachedThisTurn) {
              const errorData = {
                error: 'Energy already attached this turn',
                reason: 'ENERGY_ALREADY_ATTACHED',
                message: 'You can only attach one energy per turn.',
                playerId
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Attach energy using EnergySystem
            const attachResult = energySystem.attachEnergy(playerId, targetPokemonId);

            if (!attachResult.success) {
              const errorData = {
                error: attachResult.message || 'Failed to attach energy',
                reason: attachResult.reason === 'invalid_target' ? 'INVALID_TARGET' : 'ENERGY_ATTACH_FAILED',
                message: attachResult.message,
                playerId,
                targetPokemonId
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Mark energy as attached this turn
            gameState.energyAttachedThisTurn = true;

            // Prepare result
            result = {
              actionId: subcommand,
              sessionId: session.id,
              sessionName: session.name,
              turnNumber: gameState.turnNumber,
              currentPlayer: gameState.currentPlayer,
              phase: gameState.phase,
              playerId,
              targetPokemonId,
              energy: attachResult.energy,
              targetPokemon: attachResult.targetPokemon,
              message: `Attached ${attachResult.energy} to ${attachResult.targetPokemon.name} (${attachResult.targetPokemon.id})`
            };

            break;
          }

          case 'play_pokemon': {
            const { playerId, cardId, zone } = payload;

            // Validate phase is 'main'
            if (gameState.phase !== 'main') {
              const errorData = {
                error: 'Wrong phase',
                reason: 'WRONG_PHASE',
                message: `Pokemon can only be played during main phase, current phase is ${gameState.phase}.`,
                currentPhase: gameState.phase,
                expectedPhase: 'main'
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Validate that it's this player's turn
            if (gameState.currentPlayer !== playerId) {
              const errorData = {
                error: 'Wrong turn',
                reason: 'WRONG_TURN',
                message: `Cannot play Pokemon: it is currently ${gameState.currentPlayer}'s turn, not ${playerId}'s turn.`,
                currentPlayer: gameState.currentPlayer,
                requestedPlayer: playerId
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            const player = gameState.players[playerId];

            // Verify card is in hand
            const handCardIndex = player.hand.findIndex(card => card.id === cardId);
            if (handCardIndex === -1) {
              const errorData = {
                error: 'Card not in hand',
                reason: 'CARD_NOT_IN_HAND',
                message: `Card ${cardId} is not in ${playerId}'s hand.`,
                playerId,
                cardId
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            const card = player.hand[handCardIndex];

            // Verify it's a Basic Pokemon
            if (card.supertype !== 'Pokémon' || card.subtype !== 'Basic') {
              const errorData = {
                error: 'Not a Basic Pokemon',
                reason: 'NOT_BASIC',
                message: `Card ${cardId} is not a Basic Pokémon. Cannot play non-Basic Pokémon from hand.`,
                playerId,
                cardId,
                supertype: card.supertype,
                subtype: card.subtype
              };
              argv.formatOutput(errorData);
              process.exit(1);
            }

            // Check zone constraints
            if (zone === 'active') {
              // Check if active slot is already occupied
              if (player.activePokemon) {
                const errorData = {
                  error: 'Active slot occupied',
                  reason: 'ACTIVE_OCCUPIED',
                  message: `Active Pokemon slot is already occupied by ${player.activePokemon.name} (${player.activePokemon.id}).`,
                  playerId,
                  currentActive: player.activePokemon
                };
                argv.formatOutput(errorData);
                process.exit(1);
              }

              // Play to active slot
              player.activePokemon = card;
              // Remove from hand
              player.hand.splice(handCardIndex, 1);
            } else if (zone === 'bench') {
              // Check if bench is full (max 3)
              if (player.banque.length >= 3) {
                const errorData = {
                  error: 'Bench full',
                  reason: 'BENCH_FULL',
                  message: `Bench is full (max 3 Pokemon). Cannot play ${card.name} (${cardId}).`,
                  playerId,
                  benchSize: player.banque.length,
                  maxBench: 3
                };
                argv.formatOutput(errorData);
                process.exit(1);
              }

              // Play to bench
              player.banque.push(card);
              // Remove from hand
              player.hand.splice(handCardIndex, 1);
            }

            // Prepare result
            result = {
              actionId: subcommand,
              sessionId: session.id,
              sessionName: session.name,
              turnNumber: gameState.turnNumber,
              currentPlayer: gameState.currentPlayer,
              phase: gameState.phase,
              playerId,
              cardId,
              zone,
              pokemon: card,
              handSize: player.hand.length,
              benchSize: player.banque.length,
              activePokemon: zone === 'active' ? player.activePokemon : null,
              message: `Played ${card.name} (${cardId}) to ${zone} zone`
            };

            break;
          }

          default: {
            const errorData = {
              error: 'Action not yet implemented',
              reason: 'NOT_IMPLEMENTED',
              message: `Action "${subcommand}" is registered but not yet implemented for execution.`,
              actionId: subcommand
            };
            argv.formatOutput(errorData);
            process.exit(1);
          }
        }

        // Save new state
        const newState = state.save({
          sessionId: session.id,
          turnNumber: gameState.turnNumber,
          phase: gameState.phase,
          currentPlayer: gameState.currentPlayer,
          stateData: {
            players: gameState.players,
            currentPlayer: gameState.currentPlayer,
            turnNumber: gameState.turnNumber,
            phase: gameState.phase,
            energyAttachedThisTurn: gameState.energyAttachedThisTurn
          }
        });

        // Include state info in result
        result.stateId = newState.id;
        result.savedAt = newState.createdAt;

        if (argv.json) {
          argv.formatOutput(result);
        } else {
          console.log(`Action: ${action.name} (${subcommand})`);
          console.log(`Session: ${session.name} (${session.id})`);
          console.log(`Turn: ${result.turnNumber}`);
          console.log(`Player: ${result.currentPlayer}`);
          console.log(`Phase: ${result.phase}`);

          if (subcommand === 'start_turn') {
            console.log(`Hand size: ${result.handSize}`);
            if (result.hand.length > 0) {
              console.log(`Cards in hand: ${result.hand.length} card(s)`);
            }
          } else if (subcommand === 'end_turn' && result.sessionStatus) {
            console.log(`Session status: ${result.sessionStatus}`);
          } else if (subcommand === 'attach_energy' && result.targetPokemon) {
            console.log(`Energy: ${result.energy}`);
            console.log(`Target: ${result.targetPokemon.name} (${result.targetPokemonId})`);
            console.log(`Total Energy: ${result.targetPokemon.attachedEnergy.length}`);
          } else if (subcommand === 'play_pokemon') {
            console.log(`Pokemon: ${result.pokemon.name} (${result.cardId})`);
            console.log(`Zone: ${result.zone}`);
            console.log(`Hand size: ${result.handSize}`);
            console.log(`Bench size: ${result.benchSize}`);
          }

          console.log(`\n${result.message}`);

          if (result.gameEnded) {
            console.log(`\nGAME ENDED`);
            console.log(`Reason: ${result.endReason}`);
            if (result.winner) {
              console.log(`Winner: ${result.winner}`);
            } else {
              console.log(`Result: Draw (tie)`);
            }
          }

          console.log(`State saved: ${newState.id}`);
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
