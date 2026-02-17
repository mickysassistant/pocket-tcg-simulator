/**
 * Deck Manager - Centralizes deck-related operations and empty-deck handling
 * 
 * This file ensures consistent behavior for deck operations, especially empty-deck scenarios.
 * 
 * RULES:
 * - No automatic loss (deck out) when drawing from empty deck
 * - Empty deck: Draw is skipped, game continues, log captures the no-draw outcome
 * - Deck operations are consistent across all game systems
 */

class DeckManager {
  constructor(gameState, rng = null) {
    this.gameState = gameState;
    this.rng = rng;
  }

  /**
   * Get deck size for a player
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {number} Current deck size
   */
  getDeckSize(playerId) {
    return this.gameState.players[playerId].deck.length;
  }

  /**
   * Check if a player's deck is empty
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {boolean} True if deck is empty
   */
  isDeckEmpty(playerId) {
    return this.gameState.players[playerId].deck.length === 0;
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
   * Draw the top card from a player's deck
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object|null} The drawn card, or null if deck is empty
   */
  drawTopCard(playerId) {
    const player = this.gameState.players[playerId];
    
    if (player.deck.length === 0) {
      return null;
    }

    return player.deck.pop();
  }

  /**
   * Check if empty deck should cause automatic loss
   * 
   * RULE: Empty deck does NOT cause automatic loss in Pocket TCG
   * This is a key difference from traditional TCGs
   * 
   * @returns {boolean} Always false (no deck-out loss in Pocket TCG)
   */
  shouldDeckOutCauseLoss() {
    return false;
  }

  /**
   * Get reason why a draw cannot be completed
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number} count - Number of cards to draw
   * @param {boolean} respectHandLimit - Whether to check hand limit (default: true)
   * @returns {string|null} Reason code, or null if draw is possible
   */
  getDrawBlockReason(playerId, count, respectHandLimit = true) {
    const player = this.gameState.players[playerId];

    // Check hand limit first
    if (respectHandLimit && player.hand.length >= 10) {
      return 'hand_limit';
    }

    // Check deck is empty
    if (player.deck.length === 0) {
      return 'deck_empty';
    }

    // Check deck has enough cards for multiple draws
    if (player.deck.length < count) {
      return 'deck_empty';
    }

    return null;
  }

  /**
   * Shuffle a player's deck
   * @param {string} playerId - 'player1' or 'player2'
   */
  shuffleDeck(playerId) {
    const player = this.gameState.players[playerId];
    
    // Fisher-Yates shuffle with deterministic RNG
    for (let i = player.deck.length - 1; i > 0; i--) {
      let j;
      if (this.rng) {
        j = this.rng.randomInt(0, i);
      } else {
        j = Math.floor(Math.random() * (i + 1));
      }
      [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
    }
  }

  /**
   * Add cards to the bottom of a player's deck
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Array} cards - Cards to add
   */
  addCardsToBottom(playerId, cards) {
    const player = this.gameState.players[playerId];
    player.deck.unshift(...cards);
  }

  /**
   * Get information about a player's deck state
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object} Deck information
   */
  getDeckInfo(playerId) {
    const player = this.gameState.players[playerId];
    return {
      size: player.deck.length,
      isEmpty: player.deck.length === 0,
      canDrawAny: player.deck.length > 0,
      blockReason: player.deck.length === 0 ? 'deck_empty' : null
    };
  }
}

module.exports = DeckManager;
