/**
 * Attack System - Handles attack execution and damage calculation
 *
 * This file implements the attack execution flow for Pocket TCG Simulator,
 * incorporating ability-based damage modifiers from AbilitySystem.
 *
 * GAP-002: [Crítico][C1] Reducción de daño recibido
 * GAP-006: [Importante][C1] Prevención de daño de Pokémon ex (Oricorio Safeguard)
 * GAP-007: [Importante][C1] Guts (Conkeldurr) - Pre-KO coin flip survival
 * GAP-010: [Importante][C1] Reducción de daño al oponente (Luxray Intimidating Fang)
 * GAP-011: [Crítico][C2] Sistema completo de ataques
 *
 * Supported damage modifier effects:
 * - damage_bonus (attacker side): adds extra damage to outgoing attacks
 * - damage_reduction (defender side): reduces incoming damage
 * - opponent_damage_reduction (defender side): reduces damage dealt by opponent
 * - damage_prevention (defender side): prevents all damage from specific attackers
 *
 * Supported pre-KO effects:
 * - pre_ko_survival (defender side): flip a coin to survive KO with 1 HP
 *
 * Real-card examples of damage_reduction:
 * - Magnezone (Resilience Link): reduce damage received by 30
 * - Regirock (Exoskeleton): reduce damage received by 30
 * - Shuckle ex (Solid Shell): reduce damage received by 20
 *
 * Real-card examples of opponent_damage_reduction:
 * - Luxray (Intimidating Fang): reduce opponent's damage by 20
 *
 * Real-card examples of damage_prevention:
 * - Oricorio (Safeguard): prevents all damage from opponent's Pokémon ex
 *
 * Real-card examples of pre_ko_survival:
 * - Conkeldurr (Guts): flip a coin on KO; heads = survive with 1 HP
 *
 * Attack execution flow:
 * 1. Validate energy costs (GAP-011) - check if attacker has enough energy
 * 2. Get base damage from the attack definition
 * 3. Check if damage should be prevented (GAP-006)
 * 4. If not prevented, apply damage_bonus from attacking player's passive abilities
 * 5. Apply damage_reduction from defending player's passive abilities
 * 6. Apply opponent_damage_reduction from defending player's passive abilities
 * 7. Apply weakness (GAP-011) - add +20 damage if defender is weak to attacker's type
 * 8. Clamp final damage to minimum 0
 * 9. Apply final damage to defending Pokémon's current HP
 * 10. Check for pre-KO survival abilities (GAP-007) - flip coin to survive
 * 11. Determine if the defending Pokémon is knocked out (HP <= 0)
 * 12. Handle KO-triggered abilities (GAP-005) if KO'd
 * 13. Log the attack event
 */

class AttackSystem {
  /**
   * @param {Object} gameState - GameState instance
   * @param {Object} abilitySystem - AbilitySystem instance
   * @param {Object} koTriggerSystem - KoTriggerSystem instance (optional)
   */
  constructor(gameState, abilitySystem, koTriggerSystem = null) {
    this.gameState = gameState;
    this.abilitySystem = abilitySystem;
    this.koTriggerSystem = koTriggerSystem;
  }

  // ---------------------------------------------------------------------------
  // Energy Cost Validation (GAP-011)
  // ---------------------------------------------------------------------------

