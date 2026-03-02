/**
 * Temporary Effects System - Manages temporary effects applied to Pokémon after attacks
 *
 * This file implements the temporary effects system for Pocket TCG Simulator.
 * Temporary effects are applied to a defending Pokémon as part of an attack's
 * resolution, and they last for a limited number of turns.
 *
 * GAP-014: [Importante][C2] Efectos temporales sobre el defensor (Vulpix (Tail Whip))
 *
 * Supported effect types:
 * - cannot_attack:      The Pokémon cannot use attacks for the duration.
 * - damage_reduction:   The Pokémon's attacks deal less damage for the duration.
 *                       (outgoing damage penalty — reduces damage the Pokémon *deals*)
 *
 * Real-card examples:
 * - Vulpix (Tail Whip):        Flip a coin. If heads, the opponent's Active Pokémon can't
 *                               attack during the opponent's next turn.
 * - Mr. Mime (Barrier Attack): The opponent's Active Pokémon can't attack during
 *                               the opponent's next turn.
 * - Clefable (Moonblast):      The opponent's Active Pokémon does -20 damage during
 *                               the opponent's next turn.
 *
 * Lifecycle:
 * - Effects are applied with a `turnsRemaining` counter (default: 1).
 * - `advanceTurn()` must be called at turn end to decrement counters and expire effects.
 * - `clearEffectsForPokemon()` removes all effects from a Pokémon immediately (used
 *   when the Pokémon switches out or evolves).
 * - `clearAll()` removes all effects (used for game reset).
 *
 * Effect definitions (temporaryDefenderEffect in attack objects):
 * {
 *   type: 'cannot_attack' | 'damage_reduction',
 *   value?: number,          // damage_reduction amount (e.g. 20)
 *   duration?: number,       // turns remaining (default: 1)
 *   requiresCoinFlip?: bool, // if true, effect only applied on coin heads
 *   sourceName?: string      // name of the attack/ability that caused this effect
 * }
 *
 * Attack integration (in attack definitions):
 * {
 *   name: 'Tail Whip',
 *   damage: 20,
 *   temporaryDefenderEffect: {
 *     type: 'cannot_attack',
 *     duration: 1,
 *     requiresCoinFlip: true   // Tail Whip requires heads to apply
 *   }
 * }
 */

'use strict';

/** Recognised temporary effect types (canonical strings). */
const TEMPORARY_EFFECT_TYPES = Object.freeze({
  CANNOT_ATTACK: 'cannot_attack',
  DAMAGE_REDUCTION: 'damage_reduction'
});

