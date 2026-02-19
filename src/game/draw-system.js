/**
 * Draw System - Manages card drawing from deck
 * 
 * This file implements the drawing logic including hand limits and deck-out behavior.
 * 
 * RULES:
 * - Hand limit: 10 cards maximum
 * - Deck out: No automatic loss when drawing from empty deck
 * - Opening turn: First player DOES draw (handled by turn-manager)
 */

const GameState = require('./game-state');

class DrawSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Draw cards for a player
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number} count - Number of cards to draw
   * @param {boolean} respectHandLimit - Whether to enforce 10-card hand limit (default: true)
   * @returns {Object} Result with drawn count and details
   */
  drawCards(playerId, count, respectHandLimit = true) {
    const result = {
      requested: count,
      drawn: 0,
      blocked: 0,
      failed: 0,
      handLimitReached: false,
      deckEmpty: false
    };

    const player = this.gameState.players[playerId];

    for (let i = 0; i < count; i++) {
      // Check hand limit if enabled
      if (respectHandLimit && player.hand.length >= 10) {
        result.handLimitReached = true;
        result.blocked++;
        
        this.gameState.turnLog.push({
          type: 'draw_blocked',
          player: playerId,
          reason: 'hand_limit',
          handSize: player.hand.length
        });
        break;
      }

      // Check if deck has cards
      if (player.deck.length === 0) {
        result.deckEmpty = true;
        result.failed++;
        
        this.gameState.turnLog.push({
          type: 'draw_failed',
          player: playerId,
          reason: 'deck_empty',
          message: 'Cannot draw from empty deck (no automatic loss)'
        });
        break;
      }

      // Draw card
      const card = player.deck.pop();
      player.hand.push(card);
      result.drawn++;
    }

    if (result.drawn > 0) {
      this.gameState.turnLog.push({
        type: 'draw',
        player: playerId,
        count: result.drawn
      });
    }

    return result;
  }

  /**
   * Check if a player can draw cards
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number} count - Number of cards to check
   * @param {boolean} respectHandLimit - Whether to check hand limit (default: true)
   * @returns {boolean} True if draw is possible
   */
  canDraw(playerId, count, respectHandLimit = true) {
    const player = this.gameState.players[playerId];

    // Check hand limit
    if (respectHandLimit && player.hand.length + count > 10) {
      return false;
    }

    // Check deck has enough cards
    if (player.deck.length < count) {
      return false;
    }

    return true;
  }

  /**
   * Get hand size for a player
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {number} Current hand size
   */
  getHandSize(playerId) {
    return this.gameState.players[playerId].hand.length;
  }

  /**
   * Get deck size for a player
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {number} Current deck size
   */
  getDeckSize(playerId) {
    return this.gameState.players[playerId].deck.length;
  }
}

module.exports = DrawSystem;
