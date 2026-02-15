/**
 * T16 Coin Flip System - Node.js CI Tests
 * 
 * Tests: coin queue logic, editing, toggling, refill, auto-refill, logging
 * Run: node test-t16.mjs
 */

import { readFileSync } from 'fs';

// Inline the coin module logic for Node (no ESM fetch needed)
const DEFAULT_COIN_QUEUE_SIZE = 10;

function generateCoins(count = DEFAULT_COIN_QUEUE_SIZE) {
  return Array.from({ length: count }, () => Math.random() < 0.5);
}

function flipCoin(state) {
  if (!state.coinQueue || state.coinQueue.length === 0) {
    state.coinQueue = generateCoins();
  }
  const result = state.coinQueue.shift();
  if (Array.isArray(state.log)) {
    state.log.push({
      timestamp: Date.now(),
      turn: state.turn ?? 0,
      player: state.currentPlayer ?? null,
      action: 'coinFlip',
      result: result,
      details: result ? 'Heads 🪙' : 'Tails ✖️'
    });
  }
  return result;
}

function flipCoinWithLog(state) {
  const newCoinQueue = [...state.coinQueue];
  if (newCoinQueue.length === 0) {
    newCoinQueue.push(...generateCoins());
  }
  const result = newCoinQueue.shift();
  return { result, coinQueue: newCoinQueue };
}

function flipCoins(state, count) {
  const results = [];
  for (let i = 0; i < count; i++) results.push(flipCoin(state));
  return results;
}

function editCoin(state, index, value) {
  if (index >= 0 && index < state.coinQueue.length) state.coinQueue[index] = value;
}

function toggleCoin(state, index) {
  if (index >= 0 && index < state.coinQueue.length) state.coinQueue[index] = !state.coinQueue[index];
}

function refillCoins(state, count = DEFAULT_COIN_QUEUE_SIZE) {
  state.coinQueue = generateCoins(count);
}

function remainingCoins(state) {
  return (state.coinQueue || []).length;
}

function getQueue(state) {
  return [...(state.coinQueue || [])];
}

// ============================================================================
// Test framework
// ============================================================================
let passed = 0, failed = 0;

function assert(cond, name) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`); }
}

function assertEqual(a, b, name) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name} | expected: ${JSON.stringify(b)} | got: ${JSON.stringify(a)}`); }
}

function makeState(queue, withLog = false) {
  const s = { coinQueue: [...queue] };
  if (withLog) { s.log = []; s.turn = 0; s.currentPlayer = 'player1'; }
  return s;
}

// ============================================================================
// Tests
// ============================================================================
console.log('\n🪙 T16 - Coin Flip System Tests\n');

// --- generateCoins ---
console.log('--- generateCoins ---');
{
  const c = generateCoins(10);
  assertEqual(c.length, 10, 'generates 10 coins');
  assert(c.every(x => typeof x === 'boolean'), 'all boolean');
}
{
  const c = generateCoins();
  assertEqual(c.length, 10, 'default count is 10');
}
{
  const c = generateCoins(5);
  assertEqual(c.length, 5, 'custom count 5');
}

// --- flipCoin ---
console.log('--- flipCoin ---');
{
  const s = makeState([true, false, true]);
  assertEqual(flipCoin(s), true, 'returns first coin');
  assertEqual(s.coinQueue.length, 2, 'queue shrinks');
  assertEqual(s.coinQueue[0], false, 'next coin promoted');
}
{
  const s = makeState([true, false, true, false]);
  assertEqual(flipCoin(s), true, 'seq 1st');
  assertEqual(flipCoin(s), false, 'seq 2nd');
  assertEqual(flipCoin(s), true, 'seq 3rd');
  assertEqual(s.coinQueue.length, 1, '1 remaining');
}
{
  const s = makeState([]);
  const r = flipCoin(s);
  assert(typeof r === 'boolean', 'auto-refills on empty');
  assertEqual(s.coinQueue.length, 9, 'queue = 10 - 1');
}

