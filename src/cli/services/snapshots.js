/**
 * Snapshots Repository - Manages labeled game state snapshots in the database
 */

const storage = require('./storage');

// Ensure database is initialized on module load
storage.initialize();

/**
 * Save a labeled snapshot of the current game state
 * @param {Object} snapshotData - Snapshot data
 * @param {string} snapshotData.sessionId - Session ID
 * @param {string} snapshotData.label - Snapshot label
 * @param {number} snapshotData.turnNumber - Turn number
 * @param {string} snapshotData.phase - Game phase
 * @param {string} snapshotData.currentPlayer - Current player
 * @param {Object} snapshotData.stateData - Full game state data
 * @returns {Object} Created snapshot record
 */
function save({ sessionId, label, turnNumber, phase, currentPlayer, stateData }) {
  const db = storage.getDatabase();
  try {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO snapshots (session_id, label, turn_number, phase, current_player, state_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      sessionId,
      label,
      turnNumber,
      phase,
      currentPlayer,
      JSON.stringify(stateData),
      now
    );

    return getById(result.lastInsertRowid);
  } finally {
    db.close();
  }
}

/**
 * Get a snapshot record by ID
 * @param {number} id - Snapshot record ID
 * @returns {Object|null} Snapshot record or null if not found
 */
function getById(id) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id);
    if (!row) return null;

    return deserializeSnapshot(row);
  } finally {
    db.close();
  }
}

/**
 * Get a snapshot by session and label
 * @param {string} sessionId - Session ID
 * @param {string} label - Snapshot label
 * @returns {Object|null} Snapshot record or null if not found
 */
function getByLabel(sessionId, label) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare(`
      SELECT * FROM snapshots
      WHERE session_id = ? AND label = ?
    `).get(sessionId, label);

    if (!row) return null;

    return deserializeSnapshot(row);
  } finally {
    db.close();
  }
}

/**
 * List all snapshots for a session
 * @param {string} sessionId - Session ID
 * @returns {Array} List of snapshot records
 */
function list(sessionId) {
  const db = storage.getDatabase();
  try {
    const rows = db.prepare(`
      SELECT * FROM snapshots
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    return rows.map(deserializeSnapshot);
  } finally {
    db.close();
  }
}

/**
 * Delete a snapshot by ID
 * @param {number} id - Snapshot record ID
 * @returns {boolean} True if deleted, false if not found
 */
function deleteById(id) {
  const db = storage.getDatabase();
  try {
    const result = db.prepare('DELETE FROM snapshots WHERE id = ?').run(id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

/**
 * Delete a snapshot by session and label
 * @param {string} sessionId - Session ID
 * @param {string} label - Snapshot label
 * @returns {boolean} True if deleted, false if not found
 */
function deleteByLabel(sessionId, label) {
  const db = storage.getDatabase();
  try {
    const result = db.prepare(`
      DELETE FROM snapshots
      WHERE session_id = ? AND label = ?
    `).run(sessionId, label);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

/**
 * Delete all snapshots for a session
 * @param {string} sessionId - Session ID
 * @returns {number} Number of snapshots deleted
 */
function deleteBySession(sessionId) {
  const db = storage.getDatabase();
  try {
    const result = db.prepare('DELETE FROM snapshots WHERE session_id = ?').run(sessionId);
    return result.changes;
  } finally {
    db.close();
  }
}

/**
 * Deserialize a snapshot row from database
 * @private
 */
function deserializeSnapshot(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    label: row.label,
    turnNumber: row.turn_number,
    phase: row.phase,
    currentPlayer: row.current_player,
    stateData: JSON.parse(row.state_data),
    createdAt: row.created_at
  };
}

/**
 * Export snapshots repository API
 */
module.exports = {
  save,
  getById,
  getByLabel,
  list,
  deleteById,
  deleteByLabel,
  deleteBySession
};
