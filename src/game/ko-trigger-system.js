/**
 * KO Trigger System - Manages abilities that trigger when a Pokémon is Knocked Out
 *
 * This file implements the KO-triggered ability system for Pocket TCG Simulator.
 *
 * GAP-005: [Crítico][C1] Habilidades triggered por KO (Pyukumuku (Innards Out))
 *
 * Real-card examples:
 * - Pyukumuku (Innards Out): "If this Pokémon is in the Active Spot and is Knocked Out by
 *   damage from an attack from your opponent's Pokémon, do 50 damage to the Attacking Pokémon."
 * - Passimian ex (Offload Pass): "If this Pokémon is in the Active Spot and is Knocked Out
 *   by damage from an attack from your opponent's Pokémon, move all [F] Energy from this
 *   Pokémon to 1 of your Benched Pokémon."
 *
 * Trigger conditions:
 * - Only triggers when Pokémon is in the Active Spot
 * - Only triggers when KO'd by damage from an attack (not Poison, Burn, etc.)
 * - Effects execute AFTER the KO (in KO resolution window)
 *
 * Supported effect types:
 * - 'damage_to_attacker': deals X damage to the attacking Pokémon
 * - 'move_energy_on_ko': moves energy of a specific type from KO'd Pokémon to a benched Pokémon
 *
 * Usage:
 * 1. Register KO-triggered abilities via registerAbility()
 * 2. Call handleKnockout() when a Pokémon is KO'd by attack damage
 * 3. The system evaluates triggers and applies effects automatically
 */

class KoTriggerSystem {
  /**
   * @param {Object} gameState - GameState instance
   */
  constructor(gameState) {
    this.gameState = gameState;

    // Map: pokemonId → array of KO-triggered ability definitions
    this._koAbilities = new Map();
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a KO-triggered ability for a Pokémon
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} pokemonId - ID of the Pokémon that has this ability
   * @param {Object} abilityDef - Ability definition object
   * @returns {string} Unique ability ID
   */
  registerAbility(playerId, pokemonId, abilityDef) {
    const key = `${playerId}:${pokemonId}`;
    if (!this._koAbilities.has(key)) {
      this._koAbilities.set(key, []);
    }

    const ability = {
      ...abilityDef,
      _playerId: playerId,
      _pokemonId: pokemonId,
      _abilityId: `${playerId}:${pokemonId}:${Date.now()}_${Math.random()}`
    };

    this._koAbilities.get(key).push(ability);
    return ability._abilityId;
  }

  /**
   * Remove all KO-triggered abilities for a specific Pokémon
   * @param {string} playerId
   * @param {string} pokemonId
   */
  removeAbilities(playerId, pokemonId) {
    const key = `${playerId}:${pokemonId}`;
    this._koAbilities.delete(key);
  }

  /**
   * Remove all KO-triggered abilities for a player (e.g., board reset)
   * @param {string} playerId
   */
  removeAllAbilitiesForPlayer(playerId) {
    for (const key of this._koAbilities.keys()) {
      if (key.startsWith(`${playerId}:`)) {
        this._koAbilities.delete(key);
      }
    }
  }

