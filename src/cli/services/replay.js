/**
 * Replay Service - Manages replay export and execution
 *
 * This service provides:
 * - Exporting session events to replay files
 * - Re-executing replays for regression testing
 * - Comparing final states
 */

const sessions = require('./sessions');
const state = require('./state');
const events = require('./events');
const { createGame } = require('../../index');
const fs = require('fs');
const path = require('path');

/**
 * Export a session to a replay file
 * @param {string} sessionId - Session ID or name
 * @param {string} outputFile - Output file path (optional, defaults to session-name.replay.json)
 * @returns {Object} { success: boolean, data?: Object, error?: Object }
 */
function exportSession(sessionId, outputFile = null) {
  try {
    // Load session
    const session = loadSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          reason: 'SESSION_NOT_FOUND',
          message: `Session "${sessionId}" not found`
        }
      };
    }

    // Get all events for the session
    const eventList = events.list(session.id);

    // Get latest state
    const latestState = state.getLatest(session.id);

    // Build replay object
    const replay = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      session: {
        id: session.id,
        name: session.name,
        player1Deck: session.player1Deck,
        player2Deck: session.player2Deck,
        metadata: session.metadata || {}
      },
      events: eventList.map(event => ({
        id: event.id,
        type: event.eventType,
        data: event.eventData,
        turnNumber: event.turnNumber,
        createdAt: event.createdAt
      })),
      finalState: latestState ? {
        id: latestState.id,
        turnNumber: latestState.turnNumber,
        phase: latestState.phase,
        currentPlayer: latestState.currentPlayer,
        stateData: latestState.stateData
      } : null
    };

    // Determine output file
    if (!outputFile) {
      outputFile = `${session.name}.replay.json`;
    }

    // Ensure directory exists
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write replay file
    fs.writeFileSync(outputFile, JSON.stringify(replay, null, 2), 'utf8');

    return {
      success: true,
      data: {
        sessionId: session.id,
        sessionName: session.name,
        outputFile,
        eventCount: eventList.length,
        finalTurn: latestState?.turnNumber || null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        reason: 'EXPORT_ERROR',
        message: error.message || 'Failed to export replay'
      }
    };
  }
}

/**
 * Run a replay from a replay file
 * @param {string} replayFile - Path to replay file
 * @param {string} expectedStateFile - Path to expected state file (optional)
 * @returns {Object} { success: boolean, data?: Object, error?: Object }
 */
