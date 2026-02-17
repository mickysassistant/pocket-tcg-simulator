/**
 * Smoke tests for CLI bootstrap (CLI-001)
 * 
 * Tests that verify the basic CLI structure is working:
 * - tcgp --help works
 * - tcgp <subcommand> --help works
 * - Base for --json output works
 * - Version command works
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

// =============================================================================
// TESTS
// =============================================================================

// AC1: Existe comando tcgp ejecutable desde npm scripts o bin
runTest('AC1: tcgp executable exists and can run', () => {
  const result = execTcgp(['--help']);
  assert.strictEqual(result.status, 0, 'tcgp --help should exit with status 0');
  assert(result.stdout.includes('tcgp'), 'Output should mention tcgp');
  assert(result.stdout.includes('COMMANDS:'), 'Output should list commands');
});

// AC2: tcgp --help funciona
runTest('AC2: tcgp --help shows available commands', () => {
  const result = execTcgp(['--help']);
  assert.strictEqual(result.status, 0, 'tcgp --help should succeed');
  const output = result.stdout;
  
  // Check for expected commands
  assert(output.includes('version'), 'Should show version command');
  assert(output.includes('help'), 'Should show help command');
  assert(output.includes('config'), 'Should show config command');
  assert(output.includes('session'), 'Should show session command');
  assert(output.includes('action'), 'Should show action command');
  
  // Check for options
  assert(output.includes('--json'), 'Should show --json option');
  assert(output.includes('--help'), 'Should show --help option');
});

// AC3: tcgp <subcommand> --help funciona
runTest('AC3a: tcgp version --help works', () => {
  const result = execTcgp(['version', '--help']);
  assert.strictEqual(result.status, 0, 'tcgp version --help should succeed');
  assert(result.stdout.includes('version'), 'Output should mention version');
});

runTest('AC3b: tcgp help --help works', () => {
  const result = execTcgp(['help', '--help']);
  assert.strictEqual(result.status, 0, 'tcgp help --help should succeed');
  assert(result.stdout.includes('help'), 'Output should mention help');
});

runTest('AC3c: tcgp config --help shows placeholder info', () => {
  const result = execTcgp(['config', '--help']);
  assert.strictEqual(result.status, 0, 'tcgp config --help should succeed');
  assert(result.stdout.includes('config'), 'Output should mention config');
});

runTest('AC3d: tcgp session --help shows placeholder info', () => {
  const result = execTcgp(['session', '--help']);
  assert.strictEqual(result.status, 0, 'tcgp session --help should succeed');
  assert(result.stdout.includes('session'), 'Output should mention session');
});

runTest('AC3e: tcgp action --help shows placeholder info', () => {
  const result = execTcgp(['action', '--help']);
  assert.strictEqual(result.status, 0, 'tcgp action --help should succeed');
  assert(result.stdout.includes('action'), 'Output should mention action');
});

// AC4: Base para salida --json lista
runTest('AC4a: version --json outputs valid JSON', () => {
  const result = execTcgp(['version', '--json']);
  assert.strictEqual(result.status, 0, 'tcgp version --json should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert(json.version !== undefined, 'JSON should have version field');
  assert(json.name !== undefined, 'JSON should have name field');
  assert.strictEqual(json.cli, 'tcgp', 'CLI field should be tcgp');
});

runTest('AC4b: help --json outputs valid JSON', () => {
  const result = execTcgp(['help', '--json']);
  assert.strictEqual(result.status, 0, 'tcgp help --json should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert(Array.isArray(json.commands), 'JSON should have commands array');
  assert(Array.isArray(json.options), 'JSON should have options array');
  assert(json.usage !== undefined, 'JSON should have usage field');
});

runTest('AC4c: --json flag works globally', () => {
  const result1 = execTcgp(['--json', 'version']);
  const json1 = parseJson(result1.stdout);
  assert(json1 !== null, '--json before command should work');
  
  const result2 = execTcgp(['version', '--json']);
  const json2 = parseJson(result2.stdout);
  assert(json2 !== null, '--json after command should work');
  
  assert.deepStrictEqual(json1, json2, 'Both positions should produce same output');
});

// Additional tests for error handling
runTest('Error: Invalid command returns JSON error with --json', () => {
  const result = execTcgp(['--json', 'invalid-command']);
  assert.strictEqual(result.status, 1, 'Invalid command should exit with status 1');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert(json.error !== undefined, 'Error should have error field');
  assert(json.reason !== undefined, 'Error should have reason field');
});

runTest('Error: Missing command shows error', () => {
  const result = execTcgp([]);
  assert.strictEqual(result.status, 1, 'Missing command should exit with status 1');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Error output should be valid JSON');
  assert(json.error !== undefined, 'Error should have error field');
});

runTest('Version command with alias v works', () => {
  const result = execTcgp(['v']);
  assert.strictEqual(result.status, 0, 'tcgp v should succeed');
  assert(result.stdout.includes('version'), 'Output should mention version');
});

runTest('Version alias with --json works', () => {
  const result = execTcgp(['v', '--json']);
  assert.strictEqual(result.status, 0, 'tcgp v --json should succeed');
  
  const json = parseJson(result.stdout);
  assert(json !== null, 'Output should be valid JSON');
  assert(json.version !== undefined, 'JSON should have version field');
});

// =============================================================================
// TEST SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('CLI BOOTSTRAP SMOKE TEST SUMMARY');
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
