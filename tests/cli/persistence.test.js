/**
 * Tests for CLI persistence layer (CLI-003)
 * 
 * Tests that verify the storage, sessions, state, and events repositories work:
 * - Database initialization and migrations
 * - Session CRUD operations
 * - State CRUD operations
 * - Event logging and querying
 * - Cascade deletes
 * - Error handling with reason codes
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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
 * Generate a random UUID
 * @returns {string} UUID
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Get test database path
 * @returns {string} Path to test database
 */
function getTestDbPath() {
  const testDir = path.join(os.tmpdir(), 'tcgp-test-' + generateId());
  return path.join(testDir, 'tcgp.db');
}

/**
 * Clean up test database
 * @param {string} dbPath - Database path
 */
function cleanupTestDb(dbPath) {
  const dbDir = path.dirname(dbPath);
  if (fs.existsSync(dbDir)) {
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
}

/**
 * Set up test database and return database path
 */
function setupTestDatabase() {
  const testDbPath = getTestDbPath();
  const testDir = path.dirname(testDbPath);
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Set environment variable to use test database
  const originalDataHome = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = testDir;
  
  return {
    dbPath: testDbPath,
    cleanup: () => {
      process.env.XDG_DATA_HOME = originalDataHome;
      cleanupTestDb(testDbPath);
    }
  };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Storage Tests ===');

// AC1: Schema inicial creado con migración
runTest('AC1a: storage.initialize() creates database file', () => {
  const { cleanup } = setupTestDatabase();
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  assert(fs.existsSync(storage.getDatabasePath()), 'Database file should exist');
  
  cleanup();
});

runTest('AC1b: storage.initialize() creates sessions table', () => {
  const { cleanup } = setupTestDatabase();
  
  const storage = require('../../src/cli/services/storage');
  const db = storage.getDatabase();
  
  storage.runMigrations(db);
  
  // Verify table exists by querying it
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").all();
  assert.strictEqual(tables.length, 1, 'sessions table should exist');
  
  db.close();
  cleanup();
});

runTest('AC1c: storage.initialize() creates states table', () => {
  const { cleanup } = setupTestDatabase();
  
  const storage = require('../../src/cli/services/storage');
  const db = storage.getDatabase();
  
  storage.runMigrations(db);
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='states'").all();
  assert.strictEqual(tables.length, 1, 'states table should exist');
  
  db.close();
  cleanup();
});

runTest('AC1d: storage.initialize() creates events table', () => {
  const { cleanup } = setupTestDatabase();
  
  const storage = require('../../src/cli/services/storage');
  const db = storage.getDatabase();
  
  storage.runMigrations(db);
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").all();
  assert.strictEqual(tables.length, 1, 'events table should exist');
  
  db.close();
  cleanup();
});

runTest('AC1e: storage.initialize() creates indexes', () => {
  const { cleanup } = setupTestDatabase();
  
  const storage = require('../../src/cli/services/storage');
  const db = storage.getDatabase();
  
  storage.runMigrations(db);
  
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
  assert(indexes.length >= 4, 'Should have at least 4 indexes');
  
  db.close();
  cleanup();
});

runTest('AC1f: storage.initialize() sets schema version', () => {
  const { cleanup } = setupTestDatabase();
  
  const storage = require('../../src/cli/services/storage');
  const db = storage.getDatabase();
  
  storage.runMigrations(db);
  
  const version = db.prepare('SELECT value FROM metadata WHERE key = ?').get('schema_version');
  assert(version, 'Schema version should be set');
  assert.strictEqual(version.value, '1', 'Schema version should be 1');
  
  db.close();
  cleanup();
});

console.log('\n=== Sessions Repository Tests ===');

runTest('AC2a: sessions.create() creates a new session', () => {
  const { cleanup } = setupTestDatabase();
  
  // Clear module cache to ensure fresh instance
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  const session = sessions.create({
    id: generateId(),
    name: 'test-session',
    player1Deck: [{ id: 'card1', name: 'Pikachu' }],
    player2Deck: [{ id: 'card2', name: 'Charizard' }],
    metadata: { mode: 'quick' }
  });
  
  assert(session, 'Session should be created');
  assert.strictEqual(session.name, 'test-session', 'Session name should match');
  assert.strictEqual(session.status, 'active', 'Session status should be active');
  assert.deepStrictEqual(session.player1Deck, [{ id: 'card1', name: 'Pikachu' }], 'Player 1 deck should match');
  
  cleanup();
});

runTest('AC2b: sessions.get() retrieves a session by ID', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  const sessionId = generateId();
  const created = sessions.create({
    id: sessionId,
    name: 'test-session',
    player1Deck: [],
    player2Deck: []
  });
  
  const retrieved = sessions.get(sessionId);
  
  assert(retrieved, 'Session should be retrieved');
  assert.strictEqual(retrieved.id, sessionId, 'Session ID should match');
  assert.strictEqual(retrieved.name, 'test-session', 'Session name should match');
  
  cleanup();
});

runTest('AC2c: sessions.get() returns null for non-existent session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  const retrieved = sessions.get(generateId());
  
  assert.strictEqual(retrieved, null, 'Should return null for non-existent session');
  
  cleanup();
});

