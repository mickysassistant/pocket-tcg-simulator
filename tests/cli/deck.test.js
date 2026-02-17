/**
 * Tests for CLI-010: Deck tooling mínimo
 * 
 * Tests that verify deck validation and statistics:
 * - tcgp deck validate works
 * - tcgp deck stats shows metrics
 * - --json output support
 * - Error handling with reason codes
 */

const { execSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
 * Create a temporary test deck
 * @param {boolean} valid - Whether to create a valid deck
 * @returns {string} Path to the temporary file
 */
function createTestDeck(valid = true) {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const deckPath = path.join(tmpDir, `test-deck-${Date.now()}.json`);

  if (valid) {
    // Create a valid 20-card deck
    const deck = Array.from({ length: 20 }, (_, i) => ({
      id: `test-card-${i}`,
      name: `Test Card ${i}`,
      supertype: 'Pokémon',
      element: ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic'][i % 5],
      hp: 60 + (i % 3) * 20,
      stage: 'Basic',
      attacks: [
        {
          name: 'Test Attack',
          energyCost: ['C', 'C']
        }
      ]
    }));
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
  } else {
    // Create an invalid deck (19 cards)
    const deck = Array.from({ length: 19 }, (_, i) => ({
      id: `test-card-${i}`,
      name: `Test Card ${i}`,
      supertype: 'Pokémon',
      element: 'Grass',
      hp: 60,
      stage: 'Basic'
    }));
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
  }

  return deckPath;
}

/**
 * Create an invalid JSON file
 * @returns {string} Path to the temporary file
 */
function createInvalidJson() {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const filePath = path.join(tmpDir, `invalid-${Date.now()}.json`);
  fs.writeFileSync(filePath, '{ invalid json');
  return filePath;
}

/**
 * Clean up test deck files
 */
function cleanupTestDecks() {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(tmpDir, file));
    });
  }
}

console.log('Running Deck Command Tests (CLI-010)...\n');

