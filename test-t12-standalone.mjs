#!/usr/bin/env node
/**
 * T12: Trainers (Items + Supporters) - Standalone Node.js Test Suite
 *
 * Run with: node test-t12-standalone.mjs
 */

import { createInitialState, cloneState, validateState } from './js/engine/game-state.js';
import { canPlayTrainer, playTrainer, getTrainerEffect, getRegisteredTrainers, TRAINER_EFFECTS } from './js/engine/trainers.js';

// Mock card data
const mockCards = {
  // Pokemon
  'BULBASAUR': { id: 'BULBASAUR', name: 'Bulbasaur', supertype: 'Pokémon', subtype: 'Basic', stage: null, element: 'Grass', hp: 60 },
  'IVYSAUR':   { id: 'IVYSAUR', name: 'Ivysaur', supertype: 'Pokémon', subtype: 'Stage 1', stage: 'Bulbasaur', element: 'Grass', hp: 90 },
  'VENUSAUR':  { id: 'VENUSAUR', name: 'Venusaur', supertype: 'Pokémon', subtype: 'Stage 2', stage: 'Ivysaur', element: 'Grass', hp: 160 },
  'SQUIRTLE':  { id: 'SQUIRTLE', name: 'Squirtle', supertype: 'Pokémon', subtype: 'Basic', stage: null, element: 'Water', hp: 50 },
  'CHARMANDER':{ id: 'CHARMANDER', name: 'Charmander', supertype: 'Pokémon', subtype: 'Basic', stage: null, element: 'Fire', hp: 50 },
  'PIKACHU':   { id: 'PIKACHU', name: 'Pikachu', supertype: 'Pokémon', subtype: 'Basic', stage: null, element: 'Lightning', hp: 60 },
  'MEW-EX':    { id: 'MEW-EX', name: 'Mew ex', supertype: 'Pokémon', subtype: 'Basic', stage: null, element: 'Psychic', hp: 130 },

  // Items
  'POKEBALL':  { id: 'POKEBALL', name: 'Poké Ball', supertype: 'Trainer', subtype: 'Item' },
  'SQUIRT-BOTTLE': { id: 'SQUIRT-BOTTLE', name: 'Squirt Bottle', supertype: 'Trainer', subtype: 'Item' },
  'REPEL':     { id: 'REPEL', name: 'Repel', supertype: 'Trainer', subtype: 'Item' },
  'BIG-MAL':   { id: 'BIG-MAL', name: 'Big Malasada', supertype: 'Trainer', subtype: 'Item' },
  'ROTOM':     { id: 'ROTOM', name: 'Rotom Dex', supertype: 'Trainer', subtype: 'Item' },
  'LUCKY-ICE': { id: 'LUCKY-ICE', name: 'Lucky Ice Pop', supertype: 'Trainer', subtype: 'Item' },

  // Supporters
  'GIOVANNI':  { id: 'GIOVANNI', name: 'Giovanni', supertype: 'Trainer', subtype: 'Supporter' },
  'PROF':      { id: 'PROF', name: "Professor's Research", supertype: 'Trainer', subtype: 'Supporter' },
  'SABRINA':   { id: 'SABRINA', name: 'Sabrina', supertype: 'Trainer', subtype: 'Supporter' },
  'ERIKA':     { id: 'ERIKA', name: 'Erika', supertype: 'Trainer', subtype: 'Supporter' },
  'MISTY':     { id: 'MISTY', name: 'Misty', supertype: 'Trainer', subtype: 'Supporter' },
  'BLUE':      { id: 'BLUE', name: 'Blue', supertype: 'Trainer', subtype: 'Supporter' },
  'LEAF':      { id: 'LEAF', name: 'Leaf', supertype: 'Trainer', subtype: 'Supporter' },
  'DAWN':      { id: 'DAWN', name: 'Dawn', supertype: 'Trainer', subtype: 'Supporter' },
  'IONO':      { id: 'IONO', name: 'Iono', supertype: 'Trainer', subtype: 'Supporter' },
  'PCL':       { id: 'PCL', name: 'Pokémon Center Lady', supertype: 'Trainer', subtype: 'Supporter' },
  'LILLIE':    { id: 'LILLIE', name: 'Lillie', supertype: 'Trainer', subtype: 'Supporter' },
  'RED':       { id: 'RED', name: 'Red', supertype: 'Trainer', subtype: 'Supporter' },
  'COPYCAT':   { id: 'COPYCAT', name: 'Copycat', supertype: 'Trainer', subtype: 'Supporter' },

  // Stadiums
  'START-PLAINS': { id: 'START-PLAINS', name: 'Starting Plains', supertype: 'Trainer', subtype: 'Stadium' },
  'TRAIN-AREA':   { id: 'TRAIN-AREA', name: 'Training Area', supertype: 'Trainer', subtype: 'Stadium' },

  // Tools
  'GIANT-CAPE': { id: 'GIANT-CAPE', name: 'Giant Cape', supertype: 'Trainer', subtype: 'Tool' },
  'ROCKY-HELM': { id: 'ROCKY-HELM', name: 'Rocky Helmet', supertype: 'Trainer', subtype: 'Tool' },
  'LEFTOVERS':  { id: 'LEFTOVERS', name: 'Leftovers', supertype: 'Trainer', subtype: 'Tool' },

  // Unknown trainer (no effect registered)
  'UNKNOWN':   { id: 'UNKNOWN', name: 'SomeRandomTrainer', supertype: 'Trainer', subtype: 'Item' },
};

