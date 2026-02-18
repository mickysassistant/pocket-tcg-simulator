/**
 * Activated Ability System - Manages activatable abilities with usage limits
 *
 * This file implements the activatable ability system for Pocket TCG Simulator,
 * supporting abilities that can be manually activated during a turn.
 *
 * GAP-004: [Crítico][C1] Habilidades de movimiento de energía (Vaporeon (Wash Out))
 * GAP-008: [Importante][C1] Switch desde Banca a Activo (Solgaleo ex (Rising Road))
 *
 * Activated abilities differ from passive abilities in that:
 * - They must be explicitly invoked by a player
 * - They have usage limits (once per turn, per Pokemon, unlimited, etc.)
 * - They can have effects like moving energy between Pokemon or switching positions
 *
 * Activated ability definition schema:
 * {
 *   id: string,               // Unique ability ID
 *   name: string,             // Display name
 *   pokemonId: string,        // ID of the Pokémon that has this ability
 *   type: 'activated',        // Always 'activated'
 *   effect: {
 *     type: 'move_energy' | 'switch_pokemon',
 *     // For move_energy:
 *     from: 'active' | 'bench' | 'any' | { pokemonId: string },
 *     to: 'active' | 'bench' | { pokemonId: string },
 *     count: number,          // Number of energy to move
 *     energyType?: string,    // Optional specific energy type
 *     // For switch_pokemon (no additional fields needed)
 *   },
 *   condition: {
 *     type: string,           // Condition type (see AbilitySystem)
 *     ...params               // Condition-specific parameters
 *   },
 *   usageLimit: 'once_per_turn' | 'per_pokemon_once' | 'unlimited'
 * }
 *
 * Usage limits:
 * - 'once_per_turn': Can be used once per game turn (not per Pokemon)
 * - 'per_pokemon_once': Can be used once per Pokemon per turn
 * - 'unlimited': Can be used as often as you like per turn
 */

