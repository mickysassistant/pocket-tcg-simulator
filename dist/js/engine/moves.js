/**
 * Move Validation & Execution - Pokemon TCG Pocket Simulator
 *
 * Pure functions that validate and apply moves to game state.
 * Each move returns { valid, reason?, newState? }.
 */
import { MAX_BENCH, STATUS } from './constants.js';
import { cloneState, addLogEntry } from './game-state.js';
// ============================================================================
// MOVE TYPES
// ============================================================================
/**
 * All supported move kinds for drag & drop and action buttons.
 */
export const MOVE = {
    PLAY_TO_ACTIVE: 'playToActive', // Hand → Active (Basic only, if empty)
    PLAY_TO_BENCH: 'playToBench', // Hand → Bench  (Basic only, if space)
    ATTACH_ENERGY: 'attachEnergy', // Energy Zone → any own Pokemon
    RETREAT: 'retreat', // Active ↔ Bench swap
    EVOLVE: 'evolve', // Hand → Active/Bench Pokemon
};
// ============================================================================
// VALIDATION
// ============================================================================
/**
 * Check whether a card is a Basic Pokemon.
 * @param {Object} card - card-loader card object
 * @returns {boolean}
 */
function isBasicPokemon(card) {
    if (!card)
        return false;
    // TODO-Pocket-Verify: exact field name for stage; assuming subtypes or stage
    if (card.subtypes && card.subtypes.includes('Basic'))
        return true;
    if (card.stage === 'Basic' || card.stage === 0)
        return true;
    // Fallback: if no evolves_from, treat as basic for Pokemon cards
    if (card.supertype === 'Pokémon' && !card.evolvesFrom)
        return true;
    return false;
}
/**
 * Check whether a card is a Trainer card.
 */
function isTrainer(card) {
    return card && card.supertype === 'Trainer';
}
/**
 * Validate playing a Basic Pokemon from hand to active zone.
 */
export function canPlayToActive(state, playerId, handIndex) {
    const player = state[playerId];
    if (!player)
        return { valid: false, reasonKey: 'errors.validation.invalidPlayer' };
    if (player.active !== null)
        return { valid: false, reasonKey: 'errors.validation.activeZoneOccupied' };
    if (handIndex < 0 || handIndex >= player.hand.length)
        return { valid: false, reasonKey: 'errors.validation.invalidHandIndex' };
    // Card type check deferred to caller (needs getCard); we just check slot.
    return { valid: true };
}
/**
 * Validate playing a Basic Pokemon from hand to bench.
 */
export function canPlayToBench(state, playerId, handIndex) {
    const player = state[playerId];
    if (!player)
        return { valid: false, reasonKey: 'errors.validation.invalidPlayer' };
    if (player.bench.length >= MAX_BENCH)
        return { valid: false, reasonKey: 'errors.validation.benchFull' };
    if (handIndex < 0 || handIndex >= player.hand.length)
        return { valid: false, reasonKey: 'errors.validation.invalidHandIndex' };
    return { valid: true };
}
/**
 * Validate attaching energy from Energy Zone to a Pokemon.
 */
export function canAttachEnergy(state, playerId) {
    const player = state[playerId];
    if (!player)
        return { valid: false, reasonKey: 'errors.validation.invalidPlayer' };
    if (player.energyZone.usedThisTurn)
        return { valid: false, reasonKey: 'errors.validation.energyAlreadyUsed' };
    if (!player.energyZone.currentEnergy)
        return { valid: false, reasonKey: 'errors.validation.noEnergyAvailable' };
    // First turn rule: player going first can't attach energy on turn 0
    // TODO-Pocket-Verify: Is this per-player or global turn 0?
    if (state.turn === 0 && playerId === 'player1')
        return { valid: false, reasonKey: 'errors.validation.noEnergyFirstTurn' };
    return { valid: true };
}
/**
 * Validate retreating: swap active with a bench Pokemon.
 */