function getCard(cardId) { return mockCards[cardId] || null; }

function makePokemon(cardId, opts = {}) {
  const c = getCard(cardId);
  return {
    cardId,
    currentHp: opts.currentHp ?? (c ? c.hp : 50),
    energy: opts.energy ?? [],
    status: opts.status ?? null,
    turnPlayed: opts.turnPlayed ?? 0,
    lastEvolved: opts.lastEvolved ?? null,
    tool: opts.tool ?? null,
    effects: opts.effects ?? []
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) { passCount++; console.log(`✓ ${testName}`); }
  else { failCount++; console.error(`✗ ${testName}`); if (details) console.error(`  ${details}`); }
}

console.log('=== T12: Trainers (Items + Supporters) Tests ===\n');

// ---- Test 1: Registry basics ----
console.log('Test 1: Registry basics');
{
  const names = getRegisteredTrainers();
  assert(names.length > 0, `Registry has ${names.length} trainers`);
  assert(getTrainerEffect('Giovanni') !== null, 'Giovanni registered');
  assert(getTrainerEffect("Professor's Research") !== null, "Prof's Research registered");
  assert(getTrainerEffect('NonExistent') === null, 'Unknown returns null');
}

// ---- Test 2: Supporter limit (1 per turn) ----
console.log('\nTest 2: Supporter limit');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['GIOVANNI', 'PROF'];
  state.player1.deck = ['BULBASAUR', 'SQUIRTLE'];

  assert(canPlayTrainer(state, 'player1', 'GIOVANNI', getCard), 'Can play first supporter');
  const s2 = playTrainer(state, 'player1', 'GIOVANNI', getCard);
  assert(s2.player1.supporterUsedThisTurn === true, 'supporterUsedThisTurn set');
  assert(!canPlayTrainer(s2, 'player1', 'PROF', getCard), 'Cannot play second supporter');
}

// ---- Test 3: Items are unlimited ----
console.log('\nTest 3: Items are unlimited');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.deck = ['BULBASAUR', 'SQUIRTLE', 'CHARMANDER'];
  state.player1.hand = ['POKEBALL', 'POKEBALL', 'ROTOM'];

  const s2 = playTrainer(state, 'player1', 'POKEBALL', getCard);
  // Poké Ball: removes self from hand (-1) + adds Basic from deck (+1) = net 0 change, but card changed
  assert(!s2.player1.hand.includes('POKEBALL') || s2.player1.hand.filter(c=>c==='POKEBALL').length < state.player1.hand.filter(c=>c==='POKEBALL').length, 'First item played (Poké Ball used)');
  // Can play another item
  assert(canPlayTrainer(s2, 'player1', 'ROTOM', getCard), 'Can play second item');
}

