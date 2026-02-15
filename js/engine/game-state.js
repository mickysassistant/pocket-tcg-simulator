/**
 * Game State Module - Pokemon TCG Pocket Simulator
 *
 * This module provides functions to create and manage the game state.
 * All state transformations return new state objects (immutable by default).
 */

import {
  MAX_BENCH,
  MAX_HAND,
  DECK_SIZE,
  MAX_COPIES_PER_CARD,
  DEFAULT_COIN_QUEUE_SIZE,
  STATE_VERSION,
  ENERGY_TYPES,
  STATUS,
  STATUS_CHECKUP_ORDER,
  STATUS_DAMAGE,
  KO_POINTS,
  POINTS_TO_WIN,
  TURN_LIMIT
} from './constants.js';

/**
 * Creates an initial game state for a fresh game.
 * @returns {Object} Initial game state
 */
export function createInitialState() {
  return {
    version: STATE_VERSION,
    name: 'New Game',
    description: 'Fresh game setup',
    turn: 0,
    currentPlayer: 'player1',
    coinQueue: generateCoins(DEFAULT_COIN_QUEUE_SIZE),
    player1: createPlayer('Player 1'),
    player2: createPlayer('Player 2'),
    stadium: null,
    turnEffects: [],
    log: []
  };
}

/**
 * Creates a player object with empty game state.
 * @param {string} name - Player name
 * @returns {Object} Player state object
 */
export function createPlayer(name = 'Player') {
  return {
    points: 0,
    active: null,
    bench: [],
    hand: [],
    deck: [],
    discard: [],
    energyZone: {
      currentEnergy: null,
      nextEnergy: null,
      configuredTypes: [],
      usedThisTurn: false
    },
    supporterUsedThisTurn: false,
    retreatedThisTurn: false,
    normalAttachUsedThisTurn: false,
    attackedThisTurn: false
  };
}

/**
 * Creates a Pokemon instance state.
 * @param {string} cardId - The card ID from the card database
 * @param {number} turnPlayed - The turn when this Pokemon was played (default: current turn)
 * @returns {Object} Pokemon state object
 */
export function createPokemon(cardId, turnPlayed = 0) {
  // Import getCard from card-loader to get card data
  // Note: This is a circular dependency - the card data is loaded separately
  // We'll use the cardId and let the UI fetch card details as needed
  return {
    cardId,
    currentHp: 0, // Will be set by caller using card.hp from getCard()
    energy: [],
    status: null,
    turnPlayed,
    lastEvolved: null,
    tool: null,
    effects: [],
    abilitiesUsedThisTurn: {} // Map of ability names to turn used (for "once per turn" abilities)
  };
}

/**
 * Generates a queue of random coin flips.
 * @param {number} count - Number of coins to generate
 * @returns {boolean[]} Array where true = heads, false = tails
 */
function generateCoins(count) {
  return Array.from({ length: count }, () => Math.random() < 0.5);
}