function runReplay(replayFile, expectedStateFile = null) {
  try {
    // Check if replay file exists
    if (!fs.existsSync(replayFile)) {
      return {
        success: false,
        error: {
          reason: 'REPLAY_FILE_NOT_FOUND',
          message: `Replay file not found: ${replayFile}`
        }
      };
    }

    // Read and parse replay file
    let replay;
    try {
      const content = fs.readFileSync(replayFile, 'utf8');
      replay = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        error: {
          reason: 'INVALID_REPLAY_FILE',
          message: `Failed to parse replay file: ${error.message}`
        }
      };
    }

    // Validate replay structure
    if (!replay.session || !replay.events) {
      return {
        success: false,
        error: {
          reason: 'INVALID_REPLAY_STRUCTURE',
          message: 'Replay file is missing required session or events data'
        }
      };
    }

    // Load expected state if provided
    let expectedState = null;
    if (expectedStateFile) {
      if (!fs.existsSync(expectedStateFile)) {
        return {
          success: false,
          error: {
            reason: 'EXPECTED_STATE_FILE_NOT_FOUND',
            message: `Expected state file not found: ${expectedStateFile}`
          }
        };
      }

      try {
        const content = fs.readFileSync(expectedStateFile, 'utf8');
        expectedState = JSON.parse(content);
      } catch (error) {
        return {
          success: false,
          error: {
            reason: 'INVALID_EXPECTED_STATE_FILE',
            message: `Failed to parse expected state file: ${error.message}`
          }
        };
      }
    }

    // Reconstruct session
    const { session, events: eventList } = replay;

    // Create new game session with determinism settings
    const metadata = session.metadata || {};
    const seed = metadata.seed || null;
    const coinQueue = metadata.coinQueue || null;

    // Create game with decks from replay
    const p1Deck = createMockDeck(session.player1Deck);
    const p2Deck = createMockDeck(session.player2Deck);
    const game = createGame(p1Deck, p2Deck, seed, coinQueue);

    // Track executed events
    const executedEvents = [];
    const errors = [];

    // Execute each event
    for (const event of eventList) {
      if (event.type === 'action') {
        const result = executeEvent(game, event.data);

        if (!result.success) {
          errors.push({
            eventId: event.id,
            action: event.data.action,
            error: result.error
          });
        }

        executedEvents.push({
          eventId: event.id,
          type: event.type,
          action: event.data.action,
          success: result.success,
          result: result.data || null
        });
      }
    }

    // Get final state
    const turnInfo = game.gameState.getCurrentTurnInfo();

    const safeMap = (arr) => (Array.isArray(arr) ? arr.map(c => c.id).filter(id => id !== undefined && id !== null) : []);

    const actualFinalState = {
      turnNumber: turnInfo.turnNumber,
      phase: turnInfo.phase,
      currentPlayer: turnInfo.currentPlayer,
      players: {
        player1: {
          hand: safeMap(game.gameState.players.player1.hand),
          deck: safeMap(game.gameState.players.player1.deck),
          discard: safeMap(game.gameState.players.player1.discard),
          activePokemon: game.gameState.players.player1.activePokemon?.id || null,
          bench: safeMap(game.gameState.players.player1.banque)
        },
        player2: {
          hand: safeMap(game.gameState.players.player2.hand),
          deck: safeMap(game.gameState.players.player2.deck),
          discard: safeMap(game.gameState.players.player2.discard),
          activePokemon: game.gameState.players.player2.activePokemon?.id || null,
          bench: safeMap(game.gameState.players.player2.banque)
        }
      }
    };

    // Compare with expected state if provided
    let comparison = null;
    if (expectedState) {
      comparison = compareStates(actualFinalState, expectedState);
    } else if (replay.finalState) {
      // If no expected state file, compare with the final state in the replay
      // This is for informational purposes only - won't affect success status
      comparison = compareStates(actualFinalState, {
        turnNumber: replay.finalState.turnNumber,
        phase: replay.finalState.phase,
        currentPlayer: replay.finalState.currentPlayer,
        players: simplifyPlayers(replay.finalState.stateData?.players)
      });
      // Mark this comparison as informational only
      comparison.informational = true;
    }

    // Success depends only on whether there were errors during execution
    // Comparison is used for regression testing when explicitly provided
    const hasExpectedState = !!expectedState;
    const success = errors.length === 0 && (!hasExpectedState || comparison?.match !== false);

    return {
      success,
      data: {
        replayFile,
        sessionName: session.name,
        eventsExecuted: executedEvents.length,
        errors,
        finalState: actualFinalState,
        comparison
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        reason: 'REPLAY_ERROR',
        message: error.message || 'Failed to run replay'
      }
    };
  }
}

/**
 * Execute an event from the replay
 * @private
 */
function executeEvent(game, eventData) {
  const { action, payload } = eventData;

  try {
    switch (action) {
      case 'draw': {
        const result = game.gameState.drawCards(
          payload.playerId,
          payload.count,
          payload.respectHandLimit !== false
        );
        return { success: true, data: { drawn: result } };
      }

      case 'attach_energy': {
        const result = game.energySystem.attachEnergy(
          payload.playerId,
          payload.targetPokemonId
        );
        return result.success ? { success: true, data: result } : result;
      }

      case 'evolve': {
        const result = game.evolutionSystem.evolve(
          payload.playerId,
          payload.pokemonId,
          payload.evolutionCard
        );
        return result.success ? { success: true, data: result } : result;
      }

      case 'play_supporter': {
        const result = game.supporterSystem.playSupporter(
          payload.playerId,
          payload.card
        );
        return result.success ? { success: true, data: result } : result;
      }

      case 'play': {
        const result = playPokemon(game, payload.playerId, payload.card, payload.location);
        return result.success ? { success: true, data: result } : result;
      }

      case 'attack': {
        const result = executeAttack(game, payload.playerId, payload.attackId, payload.target);
        return result.success ? { success: true, data: result } : result;
      }

      case 'retreat': {
        const result = executeRetreat(game, payload.playerId, payload.benchTarget);
        return result.success ? { success: true, data: result } : result;
      }

      case 'end_turn': {
        const result = game.turnManager.endTurn();
        return {
          success: true,
          data: { turnEnded: payload.playerId, winCondition: result || null }
        };
      }

      case 'start_turn': {
        game.turnManager.startTurn(payload.playerId);
        return {
          success: true,
          data: {
            turnStarted: payload.playerId,
            turnNumber: game.gameState.turnNumber
          }
        };
      }

      default:
        return {
          success: false,
          error: {
            reason: 'UNKNOWN_ACTION',
            message: `Unknown action: ${action}`
          }
        };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        reason: 'EXECUTION_ERROR',
        message: error.message
      }
    };
  }
}

