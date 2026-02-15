/**
 * Coin System Tests - Pokemon TCG Pocket Simulator
 *
 * Run with: npm test -- src/engine/coin.test.ts
 * Or: npx tsx src/engine/coin.test.ts
 */
import { generateCoins, flipCoin, flipCoinWithLog, flipCoins, editCoin, toggleCoin, refillCoins, remainingCoins, getQueue } from './coin.js';
const results = [];
function assert(condition, testName) {
    results.push({ name: testName, pass: condition });
    if (!condition)
        console.error('❌ FAIL:', testName);
}
function assertEqual(actual, expected, testName) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ name: testName, pass });
    if (!pass)
        console.error('❌ FAIL:', testName, '| expected:', expected, '| got:', actual);
}
function makeState(queue) {
    return { coinQueue: [...queue] };
}
// --- Tests ---
function testGenerateCoins() {
    const coins = generateCoins(10);
    assertEqual(coins.length, 10, 'generateCoins: produces 10 coins');
    assert(coins.every(c => typeof c === 'boolean'), 'generateCoins: all values are boolean');
}
function testGenerateCoinsDefault() {
    const coins = generateCoins();
    assertEqual(coins.length, 10, 'generateCoins: default count is 10');
}
function testFlipCoinConsumesFromQueue() {
    const state = makeState([true, false, true]);
    const result = flipCoin(state);
    assertEqual(result, true, 'flipCoin: returns first coin (heads)');
    assertEqual(state.coinQueue?.length, 2, 'flipCoin: queue shrinks by 1');
    assertEqual(state.coinQueue?.[0], false, 'flipCoin: next coin is now first');
}
function testFlipCoinSequence() {
    const state = makeState([true, false, true, false]);
    const r1 = flipCoin(state);
    const r2 = flipCoin(state);
    const r3 = flipCoin(state);
    assertEqual(r1, true, 'flipCoin sequence: 1st is heads');
    assertEqual(r2, false, 'flipCoin sequence: 2nd is tails');
    assertEqual(r3, true, 'flipCoin sequence: 3rd is heads');
    assertEqual(state.coinQueue?.length, 1, 'flipCoin sequence: 1 remaining');
}
function testFlipCoinAutoRefill() {
    const state = makeState([]);
    const result = flipCoin(state);
    assert(typeof result === 'boolean', 'flipCoin empty: auto-generates and returns boolean');
    // After consuming 1, should have 9 left (generated 10, used 1)
    assertEqual(state.coinQueue?.length, 9, 'flipCoin empty: queue refilled minus 1');
}
function testFlipCoinsMultiple() {
    const state = makeState([true, true, false, true, false]);
    const results = flipCoins(state, 3);
    assertEqual(results, [true, true, false], 'flipCoins: returns correct sequence');
    assertEqual(state.coinQueue?.length, 2, 'flipCoins: queue shrinks by count');
}
function testEditCoin() {
    const state = makeState([true, true, true]);
    editCoin(state, 1, false);
    assertEqual(state.coinQueue?.[1], false, 'editCoin: changes value at index');
    assertEqual(state.coinQueue?.[0], true, 'editCoin: does not change other coins');
}
function testEditCoinOutOfBounds() {
    const state = makeState([true, false]);
    editCoin(state, 5, true);
    assertEqual(state.coinQueue?.length, 2, 'editCoin out of bounds: no change');
}
function testToggleCoin() {
    const state = makeState([true, false, true]);
    toggleCoin(state, 0);
    assertEqual(state.coinQueue?.[0], false, 'toggleCoin: heads → tails');
    toggleCoin(state, 1);
    assertEqual(state.coinQueue?.[1], true, 'toggleCoin: tails → heads');
}
function testToggleCoinOutOfBounds() {
    const state = makeState([true]);
    toggleCoin(state, 99);
    assertEqual(state.coinQueue?.[0], true, 'toggleCoin out of bounds: no change');
}
function testRefillCoins() {
    const state = makeState([true]);
    refillCoins(state);
    assertEqual(state.coinQueue?.length, 10, 'refillCoins: generates 10 new coins');
    assert(state.coinQueue.every(c => typeof c === 'boolean'), 'refillCoins: all boolean');
}
function testRefillCoinsCustomCount() {
    const state = makeState([]);
    refillCoins(state, 5);
    assertEqual(state.coinQueue?.length, 5, 'refillCoins custom: generates 5 coins');
}
function testRemainingCoins() {
    const state = makeState([true, false, true]);
    assertEqual(remainingCoins(state), 3, 'remainingCoins: correct count');
}
function testRemainingCoinsEmpty() {
    const state = { coinQueue: undefined };
    assertEqual(remainingCoins(state), 0, 'remainingCoins undefined: returns 0');
}
function testGetQueue() {
    const state = makeState([true, false, true]);
    const queue = getQueue(state);
    assertEqual(queue, [true, false, true], 'getQueue: returns correct copy');
    queue[0] = false;
    assertEqual(state.coinQueue?.[0], true, 'getQueue: returns a copy, not reference');
}
function testFlipCoinLogsToActionLog() {
    const state = { coinQueue: [true, false], log: [], turn: 3, currentPlayer: 'player1' };
    const result = flipCoin(state);
    assertEqual(result, true, 'flipCoin log: returns correct result');
    assertEqual(state.log?.length, 1, 'flipCoin log: pushes 1 entry');
    assertEqual(state.log?.[0].action, 'coinFlip', 'flipCoin log: action is coinFlip');
    assertEqual(state.log?.[0].result, 'true', 'flipCoin log: result matches');
    assertEqual(state.log?.[0].turn, 3, 'flipCoin log: turn recorded');
    assertEqual(state.log?.[0].player, 'player1', 'flipCoin log: player recorded');
}
function testFlipCoinNoLogWithoutArray() {
    const state = makeState([true, false]);
    const result = flipCoin(state);
    assertEqual(result, true, 'flipCoin no log: still returns result');
    assert(!state.log, 'flipCoin no log: no log created when not present');
}
function testFlipCoinWithLogReturnsClonedQueue() {
    const state = { coinQueue: [true, false, true], log: [] };
    const { result, coinQueue } = flipCoinWithLog(state);
    assertEqual(result, true, 'flipCoinWithLog: returns first coin');
    assertEqual(coinQueue.length, 2, 'flipCoinWithLog: queue shrinks by 1');
    // Original state unchanged
    assertEqual(state.coinQueue?.length, 3, 'flipCoinWithLog: original state unchanged');
}
function testFlipCoinWithLogAutoRefill() {
    const state = { coinQueue: [], log: [] };
    const { result, coinQueue } = flipCoinWithLog(state);
    assert(typeof result === 'boolean', 'flipCoinWithLog empty: returns boolean');
    assertEqual(coinQueue.length, 9, 'flipCoinWithLog empty: refilled minus 1');
}
function testFlipCoinsLogsMultiple() {
    const state = { coinQueue: [true, false, true], log: [], turn: 1, currentPlayer: 'player2' };
    const results = flipCoins(state, 2);
    assertEqual(results, [true, false], 'flipCoins log: correct results');
    assertEqual(state.log?.length, 2, 'flipCoins log: 2 entries logged');
    assertEqual(state.log?.[0].action, 'coinFlip', 'flipCoins log: first entry is coinFlip');
    assertEqual(state.log?.[1].action, 'coinFlip', 'flipCoins log: second entry is coinFlip');
}
// --- Runner ---
export function runCoinTests() {
    results.length = 0;
    console.log('🪙 Running Coin System Tests...');
    testGenerateCoins();
    testGenerateCoinsDefault();
    testFlipCoinConsumesFromQueue();
    testFlipCoinSequence();
    testFlipCoinAutoRefill();
    testFlipCoinsMultiple();
    testEditCoin();
    testEditCoinOutOfBounds();
    testToggleCoin();
    testToggleCoinOutOfBounds();
    testRefillCoins();
    testRefillCoinsCustomCount();
    testRemainingCoins();
    testRemainingCoinsEmpty();
    testGetQueue();
    testFlipCoinLogsToActionLog();
    testFlipCoinNoLogWithoutArray();
    testFlipCoinWithLogReturnsClonedQueue();
    testFlipCoinWithLogAutoRefill();
    testFlipCoinsLogsMultiple();
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    const total = results.length;
    console.log(`\n🪙 Coin Tests: ${passed}/${total} passed${failed ? `, ${failed} FAILED` : ''}`);
    results.forEach(r => console.log(`  ${r.pass ? '✅' : '❌'} ${r.name}`));
    return { passed, failed, total, results };
}
// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCoinTests();
}
