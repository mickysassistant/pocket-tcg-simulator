/**
 * Win Condition System - Manages win condition checks including turn-limit resolution
 * 
 * This file implements win condition logic including turn-limit resolution.
 * 
 * RULE-LOCKED BEHAVIOR (from /home/deckie/.openclaw/workspace/pocket-tcg-pocket-research/docs/rules/limite-de-turnos.md):
 * - PvP battles have a maximum of 30 turns
 * - Solo battles have a maximum of 50 turns
 * - When the turn limit is reached, the game ends in a DRAW (tie)
 * - Turn 30 IS played (check happens after turn completion)
 * - The turn counter is of total turns (0-indexed: turn 0 = turn 1)
 */

class WinCondition {
  constructor(gameState, turnLimit = 30) {
    this.gameState = gameState;
    this.turnLimit = turnLimit;
  }

  /**
   * Set the turn limit for this game
   * @param {number} limit - Maximum number of turns (30 for PvP, 50 for solo)
   */
  setTurnLimit(limit) {
    this.turnLimit = limit;
  }

  /**
   * Get the current turn limit
   * @returns {number}
   */
  getTurnLimit() {
    return this.turnLimit;
  }

  /**
   * Check if the turn limit has been reached
   * 
   * RULE: Turn limit is checked AFTER turn completion.
   * - Turn counter counts total turns (each player action is one turn)
   * - Turn 30 IS played, meaning check happens after turn 30 completes
   * - When turn limit is reached, game ends in DRAW (no winner)
   * 
   * @returns {Object|null} Win condition result or null if game continues
   *   - { winner: null, reason: 'turn_limit_draw' } if turn limit reached
   *   - null if game continues
   */
  checkWinCondition() {
    const turnInfo = this.gameState.getCurrentTurnInfo();
    const currentTurnNumber = turnInfo.turnNumber;

    // Check if we've reached or exceeded the turn limit
    // After turn 30 completes, turnNumber = 30, which is >= limit (30)
    // Game ends in draw at turn 30
    if (currentTurnNumber >= this.turnLimit) {
      return {
        winner: null,
        reason: 'turn_limit_draw',
        message: `Game ended in draw after ${this.turnLimit} turns`
      };
    }

    // No win condition yet, game continues
    return null;
  }

  /**
   * Check if the turn limit has been reached at a specific turn number
   * This is a utility method for testing
   * @param {number} turnNumber - Turn number to check (0-indexed)
   * @returns {boolean} True if turn limit reached
   */
  isTurnLimitReached(turnNumber) {
    return turnNumber >= this.turnLimit;
  }
}

module.exports = WinCondition;
