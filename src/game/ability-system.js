/**
 * Ability System - Manages Pokémon abilities with continuous condition evaluation
 *
 * This file implements the ability system for Pocket TCG Simulator, supporting:
 * - Passive abilities with conditional damage bonuses (Carnivine, Tyranitar Power Link)
 * - Damage reduction abilities (Magnezone Resilience Link, Regirock Exoskeleton)
 * - Opponent damage reduction abilities (Luxray Intimidating Fang - reduces opponent's damage)
 * - Special condition immunity (Arceus ex Fabled Luster)
 * - Damage prevention abilities (Oricorio Safeguard - prevents damage from Pokémon ex)
 * - Pre-KO survival abilities (Conkeldurr Guts - flip coin to survive KO)
 * - On-Energy-attach triggers (Komala Comatose - auto-apply special conditions)
 * - Continuous condition evaluation against current game state
 *
 * GAP-001: [Crítico][C1] Bonus de daño condicional
 * GAP-002: [Crítico][C1] Reducción de daño recibido
 * GAP-003: [Crítico][C1] Inmunidad a Special Conditions
 * GAP-006: [Importante][C1] Prevención de daño de Pokémon ex (Oricorio Safeguard)
 * GAP-007: [Importante][C1] Guts (Conkeldurr) - Pre-KO coin flip survival
 * GAP-009: [Importante][C1] Auto-aplicación de Special Condition (Komala Comatose)
 * GAP-010: [Importante][C1] Reducción de daño al oponente (Luxray Intimidating Fang)
 *
 * Ability definition schema:
 * {
 *   id: string,               // Unique ability ID
 *   name: string,             // Display name
 *   pokemonId: string,        // ID of the Pokémon that has this ability
 *   type: 'passive',          // 'passive' | 'triggered' | 'activated'
 *   effect: {
 *     type: 'damage_bonus',   // Effect type
 *     amount: number,         // Modifier value
 *   },
 *   condition: {
 *     type: string,           // Condition type (see CONDITION_TYPES)
 *     ...params               // Condition-specific parameters
 *   }
 * }
 *
 * Supported condition types:
 * - 'always'             - Always active (no condition)
 * - 'pokemon_in_play'    - A specific Pokémon (by name) is in play for the given player
 * - 'pokemon_type_in_play' - A Pokémon of a specific type is in play
 * - 'has_energy_count'   - Pokémon has at least N energy attached
 * - 'is_active'          - The ability Pokémon itself is in active spot
 * - 'opponent_has_pokemon_type' - Opponent has a Pokémon of a specific type in play
 *
 * Supported effect types (in addition to damage_bonus / damage_reduction):
 * - 'opponent_damage_reduction' - Reduces damage dealt by opponent (Intimidating Fang)
 * - 'special_condition_immunity' - Pokémon cannot be affected by any special conditions
 * - 'damage_prevention' - Prevents all damage from attacks matching criteria
 * - 'pre_ko_survival' - Flip a coin when would be KO'd by attack; heads = survive with 1 HP
 * - 'on_energy_attach' - Trigger when energy is attached to this Pokémon; can apply special conditions
 */

