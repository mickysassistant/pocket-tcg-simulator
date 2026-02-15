#!/usr/bin/env node

/**
 * T05 Test - Game State Model (Node.js version)
 *
 * Run with: node test-t05.mjs
 */

import {
  createInitialState,
  createPlayer,
  createPokemon,
  cloneState,
  validateState,
  isValidState,
  addLogEntry,
  exportState
} from './js/engine/game-state.js';

let testCount = 0;
let passCount = 0;

function assert(condition, testName, message = '') {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✅ ${testName}`);
    if (message) console.log(`   ${message}`);
  } else {
    console.log(`❌ ${testName}`);
    if (message) console.log(`   ${message}`);
  }
}

function runAllTests() {
  console.log('\n🧪 T05 Test - Game State Model\n');
  console.log('=' .repeat(60));

  runInitialStateTest();
  runPlayerTest();
  runPokemonTest();
  runCloneTest();
  runValidationTest();
  runSpecFormatTest();

  console.log('=' .repeat(60));
  console.log(`\n📊 Test Summary: ${passCount}/${testCount} passed`);
  if (passCount === testCount) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`⚠️ ${testCount - passCount} test(s) failed\n`);
    process.exit(1);
  }
}

function runInitialStateTest() {
  console.log('\n📋 Test 1: createInitialState()');
  console.log('-'.repeat(60));

  try {
    const state = createInitialState();

    assert(typeof state === 'object', 'State is an object');

    // Check version
    assert(state.version === 1, 'State has version 1', `Version: ${state.version}`);

    // Check turn
    assert(typeof state.turn === 'number', 'State has turn number');
    assert(state.turn === 0, 'Turn starts at 0', `Turn: ${state.turn}`);

    // Check current player
    assert(typeof state.currentPlayer === 'string', 'State has currentPlayer');
    assert(state.currentPlayer === 'player1', 'Player 1 starts', `Current player: ${state.currentPlayer}`);

    // Check coin queue
    assert(Array.isArray(state.coinQueue), 'Coin queue is an array');
    assert(state.coinQueue.length === 10, 'Coin queue has 10 coins', `Length: ${state.coinQueue.length}`);
    assert(state.coinQueue.every(c => typeof c === 'boolean'), 'All coin values are boolean');

    // Check players
    assert(!!state.player1, 'Player 1 exists');
    assert(!!state.player2, 'Player 2 exists');
    assert(state.player1 !== state.player2, 'Players are different objects');

    // Check empty state
    assert(state.player1.points === 0, 'Player 1 points at 0');
    assert(state.player2.points === 0, 'Player 2 points at 0');
    assert(state.player1.active === null, 'Player 1 active is null');
    assert(state.player2.active === null, 'Player 2 active is null');
    assert(state.player1.bench.length === 0, 'Player 1 bench is empty');
    assert(state.player2.bench.length === 0, 'Player 2 bench is empty');
    assert(state.player1.hand.length === 0, 'Player 1 hand is empty');
    assert(state.player2.hand.length === 0, 'Player 2 hand is empty');
    assert(state.player1.deck.length === 0, 'Player 1 deck is empty');
    assert(state.player2.deck.length === 0, 'Player 2 deck is empty');
    assert(state.player1.discard.length === 0, 'Player 1 discard is empty');
    assert(state.player2.discard.length === 0, 'Player 2 discard is empty');

    // Check stadium and log
    assert(state.stadium === null, 'Stadium is null');
    assert(state.log.length === 0, 'Log is empty');
    assert(state.turnEffects.length === 0, 'Turn effects is empty');

  } catch (error) {
    assert(false, 'createInitialState()', `Error: ${error.message}`);
  }
}

function runPlayerTest() {
  console.log('\n📋 Test 2: createPlayer()');
  console.log('-'.repeat(60));

  try {
    const player1 = createPlayer('Test Player 1');
    const player2 = createPlayer('Test Player 2');

    assert(player1.points === 0, 'Player has 0 points');
    assert(player1.active === null, 'Player active is null');
    assert(Array.isArray(player1.bench) && player1.bench.length === 0, 'Player bench is empty array');
    assert(Array.isArray(player1.hand) && player1.hand.length === 0, 'Player hand is empty array');
    assert(Array.isArray(player1.deck) && player1.deck.length === 0, 'Player deck is empty array');
    assert(Array.isArray(player1.discard) && player1.discard.length === 0, 'Player discard is empty array');

    assert(!!player1.energyZone, 'Energy zone exists');
    assert(player1.energyZone.currentEnergy === null, 'Energy zone currentEnergy is null');
    assert(player1.energyZone.nextEnergy === null, 'Energy zone nextEnergy is null');
    assert(player1.energyZone.configuredTypes.length === 0, 'Energy zone configuredTypes is empty');
    assert(player1.energyZone.usedThisTurn === false, 'Energy zone usedThisTurn is false');

    assert(player1.supporterUsedThisTurn === false, 'supporterUsedThisTurn is false');
    assert(player1.retreatedThisTurn === false, 'retreatedThisTurn is false');
    assert(player1.normalAttachUsedThisTurn === false, 'normalAttachUsedThisTurn is false');

    // Check that two player objects are independent
    player1.points = 5;
    assert(player2.points === 0, 'Players are independent', `Player 2 points: ${player2.points}`);

  } catch (error) {
    assert(false, 'createPlayer()', `Error: ${error.message}`);
  }
}

function runPokemonTest() {
  console.log('\n📋 Test 3: createPokemon()');
  console.log('-'.repeat(60));

  try {
    const pokemon = createPokemon('A1-003', 5);

    assert(pokemon.cardId === 'A1-003', 'Pokemon has cardId', `Card ID: ${pokemon.cardId}`);
    assert(typeof pokemon.currentHp === 'number', 'Pokemon has currentHp');
    assert(Array.isArray(pokemon.energy) && pokemon.energy.length === 0, 'Pokemon energy is empty array');
    assert(pokemon.status === null, 'Pokemon status is null');
    assert(pokemon.turnPlayed === 5, 'Pokemon has turnPlayed', `Turn played: ${pokemon.turnPlayed}`);
    assert(pokemon.lastEvolved === null, 'Pokemon lastEvolved is null');
    assert(pokemon.tool === null, 'Pokemon tool is null');
    assert(Array.isArray(pokemon.effects) && pokemon.effects.length === 0, 'Pokemon effects is empty array');

    // Test default turnPlayed
    const pokemonDefault = createPokemon('A1-001');
    assert(pokemonDefault.turnPlayed === 0, 'Default turnPlayed is 0', `Turn played: ${pokemonDefault.turnPlayed}`);

    // Test with energy
    const pokemonWithEnergy = createPokemon('A1-004', 10);
    pokemonWithEnergy.energy = ['G', 'G', 'W'];
    assert(pokemonWithEnergy.energy.length === 3, 'Pokemon can have energy', `Energy: ${JSON.stringify(pokemonWithEnergy.energy)}`);

  } catch (error) {
    assert(false, 'createPokemon()', `Error: ${error.message}`);
  }
}

function runCloneTest() {
  console.log('\n📋 Test 4: cloneState()');
  console.log('-'.repeat(60));

  try {
    const state = createInitialState();
    state.player1.points = 2;
    state.player1.active = createPokemon('A1-003', 5);
    state.player1.active.energy = ['G', 'G'];
    state.turn = 10;

    const cloned = cloneState(state);

    assert(!!cloned, 'Cloned state exists');
    assert(typeof cloned === 'object', 'Cloned state has same structure');
    assert(cloned.turn === state.turn, 'Cloned turn matches', `Turn: ${cloned.turn}`);
    assert(cloned.player1.points === state.player1.points, 'Cloned player1 points match', `Points: ${cloned.player1.points}`);
    assert(!!cloned.player1.active, 'Cloned active exists');
    assert(cloned.player1.active.cardId === state.player1.active.cardId, 'Cloned active cardId matches', `Card ID: ${cloned.player1.active.cardId}`);
    assert(JSON.stringify(cloned.player1.active.energy) === JSON.stringify(state.player1.active.energy), 'Cloned active energy matches');

    // Test immutability
    cloned.turn = 99;
    cloned.player1.points = 88;
    assert(state.turn === 10, 'Original state unchanged (turn)', `Original turn: ${state.turn}`);
    assert(state.player1.points === 2, 'Original state unchanged (points)', `Original points: ${state.player1.points}`);

    assert(cloned !== state, 'Cloned state has different reference');

  } catch (error) {
    assert(false, 'cloneState()', `Error: ${error.message}`);
  }
}

function runValidationTest() {
  console.log('\n📋 Test 5: validateState()');
  console.log('-'.repeat(60));

  try {
    // Test valid state
    const validState = createInitialState();
    const validResult = validateState(validState);
    assert(validResult.valid === true, 'Valid state passes validation', `Errors: ${JSON.stringify(validResult.errors)}`);

    // Test invalid version
    const invalidVersion = cloneState(validState);
    invalidVersion.version = 999;
    const versionResult = validateState(invalidVersion);
    assert(versionResult.valid === false, 'Invalid version caught', `Errors: ${versionResult.errors.join(', ')}`);

    // Test invalid turn
    const invalidTurn = cloneState(validState);
    invalidTurn.turn = -1;
    const turnResult = validateState(invalidTurn);
    assert(turnResult.valid === false, 'Invalid turn caught', `Errors: ${turnResult.errors.join(', ')}`);

    // Test invalid currentPlayer
    const invalidPlayer = cloneState(validState);
    invalidPlayer.currentPlayer = 'player3';
    const playerResult = validateState(invalidPlayer);
    assert(playerResult.valid === false, 'Invalid currentPlayer caught', `Errors: ${playerResult.errors.join(', ')}`);

    // Test invalid bench size
    const invalidBench = cloneState(validState);
    invalidBench.player1.bench = [createPokemon('A1-001'), createPokemon('A1-002'), createPokemon('A1-003'), createPokemon('A1-004')];
    const benchResult = validateState(invalidBench);
    assert(benchResult.valid === false, 'Invalid bench size caught', `Errors: ${benchResult.errors.join(', ')}`);

    // Test invalid hand size
    const invalidHand = cloneState(validState);
    invalidHand.player1.hand = Array(11).fill('A1-001');
    const handResult = validateState(invalidHand);
    assert(handResult.valid === false, 'Invalid hand size caught', `Errors: ${handResult.errors.join(', ')}`);

    // Test isValidState shortcut
    const isValid = isValidState(validState);
    assert(isValid === true, 'isValidState() returns true for valid state', `Result: ${isValid}`);

    const isInvalid = isValidState(invalidVersion);
    assert(isInvalid === false, 'isValidState() returns false for invalid state', `Result: ${isInvalid}`);

  } catch (error) {
    assert(false, 'validateState()', `Error: ${error.message}`);
  }
}

function runSpecFormatTest() {
  console.log('\n📋 Test 6: SPEC.md Format Compliance');
  console.log('-'.repeat(60));

  try {
    const state = createInitialState();

    // Add some data to test format
    state.turn = 5;
    state.player1.points = 1;
    state.player1.active = createPokemon('A1-003', 1);
    state.player1.active.currentHp = 160;
    state.player1.active.energy = ['G', 'G'];
    state.player1.active.status = null;
    state.player1.bench = [createPokemon('A1-001', 0)];
    state.player1.bench[0].currentHp = 70;
    state.player1.hand = ['A1-131', 'A1-224'];
    state.player1.deck = ['A1-004', 'A1-005'];
    state.player1.discard = ['A1-220'];
    state.player1.energyZone.currentEnergy = 'G';
    state.player1.energyZone.nextEnergy = 'W';
    state.player1.energyZone.configuredTypes = ['G', 'W'];

    // Check all required fields from SPEC.md
    const requiredFields = [
      'version', 'turn', 'currentPlayer', 'coinQueue', 'player1', 'player2', 'stadium', 'turnEffects', 'log'
    ];

    const missingFields = requiredFields.filter(field => !(field in state));
    assert(missingFields.length === 0, 'All top-level fields present', `Missing: ${missingFields.join(', ')}`);

    // Check player structure
    const requiredPlayerFields = [
      'points', 'active', 'bench', 'hand', 'deck', 'discard', 'energyZone', 'supporterUsedThisTurn', 'retreatedThisTurn', 'normalAttachUsedThisTurn'
    ];

    const missingPlayer1Fields = requiredPlayerFields.filter(field => !(field in state.player1));
    assert(missingPlayer1Fields.length === 0, 'All player1 fields present', `Missing: ${missingPlayer1Fields.join(', ')}`);

    const missingPlayer2Fields = requiredPlayerFields.filter(field => !(field in state.player2));
    assert(missingPlayer2Fields.length === 0, 'All player2 fields present', `Missing: ${missingPlayer2Fields.join(', ')}`);

    // Check energy zone structure
    const requiredEnergyFields = ['currentEnergy', 'nextEnergy', 'configuredTypes', 'usedThisTurn'];
    const missingEnergyFields = requiredEnergyFields.filter(field => !(field in state.player1.energyZone));
    assert(missingEnergyFields.length === 0, 'All energyZone fields present', `Missing: ${missingEnergyFields.join(', ')}`);

    // Check Pokemon structure
    if (state.player1.active) {
      const requiredPokemonFields = ['cardId', 'currentHp', 'energy', 'status', 'turnPlayed', 'lastEvolved', 'tool', 'effects'];
      const missingPokemonFields = requiredPokemonFields.filter(field => !(field in state.player1.active));
      assert(missingPokemonFields.length === 0, 'All active Pokemon fields present', `Missing: ${missingPokemonFields.join(', ')}`);
    }

    // Test addLogEntry
    const logEntry = {
      action: 'draw',
      card: 'A1-131',
      details: 'Drew Potion'
    };
    const stateWithLog = addLogEntry(state, logEntry);
    assert(stateWithLog.log.length === 1, 'Log entry added', `Log length: ${stateWithLog.log.length}`);
    assert(stateWithLog.log[0].action === 'draw', 'Log entry has action', `Action: ${stateWithLog.log[0].action}`);
    assert(!!stateWithLog.log[0].timestamp, 'Log entry has timestamp', `Timestamp: ${stateWithLog.log[0].timestamp}`);
    assert(stateWithLog.log[0].turn === 5, 'Log entry has turn', `Turn: ${stateWithLog.log[0].turn}`);
    assert(stateWithLog.log[0].player === 'player1', 'Log entry has player', `Player: ${stateWithLog.log[0].player}`);

    // Test exportState
    const exported = exportState(state);
    assert(!exported.name, 'Export removes name', `Name: ${exported.name}`);
    assert(!exported.description, 'Export removes description', `Description: ${exported.description}`);
    assert(exported.version === state.version, 'Export preserves version', `Version: ${exported.version}`);
    assert(exported.turn === state.turn, 'Export preserves turn', `Turn: ${exported.turn}`);

    // Test JSON serialization
    const json = JSON.stringify(state, null, 2);
    assert(!!json, 'State is JSON serializable', `JSON length: ${json.length}`);
    assert(JSON.parse(json).version === state.version, 'State can be parsed back', `Parsed version: ${JSON.parse(json).version}`);

  } catch (error) {
    assert(false, 'SPEC.md Format Test', `Error: ${error.message}`);
  }
}

// Run all tests
runAllTests();
