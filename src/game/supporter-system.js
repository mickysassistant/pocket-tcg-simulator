/**
 * Supporter System - Manages Supporter card usage
 * 
 * This file implements Supporter card validation and execution.
 * 
 * RULE: Supporters CAN be used on the first turn (player1's turn 0)
 * This is different from some Items (e.g., Rare Candy) which have first-turn restrictions.
 * 
 * Key behaviors:
 * - Player1 on turn 0 CAN play one valid Supporter if no other blocker applies
 * - Once-per-turn limit applies (only one Supporter per turn)
 * - External blockers (opponent passive lock) are preserved
 */

const GameState = require('./game-state');

class SupporterSystem {
  constructor(gameState) {
    this.gameState = gameState;
    // Track Supporter usage per turn
    this.supporterPlayedThisTurn = false;
    // Track external blockers (opponent passive abilities, etc.)
    this.externalBlockers = new Map();
  }

  /**
   * Check if playing a Supporter is allowed
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} supporterCard - The Supporter card to play
   * @returns {Object} Result with allowed boolean and reason if blocked
   */
  canPlaySupporter(playerId, supporterCard) {
    // Check once-per-turn limit
    if (this.supporterPlayedThisTurn) {
      return {
        allowed: false,
        reason: 'already_played',
        message: 'Already played a Supporter this turn'
      };
    }

    // Check external blockers (opponent passive lock, etc.)
    for (const [blockerName, blockerFn] of this.externalBlockers.entries()) {
      const blockerResult = blockerFn(playerId, supporterCard);
      if (!blockerResult.allowed) {
        return {
          allowed: false,
          reason: `external_blocker:${blockerName}`,
          message: blockerResult.message || `Blocked by ${blockerName}`
        };
      }
    }

    // FIRST-TURN SUPPORTER ALLOWANCE:
    // Supporters CAN be used on the first turn (player1's turn 0)
    // This is different from Items like Rare Candy which have first-turn restrictions.
    // No first-turn blocker for Supporters.
    
    // Additional validation can be added here (e.g., card-specific requirements)

    return {
      allowed: true,
      reason: null
    };
  }

  /**
   * Play a Supporter card
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} supporterCard - The Supporter card to play
   * @returns {Object} Result with success boolean and details
   */
  playSupporter(playerId, supporterCard) {
    // Check if playing is allowed
    const canPlay = this.canPlaySupporter(playerId, supporterCard);

    if (!canPlay.allowed) {
      this.gameState.turnLog.push({
        type: 'supporter_play_blocked',
        player: playerId,
        card: supporterCard.id || supporterCard.name,
        reason: canPlay.reason,
        message: canPlay.message
      });

      return {
        success: false,
        reason: canPlay.reason,
        message: canPlay.message
      };
    }

    // Mark Supporter as played this turn
    this.supporterPlayedThisTurn = true;

    // Log the successful play
    this.gameState.turnLog.push({
      type: 'supporter_played',
      player: playerId,
      card: supporterCard.id || supporterCard.name,
      turn: this.gameState.turnNumber
    });

    // Note: The actual effect of the Supporter would be executed here
    // For now, we just log that it was played successfully
    
    return {
      success: true,
      card: supporterCard
    };
  }

  /**
   * Add an external blocker function
   * @param {string} blockerName - Name of the blocker
   * @param {Function} blockerFn - Function that takes (playerId, supporterCard) and returns {allowed, message?}
   */
  addExternalBlocker(blockerName, blockerFn) {
    this.externalBlockers.set(blockerName, blockerFn);
  }

  /**
   * Remove an external blocker
   * @param {string} blockerName - Name of the blocker to remove
   */
  removeExternalBlocker(blockerName) {
    this.externalBlockers.delete(blockerName);
  }

  /**
   * Reset turn-specific tracking at the start of each turn
   * This is called by TurnManager.startTurn()
   */
  resetTurnTracking() {
    this.supporterPlayedThisTurn = false;
  }

  /**
   * Check if a Supporter has been played this turn
   * @returns {boolean}
   */
  hasSupporterBeenPlayedThisTurn() {
    return this.supporterPlayedThisTurn;
  }

  /**
   * Get current turn info for validation
   * @returns {Object} Current turn information
   */
  getCurrentTurnInfo() {
    return this.gameState.getCurrentTurnInfo();
  }
}

module.exports = SupporterSystem;