export function canRetreat(state, playerId, benchIndex) {
    const player = state[playerId];
    if (!player)
        return { valid: false, reasonKey: 'errors.validation.invalidPlayer' };
    if (!player.active)
        return { valid: false, reasonKey: 'errors.validation.noActivePokemon' };
    if (player.retreatedThisTurn)
        return { valid: false, reasonKey: 'errors.validation.alreadyRetreated' };
    if (benchIndex < 0 || benchIndex >= player.bench.length)
        return { valid: false, reasonKey: 'errors.validation.invalidBenchIndex' };
    if (!player.bench[benchIndex])
        return { valid: false, reasonKey: 'errors.validation.benchSlotEmpty' };
    // Status blocks retreat
    const st = player.active.status;
    if (st === STATUS.SLEEP)
        return { valid: false, reasonKey: 'errors.validation.cannotRetreatAsleep' };
    if (st === STATUS.PARALYSIS)
        return { valid: false, reasonKey: 'errors.validation.cannotRetreatParalyzed' };
    // Retreat cost check — need energy >= retreatCost
    // We pass cost externally because card-loader is UI-side
    return { valid: true };
}
/**
 * Validate evolution: play an evolution card from hand onto a Pokemon.
 */
export function canEvolve(state, playerId, handIndex, targetLocation, getCardFn) {
    const player = state[playerId];
    if (!player)
        return { valid: false, reasonKey: 'errors.validation.invalidPlayer' };
    // No evolution on first turn (both players)
    // TODO-Pocket-Verify: "first turn" = turn 0 only, or turn 0 & 1?
    if (state.turn <= 1)
        return { valid: false, reasonKey: 'errors.validation.cannotEvolveFirstTurn' };
    const target = targetLocation === 'active'
        ? player.active
        : player.bench[targetLocation];
    if (!target)
        return { valid: false, reasonKey: 'errors.validation.targetPokemonNotFound' };
    // Can't evolve a Pokemon played this turn
    if (target.turnPlayed === state.turn)
        return { valid: false, reasonKey: 'errors.validation.cannotEvolvePlayedThisTurn' };
    // Can't evolve a Pokemon that already evolved this turn
    if (target.lastEvolved === state.turn)
        return { valid: false, reasonKey: 'errors.validation.alreadyEvolvedThisTurn' };
    // Validate evolvesFrom relationship (BUG-008 fix)
    if (getCardFn) {
        const handCardId = player.hand[handIndex];
        const evoCard = getCardFn(handCardId);
        const targetCard = getCardFn(target.cardId);
        if (evoCard && targetCard) {
            // Check that the evolution card's evolvesFrom matches the target's name
            // evolvesFrom can be stored in 'stage' or 'evolvesFrom' depending on data format
            const evolvesFrom = evoCard.evolvesFrom || evoCard.stage;
            if (evolvesFrom && evolvesFrom !== targetCard.name) {
                return { valid: false, reasonKey: 'errors.validation.evolutionMismatch' };
            }
        }
    }
    return { valid: true };
}
// ============================================================================
// EXECUTION (pure state transforms)
// ============================================================================
/**
 * Play a Basic Pokemon from hand to active.
 * @param {Object} state
 * @param {string} playerId
 * @param {number} handIndex
 * @param {Object} cardData - card object from card-loader (hp needed)
 * @returns {Object} new state
 */
export function executePlayToActive(state, playerId, handIndex, cardData) {
    const s = cloneState(state);
    const p = s[playerId];
    const cardId = p.hand.splice(handIndex, 1)[0];
    p.active = {
        cardId,
        currentHp: cardData.hp || 0,
        energy: [],
        status: null,
        turnPlayed: s.turn,
        lastEvolved: null,
        tool: null,
        effects: []
    };
    s.log.push({ timestamp: Date.now(), turn: s.turn, player: playerId, action: 'playToActive', card: cardId });
    return s;
}
/**
 * Play a Basic Pokemon from hand to bench.
 */
