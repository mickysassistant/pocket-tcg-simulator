/**
 * Pocket TCG Simulator - Main Entry Point
 *
 * This module exports the core game engine components for Pocket TCG Simulator.
 */

const GameState = require('./game/game-state');
const TurnManager = require('./game/turn-manager');
const DrawSystem = require('./game/draw-system');
const EnergySystem = require('./game/energy-system');
const EvolutionSystem = require('./game/evolution-system');
const SupporterSystem = require('./game/supporter-system');
const DeckManager = require('./game/deck-manager');
const WinCondition = require('./game/win-condition');
const { SeededRNG, CoinQueue } = require('./game/random');

/**
 * Create a new game instance
 * @param {Array} player1Deck - Player 1's deck
 * @param {Array} player2Deck - Player 2's deck
 * @param {number} turnLimit - Maximum number of turns (default: 30)
 * @param {string|number|null} seed - Seed for deterministic random generation (default: null)
 * @param {Array|null} coinQueue - Optional coin flip queue for determinism (default: null)
 * @returns {Object} Game instance with all components
 */
function createGame(player1Deck, player2Deck, turnLimit = 30, seed = null, coinQueue = null) {
  // Create seeded RNG if seed is provided
  const rng = seed !== null ? new SeededRNG(seed) : null;

  // Create coin queue manager
  const coinQueueManager = new CoinQueue(coinQueue, rng);

  const gameState = new GameState(rng);
  const evolutionSystem = new EvolutionSystem(gameState);
  const supporterSystem = new SupporterSystem(gameState);
  const turnManager = new TurnManager(gameState, turnLimit, evolutionSystem, supporterSystem);
  const drawSystem = new DrawSystem(gameState);
  const energySystem = new EnergySystem(gameState);
  const deckManager = new DeckManager(gameState, rng);

  // Initialize game with decks
  gameState.initialize(player1Deck, player2Deck);

  return {
    gameState,
    turnManager,
    drawSystem,
    energySystem,
    evolutionSystem,
    supporterSystem,
    deckManager,
    winCondition: turnManager.winCondition,
    rng,
    coinQueue: coinQueueManager
  };
}

module.exports = {
  GameState,
  TurnManager,
  DrawSystem,
  EnergySystem,
  EvolutionSystem,
  SupporterSystem,
  DeckManager,
  WinCondition,
  SeededRNG,
  CoinQueue,
  createGame
};