// ---- Test 4: Giovanni adds turnEffect ----
console.log('\nTest 4: Giovanni +10 damage');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['GIOVANNI'];
  const s2 = playTrainer(state, 'player1', 'GIOVANNI', getCard);
  assert(s2.turnEffects.some(e => e.source === 'Giovanni' && e.amount === 10), 'Giovanni turnEffect added');
  assert(!s2.player1.hand.includes('GIOVANNI'), 'Giovanni removed from hand');
  assert(s2.player1.discard.includes('GIOVANNI'), 'Giovanni in discard');
}

// ---- Test 5: Professor's Research draws 2 ----
console.log("\nTest 5: Professor's Research");
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['PROF'];
  state.player1.deck = ['BULBASAUR', 'SQUIRTLE', 'CHARMANDER'];
  const s2 = playTrainer(state, 'player1', 'PROF', getCard);
  assert(s2.player1.hand.length === 2, `Drew 2 cards (hand=${s2.player1.hand.length})`);
  assert(s2.player1.deck.length === 1, `Deck reduced to 1`);
}

// ---- Test 6: Sabrina switches opponent's active ----
console.log('\nTest 6: Sabrina');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['SABRINA'];
  state.player2.active = makePokemon('PIKACHU');
  state.player2.bench = [makePokemon('SQUIRTLE'), null, null];
  const s2 = playTrainer(state, 'player1', 'SABRINA', getCard);
  assert(s2.player2.active.cardId === 'SQUIRTLE', 'Opponent active switched');
  assert(s2.player2.bench[0].cardId === 'PIKACHU', 'Old active on bench');
}

// ---- Test 7: Erika heals Grass Pokemon ----
console.log('\nTest 7: Erika heals Grass');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['ERIKA'];
  state.player1.active = makePokemon('BULBASAUR', { currentHp: 20 });
  const s2 = playTrainer(state, 'player1', 'ERIKA', getCard, { pokemonIndex: 'active' });
  assert(s2.player1.active.currentHp === 60, `Healed to max 60 (got ${s2.player1.active.currentHp})`);
}

// ---- Test 8: Erika won't heal non-Grass ----
console.log('\nTest 8: Erika rejects non-Grass');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['ERIKA'];
  state.player1.active = makePokemon('PIKACHU', { currentHp: 20 });
  assert(!canPlayTrainer(state, 'player1', 'ERIKA', getCard), 'Cannot play Erika on non-Grass');
}

// ---- Test 9: Squirt Bottle discards Fire energy ----
console.log('\nTest 9: Squirt Bottle');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['SQUIRT-BOTTLE'];
  state.player2.active = makePokemon('CHARMANDER', { energy: ['R', 'R', 'C'] });
  const s2 = playTrainer(state, 'player1', 'SQUIRT-BOTTLE', getCard);
  assert(s2.player2.active.energy.length === 2, 'One R energy removed');
  assert(s2.player2.active.energy.filter(e => e === 'R').length === 1, 'Only one R removed');
}

// ---- Test 10: Pokémon Center Lady heals + removes status ----
console.log('\nTest 10: Pokémon Center Lady');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['PCL'];
  state.player1.active = makePokemon('PIKACHU', { currentHp: 20, status: 'poison' });
  const s2 = playTrainer(state, 'player1', 'PCL', getCard, { pokemonIndex: 'active' });
  assert(s2.player1.active.currentHp === 50, `Healed 30 (got ${s2.player1.active.currentHp})`);
  assert(s2.player1.active.status === null, 'Status removed');
}

// ---- Test 11: Card removed from hand and added to discard ----
console.log('\nTest 11: Hand/discard management');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['GIOVANNI', 'BULBASAUR'];
  const s2 = playTrainer(state, 'player1', 'GIOVANNI', getCard);
  assert(s2.player1.hand.length === 1, 'Card removed from hand');
  assert(s2.player1.discard.includes('GIOVANNI'), 'Card in discard');
}

