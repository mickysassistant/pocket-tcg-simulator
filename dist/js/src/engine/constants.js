/**
 * Game Constants - Pokemon TCG Pocket Simulator
 *
 * This module contains all the constant values used throughout the game engine.
 */
/**
 * Maximum number of Pokemon allowed on the bench.
 */
export const MAX_BENCH = 3;
/**
 * Maximum number of cards allowed in hand.
 */
export const MAX_HAND = 10;
/**
 * Standard deck size for Pokemon TCG Pocket.
 */
export const DECK_SIZE = 20;
/**
 * Maximum copies of a single card allowed in deck.
 */
export const MAX_COPIES_PER_CARD = 2;
/**
 * Number of points required to win the game.
 */
export const POINTS_TO_WIN = 3;
/**
 * Maximum number of turns before the game ends in a tie.
 */
export const TURN_LIMIT = 30;
/**
 * Energy type codes mapped to their full names.
 */
export const ENERGY_TYPES = {
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
export const STATUS = {
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
export const STATUS_CHECKUP_ORDER = [
    STATUS.POISON,
    STATUS.POISON_PLUS,
    STATUS.BURN,
    STATUS.SLEEP,
    STATUS.PARALYSIS
];
/**
 * Damage values for status effects.
 */
export const STATUS_DAMAGE = {
    [STATUS.POISON]: 10,
    [STATUS.POISON_PLUS]: 20, // TODO-Pocket-Verify: Verify Poison+ (toxic) deals 20 damage
    [STATUS.BURN]: 20
};
/**
 * Points awarded for KO'ing different Pokemon types.
 */
export const KO_POINTS = {
    NORMAL: 1,
    EX: 2
};
/**
 * Number of starting cards in hand.
 */
export const STARTING_HAND_SIZE = 5;
/**
 * Default number of coins to pre-generate for the coin queue.
 */
export const DEFAULT_COIN_QUEUE_SIZE = 10;
/**
 * Maximum number of configured energy types for Energy Zone.
 */
export const MAX_CONFIGURED_ENERGY_TYPES = 3;
/**
 * Current schema version for game state serialization.
 * Used for future compatibility when state structure changes.
 */
export const STATE_VERSION = 1;
