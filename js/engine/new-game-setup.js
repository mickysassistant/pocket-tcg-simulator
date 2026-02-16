/**
 * New Game Setup Module
 *
 * Pure helper functions for building initial game state from deck presets.
 * These functions are designed to be testable without UI interaction.
 *
 * Key principles:
 * - Pure functions where possible (no side effects)
 * - Minimal and deterministic inputs
 * - Clear error messages for validation failures
 * - Matches documented behavior in SPEC.md Mode 2
 */

import { createInitialState, isValidState, validateState } from './game-state.js';
import { STATE_VERSION, MAX_BENCH, MAX_HAND } from './constants.js';

/**
 * Check whether a card is a Basic Pokemon.
 * Pure function - no side effects.
 *
 * @param {Object} card - Card object from card loader
 * @returns {boolean} True if card is a Basic Pokemon
 */
export function isBasicPokemonCard(card) {
    if (!card) return false;
    if (card.subtypes && card.subtypes.includes('Basic')) return true;
    if (card.stage === 'Basic' || card.stage === 0) return true;
    if (card.supertype === 'Pokémon' && !card.evolvesFrom) return true;
    return false;
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * Pure function - does not modify original array.
 *
 * @param {Array} arr - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * Build a player's state from a deck preset.
 *
 * This function implements Mode 2 behavior from SPEC.md:
 * - Deck is shuffled using Fisher-Yates algorithm
 * - First Basic Pokemon in shuffled deck is placed in active spot
 * - Up to 3 additional Basic Pokemon are placed on bench
 * - Exactly 5 cards are dealt to hand
 * - Remaining cards stay in deck
 *
 * @param {Object} preset - Deck preset object with deck array and energyTypes
 * @param {Function} cardLookup - Function to get card by ID (getCard)
 * @param {number} [turnPlayed=0] - Turn number when Pokemon were played
 * @param {Object} [options={}] - Optional configuration
 * @param {boolean} [options.validateCards=true] - Whether to validate card existence
 * @returns {Object} Player state object
 * @throws {Error} If validation fails or no Basic Pokemon found
 */
export function buildPlayerFromPreset(preset, cardLookup, turnPlayed = 0, options = {}) {
    const { validateCards = true } = options;

    // Validate preset structure
    if (!preset || typeof preset !== 'object') {
        throw new Error('Invalid preset: must be an object');
    }
    if (!Array.isArray(preset.deck)) {
        throw new Error('Invalid preset: deck must be an array');
    }
    if (preset.deck.length !== 20) {
        throw new Error(`Invalid preset: deck must contain exactly 20 cards, got ${preset.deck.length}`);
    }

    // Validate cards exist if requested
    if (validateCards && cardLookup) {
        const missingCards = preset.deck.filter(cardId => !cardLookup(cardId));
        if (missingCards.length > 0) {
            throw new Error(`Invalid preset: missing cards ${missingCards.join(', ')}`);
        }
    }

    // Shuffle deck (Fisher-Yates)
    const shuffledDeck = shuffleArray(preset.deck);

    // Find all Basic Pokemon with their original indices
    const basicIndices = shuffledDeck
        .map((cardId, idx) => ({ cardId, idx, card: cardLookup ? cardLookup(cardId) : null }))
        .filter(entry => isBasicPokemonCard(entry.card));

    // Must have at least 1 Basic Pokemon for active spot
    if (basicIndices.length === 0) {
        throw new Error('Invalid preset: deck must contain at least 1 Basic Pokemon');
    }

    // Select first Basic Pokemon for active spot
    const activePick = basicIndices[0];
    const remainingAfterActive = shuffledDeck.filter((_, idx) => idx !== activePick.idx);

    // Select up to 3 Basic Pokemon for bench
    const bench = [];
    const benchCandidates = remainingAfterActive
        .map((cardId, idx) => ({ cardId, idx, card: cardLookup ? cardLookup(cardId) : null }))
        .filter(entry => isBasicPokemonCard(entry.card));

    const benchIndicesToRemove = [];
    for (let i = 0; i < Math.min(3, benchCandidates.length); i++) {
        const candidate = benchCandidates[i];
        bench.push({
            cardId: candidate.cardId,
            currentHp: candidate.card.hp,
            energy: [],
            status: null,
            turnPlayed
        });
        benchIndicesToRemove.push(candidate.idx);
    }

    // Remove bench cards from deck
    const deckAfterSetup = remainingAfterActive.filter((_, idx) => !benchIndicesToRemove.includes(idx));

    // Deal exactly 5 cards to hand
    const hand = deckAfterSetup.slice(0, Math.min(5, deckAfterSetup.length));
    const deck = deckAfterSetup.slice(hand.length);

    // Build player state
    return {
        points: 0,
        active: {
            cardId: activePick.cardId,
            currentHp: activePick.card.hp,
            energy: [],
            status: null,
            turnPlayed
        },
        bench,
        hand,
        deck,
        discard: [],
        energyZone: {
            currentEnergy: preset.energyTypes[0] || null,
            nextEnergy: preset.energyTypes[1] || preset.energyTypes[0] || null,
            configuredTypes: [...(preset.energyTypes || [])],
            usedThisTurn: false
        },
        supporterUsedThisTurn: false,
        retreatedThisTurn: false,
        normalAttachUsedThisTurn: false,
        attackedThisTurn: false
    };
}

/**
 * Build complete game state from two deck presets.
 *
 * This function creates a new game state following Mode 2 from SPEC.md:
 * - Turn 1, player1 goes first
 * - Both players built from their presets
 * - No points scored yet
 * - Stadium is null
 * - Log includes initial entry
 *
 * @param {Object} preset1 - Deck preset for player 1
 * @param {Object} preset2 - Deck preset for player 2
 * @param {Function} cardLookup - Function to get card by ID (getCard)
 * @returns {Object} Complete game state
 * @throws {Error} If validation fails
 */
export function buildNewGameState(preset1, preset2, cardLookup) {
    // Build players from presets
    const player1 = buildPlayerFromPreset(preset1, cardLookup, 0);
    const player2 = buildPlayerFromPreset(preset2, cardLookup, 0);

    // Create initial empty state (includes version, coinQueue, etc.)
    const newState = createInitialState();

    // Override with new game values (preserve version from initialState)
    newState.name = 'New game from presets';
    newState.description = `${preset1.name || 'Player 1'} vs ${preset2.name || 'Player 2'}`;
    newState.turn = 1;
    newState.currentPlayer = 'player1';
    newState.player1 = player1;
    newState.player2 = player2;
    newState.log = [
        {
            timestamp: Date.now(),
            turn: 1,
            player: 'system',
            action: 'gameStart',
            details: `New game started: ${preset1.name} vs ${preset2.name}`
        }
    ];

    // Ensure version is set (should be preserved from createInitialState, but be explicit)
    newState.version = STATE_VERSION;

    // Validate the new state
    if (!isValidState(newState)) {
        const validation = validateState(newState);
        throw new Error(`Generated game state failed validation: ${validation.errors.join(', ')}`);
    }

    return newState;
}
