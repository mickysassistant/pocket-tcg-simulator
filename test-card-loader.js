/**
 * Test script for T02 - Card Loader
 * This can be run directly with node to test card loading
 */

async function testCardLoader() {
    console.log('Testing Card Loader...\n');

    // Simulate browser fetch for Node.js
    global.fetch = async (url) => {
        const fs = await import('fs');
        const path = await import('path');
        const http = await import('http');

        // Parse URL to get file path
        const urlObj = new URL(url);
        let filePath;

        if (url.startsWith('/data/')) {
            const filename = url.replace('/data/', '');
            filePath = `/home/deckie/.openclaw/workspace/pocket-tcg-pocket-research/data/limitless/raw/${filename}`;
        } else {
            filePath = `/home/deckie/.openclaw/workspace/pocket-tcg-simulator/${url}`;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return {
                ok: true,
                json: async () => JSON.parse(content)
            };
        } catch (error) {
            console.error(`Error loading file ${filePath}:`, error.message);
            return {
                ok: false,
                status: 404
            };
        }
    };

    // Load the card-loader module
    const cardLoaderPath = '/home/deckie/.openclaw/workspace/pocket-tcg-simulator/js/data/card-loader.js';
    const cardLoaderCode = await import('fs').then(fs => fs.readFileSync(cardLoaderPath, 'utf-8'));

    // Execute the module code to get exports
    const exports = {};
    const module = { exports };
    eval(cardLoaderCode.replace('export', 'module.exports.'));

    const { loadCards, getCard, getCardImage, getCardCount, getAllCards } = module.exports;

    console.log('Step 1: Loading cards...');
    const cardsDB = await loadCards();
    console.log(`✅ Loaded ${getCardCount()} cards\n`);

    console.log('Step 2: Testing getCard()...');
    const testCard = getCard('A1-001');
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

    console.log('\nStep 3: Testing getCardImage()...');
    const imgUrl = getCardImage('A1-001', 'small');
    if (imgUrl) {
        console.log(`✅ Image URL: ${imgUrl}`);
    } else {
        console.log('❌ No image URL found');
    }

    console.log('\nStep 4: Testing getAllCards()...');
    const allCards = getAllCards();
    console.log(`✅ Total cards: ${allCards.length}`);

    console.log('\nStep 5: Testing edge cases...');
    const nullCard = getCard('INVALID-ID');
    if (nullCard === null) {
        console.log('✅ Invalid card ID returns null');
    } else {
        console.log('❌ Invalid card ID should return null');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
    console.log('All tests passed! ✅');
    console.log('='.repeat(50));
}

testCardLoader().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