// ---- Test 12: Tool attaches (not discarded) ----
console.log('\nTest 12: Tool attachment');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['GIANT-CAPE'];
  state.player1.active = makePokemon('PIKACHU');
  const s2 = playTrainer(state, 'player1', 'GIANT-CAPE', getCard, { pokemonIndex: 'active' });
  assert(s2.player1.active.tool !== null, 'Tool attached');
  assert(s2.player1.active.tool.name === 'Giant Cape', 'Correct tool');
  assert(s2.player1.active.currentHp === 80, `HP boosted to 80 (got ${s2.player1.active.currentHp})`);
  assert(!s2.player1.discard.includes('GIANT-CAPE'), 'Tool NOT in discard');
}

// ---- Test 13: Can't attach tool if already has one ----
console.log('\nTest 13: Tool limit (1 per Pokemon)');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['ROCKY-HELM'];
  state.player1.active = makePokemon('PIKACHU', { tool: { name: 'Giant Cape' } });
  state.player1.bench = [makePokemon('SQUIRTLE'), null, null];
  // Can play on bench (no tool), but not on active (has tool)
  assert(canPlayTrainer(state, 'player1', 'ROCKY-HELM', getCard), 'Can play tool (bench has room)');
}

// ---- Test 14: Dawn moves energy bench→active ----
console.log('\nTest 14: Dawn moves energy');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['DAWN'];
  state.player1.active = makePokemon('PIKACHU');
  state.player1.bench = [makePokemon('SQUIRTLE', { energy: ['W', 'W'] }), null, null];
  const s2 = playTrainer(state, 'player1', 'DAWN', getCard, { benchIndex: 0, energyIndex: 0 });
  assert(s2.player1.active.energy.length === 1, 'Active got energy');
  assert(s2.player1.bench[0].energy.length === 1, 'Bench lost energy');
}

// ---- Test 15: Iono shuffles and redraws ----
console.log('\nTest 15: Iono');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['IONO', 'BULBASAUR', 'SQUIRTLE'];
  state.player1.deck = ['CHARMANDER'];
  state.player2.hand = ['PIKACHU'];
  state.player2.deck = ['MEW-EX'];
  const s2 = playTrainer(state, 'player1', 'IONO', getCard);
  // Player1 had 3 cards (IONO removed first = 2 shuffled+drawn), player2 had 1
  assert(s2.player1.hand.length === 2, `P1 drew 2 (had 2 after IONO removed, got ${s2.player1.hand.length})`);
  assert(s2.player2.hand.length === 1, `P2 drew 1 (got ${s2.player2.hand.length})`);
}

// ---- Test 16: Unknown trainer can still be played (sandbox mode) ----
console.log('\nTest 16: Unknown trainer (sandbox)');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['UNKNOWN'];
  assert(canPlayTrainer(state, 'player1', 'UNKNOWN', getCard), 'Unknown trainer allowed in sandbox');
  const s2 = playTrainer(state, 'player1', 'UNKNOWN', getCard);
  assert(s2.player1.discard.includes('UNKNOWN'), 'Unknown trainer discarded');
}

// ---- Test 17: Stadium replaces previous ----
console.log('\nTest 17: Stadium replaces previous');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['START-PLAINS', 'TRAIN-AREA'];
  let s2 = playTrainer(state, 'player1', 'START-PLAINS', getCard);
  assert(s2.stadium && s2.stadium.name === 'Starting Plains', 'Stadium placed');
  s2.player1.hand = ['TRAIN-AREA'];
  s2.player1.supporterUsedThisTurn = false; // items don't need this but just in case
  const s3 = playTrainer(s2, 'player1', 'TRAIN-AREA', getCard);
  assert(s3.stadium && s3.stadium.name === 'Training Area', 'Stadium replaced');
}

// ---- Test 18: Big Malasada heals + removes status ----
console.log('\nTest 18: Big Malasada');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['BIG-MAL'];
  state.player1.active = makePokemon('PIKACHU', { currentHp: 40, status: 'burn' });
  const s2 = playTrainer(state, 'player1', 'BIG-MAL', getCard);
  assert(s2.player1.active.currentHp === 50, `Healed 10 (got ${s2.player1.active.currentHp})`);
  assert(s2.player1.active.status === null, 'Status removed');
}

