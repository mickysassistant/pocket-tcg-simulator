/**
 * Energy System - Manages energy attachment from Energy Zone
 *
 * This file implements the energy attachment logic including the first-turn restriction.
 *
 * RULE: Player going first (player1 on turn 0) CANNOT attach energy from Energy Zone on first turn.
 * This is a rule-locked behavior requirement.
 *
 * GAP-009: [Importante][C1] Auto-aplicación de Special Condition (Komala Comatose)
 * - Triggers on-Energy-attach abilities when energy is attached to a Pokémon
 * - Actually attaches energy to the Pokémon's energy array
 */

const GameState = require('./game-state');

class EnergySystem {
  constructor(gameState, abilitySystem = null, statusConditionSystem = null) {
    this.gameState = gameState;
    this.abilitySystem = abilitySystem;
    this.statusConditionSystem = statusConditionSystem;
  }

  /**
   * Check if energy attachment is allowed
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object} Result with allowed boolean and reason if blocked
   */
  canAttachEnergy(playerId) {
    const turnInfo = this.gameState.getCurrentTurnInfo();

    // FIRST-TURN ENERGY ATTACHMENT RESTRICTION:
    // The player going first (player1 on turn 0) CANNOT attach energy from Energy Zone.
    // This is the rule-locked behavior that must be preserved.
    // This restriction is independent of the opening-turn draw rule.

    if (turnInfo.isFirstTurn && playerId === 'player1') {
      return {
        allowed: false,
        reason: 'first_turn_restriction',
        message: 'Cannot attach energy on the first turn when going first'
      };
    }

    // Additional checks can be added here (e.g., once per turn limit, etc.)

    return {
      allowed: true,
      reason: null
    };
  }

  /**
   * Attach energy from Energy Zone to a Pokemon
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} targetPokemonId - ID of the Pokemon to attach energy to
   * @returns {Object} Result with success boolean and details
   */
  attachEnergy(playerId, targetPokemonId) {
    // Check if attachment is allowed
    const canAttach = this.canAttachEnergy(playerId);

    if (!canAttach.allowed) {
      this.gameState.turnLog.push({
        type: 'energy_attach_blocked',
        player: playerId,
        target: targetPokemonId,
        reason: canAttach.reason,
        message: canAttach.message
      });

      return {
        success: false,
        reason: canAttach.reason,
        message: canAttach.message
      };
    }

    const player = this.gameState.players[playerId];

    // Check if Energy Zone has energy
    if (player.energyZone.length === 0) {
      this.gameState.turnLog.push({
        type: 'energy_attach_failed',
        player: playerId,
        target: targetPokemonId,
        reason: 'no_energy_available',
        message: 'No energy available in Energy Zone'
      });

      return {
        success: false,
        reason: 'no_energy_available',
        message: 'No energy available in Energy Zone'
      };
    }

    // Find the target Pokemon first (before removing energy from zone)
    const targetPokemon = this._findPokemon(playerId, targetPokemonId);

    if (!targetPokemon) {
      this.gameState.turnLog.push({
        type: 'energy_attach_failed',
        player: playerId,
        target: targetPokemonId,
        reason: 'pokemon_not_found',
        message: `Pokemon ${targetPokemonId} not found`
      });

      return {
        success: false,
        reason: 'pokemon_not_found',
        message: `Pokemon ${targetPokemonId} not found`
      };
    }

    // Get the first energy from the Energy Zone (only after Pokemon is found)
    const energy = player.energyZone.shift();

    // Initialize energy array if needed
    if (!targetPokemon.energy) {
      targetPokemon.energy = [];
    }

    // Attach energy to the Pokemon
    targetPokemon.energy.push(energy);

    // Log the energy attachment
    this.gameState.turnLog.push({
      type: 'energy_attached',
      player: playerId,
      target: targetPokemonId,
      energy: energy
    });

    // Trigger on-Energy-attach abilities (GAP-009)
    const triggerResults = [];
    if (this.abilitySystem) {
      const abilities = this.abilitySystem.triggerOnEnergyAttach(playerId, targetPokemonId, energy);

      for (const ability of abilities) {
        // Apply special condition if specified
        if (ability.effect && ability.effect.applyCondition && this.statusConditionSystem) {
          const applyResult = this.statusConditionSystem.applyCondition(
            playerId,
            targetPokemonId,
            ability.effect.applyCondition
          );

          triggerResults.push({
            ...ability,
            conditionApplied: applyResult.applied,
            conditionApplyReason: applyResult.reason
          });

          // Log the condition application
          this.gameState.turnLog.push({
            type: 'on_energy_attach_condition_applied',
            player: playerId,
            pokemonId: targetPokemonId,
            abilityName: ability.abilityName,
            condition: ability.effect.applyCondition,
            applied: applyResult.applied,
            reason: applyResult.reason
          });
        }
      }
    }

    return {
      success: true,
      energy: energy,
      triggerResults
    };
  }

  /**
   * Get Energy Zone size for a player
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {number} Current Energy Zone size
   */
  getEnergyZoneSize(playerId) {
    return this.gameState.players[playerId].energyZone.length;
  }

  /**
   * Check if current turn is the opening turn for player going first
   * @returns {boolean}
   */
  isFirstTurnGoingFirst() {
    const turnInfo = this.gameState.getCurrentTurnInfo();
    return turnInfo.isFirstTurn;
  }

  /**
   * Find a Pokemon by ID (active or bench)
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokemon to find
   * @returns {Object|null} Pokemon object or null if not found
   */
  _findPokemon(playerId, pokemonId) {
    const player = this.gameState.players[playerId];
    if (!player) return null;

    // Check active Pokemon
    if (player.activePokemon && player.activePokemon.id === pokemonId) {
      return player.activePokemon;
    }

    // Check bench (banque)
    if (player.banque) {
      for (const p of player.banque) {
        if (p && p.id === pokemonId) {
          return p;
        }
      }
    }

    return null;
  }
}

module.exports = EnergySystem;