class ActivatedAbilitySystem {
  constructor(gameState, abilitySystem, statusConditionSystem = null) {
    this.gameState = gameState;
    this.abilitySystem = abilitySystem;
    this.statusConditionSystem = statusConditionSystem;

    // Map: pokemonId → array of activated ability definitions
    // Abilities are registered per-Pokémon when they enter play
    this._abilities = new Map();

    // Map: abilityId → usage tracking
    // Tracks how many times each ability has been used this turn
    this._usage = new Map();

    // Set: abilityIds used this turn (for once_per_turn)
    this._usedThisTurn = new Set();
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register an activated ability for a Pokémon that is currently in play
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokémon that has this ability
   * @param {Object} abilityDef - Activated ability definition object
   */
  registerAbility(playerId, pokemonId, abilityDef) {
    const key = `${playerId}:${pokemonId}`;
    if (!this._abilities.has(key)) {
      this._abilities.set(key, []);
    }
    this._abilities.get(key).push({
      ...abilityDef,
      _playerId: playerId,
      _pokemonId: pokemonId
    });

    // Initialize usage tracking for this ability
    this._usage.set(abilityDef.id, { count: 0, lastTurn: -1 });
  }

  /**
   * Remove all activated abilities for a specific Pokémon (e.g., KO'd or retreated)
   * @param {string} playerId
   * @param {string} pokemonId
   */
  removeAbilities(playerId, pokemonId) {
    const key = `${playerId}:${pokemonId}`;
    const abilities = this._abilities.get(key);
    if (abilities) {
      // Clean up usage tracking for these abilities
      for (const ability of abilities) {
        this._usage.delete(ability.id);
        this._usedThisTurn.delete(ability.id);
      }
    }
    this._abilities.delete(key);
  }

  /**
   * Remove all activated abilities for a player (e.g., board reset)
   * @param {string} playerId
   */
  removeAllAbilitiesForPlayer(playerId) {
    for (const key of this._abilities.keys()) {
      if (key.startsWith(`${playerId}:`)) {
        const abilities = this._abilities.get(key);
        if (abilities) {
          for (const ability of abilities) {
            this._usage.delete(ability.id);
            this._usedThisTurn.delete(ability.id);
          }
        }
        this._abilities.delete(key);
      }
    }
  }

  /**
   * Get all registered activated ability entries (for inspection / testing)
   * @returns {Array}
   */
  getAllAbilities() {
    const result = [];
    for (const abilities of this._abilities.values()) {
      result.push(...abilities);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Usage Tracking
  // ---------------------------------------------------------------------------

  /**
   * Reset usage counters at the start of a new turn
   * Called by TurnManager at turn start
   */
  resetUsageForNewTurn() {
    const currentTurn = this.gameState.turnNumber;

    for (const [abilityId, usageData] of this._usage.entries()) {
      if (usageData.lastTurn !== currentTurn) {
        // New turn - reset usage
        usageData.count = 0;
        usageData.lastTurn = currentTurn;
      }
    }

    // Clear the "used this turn" set for once_per_turn abilities
    this._usedThisTurn.clear();
  }

  /**
   * Check if an ability can be used based on its usage limit
   * @param {string} abilityId - Ability ID to check
   * @param {string} playerId - Player attempting to use the ability
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  canUseAbility(abilityId, playerId) {
    const ability = this._findAbility(abilityId);
    if (!ability) {
      return {
        allowed: false,
        reason: 'ability_not_found',
        message: 'Ability not found or not registered'
      };
    }

    // Check if the ability belongs to the current player
    if (ability._playerId !== playerId) {
      return {
        allowed: false,
        reason: 'not_owner',
        message: 'Cannot use opponent\'s ability'
      };
    }

    // Check usage limit
    const usageData = this._usage.get(abilityId);
    const usageLimit = ability.usageLimit || 'once_per_turn';

    switch (usageLimit) {
      case 'once_per_turn':
        if (this._usedThisTurn.has(abilityId)) {
          return {
            allowed: false,
            reason: 'usage_limit_reached',
            message: 'This ability can only be used once per turn'
          };
        }
        break;

      case 'per_pokemon_once':
        if (usageData && usageData.count > 0 && usageData.lastTurn === this.gameState.turnNumber) {
          return {
            allowed: false,
            reason: 'usage_limit_reached',
            message: 'This ability can only be used once per Pokémon per turn'
          };
        }
        break;

      case 'unlimited':
        // Always allowed
        break;

      default:
        return {
          allowed: false,
          reason: 'invalid_usage_limit',
          message: `Unknown usage limit: ${usageLimit}`
        };
    }

    return { allowed: true };
  }

  // ---------------------------------------------------------------------------
  // Ability Activation
  // ---------------------------------------------------------------------------

  /**
   * Activate an activated ability
   * @param {string} abilityId - Ability ID to activate
   * @param {string} playerId - Player activating the ability
   * @param {Object} params - Effect-specific parameters (e.g., target Pokemon for move_energy)
   * @returns {Object} Result with success boolean and details
   */
  activateAbility(abilityId, playerId, params = {}) {
    // Check if ability can be used
    const canUse = this.canUseAbility(abilityId, playerId);
    if (!canUse.allowed) {
      this.gameState.turnLog.push({
        type: 'ability_activation_failed',
        player: playerId,
        ability: abilityId,
        reason: canUse.reason,
        message: canUse.message
      });

      return {
        success: false,
        reason: canUse.reason,
        message: canUse.message
      };
    }

    const ability = this._findAbility(abilityId);
    if (!ability) {
      return {
        success: false,
        reason: 'ability_not_found',
        message: 'Ability not found'
      };
    }

    // Check condition if present
    if (ability.condition) {
      const conditionMet = this.abilitySystem.evaluateCondition(
        ability.condition,
        ability._playerId,
        ability._pokemonId
      );

      if (!conditionMet) {
        this.gameState.turnLog.push({
          type: 'ability_activation_failed',
          player: playerId,
          ability: abilityId,
          reason: 'condition_not_met',
          message: 'Ability condition not met'
        });

        return {
          success: false,
          reason: 'condition_not_met',
          message: 'Ability condition not met'
        };
      }
    }

    // Execute the effect
    const result = this._executeEffect(ability, playerId, params);

    if (result.success) {
      // Update usage tracking
      this._recordUsage(abilityId);

      this.gameState.turnLog.push({
        type: 'ability_activated',
        player: playerId,
        ability: abilityId,
        pokemon: ability._pokemonId,
        effect: ability.effect,
        ...result.details
      });
    }

    return result;
  }

  /**
   * Execute the effect of an activated ability
   * @param {Object} ability - Ability definition
   * @param {string} playerId - Player activating the ability
   * @param {Object} params - Effect-specific parameters
   * @returns {Object} Result with success boolean and details
   */
  _executeEffect(ability, playerId, params) {
    const effect = ability.effect;

    switch (effect.type) {
      case 'move_energy':
        return this._executeMoveEnergy(ability, playerId, params);

      case 'switch_pokemon':
        return this._executeSwitchPokemon(ability, playerId, params);

      default:
        return {
          success: false,
          reason: 'unknown_effect_type',
          message: `Unknown effect type: ${effect.type}`
        };
    }
  }

  /**
   * Execute move_energy effect
   * @param {Object} ability - Ability definition
   * @param {string} playerId - Player activating the ability
   * @param {Object} params - { fromPokemonId, toPokemonId }
   * @returns {Object} Result with success boolean and details
   */
  _executeMoveEnergy(ability, playerId, params) {
    const effect = ability.effect;
    const { fromPokemonId, toPokemonId } = params;

    // Resolve source Pokemon
    const fromPokemon = this._resolvePokemonTarget(playerId, effect.from, fromPokemonId);
    if (!fromPokemon) {
      return {
        success: false,
        reason: 'invalid_source',
        message: 'Invalid source Pokemon for energy movement'
      };
    }

    // Resolve destination Pokemon
    const toPokemon = this._resolvePokemonTarget(playerId, effect.to, toPokemonId);
    if (!toPokemon) {
      return {
        success: false,
        reason: 'invalid_destination',
        message: 'Invalid destination Pokemon for energy movement'
      };
    }

    // Check if source has energy
    if (!fromPokemon.energy || fromPokemon.energy.length === 0) {
      return {
        success: false,
        reason: 'no_energy',
        message: 'Source Pokemon has no energy to move'
      };
    }

    // Filter energy by type if specified
    let availableEnergy = fromPokemon.energy.slice(); // Create a copy
    if (effect.energyType) {
      availableEnergy = availableEnergy.filter(e => e.type === effect.energyType);
      if (availableEnergy.length === 0) {
        return {
          success: false,
          reason: 'no_energy_of_type',
          message: `No ${effect.energyType} energy available on source Pokemon`
        };
      }
    }

    // Determine how many energy to move
    const count = Math.min(effect.count || 1, availableEnergy.length);

    // Move energy
    const movedEnergy = [];
    for (let i = 0; i < count; i++) {
      const energy = availableEnergy[i];
      if (!energy) break;

      // Remove from source (find in original array by reference)
      const fromIndex = fromPokemon.energy.indexOf(energy);
      if (fromIndex > -1) {
        fromPokemon.energy.splice(fromIndex, 1);
        // Add to destination
        if (!toPokemon.energy) {
          toPokemon.energy = [];
        }
        toPokemon.energy.push(energy);
        movedEnergy.push(energy);
      }
    }

    return {
      success: true,
      details: {
        movedEnergy,
        fromPokemonId: fromPokemon.id,
        toPokemonId: toPokemon.id,
        count: movedEnergy.length
      }
    };
  }

  /**
   * Execute switch_pokemon effect
   * Switches the Pokemon with this ability (from bench) with the active Pokemon.
   * This is used for abilities like Solgaleo ex's Rising Road.
   * @param {Object} ability - Ability definition
   * @param {string} playerId - Player activating the ability
   * @param {Object} params - Not used for switch_pokemon
   * @returns {Object} Result with success boolean and details
   */
  _executeSwitchPokemon(ability, playerId, params) {
    const player = this.gameState.players[playerId];

    // The ability Pokemon should be on bench (condition should enforce this, but we check anyway)
    const abilityPokemon = this._getPokemonById(playerId, ability._pokemonId);
    if (!abilityPokemon) {
      return {
        success: false,
        reason: 'pokemon_not_found',
        message: 'Pokemon with ability not found'
      };
    }

    // Find the ability Pokemon in the bench
    const banque = player.banque || [];
    const benchIndex = banque.findIndex(p => p && p.id === abilityPokemon.id);
    if (benchIndex === -1) {
      return {
        success: false,
        reason: 'pokemon_not_on_bench',
        message: 'Pokemon must be on bench to use this ability'
      };
    }

    // Get the active Pokemon
    const activePokemon = player.activePokemon;
    if (!activePokemon) {
      return {
        success: false,
        reason: 'no_active_pokemon',
        message: 'No active Pokemon to switch with'
      };
    }

    // Track conditions that are removed (for logging)
    const conditionsRemoved = [];

    // Clean special conditions from the Pokemon moving to bench (baseline TCG behavior)
    if (this.statusConditionSystem) {
      const activeCondition = this.statusConditionSystem.getCondition(playerId, activePokemon.id);
      if (activeCondition) {
        this.statusConditionSystem.removeCondition(playerId, activePokemon.id);
        conditionsRemoved.push({ pokemonId: activePokemon.id, condition: activeCondition });
      }

      const benchCondition = this.statusConditionSystem.getCondition(playerId, abilityPokemon.id);
      if (benchCondition) {
        this.statusConditionSystem.removeCondition(playerId, abilityPokemon.id);
        conditionsRemoved.push({ pokemonId: abilityPokemon.id, condition: benchCondition });
      }
    } else if (activePokemon.specialCondition) {
      // Fallback if statusConditionSystem is not available
      conditionsRemoved.push({ pokemonId: activePokemon.id, condition: activePokemon.specialCondition });
      activePokemon.specialCondition = null;
      if (abilityPokemon.specialCondition) {
        conditionsRemoved.push({ pokemonId: abilityPokemon.id, condition: abilityPokemon.specialCondition });
        abilityPokemon.specialCondition = null;
      }
    }

    // Perform the switch
    player.activePokemon = abilityPokemon;
    player.banque[benchIndex] = activePokemon;

    return {
      success: true,
      details: {
        fromPokemonId: abilityPokemon.id,
        toPokemonId: activePokemon.id,
        conditionsRemoved
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Find an ability by ID
   * @param {string} abilityId
   * @returns {Object|null}
   */
  _findAbility(abilityId) {
    for (const abilities of this._abilities.values()) {
      for (const ability of abilities) {
        if (ability.id === abilityId) {
          return ability;
        }
      }
    }
    return null;
  }

  /**
   * Record usage of an ability
   * @param {string} abilityId
   */
  _recordUsage(abilityId) {
    const usageData = this._usage.get(abilityId);
    if (usageData) {
      usageData.count++;
      usageData.lastTurn = this.gameState.turnNumber;
    }

    const ability = this._findAbility(abilityId);
    if (ability && ability.usageLimit === 'once_per_turn') {
      this._usedThisTurn.add(abilityId);
    }
  }

  /**
   * Resolve a Pokemon target based on effect configuration
   * @param {string} playerId - Player who owns the Pokemon
   * @param {string|Object} target - 'active' | 'bench' | { pokemonId: string }
   * @param {string} explicitId - Explicit Pokemon ID (overrides target config)
   * @returns {Object|null} Pokemon object
   */
  _resolvePokemonTarget(playerId, target, explicitId) {
    // If explicit ID is provided, use it
    if (explicitId) {
      return this._getPokemonById(playerId, explicitId);
    }

    // Otherwise, resolve based on target config
    if (target === 'active') {
      return this.gameState.players[playerId].activePokemon;
    } else if (target === 'bench') {
      // Return first Pokemon on bench (for now)
      const banque = this.gameState.players[playerId].banque;
      return banque && banque.length > 0 ? banque[0] : null;
    } else if (typeof target === 'object' && target.pokemonId) {
      return this._getPokemonById(playerId, target.pokemonId);
    }

    return null;
  }

  /**
   * Get a Pokemon by ID from a player's active or bench
   * @param {string} playerId
   * @param {string} pokemonId
   * @returns {Object|null}
   */
  _getPokemonById(playerId, pokemonId) {
    const player = this.gameState.players[playerId];

    if (player.activePokemon && player.activePokemon.id === pokemonId) {
      return player.activePokemon;
    }

    if (player.banque) {
      for (const p of player.banque) {
        if (p && p.id === pokemonId) return p;
      }
    }

    return null;
  }
}

module.exports = ActivatedAbilitySystem;
