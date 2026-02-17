/**
 * Turn Manager - Manages turn flow and opening-turn draw rule
 * 
 * This file implements the turn-start logic including the opening-turn draw rule.
 * 
 * RULE: Player going first DOES draw on their first turn (turn 0, player1)
 * This is a rule-locked behavior requirement.
 */

const GameState = require('./game-state');
const WinCondition = require('./win-condition');

class TurnManager {
  constructor(gameState, turnLimit = 30, evolutionSystem = null, supporterSystem = null) {
    this.gameState = gameState;
    this.winCondition = new WinCondition(gameState, turnLimit);
    this.evolutionSystem = evolutionSystem;
    this.supporterSystem = supporterSystem;
  }

  /**
   * Process the start of a turn
   * This includes the opening-turn draw rule
   */
  processTurnStart() {
    const turnInfo = this.gameState.getCurrentTurnInfo();
    const playerId = turnInfo.currentPlayer;

    // OPENING-TURN DRAW RULE:
    // The player going first (player1 on turn 0) DOES draw a card.
    // This is the rule-locked behavior that must be implemented.
    // No special case to skip the draw for the opening turn.

    // Draw 1 card at start of turn (applies to all turns, including opening turn)
    this.gameState.drawCards(playerId, 1, true);

    this.gameState.turnLog.push({
      type: 'turn_start_processed',
      player: playerId,
      turn: turnInfo.turnNumber,
      message: `Turn ${turnInfo.turnNumber} started for ${playerId}. Drew 1 card.`
    });
  }

  /**
   * Start a new turn and process turn start actions
   * @param {string} playerId - Player whose turn is starting
   */
  startTurn(playerId) {
    // Reset evolution tracking at the start of each player's turn
    if (this.evolutionSystem) {
      this.evolutionSystem.resetTurnTracking();
    }

    // Reset evolvedThisTurn tracking at the start of each player's turn
    this.gameState.evolvedThisTurn.clear();

    // Reset supporter tracking at the start of each player's turn
    if (this.supporterSystem) {
      this.supporterSystem.resetTurnTracking();
    }

    // Reset energy attachment tracking at the start of each player's turn
    this.gameState.energyAttachedThisTurn = false;

    // Record turn start
    this.gameState.startTurn(playerId);

    // Process turn start (includes draw)
    this.processTurnStart();

    // Move to main phase
    this.gameState.phase = 'main';
  }

  /**
   * End the current turn
   * @returns {Object|null} Win condition result if game ends, null otherwise
   */
  endTurn() {
    // Move to checkup phase (Pokemon Checkup)
    this.gameState.phase = 'checkup';

    // Process Pokemon Checkup would happen here

    // End turn
    this.gameState.endTurn();

    // Check win condition after turn ends
    // Turn limit is checked AFTER turn completion per rule-locked behavior
    const winResult = this.winCondition.checkWinCondition();
    if (winResult) {
      this.gameState.turnLog.push({
        type: 'win_condition',
        result: winResult
      });
    }

    return winResult;
  }

  /**
   * Check if current turn is the opening turn (player1, turn 0)
   * @returns {boolean}
   */
  isOpeningTurn() {
    const turnInfo = this.gameState.getCurrentTurnInfo();
    return turnInfo.isFirstTurn;
  }
}

module.exports = TurnManager;
