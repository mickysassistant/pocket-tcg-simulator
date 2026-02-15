/**
 * Card Loader - Loads and caches Pokemon TCG card data from JSON files
 *
 * This module loads card data from Limitless JSON files and provides
 * functions to query card information by ID.
 */

let cardsDB = new Map();
let isLoaded = false;

/**
 * Load card data from all available set JSON files
 *
 * Sets to load:
 * - A1: Genetic Apex (main set)
 * - A1a: Genetic Apex Mewtwo ex
 * - A2: Mythical Island (main set)
 * - A2a: Mythical Island Lapras ex
 * - A2b: Mythical Island Eevee ex
 * - A3: Promo-A
 * - A3a: Promo-A (extra)
 * - A3b: Promo-A (extra 2)
 * - A4: Promo-B
 * - A4a: Promo-B (extra)
 * - A4b: Promo-B (extra 2)
 * - B1: Genetic Apex Mini (main set)
 * - B1a: Genetic Apex Mini Charizard ex
 * - B2: Mythical Island Mini (main set)
 *
 * @returns {Promise<Map>} Map of card ID -> card object
 */
export async function loadCards() {
  if (isLoaded) {
    return cardsDB;
  }

  console.log('Loading card data...');

  // All available sets from the Limitless raw data
  const sets = [
    'A1', 'A1a',      // Genetic Apex
    'A2', 'A2a', 'A2b', // Mythical Island
    'A3', 'A3a', 'A3b', // Promo-A
    'A4', 'A4a', 'A4b', // Promo-B
    'B1', 'B1a',        // Genetic Apex Mini
    'B2',               // Mythical Island Mini
  ];

  for (const set of sets) {
    try {
      const response = await fetch(`/data/${set}.json`);
      if (!response.ok) {
        console.warn(`Failed to load set ${set}: ${response.status}`);
        continue;
      }

      const cards = await response.json();
      cards.forEach(card => {
        if (card.id) {
          cardsDB.set(card.id, card);
        }
      });

      console.log(`Loaded ${cards.length} cards from set ${set}`);
    } catch (error) {
      console.error(`Error loading set ${set}:`, error);
    }
  }

  isLoaded = true;
  console.log(`Total cards loaded: ${cardsDB.size}`);

  return cardsDB;
}

/**
 * Get a card by its ID
 *
 * @param {string} cardId - Card ID (e.g., "A1-001")
 * @returns {Object|null} Card object or null if not found
 */
export function getCard(cardId) {
  return cardsDB.get(cardId) || null;
}

/**
 * Get all cards (for search/filter operations)
 *
 * @returns {Array<Object>} Array of all card objects
 */
export function getAllCards() {
  return Array.from(cardsDB.values());
}

/**
 * Get cards by set ID
 *
 * @param {string} setId - Set ID (e.g., "A1", "A2")
 * @returns {Array<Object>} Array of cards from the specified set
 */
export function getCardsBySet(setId) {
  return getAllCards().filter(card => card.id?.startsWith(setId));
}

/**
 * Get the card image URL for a card ID
 *
 * @param {string} cardId - Card ID
 * @param {string} size - 'small' or 'full' (default: 'full')
 * @returns {string|null} Image URL or null if card not found
 */
export function getCardImage(cardId, size = 'full') {
  const card = getCard(cardId);
  if (!card) {
    return null;
  }
  return card.images?.[size] || card.images?.small || card.images?.full || null;
}

/**
 * Check if card data has been loaded
 *
 * @returns {boolean} True if cards have been loaded
 */
export function isCardsLoaded() {
  return isLoaded;
}

/**
 * Get the total number of loaded cards
 *
 * @returns {number} Number of cards in the database
 */
export function getCardCount() {
  return cardsDB.size;
}

/**
 * Search cards by name (case-insensitive)
 *
 * @param {string} query - Search query
 * @returns {Array<Object>} Array of matching cards
 */
export function searchCardsByName(query) {
  const lowerQuery = query.toLowerCase();
  return getAllCards().filter(card =>
    card.name?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get cards of a specific type
 *
 * @param {string} type - Energy type (e.g., "Grass", "Fire", "Water", etc.)
 * @returns {Array<Object>} Array of cards of that type
 */
export function getCardsByType(type) {
  return getAllCards().filter(card => {
    // Check main type for Pokemon cards
    if (card.types && card.types.includes(type)) {
      return true;
    }
    // Check energy type for Energy cards
    if (card.name?.includes(type)) {
      return true;
    }
    return false;
  });
}
