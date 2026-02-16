/**
 * Energy System - Manages energy attachment from Energy Zone
 * 
 * This file implements the energy attachment logic including the first-turn restriction.
 * 
 * RULE: Player going first (player1 on turn 0) CANNOT attach energy from Energy Zone on first turn.
 * This is a rule-locked behavior requirement.
 */

const GameState = require('./game-state');

class EnergySystem {
  constructor(gameState) {
    this.gameState = gameState;
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

    // Get the first energy from the Energy Zone
    const energy = player.energyZone.shift();

    // Attach energy to the target Pokemon
    // Note: In a full implementation, we would locate the Pokemon in active/banque
    // and attach the energy to it. For now, we just log the action.
    
    this.gameState.turnLog.push({
      type: 'energy_attached',
      player: playerId,
      target: targetPokemonId,
      energy: energy
    });

    return {
      success: true,
      energy: energy
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
}

module.exports = EnergySystem;