// ---- Test 19: Repel switches opponent's Basic ----
console.log('\nTest 19: Repel');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['REPEL'];
  state.player2.active = makePokemon('PIKACHU'); // Basic
  state.player2.bench = [makePokemon('SQUIRTLE'), null, null];
  const s2 = playTrainer(state, 'player1', 'REPEL', getCard);
  assert(s2.player2.active.cardId === 'SQUIRTLE', 'Opponent active switched');
}

// ---- Test 20: Repel fails on non-Basic active ----
console.log('\nTest 20: Repel fails on Stage 1');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['REPEL'];
  state.player2.active = makePokemon('IVYSAUR'); // Stage 1
  state.player2.bench = [makePokemon('SQUIRTLE'), null, null];
  assert(!canPlayTrainer(state, 'player1', 'REPEL', getCard), 'Repel rejected for Stage 1');
}

// ---- Test 21: Log entries created ----
console.log('\nTest 21: Log entries');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['GIOVANNI'];
  const logBefore = state.log.length;
  const s2 = playTrainer(state, 'player1', 'GIOVANNI', getCard);
  assert(s2.log.length > logBefore, 'Log entry added');
  assert(s2.log.some(e => e.card === 'Giovanni'), 'Log mentions Giovanni');
}

// ---- Test 22: Non-trainer card rejected ----
console.log('\nTest 22: Non-trainer rejected');
{
  const state = createInitialState();
  state.player1.hand = ['BULBASAUR'];
  assert(!canPlayTrainer(state, 'player1', 'BULBASAUR', getCard), 'Pokemon rejected');
}

// ---- Test 23: Red +20 to ex ----
console.log('\nTest 23: Red turnEffect');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['RED'];
  const s2 = playTrainer(state, 'player1', 'RED', getCard);
  assert(s2.turnEffects.some(e => e.source === 'Red' && e.amount === 20), 'Red turnEffect');
}

// ---- Test 24: Leaf retreat reduction ----
console.log('\nTest 24: Leaf retreat reduction');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['LEAF'];
  const s2 = playTrainer(state, 'player1', 'LEAF', getCard);
  assert(s2.turnEffects.some(e => e.source === 'Leaf' && e.type === 'retreatReduction'), 'Leaf turnEffect');
}

// ---- Test 25: Blue damage reduction ----
console.log('\nTest 25: Blue damage reduction');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['BLUE'];
  const s2 = playTrainer(state, 'player1', 'BLUE', getCard);
  assert(s2.turnEffects.some(e => e.source === 'Blue' && e.type === 'damageReduction'), 'Blue turnEffect');
}

// ---- Test 26: Lillie heals Stage 2 only ----
console.log('\nTest 26: Lillie Stage 2 only');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['LILLIE'];
  state.player1.active = makePokemon('VENUSAUR', { currentHp: 80 }); // Stage 2
  const s2 = playTrainer(state, 'player1', 'LILLIE', getCard, { pokemonIndex: 'active' });
  assert(s2.player1.active.currentHp === 140, `Healed 60 (got ${s2.player1.active.currentHp})`);
}

// ---- Test 27: Leftovers tool attached ----
console.log('\nTest 27: Leftovers tool');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['LEFTOVERS'];
  state.player1.active = makePokemon('PIKACHU');
  const s2 = playTrainer(state, 'player1', 'LEFTOVERS', getCard, { pokemonIndex: 'active' });
  assert(s2.player1.active.tool.name === 'Leftovers', 'Leftovers attached');
  assert(s2.player1.active.tool.effect.type === 'endTurnHeal', 'Correct effect type');
}

// ---- Test 28: State valid after various plays ----
console.log('\nTest 28: State validation');
{
  const state = createInitialState();
  state.turn = 2;
  state.player1.hand = ['GIOVANNI'];
  state.player1.active = makePokemon('PIKACHU');
  const s2 = playTrainer(state, 'player1', 'GIOVANNI', getCard);
  const v = validateState(s2);
  assert(v.valid, 'State valid after Giovanni');
}

// Summary
console.log('\n=== Summary ===');
console.log(`Total: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

process.exit(failCount > 0 ? 1 : 0);
