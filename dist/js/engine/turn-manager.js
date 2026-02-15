/**
 * Turn Manager Module - Pokemon TCG Pocket Simulator
 *
 * This module handles turn flow: draw cards, energy generation, turn end checks.
 * Based on T09 - Flujo de turnos básico (draw + energy)
 *
 * References:
 * - Flujo de turno: docs/rules/flujo-de-partida-y-turnos.md
 * - Energy Zone: docs/mechanics/energy-zone.md
 * - Primer turno: docs/rules/flujo-de-partida-y-turnos.md (diferencias)
 */
import { generateEnergy, processPokemonCheckup, checkWinCondition } from './game-state.js';
/**
 * Starts a new turn for the current player.
 * @param {Object} state - Current game state
 * @returns {Object} New state with turn started
 */
export function startTurn(state) {
    const newState = { ...state };
    const player = newState[newState.currentPlayer];
    // Reset turn flags for the player whose turn is starting
    player.supporterUsedThisTurn = false;
    player.retreatedThisTurn = false;
    player.energyZone.usedThisTurn = false;
    player.normalAttachUsedThisTurn = false;
    player.attackedThisTurn = false;
    // Energy Zone: shift next energy to current, generate new next energy
    if (player.energyZone.nextEnergy) {
        player.energyZone.currentEnergy = player.energyZone.nextEnergy;
    }
    player.energyZone.nextEnergy = generateEnergy(player.energyZone.configuredTypes);
    // Turn 1 of the player going first: NO draw card
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
        details: isFirstTurn ? 'Primer turno (no robo)' : `Turno ${newState.turn}`
    });
    return newState;
}
/**
 * Ends the current turn.
 * @param {Object} state - Current game state
 * @param {Function} getCardFn - Function to get card data by ID
 * @returns {Object} New state with turn ended
 */
export function endTurn(state, getCardFn) {
    let newState = { ...state };
    // Pokemon Checkup (process status effects at end of turn)
    newState = processPokemonCheckup(newState, getCardFn);
    // Check win condition after Checkup
    const winner = checkWinCondition(newState);
    if (winner) {
        newState.winner = winner;
        newState.log.push({
            timestamp: Date.now(),
            turn: newState.turn,
            player: winner,
            action: 'gameOver',
            details: `${winner} gana la partida`
        });
        return newState;
    }
    // Switch to opponent
    newState.currentPlayer = newState.currentPlayer === 'player1' ? 'player2' : 'player1';
    // Increment turn number
    newState.turn++;
    // Log turn end
    newState.log.push({
        timestamp: Date.now(),
        turn: newState.turn - 1,
        player: state.currentPlayer,
        action: 'endTurn',
        details: `Turno ${newState.turn - 1} finalizado`
    });
    return newState;
}
/**
 * Draws a card from the player's deck.
 * @param {Object} state - Current game state
 * @param {string} playerId - 'player1' or 'player2'
 * @returns {Object} New state with card drawn
 */
export function drawCard(state, playerId) {
    const newState = { ...state };
    const player = newState[playerId];
    // Check if deck is empty - no deck-out loss in Pocket
    if (!player.deck || player.deck.length === 0) {
        newState.log.push({
            timestamp: Date.now(),
            turn: newState.turn,
            player: playerId,
            action: 'drawCard',
            details: 'Deck vacío - no se puede robar'
        });
        return newState;
    }
    // Check hand limit (max 10)
    if (player.hand.length >= 10) {
        newState.log.push({
            timestamp: Date.now(),
            turn: newState.turn,
            player: playerId,
            action: 'drawCard',
            details: 'Mano llena (10 cartas) - no se puede robar'
        });
        return newState;
    }
    // Draw top card from deck
    const drawnCard = player.deck.shift();
    player.hand.push(drawnCard);
    newState.log.push({
        timestamp: Date.now(),
        turn: newState.turn,
        player: playerId,
        action: 'drawCard',
        details: `Robó 1 carta (deck: ${player.deck.length}, mano: ${player.hand.length})`
    });
    return newState;
}
/**
 * Checks if manual energy attachment is allowed on the current turn.
 * @param {Object} state - Current game state
 * @param {string} playerId - 'player1' or 'player2'
 * @returns {Object} { valid: boolean, reason: string }
 */
export function canAttachEnergy(state, playerId) {
    const player = state[playerId];
    if (!player)
        return { valid: false, reason: 'Invalid player' };
    // First turn: no manual energy attach for player going first
    if (state.turn === 0 && playerId === 'player1') {
        return { valid: false, reason: 'No energy attachment on first turn (going first)' };
    }
    // TODO-Pocket-Verify: Confirm if "first turn of the player" means turn 0 or their first turn
    // Baseline TCG: No energy attach on first turn going first only
    // Already used manual attach this turn
    if (player.normalAttachUsedThisTurn) {
        return { valid: false, reason: 'Already attached energy this turn' };
    }
    // No current energy to attach
    if (!player.energyZone.currentEnergy) {
        return { valid: false, reason: 'No energy available in Energy Zone' };
    }
    return { valid: true };
}
/**
 * Attaches energy from Energy Zone to a Pokemon.
 * @param {Object} state - Current game state
 * @param {string} playerId - 'player1' or 'player2'
 * @param {string} target - 'active' or bench index (0, 1, 2)
 * @returns {Object} { state: Object, valid: boolean, reason: string }
 */
export function attachEnergy(state, playerId, target) {
    const check = canAttachEnergy(state, playerId);
    if (!check.valid) {
        return { state, valid: false, reason: check.reason };
    }
    const newState = { ...state };
    const player = newState[playerId];
    const energyType = player.energyZone.currentEnergy;
    if (!energyType) {
        return { state, valid: false, reason: 'No energy available' };
    }
    // Determine target Pokemon
    let pokemon;
    if (target === 'active') {
        pokemon = player.active;
    }
    else if (typeof target === 'number' && target >= 0 && target < 3) {
        pokemon = player.bench[target];
    }
    if (!pokemon) {
        return { state, valid: false, reason: 'Target Pokemon not found' };
    }
    // Attach energy
    pokemon.energy.push(energyType);
    // Mark as used
    player.normalAttachUsedThisTurn = true;
    // Clear current energy from Energy Zone
    player.energyZone.currentEnergy = null;
    newState.log.push({
        timestamp: Date.now(),
        turn: newState.turn,
        player: playerId,
        action: 'attachEnergy',
        details: `Adjuntó ${getEnergyEmoji(energyType)} a ${target === 'active' ? 'Pokémon Activo' : `Banca slot ${target + 1}`}`
    });
    return { state: newState, valid: true };
}
/**
 * Returns emoji for energy type.
 * @param {string} energyType - Energy type abbreviation
 * @returns {string} Emoji
 */
function getEnergyEmoji(energyType) {
    const emojis = {
        'G': '🌿', // Grass
        'R': '🔥', // Fire
        'W': '💧', // Water
        'L': '⚡', // Lightning
        'P': '🟣', // Psychic
        'F': '🪨', // Fighting
        'D': '⚪', // Darkness
        'M': '🔵', // Metal
        'C': '⚪' // Colorless
    };
    return emojis[energyType] || energyType;
}
