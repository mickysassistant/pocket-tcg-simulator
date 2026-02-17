/**
 * Tests for CLI Actions Service (actions.js)
 *
 * Tests action registry, validation, and error handling
 */

const assert = require('assert');
const actions = require('../../src/cli/services/actions');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    testsPassed++;
    console.log(`✓ ${testName}`);
  } catch (error) {
    testsFailed++;
    console.error(`✗ ${testName}`);
    console.error(`  Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n').slice(1, 3).join('\n')}`);
    }
  }
}

// =============================================================================
// TESTS
// =============================================================================

// AC1: tcgp action list funciona por sesión
runTest('AC1a: listActions returns array of actions', () => {
  const actionList = actions.listActions();
  assert(Array.isArray(actionList), 'Should return an array');
  assert(actionList.length > 0, 'Should have at least one action');
});

runTest('AC1b: listActions includes required fields', () => {
  const actionList = actions.listActions();
  const firstAction = actionList[0];
  assert.strictEqual(typeof firstAction.id, 'string', 'Action should have id');
  assert.strictEqual(typeof firstAction.name, 'string', 'Action should have name');
  assert.strictEqual(typeof firstAction.description, 'string', 'Action should have description');
  assert.strictEqual(typeof firstAction.sessionRequired, 'boolean', 'Action should have sessionRequired');
});

runTest('AC1c: listActions includes draw action', () => {
  const actionList = actions.listActions();
  const drawAction = actionList.find(a => a.id === 'draw');
  assert(drawAction, 'Draw action should exist');
  assert.strictEqual(drawAction.id, 'draw');
  assert.strictEqual(drawAction.name, 'Draw Cards');
  assert.strictEqual(drawAction.sessionRequired, true);
});

runTest('AC1d: listActions includes attach_energy action', () => {
  const actionList = actions.listActions();
  const attachAction = actionList.find(a => a.id === 'attach_energy');
  assert(attachAction, 'Attach energy action should exist');
  assert.strictEqual(attachAction.id, 'attach_energy');
  assert.strictEqual(attachAction.name, 'Attach Energy');
  assert.strictEqual(attachAction.sessionRequired, true);
});

runTest('AC1e: listActions includes evolve action', () => {
  const actionList = actions.listActions();
  const evolveAction = actionList.find(a => a.id === 'evolve');
  assert(evolveAction, 'Evolve action should exist');
  assert.strictEqual(evolveAction.id, 'evolve');
  assert.strictEqual(evolveAction.name, 'Evolve Pokemon');
  assert.strictEqual(evolveAction.sessionRequired, true);
});

runTest('AC1f: listActions includes play_supporter action', () => {
  const actionList = actions.listActions();
  const supporterAction = actionList.find(a => a.id === 'play_supporter');
  assert(supporterAction, 'Play supporter action should exist');
  assert.strictEqual(supporterAction.id, 'play_supporter');
  assert.strictEqual(supporterAction.name, 'Play Supporter');
  assert.strictEqual(supporterAction.sessionRequired, true);
});

runTest('AC1g: listActions includes end_turn action', () => {
  const actionList = actions.listActions();
  const endTurnAction = actionList.find(a => a.id === 'end_turn');
  assert(endTurnAction, 'End turn action should exist');
  assert.strictEqual(endTurnAction.id, 'end_turn');
  assert.strictEqual(endTurnAction.name, 'End Turn');
  assert.strictEqual(endTurnAction.sessionRequired, true);
});

runTest('AC1h: listActions includes start_turn action', () => {
  const actionList = actions.listActions();
  const startTurnAction = actionList.find(a => a.id === 'start_turn');
  assert(startTurnAction, 'Start turn action should exist');
  assert.strictEqual(startTurnAction.id, 'start_turn');
  assert.strictEqual(startTurnAction.name, 'Start Turn');
  assert.strictEqual(startTurnAction.sessionRequired, true);
});

// AC2: Contrato de acciones documentado (action definitions with schemas)
runTest('AC2a: getAction returns action definition for valid ID', () => {
  const action = actions.getAction('draw');
  assert(action, 'Should return action');
  assert.strictEqual(action.id, 'draw');
  assert.strictEqual(action.name, 'Draw Cards');
  assert(action.schema, 'Should have schema');
});

runTest('AC2b: getAction returns null for invalid ID', () => {
  const action = actions.getAction('invalid_action');
  assert.strictEqual(action, null, 'Should return null for invalid action');
});

runTest('AC2c: getAction returns complete schema for draw action', () => {
  const action = actions.getAction('draw');
  assert(action.schema, 'Should have schema');
  assert.strictEqual(action.schema.type, 'object');
  assert(Array.isArray(action.schema.required));
  assert(action.schema.required.includes('playerId'));
  assert(action.schema.required.includes('count'));
});

runTest('AC2d: getAllActions returns all actions as object', () => {
  const allActions = actions.getAllActions();
  assert.strictEqual(typeof allActions, 'object');
  assert(Object.keys(allActions).length > 0);
  assert(allActions.draw, 'Should have draw action');
  assert(allActions.attach_energy, 'Should have attach_energy action');
  assert(allActions.evolve, 'Should have evolve action');
});

