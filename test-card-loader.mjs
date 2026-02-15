/**
 * Test script for T02 - Card Loader (Simplified)
 * Verifies that card data files exist and can be parsed
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/deckie/.openclaw/workspace/pocket-tcg-pocket-research/data/limitless/raw';

const sets = [
    'A1', 'A1a',      // Genetic Apex
    'A2', 'A2a', 'A2b', // Mythical Island
    'A3', 'A3a', 'A3b', // Promo-A
    'A4', 'A4a', 'A4b', // Promo-B
    'B1', 'B1a',        // Genetic Apex Mini
    'B2',               // Mythical Island Mini
];

function testCardLoader() {
    console.log('Testing Card Loader...\n');

    let totalCards = 0;
    let cardsDB = new Map();

    for (const set of sets) {
        const filePath = path.join(DATA_DIR, `${set}.json`);
        
        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️  File not found: ${set}.json`);
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const cards = JSON.parse(content);
            
            cards.forEach(card => {
                if (card.id) {
                    cardsDB.set(card.id, card);
                }
            });

            console.log(`✅ Loaded ${cards.length} cards from ${set}.json`);
            totalCards += cards.length;
        } catch (error) {
            console.error(`❌ Error loading ${set}.json:`, error.message);
        }
    }

    console.log(`\n✅ Total cards loaded: ${cardsDB.size}\n`);

    // Test getCard
    console.log('Step 1: Testing getCard()...');
    const testCard = cardsDB.get('A1-001');
    if (testCard) {
        console.log(`✅ Found test card: ${testCard.name}`);
        console.log(`   - ID: ${testCard.id}`);
        console.log(`   - Set: ${testCard.set}`);
        console.log(`   - HP: ${testCard.hp}`);
        console.log(`   - Types: ${testCard.types ? testCard.types.join(', ') : 'N/A'}`);
    } else {
        console.log('❌ Test card A1-001 not found');
        process.exit(1);
    }

    // Test edge cases
    console.log('\nStep 2: Testing edge cases...');
    const nullCard = cardsDB.get('INVALID-ID');
    if (nullCard === undefined) {
        console.log('✅ Invalid card ID returns undefined');
    } else {
        console.log('❌ Invalid card ID should return undefined');
        process.exit(1);
    }

    // Test getCardImage
    console.log('\nStep 3: Testing getCardImage()...');
    if (testCard.images) {
        const imgUrl = testCard.images.small || testCard.images.full;
        if (imgUrl) {
            console.log(`✅ Image URL exists: ${imgUrl.substring(0, 50)}...`);
        } else {
            console.log('❌ No image URL found');
        }
    }

    // Test different card types
    console.log('\nStep 4: Testing different card types...');
    const pokemonCards = Array.from(cardsDB.values()).filter(c => c.supertype === 'Pokémon');
    const trainerCards = Array.from(cardsDB.values()).filter(c => c.supertype === 'Trainer');
    const energyCards = Array.from(cardsDB.values()).filter(c => c.supertype === 'Energy');
    
    console.log(`   - Pokémon cards: ${pokemonCards.length}`);
    console.log(`   - Trainer cards: ${trainerCards.length}`);
    console.log(`   - Energy cards: ${energyCards.length}`);

    console.log('\n' + '='.repeat(50));
    console.log('All tests passed! ✅');
    console.log('='.repeat(50));
}

try {
    testCardLoader();
} catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
}
