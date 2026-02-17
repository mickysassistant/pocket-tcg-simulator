/**
 * Smoke tests for CLI config command (CLI-002)
 * 
 * Tests that verify the config service works:
 * - tcgp config get works
 * - tcgp config set works
 * - tcgp config list works
 * - tcgp config reset works
 * - Config persistence
 * - Error handling with reason codes
 * - --json output support
 */

const { execSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  
  try {
    const stdout = execSync(`node ${binPath} ${args.join(' ')}`, {
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

/**
 * Clean up config file for tests
 */
function cleanupConfig() {
  const configDir = path.join(os.homedir(), '.tcgp');
  const configPath = path.join(configDir, 'config.json');
  
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
  
  // Also check XDG_CONFIG_HOME
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    const xdgConfigPath = path.join(xdgConfigHome, 'tcgp', 'config.json');
    if (fs.existsSync(xdgConfigPath)) {
      fs.unlinkSync(xdgConfigPath);
    }
  }
}

// =============================================================================
// TESTS
// =============================================================================

// AC1: tcgp config get funciona
runTest('AC1a: config get retrieves a value', () => {
  cleanupConfig();
  
  // First set a value
  execTcgp(['config', 'set', 'testkey', 'testvalue']);
  
  // Then get it
  const result = execTcgp(['config', 'get', 'testkey']);
  assert.strictEqual(result.status, 0, 'config get should succeed');
  assert(result.stdout.includes('testkey'), 'Output should contain the key');
  assert(result.stdout.includes('testvalue'), 'Output should contain the value');
});

runTest('AC1b: config get --json outputs valid JSON', () => {
  cleanupConfig();
  
  execTcgp(['config', 'set', 'testkey', 'testvalue']);
  
  const result = execTcgp(['--json', 'config', 'get', 'testkey']);
  assert.strictEqual(result.status, 0, 'config get --json should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert.strictEqual(json.key, 'testkey', 'JSON should have correct key');
  assert.strictEqual(json.value, 'testvalue', 'JSON should have correct value');
  assert.strictEqual(json.found, true, 'JSON should show found=true');
});

runTest('AC1c: config get returns undefined for non-existent key', () => {
  cleanupConfig();
  
  const result = execTcgp(['config', 'get', 'nonexistent']);
  assert.notStrictEqual(result.status, 0, 'config get for non-existent key should fail');
  assert(result.stdout.includes('not found'), 'Output should indicate not found');
});

runTest('AC1d: config get --json handles non-existent key', () => {
  cleanupConfig();
  
  const result = execTcgp(['--json', 'config', 'get', 'nonexistent']);
  assert.notStrictEqual(result.status, 0, 'config get --json for non-existent key should fail');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert.strictEqual(json.key, 'nonexistent', 'JSON should have the key');
  assert.strictEqual(json.found, false, 'JSON should show found=false');
});

runTest('AC1e: config get returns default values', () => {
  cleanupConfig();
  
  // Get a default value
  const result = execTcgp(['config', 'get', 'editor']);
  assert.strictEqual(result.status, 0, 'config get for default value should succeed');
  assert(result.stdout.includes('vi'), 'Output should contain default editor value');
});

// AC2: tcgp config set <key> <value> funciona
runTest('AC2a: config set sets a string value', () => {
  cleanupConfig();
  
  const result = execTcgp(['config', 'set', 'mykey', 'myvalue']);
  assert.strictEqual(result.status, 0, 'config set should succeed');
  assert(result.stdout.includes('mykey'), 'Output should contain the key');
  assert(result.stdout.includes('myvalue'), 'Output should contain the value');
  assert(result.stdout.includes('set to'), 'Output should indicate success');
});

runTest('AC2b: config set --json outputs valid JSON', () => {
  cleanupConfig();
  
  const result = execTcgp(['--json', 'config', 'set', 'mykey', 'myvalue']);
  assert.strictEqual(result.status, 0, 'config set --json should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert.strictEqual(json.key, 'mykey', 'JSON should have correct key');
  assert.strictEqual(json.value, 'myvalue', 'JSON should have correct value');
  assert(json.message !== undefined, 'JSON should have message');
});

runTest('AC2d: config set handles boolean values', () => {
  cleanupConfig();
  
  const result = execTcgp(['--json', 'config', 'set', 'mybool', 'true']);
  assert.strictEqual(result.status, 0, 'config set with boolean value should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert.strictEqual(json.value, true, 'Boolean value should be parsed correctly');
});

runTest('AC2f: config set handles values with spaces', () => {
  cleanupConfig();
  
  const result = execTcgp(['--json', 'config', 'set', 'mysentence', 'hello world']);
  assert.strictEqual(result.status, 0, 'config set with spaces should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert.strictEqual(json.value, 'hello world', 'Value with spaces should be preserved');
});

// AC3: Persistencia local implementada y documentada
runTest('AC3a: Config persists across invocations', () => {
  cleanupConfig();
  
  // Set a value
  execTcgp(['config', 'set', 'persistkey', 'persistvalue']);
  
  // Get it in a new invocation
  const result = execTcgp(['config', 'get', 'persistkey']);
  assert.strictEqual(result.status, 0, 'config get should succeed');
  assert(result.stdout.includes('persistvalue'), 'Persisted value should be retrieved');
});

runTest('AC3b: Config list shows stored values', () => {
  cleanupConfig();
  
  execTcgp(['config', 'set', 'key1', 'value1']);
  execTcgp(['config', 'set', 'key2', 'value2']);
  
  const result = execTcgp(['config', 'list']);
  assert.strictEqual(result.status, 0, 'config list should succeed');
  assert(result.stdout.includes('key1'), 'Output should contain key1');
  assert(result.stdout.includes('value1'), 'Output should contain value1');
  assert(result.stdout.includes('key2'), 'Output should contain key2');
  assert(result.stdout.includes('value2'), 'Output should contain value2');
});

runTest('AC3c: Config list --json outputs valid JSON', () => {
  cleanupConfig();
  
  execTcgp(['config', 'set', 'testkey', 'testvalue']);
  
  const result = execTcgp(['--json', 'config', 'list']);
  assert.strictEqual(result.status, 0, 'config list --json should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert(json.config !== undefined, 'JSON should have config object');
  assert(json.configPath !== undefined, 'JSON should have configPath');
  assert.strictEqual(json.config.testkey, 'testvalue', 'Config should contain the set value');
});

runTest('AC3d: Config file is created in correct location', () => {
  cleanupConfig();
  
  execTcgp(['config', 'set', 'testkey', 'testvalue']);
  
  const result = execTcgp(['--json', 'config', 'list']);
  const json = parseJson(result.stdout);
  
  assert(json.configPath !== undefined, 'JSON should have configPath');
  assert(json.configPath.includes('.tcgp') || json.configPath.includes('tcgp'), 
    'Config path should contain tcgp directory');
  
  // Verify file exists
  assert(fs.existsSync(json.configPath), 'Config file should exist');
});

// AC4: Casos de error validados con reason codes
runTest('AC4a: Missing key argument returns error with reason', () => {
  const result = execTcgp(['--json', 'config', 'get']);
  assert.notStrictEqual(result.status, 0, 'Missing key should fail');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert(json.error !== undefined, 'Error should have error field');
  assert.strictEqual(json.reason, 'MISSING_ARGUMENT', 'Error should have correct reason code');
});

runTest('AC4b: Missing value argument returns error with reason', () => {
  const result = execTcgp(['--json', 'config', 'set', 'mykey']);
  assert.notStrictEqual(result.status, 0, 'Missing value should fail');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert(json.error !== undefined, 'Error should have error field');
  assert.strictEqual(json.reason, 'MISSING_ARGUMENT', 'Error should have correct reason code');
});

runTest('AC4c: Missing subcommand returns error with reason', () => {
  const result = execTcgp(['--json', 'config']);
  assert.notStrictEqual(result.status, 0, 'Missing subcommand should fail');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert(json.error !== undefined, 'Error should have error field');
  assert.strictEqual(json.reason, 'MISSING_SUBCOMMAND', 'Error should have correct reason code');
});

runTest('AC4d: Unknown subcommand returns error with reason', () => {
  const result = execTcgp(['--json', 'config', 'invalid']);
  assert.notStrictEqual(result.status, 0, 'Unknown subcommand should fail');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert(json.error !== undefined, 'Error should have error field');
  assert.strictEqual(json.reason, 'UNKNOWN_SUBCOMMAND', 'Error should have correct reason code');
});

// Additional tests
runTest('Config reset clears all values', () => {
  cleanupConfig();
  
  execTcgp(['config', 'set', 'key1', 'value1']);
  execTcgp(['config', 'set', 'key2', 'value2']);
  
  const resetResult = execTcgp(['--json', 'config', 'reset']);
  assert.strictEqual(resetResult.status, 0, 'config reset should succeed');
  
  const resetJson = parseJson(resetResult.stdout);
  assert(resetJson !== null, 'Reset output should be valid JSON');
  assert(resetJson.message !== undefined, 'Reset should have message');
  
  // Verify values are cleared but defaults remain
  const getResult = execTcgp(['--json', 'config', 'get', 'key1']);
  const getJson = parseJson(getResult.stdout);
  assert.strictEqual(getJson.found, false, 'Cleared key should not be found');
});

runTest('Config --help works for config command', () => {
  const result = execTcgp(['config', '--help']);
  assert.strictEqual(result.status, 0, 'config --help should succeed');
  assert(result.stdout.includes('SUBCOMMANDS:'), 'Output should list subcommands');
  assert(result.stdout.includes('get'), 'Output should mention get');
  assert(result.stdout.includes('set'), 'Output should mention set');
  assert(result.stdout.includes('list'), 'Output should mention list');
  assert(result.stdout.includes('reset'), 'Output should mention reset');
});

runTest('Config defaults are available', () => {
  cleanupConfig();
  
  const result = execTcgp(['--json', 'config', 'list']);
  const json = parseJson(result.stdout);
  
  assert(json !== null, 'Output should be valid JSON');
  assert(json.config !== undefined, 'JSON should have config object');
  assert(json.config.editor !== undefined, 'Default editor should be present');
  assert(json.config.theme !== undefined, 'Default theme should be present');
  assert(json.config.language !== undefined, 'Default language should be present');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('CLI CONFIG SMOKE TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