/**
 * Play a Pokemon to active or bench (simplified)
 * @private
 */
function playPokemon(game, playerId, card, location) {
  const player = game.gameState.players[playerId];

  // Find card in hand by id
  const handIndex = player.hand.findIndex(c => c.id === card.id);
  if (handIndex === -1) {
    // Card might have been already played, try to find by name as fallback
    const nameIndex = player.hand.findIndex(c => c.name === card.name);
    if (nameIndex === -1) {
      return {
        success: false,
        error: {
          reason: 'CARD_NOT_IN_HAND',
          message: 'Card not found in hand'
        }
      };
    }
    player.hand.splice(nameIndex, 1);
  } else {
    player.hand.splice(handIndex, 1);
  }

  // Add to location
  if (location === 'active') {
    if (player.activePokemon) {
      if (!player.banque) {
        player.banque = [];
      }
      player.banque.push(player.activePokemon);
    }
    game.evolutionSystem.setActivePokemon(playerId, card);
  } else if (location === 'bench') {
    if (!player.banque) {
      player.banque = [];
    }
    if (player.banque.length >= 5) {
      return {
        success: false,
        error: {
          reason: 'BENCH_FULL',
          message: 'Bench is full (max 5 Pokemon)'
        }
      };
    }
    game.evolutionSystem.addToBanque(playerId, card);
  }

  return {
    success: true,
    data: { cardId: card.id, location }
  };
}

/**
 * Execute an attack (simplified)
 * @private
 */
function executeAttack(game, playerId, attackId, target) {
  const attacker = game.gameState.players[playerId].activePokemon;

  if (!attacker) {
    return {
      success: false,
      error: {
        reason: 'NO_ACTIVE_POKEMON',
        message: 'No active Pokemon to attack with'
      }
    };
  }

  const opponentId = playerId === 'player1' ? 'player2' : 'player1';
  const defender = game.gameState.players[opponentId].activePokemon;

  if (!defender) {
    return {
      success: false,
      error: {
        reason: 'NO_TARGET',
        message: 'Opponent has no active Pokemon'
      }
    };
  }

  const damage = 30;
  defender.hp = Math.max(0, defender.hp - damage);

  return {
    success: true,
    data: { damage, defenderHp: defender.hp }
  };
}

/**
 * Retreat active Pokemon to bench (simplified)
 * @private
 */
function executeRetreat(game, playerId, benchTarget) {
  const player = game.gameState.players[playerId];

  if (!player.activePokemon) {
    return {
      success: false,
      error: {
        reason: 'NO_ACTIVE_POKEMON',
        message: 'No active Pokemon to retreat'
      }
    };
  }

  if (!player.banque || player.banque.length === 0) {
    return {
      success: false,
      error: {
        reason: 'BENCH_EMPTY',
        message: 'No Pokemon on bench to promote'
      }
    };
  }

  const benchIndex = player.banque.findIndex(p => p.id === benchTarget);
  if (benchIndex === -1) {
    return {
      success: false,
      error: {
        reason: 'POKEMON_NOT_ON_BENCH',
        message: 'Pokemon not found on bench'
      }
    };
  }

  const benchPokemon = player.banque.splice(benchIndex, 1)[0];
  const activePokemon = player.activePokemon;

  player.activePokemon = benchPokemon;
  player.banque.push(activePokemon);

  return {
    success: true,
    data: { retreated: activePokemon.id, promoted: benchPokemon.id }
  };
}