export function executePlayToBench(state, playerId, handIndex, cardData) {
    const s = cloneState(state);
    const p = s[playerId];
    const cardId = p.hand.splice(handIndex, 1)[0];
    p.bench.push({
        cardId,
        currentHp: cardData.hp || 0,
        energy: [],
        status: null,
        turnPlayed: s.turn,
        lastEvolved: null,
        tool: null,
        effects: []
    });
    s.log.push({ timestamp: Date.now(), turn: s.turn, player: playerId, action: 'playToBench', card: cardId });
    return s;
}
/**
 * Attach energy from Energy Zone to a Pokemon.
 * @param {string} target - 'active' or bench index (number)
 */
export function executeAttachEnergy(state, playerId, target) {
    const s = cloneState(state);
    const p = s[playerId];
    const energyType = p.energyZone.currentEnergy;
    const pokemon = target === 'active' ? p.active : p.bench[target];
    if (!pokemon)
        return state; // safety
    pokemon.energy.push(energyType);
    p.energyZone.currentEnergy = null;
    p.energyZone.usedThisTurn = true;
    s.log.push({ timestamp: Date.now(), turn: s.turn, player: playerId, action: 'attachEnergy', energy: energyType, target });
    return s;
}
/**
 * Retreat: swap active with bench Pokemon, discard energy for retreat cost.
 * @param {number} benchIndex
 * @param {number} retreatCost - from card data
 * @param {number[]} [energyIndicesToDiscard] - indices in active.energy to discard
 */
export function executeRetreat(state, playerId, benchIndex, retreatCost, energyIndicesToDiscard) {
    const s = cloneState(state);
    const p = s[playerId];
    // Discard energy from active for retreat cost
    if (retreatCost > 0 && energyIndicesToDiscard) {
        // Remove in reverse order to preserve indices
        const sorted = [...energyIndicesToDiscard].sort((a, b) => b - a);
        for (const idx of sorted) {
            p.active.energy.splice(idx, 1);
        }
    }
    // Swap active and bench
    const oldActive = p.active;
    p.active = p.bench[benchIndex];
    p.bench[benchIndex] = oldActive;
    // Retreating cures all status effects
    if (p.bench[benchIndex]) {
        p.bench[benchIndex].status = null;
    }
    p.retreatedThisTurn = true;
    s.log.push({ timestamp: Date.now(), turn: s.turn, player: playerId, action: 'retreat', from: oldActive.cardId, to: p.active.cardId });
    return s;
}
/**
 * Evolve a Pokemon.
 * @param {string} targetLocation - 'active' or bench index
 * @param {Object} evoCardData - evolution card from card-loader
 */
export function executeEvolve(state, playerId, handIndex, targetLocation, evoCardData, getCardFn) {
    const s = cloneState(state);
    const p = s[playerId];
    const evoCardId = p.hand.splice(handIndex, 1)[0];
    const target = targetLocation === 'active' ? p.active : p.bench[targetLocation];
    if (!target)
        return state;
    // Preserve damage counters (BUG-006 fix)
    // In Pokemon TCG, evolution preserves damage counters:
    // newHp = newMaxHp - damageCounters, where damageCounters = oldMaxHp - oldCurrentHp
    const newMaxHp = evoCardData.hp || 0;
    let oldMaxHp = newMaxHp; // fallback
    if (getCardFn) {
        const oldCard = getCardFn(target.cardId);
        if (oldCard && oldCard.hp)
            oldMaxHp = oldCard.hp;
    }
    const damageCounters = Math.max(0, oldMaxHp - target.currentHp);
    target.currentHp = Math.max(1, newMaxHp - damageCounters); // At least 1 HP (can't KO by evolving)
    target.cardId = evoCardId;
    target.status = null; // Evolution cures status
    target.lastEvolved = s.turn;
    s.log.push({ timestamp: Date.now(), turn: s.turn, player: playerId, action: 'evolve', from: oldCard, to: evoCardId });
    return s;
}
