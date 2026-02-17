/**
 * Storage Service - Database persistence for tcgp CLI
 * 
 * Uses SQLite for persistent storage of sessions, game state, and events.
 * Database stored in ~/.tcgp/tcgp.db by default.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const os = require('os');

let isInitialized = false;

/**
 * Get the data directory path
 * @returns {string} Path to data directory
 */
function getDataDir() {
  // Use XDG_DATA_HOME if set, otherwise ~/.local/share
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return path.join(xdgDataHome, 'tcgp');
  }
  // Fallback to home directory
  return path.join(os.homedir(), '.tcgp');
}

/**
 * Get the database file path
 * @returns {string} Path to database file
 */
function getDatabasePath() {
  return path.join(getDataDir(), 'tcgp.db');
}

/**
 * Ensure data directory exists
 * @throws {Error} If directory cannot be created
 */
function ensureDataDir() {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Get database connection (synchronous)
 * @returns {Database} SQLite database connection
 */
function getDatabase() {
  const dbPath = getDatabasePath();
  ensureDataDir();
  return new DatabaseSync(dbPath);
}

/**
 * Run database migrations
 * @param {Database} db - Database connection
 * @throws {Error} If migration fails
 */
function runMigrations(db) {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');
  
  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      player1_deck TEXT,
      player2_deck TEXT,
      metadata TEXT,
      UNIQUE(name)
    );
  `);
  
  // Create states table
  db.exec(`
    CREATE TABLE IF NOT EXISTS states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      phase TEXT NOT NULL,
      current_player TEXT NOT NULL,
      state_data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  
  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT NOT NULL,
      turn_number INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  // Create snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      label TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      phase TEXT NOT NULL,
      current_player TEXT NOT NULL,
      state_data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(session_id, label),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_states_session_turn ON states(session_id, turn_number);
    CREATE INDEX IF NOT EXISTS idx_events_session_turn ON events(session_id, turn_number);
    CREATE INDEX IF NOT EXISTS idx_events_session_type ON events(session_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_session_label ON snapshots(session_id, label);
  `);
  
  // Create metadata table for tracking schema version
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  
  // Insert schema version if not exists
  const version = db.prepare('SELECT value FROM metadata WHERE key = ?').get('schema_version');
  if (!version) {
    db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('schema_version', '1');
  }
}

/**
 * Initialize database (run migrations)
 * @throws {Error} If initialization fails
 */
function initialize() {
  // Prevent re-initialization
  if (isInitialized) {
    return;
  }

  const dbPath = getDatabasePath();
  ensureDataDir();
  const db = new DatabaseSync(dbPath);
  try {
    runMigrations(db);
    isInitialized = true;
  } finally {
    db.close();
  }
}

/**
 * Force re-initialization (for testing)
 */
function forceInitialize() {
  isInitialized = false;
  return initialize();
}

/**
 * Export storage service API
 */
module.exports = {
  getDataDir,
  getDatabasePath,
  getDatabase,
  runMigrations,
  initialize,
  forceInitialize
};
