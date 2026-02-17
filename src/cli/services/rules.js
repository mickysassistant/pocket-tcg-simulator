/**
 * Rules Service - Check if an action is valid in game context
 *
 * This service provides:
 * - Business logic validation for actions
 * - Context-aware rule checking (requires game state)
 * - Explanations for why actions are invalid
 */

const actions = require('./actions');

/**
 * Check if an action is valid in the context of a game state
 * @param {Object} gameState - Current game state
 * @param {string} actionId - Action ID to check
 * @param {Object} payload - Action payload
 * @returns {Object} { valid: boolean, reason?: string, message?: string }
 */
function checkAction(gameState, actionId, payload) {
  // First, validate the payload structure
  const schemaValidation = actions.validatePayload(actionId, payload);
  if (!schemaValidation.valid) {
    return {
      valid: false,
      reason: schemaValidation.reason,
      message: schemaValidation.errors.join('; ')
    };
  }

  // Get the action definition
  const action = actions.getAction(actionId);
  if (!action) {
    return {
      valid: false,
      reason: 'UNKNOWN_ACTION',
      message: `Unknown action: ${actionId}`
    };
  }

  // Business logic validation
  const errors = validateActionRules(gameState, actionId, payload);

  if (errors.length > 0) {
    return {
      valid: false,
      reason: 'RULE_VIOLATION',
      message: errors.join('; ')
    };
  }

  return { valid: true };
}

/**
 * Validate action business rules against game state
 * @private
 */
function validateActionRules(gameState, actionId, payload) {
  const errors = [];

  switch (actionId) {
    case 'draw': {
      errors.push(...validateDrawAction(gameState, payload));
      break;
    }
    case 'attach_energy': {
      errors.push(...validateAttachEnergyAction(gameState, payload));
      break;
    }
    case 'evolve': {
      errors.push(...validateEvolveAction(gameState, payload));
      break;
    }
    case 'play_supporter': {
      errors.push(...validatePlaySupporterAction(gameState, payload));
      break;
    }
    case 'end_turn': {
      errors.push(...validateEndTurnAction(gameState, payload));
      break;
    }
    case 'start_turn': {
      errors.push(...validateStartTurnAction(gameState, payload));
      break;
    }
    default: {
      errors.push(`Action ${actionId} has no rule checks defined`);
    }
  }

  return errors;
}

/**
 * Validate draw action
 * @private
 */
function validateDrawAction(gameState, payload) {
  const errors = [];
  const { playerId, count, respectHandLimit = true } = payload;

  // Check if player exists
  if (!gameState.players[playerId]) {
    errors.push(`Player ${playerId} does not exist`);
    return errors;
  }

  const player = gameState.players[playerId];

  // Check if deck has enough cards
  const deckSize = player.deck.length;
  if (deckSize < count) {
    errors.push(`Cannot draw ${count} cards: deck has only ${deckSize} cards`);
  }

  // Check hand limit (default 10 cards)
  if (respectHandLimit) {
    const handSize = player.hand.length;
    const handLimit = 10;
    const projectedHandSize = handSize + count;
    if (projectedHandSize > handLimit) {
      errors.push(`Hand limit exceeded: drawing ${count} cards would result in ${projectedHandSize} cards (limit is ${handLimit})`);
    }
  }

  return errors;
}

/**
 * Validate attach_energy action
 * @private
 */
function validateAttachEnergyAction(gameState, payload) {
  const errors = [];
  const { playerId, targetPokemonId } = payload;

  // Check if player exists
  if (!gameState.players[playerId]) {
    errors.push(`Player ${playerId} does not exist`);
    return errors;
  }

  const player = gameState.players[playerId];

  // Check if energy zone has any energy
  if (!player.energyZone || player.energyZone.length === 0) {
    errors.push(`Player ${playerId} has no energy in Energy Zone to attach`);
  }

  // Check if target Pokemon exists
  const targetPokemon = player.bench.find(p => p.id === targetPokemonId) ||
                        (player.activePokemon && player.activePokemon.id === targetPokemonId ? player.activePokemon : null);

  if (!targetPokemon) {
    errors.push(`Target Pokemon with ID ${targetPokemonId} not found in player ${playerId}'s field`);
  }

  // Check if Pokemon can receive more energy (max 3)
  if (targetPokemon && targetPokemon.attachedEnergy !== undefined) {
    const currentEnergy = targetPokemon.attachedEnergy || 0;
    const maxEnergy = 3;
    if (currentEnergy >= maxEnergy) {
      errors.push(`Pokemon ${targetPokemonId} already has maximum energy (${maxEnergy})`);
    }
  }

  return errors;
}

