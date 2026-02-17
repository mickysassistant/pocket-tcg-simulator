/**
 * Deck Service - Validation and statistics for decks
 * 
 * Provides validation and statistical analysis for Pocket TCG deck files.
 */

const fs = require('fs');
const path = require('path');

// Pocket TCG deck size is 20 cards
const DECK_SIZE = 20;

/**
 * Validate a deck file
 * @param {string} deckPath - Path to deck file
 * @returns {Object} Validation result
 */
function validateDeck(deckPath) {
  // Check if file exists
  if (!fs.existsSync(deckPath)) {
    return {
      valid: false,
      reason: 'FILE_NOT_FOUND',
      message: `Deck file not found: ${deckPath}`
    };
  }

  // Read file
  let content;
  try {
    content = fs.readFileSync(deckPath, 'utf8');
  } catch (error) {
    return {
      valid: false,
      reason: 'FILE_READ_ERROR',
      message: `Failed to read deck file: ${error.message}`
    };
  }

  // Parse JSON
  let deck;
  try {
    deck = JSON.parse(content);
  } catch (error) {
    return {
      valid: false,
      reason: 'INVALID_JSON',
      message: `Deck file is not valid JSON: ${error.message}`
    };
  }

  // Check if deck is an array
  if (!Array.isArray(deck)) {
    return {
      valid: false,
      reason: 'INVALID_FORMAT',
      message: 'Deck must be an array of cards'
    };
  }

  // Check deck size
  if (deck.length !== DECK_SIZE) {
    return {
      valid: false,
      reason: 'INVALID_DECK_SIZE',
      message: `Deck must have exactly ${DECK_SIZE} cards, found ${deck.length}`
    };
  }

  // Check each card has required fields
  const errors = [];
  const cardIds = new Set();

  for (let i = 0; i < deck.length; i++) {
    const card = deck[i];

    if (!card || typeof card !== 'object') {
      errors.push(`Card at index ${i} is not an object`);
      continue;
    }

    if (!card.id) {
      errors.push(`Card at index ${i} is missing required field: id`);
    }

    if (!card.name) {
      errors.push(`Card at index ${i} is missing required field: name`);
    }

    // Check for duplicate cards
    if (card.id) {
      if (cardIds.has(card.id)) {
        errors.push(`Duplicate card ID: ${card.id}`);
      } else {
        cardIds.add(card.id);
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      reason: 'INVALID_CARDS',
      message: 'Deck has invalid cards',
      errors
    };
  }

  return {
    valid: true,
    reason: 'VALID',
    message: 'Deck is valid',
    deckPath,
    cardCount: deck.length
  };
}

/**
 * Get statistics for a deck
 * @param {string} deckPath - Path to deck file
 * @returns {Object} Deck statistics or error
 */
function getDeckStats(deckPath) {
  // Check if file exists
  if (!fs.existsSync(deckPath)) {
    return {
      error: `Deck file not found: ${deckPath}`,
      reason: 'FILE_NOT_FOUND'
    };
  }

  // Read file
  let content;
  try {
    content = fs.readFileSync(deckPath, 'utf8');
  } catch (error) {
    return {
      error: `Failed to read deck file: ${error.message}`,
      reason: 'FILE_READ_ERROR'
    };
  }

  // Parse JSON
  let deck;
  try {
    deck = JSON.parse(content);
  } catch (error) {
    return {
      error: `Deck file is not valid JSON: ${error.message}`,
      reason: 'INVALID_JSON'
    };
  }

  // Check if deck is an array
  if (!Array.isArray(deck)) {
    return {
      error: 'Deck must be an array of cards',
      reason: 'INVALID_FORMAT'
    };
  }

  // Calculate statistics
  const stats = {
    deckPath,
    totalCards: deck.length,
    supertypes: {},
    elements: {},
    elementCounts: {},
    stages: {},
    hpDistribution: {
      min: null,
      max: null,
      avg: null
    },
    energyCosts: {},
    duplicates: 0
  };

  // Track card IDs for duplicates
  const cardIds = new Map();

  deck.forEach(card => {
    if (!card) return;

    // Count supertypes
    if (card.supertype) {
      stats.supertypes[card.supertype] = (stats.supertypes[card.supertype] || 0) + 1;
    }

    // Count elements
    if (card.element) {
      stats.elementCounts[card.element] = (stats.elementCounts[card.element] || 0) + 1;
      stats.elements[card.element] = true;
    }

    // Count stages
    if (card.stage) {
      stats.stages[card.stage] = (stats.stages[card.stage] || 0) + 1;
    } else if (card.supertype === 'Pokémon') {
      // Basic Pokémon don't have stage field
      stats.stages.Basic = (stats.stages.Basic || 0) + 1;
    }

    // HP distribution
    if (card.hp && typeof card.hp === 'number') {
      if (stats.hpDistribution.min === null || card.hp < stats.hpDistribution.min) {
        stats.hpDistribution.min = card.hp;
      }
      if (stats.hpDistribution.max === null || card.hp > stats.hpDistribution.max) {
        stats.hpDistribution.max = card.hp;
      }
    }

    // Count energy costs
    if (card.attacks && Array.isArray(card.attacks)) {
      card.attacks.forEach(attack => {
        if (attack.energyCost && Array.isArray(attack.energyCost)) {
          attack.energyCost.forEach(cost => {
            stats.energyCosts[cost] = (stats.energyCosts[cost] || 0) + 1;
          });
        }
      });
    }

    // Track duplicates
    if (card.id) {
      cardIds.set(card.id, (cardIds.get(card.id) || 0) + 1);
    }
  });

  // Calculate average HP
  const hpCards = deck.filter(card => card.hp && typeof card.hp === 'number');
  if (hpCards.length > 0) {
    const totalHp = hpCards.reduce((sum, card) => sum + card.hp, 0);
    stats.hpDistribution.avg = Math.round(totalHp / hpCards.length);
  }

  // Convert elements to array
  stats.elements = Object.keys(stats.elements);

  // Count duplicate cards
  cardIds.forEach((count, id) => {
    if (count > 1) {
      stats.duplicates += count;
    }
  });

  // Check if deck is valid size
  stats.isValidSize = deck.length === DECK_SIZE;

  return stats;
}

module.exports = {
  validateDeck,
  getDeckStats,
  DECK_SIZE
};
