/**
 * Status Condition System - Manages special conditions on Pokémon
 *
 * This file implements the status condition (special condition) system for
 * Pocket TCG Simulator. Special conditions are: Poison, Sleep, Paralyzed,
 * Confused, and Burned.
 *
 * GAP-003: [Crítico][C1] Inmunidad a Special Conditions (Arceus ex (Fabled Luster))
 *
 * Key rule: Before applying any special condition, the system checks whether
 * the target Pokémon has an immunity granted by its ability (or an ability of
 * another Pokémon in play). If immune, the condition is silently rejected.
 *
 * Special Conditions:
 * - POISONED    - Pokémon takes 10 damage between turns
 * - BURNED      - Pokémon takes 20 damage between turns; flip coin each turn — tails removes Burn
 * - SLEEP       - Can't attack or retreat; flip coin at end of turn — heads wakes up
 * - PARALYZED   - Can't attack or retreat for one full turn; auto-removed after
 * - CONFUSED    - Flip coin when attacking — tails the attack damages the attacker instead
 *
 * Only one special condition can be active at a time (applying a new one
 * replaces the existing one, unless the Pokémon is immune).
 *
 * Integration:
 * - AbilitySystem.isImmuneToSpecialConditions(playerId, pokemonId) is called
 *   to check immunity before applying any condition.
 */

/** Recognised condition names (canonical lowercase strings). */
const SPECIAL_CONDITIONS = Object.freeze({
  POISONED: 'poisoned',
  BURNED: 'burned',
  SLEEP: 'asleep',
  PARALYZED: 'paralyzed',
  CONFUSED: 'confused'
});

class StatusConditionSystem {
  /**
   * @param {Object} gameState    - GameState instance
   * @param {Object} abilitySystem - AbilitySystem instance (for immunity checks)
   */
  constructor(gameState, abilitySystem) {
    this.gameState = gameState;
    this.abilitySystem = abilitySystem;
  }

  // ---------------------------------------------------------------------------
  // Apply / Remove
  // ---------------------------------------------------------------------------

  /**
   * Attempt to apply a special condition to a Pokémon.
   *
   * Returns true if the condition was applied; false if the Pokémon is immune
   * or the condition name is invalid.
   *
   * @param {string} targetPlayerId - 'player1' or 'player2'
   * @param {string} targetPokemonId - Pokémon ID on that player's side
   * @param {string} condition - One of the SPECIAL_CONDITIONS values
   * @returns {{ applied: boolean, reason?: string }}
   */
  applyCondition(targetPlayerId, targetPokemonId, condition) {
    const normalised = condition.toLowerCase();
    if (!Object.values(SPECIAL_CONDITIONS).includes(normalised)) {
      return { applied: false, reason: `Unknown special condition: ${condition}` };
    }

    // Immunity check — delegate to AbilitySystem
    if (this.abilitySystem &&
        this.abilitySystem.isImmuneToSpecialConditions(targetPlayerId, targetPokemonId)) {
      this._logEvent('condition_blocked', targetPlayerId, targetPokemonId, normalised, 'immune');
      return { applied: false, reason: 'immune' };
    }

    const pokemon = this._getPokemon(targetPlayerId, targetPokemonId);
    if (!pokemon) {
      return { applied: false, reason: `Pokémon ${targetPokemonId} not found for ${targetPlayerId}` };
    }

    // Only one special condition at a time — new condition replaces old one
    pokemon.specialCondition = normalised;

    this._logEvent('condition_applied', targetPlayerId, targetPokemonId, normalised);
    return { applied: true };
  }

  /**
   * Remove the special condition from a Pokémon (e.g., retreat, healing).
   *
   * @param {string} targetPlayerId
   * @param {string} targetPokemonId
   */
  removeCondition(targetPlayerId, targetPokemonId) {
    const pokemon = this._getPokemon(targetPlayerId, targetPokemonId);
    if (pokemon && pokemon.specialCondition) {
      const removed = pokemon.specialCondition;
      pokemon.specialCondition = null;
      this._logEvent('condition_removed', targetPlayerId, targetPokemonId, removed);
    }
  }

  /**
   * Get the current special condition of a Pokémon, or null if none.
   *
   * @param {string} targetPlayerId
   * @param {string} targetPokemonId
   * @returns {string|null}
   */
  getCondition(targetPlayerId, targetPokemonId) {
    const pokemon = this._getPokemon(targetPlayerId, targetPokemonId);
    if (!pokemon) return null;
    return pokemon.specialCondition || null;
  }

  /**
   * Check if a Pokémon currently has a specific special condition.
   *
   * @param {string} targetPlayerId
   * @param {string} targetPokemonId
   * @param {string} condition
   * @returns {boolean}
   */
  hasCondition(targetPlayerId, targetPokemonId, condition) {
    return this.getCondition(targetPlayerId, targetPokemonId) === condition.toLowerCase();
  }

  // ---------------------------------------------------------------------------
  // Between-Turn Effects
  // ---------------------------------------------------------------------------