// --- flipCoin logging ---
console.log('--- flipCoin logging ---');
{
  const s = { coinQueue: [true, false], log: [], turn: 5, currentPlayer: 'player2' };
  const r = flipCoin(s);
  assertEqual(r, true, 'logs: returns result');
  assertEqual(s.log.length, 1, 'logs: 1 entry');
  assertEqual(s.log[0].action, 'coinFlip', 'logs: action = coinFlip');
  assertEqual(s.log[0].result, true, 'logs: result stored');
  assertEqual(s.log[0].turn, 5, 'logs: turn recorded');
  assertEqual(s.log[0].player, 'player2', 'logs: player recorded');
  assert(s.log[0].details.includes('Heads'), 'logs: details = Heads');
}
{
  const s = makeState([false]);
  s.log = []; s.turn = 2; s.currentPlayer = 'player1';
  flipCoin(s);
  assert(s.log[0].details.includes('Tails'), 'logs: tails details');
}
{
  const s = makeState([true]); // no log array
  flipCoin(s);
  assert(!s.log, 'no log created when absent');
}

// --- flipCoinWithLog ---
console.log('--- flipCoinWithLog ---');
{
  const s = { coinQueue: [true, false, true] };
  const { result, coinQueue } = flipCoinWithLog(s);
  assertEqual(result, true, 'returns first coin');
  assertEqual(coinQueue.length, 2, 'queue shrinks');
  assertEqual(s.coinQueue.length, 3, 'original unchanged');
}
{
  const s = { coinQueue: [] };
  const { result, coinQueue } = flipCoinWithLog(s);
  assert(typeof result === 'boolean', 'auto-refills');
  assertEqual(coinQueue.length, 9, 'refilled minus 1');
}

// --- flipCoins ---
console.log('--- flipCoins ---');
{
  const s = { coinQueue: [true, true, false, true, false], log: [], turn: 1, currentPlayer: 'player1' };
  const r = flipCoins(s, 3);
  assertEqual(r, [true, true, false], 'returns sequence');
  assertEqual(s.coinQueue.length, 2, 'queue shrinks by 3');
  assertEqual(s.log.length, 3, '3 log entries');
  assert(s.log.every(e => e.action === 'coinFlip'), 'all entries are coinFlip');
}

// --- editCoin ---
console.log('--- editCoin ---');
{
  const s = makeState([true, true, true]);
  editCoin(s, 1, false);
  assertEqual(s.coinQueue[1], false, 'edits value at index');
  assertEqual(s.coinQueue[0], true, 'other coins unchanged');
}
{
  const s = makeState([true, false]);
  editCoin(s, 99, true);
  assertEqual(s.coinQueue.length, 2, 'out of bounds: no change');
}

// --- toggleCoin ---
console.log('--- toggleCoin ---');
{
  const s = makeState([true, false, true]);
  toggleCoin(s, 0);
  assertEqual(s.coinQueue[0], false, 'heads → tails');
  toggleCoin(s, 1);
  assertEqual(s.coinQueue[1], true, 'tails → heads');
}
{
  const s = makeState([true]);
  toggleCoin(s, 99);
  assertEqual(s.coinQueue[0], true, 'out of bounds: no change');
}

// --- refillCoins ---
console.log('--- refillCoins ---');
{
  const s = makeState([true]);
  refillCoins(s);
  assertEqual(s.coinQueue.length, 10, 'refills to 10');
  assert(s.coinQueue.every(c => typeof c === 'boolean'), 'all boolean');
}
{
  const s = makeState([]);
  refillCoins(s, 5);
  assertEqual(s.coinQueue.length, 5, 'custom count 5');
}

// --- remainingCoins ---
console.log('--- remainingCoins ---');
assertEqual(remainingCoins(makeState([true, false, true])), 3, 'correct count');
assertEqual(remainingCoins({ coinQueue: undefined }), 0, 'undefined = 0');

// --- getQueue ---
console.log('--- getQueue ---');
{
  const s = makeState([true, false, true]);
  const q = getQueue(s);
  assertEqual(q, [true, false, true], 'returns copy');
  q[0] = false;
  assertEqual(s.coinQueue[0], true, 'copy, not reference');
}

// --- UI contract: coin preview shows first 3 ---
console.log('--- UI contracts ---');
{
  const s = makeState([true, false, true, false, true]);
  const preview = getQueue(s).slice(0, 3);
  assertEqual(preview, [true, false, true], 'preview shows first 3');
}
{
  const s = makeState([false, true]);
  const preview = getQueue(s).slice(0, 3);
  assertEqual(preview, [false, true], 'preview with <3 coins');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n🪙 T16 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) {
  console.error('\n❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
}