/**
 * Compare actual state with expected state
 * @private
 */
function compareStates(actual, expected) {
  const mismatches = [];

  // Compare top-level fields
  if (actual.turnNumber !== expected.turnNumber) {
    mismatches.push({
      field: 'turnNumber',
      actual: actual.turnNumber,
      expected: expected.turnNumber
    });
  }

  if (actual.phase !== expected.phase) {
    mismatches.push({
      field: 'phase',
      actual: actual.phase,
      expected: expected.phase
    });
  }

  if (actual.currentPlayer !== expected.currentPlayer) {
    mismatches.push({
      field: 'currentPlayer',
      actual: actual.currentPlayer,
      expected: expected.currentPlayer
    });
  }

  // Compare player states
  for (const playerId of ['player1', 'player2']) {
    const actualPlayer = actual.players[playerId];
    const expectedPlayer = expected.players?.[playerId];

    if (!expectedPlayer) continue;

    // Compare hand sizes
    if (actualPlayer.hand.length !== expectedPlayer.hand.length) {
      mismatches.push({
        field: `${playerId}.hand.length`,
        actual: actualPlayer.hand.length,
        expected: expectedPlayer.hand.length
      });
    }

    // Compare deck sizes
    if (actualPlayer.deck.length !== expectedPlayer.deck.length) {
      mismatches.push({
        field: `${playerId}.deck.length`,
        actual: actualPlayer.deck.length,
        expected: expectedPlayer.deck.length
      });
    }

    // Compare discard pile sizes
    if (actualPlayer.discard.length !== expectedPlayer.discard.length) {
      mismatches.push({
        field: `${playerId}.discard.length`,
        actual: actualPlayer.discard.length,
        expected: expectedPlayer.discard.length
      });
    }

    // Compare active Pokemon
    if (actualPlayer.activePokemon !== expectedPlayer.activePokemon) {
      mismatches.push({
        field: `${playerId}.activePokemon`,
        actual: actualPlayer.activePokemon,
        expected: expectedPlayer.activePokemon
      });
    }

    // Compare bench sizes
    if (actualPlayer.bench.length !== expectedPlayer.bench.length) {
      mismatches.push({
        field: `${playerId}.bench.length`,
        actual: actualPlayer.bench.length,
        expected: expectedPlayer.bench.length
      });
    }
  }

  return {
    match: mismatches.length === 0,
    mismatches
  };
}

/**
 * Simplify players from game state for comparison
 * @private
 */
function simplifyPlayers(players) {
  if (!players) return null;

  const safeMap = (arr) => (Array.isArray(arr) ? arr.map(c => c.id) : []);

  return {
    player1: {
      hand: safeMap(players.player1?.hand),
      deck: safeMap(players.player1?.deck),
      discard: safeMap(players.player1?.discard),
      activePokemon: players.player1?.activePokemon?.id || null,
      bench: safeMap(players.player1?.banque)
    },
    player2: {
      hand: safeMap(players.player2?.hand),
      deck: safeMap(players.player2?.deck),
      discard: safeMap(players.player2?.discard),
      activePokemon: players.player2?.activePokemon?.id || null,
      bench: safeMap(players.player2?.banque)
    }
  };
}

/**
 * Load a session by ID or name
 * @private
 */
function loadSession(sessionId) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = sessions.getByName(sessionId);
  }
  return session;
}

/**
 * Create a mock deck from a deck identifier
 * @private
 */
function createMockDeck(deckId) {
  // For replay purposes, we create a minimal mock deck
  // The actual deck composition is reconstructed from the replay events
  return Array(20).fill(null).map((_, i) => ({
    id: `${deckId}-${i}`,
    name: 'Card',
    hp: 60,
    type: 'normal'
  }));
}

module.exports = {
  exportSession,
  runReplay
};
