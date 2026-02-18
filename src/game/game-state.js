/**
 * Game State - Core game state management for Pocket TCG Simulator
 * 
 * Manages the overall game state including players, decks, hands, banque, and turn tracking.
 */

class GameState {
  constructor(rng = null) {
    // Random number generator for determinism
    this.rng = rng;

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
    this.energyAttachedThisTurn = false; // Track if energy was attached this turn
    this.evolvedThisTurn = new Set(); // Track Pokemon IDs that have evolved this turn
    this.retreatedThisTurn = false; // Track if Pokemon has retreated this turn
  }

  /**
   * Initialize game state with initial hands
   * @param {Array} player1Deck - Array of cards for player 1's deck
   * @param {Array} player2Deck - Array of cards for player 2's deck
   */
  initialize(player1Deck, player2Deck) {
    this.players.player1.deck = [...player1Deck];
    this.players.player2.deck = [...player2Deck];

    // Shuffle decks using RNG if available, otherwise Math.random
    this._shuffleDeck(this.players.player1.deck);
    this._shuffleDeck(this.players.player2.deck);

    // Draw initial 5 cards for each player
    this.drawCards('player1', 5, false);
    this.drawCards('player2', 5, false);

    this.phase = 'setup';
  }

  /**
   * Shuffle a deck (Fisher-Yates)
   * @param {Array} deck - Deck to shuffle
   * @private
   */
  _shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = this.rng 
        ? this.rng.randomInt(0, i)
        : Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
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

  /**
   * Create GameState instance from JSON data
   * @param {Object} data - Serialized game state data
   * @param {Object} rng - Optional RNG instance for determinism
   * @returns {GameState} Restored game state
   */
  static fromJSON(data, rng = null) {
    const gameState = new GameState(rng);

    // Restore turn tracking
    if (data.currentPlayer) gameState.currentPlayer = data.currentPlayer;
    if (data.turnNumber !== undefined) gameState.turnNumber = data.turnNumber;
    if (data.phase) gameState.phase = data.phase;
    if (data.energyAttachedThisTurn !== undefined) gameState.energyAttachedThisTurn = data.energyAttachedThisTurn;
    if (data.evolvedThisTurn) {
      // Restore evolvedThisTurn as a Set
      gameState.evolvedThisTurn = new Set(data.evolvedThisTurn);
    }
    if (data.retreatedThisTurn !== undefined) gameState.retreatedThisTurn = data.retreatedThisTurn;

    // Restore player states
    if (data.players) {
      for (const [playerId, playerData] of Object.entries(data.players)) {
        if (gameState.players[playerId]) {
          if (playerData.deck) gameState.players[playerId].deck = [...playerData.deck];
          if (playerData.hand) gameState.players[playerId].hand = [...playerData.hand];
          if (playerData.banque) gameState.players[playerId].banque = [...playerData.banque];
          if (playerData.activePokemon) gameState.players[playerId].activePokemon = playerData.activePokemon;
          if (playerData.energyZone) gameState.players[playerId].energyZone = [...playerData.energyZone];
        }
      }
    }

    return gameState;
  }
}

module.exports = GameState;
