/**
 * State Repository - Manages game state snapshots in the database
 */

const storage = require('./storage');

/**
 * Save a game state snapshot
 * @param {Object} stateData - State data
 * @param {string} stateData.sessionId - Session ID
 * @param {number} stateData.turnNumber - Turn number
 * @param {string} stateData.phase - Game phase
 * @param {string} stateData.currentPlayer - Current player
 * @param {Object} stateData.stateData - Full game state data
 * @returns {Object} Created state record
 */
function save({ sessionId, turnNumber, phase, currentPlayer, stateData }) {
  const db = storage.getDatabase();
  try {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO states (session_id, turn_number, phase, current_player, state_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      sessionId,
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
 * Get a state record by ID
 * @param {number} id - State record ID
 * @returns {Object|null} State record or null if not found
 */
function getById(id) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare('SELECT * FROM states WHERE id = ?').get(id);
    if (!row) return null;
    
    return deserializeState(row);
  } finally {
    db.close();
  }
}

/**
 * Get the latest state for a session
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Latest state record or null if not found
 */
function getLatest(sessionId) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare(`
      SELECT * FROM states
      WHERE session_id = ?
      ORDER BY turn_number DESC, id DESC
      LIMIT 1
    `).get(sessionId);
    
    if (!row) return null;
    
    return deserializeState(row);
  } finally {
    db.close();
  }
}

/**
 * Get a state for a specific turn
 * @param {string} sessionId - Session ID
 * @param {number} turnNumber - Turn number
 * @returns {Object|null} State record or null if not found
 */
function getByTurn(sessionId, turnNumber) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare(`
      SELECT * FROM states
      WHERE session_id = ? AND turn_number = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(sessionId, turnNumber);
    
    if (!row) return null;
    
    return deserializeState(row);
  } finally {
    db.close();
  }
}

/**
 * List all states for a session
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @param {number} options.fromTurn - Starting turn number
 * @param {number} options.toTurn - Ending turn number
 * @param {number} options.limit - Maximum number of states to return
 * @returns {Array} List of state records
 */
function list(sessionId, { fromTurn, toTurn, limit } = {}) {
  const db = storage.getDatabase();
  try {
    let query = 'SELECT * FROM states WHERE session_id = ?';
    const params = [sessionId];
    
    if (fromTurn !== undefined) {
      query += ' AND turn_number >= ?';
      params.push(fromTurn);
    }
    
    if (toTurn !== undefined) {
      query += ' AND turn_number <= ?';
      params.push(toTurn);
    }
    
    query += ' ORDER BY turn_number ASC, id ASC';
    
    if (limit !== undefined) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    const rows = db.prepare(query).all(...params);
    return rows.map(deserializeState);
  } finally {
    db.close();
  }
}

/**
 * Delete all states for a session
 * @param {string} sessionId - Session ID
 * @returns {number} Number of states deleted
 */
function deleteBySession(sessionId) {
  const db = storage.getDatabase();
  try {
    const result = db.prepare('DELETE FROM states WHERE session_id = ?').run(sessionId);
    return result.changes;
  } finally {
    db.close();
  }
}

/**
 * Deserialize a state row from database
 * @private
 */
function deserializeState(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnNumber: row.turn_number,
    phase: row.phase,
    currentPlayer: row.current_player,
    stateData: JSON.parse(row.state_data),
    createdAt: row.created_at
  };
}

/**
 * Export state repository API
 */
module.exports = {
  save,
  getById,
  getLatest,
  getByTurn,
  list,
  deleteBySession
};