  /**
   * Get all registered KO-triggered abilities (for inspection / testing)
   * @returns {Array}
   */
  getAllAbilities() {
    const result = [];
    for (const abilities of this._koAbilities.values()) {
      result.push(...abilities);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // KO Trigger Handling
  // ---------------------------------------------------------------------------

  /**
   * Handle a knockout event. This should be called by AttackSystem when a Pokémon
   * is knocked out by attack damage.
   *
   * @param {Object} koEvent - KO event details
   * @param {string} koEvent.playerId - Player whose Pokémon was KO'd
   * @param {string} koEvent.pokemonId - ID of the KO'd Pokémon
   * @param {string} koEvent.attackingPlayerId - Player who caused the KO (attacker)
   * @param {string} koEvent.attackingPokemonId - ID of the attacking Pokémon
   * @param {boolean} koEvent.wasActive - Was the KO'd Pokémon in the Active Spot?
   * @param {string} koEvent.source - Source of KO ('attack' or other)
   * @returns {Array} Array of effect results
   */
  handleKnockout(koEvent) {
    const { playerId, pokemonId, wasActive, source } = koEvent;

    // Only process KO triggers if:
    // 1. The KO was caused by an attack (not Poison, Burn, etc.)
    // 2. The KO'd Pokémon was in the Active Spot
    if (source !== 'attack' || !wasActive) {
      return [];
    }

    const key = `${playerId}:${pokemonId}`;
    const abilities = this._koAbilities.get(key);
    if (!abilities || abilities.length === 0) {
      return [];
    }

    const results = [];

    for (const ability of abilities) {
      const result = this._executeAbility(ability, koEvent);
      if (result) {
        results.push(result);
      }
    }

    // Clean up abilities for the KO'd Pokémon
    this.removeAbilities(playerId, pokemonId);

    return results;
  }

  /**
   * Execute a KO-triggered ability
   * @param {Object} ability - Ability definition with metadata
   * @param {Object} koEvent - KO event details
   * @returns {Object|null} Effect result
   */
  _executeAbility(ability, koEvent) {
    const { effect } = ability;
    const { attackingPlayerId, attackingPokemonId } = koEvent;

    switch (effect.type) {
      case 'damage_to_attacker':
        return this._effectDamageToAttacker(effect, ability, koEvent);

      case 'move_energy_on_ko':
        return this._effectMoveEnergyOnKo(effect, ability, koEvent);

      default:
        console.warn(`Unknown KO trigger effect type: ${effect.type}`);
        return null;
    }
  }

  /**
   * Effect: Deal damage to the attacking Pokémon
   * Used by: Pyukumuku (Innards Out)
   * @param {Object} effect - Effect definition
   * @param {Object} ability - Ability definition
   * @param {Object} koEvent - KO event details
   * @returns {Object} Effect result
   */
  _effectDamageToAttacker(effect, ability, koEvent) {
    const { attackingPlayerId, attackingPokemonId } = koEvent;
    const damage = effect.damage || 0;

    const attacker = this._getPokemon(attackingPlayerId, attackingPokemonId);
    if (!attacker) {
      this.gameState.turnLog.push({
        type: 'ko_trigger_failed',
        abilityId: ability._abilityId,
        reason: 'attacking_pokemon_not_found',
        effectType: effect.type
      });
      return null;
    }

    // Apply damage to attacker
    if (attacker.currentHp === undefined || attacker.currentHp === null) {
      attacker.currentHp = attacker.hp || 0;
    }

    const oldHp = attacker.currentHp;
    attacker.currentHp = Math.max(0, attacker.currentHp - damage);
    const isAttackerKO = attacker.currentHp <= 0;

    this.gameState.turnLog.push({
      type: 'ko_trigger_damage_to_attacker',
      abilityId: ability._abilityId,
      abilityName: ability.name,
      targetPlayerId: attackingPlayerId,
      targetPokemonId: attackingPokemonId,
      targetPokemonName: attacker.name,
      damage,
      oldHp,
      newHp: attacker.currentHp,
      isKO: isAttackerKO
    });

    return {
      effectType: 'damage_to_attacker',
      damage,
      targetPlayerId: attackingPlayerId,
      targetPokemonId: attackingPokemonId,
      isKO: isAttackerKO
    };
  }

  /**
   * Effect: Move energy of a specific type from KO'd Pokémon to a benched Pokémon
   * Used by: Passimian ex (Offload Pass)
   * @param {Object} effect - Effect definition
   * @param {Object} ability - Ability definition
   * @param {Object} koEvent - KO event details
   * @returns {Object|null} Effect result
   */
  _effectMoveEnergyOnKo(effect, ability, koEvent) {
    const { playerId, pokemonId } = koEvent;
    const energyType = effect.energyType; // e.g., 'Fighting'
    const targetPokemonId = effect.targetPokemonId; // Specific benched Pokémon, or undefined for user choice

    // Get the KO'd Pokémon
    const koPokemon = this._getPokemon(playerId, pokemonId);
    if (!koPokemon) {
      this.gameState.turnLog.push({
        type: 'ko_trigger_failed',
        abilityId: ability._abilityId,
        reason: 'ko_pokemon_not_found',
        effectType: effect.type
      });
      return null;
    }

    // Filter energy by type
    const energyList = koPokemon.energy || [];
    const energyToMove = energyList.filter(e =>
      energyType ? e.type === energyType : true
    );

    if (energyToMove.length === 0) {
      this.gameState.turnLog.push({
        type: 'ko_trigger_energy_move',
        abilityId: ability._abilityId,
        abilityName: ability.name,
        sourcePlayerId: playerId,
        sourcePokemonId: pokemonId,
        sourcePokemonName: koPokemon.name,
        energyType,
        energyMoved: 0,
        reason: 'no_energy_of_type'
      });
      return {
        effectType: 'move_energy_on_ko',
        energyMoved: 0,
        reason: 'no_energy_of_type'
      };
    }

    // Find target benched Pokémon
    // For now, if no specific target is provided, move to the first benched Pokémon
    // (In a real game, this would be user choice)
    const player = this.gameState.players[playerId];
    let targetPokemon = null;

    if (targetPokemonId) {
      // Specific target provided
      targetPokemon = player.banque?.find(p => p && p.id === targetPokemonId);
    } else {
      // Auto-select first benched Pokémon
      targetPokemon = player.banque?.find(p => p && p);
    }

    if (!targetPokemon) {
      this.gameState.turnLog.push({
        type: 'ko_trigger_energy_move',
        abilityId: ability._abilityId,
        abilityName: ability.name,
        sourcePlayerId: playerId,
        sourcePokemonId: pokemonId,
        sourcePokemonName: koPokemon.name,
        energyType,
        energyMoved: 0,
        reason: 'no_benched_pokemon'
      });
      return {
        effectType: 'move_energy_on_ko',
        energyMoved: 0,
        reason: 'no_benched_pokemon'
      };
    }

    // Move energy
    if (!targetPokemon.energy) {
      targetPokemon.energy = [];
    }

    // Remove energy from KO'd Pokémon (create copy to avoid iteration issues)
    const koPokemonEnergyCopy = [...koPokemon.energy];
    koPokemon.energy = koPokemonEnergyCopy.filter(e =>
      !(energyType ? e.type === energyType : true)
    );

    // Add energy to target (respecting max 4 limit in Pocket)
    const energyToActuallyMove = [];
    for (const e of energyToMove) {
      // Count how many energy of this type target already has
      const currentCount = targetPokemon.energy.filter(te => te.type === e.type).length;
      if (currentCount < 4) {
        targetPokemon.energy.push({ ...e });
        energyToActuallyMove.push(e);
      }
    }

    this.gameState.turnLog.push({
      type: 'ko_trigger_energy_move',
      abilityId: ability._abilityId,
      abilityName: ability.name,
      sourcePlayerId: playerId,
      sourcePokemonId: pokemonId,
      sourcePokemonName: koPokemon.name,
      targetPlayerId: playerId,
      targetPokemonId: targetPokemon.id,
      targetPokemonName: targetPokemon.name,
      energyType,
      energyAttempted: energyToMove.length,
      energyMoved: energyToActuallyMove.length,
      energyLimited: energyToMove.length - energyToActuallyMove.length
    });

    return {
      effectType: 'move_energy_on_ko',
      energyType,
      energyMoved: energyToActuallyMove.length,
      sourcePokemonId: pokemonId,
      targetPokemonId: targetPokemon.id
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

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

module.exports = KoTriggerSystem;
