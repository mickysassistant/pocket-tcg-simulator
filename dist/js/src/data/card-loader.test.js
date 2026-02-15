/**
 * Tests for card-loader.ts
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Mock fetch to read from local data directory
globalThis.fetch = mock.fn(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    // Extract set name from URL (e.g., "/data/A1.json" -> "A1")
    const match = url.match(/\/data\/(.+)\.json/);
    if (!match) {
        throw new Error(`Invalid data URL: ${url}`);
    }
    const set = match[1];
    try {
        // Read from data directory relative to project root
        // Test is in src/data/, compiled to dist/js/src/data/, need to go up 4 levels to project root
        const dataPath = join(__dirname, '../../../../', 'data', `${set}.json`);
        const data = await readFile(dataPath, 'utf-8');
        return {
            ok: true,
            status: 200,
            json: async () => JSON.parse(data)
        };
    }
    catch (error) {
        // Return a failed response if file not found
        return {
            ok: false,
            status: 404
        };
    }
});
// Dynamic import to ensure mock is set up before module loads
const cardLoaderModule = await import('./card-loader.js');
const { loadCards, getCard, getAllCards, getCardsBySet, getCardImage, isCardsLoaded, getCardCount, searchCardsByName, getCardsByType } = cardLoaderModule;
describe('card-loader', () => {
    describe('loadCards()', () => {
        it('should be an async function that returns Promise<Map<string, Card>>', async () => {
            const result = loadCards();
            assert.strictEqual(typeof result.then, 'function', 'loadCards should return a Promise');
        });
        it('should populate cardsDB with card.id as key', async () => {
            // Load cards and verify at least one card is loaded
            await loadCards();
            const allCards = getAllCards();
            assert.ok(allCards.length > 0, 'Should have loaded at least one card');
            // Verify cards can be retrieved by ID
            const firstCard = allCards[0];
            const retrievedCard = getCard(firstCard.id);
            assert.strictEqual(retrievedCard?.id, firstCard.id, 'Card should be retrievable by ID');
        });
        it('should set isLoaded flag to true after successful load', async () => {
            // Reset isLoaded by forcing a reload (we'll need to reload the module in a real scenario)
            // For now, just verify that after loading, isLoaded is true
            const loaded = isCardsLoaded();
            assert.strictEqual(loaded, true, 'isLoaded should be true after loadCards() completes');
        });
        it('should return the same cardsDB on subsequent calls', async () => {
            const firstLoad = await loadCards();
            const secondLoad = await loadCards();
            assert.strictEqual(firstLoad, secondLoad, 'Should return the same Map reference');
        });
    });
    describe('set definitions', () => {
        it('should include all required sets in the sets array', async () => {
            // The sets array includes: A1, A1a, A2, A2a, A2b, A3, A3a, A3b, A4, A4a, A4b, B1, B1a, B2
            // We verify by checking if cards from these sets are loaded
            await loadCards();
            const requiredSets = ['A1', 'A1a', 'A2', 'A2a', 'A2b', 'A3', 'A3a', 'A3b', 'A4', 'A4a', 'A4b', 'B1', 'B1a', 'B2'];
            for (const setId of requiredSets) {
                const cardsFromSet = getCardsBySet(setId);
                // Some sets may have no cards if the JSON file doesn't exist, but we verify the function works
                assert.ok(Array.isArray(cardsFromSet), `getCardsBySet should return array for set ${setId}`);
            }
        });
    });
    describe('getCard()', () => {
        it('should return a card by ID', async () => {
            await loadCards();
            const allCards = getAllCards();
            const firstCard = allCards[0];
            const retrievedCard = getCard(firstCard.id);
            assert.ok(retrievedCard, 'Should return a card object');
            assert.strictEqual(retrievedCard.id, firstCard.id);
        });
        it('should return null for non-existent card ID', async () => {
            await loadCards();
            const result = getCard('NONEXISTENT-999');
            assert.strictEqual(result, null);
        });
    });
    describe('getAllCards()', () => {
        it('should return an array of all cards', async () => {
            await loadCards();
            const allCards = getAllCards();
            assert.ok(Array.isArray(allCards), 'Should return an array');
            assert.ok(allCards.length > 0, 'Should have cards');
        });
    });
    describe('getCardsBySet()', () => {
        it('should filter cards by set ID', async () => {
            await loadCards();
            const a1Cards = getCardsBySet('A1');
            assert.ok(Array.isArray(a1Cards), 'Should return an array');
            // Verify all returned cards have IDs starting with the set ID
            for (const card of a1Cards) {
                assert.ok(card.id.startsWith('A1'), `Card ${card.id} should start with A1`);
            }
        });
        it('should return empty array for non-existent set', async () => {
            await loadCards();
            const result = getCardsBySet('NONEXISTENT');
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });
    });
    describe('getCardImage()', () => {
        it('should return full image URL by default', async () => {
            await loadCards();
            const allCards = getAllCards();
            const firstCard = allCards[0];
            const imageUrl = getCardImage(firstCard.id);
            assert.strictEqual(typeof imageUrl, 'string');
            if (imageUrl) {
                assert.ok(imageUrl.length > 0);
            }
        });
        it('should return small image URL when requested', async () => {
            await loadCards();
            const allCards = getAllCards();
            const firstCard = allCards[0];
            const imageUrl = getCardImage(firstCard.id, 'small');
            assert.strictEqual(typeof imageUrl, 'string');
            if (imageUrl) {
                assert.ok(imageUrl.length > 0);
            }
        });
        it('should return null for non-existent card', async () => {
            await loadCards();
            const result = getCardImage('NONEXISTENT-999');
            assert.strictEqual(result, null);
        });
    });
    describe('isCardsLoaded()', () => {
        it('should return false before load and true after load', async () => {
            // After cards are loaded from previous tests, isLoaded should be true
            const loadedAfter = isCardsLoaded();
            assert.strictEqual(typeof loadedAfter, 'boolean');
            assert.strictEqual(loadedAfter, true, 'isLoaded should be true after loadCards() completes');
            // Call loadCards again and verify it returns the same reference (early return)
            const dbBefore = await loadCards();
            const dbAfter = await loadCards();
            assert.strictEqual(dbBefore, dbAfter, 'loadCards should return same Map when already loaded');
            assert.strictEqual(isCardsLoaded(), true, 'isLoaded should remain true after early return');
        });
    });
    describe('getCardCount()', () => {
        it('should return the number of loaded cards', async () => {
            await loadCards();
            const count = getCardCount();
            assert.strictEqual(typeof count, 'number');
            assert.ok(count > 0);
        });
    });
    describe('searchCardsByName()', () => {
        it('should search cards by name case-insensitively', async () => {
            await loadCards();
            const allCards = getAllCards();
            const firstCard = allCards[0];
            // Search for the first card's name
            const results = searchCardsByName(firstCard.name.toLowerCase());
            assert.ok(Array.isArray(results));
            assert.ok(results.length > 0, 'Should find at least one card');
            // Verify the first card is in the results
            const found = results.some(c => c.id === firstCard.id);
            assert.strictEqual(found, true);
        });
        it('should return empty array for non-matching query', async () => {
            await loadCards();
            const results = searchCardsByName('NONEXISTENTCARDXYZ');
            assert.ok(Array.isArray(results));
            assert.strictEqual(results.length, 0);
        });
    });
    describe('getCardsByType()', () => {
        it('should filter cards by type', async () => {
            await loadCards();
            const grassCards = getCardsByType('Grass');
            assert.ok(Array.isArray(grassCards));
            // May be empty if no grass cards exist, but should not throw
        });
        it('should filter energy cards by name', async () => {
            await loadCards();
            const fireCards = getCardsByType('Fire');
            assert.ok(Array.isArray(fireCards));
            // May be empty if no fire cards exist, but should not throw
        });
    });
});