runTest('AC2d: sessions.getByName() retrieves a session by name', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  sessions.create({
    id: generateId(),
    name: 'my-session',
    player1Deck: [],
    player2Deck: []
  });
  
  const retrieved = sessions.getByName('my-session');
  
  assert(retrieved, 'Session should be retrieved');
  assert.strictEqual(retrieved.name, 'my-session', 'Session name should match');
  
  cleanup();
});

runTest('AC2e: sessions.list() returns all sessions', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  sessions.create({ id: generateId(), name: 'session-1', player1Deck: [], player2Deck: [] });
  sessions.create({ id: generateId(), name: 'session-2', player1Deck: [], player2Deck: [] });
  sessions.create({ id: generateId(), name: 'session-3', player1Deck: [], player2Deck: [] });
  
  const list = sessions.list();
  
  assert.strictEqual(list.length, 3, 'Should return 3 sessions');
  
  cleanup();
});

runTest('AC2f: sessions.list() filters by status', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  const id1 = generateId();
  const id2 = generateId();
  sessions.create({ id: id1, name: 'session-1', player1Deck: [], player2Deck: [] });
  sessions.create({ id: id2, name: 'session-2', player1Deck: [], player2Deck: [] });
  sessions.update(id1, { status: 'completed' });
  
  const activeList = sessions.list({ status: 'active' });
  const completedList = sessions.list({ status: 'completed' });
  
  assert.strictEqual(activeList.length, 1, 'Should return 1 active session');
  assert.strictEqual(completedList.length, 1, 'Should return 1 completed session');
  
  cleanup();
});

runTest('AC2g: sessions.update() updates session fields', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  const sessionId = generateId();
  sessions.create({
    id: sessionId,
    name: 'original-name',
    player1Deck: [],
    player2Deck: []
  });
  
  const updated = sessions.update(sessionId, {
    name: 'updated-name',
    status: 'completed',
    metadata: { winner: 'player1' }
  });
  
  assert(updated, 'Session should be updated');
  assert.strictEqual(updated.name, 'updated-name', 'Name should be updated');
  assert.strictEqual(updated.status, 'completed', 'Status should be updated');
  assert.deepStrictEqual(updated.metadata, { winner: 'player1' }, 'Metadata should be updated');
  
  cleanup();
});

runTest('AC2h: sessions.delete() deletes a session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  const sessionId = generateId();
  sessions.create({
    id: sessionId,
    name: 'test-session',
    player1Deck: [],
    player2Deck: []
  });
  
  const deleted = sessions.delete(sessionId);
  
  assert.strictEqual(deleted, true, 'Should return true for successful deletion');
  
  const retrieved = sessions.get(sessionId);
  assert.strictEqual(retrieved, null, 'Session should be deleted');
  
  cleanup();
});

runTest('AC2i: sessions.create() enforces unique session names', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  
  sessions.create({
    id: generateId(),
    name: 'unique-name',
    player1Deck: [],
    player2Deck: []
  });
  
  try {
    sessions.create({
      id: generateId(),
      name: 'unique-name',
      player1Deck: [],
      player2Deck: []
    });
    assert.fail('Should throw error for duplicate name');
  } catch (error) {
    assert(error.message.includes('already exists'), 'Error should mention duplicate name');
    assert.strictEqual(error.cause, 'SESSION_NAME_EXISTS', 'Error should have correct cause code');
  }
  
  cleanup();
});

console.log('\n=== State Repository Tests ===');