// Test 1: tcgp deck validate with valid deck
runTest('tcgp deck validate with valid deck', () => {
  const deckPath = createTestDeck(true);
  try {
    const { stdout, status } = execTcgp(['deck', 'validate', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    assert(stdout.includes('✓ Deck is valid'), 'Should show valid message');
    assert(stdout.includes('Cards: 20'), 'Should show card count');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 2: tcgp deck validate with invalid deck size
runTest('tcgp deck validate with invalid deck size', () => {
  const deckPath = createTestDeck(false);
  try {
    const { stdout, status } = execTcgp(['deck', 'validate', deckPath]);
    assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
    assert(stdout.includes('✗'), 'Should show invalid marker');
    assert(stdout.includes('19'), 'Should mention 19 cards');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 3: tcgp deck validate with non-existent file
runTest('tcgp deck validate with non-existent file', () => {
  const { stdout, status } = execTcgp(['deck', 'validate', '/nonexistent/deck.json']);
  assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
  assert(stdout.includes('not found'), 'Should show file not found error');
});

// Test 4: tcgp deck validate with invalid JSON
runTest('tcgp deck validate with invalid JSON', () => {
  const filePath = createInvalidJson();
  try {
    const { stdout, status } = execTcgp(['deck', 'validate', filePath]);
    assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
    assert(stdout.includes('not valid JSON'), 'Should show JSON error');
  } finally {
    fs.unlinkSync(filePath);
  }
});

// Test 5: tcgp deck validate --json with valid deck
runTest('tcgp deck validate --json with valid deck', () => {
  const deckPath = createTestDeck(true);
  try {
    const { stdout, status } = execTcgp(['--json', 'deck', 'validate', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    const data = parseJson(stdout);
    assert(data, 'Should output valid JSON');
    assert.strictEqual(data.valid, true, 'Should be marked as valid');
    assert.strictEqual(data.reason, 'VALID', 'Should have VALID reason');
    assert.strictEqual(data.cardCount, 20, 'Should show 20 cards');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 6: tcgp deck validate --json with invalid deck
runTest('tcgp deck validate --json with invalid deck', () => {
  const deckPath = createTestDeck(false);
  try {
    const { stdout, status } = execTcgp(['--json', 'deck', 'validate', deckPath]);
    assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
    const data = parseJson(stdout);
    assert(data, 'Should output valid JSON');
    assert.strictEqual(data.valid, false, 'Should be marked as invalid');
    assert.strictEqual(data.reason, 'INVALID_DECK_SIZE', 'Should have correct reason');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 7: tcgp deck stats with valid deck
runTest('tcgp deck stats with valid deck', () => {
  const deckPath = createTestDeck(true);
  try {
    const { stdout, status } = execTcgp(['deck', 'stats', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    assert(stdout.includes('Deck Statistics'), 'Should show deck statistics');
    assert(stdout.includes('Total Cards: 20'), 'Should show total cards');
    assert(stdout.includes('Valid Size'), 'Should show size validation');
    assert(stdout.includes('Card Types:'), 'Should show card types');
    assert(stdout.includes('Elements:'), 'Should show elements');
    assert(stdout.includes('HP Distribution'), 'Should show HP distribution');
    assert(stdout.includes('Energy Costs'), 'Should show energy costs');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 8: tcgp deck stats --json
runTest('tcgp deck stats --json', () => {
  const deckPath = createTestDeck(true);
  try {
    const { stdout, status } = execTcgp(['--json', 'deck', 'stats', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    const data = parseJson(stdout);
    assert(data, 'Should output valid JSON');
    assert.strictEqual(data.totalCards, 20, 'Should show 20 cards');
    assert.strictEqual(data.isValidSize, true, 'Should be valid size');
    assert(data.supertypes, 'Should have supertypes');
    assert(data.elements, 'Should have elements');
    assert(data.hpDistribution, 'Should have HP distribution');
    assert(data.energyCosts, 'Should have energy costs');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 9: tcgp deck stats with non-existent file
runTest('tcgp deck stats with non-existent file', () => {
  const { stdout, status } = execTcgp(['deck', 'stats', '/nonexistent/deck.json']);
  assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
  assert(stdout.includes('not found'), 'Should show file not found error');
});

// Test 10: tcgp deck stats --json with error
runTest('tcgp deck stats --json with error', () => {
  const { stdout, status } = execTcgp(['--json', 'deck', 'stats', '/nonexistent/deck.json']);
  assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
  const data = parseJson(stdout);
  assert(data, 'Should output valid JSON');
  assert(data.error, 'Should have error message');
  assert.strictEqual(data.reason, 'FILE_NOT_FOUND', 'Should have FILE_NOT_FOUND reason');
});

// Test 11: tcgp deck validate missing argument
runTest('tcgp deck validate missing argument', () => {
  const { stdout, status } = execTcgp(['deck', 'validate']);
  assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
  assert(stdout.includes('Usage:'), 'Should show usage message');
});

// Test 12: tcgp deck stats missing argument
runTest('tcgp deck stats missing argument', () => {
  const { stdout, status } = execTcgp(['deck', 'stats']);
  assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
  assert(stdout.includes('Usage:'), 'Should show usage message');
});

// Test 13: tcgp deck unknown subcommand
runTest('tcgp deck unknown subcommand', () => {
  const { stdout, status } = execTcgp(['deck', 'unknown']);
  assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
  assert(stdout.includes('Valid subcommands'), 'Should show valid subcommands');
});

// Test 14: tcgp deck validate with real card data (subset from A1a.json)
runTest('tcgp deck validate with real card data (subset from A1a.json)', () => {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Load A1a.json and create a 20-card deck
  const allCards = require(process.cwd() + '/data/A1a.json');
  const deckPath = path.join(tmpDir, `real-deck-${Date.now()}.json`);
  const deck = allCards.slice(0, 20).map(card => ({
    id: card.id,
    name: card.name,
    supertype: card.supertype,
    element: card.element,
    hp: card.hp,
    stage: card.stage || 'Basic',
    attacks: card.attacks || []
  }));

  try {
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
    const { stdout, status } = execTcgp(['deck', 'validate', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    assert(stdout.includes('✓ Deck is valid'), 'Should show valid message');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 15: tcgp deck stats with real card data (subset from A1a.json)
runTest('tcgp deck stats with real card data (subset from A1a.json)', () => {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Load A1a.json and create a 20-card deck
  const allCards = require(process.cwd() + '/data/A1a.json');
  const deckPath = path.join(tmpDir, `real-deck-${Date.now()}.json`);
  const deck = allCards.slice(0, 20).map(card => ({
    id: card.id,
    name: card.name,
    supertype: card.supertype,
    element: card.element,
    hp: card.hp,
    stage: card.stage || 'Basic',
    attacks: card.attacks || []
  }));

  try {
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
    const { stdout, status } = execTcgp(['deck', 'stats', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    assert(stdout.includes('Deck Statistics'), 'Should show deck statistics');
    assert(stdout.includes('Total Cards:'), 'Should show total cards');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 16: tcgp deck validate shows errors for missing required fields
runTest('tcgp deck validate shows errors for missing required fields', () => {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const deckPath = path.join(tmpDir, `test-deck-${Date.now()}.json`);
  const deck = Array.from({ length: 20 }, (_, i) => ({
    // Missing id field
    name: `Test Card ${i}`,
    supertype: 'Pokémon'
  }));

  try {
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
    const { stdout, status } = execTcgp(['deck', 'validate', deckPath]);
    assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
    assert(stdout.includes('missing required field'), 'Should show missing field error');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 17: tcgp deck validate detects duplicate cards
runTest('tcgp deck validate detects duplicate cards', () => {
  const tmpDir = '/tmp/tcgp-test-decks';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const deckPath = path.join(tmpDir, `test-deck-${Date.now()}.json`);
  const card = { id: 'dup-card', name: 'Duplicate Card', supertype: 'Pokémon', element: 'Grass', hp: 60 };
  const deck = [card, card, ...Array.from({ length: 18 }, (_, i) => ({
    id: `test-card-${i}`,
    name: `Test Card ${i}`,
    supertype: 'Pokémon',
    element: 'Grass',
    hp: 60
  }))];

  try {
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
    const { stdout, status } = execTcgp(['deck', 'validate', deckPath]);
    assert.notStrictEqual(status, 0, 'Should exit with non-zero code');
    assert(stdout.includes('Duplicate'), 'Should show duplicate card error');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Test 18: tcgp deck --help
runTest('tcgp deck --help', () => {
  const { stdout, status } = execTcgp(['deck', '--help']);
  assert.strictEqual(status, 0, 'Should exit with code 0');
  assert(stdout.includes('validate'), 'Should show validate subcommand');
  assert(stdout.includes('stats'), 'Should show stats subcommand');
});

// Test 19: tcgp help shows deck command
runTest('tcgp help shows deck command', () => {
  const { stdout, status } = execTcgp(['--json', 'help']);
  assert.strictEqual(status, 0, 'Should exit with code 0');
  const data = parseJson(stdout);
  assert(data, 'Should output valid JSON');
  const deckCmd = data.commands.find(cmd => cmd.name === 'deck');
  assert(deckCmd, 'Should include deck command');
  assert(deckCmd.description.includes('deck'), 'Should have deck description');
});

// Test 20: tcgp deck stats calculates correct averages
runTest('tcgp deck stats calculates correct averages', () => {
  const deckPath = createTestDeck(true);
  try {
    const { stdout, status } = execTcgp(['--json', 'deck', 'stats', deckPath]);
    assert.strictEqual(status, 0, 'Should exit with code 0');
    const data = parseJson(stdout);
    assert(data, 'Should output valid JSON');
    assert(data.hpDistribution, 'Should have HP distribution');
    assert(data.hpDistribution.min, 'Should have min HP');
    assert(data.hpDistribution.max, 'Should have max HP');
    assert(data.hpDistribution.avg, 'Should have avg HP');
    assert(data.hpDistribution.avg >= data.hpDistribution.min, 'Avg should be >= min');
    assert(data.hpDistribution.avg <= data.hpDistribution.max, 'Avg should be <= max');
  } finally {
    fs.unlinkSync(deckPath);
  }
});

// Clean up
cleanupTestDecks();

// Summary
console.log(`\nTest Summary:`);
console.log(`  Passed: ${testsPassed}`);
console.log(`  Failed: ${testsFailed}`);
console.log(`  Total:  ${testsPassed + testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);
