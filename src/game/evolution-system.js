/**
 * Evolution System - Handles evolution validation and execution for Pocket TCG
 * 
 * Evolution rules:
 * - Evolution is blocked on global opening turn (turn 0)
 * - Pokemon cannot evolve if it was played this turn
 * - A Pokemon cannot evolve twice in one turn
 * - Multiple different Pokemon can evolve in the same turn
 */

class EvolutionSystem {
  constructor(gameState) {
    this.gameState = gameState;
    
    // Track which Pokemon have evolved this turn
    this.evolvedThisTurn = new Set();
  }

  /**
   * Check if a Pokemon can evolve
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokemon to evolve
   * @returns {Object} Validation result { canEvolve: boolean, reason?: string }
   */
  canEvolve(playerId, pokemonId) {
    const turnInfo = this.gameState.getCurrentTurnInfo();
    
    // Rule 1: Block evolution on global opening turn (turn 0)
    if (turnInfo.turnNumber === 0) {
      return {
        canEvolve: false,
        reason: 'opening_turn_restriction',
        message: 'Cannot evolve on the opening turn of the game'
      };
    }

    // Get Pokemon state
    const pokemon = this.getPokemon(playerId, pokemonId);
    if (!pokemon) {
      return {
        canEvolve: false,
        reason: 'pokemon_not_found',
        message: 'Pokemon not found in play'
      };
    }

    // Rule 2: Cannot evolve Pokemon played this turn
    if (pokemon.playedThisTurn) {
      return {
        canEvolve: false,
        reason: 'played_this_turn',
        message: 'Cannot evolve a Pokemon that was played this turn'
      };
    }

    // Rule 3: Cannot evolve same Pokemon twice in one turn
    if (this.evolvedThisTurn.has(pokemonId)) {
      return {
        canEvolve: false,
        reason: 'already_evolved',
        message: 'This Pokemon has already evolved this turn'
      };
    }

    // All checks passed
    return {
      canEvolve: true
    };
  }

  /**
   * Evolve a Pokemon
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokemon to evolve
   * @param {Object} evolutionCard - The evolution card to apply
   * @returns {Object} Result { success: boolean, reason?: string }
   */
  evolve(playerId, pokemonId, evolutionCard) {
    // Validate evolution
    const validation = this.canEvolve(playerId, pokemonId);
    if (!validation.canEvolve) {
      // Log blocked evolution
      this.gameState.turnLog.push({
        type: 'evolution_blocked',
        player: playerId,
        pokemonId: pokemonId,
        reason: validation.reason,
        message: validation.message
      });

      return {
        success: false,
        reason: validation.reason,
        message: validation.message
      };
    }

    // Get Pokemon state
    const pokemon = this.getPokemon(playerId, pokemonId);
    if (!pokemon) {
      return {
        success: false,
        reason: 'pokemon_not_found',
        message: 'Pokemon not found in play'
      };
    }

    // Apply evolution
    pokemon.previousStage = pokemon.stage;
    pokemon.stage = evolutionCard.stage;
    pokemon.name = evolutionCard.name;
    pokemon.hp = evolutionCard.hp;
    pokemon.evolutionCard = evolutionCard;

    // Mark this Pokemon as evolved this turn
    this.evolvedThisTurn.add(pokemonId);

    // Log successful evolution
    this.gameState.turnLog.push({
      type: 'evolution',
      player: playerId,
      pokemonId: pokemonId,
      from: pokemon.previousStage,
      to: pokemon.stage,
      cardId: evolutionCard.id
    });

    return {
      success: true
    };
  }

  /**
   * Mark a Pokemon as played this turn (to prevent evolution)
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokemon
   */
  markPlayedThisTurn(playerId, pokemonId) {
    const pokemon = this.getPokemon(playerId, pokemonId);
    if (pokemon) {
      pokemon.playedThisTurn = true;
    }
  }

  /**
   * Reset turn-specific evolution tracking
   * Called at the start of each player's turn
   */
  resetTurnTracking() {
    // Clear playedThisTurn flags
    for (const playerId of ['player1', 'player2']) {
      const player = this.gameState.players[playerId];
      
      if (player.activePokemon) {
        player.activePokemon.playedThisTurn = false;
      }
      
      if (player.banque) {
        for (const benchPokemon of player.banque) {
          if (benchPokemon) {
            benchPokemon.playedThisTurn = false;
          }
        }
      }
    }
    
    // Clear evolved this turn tracking
    this.evolvedThisTurn.clear();
  }

  /**
   * Check if the current turn is the opening turn
   * @returns {boolean} True if turnNumber is 0
   */
  isOpeningTurn() {
    return this.gameState.getCurrentTurnInfo().turnNumber === 0;
  }

  /**
   * Get a Pokemon by ID from player's active or bench
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokemon
   * @returns {Object|null} Pokemon state or null
   */
  getPokemon(playerId, pokemonId) {
    const player = this.gameState.players[playerId];
    
    // Check active Pokemon
    if (player.activePokemon && player.activePokemon.id === pokemonId) {
      return player.activePokemon;
    }
    
    // Check bench
    if (player.banque) {
      for (const benchPokemon of player.banque) {
        if (benchPokemon && benchPokemon.id === pokemonId) {
          return benchPokemon;
        }
      }
    }
    
    return null;
  }

  /**
   * Add a Pokemon to active spot
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} pokemon - Pokemon to add
   */
  setActivePokemon(playerId, pokemon) {
    this.gameState.players[playerId].activePokemon = {
      ...pokemon,
      id: pokemon.id || `active-${playerId}-${Date.now()}`,
      stage: pokemon.stage || 'basic',
      playedThisTurn: true,
      hp: pokemon.hp || 60,
      previousStage: null
    };
  }

  /**
   * Add a Pokemon to bench
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} pokemon - Pokemon to add
   */
  addToBanque(playerId, pokemon) {
    const player = this.gameState.players[playerId];
    if (!player.banque) {
      player.banque = [];
    }
    
    player.banque.push({
      ...pokemon,
      id: pokemon.id || `bench-${playerId}-${Date.now()}`,
      stage: pokemon.stage || 'basic',
      playedThisTurn: true,
      hp: pokemon.hp || 60,
      previousStage: null
    });
  }
}

module.exports = EvolutionSystem;
