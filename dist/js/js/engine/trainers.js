/**
 * Trainer Effect System - Pokemon TCG Pocket Simulator
 *
 * Extensible registry of trainer card effects.
 * Each entry maps a trainer name to an effect descriptor.
 *
 * Effect descriptor shape:
 * {
 *   type: 'item' | 'supporter' | 'tool' | 'stadium',
 *   needsTarget: boolean,          // Does the user need to pick a target?
 *   targetType: string|null,       // 'pokemon' | 'benchPokemon' | 'opponentActive' | null
 *   canPlay: (state, playerId, getCardFn, opts) => boolean,
 *   execute: (state, playerId, getCardFn, opts) => state
 * }
 *
 * opts may contain: { targetIndex, targetPlayerId, coinQueue overrides, etc. }
 */
import { MAX_BENCH, STATUS } from './constants.js';
import { cloneState } from './game-state.js';
// ============================================================================
// TRAINER EFFECT REGISTRY
// ============================================================================
/**
 * Registry of trainer effects keyed by card name.
 * For cards with identical names across sets, a single entry suffices.
 * @type {Object.<string, Object>}
 */
export const TRAINER_EFFECTS = {};
// ---------------------------------------------------------------------------
// Helper: consume a coin from the queue (returns { result, coinQueue })
// ---------------------------------------------------------------------------
function flipCoin(coinQueue) {
    if (coinQueue.length === 0) {
        // Fallback: random if queue exhausted
        return { result: Math.random() < 0.5, coinQueue };
    }
    const result = coinQueue.shift();
    return { result, coinQueue };
}
// ---------------------------------------------------------------------------
// ITEMS
// ---------------------------------------------------------------------------
/** Poké Ball – Put 1 random Basic Pokémon from your deck into your hand. */
TRAINER_EFFECTS['Poké Ball'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId, getCardFn) {
        const player = state[playerId];
        // Need at least one Basic Pokémon in deck
        return player.deck.some(cardId => {
            const c = getCardFn(cardId);
            return c && c.supertype === 'Pokémon' && c.subtype === 'Basic';
        });
    },
    execute(state, playerId, getCardFn) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const basics = [];
        player.deck.forEach((cardId, idx) => {
            const c = getCardFn(cardId);
            if (c && c.supertype === 'Pokémon' && c.subtype === 'Basic')
                basics.push(idx);
        });
        if (basics.length === 0)
            return newState;
        const pick = basics[Math.floor(Math.random() * basics.length)];
        const [card] = player.deck.splice(pick, 1);
        player.hand.push(card);
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Poké Ball', details: `Added Basic Pokémon to hand` });
        return newState;
    }
};
/** Pokémon Communication – Swap a Pokémon from hand with a random Pokémon from deck. */
// TODO-Pocket-Verify: Does the user choose which hand card, or is it random?
TRAINER_EFFECTS['Pokémon Communication'] = {
    type: 'item',
    needsTarget: true,
    targetType: 'handCard', // opts.handCardIndex
    canPlay(state, playerId, getCardFn) {
        const player = state[playerId];
        const hasPokemonInHand = player.hand.some(id => { const c = getCardFn(id); return c && c.supertype === 'Pokémon'; });
        const hasPokemonInDeck = player.deck.some(id => { const c = getCardFn(id); return c && c.supertype === 'Pokémon'; });
        return hasPokemonInHand && hasPokemonInDeck;
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const handIdx = opts.handCardIndex ?? player.hand.findIndex(id => { const c = getCardFn(id); return c && c.supertype === 'Pokémon'; });
        if (handIdx < 0)
            return newState;
        const deckPokemon = [];
        player.deck.forEach((id, i) => { const c = getCardFn(id); if (c && c.supertype === 'Pokémon')
            deckPokemon.push(i); });
        if (deckPokemon.length === 0)
            return newState;
        const deckIdx = deckPokemon[Math.floor(Math.random() * deckPokemon.length)];
        const fromHand = player.hand[handIdx];
        const fromDeck = player.deck[deckIdx];
        player.hand[handIdx] = fromDeck;
        player.deck[deckIdx] = fromHand;
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Pokémon Communication', details: 'Swapped Pokémon between hand and deck' });
        return newState;
    }
};
/** Pokémon Flute – Put a Basic Pokémon from opponent's discard pile onto their Bench. */
TRAINER_EFFECTS['Pokémon Flute'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId, getCardFn) {
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = state[opponentId];
        if (opp.bench.filter(p => p !== null).length >= MAX_BENCH)
            return false;
        return opp.discard.some(id => { const c = getCardFn(id); return c && c.supertype === 'Pokémon' && c.subtype === 'Basic'; });
    },
    execute(state, playerId, getCardFn) {
        const newState = cloneState(state);
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = newState[opponentId];
        const basics = [];
        opp.discard.forEach((id, i) => { const c = getCardFn(id); if (c && c.supertype === 'Pokémon' && c.subtype === 'Basic')
            basics.push(i); });
        if (basics.length === 0)
            return newState;
        const pick = basics[Math.floor(Math.random() * basics.length)];
        const cardId = opp.discard.splice(pick, 1)[0];
        const card = getCardFn(cardId);
        const benchIdx = opp.bench.findIndex(p => p === null);
        if (benchIdx === -1) {
            if (opp.bench.length < MAX_BENCH) {
                opp.bench.push({ cardId, currentHp: card.hp, energy: [], status: null, turnPlayed: state.turn, lastEvolved: null, tool: null, effects: [] });
            }
        }
        else {
            opp.bench[benchIdx] = { cardId, currentHp: card.hp, energy: [], status: null, turnPlayed: state.turn, lastEvolved: null, tool: null, effects: [] };
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Pokémon Flute', details: `Put ${card.name} on opponent's bench` });
        return newState;
    }
};
/** Rare Candy – Skip Stage 1, evolve Basic directly to Stage 2. */
TRAINER_EFFECTS['Rare Candy'] = {
    type: 'item',
    needsTarget: true,
    targetType: 'pokemon', // opts.pokemonIndex ('active' or 0-2)
    canPlay(state, playerId, getCardFn, opts = {}) {
        const player = state[playerId];
        // Need a Basic pokemon in play and its Stage 2 in hand
        const positions = [];
        if (player.active)
            positions.push({ pokemon: player.active, idx: 'active' });
        player.bench.forEach((p, i) => { if (p)
            positions.push({ pokemon: p, idx: i }); });
        for (const pos of positions) {
            const c = getCardFn(pos.pokemon.cardId);
            if (!c || c.subtype !== 'Basic')
                continue;
            if (pos.pokemon.turnPlayed === state.turn)
                continue; // Can't evolve same turn
            // TODO-Pocket-Verify: Does Rare Candy bypass the "can't evolve turn 0" rule?
            if (state.turn === 0)
                continue;
            // Check if hand has a Stage 2 that evolves from a Stage 1 that evolves from this Basic
            for (const handId of player.hand) {
                const hc = getCardFn(handId);
                if (hc && hc.subtype === 'Stage 2') {
                    // hc.stage should name a Stage 1 which evolves from our Basic
                    // We need to check if there exists a Stage 1 whose stage === c.name and hc.stage === Stage1.name
                    // Simplified: just check if a matching chain exists in the card DB
                    // For now, accept if hc.stage is any Stage 1 that has stage === c.name
                    return true; // At least one valid target exists
                }
            }
        }
        return false;
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemonIndex = opts.pokemonIndex;
        const evolutionCardId = opts.evolutionCardId;
        if (pokemonIndex == null || !evolutionCardId)
            return newState;
        const pokemon = pokemonIndex === 'active' ? player.active : player.bench[pokemonIndex];
        if (!pokemon)
            return newState;
        const oldCard = getCardFn(pokemon.cardId);
        const evoCard = getCardFn(evolutionCardId);
        if (!oldCard || !evoCard || evoCard.subtype !== 'Stage 2')
            return newState;
        const oldMaxHp = oldCard.hp || 0;
        const damageAmount = oldMaxHp - pokemon.currentHp;
        const newPokemon = {
            cardId: evolutionCardId,
            currentHp: Math.max(0, evoCard.hp - damageAmount),
            energy: [...pokemon.energy],
            status: null, // Evolution cures status
            turnPlayed: pokemon.turnPlayed,
            lastEvolved: state.turn,
            tool: pokemon.tool,
            effects: [...pokemon.effects]
        };
        if (pokemonIndex === 'active') {
            player.active = newPokemon;
        }
        else {
            player.bench[pokemonIndex] = newPokemon;
        }
        const cardIndex = player.hand.indexOf(evolutionCardId);
        if (cardIndex !== -1)
            player.hand.splice(cardIndex, 1);
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Rare Candy', details: `Evolved ${oldCard.name} directly to ${evoCard.name}` });
        return newState;
    }
};
/** Repel – Switch out opponent's Active Basic Pokémon to Bench. */
TRAINER_EFFECTS['Repel'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId, getCardFn) {
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = state[opponentId];
        if (!opp.active)
            return false;
        const c = getCardFn(opp.active.cardId);
        if (!c || c.subtype !== 'Basic')
            return false;
        return opp.bench.some(p => p !== null); // Opponent needs bench to switch
    },
    execute(state, playerId, getCardFn) {
        const newState = cloneState(state);
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = newState[opponentId];
        // Move active to bench, promote first bench Pokemon
        // TODO-Pocket-Verify: Does opponent choose the new active, or is it first bench?
        const benchIdx = opp.bench.findIndex(p => p !== null);
        if (benchIdx === -1)
            return newState;
        const oldActive = opp.active;
        opp.active = opp.bench[benchIdx];
        opp.bench[benchIdx] = oldActive;
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Repel', details: 'Switched opponent\'s active Basic Pokémon' });
        return newState;
    }
};
/** X Speed (if it exists) - Reduce retreat cost. Treating as item. */
// TODO-Pocket-Verify: Is X Speed in Pocket? Adding as placeholder.
/** Squirt Bottle – Discard a [R] Energy from opponent's Active Pokémon. */
TRAINER_EFFECTS['Squirt Bottle'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId) {
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = state[opponentId];
        return opp.active && opp.active.energy.includes('R');
    },
    execute(state, playerId) {
        const newState = cloneState(state);
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = newState[opponentId];
        const idx = opp.active.energy.indexOf('R');
        if (idx !== -1)
            opp.active.energy.splice(idx, 1);
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Squirt Bottle', details: 'Discarded [R] Energy from opponent\'s Active' });
        return newState;
    }
};
/** Rotom Dex – Look at top card of deck, optionally shuffle. */
// TODO-Pocket-Verify: How does "look" work in sandbox mode? We'll just shuffle.
TRAINER_EFFECTS['Rotom Dex'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId) {
        return state[playerId].deck.length > 0;
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        // Shuffle deck
        if (opts.shuffle !== false) {
            for (let i = player.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
            }
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Rotom Dex', details: 'Looked at top card and shuffled deck' });
        return newState;
    }
};
/** Lucky Ice Pop – Heal 20 from Active, flip coin; heads → heal 20 more. */
TRAINER_EFFECTS['Lucky Ice Pop'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId, getCardFn) {
        const player = state[playerId];
        if (!player.active)
            return false;
        const c = getCardFn(player.active.cardId);
        return c && player.active.currentHp < c.hp;
    },
    execute(state, playerId, getCardFn) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const c = getCardFn(player.active.cardId);
        const maxHp = c ? c.hp : 999;
        player.active.currentHp = Math.min(maxHp, player.active.currentHp + 20);
        const { result } = flipCoin(newState.coinQueue);
        if (result) {
            player.active.currentHp = Math.min(maxHp, player.active.currentHp + 20);
            newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Lucky Ice Pop', details: 'Healed 20 + 20 (heads)' });
        }
        else {
            newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Lucky Ice Pop', details: 'Healed 20 (tails)' });
        }
        return newState;
    }
};
/** Big Malasada – Heal 10 and remove a random Special Condition from Active. */
TRAINER_EFFECTS['Big Malasada'] = {
    type: 'item',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId) {
        return !!state[playerId].active;
    },
    execute(state, playerId, getCardFn) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const c = getCardFn(player.active.cardId);
        const maxHp = c ? c.hp : 999;
        player.active.currentHp = Math.min(maxHp, player.active.currentHp + 10);
        if (player.active.status)
            player.active.status = null;
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Big Malasada', details: 'Healed 10 and removed Special Condition' });
        return newState;
    }
};
// ---------------------------------------------------------------------------
// SUPPORTERS
// ---------------------------------------------------------------------------
/** Giovanni – +10 damage this turn. */
TRAINER_EFFECTS['Giovanni'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        newState.turnEffects.push({ type: 'damageMod', source: 'Giovanni', player: playerId, amount: 10 });
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Giovanni', details: '+10 damage this turn' });
        return newState;
    }
};
/** Red – +20 damage to opponent's Active ex this turn. */
TRAINER_EFFECTS['Red'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        newState.turnEffects.push({ type: 'damageModEx', source: 'Red', player: playerId, amount: 20 });
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Red', details: '+20 damage to ex this turn' });
        return newState;
    }
};
/** Professor's Research – Draw 2 cards. */
TRAINER_EFFECTS["Professor's Research"] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId) {
        return state[playerId].deck.length > 0;
    },
    execute(state, playerId) {
        // We import drawCard dynamically to avoid circular deps
        const newState = cloneState(state);
        const player = newState[playerId];
        for (let i = 0; i < 2; i++) {
            if (player.deck.length > 0 && player.hand.length < 10) {
                player.hand.push(player.deck.pop());
            }
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: "Professor's Research", details: 'Drew 2 cards' });
        return newState;
    }
};
/** Sabrina – Switch opponent's Active with a Bench Pokémon. */
TRAINER_EFFECTS['Sabrina'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay(state, playerId) {
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        return state[opponentId].bench.some(p => p !== null);
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const opp = newState[opponentId];
        // Opponent chooses – in sandbox, user picks via opts.benchIndex; default first
        const benchIdx = opts.benchIndex ?? opp.bench.findIndex(p => p !== null);
        if (benchIdx < 0 || !opp.bench[benchIdx])
            return newState;
        const oldActive = opp.active;
        opp.active = opp.bench[benchIdx];
        opp.bench[benchIdx] = oldActive;
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Sabrina', details: 'Switched opponent\'s Active Pokémon' });
        return newState;
    }
};
/** Erika – Heal 50 damage from 1 of your [G] Pokémon. */
TRAINER_EFFECTS['Erika'] = {
    type: 'supporter',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId, getCardFn) {
        const player = state[playerId];
        const all = [player.active, ...player.bench].filter(Boolean);
        return all.some(p => {
            const c = getCardFn(p.cardId);
            if (!c)
                return false;
            return c.element === 'Grass' && p.currentHp < c.hp;
        });
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon)
            return newState;
        const c = getCardFn(pokemon.cardId);
        if (!c || c.element !== 'Grass')
            return newState;
        pokemon.currentHp = Math.min(c.hp, pokemon.currentHp + 50);
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Erika', details: `Healed 50 from ${c.name}` });
        return newState;
    }
};
/** Misty – Flip coins, attach [W] Energy for each heads. */
TRAINER_EFFECTS['Misty'] = {
    type: 'supporter',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId, getCardFn) {
        const player = state[playerId];
        const all = [player.active, ...player.bench].filter(Boolean);
        return all.some(p => { const c = getCardFn(p.cardId); return c && c.element === 'Water'; });
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon)
            return newState;
        let headsCount = 0;
        let flipping = true;
        while (flipping) {
            const { result } = flipCoin(newState.coinQueue);
            if (result) {
                headsCount++;
                pokemon.energy.push('W');
            }
            else {
                flipping = false;
            }
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Misty', details: `Attached ${headsCount} [W] Energy (flipped until tails)` });
        return newState;
    }
};
/** Blue – Opponent's attacks do −10 damage next turn. */
TRAINER_EFFECTS['Blue'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        // TODO-Pocket-Verify: How long does Blue's effect last? Presumably next opponent turn only.
        newState.turnEffects.push({ type: 'damageReduction', source: 'Blue', player: playerId, amount: 10, duration: 'opponentNextTurn' });
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Blue', details: '−10 damage from attacks next turn' });
        return newState;
    }
};
/** Leaf – Retreat cost −2 this turn. */
TRAINER_EFFECTS['Leaf'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        newState.turnEffects.push({ type: 'retreatReduction', source: 'Leaf', player: playerId, amount: 2 });
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Leaf', details: 'Retreat cost −2 this turn' });
        return newState;
    }
};
/** Dawn – Move Energy from Benched to Active. */
TRAINER_EFFECTS['Dawn'] = {
    type: 'supporter',
    needsTarget: true,
    targetType: 'benchPokemon',
    canPlay(state, playerId) {
        const player = state[playerId];
        return player.active && player.bench.some(p => p && p.energy.length > 0);
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const benchIdx = opts.benchIndex ?? player.bench.findIndex(p => p && p.energy.length > 0);
        if (benchIdx < 0 || !player.bench[benchIdx] || player.bench[benchIdx].energy.length === 0)
            return newState;
        const energyIdx = opts.energyIndex ?? 0;
        const energy = player.bench[benchIdx].energy.splice(energyIdx, 1)[0];
        if (energy && player.active) {
            player.active.energy.push(energy);
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Dawn', details: `Moved [${energy}] Energy from bench to Active` });
        return newState;
    }
};
/** Pokémon Center Lady – Heal 30 and remove all Special Conditions from 1 Pokémon. */
TRAINER_EFFECTS['Pokémon Center Lady'] = {
    type: 'supporter',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId) {
        const player = state[playerId];
        return [player.active, ...player.bench].some(p => p !== null);
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon)
            return newState;
        const c = getCardFn(pokemon.cardId);
        const maxHp = c ? c.hp : 999;
        pokemon.currentHp = Math.min(maxHp, pokemon.currentHp + 30);
        pokemon.status = null;
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Pokémon Center Lady', details: 'Healed 30 and removed Special Conditions' });
        return newState;
    }
};
/** Iono – Each player shuffles hand into deck, draws that many cards. */
TRAINER_EFFECTS['Iono'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        for (const pid of ['player1', 'player2']) {
            const player = newState[pid];
            const handSize = player.hand.length;
            player.deck.push(...player.hand);
            player.hand = [];
            // Shuffle
            for (let i = player.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
            }
            // Draw same number
            for (let i = 0; i < handSize && player.deck.length > 0; i++) {
                player.hand.push(player.deck.pop());
            }
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Iono', details: 'Both players shuffled hands and redrew' });
        return newState;
    }
};
/** Copycat – Shuffle hand into deck, draw cards equal to opponent's hand size. */
TRAINER_EFFECTS['Copycat'] = {
    type: 'supporter',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        const drawCount = newState[opponentId].hand.length;
        player.deck.push(...player.hand);
        player.hand = [];
        for (let i = player.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
        }
        for (let i = 0; i < drawCount && player.deck.length > 0; i++) {
            player.hand.push(player.deck.pop());
        }
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Copycat', details: `Shuffled hand, drew ${drawCount} cards` });
        return newState;
    }
};
/** Lillie – Heal 60 damage from 1 of your Stage 2 Pokémon. */
TRAINER_EFFECTS['Lillie'] = {
    type: 'supporter',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId, getCardFn) {
        const player = state[playerId];
        return [player.active, ...player.bench].filter(Boolean).some(p => {
            const c = getCardFn(p.cardId);
            return c && c.subtype === 'Stage 2' && p.currentHp < c.hp;
        });
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon)
            return newState;
        const c = getCardFn(pokemon.cardId);
        if (!c || c.subtype !== 'Stage 2')
            return newState;
        pokemon.currentHp = Math.min(c.hp, pokemon.currentHp + 60);
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Lillie', details: `Healed 60 from ${c.name}` });
        return newState;
    }
};
// ---------------------------------------------------------------------------
// STADIUMS
// ---------------------------------------------------------------------------
// TODO-Pocket-Verify: How do stadiums persist across turns? Currently stored in state.stadium
/** Starting Plains – Each Basic Pokémon gets +20 HP. */
TRAINER_EFFECTS['Starting Plains'] = {
    type: 'stadium',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        // Replace current stadium
        newState.stadium = { cardId: 'stadium-starting-plains', name: 'Starting Plains', effect: { type: 'hpBoost', subtype: 'Basic', amount: 20 } };
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Starting Plains', details: 'Basic Pokémon get +20 HP' });
        return newState;
    }
};
/** Training Area – Stage 1 attacks do +10 damage. */
TRAINER_EFFECTS['Training Area'] = {
    type: 'stadium',
    needsTarget: false,
    targetType: null,
    canPlay() { return true; },
    execute(state, playerId) {
        const newState = cloneState(state);
        newState.stadium = { cardId: 'stadium-training-area', name: 'Training Area', effect: { type: 'damageMod', subtype: 'Stage 1', amount: 10 } };
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Training Area', details: 'Stage 1 Pokémon attacks do +10 damage' });
        return newState;
    }
};
// ---------------------------------------------------------------------------
// TOOLS (attached to Pokémon, not played as standalone action)
// ---------------------------------------------------------------------------
/** Giant Cape – +20 HP to attached Pokémon. */
TRAINER_EFFECTS['Giant Cape'] = {
    type: 'tool',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId) {
        const player = state[playerId];
        return [player.active, ...player.bench].filter(Boolean).some(p => !p.tool);
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon || pokemon.tool)
            return newState;
        pokemon.tool = { name: 'Giant Cape', effect: { type: 'hpBoost', amount: 20 } };
        // TODO-Pocket-Verify: Does Giant Cape increase currentHp immediately or just maxHp?
        pokemon.currentHp += 20;
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Giant Cape', details: 'Attached Giant Cape (+20 HP)' });
        return newState;
    }
};
/** Rocky Helmet – If Active and damaged, do 20 to opponent's Active. */
TRAINER_EFFECTS['Rocky Helmet'] = {
    type: 'tool',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId) {
        const player = state[playerId];
        return [player.active, ...player.bench].filter(Boolean).some(p => !p.tool);
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon || pokemon.tool)
            return newState;
        pokemon.tool = { name: 'Rocky Helmet', effect: { type: 'retaliate', amount: 20 } };
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Rocky Helmet', details: 'Attached Rocky Helmet' });
        return newState;
    }
};
/** Leftovers – Heal 10 at end of turn if in Active Spot. */
TRAINER_EFFECTS['Leftovers'] = {
    type: 'tool',
    needsTarget: true,
    targetType: 'pokemon',
    canPlay(state, playerId) {
        const player = state[playerId];
        return [player.active, ...player.bench].filter(Boolean).some(p => !p.tool);
    },
    execute(state, playerId, getCardFn, opts = {}) {
        const newState = cloneState(state);
        const player = newState[playerId];
        const pokemon = opts.pokemonIndex === 'active' ? player.active : player.bench[opts.pokemonIndex];
        if (!pokemon || pokemon.tool)
            return newState;
        pokemon.tool = { name: 'Leftovers', effect: { type: 'endTurnHeal', amount: 10, condition: 'active' } };
        newState.log.push({ timestamp: Date.now(), turn: newState.turn, player: playerId, action: 'trainer', card: 'Leftovers', details: 'Attached Leftovers' });
        return newState;
    }
};
// ============================================================================
// PUBLIC API
// ============================================================================
/**
 * Checks if a trainer card can be played.
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID
 * @param {string} cardId - Card ID of trainer to play
 * @param {Function} getCardFn - Card lookup function
 * @param {Object} opts - Target options
 * @returns {boolean}
 */
export function canPlayTrainer(state, playerId, cardId, getCardFn, opts = {}) {
    const card = getCardFn(cardId);
    if (!card || card.supertype !== 'Trainer')
        return false;
    const effect = TRAINER_EFFECTS[card.name];
    if (!effect) {
        // Unknown trainer – allow play but log warning
        console.warn(`No effect registered for trainer: ${card.name}`);
        return true; // Allow in sandbox mode
    }
    // Supporter limit: max 1 per turn
    if (effect.type === 'supporter' && state[playerId].supporterUsedThisTurn) {
        return false;
    }
    return effect.canPlay(state, playerId, getCardFn, opts);
}
/**
 * Plays a trainer card.
 * Removes from hand, applies effect, enforces supporter limit.
 *
 * @param {Object} state - Current game state
 * @param {string} playerId - Player ID
 * @param {string} cardId - Card ID of trainer to play
 * @param {Function} getCardFn - Card lookup function
 * @param {Object} opts - Target options (pokemonIndex, benchIndex, etc.)
 * @returns {Object} New state
 */
export function playTrainer(state, playerId, cardId, getCardFn, opts = {}) {
    const card = getCardFn(cardId);
    if (!card || card.supertype !== 'Trainer') {
        console.warn('playTrainer: not a trainer card');
        return state;
    }
    if (!canPlayTrainer(state, playerId, cardId, getCardFn, opts)) {
        console.warn(`Cannot play trainer: ${card.name}`);
        return state;
    }
    let newState = cloneState(state);
    // Remove from hand
    const handIdx = newState[playerId].hand.indexOf(cardId);
    if (handIdx !== -1) {
        newState[playerId].hand.splice(handIdx, 1);
    }
    const effect = TRAINER_EFFECTS[card.name];
    if (effect) {
        // Mark supporter used
        if (effect.type === 'supporter') {
            newState[playerId].supporterUsedThisTurn = true;
        }
        // Execute effect (may return a new state object)
        newState = effect.execute(newState, playerId, getCardFn, opts);
    }
    else {
        // Unknown trainer – just discard it, log
        newState.log.push({
            timestamp: Date.now(),
            turn: newState.turn,
            player: playerId,
            action: 'trainer',
            card: card.name,
            details: `Played (no effect registered)` // TODO-Pocket-Verify: implement this trainer
        });
    }
    // Items/supporters go to discard (tools stay attached)
    if (!effect || effect.type !== 'tool') {
        newState[playerId].discard.push(cardId);
    }
    return newState;
}
/**
 * Gets the effect descriptor for a trainer, if registered.
 * @param {string} trainerName
 * @returns {Object|null}
 */
export function getTrainerEffect(trainerName) {
    return TRAINER_EFFECTS[trainerName] || null;
}
/**
 * Returns names of all registered trainers.
 * @returns {string[]}
 */
export function getRegisteredTrainers() {
    return Object.keys(TRAINER_EFFECTS);
}
