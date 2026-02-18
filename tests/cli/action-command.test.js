/**
 * Smoke tests for CLI action command (CLI-005)
 * 
 * Tests that verify the action command works:
 * - tcgp action list works
 * - tcgp action validate works
 * - --json output support
 * - Error handling with reason codes
 */

const { execSync } = require('child_process');
const assert = require('assert');

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

/**
 * Execute tcgp command and return output
 * @param {string[]} args - Command arguments
 * @returns {Object} { stdout, stderr, status }
 */
function execTcgp(args) {
  const binPath = process.cwd() + '/bin/tcgp';

  // Properly escape arguments for shell
  const escapedArgs = args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes('{') || arg.includes('}')) {
      // Single-quote the argument to preserve special characters
      return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    return arg;
  });

  try {
    const stdout = execSync(`node ${binPath} ${escapedArgs.join(' ')}`, {
      encoding: 'utf8'
    });
    return { stdout, stderr: '', status: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : '',
      status: error.status || 1
    };
  }
}

/**
 * Parse JSON output safely
 * @param {string} output - JSON string
 * @returns {Object|null} Parsed JSON or null
 */
function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    return null;
  }
}

// =============================================================================
// TESTS
// =============================================================================

// AC1: tcgp action list funciona
runTest('AC1a: action list shows available actions', () => {
  const result = execTcgp(['action', 'list']);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert(result.stdout.includes('Available Actions'), 'Should show header');
  assert(result.stdout.includes('draw'), 'Should include draw action');
  assert(result.stdout.includes('attach_energy'), 'Should include attach_energy action');
});

runTest('AC1b: action list --json returns structured output', () => {
  const result = execTcgp(['action', 'list', '--json']);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert(Array.isArray(json.actions), 'Should have actions array');
  assert(json.count > 0, 'Should have at least one action');
});

runTest('AC1c: action list includes required fields in JSON', () => {
  const result = execTcgp(['action', 'list', '--json']);
  const json = parseJson(result.stdout);
  const firstAction = json.actions[0];
  assert(firstAction.id, 'Action should have id');
  assert(firstAction.name, 'Action should have name');
  assert(firstAction.description, 'Action should have description');
  assert(typeof firstAction.sessionRequired === 'boolean', 'Action should have sessionRequired');
});

runTest('AC1d: action list shows all expected actions', () => {
  const result = execTcgp(['action', 'list', '--json']);
  const json = parseJson(result.stdout);
  const actionIds = json.actions.map(a => a.id);
  assert(actionIds.includes('draw'), 'Should include draw');
  assert(actionIds.includes('attach_energy'), 'Should include attach_energy');
  assert(actionIds.includes('evolve'), 'Should include evolve');
  assert(actionIds.includes('play_supporter'), 'Should include play_supporter');
  assert(actionIds.includes('end_turn'), 'Should include end_turn');
  assert(actionIds.includes('start_turn'), 'Should include start_turn');
});

// AC2: Contrato de acciones documentado (action definitions with schemas)
runTest('AC2a: action validate shows action name', () => {
  const result = execTcgp(['action', 'validate', 'draw']);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert(result.stdout.includes('Draw Cards'), 'Should show action name');
});

runTest('AC2b: action validate without payload shows schema info', () => {
  const result = execTcgp(['action', 'validate', 'draw']);
  assert.strictEqual(result.status, 0, 'Should succeed without payload');
  assert(result.stdout.includes('Required fields'), 'Should show required fields');
});

runTest('AC2c: action validate with empty object returns valid=false + reason', () => {
  const result = execTcgp(['action', 'validate', 'draw', '{}', '--json']);
  assert(result.status !== 0, 'Should fail with empty payload object');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert.strictEqual(json.valid, false, 'Should be invalid');
  assert(json.reason, 'Should have reason code');
});

// AC3: Validaciones devuelven valid=false + reason code
runTest('AC3a: action validate accepts valid payload', () => {
  const payload = JSON.stringify({ playerId: 'player1', count: 2 });
  const result = execTcgp(['action', 'validate', 'draw', payload]);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert(result.stdout.includes('Valid: Yes'), 'Should show as valid');
});