  /**
   * Check if a Pokémon can afford an attack's energy cost.
   *
   * Energy cost format: Array of energy type strings
   * Example: ['colorless', 'colorless', 'fire'] = 2 colorless + 1 fire
   * Example: ['water', 'water', 'colorless'] = 2 water + 1 colorless
   *
   * Colorless energy can be satisfied by any energy type.
   * Specific energy types (fire, water, grass, electric, psychic, fighting) require that exact type.
   *
   * @param {Object} pokemon - Pokémon object with energy array
   * @param {Array} energyCost - Array of energy type strings required
   * @returns {Object} { canAfford: boolean, reason?: string, missing?: Array }
   */
  canAffordEnergyCost(pokemon, energyCost) {
    if (!energyCost || energyCost.length === 0) {
      return { canAfford: true };
    }

    if (!pokemon || !pokemon.energy || pokemon.energy.length === 0) {
      return {
        canAfford: false,
        reason: 'no_energy',
        missing: energyCost
      };
    }

    // Count available energy by type
    const availableByType = {};
    pokemon.energy.forEach(energy => {
      const type = energy.type || 'colorless';
      availableByType[type] = (availableByType[type] || 0) + 1;
    });

    // Track required energy
    const requiredByType = {};
    let totalColorlessRequired = 0;

    energyCost.forEach(costType => {
      const type = costType || 'colorless';
      if (type === 'colorless') {
        totalColorlessRequired++;
      } else {
        requiredByType[type] = (requiredByType[type] || 0) + 1;
      }
    });

    // Check specific energy requirements first
    const missingSpecific = [];
    for (const [type, required] of Object.entries(requiredByType)) {
      const available = availableByType[type] || 0;
      if (available < required) {
        missingSpecific.push(...Array(required - available).fill(type));
      }
    }

    if (missingSpecific.length > 0) {
      return {
        canAfford: false,
        reason: 'missing_specific_energy',
        missing: missingSpecific
      };
    }

    // Deduct specific energy from available pool
    let remainingTotal = 0;
    for (const [type, count] of Object.entries(availableByType)) {
      if (type !== 'colorless') {
        const required = requiredByType[type] || 0;
        remainingTotal += Math.max(0, count - required);
      } else {
        remainingTotal += count;
      }
    }

    // Check if we have enough total energy for colorless requirements
    if (remainingTotal < totalColorlessRequired) {
      return {
        canAfford: false,
        reason: 'insufficient_total_energy',
        missing: Array(totalColorlessRequired - remainingTotal).fill('colorless')
      };
    }

    return { canAfford: true };
  }

  // ---------------------------------------------------------------------------
  // Weakness Calculation (GAP-011)
  // ---------------------------------------------------------------------------

  /**
   * Calculate weakness damage to add to an attack.
   *
   * In Pocket TCG, weakness adds +20 damage when the defending Pokémon
   * has weakness to the attacking Pokémon's type.
   *
   * Weakness format:
   * - String: 'fire' - single weakness type
   * - Array: ['fire', 'grass'] - multiple weakness types
   * - Object: { type: 'fire', multiplier: 2 } - with multiplier (Pocket uses fixed +20)
   *
   * @param {Object} attacker - Attacking Pokémon
   * @param {Object} defender - Defending Pokémon
   * @returns {number} Weakness damage to add (0 or 20)
   */
  calculateWeakness(attacker, defender) {
    if (!attacker || !defender) {
      return 0;
    }

    const attackerType = attacker.type || 'colorless';
    const defenderWeakness = defender.weakness;

    if (!defenderWeakness) {
      return 0;
    }

    // Parse weakness format
    let weaknessTypes = [];
    if (Array.isArray(defenderWeakness)) {
      weaknessTypes = defenderWeakness;
    } else if (typeof defenderWeakness === 'string') {
      weaknessTypes = [defenderWeakness];
    } else if (typeof defenderWeakness === 'object' && defenderWeakness.type) {
      weaknessTypes = [defenderWeakness.type];
    }

    // Check if attacker's type matches any weakness
    const isWeak = weaknessTypes.includes(attackerType);

    // Pocket TCG: Weakness adds +20 damage (not 2x like in physical TCG)
    return isWeak ? 20 : 0;
  }

