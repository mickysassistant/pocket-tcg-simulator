/**
 * Sessions Repository - Manages game sessions in the database
 */

const storage = require('./storage');

/**
 * Create a new session
 * @param {Object} sessionData - Session data
 * @param {string} sessionData.id - Session UUID
 * @param {string} sessionData.name - Session name
 * @param {Object} sessionData.player1Deck - Player 1 deck
 * @param {Object} sessionData.player2Deck - Player 2 deck
 * @param {Object} sessionData.metadata - Additional metadata
 * @returns {Object} Created session
 */
function create({ id, name, player1Deck, player2Deck, metadata }) {
  const db = storage.getDatabase();
  try {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, name, created_at, updated_at, status, player1_deck, player2_deck, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      name,
      now,
      now,
      'active',
      player1Deck ? JSON.stringify(player1Deck) : null,
      player2Deck ? JSON.stringify(player2Deck) : null,
      metadata ? JSON.stringify(metadata) : null
    );
    
    return get(id);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Session name "${name}" already exists`, {
        cause: 'SESSION_NAME_EXISTS'
      });
    }
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Get a session by ID
 * @param {string} id - Session ID
 * @returns {Object|null} Session or null if not found
 */
function get(id) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!row) return null;
    
    return deserializeSession(row);
  } finally {
    db.close();
  }
}

/**
 * Get a session by name
 * @param {string} name - Session name
 * @returns {Object|null} Session or null if not found
 */
function getByName(name) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare('SELECT * FROM sessions WHERE name = ?').get(name);
    if (!row) return null;
    
    return deserializeSession(row);
  } finally {
    db.close();
  }
}

/**
 * List all sessions
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status (active, completed, etc.)
 * @returns {Array} List of sessions
 */
function list({ status } = {}) {
  const db = storage.getDatabase();
  try {
    let query = 'SELECT * FROM sessions';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rows = db.prepare(query).all(...params);
    return rows.map(deserializeSession);
  } finally {
    db.close();
  }
}

/**
 * Update a session
 * @param {string} id - Session ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated session or null if not found
 */
function update(id, updates) {
  const db = storage.getDatabase();
  try {
    const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!existing) return null;
    
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    const query = `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
    
    return get(id);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      throw new Error(`Session name "${updates.name}" already exists`, {
        cause: 'SESSION_NAME_EXISTS'
      });
    }
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Delete a session
 * @param {string} id - Session ID
 * @returns {boolean} True if deleted, false if not found
 */
function deleteSession(id) {
  const db = storage.getDatabase();
  try {
    const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

/**
 * Deserialize a session row from database
 * @private
 */
function deserializeSession(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    player1Deck: row.player1_deck ? JSON.parse(row.player1_deck) : null,
    player2Deck: row.player2_deck ? JSON.parse(row.player2_deck) : null,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  };
}

/**
 * Export sessions repository API
 */
module.exports = {
  create,
  get,
  getByName,
  list,
  update,
  delete: deleteSession
};