runTest('AC3a: state.save() saves a game state', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  const stateData = {
    players: {
      player1: { hand: ['card1'] },
      player2: { hand: ['card2'] }
    },
    turnNumber: 0,
    phase: 'draw',
    currentPlayer: 'player1'
  };
  
  const saved = state.save({
    sessionId,
    turnNumber: 0,
    phase: 'draw',
    currentPlayer: 'player1',
    stateData
  });
  
  assert(saved, 'State should be saved');
  assert.strictEqual(saved.sessionId, sessionId, 'Session ID should match');
  assert.strictEqual(saved.turnNumber, 0, 'Turn number should match');
  assert.deepStrictEqual(saved.stateData, stateData, 'State data should match');
  
  cleanup();
});

runTest('AC3b: state.getLatest() retrieves latest state for session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  state.save({ sessionId, turnNumber: 0, phase: 'draw', currentPlayer: 'player1', stateData: { turn: 0 } });
  state.save({ sessionId, turnNumber: 1, phase: 'main', currentPlayer: 'player2', stateData: { turn: 1 } });
  state.save({ sessionId, turnNumber: 2, phase: 'attack', currentPlayer: 'player1', stateData: { turn: 2 } });
  
  const latest = state.getLatest(sessionId);
  
  assert(latest, 'Latest state should be retrieved');
  assert.strictEqual(latest.turnNumber, 2, 'Should retrieve the latest turn');
  
  cleanup();
});

runTest('AC3c: state.getByTurn() retrieves state for specific turn', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  state.save({ sessionId, turnNumber: 0, phase: 'draw', currentPlayer: 'player1', stateData: { turn: 0 } });
  state.save({ sessionId, turnNumber: 1, phase: 'main', currentPlayer: 'player2', stateData: { turn: 1 } });
  state.save({ sessionId, turnNumber: 2, phase: 'attack', currentPlayer: 'player1', stateData: { turn: 2 } });
  
  const turn1State = state.getByTurn(sessionId, 1);
  
  assert(turn1State, 'State should be retrieved');
  assert.strictEqual(turn1State.turnNumber, 1, 'Should retrieve turn 1');
  
  cleanup();
});

runTest('AC3d: state.list() retrieves all states for session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  state.save({ sessionId, turnNumber: 0, phase: 'draw', currentPlayer: 'player1', stateData: { turn: 0 } });
  state.save({ sessionId, turnNumber: 1, phase: 'main', currentPlayer: 'player2', stateData: { turn: 1 } });
  state.save({ sessionId, turnNumber: 2, phase: 'attack', currentPlayer: 'player1', stateData: { turn: 2 } });
  
  const states = state.list(sessionId);
  
  assert.strictEqual(states.length, 3, 'Should retrieve 3 states');
  assert.strictEqual(states[0].turnNumber, 0, 'Should be ordered by turn');
  assert.strictEqual(states[1].turnNumber, 1, 'Should be ordered by turn');
  assert.strictEqual(states[2].turnNumber, 2, 'Should be ordered by turn');
  
  cleanup();
});

runTest('AC3e: state.list() supports turn range filtering', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  for (let i = 0; i < 10; i++) {
    state.save({ sessionId, turnNumber: i, phase: 'draw', currentPlayer: 'player1', stateData: { turn: i } });
  }
  
  const filtered = state.list(sessionId, { fromTurn: 3, toTurn: 6 });
  
  assert.strictEqual(filtered.length, 4, 'Should retrieve 4 states (turns 3-6)');
  assert.strictEqual(filtered[0].turnNumber, 3, 'Should start at turn 3');
  assert.strictEqual(filtered[3].turnNumber, 6, 'Should end at turn 6');
  
  cleanup();
});

runTest('AC3f: state.deleteBySession() deletes all states for session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  state.save({ sessionId, turnNumber: 0, phase: 'draw', currentPlayer: 'player1', stateData: { turn: 0 } });
  state.save({ sessionId, turnNumber: 1, phase: 'main', currentPlayer: 'player2', stateData: { turn: 1 } });
  
  const deletedCount = state.deleteBySession(sessionId);
  
  assert.strictEqual(deletedCount, 2, 'Should delete 2 states');
  
  const remaining = state.list(sessionId);
  assert.strictEqual(remaining.length, 0, 'No states should remain');
  
  cleanup();
});

console.log('\n=== Events Repository Tests ===');

runTest('AC4a: events.log() logs an event', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  const eventData = {
    type: 'draw',
    player: 'player1',
    card: { id: 'card1', name: 'Pikachu' }
  };
  
  const logged = events.log({
    sessionId,
    eventType: 'draw',
    eventData,
    turnNumber: 1
  });
  
  assert(logged, 'Event should be logged');
  assert.strictEqual(logged.sessionId, sessionId, 'Session ID should match');
  assert.strictEqual(logged.eventType, 'draw', 'Event type should match');
  assert.strictEqual(logged.turnNumber, 1, 'Turn number should match');
  assert.deepStrictEqual(logged.eventData, eventData, 'Event data should match');
  
  cleanup();
});

