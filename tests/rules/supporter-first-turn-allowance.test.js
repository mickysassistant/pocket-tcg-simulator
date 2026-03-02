/**
 * Tests for Supporter First-Turn Allowance (R008)
 * 
 * Tests verify that Supporters CAN be used on the first turn (player1's turn 0),
 * unlike some Items (e.g., Rare Candy) which have first-turn restrictions.
 */

const { createGame } = require('../../src/index');

// Test helper: create a sample supporter card
function createSupporterCard(name, id = 'supporter-1') {
  return {
    id: id,
    name: name,
    type: 'Supporter'
  };
}

// Test helper: assert equal
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

// Test helper: assert deep equal
function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
  }
}

// Test helper: assert array includes
function assertArrayIncludes(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(`${message}\n  Array: ${JSON.stringify(array)}\n  Missing: ${item}`);
  }
}

/**
 * AC1: On turn 0, player1 can play one valid Supporter if no other blocker applies
 */
console.log('AC1: First-turn Supporter allowance...');

// Test 1.1: Player1 can play a Supporter on turn 0 (first turn)
{
  console.log('  Test 1.1: Player1 can play a Supporter on turn 0');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const supporterCard = createSupporterCard('Cynthia');
  const result = game.supporterSystem.playSupporter('player1', supporterCard);
  
  assertEqual(result.success, true, 'Supporter play should succeed on turn 0');
  assertEqual(game.supporterSystem.hasSupporterBeenPlayedThisTurn(), true, 'Supporter should be marked as played');
  console.log('    ✓ Pass');
}

// Test 1.2: canPlaySupporter returns allowed on turn 0 for player1
{
  console.log('  Test 1.2: canPlaySupporter returns allowed on turn 0 for player1');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const supporterCard = createSupporterCard('Volkner');
  const canPlay = game.supporterSystem.canPlaySupporter('player1', supporterCard);
  
  assertEqual(canPlay.allowed, true, 'canPlaySupporter should return allowed on turn 0');
  assertEqual(canPlay.reason, null, 'canPlaySupporter reason should be null');
  console.log('    ✓ Pass');
}

// Test 1.3: Supporter play on turn 0 logs correctly
{
  console.log('  Test 1.3: Supporter play on turn 0 logs correctly');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const supporterCard = createSupporterCard('Brock', 'supporter-brock');
  game.supporterSystem.playSupporter('player1', supporterCard);
  
  const log = game.gameState.turnLog;
  const supporterPlayLog = log.find(entry => entry.type === 'supporter_played');
  
  assertEqual(supporterPlayLog.player, 'player1', 'Log should show player1 played Supporter');
  assertEqual(supporterPlayLog.card, 'supporter-brock', 'Log should show correct card ID');
  assertEqual(supporterPlayLog.turn, 0, 'Log should show turn 0');
  console.log('    ✓ Pass');
}

// Test 1.4: Player2 can also play a Supporter on their first turn (turn 1)
{
  console.log('  Test 1.4: Player2 can play a Supporter on their first turn (turn 1)');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  
  const supporterCard = createSupporterCard('Misty');
  const result = game.supporterSystem.playSupporter('player2', supporterCard);
  
  assertEqual(result.success, true, 'Supporter play should succeed for player2 on turn 1');
  console.log('    ✓ Pass');
}

// Test 1.5: Turn 0 is identified correctly (no first-turn blocker for Supporters)
{
  console.log('  Test 1.5: Turn 0 is identified correctly (no first-turn blocker for Supporters)');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const turnInfo = game.supporterSystem.getCurrentTurnInfo();
  assertEqual(turnInfo.isFirstTurn, true, 'Turn 0 should be identified as first turn');
  
  // Supporter should still be allowed despite being first turn
  const supporterCard = createSupporterCard('Erika');
  const canPlay = game.supporterSystem.canPlaySupporter('player1', supporterCard);
  assertEqual(canPlay.allowed, true, 'Supporter should be allowed on first turn');
  console.log('    ✓ Pass');
}

/**
 * AC2: Supporter once-per-turn limit still applies after the first Supporter is played
 */
console.log('\nAC2: Once-per-turn limit...');

// Test 2.1: Cannot play a second Supporter in the same turn
{
  console.log('  Test 2.1: Cannot play a second Supporter in the same turn');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const supporter1 = createSupporterCard('Cynthia', 'supporter-1');
  const supporter2 = createSupporterCard('Volkner', 'supporter-2');
  
  const result1 = game.supporterSystem.playSupporter('player1', supporter1);
  assertEqual(result1.success, true, 'First Supporter should succeed');
  
  const result2 = game.supporterSystem.playSupporter('player1', supporter2);
  assertEqual(result2.success, false, 'Second Supporter should fail');
  assertEqual(result2.reason, 'already_played', 'Second Supporter should fail with already_played reason');
  console.log('    ✓ Pass');
}