/**
 * Creates a deep clone of the game state.
 * Use this before modifying state to ensure immutability.
 * @param {Object} state - State to clone
 * @returns {Object} Cloned state
 */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Validates the game state structure and constraints.
 * Checks that all required fields exist and values are within valid ranges.
 * @param {Object} state - State to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateState(state) {
  const errors = [];

  // Check version
  if (state.version !== STATE_VERSION) {
    errors.push(`Invalid state version: ${state.version} (expected ${STATE_VERSION})`);
  }

  // Check turn number
  if (typeof state.turn !== 'number' || state.turn < 0) {
    errors.push('Invalid turn number');
  }

  // Check current player
  if (!['player1', 'player2'].includes(state.currentPlayer)) {
    errors.push(`Invalid currentPlayer: ${state.currentPlayer}`);
  }

  // Check coin queue
  if (!Array.isArray(state.coinQueue)) {
    errors.push('coinQueue must be an array');
  } else {
    const invalidCoins = state.coinQueue.some(c => typeof c !== 'boolean');
    if (invalidCoins) {
      errors.push('coinQueue contains invalid values (must be boolean)');
    }
  }

  // Check player 1
  if (!state.player1) {
    errors.push('player1 is missing');
  } else {
    const player1Errors = validatePlayer(state.player1, 'player1');
    errors.push(...player1Errors);
  }

  // Check player 2
  if (!state.player2) {
    errors.push('player2 is missing');
  } else {
    const player2Errors = validatePlayer(state.player2, 'player2');
    errors.push(...player2Errors);
  }

  // Check turnEffects
  if (!Array.isArray(state.turnEffects)) {
    errors.push('turnEffects must be an array');
  }

  // Check log
  if (!Array.isArray(state.log)) {
    errors.push('log must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a player state object.
 * @param {Object} player - Player state to validate
 * @param {string} playerId - Player identifier for error messages
 * @returns {string[]} Array of error messages
 */
function validatePlayer(player, playerId) {
  const errors = [];

  // Check points
  if (typeof player.points !== 'number' || player.points < 0) {
    errors.push(`${playerId}.points must be a non-negative number`);
  }

  // Check bench size
  if (!Array.isArray(player.bench)) {
    errors.push(`${playerId}.bench must be an array`);
  } else if (player.bench.length > MAX_BENCH) {
    errors.push(`${playerId}.bench exceeds maximum size: ${player.bench.length}/${MAX_BENCH}`);
  }

  // Validate bench Pokemon
  player.bench.forEach((pokemon, index) => {
    if (!pokemon || typeof pokemon !== 'object') {
      errors.push(`${playerId}.bench[${index}] is invalid`);
    } else {
      const pokemonErrors = validatePokemon(pokemon, `${playerId}.bench[${index}]`);
      errors.push(...pokemonErrors);
    }
  });

  // Check hand size
  if (!Array.isArray(player.hand)) {
    errors.push(`${playerId}.hand must be an array`);
  } else if (player.hand.length > MAX_HAND) {
    errors.push(`${playerId}.hand exceeds maximum size: ${player.hand.length}/${MAX_HAND}`);
  }

  // Check deck
  if (!Array.isArray(player.deck)) {
    errors.push(`${playerId}.deck must be an array`);
  } else if (player.deck.length > DECK_SIZE) {
    errors.push(`${playerId}.deck exceeds maximum size: ${player.deck.length}/${DECK_SIZE}`);
  }

  // Check discard
  if (!Array.isArray(player.discard)) {
    errors.push(`${playerId}.discard must be an array`);
  }

  // Check active Pokemon
  if (player.active !== null) {
    if (!player.active || typeof player.active !== 'object') {
      errors.push(`${playerId}.active is invalid`);
    } else {
      const activeErrors = validatePokemon(player.active, `${playerId}.active`);
      errors.push(...activeErrors);
    }
  }

  // Check energyZone
  if (!player.energyZone || typeof player.energyZone !== 'object') {
    errors.push(`${playerId}.energyZone is missing or invalid`);
  } else {
    const energyZoneErrors = validateEnergyZone(player.energyZone, playerId);
    errors.push(...energyZoneErrors);
  }

  // Check boolean flags
  if (typeof player.supporterUsedThisTurn !== 'boolean') {
    errors.push(`${playerId}.supporterUsedThisTurn must be a boolean`);
  }
  if (typeof player.retreatedThisTurn !== 'boolean') {
    errors.push(`${playerId}.retreatedThisTurn must be a boolean`);
  }
  if (typeof player.normalAttachUsedThisTurn !== 'boolean') {
    errors.push(`${playerId}.normalAttachUsedThisTurn must be a boolean`);
  }

  // Check max copies per card (2 copies per card name)
  // Count cards in deck, hand, bench, active, and discard
  const allCardIds = [
    ...player.deck,
    ...player.hand,
    ...player.bench.map(p => p.cardId),
    ...(player.active ? [player.active.cardId] : []),
    ...player.discard
  ];

  const cardCounts = {};
  for (const cardId of allCardIds) {
    cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    if (cardCounts[cardId] > MAX_COPIES_PER_CARD) {
      errors.push(`${playerId} has ${cardCounts[cardId]} copies of card ${cardId} (max ${MAX_COPIES_PER_CARD})`);
    }
  }

  return errors;
}

/**
 * Validates a Pokemon state object.
 * @param {Object} pokemon - Pokemon state to validate
 * @param {string} path - Path for error messages
 * @returns {string[]} Array of error messages
 */
function validatePokemon(pokemon, path) {
  const errors = [];

  if (!pokemon.cardId || typeof pokemon.cardId !== 'string') {
    errors.push(`${path}.cardId is missing or invalid`);
  }

  if (typeof pokemon.currentHp !== 'number' || pokemon.currentHp < 0) {
    errors.push(`${path}.currentHp must be a non-negative number`);
  }

  if (!Array.isArray(pokemon.energy)) {
    errors.push(`${path}.energy must be an array`);
  }

  if (pokemon.status !== null && typeof pokemon.status !== 'string') {
    errors.push(`${path}.status must be a string or null`);
  }

  if (typeof pokemon.turnPlayed !== 'number' || pokemon.turnPlayed < 0) {
    errors.push(`${path}.turnPlayed must be a non-negative number`);
  }

  // Check abilitiesUsedThisTurn (optional field)
  if (pokemon.abilitiesUsedThisTurn !== undefined && typeof pokemon.abilitiesUsedThisTurn !== 'object') {
    errors.push(`${path}.abilitiesUsedThisTurn must be an object`);
  }

  return errors;
}

/**
 * Validates an energy zone object.
 * @param {Object} energyZone - Energy zone to validate
 * @param {string} playerId - Player identifier for error messages
 * @returns {string[]} Array of error messages
 */
function validateEnergyZone(energyZone, playerId) {
  const errors = [];
  const path = `${playerId}.energyZone`;

  if (energyZone.usedThisTurn !== undefined && typeof energyZone.usedThisTurn !== 'boolean') {
    errors.push(`${path}.usedThisTurn must be a boolean`);
  }

  if (!Array.isArray(energyZone.configuredTypes)) {
    errors.push(`${path}.configuredTypes must be an array`);
  }

  return errors;
}

/**
 * Checks if the state is valid (quick check).
 * @param {Object} state - State to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidState(state) {
  const validation = validateState(state);
  return validation.valid;
}

/**
 * Adds an entry to the action log.
 * @param {Object} state - Current state
 * @param {Object} logEntry - Log entry to add
 * @returns {Object} New state with log entry added
 */
export function addLogEntry(state, logEntry) {
  const newState = cloneState(state);
  newState.log.push({
    timestamp: Date.now(),
    turn: state.turn,
    player: state.currentPlayer,
    ...logEntry
  });
  return newState;
}

/**
 * Creates a simplified state for scenario export (removes internal metadata).
 * @param {Object} state - State to export
 * @returns {Object} Clean state for export
 */
export function exportState(state) {
  const exported = cloneState(state);
  // Remove any internal fields that shouldn't be exported
  delete exported.name;
  delete exported.description;
  return exported;
}

// ============================================================================
// TURN FLOW (Task 7: Implement Turn Flow)
// ============================================================================

/**
 * Starts a new turn for the current player.
 * Resets turn flags, generates energy, draws card (with first turn rules).
 * @param {Object} state - Current game state
 * @returns {Object} New state with turn started
 */
export function startTurn(state) {
  let newState = cloneState(state);
  const player = newState[newState.currentPlayer];

  // Reset turn flags
  player.supporterUsedThisTurn = false;
  player.retreatedThisTurn = false;
  player.energyZone.usedThisTurn = false;
  player.normalAttachUsedThisTurn = false;
  player.attackedThisTurn = false;

  // Generate next energy (shift current to next, generate new next)
  // TODO-Pocket-Verify: Energy generation timing - is it at start of turn or end?
  if (player.energyZone.nextEnergy) {
    player.energyZone.currentEnergy = player.energyZone.nextEnergy;
  }
  player.energyZone.nextEnergy = generateEnergy(player.energyZone.configuredTypes);

  // First turn rules: player going first on turn 0 doesn't draw
  const isFirstTurn = newState.turn === 0;
  const isGoingFirst = newState.currentPlayer === 'player1';

  // Draw card (skip if first turn going first)
  if (!(isFirstTurn && isGoingFirst)) {
    newState = drawCard(newState, newState.currentPlayer);
  }

  // Log turn start
  newState.log.push({
    timestamp: Date.now(),
    turn: newState.turn,
    player: newState.currentPlayer,
    action: 'startTurn',
    details: isFirstTurn ? 'First turn' : `Turn ${newState.turn}`
  });

  return newState;
}

/**
 * Ends the current turn.
 * Processes Pokemon Checkup, checks win condition, switches player.
 * Also resets "once per turn" ability usage for the current player.
 * @param {Object} state - Current game state
 * @param {Function} getCardFn - Function to get card data by ID
 * @returns {Object} New state with turn ended
 */
export function endTurn(state, getCardFn) {
  let newState = cloneState(state);

  // Pokemon Checkup (process status effects)
  newState = processPokemonCheckup(newState, getCardFn);

  // Reset "once per turn" ability usage for current player
  const player = newState[newState.currentPlayer];

  // Reset active Pokemon ability usage
  if (player.active) {
    player.active = resetAbilityUsage(player.active);
  }

  // Reset bench Pokemon ability usage
  player.bench = player.bench.map(pokemon => {
    if (!pokemon) return null;
    return resetAbilityUsage(pokemon);
  });

  // Check win condition
  const winner = checkWinCondition(newState);
  if (winner) {
    newState.winner = winner;
    const details = winner === 'tie'
      ? 'Game ended in a tie!'
      : `${winner} wins!`;
    newState.log.push({
      timestamp: Date.now(),
      turn: newState.turn,
      player: winner === 'tie' ? 'both' : winner,
      action: 'gameOver',
      details: details
    });
    return newState;
  }

  // Switch player
  newState.currentPlayer = newState.currentPlayer === 'player1' ? 'player2' : 'player1';
  newState.turn++;

  // Log turn end
  newState.log.push({
    timestamp: Date.now(),
    turn: newState.turn - 1,
    player: state.currentPlayer,
    action: 'endTurn',
    details: `Turn ${newState.turn - 1} ended`
  });

  return newState;
}

/**
 * Draws a card from deck to hand.
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @returns {Object} New state with card drawn
 */
export function drawCard(state, playerId) {
  const newState = cloneState(state);
  const player = newState[playerId];

  if (player.deck.length === 0) {
    // No deck-out loss in Pocket (TODO-Pocket-Verify: verify this)
    newState.log.push({
      timestamp: Date.now(),
      turn: newState.turn,
      player: playerId,
      action: 'draw',
      result: 'deck empty'
    });
    return newState;
  }

  const card = player.deck.pop();
  if (player.hand.length < MAX_HAND) {
    player.hand.push(card);
    newState.log.push({
      timestamp: Date.now(),
      turn: newState.turn,
      player: playerId,
      action: 'draw',
      card: card
    });
  } else {
    // Hand full, discard drawn card
    player.discard.push(card);
    newState.log.push({
      timestamp: Date.now(),
      turn: newState.turn,
      player: playerId,
      action: 'draw',
      result: 'hand full',
      card: card
    });
  }

  return newState;
}

/**
 * Generates next energy type from configured types.
 * If no types configured, returns null.
 * TODO-Pocket-Verify: Energy generation algorithm - is it random, weighted, or something else?
 * @param {string[]} configuredTypes - Array of energy type codes (G, R, W, etc.)
 * @returns {string|null} Energy type code or null
 */
export function generateEnergy(configuredTypes) {
  if (!configuredTypes || configuredTypes.length === 0) {
    return null;
  }
  // Random selection from configured types
  // TODO-Pocket-Verify: Verify energy generation algorithm
  const randomIndex = Math.floor(Math.random() * configuredTypes.length);
  return configuredTypes[randomIndex];
}

/**
 * Processes Pokemon Checkup at end of turn.
 * Applies status effects (Poison, Burn, Sleep, Paralysis) in order.
 * @param {Object} state - Current game state
 * @param {Function} getCardFn - Function to get card data by ID
 * @returns {Object} New state with checkup processed
 */
export function processPokemonCheckup(state, getCardFn) {
  let newState = cloneState(state);
  const player = newState[newState.currentPlayer];

  // Check active Pokemon
  if (player.active) {
    const result = processCheckupForPokemon(player.active, newState.coinQueue);
    player.active = result.pokemon;
    newState.coinQueue = result.coinQueue;

    if (result.ko) {
      // Active Pokemon KO'd during checkup
      newState = handleKOPokemon(newState, newState.currentPlayer, 'active', getCardFn);
    }

    newState.log.push({
      timestamp: Date.now(),
      turn: newState.turn,
      player: newState.currentPlayer,
      action: 'checkup',
      details: `Active ${result.details}`
    });
  }

  // Check bench Pokemon
  player.bench.forEach((pokemon, index) => {
    if (!pokemon) return;

    const result = processCheckupForPokemon(pokemon, newState.coinQueue);
    player.bench[index] = result.pokemon;
    newState.coinQueue = result.coinQueue;

    if (result.ko) {
      // Bench Pokemon KO'd during checkup
      newState = handleKOPokemon(newState, newState.currentPlayer, `bench[${index}]`, getCardFn);
    }
  });

  return newState;
}

/**
 * Processes checkup for a single Pokemon.
 * @param {Object} pokemon - Pokemon state
 * @param {boolean[]} coinQueue - Current coin queue
 * @returns {{pokemon: Object, coinQueue: boolean[], ko: boolean, details: string}} Result
 */
function processCheckupForPokemon(pokemon, coinQueue) {
  let newPokemon = { ...pokemon };
  let newCoinQueue = [...coinQueue];
  let ko = false;
  let details = [];

  // Process status effects in order
  for (const status of STATUS_CHECKUP_ORDER) {
    if (newPokemon.status !== status) continue;

    switch (status) {
      case STATUS.POISON:
        // Apply 10 damage at end of turn
        newPokemon.currentHp -= STATUS_DAMAGE[STATUS.POISON];
        if (newPokemon.currentHp <= 0) {
          newPokemon.currentHp = 0;
          ko = true;
        }
        details.push(`Poison: -${STATUS_DAMAGE[STATUS.POISON]} HP`);
        break;

      case STATUS.POISON_PLUS:
        // Apply 20 damage at end of turn
        newPokemon.currentHp -= STATUS_DAMAGE[STATUS.POISON_PLUS];
        if (newPokemon.currentHp <= 0) {
          newPokemon.currentHp = 0;
          ko = true;
        }
        details.push(`Poison+: -${STATUS_DAMAGE[STATUS.POISON_PLUS]} HP`);
        break;

      case STATUS.BURN:
        // Apply 20 damage at end of turn, then coin flip
        newPokemon.currentHp -= STATUS_DAMAGE[STATUS.BURN];
        if (newPokemon.currentHp <= 0) {
          newPokemon.currentHp = 0;
          ko = true;
          details.push(`Burn: -${STATUS_DAMAGE[STATUS.BURN]} HP, KO'd`);
          break;
        }
        details.push(`Burn: -${STATUS_DAMAGE[STATUS.BURN]} HP`);

        // Coin flip: heads = clear burn
        if (newCoinQueue.length > 0) {
          const heads = newCoinQueue.shift();
          if (heads) {
            newPokemon.status = null;
            details.push('Burn cleared (heads)');
          } else {
            details.push('Burn remains (tails)');
          }
        }
        break;

      case STATUS.SLEEP:
        // Coin flip: heads = wake up
        if (newCoinQueue.length > 0) {
          const heads = newCoinQueue.shift();
          if (heads) {
            newPokemon.status = null;
            details.push('Woke up (heads)');
          } else {
            details.push('Still asleep (tails)');
          }
        }
        break;

      case STATUS.PARALYSIS:
        // Auto-cure after 1 turn (per SPEC.md)
        newPokemon.status = null;
        details.push('Paralysis cured (auto)');
        break;
    }

    // Only one status at a time
    break;
  }

  return {
    pokemon: newPokemon,
    coinQueue: newCoinQueue,
    ko,
    details: details.join(', ') || 'No status'
  };
}

/**
 * Handles a Pokemon being KO'd.
 * Awards points, moves to discard.
 * @param {Object} state - Current game state
 * @param {string} playerId - Player whose Pokemon was KO'd
 * @param {string} location - 'active' or 'bench[index]'
 * @param {Function} getCardFn - Function to get card data by ID
 * @returns {Object} New state with KO handled
 */
export function handleKOPokemon(state, playerId, location, getCardFn) {
  const newState = cloneState(state);
  const opponentId = playerId === 'player1' ? 'player2' : 'player1';
  const player = newState[playerId];

  let pokemon;
  if (location === 'active') {
    pokemon = player.active;
    player.active = null;
  } else {
    const match = location.match(/bench\[(\d+)\]/);
    if (match) {
      const index = parseInt(match[1], 10);
      pokemon = player.bench[index];
      // Remove the null slot from bench (BUG-003 fix)
      player.bench.splice(index, 1);
    }
  }

  if (!pokemon) return newState;

  // Determine if EX (2 points) or normal (1 point)
  // EX cards have a rule with label "ex"
  let isEX = false;
  if (typeof getCardFn === 'function') {
    const card = getCardFn(pokemon.cardId);
    if (card) {
      isEX = card.rules && card.rules.some(r => r.label === 'ex');
    }
  }
  const points = isEX ? KO_POINTS.EX : KO_POINTS.NORMAL;

  // Award points to opponent
  newState[opponentId].points += points;

  // Move to discard
  player.discard.push(pokemon.cardId);

  newState.log.push({
    timestamp: Date.now(),
    turn: newState.turn,
    player: opponentId,
    action: 'ko',
    details: `KO'd ${playerId}'s ${location}, +${points} points`
  });

  return newState;
}

/**
 * Checks if the game has been won.
 *
 * Win conditions (from SPEC.md):
 * - Primary: First to 3 points wins
 * - Turn limit: At turn 30, player with more points wins
 * - Simultaneous KO: If both reach 3 points at same time, winner is who still has Pokemon on bench
 *
 * @param {Object} state - Current game state
 * @returns {string|null} 'player1', 'player2', 'tie', or null if game continues
 */
export function checkWinCondition(state) {
  // Check for "no Pokemon left" win condition (BUG-005 fix)
  const p1HasPokemon = state.player1.active || state.player1.bench.some(p => p !== null);
  const p2HasPokemon = state.player2.active || state.player2.bench.some(p => p !== null);
  if (!p1HasPokemon && !p2HasPokemon) return 'tie';
  if (!p1HasPokemon) return 'player2';
  if (!p2HasPokemon) return 'player1';

  // Check for 3 points win condition
  const player1Won = state.player1.points >= POINTS_TO_WIN;
  const player2Won = state.player2.points >= POINTS_TO_WIN;

  if (player1Won && player2Won) {
    // Both players reached 3 points simultaneously - check bench Pokemon
    // Winner is who still has Pokemon on bench
    // If both have bench or neither has bench, it's a draw
    const player1HasBench = hasBenchPokemon(state.player1);
    const player2HasBench = hasBenchPokemon(state.player2);

    if (player1HasBench && !player2HasBench) {
      return 'player1';
    } else if (player2HasBench && !player1HasBench) {
      return 'player2';
    } else {
      // Both have bench or neither has bench - it's a draw
      return 'tie';
    }
  }

  if (player1Won) {
    return 'player1';
  }

  if (player2Won) {
    return 'player2';
  }

  // Check for turn limit tie-breaker
  // TODO-Pocket-Verify: Verify that turn limit is 30 and tie-breaker works this way
  if (state.turn >= TURN_LIMIT) {
    // Whoever has more points wins
    if (state.player1.points > state.player2.points) {
      return 'player1';
    }
    if (state.player2.points > state.player1.points) {
      return 'player2';
    }
    // Equal points - it's a draw
    return 'tie';
  }

  return null;
}

/**
 * Checks if a player has any Pokemon on their bench (excluding active).
 * Used for simultaneous KO tie-breaker.
 *
 * @param {Object} player - Player state object
 * @returns {boolean} True if player has at least one Pokemon on bench
 */
function hasBenchPokemon(player) {
  if (!player.bench || !Array.isArray(player.bench)) {
    return false;
  }
  return player.bench.some(pokemon => pokemon !== null && pokemon !== undefined);
}

// ============================================================================
// DAMAGE CALCULATION (Task 9: Damage Calculation + Weakness)
// ============================================================================

/**
 * Calculates damage for an attack.
 *
 * Damage formula:
 * 1. Base damage from attack
 * 2. Weakness: +20 if attacker's element matches defender's weakness
 * 3. Giovanni: +10 if Giovanni (or other damage-boosting effect) is active
 * 4. Other modifiers from effects, tools, stadiums
 *
 * @param {Object} attackerCard - Card data for attacking Pokemon (from getCard)
 * @param {Object} defenderCard - Card data for defending Pokemon (from getCard)
 * @param {number} attackIndex - Index of attack in attackerCard.attacks array
 * @param {Object} modifiers - Optional modifiers
 * @param {number} modifiers.giovanni - Giovanni bonus (default: 0, active: +10)
 * @param {number} modifiers.other - Other bonuses (default: 0)
 * @returns {number} Total damage to apply
 */
export function calculateDamage(attackerCard, defenderCard, attackIndex, modifiers = {}) {
  // Get the attack
  const attack = attackerCard.attacks?.[attackIndex];
  if (!attack) {
    console.warn(`Attack index ${attackIndex} not found for ${attackerCard.name}`);
    return 0;
  }

  // Parse base damage (may be string like "40" or "20+"")
  let baseDamage = parseDamage(attack.damage);
  if (baseDamage === 0) {
    console.warn(`Could not parse damage: ${attack.damage}`);
    return 0;
  }

  let totalDamage = baseDamage;
  let damageDetails = [`Base: ${baseDamage}`];

  // Weakness: +20 if attacker's element matches defender's weakness
  // TODO-Pocket-Verify: Does weakness apply to Colorless attacks?
  if (defenderCard.weakness && attackerCard.element === defenderCard.weakness) {
    const weaknessBonus = 20;
    totalDamage += weaknessBonus;
    damageDetails.push(`Weakness (+${weaknessBonus})`);
  }

  // Giovanni modifier: +10 if Giovanni is active
  // TODO-Pocket-Verify: How to detect Giovanni? Check cardId, name, or effect?
  // TODO-Pocket-Verify: Does Giovanni apply to bench too or only active?
  const giovanniBonus = modifiers.giovanni || 0;
  if (giovanniBonus > 0) {
    totalDamage += giovanniBonus;
    damageDetails.push(`Giovanni (+${giovanniBonus})`);
  }

  // Other modifiers (effects, tools, stadiums)
  const otherBonus = modifiers.other || 0;
  if (otherBonus > 0) {
    totalDamage += otherBonus;
    damageDetails.push(`Other (+${otherBonus})`);
  }

  console.log(`Damage calculation for ${attackerCard.name} → ${defenderCard.name}: ${totalDamage} (${damageDetails.join(', ')})`);

  return totalDamage;
}

/**
 * Parses a damage string to a number.
 * Handles formats like "40", "20+", "10×", etc.
 * TODO-Pocket-Verify: How do + and × attacks work in Pocket?
 *
 * @param {string} damageStr - Damage string from card
 * @returns {number} Base damage value
 */
function parseDamage(damageStr) {
  if (!damageStr) return 0;

  // Extract numeric portion
  const match = damageStr.match(/(\d+)/);
  if (!match) return 0;

  return parseInt(match[1], 10);
}

/**
 * Executes an attack from the active Pokemon of the current player.
 *
 * @param {Object} state - Current game state
 * @param {number} attackIndex - Index of attack to use
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {Object} New state with attack executed
 */
export function executeAttack(state, attackIndex, getCardFn) {
  let newState = cloneState(state);
  const attackerId = newState.currentPlayer;
  const defenderId = attackerId === 'player1' ? 'player2' : 'player1';

  const attacker = newState[attackerId].active;
  const defender = newState[defenderId].active;

  if (!attacker || !defender) {
    console.warn('Cannot attack: active Pokemon missing');
    return newState;
  }

  // Get card data
  const attackerCard = getCardFn(attacker.cardId);
  const defenderCard = getCardFn(defender.cardId);

  if (!attackerCard || !defenderCard) {
    console.warn('Cannot attack: card data missing');
    return newState;
  }

  // Calculate damage
  const modifiers = {};
  // TODO-Pocket-Verify: Check for Giovanni/stadium effects
  const damage = calculateDamage(attackerCard, defenderCard, attackIndex, modifiers);

  // Apply damage to defender
  const attackName = attackerCard.attacks[attackIndex]?.name || 'Attack';
  newState = applyDamage(newState, defenderId, damage, attackName, getCardFn);

  // Log the attack
  newState.log.push({
    timestamp: Date.now(),
    turn: newState.turn,
    player: attackerId,
    action: 'attack',
    attack: attackName,
    target: defenderId,
    damage: damage,
    attackerCardId: attacker.cardId,
    defenderCardId: defender.cardId
  });

  // Mark that attack was used
  newState[attackerId].attackedThisTurn = true;

  return newState;
}

/**
 * Applies damage to a Pokemon.
 *
 * @param {Object} state - Current game state
 * @param {string} targetPlayerId - Player who owns the target Pokemon ('player1' or 'player2')
 * @param {number} damage - Damage to apply
 * @param {string} source - Source of damage (for logging)
 * @param {Function} getCardFn - Function to get card data by ID
 * @returns {Object} New state with damage applied
 */
export function applyDamage(state, targetPlayerId, damage, source = 'unknown', getCardFn) {
  let newState = cloneState(state);
  const player = newState[targetPlayerId];

  // Apply damage to active Pokemon
  if (player.active) {
    player.active.currentHp -= damage;

    // Check for KO
    if (player.active.currentHp <= 0) {
      player.active.currentHp = 0;
      newState = handleKOPokemon(newState, targetPlayerId, 'active', getCardFn);

      newState.log.push({
        timestamp: Date.now(),
        turn: newState.turn,
        player: targetPlayerId,
        action: 'damage',
        source: source,
        damage: damage,
        result: 'KO'
      });
    } else {
      newState.log.push({
        timestamp: Date.now(),
        turn: newState.turn,
        player: targetPlayerId,
        action: 'damage',
        source: source,
        damage: damage,
        result: `HP: ${player.active.currentHp}`
      });
    }
  }

  return newState;
}

/**
 * Checks if an attack can be used.
 * Verifies that the active Pokemon has enough energy.
 *
 * @param {Object} state - Current game state
 * @param {number} attackIndex - Index of attack to check
 * @param {Object} cardData - Card data map
 * @returns {boolean} True if attack can be used
 */
export function canAttack(state, attackIndex, getCardFn) {
  const playerId = state.currentPlayer;
  const attacker = state[playerId].active;

  if (!attacker) return false;

  const attackerCard = getCardFn(attacker.cardId);
  if (!attackerCard) return false;

  const attack = attackerCard.attacks?.[attackIndex];
  if (!attack) return false;

  // Check energy cost
  return hasEnoughEnergy(attacker.energy, attack.energyCost);
}

/**
 * Checks if Pokemon has enough energy for an attack.
 *
 * @param {string[]} energy - Array of energy types attached to Pokemon
 * @param {string[]} energyCost - Energy cost array from attack
 * @returns {boolean} True if enough energy
 */
function hasEnoughEnergy(energy, energyCost) {
  if (!energyCost || energyCost.length === 0) return true;

  // Count energy by type
  const energyCount = {};
  energy.forEach(type => {
    energyCount[type] = (energyCount[type] || 0) + 1;
  });

  // Check each energy requirement
  const energyCopy = { ...energyCount };

  for (const costType of energyCost) {
    // Colorless can be satisfied by any energy
    if (costType === 'C') {
      // Find any energy type that has remaining energy
      const anyEnergy = Object.keys(energyCopy).find(type => energyCopy[type] > 0);
      if (!anyEnergy) return false;
      energyCopy[anyEnergy]--;
    } else {
      // Specific type required
      if (!energyCopy[costType] || energyCopy[costType] <= 0) return false;
      energyCopy[costType]--;
    }
  }

  return true;
}

// ============================================================================
// EVOLUTION (Task 11: Evolution)
// ============================================================================

/**
 * Checks if a Pokemon can be evolved.
 *
 * Evolution rules:
 * - Can't evolve on first turn (both players)
 * - Can't evolve the turn a Pokemon was played
 * - Can't evolve a Pokemon that already evolved this turn
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @param {number} pokemonIndex - Index of Pokemon to evolve ('active' or bench index 0-2)
 * @param {string} evolutionCardId - Card ID of evolution to use
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {boolean} True if evolution is valid
 */
export function canEvolve(state, playerId, pokemonIndex, evolutionCardId, getCardFn) {
  const player = state[playerId];
  const pokemon = pokemonIndex === 'active' ? player.active : player.bench[pokemonIndex];

  // Check if Pokemon exists
  if (!pokemon) {
    console.warn('Cannot evolve: Pokemon not found');
    return false;
  }

  // Check if evolution card exists
  const evolutionCard = getCardFn(evolutionCardId);
  if (!evolutionCard) {
    console.warn('Cannot evolve: Evolution card not found');
    return false;
  }

  // First turn rule: no evolution on turn 0 for either player
  if (state.turn === 0) {
    console.warn('Cannot evolve on first turn');
    return false;
  }

  // Can't evolve the turn a Pokemon was played
  if (pokemon.turnPlayed === state.turn) {
    console.warn('Cannot evolve: Pokemon was played this turn');
    return false;
  }

  // Can't evolve a Pokemon that already evolved this turn
  if (pokemon.lastEvolved === state.turn) {
    console.warn('Cannot evolve: Pokemon already evolved this turn');
    return false;
  }

  // Check if evolution is valid (stage matches)
  if (!isEvolutionValid(pokemon.cardId, evolutionCardId, getCardFn)) {
    console.warn('Cannot evolve: Invalid evolution stage');
    return false;
  }

  return true;
}

/**
 * Checks if evolution between two cards is valid based on their stages.
 *
 * @param {string} fromCardId - Card ID of current Pokemon
 * @param {string} toCardId - Card ID of evolution target
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {boolean} True if evolution is valid
 */
function isEvolutionValid(fromCardId, toCardId, getCardFn) {
  const fromCard = getCardFn(fromCardId);
  const toCard = getCardFn(toCardId);

  if (!fromCard || !toCard) {
    return false;
  }

  // Evolution is valid if:
  // 1. From is Basic and to is Stage 1, and to.stage matches from.name
  // 2. From is Stage 1 and to is Stage 2, and to.stage matches from.name

  const fromSubtype = fromCard.subtype;
  const toSubtype = toCard.subtype;

  // Basic -> Stage 1
  if (fromSubtype === 'Basic' && toSubtype === 'Stage 1') {
    return toCard.stage === fromCard.name;
  }

  // Stage 1 -> Stage 2
  if (fromSubtype === 'Stage 1' && toSubtype === 'Stage 2') {
    return toCard.stage === fromCard.name;
  }

  return false;
}

/**
 * Evolves a Pokemon.
 *
 * On evolution:
 * - Cures all status effects
 * - Preserves damage (applies same damage to new HP)
 * - Preserves attached energy
 * - Preserves attached tool
 * - Updates lastEvolved tracking
 * - Removes old card from hand
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @param {number} pokemonIndex - Index of Pokemon to evolve ('active' or bench index 0-2)
 * @param {string} evolutionCardId - Card ID of evolution to use
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {Object} New state with evolution completed
 */
export function evolve(state, playerId, pokemonIndex, evolutionCardId, getCardFn) {
  // Validate evolution first
  if (!canEvolve(state, playerId, pokemonIndex, evolutionCardId, getCardFn)) {
    console.warn('Evolution validation failed');
    return state;
  }

  let newState = cloneState(state);
  const player = newState[playerId];
  const oldPokemon = pokemonIndex === 'active' ? player.active : player.bench[pokemonIndex];
  const evolutionCard = getCardFn(evolutionCardId);

  if (!oldPokemon || !evolutionCard) {
    return state;
  }

  // Calculate damage amount to preserve
  // Damage = maxHp - currentHp
  // For Basic Pokemon, we need to look up its HP from card data
  const oldCard = getCardFn(oldPokemon.cardId);
  const oldMaxHp = oldCard.hp || 0;
  const damageAmount = oldMaxHp - oldPokemon.currentHp;

  // Create new evolved Pokemon state
  const newPokemon = {
    cardId: evolutionCardId,
    currentHp: Math.max(0, evolutionCard.hp - damageAmount), // Preserve damage, cap at 0
    energy: [...oldPokemon.energy], // Preserve energy
    status: null, // Cure all status effects
    turnPlayed: oldPokemon.turnPlayed, // Preserve original turn played
    lastEvolved: state.turn, // Track when this evolution happened
    tool: oldPokemon.tool ? { ...oldPokemon.tool } : null, // Preserve tool
    effects: [...oldPokemon.effects] // Preserve effects
  };

  // Update Pokemon in state
  if (pokemonIndex === 'active') {
    player.active = newPokemon;
  } else {
    player.bench[pokemonIndex] = newPokemon;
  }

  // Remove evolution card from hand
  const cardIndex = player.hand.indexOf(evolutionCardId);
  if (cardIndex !== -1) {
    player.hand.splice(cardIndex, 1);
  }

  // Log evolution
  newState.log.push({
    timestamp: Date.now(),
    turn: state.turn,
    player: playerId,
    action: 'evolve',
    location: pokemonIndex === 'active' ? 'active' : `bench[${pokemonIndex}]`,
    from: oldPokemon.cardId,
    to: evolutionCardId,
    details: `Evolved to ${evolutionCard.name}`
  });

  return newState;
}

/**
 * Checks if a card is an evolution card (Stage 1 or Stage 2).
 * Used for UI filtering.
 *
 * @param {string} cardId - Card ID to check
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {boolean} True if card is an evolution card
 */
export function isEvolutionCard(cardId, getCardFn) {
  const card = getCardFn(cardId);
  if (!card) return false;

  return card.subtype === 'Stage 1' || card.subtype === 'Stage 2';
}

/**
 * Gets valid evolutions for a Pokemon.
 * Used for UI to show which cards from hand can evolve this Pokemon.
 *
 * @param {string} pokemonCardId - Card ID of Pokemon to evolve
 * @param {string[]} handCards - Array of card IDs in hand
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {string[]} Array of valid evolution card IDs from hand
 */
export function getValidEvolutions(pokemonCardId, handCards, getCardFn) {
  return handCards.filter(cardId => {
    return isEvolutionValid(pokemonCardId, cardId, getCardFn);
  });
}

// ============================================================================
// ABILITIES (Task 13: Abilities)
// ============================================================================

/**
 * Gets abilities for a Pokemon from its card data.
 *
 * @param {string} cardId - Card ID of Pokemon
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {Array<{name: string, effect: string, isOncePerTurn: boolean}>} Array of abilities
 */
export function getAbilities(cardId, getCardFn) {
  const card = getCardFn(cardId);
  if (!card || !card.abilities || !Array.isArray(card.abilities)) {
    return [];
  }

  return card.abilities.map(ability => ({
    name: ability.name,
    effect: ability.effect,
    isOncePerTurn: ability.effect && ability.effect.includes('Once during your turn')
  }));
}

/**
 * Checks if an ability is a "once per turn" ability.
 *
 * @param {string} effectText - The effect text of the ability
 * @returns {boolean} True if the ability can only be used once per turn
 */
export function isOncePerTurnAbility(effectText) {
  return effectText && effectText.includes('Once during your turn');
}

/**
 * Checks if an ability has been used this turn.
 *
 * @param {Object} pokemon - Pokemon state object
 * @param {string} abilityName - Name of the ability
 * @param {number} currentTurn - Current turn number
 * @returns {boolean} True if ability was already used this turn
 */
export function wasAbilityUsedThisTurn(pokemon, abilityName, currentTurn) {
  if (!pokemon.abilitiesUsedThisTurn) {
    return false;
  }
  const usedTurn = pokemon.abilitiesUsedThisTurn[abilityName];
  if (usedTurn === undefined) {
    return false;
  }
  // Check if the ability was used on this specific turn
  return usedTurn === currentTurn;
}

/**
 * Marks an ability as used this turn.
 *
 * @param {Object} pokemon - Pokemon state object
 * @param {string} abilityName - Name of the ability
 * @param {number} currentTurn - Current turn number
 * @returns {Object} Updated Pokemon state
 */
export function markAbilityUsed(pokemon, abilityName, currentTurn) {
  const newPokemon = { ...pokemon };
  if (!newPokemon.abilitiesUsedThisTurn) {
    newPokemon.abilitiesUsedThisTurn = {};
  }
  newPokemon.abilitiesUsedThisTurn[abilityName] = currentTurn;
  return newPokemon;
}

/**
 * Checks if an ability can be activated.
 *
 * Conditions:
 * - Pokemon must be in the Active Spot (for most abilities)
 * - If "once per turn", must not have been used this turn
 * - Pokemon must not have a status that prevents abilities (TODO-Pocket-Verify)
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @param {number} pokemonIndex - Index of Pokemon ('active' or bench index 0-2)
 * @param {string} abilityName - Name of ability to activate
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {{canUse: boolean, reason: string}} Whether ability can be used and reason
 */
export function canUseAbility(state, playerId, pokemonIndex, abilityName, getCardFn) {
  const player = state[playerId];
  const pokemon = pokemonIndex === 'active' ? player.active : player.bench[pokemonIndex];

  // Check if Pokemon exists
  if (!pokemon) {
    return { canUse: false, reason: 'Pokemon not found' };
  }

  // Get abilities for this Pokemon
  const abilities = getAbilities(pokemon.cardId, getCardFn);
  const ability = abilities.find(a => a.name === abilityName);

  if (!ability) {
    return { canUse: false, reason: 'Ability not found on this Pokemon' };
  }

  // Check if Pokemon is in Active Spot
  // TODO-Pocket-Verify: Can abilities be used from bench? Some abilities may work from bench.
  if (pokemonIndex !== 'active') {
    return { canUse: false, reason: 'Pokemon must be in Active Spot' };
  }

  // Check if ability is "once per turn" and already used
  if (ability.isOncePerTurn) {
    if (wasAbilityUsedThisTurn(pokemon, abilityName, state.turn)) {
      return { canUse: false, reason: 'Ability already used this turn' };
    }
  }

  // TODO-Pocket-Verify: Check status effects that prevent abilities
  // In physical TCG, some conditions prevent abilities
  // if (pokemon.status && STATUS_BLOCKS_ABILITIES.includes(pokemon.status)) {
  //   return { canUse: false, reason: `Cannot use ability while ${pokemon.status}` };
  // }

  return { canUse: true, reason: '' };
}

/**
 * Activates an ability.
 * Returns new state with ability effect applied.
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @param {number} pokemonIndex - Index of Pokemon ('active' or bench index 0-2)
 * @param {string} abilityName - Name of ability to activate
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {Object} New state with ability effect applied
 */
export function activateAbility(state, playerId, pokemonIndex, abilityName, getCardFn) {
  // Check if ability can be used
  const check = canUseAbility(state, playerId, pokemonIndex, abilityName, getCardFn);
  if (!check.canUse) {
    console.warn(`Cannot activate ability: ${check.reason}`);
    return state;
  }

  let newState = cloneState(state);
  const player = newState[playerId];
  const pokemon = pokemonIndex === 'active' ? player.active : player.bench[pokemonIndex];

  // Get ability details
  const abilities = getAbilities(pokemon.cardId, getCardFn);
  const ability = abilities.find(a => a.name === abilityName);

  if (!ability) {
    return state;
  }

  // Apply ability effect
  // TODO-Pocket-Verify: Implement specific ability effects
  // For now, we'll implement a few common abilities
  const result = applyAbilityEffect(newState, playerId, pokemonIndex, ability, getCardFn);

  // Update state with result from applyAbilityEffect
  newState = result.state;

  // Mark ability as used if it's "once per turn"
  if (ability.isOncePerTurn) {
    if (pokemonIndex === 'active') {
      player.active = markAbilityUsed(player.active, abilityName, newState.turn);
    } else {
      player.bench[pokemonIndex] = markAbilityUsed(player.bench[pokemonIndex], abilityName, newState.turn);
    }
  }

  // Log ability activation
  newState.log.push({
    timestamp: Date.now(),
    turn: newState.turn,
    player: playerId,
    action: 'ability',
    ability: abilityName,
    location: pokemonIndex === 'active' ? 'active' : `bench[${pokemonIndex}]`,
    details: result.details || ability.effect
  });

  return newState;
}

/**
 * Applies the effect of an ability.
 * This is a placeholder that should be expanded with specific ability implementations.
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @param {number} pokemonIndex - Index of Pokemon ('active' or bench index 0-2)
 * @param {Object} ability - Ability object with name and effect
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {{state: Object, details: string}} New state and description of effect
 */
function applyAbilityEffect(state, playerId, pokemonIndex, ability, getCardFn) {
  let newState = state;
  const opponentId = playerId === 'player1' ? 'player2' : 'player1';
  const details = [];

  // Implement known abilities
  // TODO-Pocket-Verify: Implement more abilities as they are discovered

  // Butterfree - Powder Heal: "Once during your turn, you may heal 20 damage from each of your Pokémon."
  if (ability.name === 'Powder Heal') {
    const player = newState[playerId];

    // Heal active Pokemon
    if (player.active) {
      const card = getCardFn(player.active.cardId);
      const healAmount = 20;
      const oldHp = player.active.currentHp;
      player.active.currentHp = Math.min(card.hp, player.active.currentHp + healAmount);
      details.push(`Active: ${oldHp} → ${player.active.currentHp} HP`);
    }

    // Heal bench Pokemon
    player.bench.forEach((benchPokemon, index) => {
      if (!benchPokemon) return;

      const card = getCardFn(benchPokemon.cardId);
      const healAmount = 20;
      const oldHp = benchPokemon.currentHp;
      benchPokemon.currentHp = Math.min(card.hp, benchPokemon.currentHp + healAmount);
      details.push(`Bench[${index}]: ${oldHp} → ${benchPokemon.currentHp} HP`);
    });
  }

  // Greninja - Water Shuriken: "Once during your turn, you may do 20 damage to 1 of your opponent's Pokémon."
  else if (ability.name === 'Water Shuriken') {
    const opponent = newState[opponentId];

    // TODO-Pocket-Verify: Need to specify which opponent Pokemon to target
    // For now, damage the active Pokemon
    if (opponent && opponent.active) {
      const damage = 20;
      opponent.active.currentHp -= damage;

      // Check for KO
      if (opponent.active.currentHp <= 0) {
        opponent.active.currentHp = 0;
        newState = handleKOPokemon(newState, opponentId, 'active', getCardFn);
        details.push(`Active: -${damage} HP (KO)`);
      } else {
        details.push(`Active: -${damage} HP`);
      }
    }
  }

  // Gengar ex - Shadowy Spellbind: "As long as this Pokémon is in the Active Spot, your opponent can't use any Supporter cards from their hand."
  // This is a passive ability - it doesn't need activation
  else if (ability.name === 'Shadowy Spellbind') {
    details.push('Passive: Blocks opponent supporters');
  }

  // Unknown ability - flag for Pocket verification
  else {
    details.push(`// TODO-Pocket-Verify: Implement effect for ${ability.name}`);
    console.warn(`Ability effect not implemented: ${ability.name} - "${ability.effect}"`);
  }

  return { state: newState, details: details.join(', ') };
}

/**
 * Gets passive abilities that are currently active.
 * Passive abilities are those that don't require activation and have ongoing effects.
 *
 * @param {Object} state - Current game state
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {Array<{playerId: string, pokemonIndex: string, abilityName: string, effect: string}>} Array of active passive abilities
 */
export function getActivePassiveAbilities(state, getCardFn) {
  const passiveAbilities = [];

  ['player1', 'player2'].forEach(playerId => {
    const player = state[playerId];

    // Check active Pokemon
    if (player.active) {
      const abilities = getAbilities(player.active.cardId, getCardFn);
      abilities.forEach(ability => {
        // Passive abilities don't say "Once during your turn"
        if (!ability.isOncePerTurn) {
          passiveAbilities.push({
            playerId,
            pokemonIndex: 'active',
            abilityName: ability.name,
            effect: ability.effect
          });
        }
      });
    }

    // Check bench Pokemon
    // TODO-Pocket-Verify: Can passive abilities work from bench?
    player.bench.forEach((benchPokemon, index) => {
      if (!benchPokemon) return;

      const abilities = getAbilities(benchPokemon.cardId, getCardFn);
      abilities.forEach(ability => {
        if (!ability.isOncePerTurn) {
          passiveAbilities.push({
            playerId,
            pokemonIndex: `bench[${index}]`,
            abilityName: ability.name,
            effect: ability.effect
          });
        }
      });
    });
  });

  return passiveAbilities;
}

/**
 * Checks if a supporter card can be played.
 * Takes into account passive abilities that may block supporters.
 *
 * @param {Object} state - Current game state
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {{canPlay: boolean, reason: string}} Whether supporter can be played and reason
 */
export function canPlaySupporter(state, getCardFn) {
  // The current player is trying to play a supporter
  // Check if the OPPONENT has an ability that blocks supporters
  const opponentId = state.currentPlayer === 'player1' ? 'player2' : 'player1';
  const opponent = state[opponentId];

  // Check if opponent has Gengar ex (Shadowy Spellbind) in active spot
  // TODO-Pocket-Verify: Does Shadowy Spellbind only work when opponent's Gengar ex is Active?
  if (opponent && opponent.active) {
    const abilities = getAbilities(opponent.active.cardId, getCardFn);
    const spellbind = abilities.find(a => a.name === 'Shadowy Spellbind');

    if (spellbind) {
      return { canPlay: false, reason: 'Shadowy Spellbind blocks supporters' };
    }
  }

  return { canPlay: true, reason: '' };
}

/**
 * Resets "once per turn" ability tracking at end of turn.
 * Called from endTurn() to reset the counter for the next turn.
 *
 * @param {Object} pokemon - Pokemon state object
 * @param {number} currentTurn - Current turn number (the turn that's ending)
 * @returns {Object} Updated Pokemon state
 */
export function resetAbilityUsage(pokemon) {
  const newPokemon = { ...pokemon };
  // Clear all ability usage — abilities reset at end of each turn
  newPokemon.abilitiesUsedThisTurn = {};
  return newPokemon;
}

/**
 * Gets available abilities for a Pokemon.
 * Used by UI to show which abilities can be activated.
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @param {number|string} pokemonIndex - Index of Pokemon ('active' or bench index 0-2)
 * @param {Function} getCardFn - Function to get card data by cardId
 * @returns {Array<{name: string, effect: string, isOncePerTurn: boolean, canUse: boolean}>} Array of available abilities
 */
export function getAvailableAbilities(state, playerId, pokemonIndex, getCardFn) {
  const player = state[playerId];
  const pokemon = pokemonIndex === 'active' ? player.active : player.bench[pokemonIndex];

  if (!pokemon) {
    return [];
  }

  const abilities = getAbilities(pokemon.cardId, getCardFn);

  // Only active Pokemon can use abilities
  // TODO-Pocket-Verify: Can bench Pokemon activate abilities?
  if (pokemonIndex !== 'active') {
    return [];
  }

  // Filter to only activatable abilities (not passive)
  // Only "once per turn" abilities need activation
  return abilities.filter(ability => ability.isOncePerTurn).map(ability => {
    const check = canUseAbility(state, playerId, pokemonIndex, ability.name, getCardFn);
    return {
      name: ability.name,
      effect: ability.effect,
      isOncePerTurn: ability.isOncePerTurn,
      canUse: check.canUse,
      reason: check.reason
    };
  });
}
