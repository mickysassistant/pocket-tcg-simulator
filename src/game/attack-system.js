/**
 * Attack System - Handles attack execution and damage calculation
 *
 * This file implements the attack execution flow for Pocket TCG Simulator,
 * incorporating ability-based damage modifiers from AbilitySystem.
 *
 * GAP-002: [Crítico][C1] Reducción de daño recibido
 *
 * Supported damage modifier effects:
 * - damage_bonus (attacker side): adds extra damage to outgoing attacks
 * - damage_reduction (defender side): reduces incoming damage
 *
 * Real-card examples of damage_reduction:
 * - Magnezone (Resilience Link): reduce damage received by 30
 * - Regirock (Exoskeleton): reduce damage received by 30
 * - Shuckle ex (Solid Shell): reduce damage received by 20
 *
 * Attack execution flow:
 * 1. Get base damage from the attack definition
 * 2. Apply damage_bonus from attacking player's passive abilities
 * 3. Apply damage_reduction from defending player's passive abilities
 * 4. Clamp final damage to minimum 0
 * 5. Apply final damage to defending Pokémon's current HP
 * 6. Determine if the defending Pokémon is knocked out (HP <= 0)
 * 7. Log the attack event
 */

class AttackSystem {
  /**
   * @param {Object} gameState - GameState instance
   * @param {Object} abilitySystem - AbilitySystem instance
   */
  constructor(gameState, abilitySystem) {
    this.gameState = gameState;
    this.abilitySystem = abilitySystem;
  }

  // ---------------------------------------------------------------------------
  // Attack Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute an attack from the active Pokémon of the attacking player
   * against the active Pokémon of the defending player.
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {Object} attack - Attack definition: { name: string, damage: number }
   * @returns {Object} Result: { baseDamage, bonusApplied, reductionApplied, finalDamage, isKO, attacker, defender }
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

    // Apply all damage modifiers (bonus from attacker abilities + reduction from defender abilities)
    const modifierResult = this.abilitySystem.applyDamageModifiers(
      attackingPlayerId,
      defendingPlayerId,
      baseDamage
    );

    const { finalDamage, bonusApplied, reductionApplied } = modifierResult;

    // Apply damage to defender's HP
    // Initialize currentHp from hp if not already set
    if (defender.currentHp === undefined || defender.currentHp === null) {
      defender.currentHp = defender.hp || 0;
    }

    defender.currentHp = Math.max(0, defender.currentHp - finalDamage);
    const isKO = defender.currentHp <= 0;

    const result = {
      baseDamage,
      bonusApplied,
      reductionApplied,
      finalDamage,
      isKO,
      attackerName: attacker.name,
      defenderName: defender.name,
      defenderHpAfter: defender.currentHp
    };

    // Log the attack event
    this.gameState.turnLog.push({
      type: 'attack',
      attackingPlayer: attackingPlayerId,
      defendingPlayer: defendingPlayerId,
      attack: attack.name || 'Unknown',
      ...result
    });

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
