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
 * GAP-012: [Importante][C2] Daño escalado por Energía adjunta (Celebi ex)
 * GAP-013: [Importante][C2] Auto-daño (recoil) (Arcanine)
 * GAP-014: [Importante][C2] Efectos temporales sobre el defensor (Vulpix Tail Whip)
 * GAP-015: [Importante][C2] Snipe (Luxray) - Selección de target (Active/Banca)
 * GAP-016: [Importante][C2] Spread damage (Raichu (Gigashock))
 * GAP-017: [Importante][C2] Daño escalado por Pokémon en Banca (Cinccino)
 * GAP-018: [Importante][C2] Halve HP (Bidoof)
 * GAP-019: [Importante][C2] Bonus por "energía extra" adjunta (Blastoise)
 * GAP-020: [Importante][C2] Switch del atacante (Magikarp)
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
 * Supported damage scaling (GAP-012):
 * - damageScaling (attack level): scales damage based on attached energy
 *   - damageScaling: number - adds this much damage per energy attached
 *   - damageScaling: { perEnergy: number, energyType?: string } - perEnergy damage, optionally only for specific energy type
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
 * Real-card examples of damageScaling (GAP-012):
 * - Celebi ex: damage 10 + 10 per energy attached
 * - Gallade ex: damage 10 + 10 per energy attached
 *
 * Supported recoil damage (GAP-013):
 * - recoilDamage (attack level): self-damage dealt to the attacker after attacking
 *   - recoilDamage: number - fixed damage to attacker (always)
 *   - recoilDamage: { amount: number, condition: 'on_ko' } - only if defender is KO'd
 *   - Recoil damage bypasses damage modifiers (it's self-inflicted, not an attack)
 *   - Attacker can be KO'd by their own recoil
 *
 * Supported temporary defender effects (GAP-014):
 * - temporaryDefenderEffect (attack level): effect applied to the defending Pokémon after attack
 *   - type: 'cannot_attack' — defender cannot use attacks on its next turn
 *   - type: 'damage_reduction' — defender's attacks deal -value damage on its next turn
 *   - requiresCoinFlip: true — effect only applies on coin flip heads
 *   - duration: number — turns the effect lasts (default: 1)
 * - Temporary effects are cleared when the target Pokémon switches out or evolves
 *
 * Supported spread damage (GAP-016):
 * - spreadDamage (attack level): deals damage to multiple opponent Pokémon
 *   - spreadDamage: { amount: number, target: 'banque' | 'all' }
 *   - target: 'banque' - damage to each Benched Pokémon only (Raichu Gigashock)
 *   - target: 'all' - damage to all opponent's Pokémon (Active + Banque)
 * - Each target's damage is calculated independently (modifiers, weakness, etc.)
 * - KO triggers fire for each target that is KO'd
 *
 * Supported bench scaling (GAP-017):
 * - benchScaling (attack level): adds damage based on number of Pokémon in Banca
 *   - benchScaling: number - adds this much damage per Pokémon in Banca (counts self's bench by default)
 *   - benchScaling: { perPokemon: number, player: 'self' | 'opponent', type?: string, name?: string }
 *     - perPokemon: damage to add per Pokémon
 *     - player: 'self' (default) = count your own bench, 'opponent' = count opponent's bench
 *     - type: optional, only count Pokémon of this type (e.g., 'electric')
 *     - name: optional, only count Pokémon with this name (e.g., 'Nidoking')
 *
 * Real-card examples of benchScaling (GAP-017):
 * - Cinccino (Do the Wave): "This attack does 30 damage for each of your Benched Pokémon." → { perPokemon: 30, player: 'self' }
 * - Pikachu (Circle Circuit): "This attack does 10 damage for each of your Benched [L] Pokémon." → { perPokemon: 10, player: 'self', type: 'electric' }
 * - Beheeyem (Mind Jack): "This attack does 20 more damage for each of your opponent's Benched Pokémon." → { perPokemon: 20, player: 'opponent' }
 * - Nidoqueen (Lovestrike): "This attack does 50 more damage for each of your Benched Nidoking." → { perPokemon: 50, player: 'self', name: 'Nidoking' }
 *
 * Real-card examples of recoilDamage (GAP-013):
 * - Arcanine (Heat Tackle): "This Pokémon also does 20 damage to itself."
 * - Arcanine ex (Inferno Onrush): "This Pokémon also does 30 damage to itself."
 * - Rampardos (Head Smash): "This Pokémon also does 30 damage to itself."
 * - Vespiquen (Reckless Charge): "This Pokémon also does 20 damage to itself."
 * - Conditional: "If your opponent's Pokémon is KO'd, this Pokémon also does 50 damage to itself."
 *
 * Real-card examples of spreadDamage (GAP-016):
 * - Raichu (Gigashock): "This attack also does 20 damage to each of your opponent's Benched Pokémon."
 * - Palkia ex (Dimensional Storm): "This attack also does 20 damage to each of your opponent's Benched Pokémon."
 * - Alolan Ninetales (Frost Breath): "This attack also does 10 damage to each of your opponent's Benched Pokémon."
 *
 * Supported halve HP effect (GAP-018):
 * - halveHp (attack level): sets damage to half of the defender's remaining HP (rounded down)
 *   - halveHp: true - damage = Math.floor(defender.currentHp / 2)
 *   - When halveHp is true, the attack's base damage is ignored
 *   - Damage modifiers (bonus, reduction, weakness) still apply to the halved damage
 *   - If the defender has 1 HP remaining, halveHp does 0 damage (Math.floor(1/2) = 0)
 *   - If the defender has 0 HP (KO'd), halveHp does 0 damage
 *   - If halveHp results in 0 damage but defender is already at 0 HP, defender remains KO'd
 *
 * Real-card examples of halveHp (GAP-018):
 * - Bidoof (Super Fang): "Halve your opponent's Active Pokémon's remaining HP, rounded down."
 *
 * Supported extra energy bonus (GAP-019):
 * - extraEnergyBonus (attack level): adds damage based on energy beyond the attack cost
 *   - energyType: string - only count energy of this type (optional)
 *   - perExtraEnergy: number - damage to add per extra energy
 *   - threshold: number - minimum extra energy required for bonus to apply (default: 1)
 *   - bonusAmount: number - fixed bonus if threshold is met (alternative to perExtraEnergy)
 *
 * "Extra energy" = total energy attached - energy required by attack cost
 * Example: Attack costs 3 [W] Energy, Pokémon has 5 [W] Energy attached → 2 extra [W] Energy
 *
 * Real-card examples of extraEnergyBonus (GAP-019):
 * - Blastoise (Hydro Pump): "This attack does 30 more damage for each extra [W] Energy attached."
 *   → { energyType: 'water', perExtraEnergy: 30 }
 * - Lapras (Hydro Pump): "If this Pokémon has at least 2 extra [W] Energy attached, this attack does 50 more damage."
 *   → { energyType: 'water', threshold: 2, bonusAmount: 50 }
 * - Dhelmise (Energy Whip): "This attack does 20 more damage for each extra [G] Energy attached."
 *   → { energyType: 'grass', perExtraEnergy: 20 }
 * - Electivire (Exciting Voltage): "If this Pokémon has at least 3 extra [L] Energy attached, this attack does 90 more damage."
 *   → { energyType: 'electric', threshold: 3, bonusAmount: 90 }
 *
 * Attack execution flow:
 * 1. Validate energy costs (GAP-011) - check if attacker has enough energy
 * 2. Calculate halveHp damage if attack has halveHp: true (GAP-018) - damage = Math.floor(defender.currentHp / 2)
 * 3. If not halveHp, get base damage from the attack definition
 * 4. Apply damageScaling (GAP-012) - add damage based on attached energy (skipped if halveHp)
 * 5. Apply benchScaling (GAP-017) - add damage based on Pokémon in Banca (skipped if halveHp)
 * 6. Check if damage should be prevented (GAP-006)
 * 7. If not prevented, apply damage_bonus from attacking player's passive abilities
 * 8. Apply damage_reduction from defending player's passive abilities
 * 9. Apply opponent_damage_reduction from defending player's passive abilities
 * 10. Apply weakness (GAP-011) - add +20 damage if defender is weak to attacker's type
 * 11. Clamp final damage to minimum 0
 * 12. Apply final damage to defending Pokémon's current HP
 * 13. Check for pre-KO survival abilities (GAP-007) - flip coin to survive
 * 14. Determine if the defending Pokémon is knocked out (HP <= 0)
 * 15. Handle KO-triggered abilities (GAP-005) if KO'd
 * 16. Apply recoil damage to attacker (GAP-013) - self-damage after attacking
 * 17. Apply spread damage to Benched Pokémon (GAP-016) - if attack has spreadDamage config
 * 18. Log the attack event
 */

class AttackSystem {
  /**
   * @param {Object} gameState - GameState instance
   * @param {Object} abilitySystem - AbilitySystem instance
   * @param {Object} koTriggerSystem - KoTriggerSystem instance (optional)
   * @param {Object} temporaryEffectsSystem - TemporaryEffectsSystem instance (optional, GAP-014)
   * @param {Object} statusConditionSystem - StatusConditionSystem instance (optional, GAP-020)
   */
  constructor(gameState, abilitySystem, koTriggerSystem = null, temporaryEffectsSystem = null, statusConditionSystem = null) {
    this.gameState = gameState;
    this.abilitySystem = abilitySystem;
    this.koTriggerSystem = koTriggerSystem;
    this.temporaryEffectsSystem = temporaryEffectsSystem;
    this.statusConditionSystem = statusConditionSystem;
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
  // Damage Scaling by Bench Count (GAP-017)
  // ---------------------------------------------------------------------------

  /**
   * Calculate damage scaling based on number of Pokémon in Banca.
   *
   * Bench scaling format (two supported formats):
   * 1. Simple: benchScaling: number - adds this much damage per Pokémon in your bench
   *    Example: benchScaling: 30 adds 30 damage per Benched Pokémon
   * 2. Object: benchScaling: { perPokemon: number, player?: 'self' | 'opponent', type?: string, name?: string }
   *    Example: { perPokemon: 30 } adds 30 per Benched Pokémon (your bench)
   *    Example: { perPokemon: 20, player: 'opponent' } adds 20 per opponent's Benched Pokémon
   *    Example: { perPokemon: 10, player: 'self', type: 'electric' } adds 10 per electric Pokémon in your bench
   *    Example: { perPokemon: 50, player: 'self', name: 'Nidoking' } adds 50 per Nidoking in your bench
   *
   * Note: In Pocket TCG, the maximum bench size is 3 Pokémon (vs 5 in physical TCG).
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {number|Object} benchScaling - Bench scaling configuration
   * @returns {number} Damage to add from bench scaling
   */
  calculateBenchScaling(attackingPlayerId, benchScaling) {
    if (!benchScaling) {
      return 0;
    }

    let perPokemon = 0;
    let targetPlayer = 'self'; // Default: count your own bench
    let typeFilter = null;
    let nameFilter = null;

    // Parse benchScaling format
    if (typeof benchScaling === 'number') {
      perPokemon = benchScaling;
    } else if (typeof benchScaling === 'object') {
      perPokemon = benchScaling.perPokemon || 0;
      targetPlayer = benchScaling.player || 'self';
      typeFilter = benchScaling.type || null;
      nameFilter = benchScaling.name || null;
    }

    if (perPokemon === 0) {
      return 0;
    }

    // Determine which player's bench to count
    let playerIdToCount;
    if (targetPlayer === 'self') {
      playerIdToCount = attackingPlayerId;
    } else if (targetPlayer === 'opponent') {
      playerIdToCount = attackingPlayerId === 'player1' ? 'player2' : 'player1';
    } else {
      throw new Error(`Invalid bench scaling player: ${targetPlayer}`);
    }

    const player = this.gameState.players[playerIdToCount];
    const bench = player.banque || [];

    // Count matching Pokémon in the bench
    let pokemonCount = 0;
    bench.forEach(pokemon => {
      if (!pokemon) {
        return;
      }

      // Skip KO'd Pokémon
      if (pokemon.currentHp !== undefined && pokemon.currentHp <= 0) {
        return;
      }

      // Apply filters if specified
      if (typeFilter) {
        if (pokemon.type !== typeFilter) {
          return;
        }
      }

      if (nameFilter) {
        if (pokemon.name !== nameFilter) {
          return;
        }
      }

      pokemonCount++;
    });

    return pokemonCount * perPokemon;
  }

  // ---------------------------------------------------------------------------
  // Damage Scaling by Attached Energy (GAP-012)
  // ---------------------------------------------------------------------------

  /**
   * Calculate damage scaling based on attached energy.
   *
   * Damage scaling format (two supported formats):
   * 1. Simple: damageScaling: number - adds this much damage per energy attached
   *    Example: damageScaling: 10 adds 10 damage per energy
   * 2. Object: damageScaling: { perEnergy: number, energyType?: string }
   *    Example: { perEnergy: 10, energyType: 'grass' } adds 10 per grass energy only
   *    Example: { perEnergy: 10 } adds 10 per any energy (same as simple format)
   *
   * @param {Object} pokemon - Pokémon object with energy array
   * @param {number|Object} damageScaling - Damage scaling configuration
   * @returns {number} Damage to add from scaling
   */
  calculateDamageScaling(pokemon, damageScaling) {
    if (!damageScaling) {
      return 0;
    }

    if (!pokemon || !pokemon.energy || pokemon.energy.length === 0) {
      return 0;
    }

    let perEnergy = 0;
    let energyTypeFilter = null;

    // Parse damageScaling format
    if (typeof damageScaling === 'number') {
      perEnergy = damageScaling;
    } else if (typeof damageScaling === 'object') {
      perEnergy = damageScaling.perEnergy || 0;
      energyTypeFilter = damageScaling.energyType || null;
    }

    if (perEnergy === 0) {
      return 0;
    }

    // Count energy
    let energyCount = 0;
    if (energyTypeFilter) {
      // Count only specific energy type
      pokemon.energy.forEach(energy => {
        if (energy.type === energyTypeFilter) {
          energyCount++;
        }
      });
    } else {
      // Count all energy
      energyCount = pokemon.energy.length;
    }

    return energyCount * perEnergy;
  }

  // ---------------------------------------------------------------------------
  // Extra Energy Bonus Calculation (GAP-019)
  // ---------------------------------------------------------------------------

  /**
   * Calculate bonus damage based on extra energy attached (beyond the attack cost).
   *
   * "Extra energy" = total energy attached - energy required by attack cost
   *
   * Extra energy bonus format:
   * - energyType: string - only count energy of this type (optional)
   * - perExtraEnergy: number - damage to add per extra energy
   * - threshold: number - minimum extra energy required (default: 1)
   * - bonusAmount: number - fixed bonus if threshold is met (alternative to perExtraEnergy)
   *
   * Two modes of operation:
   * 1. Per-extra mode: perExtraEnergy specifies damage per extra energy
   *    Example: { energyType: 'water', perExtraEnergy: 30 }
   *    If attack costs 3 [W] and Pokémon has 5 [W], bonus = 2 * 30 = 60
   *
   * 2. Threshold mode: threshold + bonusAmount for fixed bonus
   *    Example: { energyType: 'water', threshold: 2, bonusAmount: 50 }
   *    If attack costs 3 [W] and Pokémon has 5 [W] (2 extra), bonus = 50
   *    If attack costs 3 [W] and Pokémon has 4 [W] (1 extra), bonus = 0 (below threshold)
   *
   * @param {Object} pokemon - Pokémon object with energy array
   * @param {Array} energyCost - Energy cost array (for calculating "extra" energy)
   * @param {Object} extraEnergyBonus - Extra energy bonus configuration
   * @returns {number} Damage bonus from extra energy
   */
  calculateExtraEnergyBonus(pokemon, energyCost, extraEnergyBonus) {
    if (!extraEnergyBonus) {
      return 0;
    }

    if (!pokemon || !pokemon.energy || pokemon.energy.length === 0) {
      return 0;
    }

    if (!energyCost || energyCost.length === 0) {
      // No energy cost means all energy is "extra"
      energyCost = [];
    }

    // Parse extraEnergyBonus configuration
    const energyTypeFilter = extraEnergyBonus.energyType || null;
    const perExtraEnergy = extraEnergyBonus.perExtraEnergy || 0;
    const threshold = extraEnergyBonus.threshold || 1;
    const bonusAmount = extraEnergyBonus.bonusAmount || 0;

    // Count required energy by type
    const requiredByType = {};
    energyCost.forEach(costType => {
      const type = costType || 'colorless';
      requiredByType[type] = (requiredByType[type] || 0) + 1;
    });

    // Count available energy by type
    const availableByType = {};
    pokemon.energy.forEach(energy => {
      const type = energy.type || 'colorless';
      availableByType[type] = (availableByType[type] || 0) + 1;
    });

    let extraEnergyCount = 0;

    if (energyTypeFilter) {
      // Filter by specific energy type
      const availableOfFilter = availableByType[energyTypeFilter] || 0;
      const requiredOfFilter = requiredByType[energyTypeFilter] || 0;

      extraEnergyCount = Math.max(0, availableOfFilter - requiredOfFilter);
    } else {
      // Count all extra energy (total - cost)
      // This is tricky because colorless can satisfy any specific cost
      // Simplified approach: count total energy minus total cost
      const totalEnergy = pokemon.energy.length;
      const totalCost = energyCost.length;
      extraEnergyCount = Math.max(0, totalEnergy - totalCost);
    }

    // Apply bonus based on mode
    if (perExtraEnergy > 0) {
      // Per-extra mode: bonus = extra energy count * perExtraEnergy
      return extraEnergyCount * perExtraEnergy;
    } else if (bonusAmount > 0) {
      // Threshold mode: bonus = bonusAmount if extra energy >= threshold
      return (extraEnergyCount >= threshold) ? bonusAmount : 0;
    }

    return 0;
  }

  // ---------------------------------------------------------------------------
  // Post-Attack Switch (GAP-020)
  // ---------------------------------------------------------------------------

  /**
   * Switch the attacking Pokémon with a Benched Pokémon after the attack.
   *
   * Post-attack switch format:
   * - { to: 'bench' } - Switch with any Benched Pokémon (player chooses)
   * - { to: 'bench', pokemonId: string } - Switch with specific Benched Pokémon
   *
   * When a Pokémon switches:
   * - The attacking Pokémon moves to the Banca
   * - The chosen Benched Pokémon becomes the Active Pokémon
   * - All special conditions on both Pokémon are removed (GAP-020: "con limpieza de estados")
   *
   * Real-card examples (GAP-020):
   * - Magikarp: Attacks, then switches with a Benched Pokémon
   * - Cosmog: Similar mechanic - switch after attacking
   *
   * Switch mechanics:
   * - The switch happens AFTER all other attack effects (damage, recoil, spread, temporary effects)
   * - If the attacker is KO'd (by its own recoil or other effects), no switch occurs
   * - If the target Benched Pokémon is KO'd, it cannot be switched to
   * - Switching clears all special conditions from both Pokémon (poison, burn, sleep, paralyzed, confused)
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {Object} attacker - The attacking Pokémon
   * @param {Object} postAttackSwitchConfig - Post-attack switch configuration
   * @returns {Object} Result with success status and details
   */
  applyPostAttackSwitch(attackingPlayerId, attacker, postAttackSwitchConfig) {
    if (!postAttackSwitchConfig) {
      return {
        success: false,
        reason: 'no_config',
        message: 'No post-attack switch configuration provided'
      };
    }

    // Check if attacker was KO'd (can't switch if dead)
    if (attacker.currentHp <= 0) {
      return {
        success: false,
        reason: 'attacker_ko',
        message: 'Attacking Pokémon was KO\'d, cannot switch'
      };
    }

    const player = this.gameState.players[attackingPlayerId];
    const banque = player.banque || [];

    // Determine target Pokémon
    let targetPokemon = null;
    let targetIndex = -1;

    if (postAttackSwitchConfig.pokemonId) {
      // Switch with specific Pokémon
      targetIndex = banque.findIndex(p => p && p.id === postAttackSwitchConfig.pokemonId);
      if (targetIndex === -1) {
        return {
          success: false,
          reason: 'target_not_found',
          message: `Target Pokémon with id ${postAttackSwitchConfig.pokemonId} not found on bench`
        };
      }
      targetPokemon = banque[targetIndex];
    } else {
      // Switch with first available Pokémon on bench
      targetIndex = banque.findIndex(p => p && p.currentHp > 0);
      if (targetIndex === -1) {
        return {
          success: false,
          reason: 'no_valid_targets',
          message: 'No valid Pokémon to switch to on bench'
        };
      }
      targetPokemon = banque[targetIndex];
    }

    // Check if target is KO'd
    if (targetPokemon.currentHp <= 0) {
      return {
        success: false,
        reason: 'target_ko',
        message: 'Target Pokémon on bench is KO\'d, cannot switch'
      };
    }

    // Track conditions that are removed (for logging and GAP-020 requirement)
    const conditionsRemoved = [];

    // Clean special conditions from the Pokémon moving to bench
    if (this.statusConditionSystem) {
      const attackerCondition = this.statusConditionSystem.getCondition(attackingPlayerId, attacker.id);
      if (attackerCondition) {
        this.statusConditionSystem.removeCondition(attackingPlayerId, attacker.id);
        conditionsRemoved.push({ pokemonId: attacker.id, pokemonName: attacker.name, condition: attackerCondition });
      }

      const targetCondition = this.statusConditionSystem.getCondition(attackingPlayerId, targetPokemon.id);
      if (targetCondition) {
        this.statusConditionSystem.removeCondition(attackingPlayerId, targetPokemon.id);
        conditionsRemoved.push({ pokemonId: targetPokemon.id, pokemonName: targetPokemon.name, condition: targetCondition });
      }
    } else if (attacker.specialCondition) {
      // Fallback if statusConditionSystem is not available
      conditionsRemoved.push({ pokemonId: attacker.id, pokemonName: attacker.name, condition: attacker.specialCondition });
      attacker.specialCondition = null;
      if (targetPokemon.specialCondition) {
        conditionsRemoved.push({ pokemonId: targetPokemon.id, pokemonName: targetPokemon.name, condition: targetPokemon.specialCondition });
        targetPokemon.specialCondition = null;
      }
    }

    // Perform the switch
    const oldActive = attacker;
    player.activePokemon = targetPokemon;
    player.banque[targetIndex] = oldActive;

    // Log the switch event
    this.gameState.turnLog.push({
      type: 'post_attack_switch',
      player: attackingPlayerId,
      fromPokemonId: oldActive.id,
      fromPokemonName: oldActive.name,
      toPokemonId: targetPokemon.id,
      toPokemonName: targetPokemon.name,
      conditionsRemoved
    });

    return {
      success: true,
      details: {
        fromPokemonId: oldActive.id,
        fromPokemonName: oldActive.name,
        toPokemonId: targetPokemon.id,
        toPokemonName: targetPokemon.name,
        conditionsRemoved
      }
    };
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
  // Recoil Damage Calculation (GAP-013)
  // ---------------------------------------------------------------------------

  /**
   * Calculate the recoil damage that the attacker takes after using an attack.
   *
   * Supported formats:
   * - number: fixed recoil damage (always applied)
   *   Example: recoilDamage: 20 → attacker takes 20 damage
   * - { amount: number, condition: 'on_ko' }: recoil only if defender was KO'd
   *   Example: recoilDamage: { amount: 50, condition: 'on_ko' }
   *
   * Recoil damage bypasses all damage modifiers — it's self-inflicted damage.
   *
   * @param {number|Object} recoilDamage - Recoil damage config from attack definition
   * @param {boolean} defenderWasKO - Whether the defender was KO'd by this attack
   * @returns {number} Amount of recoil damage to apply to the attacker
   */
  calculateRecoilDamage(recoilDamage, defenderWasKO = false) {
    if (!recoilDamage) {
      return 0;
    }

    // Simple fixed number: always apply
    if (typeof recoilDamage === 'number') {
      return recoilDamage;
    }

    // Object format with optional condition
    if (typeof recoilDamage === 'object') {
      const amount = recoilDamage.amount || 0;
      const condition = recoilDamage.condition || null;

      if (condition === 'on_ko') {
        // Only apply recoil if the defender was knocked out
        return defenderWasKO ? amount : 0;
      }

      // No condition: always apply
      return amount;
    }

    return 0;
  }

  // ---------------------------------------------------------------------------
  // Spread Damage Calculation (GAP-016)
  // ---------------------------------------------------------------------------

  /**
   * Apply spread damage to opponent's Benched Pokémon.
   *
   * Spread damage format: { amount: number, target: 'banque' | 'all' }
   * - target: 'banque' - damage to each Benched Pokémon only (Raichu Gigashock)
   * - target: 'all' - damage to all opponent's Pokémon (Active + Banque)
   *
   * Each target's damage is calculated independently:
   * - Damage modifiers apply to each target separately
   * - Weakness applies to each target separately
   * - KO triggers fire for each target that is KO'd
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {Object} attacker - Attacking Pokémon
   * @param {Object} spreadDamageConfig - Spread damage config
   * @returns {Array} Array of spread damage results for each target
   */
  applySpreadDamage(attackingPlayerId, attacker, spreadDamageConfig) {
    const results = [];

    if (!spreadDamageConfig || spreadDamageConfig.amount === undefined || spreadDamageConfig.amount === null) {
      return results;
    }

    const targetMode = spreadDamageConfig.target || 'banque';
    const amount = spreadDamageConfig.amount;
    const defendingPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';

    // Determine which Pokémon to target
    let targets = [];
    const defendingPlayer = this.gameState.players[defendingPlayerId];

    if (targetMode === 'banque') {
      // Target only Benched Pokémon
      targets = defendingPlayer.banque || [];
    } else if (targetMode === 'all') {
      // Target all Pokémon (Active + Banque)
      targets = [defendingPlayer.activePokemon, ...(defendingPlayer.banque || [])];
    } else {
      throw new Error(`Invalid spread damage target: ${targetMode}`);
    }

    // Apply damage to each target
    targets.forEach(target => {
      if (!target || target.currentHp <= 0) {
        // Skip non-existent or already KO'd Pokémon
        return;
      }

      // Initialize currentHp if not set
      if (target.currentHp === undefined || target.currentHp === null) {
        target.currentHp = target.hp || 0;
      }

      // Check if damage should be prevented for this target
      const damagePrevented = this.abilitySystem.preventDamage(
        attackingPlayerId,
        attacker.id,
        defendingPlayerId,
        target.id
      );

      let finalDamage = 0;
      let weaknessApplied = 0;
      let bonusApplied = 0;
      let reductionApplied = 0;

      if (!damagePrevented) {
        // Apply damage modifiers for this target
        const modifierResult = this.abilitySystem.applyDamageModifiers(
          attackingPlayerId,
          defendingPlayerId,
          amount
        );

        let damageAfterModifiers = modifierResult.finalDamage;
        bonusApplied = modifierResult.bonusApplied;
        reductionApplied = modifierResult.reductionApplied;

        // Apply weakness for this target
        weaknessApplied = this.calculateWeakness(attacker, target);
        damageAfterModifiers += weaknessApplied;

        finalDamage = Math.max(0, damageAfterModifiers);
      }

      // Apply damage to target's HP
      const hpBefore = target.currentHp;
      target.currentHp = Math.max(0, target.currentHp - finalDamage);
      const isKO = target.currentHp <= 0;

      // Handle KO-triggered abilities if this target is KO'd
      let koTriggerResults = [];
      if (isKO && this.koTriggerSystem) {
        const wasActive = (target === defendingPlayer.activePokemon);
        koTriggerResults = this.koTriggerSystem.handleKnockout({
          playerId: defendingPlayerId,
          pokemonId: target.id,
          attackingPlayerId: attackingPlayerId,
          attackingPokemonId: attacker.id,
          wasActive: wasActive,
          source: 'spread_damage'
        });
      }

      // Record result for this target
      results.push({
        pokemonId: target.id,
        pokemonName: target.name,
        location: (target === defendingPlayer.activePokemon) ? 'active' : 'banque',
        hpBefore,
        hpAfter: target.currentHp,
        damage: finalDamage,
        isKO,
        damagePrevented,
        weaknessApplied,
        bonusApplied,
        reductionApplied,
        koTriggerResults
      });

      // Log spread damage event
      this.gameState.turnLog.push({
        type: 'spread_damage',
        attackingPlayer: attackingPlayerId,
        defendingPlayer: defendingPlayerId,
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: target.id,
        targetName: target.name,
        targetLocation: (target === defendingPlayer.activePokemon) ? 'active' : 'banque',
        damage: finalDamage,
        isKO,
        damagePrevented,
        weaknessApplied
      });
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // Target Selection (GAP-015)
  // ---------------------------------------------------------------------------

  /**
   * Get a target Pokémon from a player's field (Active or Banque).
   *
   * Target format: { location: 'active' | 'banque', pokemonId?: string }
   * - If location is 'active', pokemonId is ignored (returns active Pokemon)
   * - If location is 'banque', pokemonId is required
   *
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} target - Target specification
   * @returns {Object|null} The target Pokémon or null if not found
   */
  getTargetPokemon(playerId, target) {
    if (!target || !target.location) {
      throw new Error('Target must have a location property');
    }

    const player = this.gameState.players[playerId];

    if (target.location === 'active') {
      return player.activePokemon;
    }

    if (target.location === 'banque') {
      if (!target.pokemonId) {
        throw new Error('Target pokemonId is required for banque location');
      }

      const benched = player.banque.find(p => p.id === target.pokemonId);
      if (!benched) {
        return null;
      }
      return benched;
    }

    throw new Error(`Invalid target location: ${target.location}`);
  }

  /**
   * Validate that a target exists and is attackable.
   *
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} target - Target specification
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validateTarget(playerId, target) {
    try {
      const pokemon = this.getTargetPokemon(playerId, target);

      if (!pokemon) {
        return {
          valid: false,
          reason: 'target_not_found'
        };
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        reason: err.message
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Attack Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute an attack from the active Pokémon of the attacking player
   * against the active Pokémon of the defending player.
   *
   * @param {string} attackingPlayerId - 'player1' or 'player2'
   * @param {Object} attack - Attack definition: { name: string, damage: number, energyCost?: Array, coinFlip?: Function, recoilDamage?: number|Object }
   * @param {Function} [attack.coinFlip] - Optional deterministic coin-flip function for tests; defaults to random
   * @param {number|Object} [attack.recoilDamage] - Optional recoil damage config (GAP-013)
   * @returns {Object} Result: { baseDamage, bonusApplied, reductionApplied, weaknessApplied, finalDamage, isKO, attacker, defender, damagePrevented, preKoSurvivalResult, koTriggerResults, energyCostPaid, recoilDamage, attackerIsKO, targetLocation }
   */
  executeAttack(attackingPlayerId, attack, target = null) {
    const defendingPlayerId = attackingPlayerId === 'player1' ? 'player2' : 'player1';

    const attacker = this.gameState.players[attackingPlayerId].activePokemon;

    // Default to active target if not specified (backward compatibility)
    const effectiveTarget = target || { location: 'active' };

    // Get defender based on target
    const defender = this.getTargetPokemon(defendingPlayerId, effectiveTarget);

    // Validate target exists (GAP-015)
    if (!defender) {
      throw new Error(`Target not found: ${JSON.stringify(effectiveTarget)}`);
    }

    if (!attacker) {
      throw new Error(`${attackingPlayerId} has no active Pokémon to attack with`);
    }

    // Check temporary cannot_attack effect (GAP-014)
    if (this.temporaryEffectsSystem && this.temporaryEffectsSystem.cannotAttack(attackingPlayerId, attacker.id)) {
      this.gameState.turnLog.push({
        type: 'attack_blocked_by_temporary_effect',
        player: attackingPlayerId,
        attack: attack.name || 'Unknown',
        attacker: attacker.name,
        reason: 'cannot_attack'
      });
      throw new Error(`${attacker.name} cannot attack due to a temporary effect`);
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

    // Calculate base damage including halveHp (GAP-018), damageScaling (GAP-012), benchScaling (GAP-017), and extraEnergyBonus (GAP-019)
    let baseDamage = attack.damage || 0;
    let damageScaling = 0;
    let benchScaling = 0;
    let extraEnergyBonus = 0;
    let halveHpApplied = false;

    // Check if this is a halveHp attack (GAP-018)
    if (attack.halveHp) {
      // Initialize defender's currentHp from hp if not already set
      if (defender.currentHp === undefined || defender.currentHp === null) {
        defender.currentHp = defender.hp || 0;
      }

      // Halve HP: damage = Math.floor(remaining HP / 2), rounded down
      const remainingHp = defender.currentHp;
      baseDamage = Math.floor(remainingHp / 2);
      halveHpApplied = true;
    } else {
      // Normal damage calculation with scaling
      damageScaling = this.calculateDamageScaling(attacker, attack.damageScaling);
      benchScaling = this.calculateBenchScaling(attackingPlayerId, attack.benchScaling);
      extraEnergyBonus = this.calculateExtraEnergyBonus(attacker, energyCost, attack.extraEnergyBonus);
    }

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
      // Note: baseDamage includes damageScaling, benchScaling, and extraEnergyBonus here
      const modifierResult = this.abilitySystem.applyDamageModifiers(
        attackingPlayerId,
        defendingPlayerId,
        baseDamage + damageScaling + benchScaling + extraEnergyBonus
      );

      let damageAfterModifiers = modifierResult.finalDamage;
      bonusApplied = modifierResult.bonusApplied;
      reductionApplied = modifierResult.reductionApplied;
      var opponentReductionApplied = modifierResult.opponentReductionApplied;

      // Apply temporary damage reduction on attacker (GAP-014)
      // This represents a debuff placed on the attacker by a previous attack effect
      if (this.temporaryEffectsSystem) {
        const temporaryReduction = this.temporaryEffectsSystem.getOutgoingDamageReduction(
          attackingPlayerId,
          attacker.id
        );
        if (temporaryReduction > 0) {
          damageAfterModifiers -= temporaryReduction;
        }
      }

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
        wasActive: effectiveTarget.location === 'active', // True if targeted active, false if benched (GAP-015)
        source: 'attack'
      });
    }

    // Apply recoil damage to attacker (GAP-013)
    // Recoil bypasses damage modifiers — it's self-inflicted damage
    let recoilDamageApplied = 0;
    let attackerIsKO = false;
    if (attack.recoilDamage) {
      recoilDamageApplied = this.calculateRecoilDamage(attack.recoilDamage, isKO);

      if (recoilDamageApplied > 0) {
        // Initialize attacker's currentHp if not already set
        if (attacker.currentHp === undefined || attacker.currentHp === null) {
          attacker.currentHp = attacker.hp || 0;
        }

        attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamageApplied);
        attackerIsKO = attacker.currentHp <= 0;
      }
    }

    // Apply spread damage to Benched Pokémon (GAP-016)
    // e.g. Raichu (Gigashock): "This attack also does 20 damage to each of your opponent's Benched Pokémon."
    let spreadDamageResults = [];
    if (attack.spreadDamage) {
      spreadDamageResults = this.applySpreadDamage(attackingPlayerId, attacker, attack.spreadDamage);
    }

    // Apply temporary defender effect (GAP-014)
    // e.g. Vulpix (Tail Whip): "Your opponent's Active Pokémon can't attack next turn."
    let temporaryEffectResult = null;
    if (attack.temporaryDefenderEffect && this.temporaryEffectsSystem && !isKO) {
      // Only apply if defender survived the attack
      const effectDef = {
        ...attack.temporaryDefenderEffect,
        sourceName: attack.temporaryDefenderEffect.sourceName || attack.name || null
      };
      const coinFlipForEffect = attack.coinFlip || null;
      temporaryEffectResult = this.temporaryEffectsSystem.applyEffect(
        defendingPlayerId,
        defender.id,
        effectDef,
        coinFlipForEffect
      );
    }

    // Apply post-attack switch (GAP-020)
    // e.g. Magikarp, Cosmog: switch with a Benched Pokémon after attacking
    let postAttackSwitchResult = null;
    if (attack.postAttackSwitch) {
      // applyPostAttackSwitch will handle the KO'd attacker case internally
      postAttackSwitchResult = this.applyPostAttackSwitch(attackingPlayerId, attacker, attack.postAttackSwitch);
    }

    const result = {
      baseDamage,
      damageScaling,
      benchScaling,
      extraEnergyBonus,
      halveHpApplied,
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
      energyCostPaid,
      recoilDamageApplied,
      attackerIsKO,
      attackerHpAfter: attacker.currentHp,
      temporaryEffectResult,
      postAttackSwitchResult, // GAP-020: Result of post-attack switch
      targetLocation: effectiveTarget.location, // 'active' or 'banque' (GAP-015)
      spreadDamageResults // GAP-016: Results of spread damage to Benched Pokémon
    };

    // Log the attack event (before pre_ko_survival log for proper order)
    this.gameState.turnLog.push({
      type: 'attack',
      attackingPlayer: attackingPlayerId,
      defendingPlayer: defendingPlayerId,
      attack: attack.name || 'Unknown',
      target: effectiveTarget, // Include target information (GAP-015)
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

    // Log recoil damage event (GAP-013)
    if (recoilDamageApplied > 0) {
      this.gameState.turnLog.push({
        type: 'recoil_damage',
        playerId: attackingPlayerId,
        pokemonId: attacker.id,
        pokemonName: attacker.name,
        recoilDamage: recoilDamageApplied,
        attackerIsKO,
        attackerHpAfter: attacker.currentHp
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
   * @param {Object} [attack] - Optional attack object with damageScaling property
   * @returns {Object} { baseDamage, damageScaling, benchScaling, extraEnergyBonus, bonusApplied, reductionApplied, opponentReductionApplied, weaknessApplied, finalDamage }
   */
  calculateDamage(attackingPlayerId, defendingPlayerId, baseDamage, attack = null) {
    const attacker = this.gameState.players[attackingPlayerId].activePokemon;
    const defender = this.gameState.players[defendingPlayerId].activePokemon;

    // Calculate damage scaling if attack object is provided
    const damageScaling = attack ? this.calculateDamageScaling(attacker, attack.damageScaling) : 0;
    const benchScaling = attack ? this.calculateBenchScaling(attackingPlayerId, attack.benchScaling) : 0;
    const energyCost = attack ? (attack.energyCost || []) : [];
    const extraEnergyBonus = attack ? this.calculateExtraEnergyBonus(attacker, energyCost, attack.extraEnergyBonus) : 0;

    const modifierResult = this.abilitySystem.applyDamageModifiers(
      attackingPlayerId,
      defendingPlayerId,
      baseDamage + damageScaling + benchScaling + extraEnergyBonus
    );

    // Include weakness in calculation
    const weaknessApplied = this.calculateWeakness(attacker, defender);

    return {
      baseDamage,
      damageScaling,
      benchScaling,
      extraEnergyBonus,
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