  /**
   * Apply between-turn effects for a player's active Pokémon.
   * Called at the end of the defending player's turn (after their actions).
   *
   * Effects applied:
   * - POISONED: deal 10 damage to active Pokémon
   * - BURNED: deal 20 damage; flip coin (or simulate) — tails removes Burn
   * - PARALYZED: auto-remove after one full turn
   *
   * @param {string} playerId - Player whose Pokémon suffers between-turn effects
   * @param {Function} [coinFlip] - Optional deterministic coin-flip fn for tests; defaults to random
   * @returns {Object} Summary of effects applied
   */
  applyBetweenTurnEffects(playerId, coinFlip = () => Math.random() < 0.5) {
    const player = this.gameState.players[playerId];
    if (!player || !player.activePokemon) return {};

    const pokemon = player.activePokemon;
    const condition = pokemon.specialCondition;
    const result = { condition, effects: [] };

    if (!condition) return result;

    const pokemonId = pokemon.id;

    if (condition === SPECIAL_CONDITIONS.POISONED) {
      this._dealConditionDamage(pokemon, 10);
      result.effects.push({ type: 'damage', amount: 10 });
    }

    if (condition === SPECIAL_CONDITIONS.BURNED) {
      this._dealConditionDamage(pokemon, 20);
      result.effects.push({ type: 'damage', amount: 20 });
      // Flip coin: heads → Burn removed
      const heads = coinFlip();
      if (heads) {
        this.removeCondition(playerId, pokemonId);
        result.effects.push({ type: 'burn_removed', coinResult: 'heads' });
      } else {
        result.effects.push({ type: 'burn_stays', coinResult: 'tails' });
      }
    }

    if (condition === SPECIAL_CONDITIONS.PARALYZED) {
      // Paralyzed is removed after one full turn has elapsed
      this.removeCondition(playerId, pokemonId);
      result.effects.push({ type: 'paralysis_removed' });
    }

    return result;
  }

  /**
   * Check if a Pokémon's special condition prevents it from attacking.
   * (Sleep, Paralyzed)
   *
   * @param {string} targetPlayerId
   * @param {string} targetPokemonId
   * @returns {{ canAttack: boolean, reason?: string }}
   */
  canAttack(targetPlayerId, targetPokemonId) {
    const condition = this.getCondition(targetPlayerId, targetPokemonId);
    if (condition === SPECIAL_CONDITIONS.SLEEP) {
      return { canAttack: false, reason: 'asleep' };
    }
    if (condition === SPECIAL_CONDITIONS.PARALYZED) {
      return { canAttack: false, reason: 'paralyzed' };
    }
    return { canAttack: true };
  }

  /**
   * Check if a Pokémon's special condition prevents it from retreating.
   * (Sleep, Paralyzed)
   *
   * @param {string} targetPlayerId
   * @param {string} targetPokemonId
   * @returns {{ canRetreat: boolean, reason?: string }}
   */
  canRetreat(targetPlayerId, targetPokemonId) {
    const condition = this.getCondition(targetPlayerId, targetPokemonId);
    if (condition === SPECIAL_CONDITIONS.SLEEP) {
      return { canRetreat: false, reason: 'asleep' };
    }
    if (condition === SPECIAL_CONDITIONS.PARALYZED) {
      return { canRetreat: false, reason: 'paralyzed' };
    }
    return { canRetreat: true };
  }

  /**
   * Handle attacking when Confused: flip coin. Tails → attack hits self.
   *
   * If the attacker is Confused, this method handles the confusion effect.
   * Returns the effective damage direction and amount.
   *
   * @param {string} attackingPlayerId
   * @param {string} attackingPokemonId
   * @param {number} attackDamage - The attack's base damage
   * @param {Function} [coinFlip] - Optional coin flip override
   * @returns {{ selfHit: boolean, selfDamage?: number, coinResult: string }}
   */
  handleConfusion(attackingPlayerId, attackingPokemonId, attackDamage, coinFlip = () => Math.random() < 0.5) {
    if (!this.hasCondition(attackingPlayerId, attackingPokemonId, SPECIAL_CONDITIONS.CONFUSED)) {
      return { selfHit: false };
    }

    const heads = coinFlip();
    if (heads) {
      // Attack proceeds normally
      return { selfHit: false, coinResult: 'heads' };
    } else {
      // Self-hit: deal 30 damage to self (Pocket TCG rule for Confusion)
      const selfDamage = 30;
      const pokemon = this._getPokemon(attackingPlayerId, attackingPokemonId);
      if (pokemon) {
        if (pokemon.currentHp === undefined || pokemon.currentHp === null) {
          pokemon.currentHp = pokemon.hp || 0;
        }
        pokemon.currentHp = Math.max(0, pokemon.currentHp - selfDamage);
      }
      return { selfHit: true, selfDamage, coinResult: 'tails' };
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** @private */
  _getPokemon(playerId, pokemonId) {
    const player = this.gameState.players[playerId];
    if (!player) return null;

    if (player.activePokemon && player.activePokemon.id === pokemonId) {
      return player.activePokemon;
    }

    if (player.banque) {
      for (const p of player.banque) {
        if (p && p.id === pokemonId) return p;
      }
    }

    return null;
  }

  /** @private */
  _dealConditionDamage(pokemon, amount) {
    if (pokemon.currentHp === undefined || pokemon.currentHp === null) {
      pokemon.currentHp = pokemon.hp || 0;
    }
    pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
  }

  /** @private */
  _logEvent(type, playerId, pokemonId, condition, ...extra) {
    if (this.gameState.turnLog) {
      this.gameState.turnLog.push({
        type,
        player: playerId,
        pokemonId,
        condition,
        ...(extra.length ? { detail: extra[0] } : {})
      });
    }
  }
}

module.exports = { StatusConditionSystem, SPECIAL_CONDITIONS };
