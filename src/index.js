/**
 * Pocket TCG Simulator - Main Entry Point
 * 
 * This module exports the core game engine components for Pocket TCG Simulator.
 */

const GameState = require('./game/game-state');
const TurnManager = require('./game/turn-manager');
const DrawSystem = require('./game/draw-system');
const EnergySystem = require('./game/energy-system');
const DeckManager = require('./game/deck-manager');

/**
 * Create a new game instance
 * @returns {Object} Game instance with all components
 */
function createGame(player1Deck, player2Deck) {
  const gameState = new GameState();
  const turnManager = new TurnManager(gameState);
  const drawSystem = new DrawSystem(gameState);
  const energySystem = new EnergySystem(gameState);
  const deckManager = new DeckManager(gameState);

  // Initialize game with decks
  gameState.initialize(player1Deck, player2Deck);

  return {
    gameState,
    turnManager,
    drawSystem,
    energySystem,
    deckManager
  };
}

module.exports = {
  GameState,
  TurnManager,
  DrawSystem,
  EnergySystem,
  DeckManager,
  createGame
};