class TemporaryEffectsSystem {
  /**
   * @param {Object} gameState - GameState instance
   */
  constructor(gameState) {
    this.gameState = gameState;
    /** @type {Map<string, Array>} `${playerId}:${pokemonId}` -> array of effect objects */
    this._effects = new Map();
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  _key(playerId, pokemonId) {
    return `${playerId}:${pokemonId}`;
  }

  // ---------------------------------------------------------------------------
  // Apply Effects
  // ---------------------------------------------------------------------------

  /**
   * Apply a temporary effect to a Pokémon.
   *
   * If `requiresCoinFlip` is true, a coin is flipped (or the provided
   * `coinFlip` function is called). On tails the effect is NOT applied.
   *
   * @param {string} playerId    - ID of the player who owns the target Pokémon
   * @param {string} pokemonId   - ID of the target Pokémon
   * @param {Object} effectDef   - Effect definition
   * @param {string} effectDef.type            - 'cannot_attack' or 'damage_reduction'
   * @param {number} [effectDef.value]         - Numeric value (for damage_reduction: amount)
   * @param {number} [effectDef.duration]      - Turns remaining (default: 1)
   * @param {boolean} [effectDef.requiresCoinFlip] - Whether a coin flip is needed
   * @param {string} [effectDef.sourceName]    - Name of the source attack/ability
   * @param {Function} [coinFlip]              - Optional deterministic coin-flip function
   *                                             for testing; defaults to random
   * @returns {{ applied: boolean, coinFlipResult?: string }} Result object
   */
  applyEffect(playerId, pokemonId, effectDef, coinFlip = null) {
    const flipFn = coinFlip || (() => Math.random() < 0.5);

    let coinFlipResult = null;

    // Handle optional coin flip gate
    if (effectDef.requiresCoinFlip) {
      const heads = flipFn();
      coinFlipResult = heads ? 'heads' : 'tails';

      if (!heads) {
        // Tails — effect is NOT applied
        this.gameState.turnLog.push({
          type: 'temporary_effect_failed_coin_flip',
          playerId,
          pokemonId,
          effectType: effectDef.type,
          coinFlip: 'tails',
          sourceName: effectDef.sourceName || null
        });
        return { applied: false, coinFlipResult: 'tails' };
      }
    }

    const key = this._key(playerId, pokemonId);
    const effects = this._effects.get(key) || [];

    const effect = {
      type: effectDef.type,
      value: effectDef.value || 0,
      turnsRemaining: effectDef.duration || 1,
      sourceName: effectDef.sourceName || null
    };

    effects.push(effect);
    this._effects.set(key, effects);

    this.gameState.turnLog.push({
      type: 'temporary_effect_applied',
      playerId,
      pokemonId,
      effectType: effect.type,
      value: effect.value,
      turnsRemaining: effect.turnsRemaining,
      sourceName: effect.sourceName,
      coinFlip: coinFlipResult
    });

    return { applied: true, coinFlipResult };
  }

  // ---------------------------------------------------------------------------
  // Query Effects
  // ---------------------------------------------------------------------------

  /**
   * Check whether a Pokémon is currently prevented from attacking.
   *
   * @param {string} playerId  - Player who owns the attacking Pokémon
   * @param {string} pokemonId - ID of the attacking Pokémon
   * @returns {boolean}
   */
  cannotAttack(playerId, pokemonId) {
    const key = this._key(playerId, pokemonId);
    const effects = this._effects.get(key) || [];
    return effects.some(
      e => e.type === TEMPORARY_EFFECT_TYPES.CANNOT_ATTACK && e.turnsRemaining > 0
    );
  }

  /**
   * Get the total outgoing damage reduction from temporary effects on an attacking Pokémon.
   *
   * This is used to penalise a debuffed attacker's damage output.
   *
   * @param {string} playerId  - Player who owns the attacking Pokémon
   * @param {string} pokemonId - ID of the attacking Pokémon
   * @returns {number} Total damage reduction to subtract from the attack
   */
  getOutgoingDamageReduction(playerId, pokemonId) {
    const key = this._key(playerId, pokemonId);
    const effects = this._effects.get(key) || [];
    return effects
      .filter(e => e.type === TEMPORARY_EFFECT_TYPES.DAMAGE_REDUCTION && e.turnsRemaining > 0)
      .reduce((sum, e) => sum + e.value, 0);
  }

  /**
   * Get all active effects for a Pokémon.
   *
   * @param {string} playerId
   * @param {string} pokemonId
   * @returns {Array} Copy of the effects array
   */
  getEffects(playerId, pokemonId) {
    const key = this._key(playerId, pokemonId);
    return (this._effects.get(key) || []).slice();
  }

  /**
   * Check if a Pokémon has any active temporary effects.
   *
   * @param {string} playerId
   * @param {string} pokemonId
   * @returns {boolean}
   */
  hasEffects(playerId, pokemonId) {
    const effects = this.getEffects(playerId, pokemonId);
    return effects.length > 0;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle: Clear & Advance
  // ---------------------------------------------------------------------------

  /**
   * Clear all temporary effects for a specific Pokémon.
   *
   * Call this when a Pokémon:
   * - Switches out (retreats from Active Spot to Bench)
   * - Evolves
   * - Is knocked out
   *
   * @param {string} playerId
   * @param {string} pokemonId
   * @param {string} [reason] - Reason string for logging ('switch' | 'evolve' | 'ko')
   */
  clearEffectsForPokemon(playerId, pokemonId, reason = 'switch') {
    const key = this._key(playerId, pokemonId);
    if (this._effects.has(key)) {
      this._effects.delete(key);
      this.gameState.turnLog.push({
        type: 'temporary_effects_cleared',
        playerId,
        pokemonId,
        reason
      });
    }
  }

  /**
   * Advance the turn — decrement all turn counters and remove expired effects.
   *
   * This should be called once at the end of each player's turn (or the start
   * of the next player's turn). Typically called from TurnManager.
   *
   * When `turnsRemaining` reaches 0, the effect expires and is removed.
   */
  advanceTurn() {
    for (const [key, effects] of this._effects.entries()) {
      const remaining = effects
        .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
        .filter(e => e.turnsRemaining > 0);

      if (remaining.length === 0) {
        this._effects.delete(key);
      } else {
        this._effects.set(key, remaining);
      }
    }
  }

  /**
   * Clear all temporary effects (game reset / new game).
   */
  clearAll() {
    this._effects.clear();
  }
}

module.exports = { TemporaryEffectsSystem, TEMPORARY_EFFECT_TYPES };
