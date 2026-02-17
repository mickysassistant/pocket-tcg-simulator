/**
 * Seeded Random Number Generator
 * 
 * Provides deterministic random number generation based on a seed.
 * Uses a simple but effective algorithm (Mulberry32) for reproducible results.
 */

class SeededRNG {
  /**
   * Create a new seeded RNG instance
   * @param {string|number} seed - The seed value (string or number)
   */
  constructor(seed) {
    // Convert seed to a number
    if (typeof seed === 'string') {
      // Simple string hash to number
      this.seed = this._hashString(seed);
    } else {
      this.seed = seed >>> 0; // Convert to unsigned 32-bit integer
    }
    this.state = this.seed;
  }

  /**
   * Simple hash function for strings
   * @param {string} str - String to hash
   * @returns {number} Hash value as unsigned 32-bit integer
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash >>> 0; // Convert to unsigned 32-bit integer
    }
    return hash;
  }

  /**
   * Get the next random number in the sequence (0 to 1, exclusive of 1)
   * Uses Mulberry32 algorithm
   * @returns {number} Random number between 0 (inclusive) and 1 (exclusive)
   */
  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Get a random integer in range [min, max]
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random integer in range
   */
  randomInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Pick a random element from an array
   * @param {Array} array - Array to pick from
   * @returns {*} Random element
   */
  pick(array) {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Shuffle an array in place (Fisher-Yates with seeded RNG)
   * @param {Array} array - Array to shuffle
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Reset the RNG to its initial seed state
   */
  reset() {
    this.state = this.seed;
  }

  /**
   * Get the current seed value
   * @returns {number} The seed value
   */
  getSeed() {
    return this.seed;
  }
}

/**
 * Coin Queue Manager
 * 
 * Provides configurable coin flip sequences for deterministic gameplay.
 * If a queue is provided, coin flips use the queue values.
 * If no queue is provided, uses the seeded RNG.
 */
class CoinQueue {
  /**
   * Create a new coin queue manager
   * @param {Array|null} queue - Array of coin flip results (true=heads, false=tails), or null for RNG
   * @param {SeededRNG} rng - Seeded RNG instance (required if queue is null)
   */
  constructor(queue = null, rng = null) {
    this.queue = queue ? [...queue] : null;
    this.currentIndex = 0;
    this.rng = rng;
  }

  /**
   * Flip a coin
   * @returns {boolean} true for heads, false for tails
   */
  flip() {
    // If queue is provided, use queue values
    if (this.queue !== null) {
      if (this.currentIndex >= this.queue.length) {
        throw new Error('Coin queue exhausted. Provide more coin flip results or use RNG mode.');
      }
      const result = this.queue[this.currentIndex];
      this.currentIndex++;
      return result;
    }

    // Otherwise, use RNG
    if (!this.rng) {
      throw new Error('Coin queue requires either a queue or an RNG instance.');
    }
    return this.rng.next() >= 0.5;
  }

  /**
   * Peek at the next coin flip result without consuming it
   * @returns {boolean} Next coin flip result
   */
  peek() {
    if (this.queue !== null) {
      if (this.currentIndex >= this.queue.length) {
        throw new Error('Coin queue exhausted.');
      }
      return this.queue[this.currentIndex];
    }

    if (!this.rng) {
      throw new Error('Coin queue requires either a queue or an RNG instance.');
    }
    return this.rng.next() >= 0.5;
  }

  /**
   * Get the number of remaining coin flips in the queue
   * @returns {number} Number of remaining flips (null if using RNG)
   */
  remaining() {
    if (this.queue !== null) {
      return this.queue.length - this.currentIndex;
    }
    return null; // Unlimited when using RNG
  }

  /**
   * Reset the coin queue to the beginning
   */
  reset() {
    this.currentIndex = 0;
  }

  /**
   * Get the current queue (copy of remaining values)
   * @returns {Array|null} Copy of remaining queue values, or null if using RNG
   */
  getQueue() {
    if (this.queue !== null) {
      return [...this.queue.slice(this.currentIndex)];
    }
    return null;
  }
}

module.exports = {
  SeededRNG,
  CoinQueue
};