runTest('AC3b: action validate returns valid=false for missing required field', () => {
  const payload = JSON.stringify({ count: 2 });
  const result = execTcgp(['action', 'validate', 'draw', payload, '--json']);
  assert(result.status !== 0, 'Should fail with missing field');
  const json = parseJson(result.stdout);
  assert.strictEqual(json.valid, false, 'Should be invalid');
  assert.strictEqual(json.reason, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR reason');
  assert(Array.isArray(json.errors), 'Should have errors array');
  assert(json.errors.length > 0, 'Should have at least one error');
});

runTest('AC3c: action validate returns valid=false for invalid enum value', () => {
  const payload = JSON.stringify({ playerId: 'player3', count: 2 });
  const result = execTcgp(['action', 'validate', 'draw', payload, '--json']);
  assert(result.status !== 0, 'Should fail with invalid playerId');
  const json = parseJson(result.stdout);
  assert.strictEqual(json.valid, false);
  assert.strictEqual(json.reason, 'VALIDATION_ERROR');
  assert(json.errors.some(e => e.includes('playerId')), 'Should error on playerId');
});

runTest('AC3d: action validate returns valid=false for constraint violation', () => {
  const payload = JSON.stringify({ playerId: 'player1', count: 0 });
  const result = execTcgp(['action', 'validate', 'draw', payload, '--json']);
  assert(result.status !== 0, 'Should fail with count < 1');
  const json = parseJson(result.stdout);
  assert.strictEqual(json.valid, false);
  assert.strictEqual(json.reason, 'VALIDATION_ERROR');
});

runTest('AC3e: action validate returns valid=false for unknown action', () => {
  const result = execTcgp(['action', 'validate', 'unknown_action', '{}', '--json']);
  assert(result.status !== 0, 'Should fail with unknown action');
  const json = parseJson(result.stdout);
  assert.strictEqual(json.valid, false);
  assert.strictEqual(json.reason, 'UNKNOWN_ACTION');
  assert(json.errors.some(e => e.includes('unknown_action')), 'Should mention unknown action');
});

runTest('AC3f: action validate returns valid=false for invalid JSON', () => {
  const result = execTcgp(['action', 'validate', 'draw', 'not-valid-json', '--json']);
  assert(result.status !== 0, 'Should fail with invalid JSON');
  const json = parseJson(result.stdout);
  assert.strictEqual(json.reason, 'INVALID_JSON');
});

runTest('AC3g: action validate accepts valid evolve payload', () => {
  const payload = JSON.stringify({
    playerId: 'player1',
    pokemonId: 'bulbasaur-1',
    evolutionCardId: 'venusaur-1'
  });
  const result = execTcgp(['action', 'validate', 'evolve', payload]);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert(result.stdout.includes('Valid: Yes'), 'Should show as valid');
});

runTest('AC3h: action validate returns valid=false for invalid playerId', () => {
  const payload = JSON.stringify({
    playerId: 'player3',
    pokemonId: 'bulbasaur-1',
    evolutionCardId: 'venusaur-1'
  });
  const result = execTcgp(['action', 'validate', 'evolve', payload, '--json']);
  assert(result.status !== 0, 'Should fail with invalid playerId');
  const json = parseJson(result.stdout);
  assert.strictEqual(json.valid, false);
  assert.strictEqual(json.reason, 'VALIDATION_ERROR');
});

runTest('AC3i: action validate accepts valid play_supporter payload', () => {
  const payload = JSON.stringify({
    playerId: 'player1',
    card: {
      id: 'professor-1',
      name: 'Professor Oak'
    }
  });
  const result = execTcgp(['action', 'validate', 'play_supporter', payload]);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert(result.stdout.includes('Valid: Yes'), 'Should show as valid');
});

// Additional tests
runTest('action --help shows usage', () => {
  const result = execTcgp(['action', '--help']);
  assert.strictEqual(result.status, 0, 'Command should succeed');
  assert(result.stdout.includes('USAGE:'), 'Should show usage');
  assert(result.stdout.includes('list'), 'Should mention list subcommand');
  assert(result.stdout.includes('validate'), 'Should mention validate subcommand');
});

runTest('action with no subcommand shows error', () => {
  const result = execTcgp(['action', '--json']);
  assert(result.status !== 0, 'Should fail with no subcommand');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert.strictEqual(json.reason, 'MISSING_SUBCOMMAND');
});

runTest('action with unknown subcommand shows error', () => {
  const result = execTcgp(['action', 'unknown', '--json']);
  assert(result.status !== 0, 'Should fail with unknown subcommand');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert.strictEqual(json.reason, 'UNKNOWN_SUBCOMMAND');
});

runTest('action execution not yet implemented shows proper error', () => {
  const timestamp = Date.now();
  const sessionName = `test-not-implemented-${timestamp}`;
  const createResult = execTcgp(['session', 'create', sessionName, '--p1', 'deck1', '--p2', 'deck2']);
  if (createResult.status === 0) {
    try {
      const result = execTcgp(['action', 'draw', '{"playerId":"player1","count":2}', '--session', sessionName, '--json']);
      assert(result.status !== 0, 'Should fail - not implemented');
      const json = parseJson(result.stdout);
      assert(json, 'Should return valid JSON');
      assert.strictEqual(json.reason, 'NOT_IMPLEMENTED');
      assert.strictEqual(json.actionId, 'draw');
    } finally {
      execTcgp(['session', 'close', sessionName]);
    }
  }
});

runTest('action validate without payload shows action info', () => {
  const result = execTcgp(['action', 'validate', 'draw', '--json']);
  assert.strictEqual(result.status, 0, 'Should succeed without payload');
  const json = parseJson(result.stdout);
  assert(json, 'Should return valid JSON');
  assert.strictEqual(json.actionId, 'draw');
  assert.strictEqual(json.actionName, 'Draw Cards');
  assert(json.description, 'Should have description');
  assert(json.schema, 'Should have schema');
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