/**
 * Validate evolve action
 * @private
 */
function validateEvolveAction(gameState, payload) {
  const errors = [];
  const { playerId, pokemonId, evolutionCard } = payload;

  // Check if player exists
  if (!gameState.players[playerId]) {
    errors.push(`Player ${playerId} does not exist`);
    return errors;
  }

  const player = gameState.players[playerId];

  // Check if target Pokemon exists
  const targetPokemon = player.bench.find(p => p.id === pokemonId) ||
                        (player.activePokemon && player.activePokemon.id === pokemonId ? player.activePokemon : null);

  if (!targetPokemon) {
    errors.push(`Target Pokemon with ID ${pokemonId} not found in player ${playerId}'s field`);
    return errors;
  }

  // Check if evolution card is in hand
  const evolutionInHand = player.hand.find(card => card.id === evolutionCard.id);
  if (!evolutionInHand) {
    errors.push(`Evolution card ${evolutionCard.id} (${evolutionCard.name}) is not in player ${playerId}'s hand`);
  }

  // Check if evolution is valid (stage progression)
  const currentStage = targetPokemon.stage || 'basic';
  const targetStage = evolutionCard.stage;

  if (currentStage === 'basic' && targetStage !== 'stage1') {
    errors.push(`Cannot evolve from ${currentStage} to ${targetStage}: must evolve to stage1 first`);
  } else if (currentStage === 'stage1' && targetStage !== 'stage2') {
    errors.push(`Cannot evolve from ${currentStage} to ${targetStage}: must evolve to stage2`);
  } else if (currentStage === 'stage2') {
    errors.push(`Pokemon is already at stage2 and cannot evolve further`);
  } else if (currentStage === 'stage2' || currentStage === 'ex' || currentStage === 'stage1ex') {
    errors.push(`Pokemon cannot evolve from stage ${currentStage}`);
  }

  // Check if Pokemon was played this turn (can't evolve same turn played)
  if (targetPokemon.turnPlayed === gameState.turnNumber) {
    errors.push(`Pokemon ${pokemonId} was played this turn (turn ${gameState.turnNumber}) and cannot evolve yet`);
  }

  return errors;
}

/**
 * Validate play_supporter action
 * @private
 */
function validatePlaySupporterAction(gameState, payload) {
  const errors = [];
  const { playerId, card } = payload;

  // Check if player exists
  if (!gameState.players[playerId]) {
    errors.push(`Player ${playerId} does not exist`);
    return errors;
  }

  const player = gameState.players[playerId];

  // Check if supporter card is in hand
  const supporterInHand = player.hand.find(c => c.id === card.id);
  if (!supporterInHand) {
    errors.push(`Supporter card ${card.id} (${card.name}) is not in player ${playerId}'s hand`);
  }

  // Check if player already played a supporter this turn
  if (player.supporterPlayedThisTurn === true) {
    errors.push(`Player ${playerId} already played a Supporter this turn`);
  }

  return errors;
}

/**
 * Validate end_turn action
 * @private
 */
function validateEndTurnAction(gameState, payload) {
  const errors = [];
  const { playerId } = payload;

  // Check if player exists
  if (!gameState.players[playerId]) {
    errors.push(`Player ${playerId} does not exist`);
    return errors;
  }

  // Check if it's the player's turn
  const currentTurnPlayer = gameState.currentPlayer;
  if (currentTurnPlayer !== playerId) {
    errors.push(`It is not ${playerId}'s turn: it is ${currentTurnPlayer}'s turn`);
  }

  return errors;
}

/**
 * Validate start_turn action
 * @private
 */
function validateStartTurnAction(gameState, payload) {
  const errors = [];
  const { playerId } = payload;

  // Check if player exists
  if (!gameState.players[playerId]) {
    errors.push(`Player ${playerId} does not exist`);
    return errors;
  }

  // Check if it's NOT the player's turn (starting turn for next player)
  const currentTurnPlayer = gameState.currentPlayer;
  if (currentTurnPlayer === playerId) {
    errors.push(`It is already ${playerId}'s turn: cannot start turn`);
  }

  return errors;
}

module.exports = {
  checkAction
};
