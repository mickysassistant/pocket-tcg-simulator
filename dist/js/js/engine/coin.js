/**
 * Coin System - Pokemon TCG Pocket Simulator
 *
 * Pre-generated coin queue that can be edited by the user.
 * Coins are consumed left-to-right. When empty, auto-regenerates.
 */
import { DEFAULT_COIN_QUEUE_SIZE } from './constants.js';
/**
 * Generates an array of random coin flips.
 * @param {number} [count=DEFAULT_COIN_QUEUE_SIZE] - Number of coins to generate
 * @returns {boolean[]} Array where true = heads, false = tails
 */
export function generateCoins(count = DEFAULT_COIN_QUEUE_SIZE) {
    return Array.from({ length: count }, () => Math.random() < 0.5);
}
/**
 * Flips the next coin from the queue.
 * If the queue is empty, auto-regenerates a new batch.
 *
 * @param {Object} state - Current game state (mutated in-place)
 * @returns {boolean} true = heads, false = tails
 */
export function flipCoin(state) {
    if (!state.coinQueue || state.coinQueue.length === 0) {
        state.coinQueue = generateCoins();
    }
    const result = state.coinQueue.shift();
    // Log the flip if state has a log array
    if (Array.isArray(state.log)) {
        state.log.push({
            timestamp: Date.now(),
            turn: state.turn ?? 0,
            player: state.currentPlayer ?? null,
            action: 'coinFlip',
            result: result,
            details: result ? 'Heads 🪙' : 'Tails ✖️'
        });
    }
    return result;
}
/**
 * Flips the next coin from the queue and returns the result.
 * Returns the result and the mutated queue for use in functional code.
 *
 * @param {Object} state - Current game state (cloned internally)
 * @returns {{result: boolean, coinQueue: boolean[]}} Object containing flip result and new queue
 */
export function flipCoinWithLog(state) {
    const newCoinQueue = [...state.coinQueue];
    if (newCoinQueue.length === 0) {
        newCoinQueue.push(...generateCoins());
    }
    const result = newCoinQueue.shift();
    return { result, coinQueue: newCoinQueue };
}
/**
 * Flips multiple coins from the queue.
 *
 * @param {Object} state - Current game state (mutated in-place)
 * @param {number} count - Number of coins to flip
 * @returns {boolean[]} Array of results (true = heads, false = tails)
 */
export function flipCoins(state, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(flipCoin(state));
    }
    return results;
}
/**
 * Edits a specific coin in the queue.
 *
 * @param {Object} state - Current game state (mutated in-place)
 * @param {number} index - Index of the coin to edit (0-based)
 * @param {boolean} value - New value (true = heads, false = tails)
 */
export function editCoin(state, index, value) {
    if (index >= 0 && index < state.coinQueue.length) {
        state.coinQueue[index] = value;
    }
}
/**
 * Toggles a specific coin in the queue (heads↔tails).
 *
 * @param {Object} state - Current game state (mutated in-place)
 * @param {number} index - Index of the coin to toggle (0-based)
 */
export function toggleCoin(state, index) {
    if (index >= 0 && index < state.coinQueue.length) {
        state.coinQueue[index] = !state.coinQueue[index];
    }
}
/**
 * Replaces the entire coin queue with fresh random coins.
 *
 * @param {Object} state - Current game state (mutated in-place)
 * @param {number} [count=DEFAULT_COIN_QUEUE_SIZE] - Number of coins
 */
export function refillCoins(state, count = DEFAULT_COIN_QUEUE_SIZE) {
    state.coinQueue = generateCoins(count);
}
/**
 * Returns the number of remaining coins in the queue.
 *
 * @param {Object} state - Current game state
 * @returns {number} Number of coins remaining
 */
export function remainingCoins(state) {
    return (state.coinQueue || []).length;
}
/**
 * Returns a copy of the current coin queue (for display purposes).
 *
 * @param {Object} state - Current game state
 * @returns {boolean[]} Copy of the coin queue
 */
export function getQueue(state) {
    return [...(state.coinQueue || [])];
}
