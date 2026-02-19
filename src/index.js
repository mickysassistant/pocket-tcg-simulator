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
const AbilitySystem = require('./game/ability-system');
const AttackSystem = require('./game/attack-system');
const { StatusConditionSystem, SPECIAL_CONDITIONS } = require('./game/status-condition-system');
const ActivatedAbilitySystem = require('./game/activated-ability-system');
const KoTriggerSystem = require('./game/ko-trigger-system');
const { TemporaryEffectsSystem, TEMPORARY_EFFECT_TYPES } = require('./game/temporary-effects-system');

/**
 * Create a new game instance
 * @returns {Object} Game instance with all components
 */
function createGame(player1Deck, player2Deck, turnLimit = 30) {
  const gameState = new GameState();
  const evolutionSystem = new EvolutionSystem(gameState);
  const supporterSystem = new SupporterSystem(gameState);
  const turnManager = new TurnManager(gameState, turnLimit, evolutionSystem, supporterSystem);
  const drawSystem = new DrawSystem(gameState);
  const abilitySystem = new AbilitySystem(gameState);
  const koTriggerSystem = new KoTriggerSystem(gameState);
  const statusConditionSystem = new StatusConditionSystem(gameState, abilitySystem);
  const temporaryEffectsSystem = new TemporaryEffectsSystem(gameState);
  const energySystem = new EnergySystem(gameState, abilitySystem, statusConditionSystem);
  const attackSystem = new AttackSystem(gameState, abilitySystem, koTriggerSystem, temporaryEffectsSystem);
  const activatedAbilitySystem = new ActivatedAbilitySystem(gameState, abilitySystem, statusConditionSystem);
  const deckManager = new DeckManager(gameState);

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
    abilitySystem,
    koTriggerSystem,
    attackSystem,
    statusConditionSystem,
    activatedAbilitySystem,
    temporaryEffectsSystem,
    winCondition: turnManager.winCondition
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
  AbilitySystem,
  AttackSystem,
  StatusConditionSystem,
  SPECIAL_CONDITIONS,
  ActivatedAbilitySystem,
  KoTriggerSystem,
  TemporaryEffectsSystem,
  TEMPORARY_EFFECT_TYPES,
  createGame
};