// Test 2.2: canPlaySupporter returns blocked after one Supporter played
{
  console.log('  Test 2.2: canPlaySupporter returns blocked after one Supporter played');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const supporter1 = createSupporterCard('Brock');
  game.supporterSystem.playSupporter('player1', supporter1);
  
  const supporter2 = createSupporterCard('Misty');
  const canPlay = game.supporterSystem.canPlaySupporter('player1', supporter2);
  
  assertEqual(canPlay.allowed, false, 'canPlaySupporter should return false after one played');
  assertEqual(canPlay.reason, 'already_played', 'canPlaySupporter reason should be already_played');
  console.log('    ✓ Pass');
}

// Test 2.3: Once-per-turn limit resets at the start of the next turn
{
  console.log('  Test 2.3: Once-per-turn limit resets at the start of the next turn');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const supporter1 = createSupporterCard('Cynthia');
  game.supporterSystem.playSupporter('player1', supporter1);
  
  // End turn and start player2's turn
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  
  const supporter2 = createSupporterCard('Volkner');
  const result = game.supporterSystem.playSupporter('player2', supporter2);
  
  assertEqual(result.success, true, 'Supporter should be allowed on new turn');
  assertEqual(game.supporterSystem.hasSupporterBeenPlayedThisTurn(), true, 'Supporter should be marked as played on new turn');
  console.log('    ✓ Pass');
}

// Test 2.4: Player1 can play a Supporter on turn 2 (after player2's turn)
{
  console.log('  Test 2.4: Player1 can play a Supporter on turn 2 (after player2\'s turn)');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player2');
  game.turnManager.endTurn();
  game.turnManager.startTurn('player1');
  
  const supporterCard = createSupporterCard('Erika');
  const result = game.supporterSystem.playSupporter('player1', supporterCard);
  
  assertEqual(result.success, true, 'Supporter should succeed on turn 2');
  console.log('    ✓ Pass');
}

// Test 2.5: hasSupporterBeenPlayedThisTurn returns correct status
{
  console.log('  Test 2.5: hasSupporterBeenPlayedThisTurn returns correct status');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  assertEqual(game.supporterSystem.hasSupporterBeenPlayedThisTurn(), false, 'Should return false before playing Supporter');
  
  game.supporterSystem.playSupporter('player1', createSupporterCard('Cynthia'));
  assertEqual(game.supporterSystem.hasSupporterBeenPlayedThisTurn(), true, 'Should return true after playing Supporter');
  console.log('    ✓ Pass');
}

/**
 * AC3: Existing blocker behavior (for example opponent passive lock) is preserved
 */
console.log('\nAC3: External blocker behavior...');

// Test 3.1: External blocker can prevent Supporter play
{
  console.log('  Test 3.1: External blocker can prevent Supporter play');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Add an external blocker (e.g., opponent passive lock)
  game.supporterSystem.addExternalBlocker('passive_lock', (playerId, card) => {
    return {
      allowed: false,
      message: 'Blocked by opponent passive lock'
    };
  });
  
  const supporterCard = createSupporterCard('Cynthia');
  const result = game.supporterSystem.playSupporter('player1', supporterCard);
  
  assertEqual(result.success, false, 'Supporter should be blocked by external blocker');
  assertEqual(result.reason, 'external_blocker:passive_lock', 'Reason should indicate external blocker');
  console.log('    ✓ Pass');
}

// Test 3.2: External blocker is checked before once-per-turn limit
{
  console.log('  Test 3.2: External blocker is checked before once-per-turn limit');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Add external blocker
  game.supporterSystem.addExternalBlocker('test_blocker', () => {
    return { allowed: false, message: 'Blocked' };
  });
  
  // Try to play Supporter without playing any first
  const supporterCard = createSupporterCard('Cynthia');
  const result = game.supporterSystem.playSupporter('player1', supporterCard);
  
  assertEqual(result.success, false, 'Supporter should be blocked');
  assertEqual(result.reason, 'external_blocker:test_blocker', 'Should show external blocker reason, not already_played');
  console.log('    ✓ Pass');
}

// Test 3.3: External blocker can be removed
{
  console.log('  Test 3.3: External blocker can be removed');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Add and then remove external blocker
  game.supporterSystem.addExternalBlocker('temporary_block', () => {
    return { allowed: false, message: 'Blocked' };
  });
  game.supporterSystem.removeExternalBlocker('temporary_block');
  
  const supporterCard = createSupporterCard('Cynthia');
  const result = game.supporterSystem.playSupporter('player1', supporterCard);
  
  assertEqual(result.success, true, 'Supporter should succeed after blocker removed');
  console.log('    ✓ Pass');
}