// AC3: Validaciones devuelven valid=false + reason code
runTest('AC3a: validatePayload accepts valid draw payload', () => {
  const payload = {
    playerId: 'player1',
    count: 2
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, true);
  assert(!result.reason, 'Should not have reason when valid');
  assert(!result.errors, 'Should not have errors when valid');
});

runTest('AC3b: validatePayload returns valid=false for missing required field', () => {
  const payload = {
    count: 2
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('playerId')));
});

runTest('AC3c: validatePayload returns valid=false for invalid enum value', () => {
  const payload = {
    playerId: 'player3',
    count: 2
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('playerId')));
});

runTest('AC3d: validatePayload returns valid=false for constraint violation (min)', () => {
  const payload = {
    playerId: 'player1',
    count: 0
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('count')));
});

runTest('AC3e: validatePayload returns valid=false for constraint violation (max)', () => {
  const payload = {
    playerId: 'player1',
    count: 11
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('count')));
});

runTest('AC3f: validatePayload returns valid=false for wrong type', () => {
  const payload = {
    playerId: 'player1',
    count: 2,
    respectHandLimit: 'true'
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('respectHandLimit')));
});

runTest('AC3g: validatePayload returns valid=false for missing nested field', () => {
  const payload = {
    playerId: 'player1',
    pokemonId: 'bulbasaur-1',
    evolutionCard: {
      id: 'venusaur-1',
      name: 'Venusaur'
    }
  };
  const result = actions.validatePayload('evolve', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('evolutionCard')));
});

runTest('AC3h: validatePayload returns valid=false for unknown action', () => {
  const payload = { playerId: 'player1' };
  const result = actions.validatePayload('unknown_action', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'UNKNOWN_ACTION');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('unknown_action')));
});

runTest('AC3i: validatePayload returns valid=false for null payload', () => {
  const result = actions.validatePayload('draw', null);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'INVALID_PAYLOAD_TYPE');
});

runTest('AC3j: validatePayload returns valid=false for array payload', () => {
  const result = actions.validatePayload('draw', []);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'INVALID_PAYLOAD_TYPE');
});

runTest('AC3k: validatePayload returns valid=false for invalid enum in nested object', () => {
  const payload = {
    playerId: 'player1',
    pokemonId: 'bulbasaur-1',
    evolutionCard: {
      id: 'venusaur-1',
      name: 'Venusaur',
      stage: 'basic',
      hp: 160
    }
  };
  const result = actions.validatePayload('evolve', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('stage')));
});

runTest('AC3l: validatePayload accepts valid attach_energy payload', () => {
  const payload = {
    playerId: 'player1',
    targetPokemonId: 'pokemon-123'
  };
  const result = actions.validatePayload('attach_energy', payload);
  assert.strictEqual(result.valid, true);
});

runTest('AC3m: validatePayload returns valid=false for missing attach_energy field', () => {
  const payload = {
    playerId: 'player1'
  };
  const result = actions.validatePayload('attach_energy', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('targetPokemonId')));
});

runTest('AC3n: validatePayload accepts valid play_supporter payload', () => {
  const payload = {
    playerId: 'player1',
    card: {
      id: 'professor-1',
      name: 'Professor Oak'
    }
  };
  const result = actions.validatePayload('play_supporter', payload);
  assert.strictEqual(result.valid, true);
});

runTest('AC3o: validatePayload returns valid=false for missing card field', () => {
  const payload = {
    playerId: 'player1',
    card: {
      id: 'professor-1'
    }
  };
  const result = actions.validatePayload('play_supporter', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.some(e => e.includes('card')));
});

runTest('AC3p: validatePayload accepts valid end_turn payload', () => {
  const payload = {
    playerId: 'player1'
  };
  const result = actions.validatePayload('end_turn', payload);
  assert.strictEqual(result.valid, true);
});

runTest('AC3q: validatePayload returns valid=false for invalid playerId in end_turn', () => {
  const payload = {
    playerId: 'player3'
  };
  const result = actions.validatePayload('end_turn', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
});

runTest('AC3r: validatePayload accepts valid evolve payload', () => {
  const payload = {
    playerId: 'player1',
    pokemonId: 'bulbasaur-1',
    evolutionCard: {
      id: 'venusaur-1',
      name: 'Venusaur',
      stage: 'stage2',
      hp: 160
    }
  };
  const result = actions.validatePayload('evolve', payload);
  assert.strictEqual(result.valid, true);
});

runTest('AC3s: validatePayload returns valid=false for multiple errors', () => {
  const payload = {
    // missing playerId
    count: -1,
    respectHandLimit: 'true'
  };
  const result = actions.validatePayload('draw', payload);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'VALIDATION_ERROR');
  assert(Array.isArray(result.errors));
  assert(result.errors.length >= 2, 'Should have multiple errors');
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n========================================');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
