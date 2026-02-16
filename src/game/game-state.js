/**
 * Game State - Core game state management for Pocket TCG Simulator
 * 
 * Manages the overall game state including players, decks, hands, banque, and turn tracking.
 */

class GameState {
  constructor() {
    // Player states
    this.players = {
      player1: {
        deck: [],
        hand: [],
        banque: [],
        activePokemon: null,
        energyZone: []
      },
      player2: {
        deck: [],
        hand: [],
        banque: [],
        activePokemon: null,
        energyZone: []
      }
    };

    // Turn tracking
    this.currentPlayer = 'player1'; // player1 goes first
    this.turnNumber = 0; // 0-indexed turn (turn 0 = first player's first turn)
    this.phase = 'setup'; // setup, draw, main, attack, checkup, end
    this.turnLog = []; // Log of turn events
  }

  /**
   * Initialize game state with initial hands
   * @param {Array} player1Deck - Array of cards for player 1's deck
   * @param {Array} player2Deck - Array of cards for player 2's deck
   */
  initialize(player1Deck, player2Deck) {
    this.players.player1.deck = [...player1Deck];
    this.players.player2.deck = [...player2Deck];

    // Draw initial 5 cards for each player
    this.drawCards('player1', 5, false);
    this.drawCards('player2', 5, false);

    this.phase = 'setup';
  }

  /**
   * Draw cards from deck to hand
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number} count - Number of cards to draw
   * @param {boolean} respectHandLimit - Whether to enforce 10-card hand limit
   * @returns {number} Number of cards actually drawn
   */
  drawCards(playerId, count, respectHandLimit = true) {
    const player = this.players[playerId];
    let drawn = 0;

    for (let i = 0; i < count; i++) {
      // Check hand limit if enabled
      if (respectHandLimit && player.hand.length >= 10) {
        this.turnLog.push({
          type: 'draw_blocked',
          player: playerId,
          reason: 'hand_limit'
        });
        break;
      }

      // Check if deck has cards
      if (player.deck.length === 0) {
        this.turnLog.push({
          type: 'draw_failed',
          player: playerId,
          reason: 'deck_empty'
        });
        break;
      }

      // Draw card
      const card = player.deck.pop();
      player.hand.push(card);
      drawn++;
    }

    if (drawn > 0) {
      this.turnLog.push({
        type: 'draw',
        player: playerId,
        count: drawn
      });
    }

    return drawn;
  }

  /**
   * Start a new turn
   * @param {string} playerId - Player whose turn is starting
   */
  startTurn(playerId) {
    this.currentPlayer = playerId;
    this.phase = 'draw';
    this.turnLog = [];

    this.turnLog.push({
      type: 'turn_start',
      player: playerId,
      turn: this.turnNumber
    });
  }

  /**
   * End current turn
   */
  endTurn() {
    this.turnLog.push({
      type: 'turn_end',
      player: this.currentPlayer
    });

    // Switch players
    this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
    
    // Increment turn number after every turn (total turn counter)
    this.turnNumber++;

    this.phase = 'draw';
  }

  /**
   * Get current turn info
   * @returns {Object} Current turn information
   */
  getCurrentTurnInfo() {
    return {
      currentPlayer: this.currentPlayer,
      turnNumber: this.turnNumber,
      phase: this.phase,
      isFirstTurn: this.turnNumber === 0
    };
  }
}

module.exports = GameState;
