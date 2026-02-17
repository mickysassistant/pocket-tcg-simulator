/**
 * Tests for CLI-007: Determinismo (seed + coin queue)
 * Tests seeded random number generator, coin queue, and game reproducibility
 */

const assert = require('assert');
const { createGame, SeededRNG, CoinQueue } = require('../../src/index');

console.log('Running Determinism Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

// Test 1: SeededRNG produces same sequence with same seed
function testSeededRngReproducibility() {
  console.log('Test 1: SeededRNG produces same sequence with same seed');
  try {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const sequence1 = [];
    const sequence2 = [];

    for (let i = 0; i < 20; i++) {
      sequence1.push(rng1.next());
      sequence2.push(rng2.next());
    }

    assert.deepStrictEqual(sequence1, sequence2, 'Same seed should produce same sequence');
    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 2: SeededRNG produces different sequences with different seeds
function testSeededRngDifferentSeeds() {
  console.log('Test 2: SeededRNG produces different sequences with different seeds');
  try {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    const sequence1 = [];
    const sequence2 = [];

    for (let i = 0; i < 20; i++) {
      sequence1.push(rng1.next());
      sequence2.push(rng2.next());
    }

    assert.notDeepStrictEqual(sequence1, sequence2, 'Different seeds should produce different sequences');
    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 3: SeededRNG reset produces same sequence from beginning
function testSeededRngReset() {
  console.log('Test 3: SeededRNG reset produces same sequence from beginning');
  try {
    const rng = new SeededRNG(999);

    const firstSequence = [];
    for (let i = 0; i < 10; i++) {
      firstSequence.push(rng.next());
    }

    rng.reset();

    const secondSequence = [];
    for (let i = 0; i < 10; i++) {
      secondSequence.push(rng.next());
    }

    assert.deepStrictEqual(firstSequence, secondSequence, 'Reset should produce same sequence');
    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 4: SeededRNG randomInt produces correct range
function testSeededRngRandomInt() {
  console.log('Test 4: SeededRNG randomInt produces correct range');
  try {
    const rng = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.randomInt(0, 10);
      assert.strictEqual(typeof value, 'number', 'Should return a number');
      assert.ok(value >= 0 && value <= 10, `Value ${value} should be in range [0, 10]`);
    }

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 5: SeededRNG shuffle produces deterministic results
function testSeededRngShuffle() {
  console.log('Test 5: SeededRNG shuffle produces deterministic results');
  try {
    const rng1 = new SeededRNG(111);
    const rng2 = new SeededRNG(111);

    const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    rng1.shuffle(array1);
    rng2.shuffle(array2);

    assert.deepStrictEqual(array1, array2, 'Same seed should produce same shuffle');
    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 6: CoinQueue with queue uses provided values
function testCoinQueueWithQueue() {
  console.log('Test 6: CoinQueue with queue uses provided values');
  try {
    const queue = [true, false, true, false, true];
    const coinQueue = new CoinQueue(queue);

    for (let i = 0; i < queue.length; i++) {
      const result = coinQueue.flip();
      assert.strictEqual(result, queue[i], `Flip ${i} should match queue value`);
    }

    assert.strictEqual(coinQueue.remaining(), 0, 'Queue should be exhausted');
    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 7: CoinQueue with RNG uses random values
function testCoinQueueWithRNG() {
  console.log('Test 7: CoinQueue with RNG uses random values');
  try {
    const rng = new SeededRNG(777);
    const coinQueue = new CoinQueue(null, rng);

    for (let i = 0; i < 10; i++) {
      const result = coinQueue.flip();
      assert.strictEqual(typeof result, 'boolean', 'Flip should return boolean');
    }

    assert.strictEqual(coinQueue.remaining(), null, 'RNG mode should have unlimited flips');
    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 8: CoinQueue peek doesn't consume value
function testCoinQueuePeek() {
  console.log('Test 8: CoinQueue peek doesn\'t consume value');
  try {
    const queue = [true, false, true];
    const coinQueue = new CoinQueue(queue);

    const peek1 = coinQueue.peek();
    const peek2 = coinQueue.peek();

    assert.strictEqual(peek1, peek2, 'Peek should return same value twice');
    assert.strictEqual(peek1, true, 'Peek should return first value');
    assert.strictEqual(coinQueue.remaining(), 3, 'Queue should still have 3 values after peeking');

    const flip1 = coinQueue.flip();
    assert.strictEqual(flip1, true, 'Flip should consume first value');
    assert.strictEqual(coinQueue.remaining(), 2, 'Queue should have 2 values after flipping');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 9: CoinQueue reset returns to beginning
function testCoinQueueReset() {
  console.log('Test 9: CoinQueue reset returns to beginning');
  try {
    const queue = [true, false, true];
    const coinQueue = new CoinQueue(queue);

    coinQueue.flip();
    coinQueue.flip();
    assert.strictEqual(coinQueue.remaining(), 1, 'Queue should have 1 value left');

    coinQueue.reset();
    assert.strictEqual(coinQueue.remaining(), 3, 'Queue should have 3 values after reset');

    const flips = [];
    for (let i = 0; i < 3; i++) {
      flips.push(coinQueue.flip());
    }
    assert.deepStrictEqual(flips, queue, 'Flips after reset should match original queue');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 10: Game with seed produces reproducible deck shuffles
function testGameSeedDeterminism() {
  console.log('Test 10: Game with seed produces reproducible deck shuffles');
  try {
    const deck1 = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Card ${i + 1}` }));
    const deck2 = Array.from({ length: 60 }, (_, i) => ({ id: i + 101, name: `Card ${i + 101}` }));

    const game1 = createGame([...deck1], [...deck2], 30, 'test-seed-1');
    const game2 = createGame([...deck1], [...deck2], 30, 'test-seed-1');

    // Extract initial hands (should be same with same seed)
    const hand1_p1 = game1.gameState.players.player1.hand;
    const hand2_p1 = game2.gameState.players.player1.hand;

    const hand1_p2 = game1.gameState.players.player2.hand;
    const hand2_p2 = game2.gameState.players.player2.hand;

    assert.deepStrictEqual(hand1_p1, hand2_p1, 'Player 1 hand should be identical with same seed');
    assert.deepStrictEqual(hand1_p2, hand2_p2, 'Player 2 hand should be identical with same seed');

    // Decks should also have identical remaining cards
    const deck1_p1 = game1.gameState.players.player1.deck;
    const deck2_p1 = game2.gameState.players.player1.deck;

    const deck1_p2 = game1.gameState.players.player1.deck;
    const deck2_p2 = game2.gameState.players.player1.deck;

    assert.deepStrictEqual(deck1_p1, deck2_p1, 'Player 1 deck should be identical with same seed');
    assert.deepStrictEqual(deck1_p2, deck2_p2, 'Player 2 deck should be identical with same seed');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 11: Game with different seeds produces different results
function testGameDifferentSeeds() {
  console.log('Test 11: Game with different seeds produces different results');
  try {
    const deck1 = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Card ${i + 1}` }));
    const deck2 = Array.from({ length: 60 }, (_, i) => ({ id: i + 101, name: `Card ${i + 101}` }));

    const game1 = createGame([...deck1], [...deck2], 30, 'seed-abc');
    const game2 = createGame([...deck1], [...deck2], 30, 'seed-xyz');

    const hand1_p1 = game1.gameState.players.player1.hand;
    const hand2_p1 = game2.gameState.players.player1.hand;

    // With high probability, different seeds should produce different hands
    assert.notDeepStrictEqual(hand1_p1, hand2_p1, 'Different seeds should likely produce different hands');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 12: Game with coin queue uses provided coin flips
function testGameWithCoinQueue() {
  console.log('Test 12: Game with coin queue uses provided coin flips');
  try {
    const deck1 = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Card ${i + 1}` }));
    const deck2 = Array.from({ length: 60 }, (_, i) => ({ id: i + 101, name: `Card ${i + 101}` }));

    const coinQueue = [true, false, true, false, true];
    const game = createGame([...deck1], [...deck2], 30, null, coinQueue);

    // Check coin queue is attached
    assert.ok(game.coinQueue, 'Game should have coinQueue');
    assert.strictEqual(game.coinQueue.remaining(), 5, 'Coin queue should have 5 flips remaining');

    // Verify flips match the queue
    const flips = [];
    for (let i = 0; i < coinQueue.length; i++) {
      flips.push(game.coinQueue.flip());
    }
    assert.deepStrictEqual(flips, coinQueue, 'Flips should match the provided queue');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 13: RNG and coin queue can be used together
function testRngAndCoinQueueTogether() {
  console.log('Test 13: RNG and coin queue can be used together');
  try {
    const deck1 = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Card ${i + 1}` }));
    const deck2 = Array.from({ length: 60 }, (_, i) => ({ id: i + 101, name: `Card ${i + 101}` }));

    const coinQueue = [true, false];
    const game = createGame([...deck1], [...deck2], 30, 'test-seed', coinQueue);

    // Both should be available
    assert.ok(game.rng, 'Game should have RNG from seed');
    assert.ok(game.coinQueue, 'Game should have coin queue');

    // RNG should be deterministic
    const rngValue1 = game.rng.next();
    const rngValue2 = game.rng.next();

    // Coin queue should use queue values
    const coin1 = game.coinQueue.flip();
    const coin2 = game.coinQueue.flip();

    assert.strictEqual(coin1, true, 'Coin queue should use first value');
    assert.strictEqual(coin2, false, 'Coin queue should use second value');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 14: SeededRNG works with string seeds
function testSeededRngStringSeed() {
  console.log('Test 14: SeededRNG works with string seeds');
  try {
    const rng1 = new SeededRNG('hello-world');
    const rng2 = new SeededRNG('hello-world');

    const sequence1 = [];
    const sequence2 = [];

    for (let i = 0; i < 10; i++) {
      sequence1.push(rng1.next());
      sequence2.push(rng2.next());
    }

    assert.deepStrictEqual(sequence1, sequence2, 'Same string seed should produce same sequence');

    // Different strings should produce different sequences
    const rng3 = new SeededRNG('goodbye-world');
    const sequence3 = [];
    for (let i = 0; i < 10; i++) {
      sequence3.push(rng3.next());
    }

    assert.notDeepStrictEqual(sequence1, sequence3, 'Different string seeds should produce different sequences');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Test 15: CoinQueue throws error when exhausted
function testCoinQueueExhausted() {
  console.log('Test 15: CoinQueue throws error when exhausted');
  try {
    const queue = [true, false];
    const coinQueue = new CoinQueue(queue);

    coinQueue.flip();
    coinQueue.flip();

    let errorThrown = false;
    try {
      coinQueue.flip(); // Should throw
    } catch (e) {
      errorThrown = true;
      assert.ok(e.message.includes('exhausted'), 'Error should mention queue exhausted');
    }

    assert.ok(errorThrown, 'Should throw error when queue is exhausted');

    console.log('✓ PASS\n');
    testsPassed++;
  } catch (e) {
    console.log(`✗ FAIL: ${e.message}\n`);
    testsFailed++;
  }
}

// Run all tests
function runTests() {
  testSeededRngReproducibility();
  testSeededRngDifferentSeeds();
  testSeededRngReset();
  testSeededRngRandomInt();
  testSeededRngShuffle();
  testCoinQueueWithQueue();
  testCoinQueueWithRNG();
  testCoinQueuePeek();
  testCoinQueueReset();
  testGameSeedDeterminism();
  testGameDifferentSeeds();
  testGameWithCoinQueue();
  testRngAndCoinQueueTogether();
  testSeededRngStringSeed();
  testCoinQueueExhausted();

  console.log(`\n===================`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log(`===================`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testSeededRngReproducibility,
  testSeededRngDifferentSeeds,
  testSeededRngReset,
  testSeededRngRandomInt,
  testSeededRngShuffle,
  testCoinQueueWithQueue,
  testCoinQueueWithRNG,
  testCoinQueuePeek,
  testCoinQueueReset,
  testGameSeedDeterminism,
  testGameDifferentSeeds,
  testGameWithCoinQueue,
  testRngAndCoinQueueTogether,
  testSeededRngStringSeed,
  testCoinQueueExhausted
};