runTest('AC4b: events.log() works without turn number', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  const logged = events.log({
    sessionId,
    eventType: 'session_start',
    eventData: { mode: 'quick' }
  });
  
  assert(logged, 'Event should be logged');
  assert.strictEqual(logged.turnNumber, null, 'Turn number should be null');
  
  cleanup();
});

runTest('AC4c: events.list() retrieves all events for session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card1' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'play', eventData: { card: 'card2' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'attack', eventData: { damage: 30 }, turnNumber: 1 });
  
  const eventList = events.list(sessionId);
  
  assert.strictEqual(eventList.length, 3, 'Should retrieve 3 events');
  
  cleanup();
});

runTest('AC4d: events.getByTurn() retrieves events for specific turn', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card1' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'play', eventData: { card: 'card2' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card3' }, turnNumber: 2 });
  
  const turn1Events = events.getByTurn(sessionId, 1);
  
  assert.strictEqual(turn1Events.length, 2, 'Should retrieve 2 events for turn 1');
  
  cleanup();
});

runTest('AC4e: events.getByType() retrieves events by type', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card1' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'play', eventData: { card: 'card2' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card3' }, turnNumber: 2 });
  
  const drawEvents = events.getByType(sessionId, 'draw');
  
  assert.strictEqual(drawEvents.length, 2, 'Should retrieve 2 draw events');
  
  cleanup();
});

runTest('AC4f: events.count() counts events for session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card1' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card2' }, turnNumber: 2 });
  events.log({ sessionId, eventType: 'play', eventData: { card: 'card3' }, turnNumber: 2 });
  
  const totalCount = events.count(sessionId);
  const drawCount = events.count(sessionId, { eventType: 'draw' });
  const playCount = events.count(sessionId, { eventType: 'play' });
  
  assert.strictEqual(totalCount, 3, 'Should count 3 total events');
  assert.strictEqual(drawCount, 2, 'Should count 2 draw events');
  assert.strictEqual(playCount, 1, 'Should count 1 play event');
  
  cleanup();
});

runTest('AC4g: events.deleteBySession() deletes all events for session', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card1' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'play', eventData: { card: 'card2' }, turnNumber: 1 });
  
  const deletedCount = events.deleteBySession(sessionId);
  
  assert.strictEqual(deletedCount, 2, 'Should delete 2 events');
  
  const remaining = events.list(sessionId);
  assert.strictEqual(remaining.length, 0, 'No events should remain');
  
  cleanup();
});

console.log('\n=== Cascade Delete Tests ===');

runTest('AC5a: Deleting a session cascades to states', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/state')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const state = require('../../src/cli/services/state');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  state.save({ sessionId, turnNumber: 0, phase: 'draw', currentPlayer: 'player1', stateData: {} });
  state.save({ sessionId, turnNumber: 1, phase: 'main', currentPlayer: 'player2', stateData: {} });
  
  sessions.delete(sessionId);
  
  const remainingStates = state.list(sessionId);
  assert.strictEqual(remainingStates.length, 0, 'States should be cascade deleted');
  
  cleanup();
});

runTest('AC5b: Deleting a session cascades to events', () => {
  const { cleanup } = setupTestDatabase();
  
  delete require.cache[require.resolve('../../src/cli/services/storage')];
  delete require.cache[require.resolve('../../src/cli/services/sessions')];
  delete require.cache[require.resolve('../../src/cli/services/events')];
  
  const storage = require('../../src/cli/services/storage');
  storage.initialize();
  
  const sessions = require('../../src/cli/services/sessions');
  const events = require('../../src/cli/services/events');
  
  const sessionId = generateId();
  sessions.create({ id: sessionId, name: 'test-session', player1Deck: [], player2Deck: [] });
  events.log({ sessionId, eventType: 'draw', eventData: { card: 'card1' }, turnNumber: 1 });
  events.log({ sessionId, eventType: 'play', eventData: { card: 'card2' }, turnNumber: 1 });
  
  sessions.delete(sessionId);
  
  const remainingEvents = events.list(sessionId);
  assert.strictEqual(remainingEvents.length, 0, 'Events should be cascade deleted');
  
  cleanup();
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
