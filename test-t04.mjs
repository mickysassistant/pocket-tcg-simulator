/**
 * Test Task 04: Render Cards with Real Images
 * Automated test for card rendering
 */

import { loadCards, getCard, getCardImage } from './js/data/card-loader.js';

// Test card IDs
const TEST_CARDS = [
    { id: 'A1-001', name: 'Bulbasaur', expectedHp: 80 },
    { id: 'A1-003', name: 'Venusaur', expectedHp: 180 },
    { id: 'A1a-001', name: 'Mewtwo', expectedHp: 150 }
];

async function testCardRendering() {
    console.log('🧪 Testing Task 04: Render Cards with Real Images');
    console.log('=' .repeat(60));

    // Load cards
    console.log('Loading card data...');
    await loadCards();

    let passedTests = 0;
    let failedTests = 0;

    for (const testCard of TEST_CARDS) {
        console.log(`\n📋 Testing card: ${testCard.name} (${testCard.id})`);

        // Test 1: Card data retrieval
        const card = getCard(testCard.id);
        if (!card) {
            console.log(`  ❌ FAIL: Card not found`);
            failedTests++;
            continue;
        }
        console.log(`  ✅ PASS: Card data loaded`);

        // Test 2: HP verification
        if (card.hp !== testCard.expectedHp) {
            console.log(`  ❌ FAIL: Expected HP ${testCard.expectedHp}, got ${card.hp}`);
            failedTests++;
            continue;
        }
        console.log(`  ✅ PASS: HP matches (${card.hp})`);

        // Test 3: Image URL generation
        const imageUrl = getCardImage(testCard.id, 'small');
        if (!imageUrl) {
            console.log(`  ❌ FAIL: No image URL generated`);
            failedTests++;
            continue;
        }
        console.log(`  ✅ PASS: Image URL generated`);
        console.log(`     URL: ${imageUrl}`);

        // Test 4: Verify URL format
        if (!imageUrl.startsWith('http')) {
            console.log(`  ❌ FAIL: Image URL is not HTTP`);
            failedTests++;
            continue;
        }
        console.log(`  ✅ PASS: Image URL format valid`);

        passedTests++;
    }

    console.log('\n' + '=' .repeat(60));
    console.log(`📊 Test Results: ${passedTests} passed, ${failedTests} failed`);
    console.log('=' .repeat(60));

    return { passed: passedTests, failed: failedTests, total: TEST_CARDS.length };
}

testCardRendering()
    .then(results => {
        process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test error:', error);
        process.exit(1);
    });
