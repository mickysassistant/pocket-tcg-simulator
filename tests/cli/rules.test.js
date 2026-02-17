/**
 * Tests for CLI-011: Rules check helper
 *
 * Tests the `tcgp rules check-action` command functionality
 */

const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

// Use a test database in a temporary directory
// XDG_DATA_HOME should point to parent directory, storage service adds /tcgp
const testBaseDir = `/tmp/tcgp-test-${crypto.randomUUID()}`;
process.env.XDG_DATA_HOME = testBaseDir;

// The actual test data directory where the database will be created
const testDir = path.join(testBaseDir, 'tcgp');

// Import services for test setup
const storage = require('../../src/cli/services/storage');
const sessions = require('../../src/cli/services/sessions');
const state = require('../../src/cli/services/state');

/**
 * Run a CLI command and return output
 */
async function runCommand(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['bin/tcgp', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, XDG_DATA_HOME: testBaseDir }
    });
    let stdout = '';
    let stderr = '';
    let exitCode = null;

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      exitCode = code;
      resolve({ stdout, stderr, exitCode });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Parse JSON output from CLI
 */
function parseJsonOutput(stdout) {
  if (!stdout || stdout.trim() === '') return null;

  try {
    // First try to parse the entire output as JSON
    const trimmed = stdout.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }

    // If not, look for JSON lines
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (lineTrimmed.startsWith('{') || lineTrimmed.startsWith('[')) {
        return JSON.parse(lineTrimmed);
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to parse JSON:', error.message);
    console.error('Output was:', stdout);
    return null;
  }
}

/**
 * Setup test database and create a test session
 */
async function setupTestSession(sessionName = null) {
  // Create test directory
  fs.mkdirSync(testDir, { recursive: true });

  // Force re-initialize storage (for clean state)
  await storage.forceInitialize();

  // Create test session
  const testDeck = Array.from({ length: 20 }, (_, i) => ({
    id: `card-${i}`,
    name: `Test Card ${i}`,
    type: 'pokemon',
    hp: 60,
    stage: 'basic'
  }));

  const sessionId = uuidv4();
  const name = sessionName || `test-session-${sessionId}`;

  const session = await sessions.create({
    id: sessionId,
    name,
    player1Deck: testDeck,
    player2Deck: testDeck,
    metadata: { seed: 'test-seed' }
  });

  // Create initial state
  const gameState = {
    turnNumber: 1,
    phase: 'main',
    currentPlayer: 'player1',
    players: {
      player1: {
        deck: Array.from({ length: 8 }, (_, i) => ({ id: `deck1-${i}`, name: `Card ${i}` })),
        hand: Array.from({ length: 5 }, (_, i) => ({ id: `hand1-${i}`, name: `Hand ${i}` })),
        bench: [
          { id: 'p1', name: 'Bulbasaur', stage: 'basic', hp: 60, attachedEnergy: 0, turnPlayed: 1 }
        ],
        activePokemon: { id: 'active1', name: 'Charmander', stage: 'basic', hp: 60, attachedEnergy: 1, turnPlayed: 1 },
        energyZone: Array.from({ length: 2 }, (_, i) => ({ id: `energy1-${i}`, name: `Energy ${i}` })),
        supporterPlayedThisTurn: false
      },
      player2: {
        deck: Array.from({ length: 15 }, (_, i) => ({ id: `deck2-${i}`, name: `Card ${i}` })),
        hand: Array.from({ length: 5 }, (_, i) => ({ id: `hand2-${i}`, name: `Hand ${i}` })),
        bench: [],
        activePokemon: { id: 'active2', name: 'Squirtle', stage: 'basic', hp: 60, attachedEnergy: 0, turnPlayed: 1 },
        energyZone: [],
        supporterPlayedThisTurn: false
      }
    }
  };

  await state.save({
    sessionId: session.id,
    turnNumber: gameState.turnNumber,
    phase: gameState.phase,
    currentPlayer: gameState.currentPlayer,
    stateData: gameState
  });

  return session;
}

/**
 * Clean up test database
 */
