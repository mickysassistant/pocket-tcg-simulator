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
 * 1. Get base damage from the attack definition
 * 2. Check if damage should be prevented (GAP-006)
 * 3. If not prevented, apply damage_bonus from attacking player's passive abilities
 * 4. Apply damage_reduction from defending player's passive abilities
 * 5. Apply opponent_damage_reduction from defending player's passive abilities
 * 6. Clamp final damage to minimum 0
 * 7. Apply final damage to defending Pokémon's current HP
 * 8. Check for pre-KO survival abilities (GAP-007) - flip coin to survive
 * 9. Determine if the defending Pokémon is knocked out (HP <= 0)
 * 10. Handle KO-triggered abilities (GAP-005) if KO'd
 * 11. Log the attack event
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
  // Attack Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute an attack from the active Pokémon of the attacking player
   * against the active Pokémon of the defending player.
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {Object} attack - Attack definition: { name: string, damage: number, coinFlip?: Function }
   * @param {Function} [attack.coinFlip] - Optional deterministic coin-flip function for tests; defaults to random
   * @returns {Object} Result: { baseDamage, bonusApplied, reductionApplied, finalDamage, isKO, attacker, defender, damagePrevented, preKoSurvivalResult, koTriggerResults }
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

    if (!damagePrevented) {
      // Apply all damage modifiers (bonus from attacker abilities + reduction from defender abilities + opponent reduction from defender's debuff abilities)
      const modifierResult = this.abilitySystem.applyDamageModifiers(
        attackingPlayerId,
        defendingPlayerId,
        baseDamage
      );

      finalDamage = modifierResult.finalDamage;
      bonusApplied = modifierResult.bonusApplied;
      reductionApplied = modifierResult.reductionApplied;
      var opponentReductionApplied = modifierResult.opponentReductionApplied;
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
      finalDamage,
      isKO,
      damagePrevented,
      attackerName: attacker.name,
      defenderName: defender.name,
      defenderHpAfter: defender.currentHp,
      koTriggerResults,
      preKoSurvivalResult
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
   * @returns {Object} { baseDamage, bonusApplied, reductionApplied, finalDamage }
   */
  calculateDamage(attackingPlayerId, defendingPlayerId, baseDamage) {
    return this.abilitySystem.applyDamageModifiers(attackingPlayerId, defendingPlayerId, baseDamage);
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
