/**
 * Actions Registry - Defines and validates game actions
 *
 * This service provides:
 * - Catalog of available actions with their schemas
 * - Validation of action payloads
 * - Stable error codes for validation failures
 */

/**
 * Action definitions
 * Each action defines:
 * - id: Unique action identifier
 * - name: Human-readable name
 * - description: What the action does
 * - schema: JSON schema for payload validation
 * - sessionRequired: Whether action requires an active session
 */
const ACTIONS = {
  // Draw cards action
  draw: {
    id: 'draw',
    name: 'Draw Cards',
    description: 'Draw cards from deck to hand',
    sessionRequired: true,
    schema: {
      type: 'object',
      required: ['playerId', 'count'],
      properties: {
        playerId: {
          type: 'string',
          enum: ['player1', 'player2'],
          description: 'Player drawing cards'
        },
        count: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Number of cards to draw'
        },
        respectHandLimit: {
          type: 'boolean',
          default: true,
          description: 'Whether to enforce 10-card hand limit'
        }
      }
    }
  },

  // Attach energy action
  attach_energy: {
    id: 'attach_energy',
    name: 'Attach Energy',
    description: 'Attach energy from Energy Zone to a Pokemon',
    sessionRequired: true,
    schema: {
      type: 'object',
      required: ['playerId', 'targetPokemonId'],
      properties: {
        playerId: {
          type: 'string',
          enum: ['player1', 'player2'],
          description: 'Player attaching energy'
        },
        targetPokemonId: {
          type: 'string',
          description: 'ID of the Pokemon to receive energy'
        }
      }
    }
  },

  // Evolve Pokemon action
  evolve: {
    id: 'evolve',
    name: 'Evolve Pokemon',
    description: 'Evolve a Pokemon to its next stage',
    sessionRequired: true,
    schema: {
      type: 'object',
      required: ['playerId', 'pokemonId', 'evolutionCard'],
      properties: {
        playerId: {
          type: 'string',
          enum: ['player1', 'player2'],
          description: 'Player evolving Pokemon'
        },
        pokemonId: {
          type: 'string',
          description: 'ID of the Pokemon to evolve'
        },
        evolutionCard: {
          type: 'object',
          required: ['id', 'name', 'stage', 'hp'],
          properties: {
            id: { type: 'string', description: 'Card ID' },
            name: { type: 'string', description: 'Pokemon name' },
            stage: {
              type: 'string',
              enum: ['stage1', 'stage2'],
              description: 'Evolution stage'
            },
            hp: { type: 'number', minimum: 1, description: 'HP value' }
          },
          description: 'Evolution card to apply'
        }
      }
    }
  },

  // Play Supporter action
  play_supporter: {
    id: 'play_supporter',
    name: 'Play Supporter',
    description: 'Play a Supporter card',
    sessionRequired: true,
    schema: {
      type: 'object',
      required: ['playerId', 'card'],
      properties: {
        playerId: {
          type: 'string',
          enum: ['player1', 'player2'],
          description: 'Player playing Supporter'
        },
        card: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', description: 'Card ID' },
            name: { type: 'string', description: 'Supporter name' }
          },
          description: 'Supporter card to play'
        }
      }
    }
  },

  // End turn action
  end_turn: {
    id: 'end_turn',
    name: 'End Turn',
    description: 'End the current turn',
    sessionRequired: true,
    schema: {
      type: 'object',
      required: ['playerId'],
      properties: {
        playerId: {
          type: 'string',
          enum: ['player1', 'player2'],
          description: 'Player ending their turn'
        }
      }
    }
  },

  // Start turn action
  start_turn: {
    id: 'start_turn',
    name: 'Start Turn',
    description: 'Start a new turn for a player',
    sessionRequired: true,
    schema: {
      type: 'object',
      required: ['playerId'],
      properties: {
        playerId: {
          type: 'string',
          enum: ['player1', 'player2'],
          description: 'Player starting their turn'
        }
      }
    }
  }
};

/**
 * Get all actions
 * @returns {Object} Map of action ID to action definition
 */
function getAllActions() {
  return ACTIONS;
}

/**
 * Get an action by ID
 * @param {string} actionId - Action ID
 * @returns {Object|null} Action definition or null if not found
 */
function getAction(actionId) {
  return ACTIONS[actionId] || null;
}

/**
 * List actions as an array
 * @returns {Array} Array of action objects with id, name, description
 */
function listActions() {
  return Object.values(ACTIONS).map(action => ({
    id: action.id,
    name: action.name,
    description: action.description,
    sessionRequired: action.sessionRequired
  }));
}

/**
 * Validate an action payload against its schema
 * @param {string} actionId - Action ID
 * @param {Object} payload - Action payload to validate
 * @returns {Object} Validation result { valid: boolean, errors?: Array }
 */
function validatePayload(actionId, payload) {
  const action = getAction(actionId);

  if (!action) {
    return {
      valid: false,
      reason: 'UNKNOWN_ACTION',
      errors: [`Unknown action: ${actionId}`]
    };
  }

  const errors = [];
  const schema = action.schema;

  // Validate type
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      reason: 'INVALID_PAYLOAD_TYPE',
      errors: ['Payload must be an object']
    };
  }

  // Validate required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate field types and constraints
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const value = payload[fieldName];

      // Skip validation if field is not present and not required
      if (value === undefined) {
        continue;
      }

      // Validate type
      if (fieldSchema.type) {
        const isValidType = validateType(value, fieldSchema.type);
        if (!isValidType) {
          errors.push(`Field "${fieldName}" must be of type ${fieldSchema.type}`);
          continue;
        }
      }

      // Validate enum values
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(
          `Field "${fieldName}" must be one of: ${fieldSchema.enum.join(', ')}`
        );
      }

      // Validate number constraints
      if (fieldSchema.type === 'number') {
        if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
          errors.push(`Field "${fieldName}" must be at least ${fieldSchema.minimum}`);
        }
        if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
          errors.push(`Field "${fieldName}" must be at most ${fieldSchema.maximum}`);
        }
      }

      // Validate nested objects
      if (fieldSchema.type === 'object' && fieldSchema.properties && typeof value === 'object') {
        const nestedErrors = validateNestedObject(value, fieldSchema);
        if (nestedErrors.length > 0) {
          for (const nestedError of nestedErrors) {
            errors.push(`${fieldName}.${nestedError}`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      reason: 'VALIDATION_ERROR',
      errors
    };
  }

  return { valid: true };
}

/**
 * Validate a value against a type
 * @private
 */
function validateType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Validate nested object recursively
 * @private
 */
function validateNestedObject(obj, schema) {
  const errors = [];

  // Validate required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (obj[field] === undefined || obj[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate properties
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const value = obj[fieldName];

      if (value === undefined) {
        continue;
      }

      if (fieldSchema.type) {
        const isValidType = validateType(value, fieldSchema.type);
        if (!isValidType) {
          errors.push(`${fieldName} must be of type ${fieldSchema.type}`);
        }
      }

      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(
          `${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`
        );
      }

      if (fieldSchema.type === 'number') {
        if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
          errors.push(`${fieldName} must be at least ${fieldSchema.minimum}`);
        }
        if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
          errors.push(`${fieldName} must be at most ${fieldSchema.maximum}`);
        }
      }
    }
  }

  return errors;
}

module.exports = {
  getAllActions,
  getAction,
  listActions,
  validatePayload
};