class AbilitySystem {
  constructor(gameState) {
    this.gameState = gameState;

    // Map: pokemonId → array of ability definitions
    // Abilities are registered per-Pokémon when they enter play
    this._abilities = new Map();
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register an ability for a Pokémon that is currently in play
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokémon that has this ability
   * @param {Object} abilityDef - Ability definition object
   */
  registerAbility(playerId, pokemonId, abilityDef) {
    const key = `${playerId}:${pokemonId}`;
    if (!this._abilities.has(key)) {
      this._abilities.set(key, []);
    }
    this._abilities.get(key).push({ ...abilityDef, _playerId: playerId, _pokemonId: pokemonId });
  }

  /**
   * Remove all abilities for a specific Pokémon (e.g., KO'd or retreated)
   * @param {string} playerId
   * @param {string} pokemonId
   */
  removeAbilities(playerId, pokemonId) {
    const key = `${playerId}:${pokemonId}`;
    this._abilities.delete(key);
  }

  /**
   * Remove all abilities for a player (e.g., board reset)
   * @param {string} playerId
   */
  removeAllAbilitiesForPlayer(playerId) {
    for (const key of this._abilities.keys()) {
      if (key.startsWith(`${playerId}:`)) {
        this._abilities.delete(key);
      }
    }
  }

  /**
   * Get all registered ability entries (for inspection / testing)
   * @returns {Array}
   */
  getAllAbilities() {
    const result = [];
    for (const abilities of this._abilities.values()) {
      result.push(...abilities);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Condition Evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluate whether a condition is currently met given the game state
   * @param {Object} condition - Condition definition
   * @param {string} abilityPlayerId - Player who owns the Pokémon with the ability
   * @param {string} abilityPokemonId - Pokémon ID that has the ability
   * @returns {boolean}
   */
  evaluateCondition(condition, abilityPlayerId, abilityPokemonId) {
    if (!condition || condition.type === 'always') {
      return true;
    }

    switch (condition.type) {
      case 'pokemon_in_play':
        return this._condPokemonInPlay(condition, abilityPlayerId);

      case 'pokemon_type_in_play':
        return this._condPokemonTypeInPlay(condition, abilityPlayerId);

      case 'has_energy_count':
        return this._condHasEnergyCount(condition, abilityPlayerId, abilityPokemonId);

      case 'is_active':
        return this._condIsActive(abilityPlayerId, abilityPokemonId);

      case 'opponent_has_pokemon_type':
        return this._condOpponentHasPokemonType(condition, abilityPlayerId);

      default:
        // Unknown condition type → treat as not met (safe default)
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Condition Implementations
  // ---------------------------------------------------------------------------

  /**
   * Condition: a Pokémon with a specific name is in play on the given side
   * @param {Object} condition - { type, player: 'self'|'opponent', pokemonName: string }
   * @param {string} abilityPlayerId
   * @returns {boolean}
   */
  _condPokemonInPlay(condition, abilityPlayerId) {
    const targetPlayer = this._resolvePlayer(condition.player, abilityPlayerId);
    const pokemonName = condition.pokemonName;
    return this._hasPokemonByName(targetPlayer, pokemonName);
  }

  /**
   * Condition: a Pokémon of a specific type is in play on the given side
   * @param {Object} condition - { type, player: 'self'|'opponent', pokemonType: string }
   * @param {string} abilityPlayerId
   * @returns {boolean}
   */
  _condPokemonTypeInPlay(condition, abilityPlayerId) {
    const targetPlayer = this._resolvePlayer(condition.player, abilityPlayerId);
    return this._hasPokemonByType(targetPlayer, condition.pokemonType);
  }

  /**
   * Condition: opponent has a Pokémon of a specific type in play
   * @param {Object} condition - { type, pokemonType: string }
   * @param {string} abilityPlayerId
   * @returns {boolean}
   */
  _condOpponentHasPokemonType(condition, abilityPlayerId) {
    const opponentId = abilityPlayerId === 'player1' ? 'player2' : 'player1';
    return this._hasPokemonByType(opponentId, condition.pokemonType);
  }

  /**
   * Condition: the Pokémon with the ability has at least N energy attached
   * @param {Object} condition - { type, minEnergy: number, energyType?: string }
   * @param {string} abilityPlayerId
   * @param {string} abilityPokemonId
   * @returns {boolean}
   */
  _condHasEnergyCount(condition, abilityPlayerId, abilityPokemonId) {
    const pokemon = this._getPokemon(abilityPlayerId, abilityPokemonId);
    if (!pokemon) return false;

    const energyList = pokemon.energy || [];
    if (condition.energyType) {
      const filtered = energyList.filter(e => e.type === condition.energyType);
      return filtered.length >= (condition.minEnergy || 1);
    }
    return energyList.length >= (condition.minEnergy || 1);
  }

  /**
   * Condition: the Pokémon with the ability is currently in the active spot
   * @param {string} abilityPlayerId
   * @param {string} abilityPokemonId
   * @returns {boolean}
   */
  _condIsActive(abilityPlayerId, abilityPokemonId) {
    const player = this.gameState.players[abilityPlayerId];
    return !!(player.activePokemon && player.activePokemon.id === abilityPokemonId);
  }

  // ---------------------------------------------------------------------------
  // Modifier Aggregation
  // ---------------------------------------------------------------------------

  /**
   * Calculate the total damage bonus from all active passive abilities
   * for the attacking player's current attacks.
   *
   * This is called at attack-time to get the total bonus damage modifier.
   *
   * @param {string} attackingPlayerId - Player who is attacking
   * @returns {number} Total damage bonus (positive = more damage dealt)
   */
  getDamageBonus(attackingPlayerId) {
    let total = 0;

    for (const [key, abilities] of this._abilities.entries()) {
      const [abilityPlayerId] = key.split(':');

      // Only consider abilities belonging to the attacking player
      if (abilityPlayerId !== attackingPlayerId) continue;

      for (const ability of abilities) {
        if (ability.type !== 'passive') continue;
        if (!ability.effect || ability.effect.type !== 'damage_bonus') continue;

        const conditionMet = this.evaluateCondition(
          ability.condition,
          ability._playerId,
          ability._pokemonId
        );

        if (conditionMet) {
          total += ability.effect.amount || 0;
        }
      }
    }

    return total;
  }

  /**
   * Calculate total damage reduction from passive abilities for the defending player.
   *
   * @param {string} defendingPlayerId - Player who is receiving damage
   * @returns {number} Total damage reduction (positive = less damage received)
   */
  getDamageReduction(defendingPlayerId) {
    let total = 0;

    for (const [key, abilities] of this._abilities.entries()) {
      const [abilityPlayerId] = key.split(':');

      if (abilityPlayerId !== defendingPlayerId) continue;

      for (const ability of abilities) {
        if (ability.type !== 'passive') continue;
        if (!ability.effect || ability.effect.type !== 'damage_reduction') continue;

        const conditionMet = this.evaluateCondition(
          ability.condition,
          ability._playerId,
          ability._pokemonId
        );

        if (conditionMet) {
          total += ability.effect.amount || 0;
        }
      }
    }

    return total;
  }

  /**
   * Calculate total opponent damage reduction from passive abilities.
   *
   * This is the inverse of damage reduction: instead of reducing damage received
   * by the defending player, this reduces damage dealt by the attacking player.
   * It's a debuff that the opponent applies to the attacker's attacks.
   *
   * Example: Luxray (Intimidating Fang) — "Any damage done by your opponent's
   * Active Pokémon is reduced by 20 (after applying Weakness and Resistance)."
   *
   * @param {string} attackingPlayerId - Player who is attacking (damage is being reduced)
   * @returns {number} Total opponent damage reduction (positive = less damage dealt by attacker)
   */
  getOpponentDamageReduction(attackingPlayerId) {
    const defendingPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';
    let total = 0;

    for (const [key, abilities] of this._abilities.entries()) {
      const [abilityPlayerId] = key.split(':');

      // Check the opponent's abilities (the player being attacked)
      if (abilityPlayerId !== defendingPlayerId) continue;

      for (const ability of abilities) {
        if (ability.type !== 'passive') continue;
        if (!ability.effect || ability.effect.type !== 'opponent_damage_reduction') continue;

        const conditionMet = this.evaluateCondition(
          ability.condition,
          ability._playerId,
          ability._pokemonId
        );

        if (conditionMet) {
          total += ability.effect.amount || 0;
        }
      }
    }

    return total;
  }

  /**
   * Get all active (condition-met) passive abilities for a player
   * @param {string} playerId
   * @returns {Array} Array of active ability definitions
   */
  getActiveAbilities(playerId) {
    const active = [];

    for (const [key, abilities] of this._abilities.entries()) {
      const [abilityPlayerId] = key.split(':');
      if (abilityPlayerId !== playerId) continue;

      for (const ability of abilities) {
        const conditionMet = this.evaluateCondition(
          ability.condition,
          ability._playerId,
          ability._pokemonId
        );
        if (conditionMet) {
          active.push({ ...ability, _conditionMet: true });
        }
      }
    }

    return active;
  }

  /**
   * Apply damage modifiers from all abilities to an attack calculation
   *
   * @param {string} attackingPlayerId - Player who is attacking
   * @param {string} defendingPlayerId - Player who is defending
   * @param {number} baseDamage - Base attack damage
   * @returns {Object} { finalDamage, baseDamage, bonusApplied, reductionApplied, opponentReductionApplied }
   */
  applyDamageModifiers(attackingPlayerId, defendingPlayerId, baseDamage) {
    const bonus = this.getDamageBonus(attackingPlayerId);
    const reduction = this.getDamageReduction(defendingPlayerId);
    const opponentReduction = this.getOpponentDamageReduction(attackingPlayerId);

    const finalDamage = Math.max(0, baseDamage + bonus - reduction - opponentReduction);

    return {
      finalDamage,
      baseDamage,
      bonusApplied: bonus,
      reductionApplied: reduction,
      opponentReductionApplied: opponentReduction
    };
  }

  // ---------------------------------------------------------------------------
  // Special Condition Immunity (GAP-003)
  // ---------------------------------------------------------------------------

  /**
   * Check if a specific Pokémon is immune to all special conditions.
   *
   * Immunity is granted by a passive ability with effect.type === 'special_condition_immunity'.
   * The condition associated with the ability must be met for immunity to apply.
   *
   * Example: Arceus ex (Fabled Luster) — "This Pokémon can't be affected by any Special Conditions."
   *
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokémon to check
   * @returns {boolean} true if the Pokémon is currently immune
   */
  isImmuneToSpecialConditions(playerId, pokemonId) {
    const key = `${playerId}:${pokemonId}`;
    const abilities = this._abilities.get(key);
    if (!abilities) return false;

    for (const ability of abilities) {
      if (ability.type !== 'passive') continue;
      if (!ability.effect || ability.effect.type !== 'special_condition_immunity') continue;

      const conditionMet = this.evaluateCondition(
        ability.condition,
        ability._playerId,
        ability._pokemonId
      );

      if (conditionMet) return true;
    }

    return false;
  }

  /**
   * Get all Pokémon (by ID) on a player's side that are currently immune
   * to special conditions.
   *
   * @param {string} playerId
   * @returns {string[]} Array of pokemonId strings
   */
  getImmunePokemons(playerId) {
    const immune = [];

    for (const [key, abilities] of this._abilities.entries()) {
      const [abilityPlayerId, pokemonId] = key.split(':');
      if (abilityPlayerId !== playerId) continue;

      for (const ability of abilities) {
        if (ability.type !== 'passive') continue;
        if (!ability.effect || ability.effect.type !== 'special_condition_immunity') continue;

        const conditionMet = this.evaluateCondition(
          ability.condition,
          ability._playerId,
          ability._pokemonId
        );

        if (conditionMet) {
          immune.push(pokemonId);
          break; // one immunity per Pokémon is enough
        }
      }
    }

    return immune;
  }

  // ---------------------------------------------------------------------------
  // Damage Prevention (GAP-006)
  // ---------------------------------------------------------------------------

  /**
   * Check if damage from an attack should be prevented.
   *
   * Damage prevention is granted by a passive ability with effect.type === 'damage_prevention'.
   * The condition associated with the ability must be met for prevention to apply.
   * The effect specifies which Pokémon should be prevented (e.g., pokemon_ex).
   *
   * Example: Oricorio (Safeguard) — "Prevent all damage done to this Pokémon by attacks from your opponent's Pokémon ex."
   *
   * @param {string} attackingPlayerId - Player who is attacking
   * @param {string} attackingPokemonId - ID of the attacking Pokémon
   * @param {string} defendingPlayerId - Player who is defending
   * @param {string} defendingPokemonId - ID of the defending Pokémon
   * @returns {boolean} true if damage should be prevented
   */
  preventDamage(attackingPlayerId, attackingPokemonId, defendingPlayerId, defendingPokemonId) {
    const key = `${defendingPlayerId}:${defendingPokemonId}`;
    const abilities = this._abilities.get(key);
    if (!abilities) return false;

    // Get the attacking Pokémon to check if it matches prevention criteria
    const attacker = this._getPokemon(attackingPlayerId, attackingPokemonId);
    if (!attacker) return false;

    for (const ability of abilities) {
      if (ability.type !== 'passive') continue;
      if (!ability.effect || ability.effect.type !== 'damage_prevention') continue;

      // Check if the ability condition is met
      const conditionMet = this.evaluateCondition(
        ability.condition,
        ability._playerId,
        ability._pokemonId
      );

      if (!conditionMet) continue;

      // Check if the attacking Pokémon matches the prevention criteria
      // Effect can specify: { type: 'damage_prevention', preventFrom: 'pokemon_ex' }
      // or { type: 'damage_prevention', preventFrom: 'all' }
      if (this._matchesPreventionCriteria(attacker, ability.effect)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a Pokémon matches the damage prevention criteria.
   *
   * @param {Object} attacker - The attacking Pokémon object
   * @param {Object} effect - The effect definition with preventFrom criteria
   * @returns {boolean}
   */
  _matchesPreventionCriteria(attacker, effect) {
    if (!effect.preventFrom) {
      // No criteria specified → prevent from all (safe default)
      return true;
    }

    switch (effect.preventFrom) {
      case 'pokemon_ex':
        // Prevent damage from Pokémon with 'ex' in their name
        return this._isPokemonEx(attacker);

      case 'all':
        // Prevent all damage
        return true;

      default:
        // Unknown criteria → don't prevent (safe default)
        return false;
    }
  }

  /**
   * Check if a Pokémon is a Pokémon ex (has 'ex' in its name).
   *
   * @param {Object} pokemon - Pokémon object
   * @returns {boolean}
   */
  _isPokemonEx(pokemon) {
    if (!pokemon || !pokemon.name) return false;
    return pokemon.name.includes('ex');
  }

  // ---------------------------------------------------------------------------
  // Pre-KO Survival (GAP-007)
  // ---------------------------------------------------------------------------

  /**
   * Check if a Pokémon has a pre-KO survival ability (Guts).
   *
   * Pre-KO survival abilities allow a Pokémon to survive being knocked out
   * by flipping a coin. If the coin flip is heads, the Pokémon remains in play
   * with 1 HP instead of being knocked out.
   *
   * Example: Conkeldurr (Guts) — "If this Pokémon would be Knocked Out by
   * damage from an attack, flip a coin. If heads, this Pokémon is not Knocked Out
   * and remains in play with 1 HP remaining."
   *
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokémon to check
   * @returns {Object|null} Ability definition if pre-KO survival is active, null otherwise
   */
  hasPreKoSurvival(playerId, pokemonId) {
    const key = `${playerId}:${pokemonId}`;
    const abilities = this._abilities.get(key);
    if (!abilities) return null;

    for (const ability of abilities) {
      if (ability.type !== 'passive') continue;
      if (!ability.effect || ability.effect.type !== 'pre_ko_survival') continue;

      // Check if the ability condition is met
      const conditionMet = this.evaluateCondition(
        ability.condition,
        ability._playerId,
        ability._pokemonId
      );

      if (conditionMet) {
        return ability;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // On-Energy-Attach Triggers (GAP-009)
  // ---------------------------------------------------------------------------

  /**
   * Trigger on-Energy-attach abilities for a Pokémon.
   *
   * Called when energy is attached to a Pokémon. This method finds all
   * on_energy_attach abilities for that Pokémon and executes their effects.
   *
   * Example: Komala (Comatose) — "Whenever you attach an Energy card from
   * your hand to this Pokémon, this Pokémon is now Asleep."
   *
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokémon that received energy
   * @param {Object} energy - Energy object that was attached
   * @returns {Array} Array of trigger results
   */
  triggerOnEnergyAttach(playerId, pokemonId, energy) {
    const key = `${playerId}:${pokemonId}`;
    const abilities = this._abilities.get(key);
    if (!abilities) return [];

    const results = [];

    for (const ability of abilities) {
      if (ability.type !== 'passive') continue;
      if (!ability.effect || ability.effect.type !== 'on_energy_attach') continue;

      // Check if the ability condition is met
      const conditionMet = this.evaluateCondition(
        ability.condition,
        ability._playerId,
        ability._pokemonId
      );

      if (conditionMet) {
        // The effect can specify a special condition to apply
        // Example: { type: 'on_energy_attach', applyCondition: 'asleep' }
        const result = {
          abilityId: ability.id || `${playerId}:${pokemonId}:on_energy_attach`,
          abilityName: ability.name || 'On Energy Attach',
          pokemonId,
          effect: ability.effect
        };

        results.push(result);
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve 'self' / 'opponent' to actual player ID
   * @param {string} playerRef - 'self' or 'opponent' or explicit player ID
   * @param {string} abilityPlayerId
   * @returns {string} Resolved player ID
   */
  _resolvePlayer(playerRef, abilityPlayerId) {
    if (playerRef === 'self') return abilityPlayerId;
    if (playerRef === 'opponent') {
      return abilityPlayerId === 'player1' ? 'player2' : 'player1';
    }
    return playerRef; // explicit player ID passed
  }

  /**
   * Check if a player has a Pokémon with a specific name (active or bench)
   * @param {string} playerId
   * @param {string} name
   * @returns {boolean}
   */
  _hasPokemonByName(playerId, name) {
    const player = this.gameState.players[playerId];
    if (!player) return false;

    const nameLower = name.toLowerCase();

    if (player.activePokemon && player.activePokemon.name &&
        player.activePokemon.name.toLowerCase() === nameLower) {
      return true;
    }

    if (player.banque) {
      for (const p of player.banque) {
        if (p && p.name && p.name.toLowerCase() === nameLower) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a player has a Pokémon of a specific type (active or bench)
   * @param {string} playerId
   * @param {string} pokemonType
   * @returns {boolean}
   */
  _hasPokemonByType(playerId, pokemonType) {
    const player = this.gameState.players[playerId];
    if (!player) return false;

    const typeLower = pokemonType.toLowerCase();

    if (player.activePokemon && player.activePokemon.type &&
        player.activePokemon.type.toLowerCase() === typeLower) {
      return true;
    }

    if (player.banque) {
      for (const p of player.banque) {
        if (p && p.type && p.type.toLowerCase() === typeLower) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get a Pokémon object by ID from player's active or bench
   * @param {string} playerId
   * @param {string} pokemonId
   * @returns {Object|null}
   */
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
}

module.exports = AbilitySystem;
