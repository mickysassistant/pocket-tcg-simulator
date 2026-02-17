/**
 * Events Repository - Manages game events in the database
 */

const storage = require('./storage');

/**
 * Log an event
 * @param {Object} eventData - Event data
 * @param {string} eventData.sessionId - Session ID
 * @param {string} eventData.eventType - Event type (e.g., 'draw', 'attack', 'evolution')
 * @param {Object} eventData.eventData - Event-specific data
 * @param {number} eventData.turnNumber - Turn number (optional)
 * @returns {Object} Created event record
 */
function log({ sessionId, eventType, eventData, turnNumber }) {
  const db = storage.getDatabase();
  try {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO events (session_id, event_type, event_data, turn_number, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      sessionId,
      eventType,
      JSON.stringify(eventData),
      turnNumber || null,
      now
    );
    
    return getById(result.lastInsertRowid);
  } finally {
    db.close();
  }
}

/**
 * Get an event record by ID
 * @param {number} id - Event record ID
 * @returns {Object|null} Event record or null if not found
 */
function getById(id) {
  const db = storage.getDatabase();
  try {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!row) return null;
    
    return deserializeEvent(row);
  } finally {
    db.close();
  }
}

/**
 * List events for a session
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @param {string} options.eventType - Filter by event type
 * @param {number} options.fromTurn - Starting turn number
 * @param {number} options.toTurn - Ending turn number
 * @param {number} options.limit - Maximum number of events to return
 * @param {number} options.offset - Number of events to skip
 * @returns {Array} List of event records
 */
function list(sessionId, { eventType, fromTurn, toTurn, limit, offset } = {}) {
  const db = storage.getDatabase();
  try {
    let query = 'SELECT * FROM events WHERE session_id = ?';
    const params = [sessionId];
    
    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }
    
    if (fromTurn !== undefined) {
      query += ' AND turn_number >= ?';
      params.push(fromTurn);
    }
    
    if (toTurn !== undefined) {
      query += ' AND turn_number <= ?';
      params.push(toTurn);
    }
    
    query += ' ORDER BY created_at ASC';
    
    if (offset !== undefined) {
      query += ' OFFSET ?';
      params.push(offset);
    }
    
    if (limit !== undefined) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    const rows = db.prepare(query).all(...params);
    return rows.map(deserializeEvent);
  } finally {
    db.close();
  }
}

/**
 * Get events for a specific turn
 * @param {string} sessionId - Session ID
 * @param {number} turnNumber - Turn number
 * @returns {Array} List of event records
 */
function getByTurn(sessionId, turnNumber) {
  return list(sessionId, { fromTurn: turnNumber, toTurn: turnNumber });
}

/**
 * Get events by type
 * @param {string} sessionId - Session ID
 * @param {string} eventType - Event type
 * @returns {Array} List of event records
 */
function getByType(sessionId, eventType) {
  return list(sessionId, { eventType });
}

/**
 * Count events for a session
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @param {string} options.eventType - Filter by event type
 * @returns {number} Number of events
 */
function count(sessionId, { eventType } = {}) {
  const db = storage.getDatabase();
  try {
    let query = 'SELECT COUNT(*) as count FROM events WHERE session_id = ?';
    const params = [sessionId];
    
    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }
    
    const row = db.prepare(query).get(...params);
    return row.count;
  } finally {
    db.close();
  }
}

/**
 * Delete all events for a session
 * @param {string} sessionId - Session ID
 * @returns {number} Number of events deleted
 */
function deleteBySession(sessionId) {
  const db = storage.getDatabase();
  try {
    const result = db.prepare('DELETE FROM events WHERE session_id = ?').run(sessionId);
    return result.changes;
  } finally {
    db.close();
  }
}

/**
 * Deserialize an event row from database
 * @private
 */
function deserializeEvent(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    eventData: JSON.parse(row.event_data),
    turnNumber: row.turn_number,
    createdAt: row.created_at
  };
}

/**
 * Export events repository API
 */
module.exports = {
  log,
  getById,
  list,
  getByTurn,
  getByType,
  count,
  deleteBySession
};