async function cleanup() {
  // Clear module cache for storage
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];

  // Remove test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// Test suite
async function runTests() {
  console.log('Running CLI-011 rules tests...\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: '1. rules check-action shows help',
      test: async () => {
        const { stdout, exitCode } = await runCommand(['rules', '--help']);
        assert.strictEqual(exitCode, 0);
        assert.ok(stdout.includes('check-action'), 'Help should mention check-action subcommand');
        assert.ok(stdout.includes('session'), 'Help should mention session argument');
        assert.ok(stdout.includes('actionId'), 'Help should mention actionId argument');
      }
    },

    {
      name: '2. rules check-action without subcommand shows error',
      test: async () => {
        const { stdout, exitCode } = await runCommand(['rules', '--json']);
        assert.strictEqual(exitCode, 1);
        const output = parseJsonOutput(stdout);
        assert.notStrictEqual(output, null, 'Output should be parseable JSON');
        assert.strictEqual(output.reason, 'MISSING_SUBCOMMAND');
        assert.ok(output.subcommands.includes('check-action'));
      }
    },

    {
      name: '3. rules check-action with unknown subcommand shows error',
      test: async () => {
        const { stdout, exitCode } = await runCommand(['rules', 'unknown', '--json']);
        assert.strictEqual(exitCode, 1);
        const output = parseJsonOutput(stdout);
        assert.notStrictEqual(output, null, 'Output should be parseable JSON');
        assert.strictEqual(output.reason, 'UNKNOWN_SUBCOMMAND');
      }
    },

    {
      name: '4. rules check-action without session shows error',
      test: async () => {
        const { stdout, exitCode } = await runCommand(['rules', 'check-action', '--json']);
        assert.strictEqual(exitCode, 1);
        const output = parseJsonOutput(stdout);
        assert.notStrictEqual(output, null, 'Output should be parseable JSON');
        assert.strictEqual(output.reason, 'MISSING_ARGUMENT');
      }
    },

    {
      name: '5. rules check-action with unknown session shows error',
      test: async () => {
        await setupTestSession();
        try {
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', 'unknown-session', 'draw', '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.reason, 'SESSION_NOT_FOUND');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '6. rules check-action without actionId shows error',
      test: async () => {
        const session = await setupTestSession();
        try {
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.reason, 'MISSING_ARGUMENT');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '7. rules check-action with valid draw action returns valid',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', count: 2 });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'draw', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.actionId, 'draw');
          assert.strictEqual(output.sessionId, session.id);
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '8. rules check-action detects invalid draw count (deck insufficient)',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', count: 10 });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'draw', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('deck'), 'Message should mention deck');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '9. rules check-action detects hand limit exceeded',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', count: 10 });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'draw', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('Hand limit'), 'Message should mention hand limit');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '10. rules check-action with valid attach_energy returns valid',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', targetPokemonId: 'p1' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'attach_energy', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.actionId, 'attach_energy');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '11. rules check-action detects no energy in energy zone',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player2', targetPokemonId: 'active2' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'attach_energy', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('Energy Zone'), 'Message should mention Energy Zone');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '12. rules check-action detects unknown target Pokemon',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', targetPokemonId: 'unknown-pokemon' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'attach_energy', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('not found'), 'Message should mention Pokemon not found');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '13. rules check-action with valid evolve returns valid',
      test: async () => {
        const session = await setupTestSession();
        try {
          // Create a Pokemon that wasn't played this turn for valid evolve
          const latestState = await state.getLatest(session.id);
          latestState.stateData.players.player1.bench[0].turnPlayed = 0; // Not played this turn
          await state.save({
            sessionId: session.id,
            turnNumber: latestState.stateData.turnNumber,
            phase: latestState.stateData.phase,
            currentPlayer: latestState.stateData.currentPlayer,
            stateData: latestState.stateData
          });

          const payload = JSON.stringify({
            playerId: 'player1',
            pokemonId: 'p1',
            evolutionCard: { id: 'hand1-0', name: 'Ivysaur', stage: 'stage1', hp: 90 }
          });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'evolve', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.actionId, 'evolve');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '14. rules check-action detects evolution card not in hand',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({
            playerId: 'player1',
            pokemonId: 'p1',
            evolutionCard: { id: 'not-in-hand', name: 'Venusaur', stage: 'stage2', hp: 160 }
          });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'evolve', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('hand'), 'Message should mention hand');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '15. rules check-action detects invalid stage progression',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({
            playerId: 'player1',
            pokemonId: 'p1',
            evolutionCard: { id: 'e1', name: 'Venusaur', stage: 'stage2', hp: 160 }
          });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'evolve', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('must evolve'), 'Message should mention valid evolution path');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '16. rules check-action detects Pokemon played same turn',
      test: async () => {
        const session = await setupTestSession();
        try {
          // Pokemon p1 has turnPlayed: 1, and gameState turnNumber is 1
          const payload = JSON.stringify({
            playerId: 'player1',
            pokemonId: 'p1',
            evolutionCard: { id: 'hand1-0', name: 'Ivysaur', stage: 'stage1', hp: 90 }
          });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'evolve', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('played this turn'), 'Message should mention turn played restriction');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '17. rules check-action with valid play_supporter returns valid',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({
            playerId: 'player1',
            card: { id: 'hand1-0', name: 'Professor\'s Research' }
          });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'play_supporter', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.actionId, 'play_supporter');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '18. rules check-action detects supporter already played this turn',
      test: async () => {
        const session = await setupTestSession();
        try {
          // Modify state to set supporterPlayedThisTurn to true
          const latestState = await state.getLatest(session.id);
          latestState.stateData.players.player1.supporterPlayedThisTurn = true;
          await state.save({
            sessionId: session.id,
            turnNumber: latestState.stateData.turnNumber,
            phase: latestState.stateData.phase,
            currentPlayer: latestState.stateData.currentPlayer,
            stateData: latestState.stateData
          });

          const payload = JSON.stringify({
            playerId: 'player1',
            card: { id: 'hand1-0', name: 'Professor\'s Research' }
          });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'play_supporter', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('Supporter this turn'), 'Message should mention supporter limit');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '19. rules check-action with valid end_turn returns valid',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'end_turn', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.actionId, 'end_turn');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '20. rules check-action detects wrong player ending turn',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player2' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'end_turn', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('not player2\'s turn'), 'Message should mention current turn');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '21. rules check-action with valid start_turn returns valid',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player2' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'start_turn', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.actionId, 'start_turn');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '22. rules check-action detects starting turn for current player',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1' });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'start_turn', payload, '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, false);
          assert.strictEqual(output.reason, 'RULE_VIOLATION');
          assert.ok(output.message.includes('already'), 'Message should mention already current turn');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '23. rules check-action with --json output',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', count: 2 });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'draw', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = JSON.parse(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.sessionId, session.id);
          assert.strictEqual(output.actionId, 'draw');
          assert.ok(output.reason === null);
          assert.ok(output.message === null);
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '24. rules check-action with invalid JSON payload shows error',
      test: async () => {
        const session = await setupTestSession();
        try {
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.name, 'draw', '{invalid}', '--json']);
          assert.strictEqual(exitCode, 1);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.reason, 'INVALID_JSON');
        } finally {
          await cleanup();
        }
      }
    },

    {
      name: '25. rules check-action handles session lookup by ID',
      test: async () => {
        const session = await setupTestSession();
        try {
          const payload = JSON.stringify({ playerId: 'player1', count: 2 });
          const { stdout, exitCode } = await runCommand(['rules', 'check-action', session.id, 'draw', payload, '--json']);
          assert.strictEqual(exitCode, 0);
          const output = parseJsonOutput(stdout);
          assert.strictEqual(output.valid, true);
          assert.strictEqual(output.sessionId, session.id);
        } finally {
          await cleanup();
        }
      }
    }
  ];

  for (const test of tests) {
    try {
      await test.test();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${test.name}`);
      console.log(`  Error: ${error.message}`);
      if (error.stack && process.env.DEBUG) {
        console.log(error.stack);
      }
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