// Test 3.4: Conditional external blocker (only blocks certain Supporters)
{
  console.log('  Test 3.4: Conditional external blocker (only blocks certain Supporters)');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Blocker that only blocks Cynthia
  game.supporterSystem.addExternalBlocker('type_restriction', (playerId, card) => {
    if (card.name === 'Cynthia') {
      return { allowed: false, message: 'Cynthia is blocked' };
    }
    return { allowed: true };
  });
  
  // Cynthia should be blocked
  const cynthiaResult = game.supporterSystem.playSupporter('player1', createSupporterCard('Cynthia'));
  assertEqual(cynthiaResult.success, false, 'Cynthia should be blocked');
  
  // But other Supporters should be allowed
  const brockResult = game.supporterSystem.playSupporter('player1', createSupporterCard('Brock'));
  assertEqual(brockResult.success, true, 'Brock should be allowed');
  console.log('    ✓ Pass');
}

// Test 3.5: Multiple external blockers can coexist
{
  console.log('  Test 3.5: Multiple external blockers can coexist');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Add two blockers
  game.supporterSystem.addExternalBlocker('blocker1', () => {
    return { allowed: true }; // This one allows
  });
  game.supporterSystem.addExternalBlocker('blocker2', () => {
    return { allowed: false, message: 'Blocked by blocker2' };
  });
  
  const supporterCard = createSupporterCard('Cynthia');
  const result = game.supporterSystem.playSupporter('player1', supporterCard);
  
  assertEqual(result.success, false, 'Should be blocked (one blocker is enough)');
  assertEqual(result.reason, 'external_blocker:blocker2', 'Should show the blocking blocker');
  console.log('    ✓ Pass');
}

// Test 3.6: External blocker logs correctly when blocking
{
  console.log('  Test 3.6: External blocker logs correctly when blocking');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  game.supporterSystem.addExternalBlocker('passive_lock', () => {
    return { allowed: false, message: 'Blocked by passive lock' };
  });
  
  game.supporterSystem.playSupporter('player1', createSupporterCard('Cynthia', 'cynthia-1'));
  
  const log = game.gameState.turnLog;
  const blockedLog = log.find(entry => entry.type === 'supporter_play_blocked');
  
  assertEqual(blockedLog.reason, 'external_blocker:passive_lock', 'Log should show blocker reason');
  assertEqual(blockedLog.card, 'cynthia-1', 'Log should show card ID');
  console.log('    ✓ Pass');
}

/**
 * Additional tests
 */
console.log('\nAdditional tests...');

// Test 4.1: Supporter behavior is independent from energy attachment (R003)
{
  console.log('  Test 4.1: Supporter behavior is independent from energy attachment (R003)');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Player1 on turn 0 cannot attach energy (R003 rule)
  const canAttach = game.energySystem.canAttachEnergy('player1');
  assertEqual(canAttach.allowed, false, 'Energy attachment should be blocked on turn 0');
  
  // But player1 CAN play a Supporter (different rule)
  const supporterCard = createSupporterCard('Cynthia');
  const canPlay = game.supporterSystem.canPlaySupporter('player1', supporterCard);
  assertEqual(canPlay.allowed, true, 'Supporter should be allowed on turn 0');
  console.log('    ✓ Pass');
}

// Test 4.2: Supporter behavior is independent from evolution (R007)
{
  console.log('  Test 4.2: Supporter behavior is independent from evolution (R007)');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  // Evolution is blocked on turn 0 (R007 rule)
  // Note: canEvolve returns { canEvolve: boolean, reason?: string }, not { allowed: boolean }
  const canEvolve = game.evolutionSystem.canEvolve('player1', 'test-pokemon');
  assertEqual(canEvolve.canEvolve, false, 'Evolution should be blocked on turn 0');
  
  // But Supporter is allowed
  const supporterCard = createSupporterCard('Cynthia');
  const canPlay = game.supporterSystem.canPlaySupporter('player1', supporterCard);
  assertEqual(canPlay.allowed, true, 'Supporter should be allowed on turn 0');
  console.log('    ✓ Pass');
}

// Test 4.3: ResetTurnTracking clears supporterPlayedThisTurn
{
  console.log('  Test 4.3: ResetTurnTracking clears supporterPlayedThisTurn');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  game.supporterSystem.playSupporter('player1', createSupporterCard('Cynthia'));
  assertEqual(game.supporterSystem.hasSupporterBeenPlayedThisTurn(), true, 'Should be true after playing');
  
  // Manual reset (normally called by turnManager.startTurn)
  game.supporterSystem.resetTurnTracking();
  assertEqual(game.supporterSystem.hasSupporterBeenPlayedThisTurn(), false, 'Should be false after reset');
  console.log('    ✓ Pass');
}

// Test 4.4: getCurrentTurnInfo returns correct turn information
{
  console.log('  Test 4.4: getCurrentTurnInfo returns correct turn information');
  const game = createGame([], []);
  game.turnManager.startTurn('player1');
  
  const turnInfo = game.supporterSystem.getCurrentTurnInfo();
  
  assertEqual(turnInfo.currentPlayer, 'player1', 'Should show player1');
  assertEqual(turnInfo.turnNumber, 0, 'Should show turn 0');
  assertEqual(turnInfo.isFirstTurn, true, 'Should show first turn');
  console.log('    ✓ Pass');
}

console.log('\n✅ All tests passed!');