  // ---------------------------------------------------------------------------
  // Attack Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute an attack from the active Pokémon of the attacking player
   * against the active Pokémon of the defending player.
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {Object} attack - Attack definition: { name: string, damage: number, energyCost?: Array, coinFlip?: Function }
   * @param {Function} [attack.coinFlip] - Optional deterministic coin-flip function for tests; defaults to random
   * @returns {Object} Result: { baseDamage, bonusApplied, reductionApplied, weaknessApplied, finalDamage, isKO, attacker, defender, damagePrevented, preKoSurvivalResult, koTriggerResults, energyCostPaid }
   */
  executeAttack(attackingPlayerId, attack) {
    const defendingPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';

    const attacker = this.gameState.players[attackingPlayerId].activePokemon;
    const defender = this.gameState.players[defendingPlayerId].activePokemon;

    if (!attacker) {
      throw new Error(`${attackingPlayerId} has no active Pokémon to attack with`);
    }
    if (!defender) {
      throw new Error(`${defendingPlayerId} has no active Pokémon to attack`);
    }

    // Validate energy cost (GAP-011)
    const energyCost = attack.energyCost || [];
    const energyCheck = this.canAffordEnergyCost(attacker, energyCost);
    let energyCostPaid = false;

    if (!energyCheck.canAfford) {
      this.gameState.turnLog.push({
        type: 'attack_failed',
        player: attackingPlayerId,
        attack: attack.name || 'Unknown',
        reason: energyCheck.reason,
        missing: energyCheck.missing,
        attacker: attacker.name
      });

      throw new Error(`Cannot afford energy cost: ${energyCheck.reason}`);
    }

    // Energy cost is validated (we don't actually deduct energy in this simulator
    // since energy is consumed at the end of the turn in Pocket TCG)
    energyCostPaid = true;

    const baseDamage = attack.damage || 0;

    // Check if damage should be prevented (GAP-006)
    const damagePrevented = this.abilitySystem.preventDamage(
      attackingPlayerId,
      attacker.id,
      defendingPlayerId,
      defender.id
    );

    let finalDamage = 0;
    let bonusApplied = 0;
    let reductionApplied = 0;
    let weaknessApplied = 0;

    if (!damagePrevented) {
      // Apply all damage modifiers (bonus from attacker abilities + reduction from defender abilities + opponent reduction from defender's debuff abilities)
      const modifierResult = this.abilitySystem.applyDamageModifiers(
        attackingPlayerId,
        defendingPlayerId,
        baseDamage
      );

      let damageAfterModifiers = modifierResult.finalDamage;
      bonusApplied = modifierResult.bonusApplied;
      reductionApplied = modifierResult.reductionApplied;
      var opponentReductionApplied = modifierResult.opponentReductionApplied;

      // Apply weakness (GAP-011) - add +20 damage if defender is weak to attacker's type
      weaknessApplied = this.calculateWeakness(attacker, defender);
      damageAfterModifiers += weaknessApplied;

      finalDamage = Math.max(0, damageAfterModifiers);
    }

    // Apply damage to defender's HP
    // Initialize currentHp from hp if not already set
    if (defender.currentHp === undefined || defender.currentHp === null) {
      defender.currentHp = defender.hp || 0;
    }

    defender.currentHp = Math.max(0, defender.currentHp - finalDamage);
    let isKO = defender.currentHp <= 0;

    // Handle pre-KO survival abilities (GAP-007) - e.g., Guts
    let preKoSurvivalResult = null;
    if (isKO) {
      const preKoSurvivalAbility = this.abilitySystem.hasPreKoSurvival(
        defendingPlayerId,
        defender.id
      );

      if (preKoSurvivalAbility) {
        // Flip a coin to determine if the Pokémon survives
        // For testing, coinFlip can be passed as a parameter (defaults to random)
        const coinFlip = attack.coinFlip || (() => Math.random() < 0.5);
        const heads = coinFlip();

        if (heads) {
          // Pokémon survives with 1 HP
          defender.currentHp = 1;
          isKO = false;

          preKoSurvivalResult = {
            abilityId: preKoSurvivalAbility._abilityId || `${defendingPlayerId}:${defender.id}:guts`,
            abilityName: preKoSurvivalAbility.name || 'Guts',
            coinFlip: 'heads',
            survived: true
          };
        } else {
          // Coin flip tails - Pokémon is KO'd
          preKoSurvivalResult = {
            abilityId: preKoSurvivalAbility._abilityId || `${defendingPlayerId}:${defender.id}:guts`,
            abilityName: preKoSurvivalAbility.name || 'Guts',
            coinFlip: 'tails',
            survived: false
          };
        }
      }
    }

    // Handle KO-triggered abilities (GAP-005)
    let koTriggerResults = [];
    if (isKO && this.koTriggerSystem) {
      koTriggerResults = this.koTriggerSystem.handleKnockout({
        playerId: defendingPlayerId,
        pokemonId: defender.id,
        attackingPlayerId: attackingPlayerId,
        attackingPokemonId: attacker.id,
        wasActive: true, // Active Pokémon can only be attacked in Active Spot
        source: 'attack'
      });
    }

    const result = {
      baseDamage,
      bonusApplied,
      reductionApplied,
      opponentReductionApplied: opponentReductionApplied || 0,
      weaknessApplied,
      finalDamage,
      isKO,
      damagePrevented,
      attackerName: attacker.name,
      defenderName: defender.name,
      defenderHpAfter: defender.currentHp,
      koTriggerResults,
      preKoSurvivalResult,
      energyCostPaid
    };

    // Log the attack event (before pre_ko_survival log for proper order)
    this.gameState.turnLog.push({
      type: 'attack',
      attackingPlayer: attackingPlayerId,
      defendingPlayer: defendingPlayerId,
      attack: attack.name || 'Unknown',
      ...result
    });

    // Log pre-KO survival event (if applicable) after attack log
    if (preKoSurvivalResult) {
      this.gameState.turnLog.push({
        type: 'pre_ko_survival',
        playerId: defendingPlayerId,
        pokemonId: defender.id,
        pokemonName: defender.name,
        abilityName: preKoSurvivalResult.abilityName,
        coinFlip: preKoSurvivalResult.coinFlip,
        survived: preKoSurvivalResult.survived,
        hpAfter: preKoSurvivalResult.survived ? 1 : 0
      });
    }

    return result;
  }

