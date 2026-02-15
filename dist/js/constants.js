"use strict";
/**
 * Game Constants - Pokemon TCG Pocket Simulator
 *
 * This module contains all the constant values used throughout the game engine.
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_VERSION = exports.MAX_CONFIGURED_ENERGY_TYPES = exports.DEFAULT_COIN_QUEUE_SIZE = exports.STARTING_HAND_SIZE = exports.KO_POINTS = exports.STATUS_DAMAGE = exports.STATUS_CHECKUP_ORDER = exports.STATUS = exports.ENERGY_TYPES = exports.TURN_LIMIT = exports.POINTS_TO_WIN = exports.MAX_COPIES_PER_CARD = exports.DECK_SIZE = exports.MAX_HAND = exports.MAX_BENCH = void 0;
/**
 * Maximum number of Pokemon allowed on the bench.
 */
exports.MAX_BENCH = 3;
/**
 * Maximum number of cards allowed in hand.
 */
exports.MAX_HAND = 10;
/**
 * Standard deck size for Pokemon TCG Pocket.
 */
exports.DECK_SIZE = 20;
/**
 * Maximum copies of a single card allowed in deck.
 */
exports.MAX_COPIES_PER_CARD = 2;
/**
 * Number of points required to win the game.
 */
exports.POINTS_TO_WIN = 3;
/**
 * Maximum number of turns before the game ends in a tie.
 */
exports.TURN_LIMIT = 30;
/**
 * Energy type codes mapped to their full names.
 */
exports.ENERGY_TYPES = {
    G: 'Grass',
    R: 'Fire',
    W: 'Water',
    L: 'Lightning',
    P: 'Psychic',
    F: 'Fighting',
    D: 'Darkness',
    M: 'Metal',
    C: 'Colorless'
};
/**
 * Status effect constants.
 */
exports.STATUS = {
    POISON: 'poison',
    POISON_PLUS: 'poison+', // TODO-Pocket-Verify: Verify "poison+" (toxic) naming
    BURN: 'burn',
    SLEEP: 'sleep',
    PARALYSIS: 'paralysis',
    CONFUSION: 'confusion'
};
/**
 * Status effect order for Pokemon Checkup resolution.
 */
exports.STATUS_CHECKUP_ORDER = [
    exports.STATUS.POISON,
    exports.STATUS.POISON_PLUS,
    exports.STATUS.BURN,
    exports.STATUS.SLEEP,
    exports.STATUS.PARALYSIS
];
/**
 * Damage values for status effects.
 */
exports.STATUS_DAMAGE = (_a = {},
    _a[exports.STATUS.POISON] = 10,
    _a[exports.STATUS.POISON_PLUS] = 20,
    _a[exports.STATUS.BURN] = 20,
    _a);
/**
 * Points awarded for KO'ing different Pokemon types.
 */
exports.KO_POINTS = {
    NORMAL: 1,
    EX: 2
};
/**
 * Number of starting cards in hand.
 */
exports.STARTING_HAND_SIZE = 5;
/**
 * Default number of coins to pre-generate for the coin queue.
 */
exports.DEFAULT_COIN_QUEUE_SIZE = 10;
/**
 * Maximum number of configured energy types for Energy Zone.
 */
exports.MAX_CONFIGURED_ENERGY_TYPES = 3;
/**
 * Current schema version for game state serialization.
 * Used for future compatibility when state structure changes.
 */
exports.STATE_VERSION = 1;