  /**
   * Calculate final damage without applying it (dry-run / preview).
   *
   * Useful for UI previews or condition checks before committing the attack.
   *
   * @param {string} attackingPlayerId
   * @param {string} defendingPlayerId
   * @param {number} baseDamage
   * @returns {Object} { baseDamage, bonusApplied, reductionApplied, opponentReductionApplied, weaknessApplied, finalDamage }
   */
  calculateDamage(attackingPlayerId, defendingPlayerId, baseDamage) {
    const attacker = this.gameState.players[attackingPlayerId].activePokemon;
    const defender = this.gameState.players[defendingPlayerId].activePokemon;

    const modifierResult = this.abilitySystem.applyDamageModifiers(
      attackingPlayerId,
      defendingPlayerId,
      baseDamage
    );

    // Include weakness in calculation
    const weaknessApplied = this.calculateWeakness(attacker, defender);

    return {
      baseDamage,
      bonusApplied: modifierResult.bonusApplied,
      reductionApplied: modifierResult.reductionApplied,
      opponentReductionApplied: modifierResult.opponentReductionApplied || 0,
      weaknessApplied,
      finalDamage: Math.max(0, modifierResult.finalDamage + weaknessApplied)
    };
  }

  /**
   * Get the effective damage reduction currently active for a defending player.
   * Delegates to AbilitySystem.getDamageReduction.
   *
   * @param {string} defendingPlayerId
   * @returns {number} Total damage reduction amount
   */
  getDamageReduction(defendingPlayerId) {
    return this.abilitySystem.getDamageReduction(defendingPlayerId);
  }
}

module.exports = AttackSystem;
