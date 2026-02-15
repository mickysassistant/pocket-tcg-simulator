# TODO - Pokemon TCG Pocket Simulator Development

This file tracks all development tasks for the Pokemon TCG Pocket Simulator project.

## Task Status Legend
- ⬜ TODO: Not started
- 🟡 IN_PROGRESS: Currently working on
- ✅ DONE: Completed
- 🟥 BLOCKED: Waiting for clarification/blocker

---

## Project Tasks

### [T01] Project Setup + Serve Locally
**Status:** ✅ DONE
**Description:** Get a "Hello World" version running locally.
**File:** DEVGUIDE.md - Task 1
**Completed:** 2026-02-11
**Success Criteria:**
- [x] Can access the page in browser
- [x] Changes to HTML auto-reload (via serve)

---

### [T02] Load Card Data from JSON
**Status:** ✅ DONE
**Description:** Load card data from JSON files and display basic info.
**File:** DEVGUIDE.md - Task 2
**Dependencies:** T01
**Completed:** 2026-02-11 01:02
**Success Criteria:**
- [x] Cards load without errors
- [x] Can access card data by ID
- [x] Console shows success message

---

### [T03] Render Empty Battlefield
**Status:** ✅ DONE
**Description:** Create the game board layout (no cards yet, just zones).
**File:** DEVGUIDE.md - Task 3
**Dependencies:** T02
**Started:** 2026-02-11 00:56
**Completed:** 2026-02-11 01:00
**Success Criteria:**
- [x] Battlefield layout matches campo.html structure
- [x] Zones are clearly visible
- [x] Responsive (looks good on desktop)
- [x] Action log is separate, scrollable

---

### [T04] Render Cards with Real Images
**Status:** ✅ DONE
**Description:** Display Pokemon cards with images from Limitless CDN.
**File:** DEVGUIDE.md - Task 4
**Dependencies:** T03
**Started:** 2026-02-11 01:06
**Completed:** 2026-02-11 01:16
**Success Criteria:**
- [x] Card images load from Limitless CDN
- [x] HP badge displays correctly
- [x] Energy display shows correct types
- [x] Placeholder for empty slots

---

### [T05] Implement Game State Model
**Status:** ✅ DONE
**Description:** Create the core state structure and basic transformations.
**File:** DEVGUIDE.md - Task 5
**Dependencies:** T04
**Started:** 2026-02-11 01:26
**Completed:** 2026-02-11 01:32
**Success Criteria:**
- [x] Can create initial state
- [x] State structure matches SPEC.md format
- [x] Validation catches invalid states

---

### [T06] Implement Scenario Load/Save + Editor UI
**Status:** ✅ DONE
**Description:** Let users load/save/edit scenarios.
**File:** DEVGUIDE.md - Task 6
**Dependencies:** T05
**Started:** 2026-02-11 01:36
**Completed:** 2026-02-11 01:45
**Success Criteria:**
- [x] Can export current state as JSON
- [x] Can import JSON scenario
- [x] Can edit JSON in modal
- [x] Validation catches errors

---

### [T07] Implement Turn Flow
**Status:** ✅ DONE
**Description:** Implement draw → energy → actions → attack → checkup.
**File:** DEVGUIDE.md - Task 7
**Dependencies:** T06
**Started:** 2026-02-11 02:16
**Completed:** 2026-02-11 02:27
**Success Criteria:**
- [x] Turns advance with proper flow
- [x] First turn rules apply (no draw, no energy)
- [x] Action log shows each step
- [x] Can pause/resume

---

### [T08] Drag & Drop
**Status:** ✅ DONE
**Started:** 2026-02-11 02:16
**Completed:** 2026-02-11 02:35
**Description:** Make cards draggable and zones droppable.
**File:** DEVGUIDE.md - Task 8
**Dependencies:** T07
**Success Criteria:**
- [x] Cards are draggable
- [x] Zones are droppable
- [x] Moves are validated
- [x] State updates on drop

---

### [T09] Damage Calculation + Weakness
**Status:** ✅ DONE
**Description:** Implement damage calculation with weakness modifiers.
**File:** DEVGUIDE.md - Task 9
**Dependencies:** T07
**Started:** 2026-02-11 02:36
**Completed:** 2026-02-11 02:36
**Success Criteria:**
- [x] Damage calculated correctly
- [x] Weakness adds +20 damage
- [x] Giovanni/other modifiers work
- [x] Test scenarios pass

---

### [T10] Status Effects + Pokemon Checkup
**Status:** ✅ DONE
**Description:** Implement status effects and checkup resolution.
**File:** DEVGUIDE.md - Task 10
**Dependencies:** T09
**Started:** 2026-02-11 05:46
**Completed:** 2026-02-11 05:58
**Success Criteria:**
- [x] Each status implemented
- [x] Checkup resolution works
- [x] Coin flips for Burn/Sleep
- [x] KO during checkup handled

---

### [T11] Evolution
**Status:** ✅ DONE
**Description:** Implement evolution mechanics.
**File:** DEVGUIDE.md - Task 11
**Dependencies:** T10
**Started:** 2026-02-11 05:56
**Completed:** 2026-02-11 06:04
**Success Criteria:**
- [x] Evolution rules validated
- [x] Status cured on evolve
- [x] Damage/energy preserved
- [x] Edge cases handled

---

### [T12] Trainers (Items + Supporters)
**Status:** ✅ DONE
**Started:** 2026-02-11 05:56
**Completed:** 2026-02-11 06:10
**Description:** Implement Trainer cards (Items and Supporters).
**File:** DEVGUIDE.md - Task 12
**Dependencies:** T11
**Success Criteria:**
- [x] Common trainers implemented
- [x] Supporter limit enforced
- [x] Effect system works
- [x] Interactions tested

---

### [T13] Abilities
**Status:** ✅ DONE
**Description:** Implement Pokemon abilities.
**File:** DEVGUIDE.md - Task 13
**Dependencies:** T12
**Started:** 2026-02-11 06:16
**Completed:** 2026-02-11 06:40
**Success Criteria:**
- [x] Ability data parsed
- [x] "Once per turn" tracking
- [x] Passive abilities work
- [x] Triggers tested

---

### [T14] Win Conditions + Points
**Status:** ✅ DONE
**Description:** Implement win conditions and point tracking.
**File:** DEVGUIDE.md - Task 14
**Dependencies:** T13
**Started:** 2026-02-11 06:50
**Completed:** 2026-02-11 06:55
**Success Criteria:**
- [x] Points awarded on KO
- [x] 3 points win condition
- [x] Simultaneous KO handled
- [x] Turn limit tie-breaker

---

### [T15] Action Log Panel
**Status:** ✅ DONE
**Description:** Enhance action log panel with formatting.
**File:** DEVGUIDE.md - Task 15
**Dependencies:** T07
**Started:** 2026-02-11 06:56
**Completed:** 2026-02-11 06:59
**Success Criteria:**
- [x] Color-coded entries
- [x] Turn grouping
- [x] Export as text
- [x] Auto-scroll

---

### [T16] Coin Flip System
**Status:** ✅ DONE
**Description:** Implement coin flip queue system.
**File:** DEVGUIDE.md - Task 16
**Dependencies:** T05
**Started:** 2026-02-11 07:20
**Completed:** 2026-02-11 07:30
**Success Criteria:**
- [x] UI shows queue
- [x] Can edit queue
- [x] Refills when empty
- [x] Logs flips

---

### [T17] Pause/Resume/Edit Mid-Game
**Status:** ✅ DONE
**Description:** Allow editing game state mid-game.
**File:** DEVGUIDE.md - Task 17
**Dependencies:** T06
**Success Criteria:**
- [x] Edit mode toggle
- [x] Click to edit HP/energy
- [x] Validate edits
- [x] Resume from edit

---

### [T18] i18n Support
**Status:** ✅ DONE
**Description:** Implement internationalization.
**File:** DEVGUIDE.md - Task 18
**Dependencies:** T01
**Started:** 2026-02-11 07:56
**Completed:** 2026-02-11 08:20
**Success Criteria:**
- [x] Translations loaded
- [x] Strings replaced
- [x] Language switcher
- [x] Both languages tested

---

### [T19a] Better Error Messages
**Status:** ✅ DONE
**Description:** Implement better error messages and validation feedback.
**File:** DEVGUIDE.md - Task 19a
**Dependencies:** T18
**Started:** 2026-02-11 11:08
**Completed:** 2026-02-11 11:48
**Success Criteria:**
- [x] Error modals with context
- [x] Clear validation messages
- [x] Toast notifications for non-critical errors

**Notes:**
- Internationalized all validation error messages from moves.js
- Added i18n keys for all validation errors in en.json and es.json
- Updated main.js to translate error keys using t() function
- Test scenario created: test-scenario-t19a.json

---

### [T19b] Loading States
**Status:** ✅ DONE
**Description:** Add loading indicators for async operations.
**File:** DEVGUIDE.md - Task 19b
**Dependencies:** T18
**Started:** 2026-02-11 12:08
**Completed:** 2026-02-11 12:08
**Success Criteria:**
- [x] Spinners during data load
- [x] Loading state for large imports
- [x] Visual feedback for slow actions

**Notes:**
- Enhanced loading overlay with progress bar (3-step init: translations → cards → UI)
- Added loading states for scenario load/save/file-read operations
- Added button loading CSS state (.btn-loading) with inline spinner
- i18n keys for all loading messages in es.json and en.json
- Error handling for file read failures
- 48 tests passing in test-t19b.mjs

---

### [T19c] Empty State Placeholders
**Status:** ✅ DONE
**Description:** Add visual placeholders for empty states.
**File:** DEVGUIDE.md - Task 19c
**Dependencies:** T18
**Started:** 2026-02-11 12:28
**Completed:** 2026-02-11 12:28
**Success Criteria:**
- [x] Placeholder when no cards
- [x] Initial log state ("Waiting for game to start...")
- [x] More visual empty bench slots

**Notes:**
- Enhanced all empty zone placeholders with contextual hints (active, bench, hand, stadium)
- Log empty state shows "⏳ Waiting for game to start..." with 🎮 icon via CSS ::before
- Bench slots have colored borders (blue), hover effects, and pulse animation on drop-target
- Active zones have gold-colored borders with hover/drop-target effects
- Stadium placeholder shows hint text below icon
- All text i18n'd in both ES and EN
- 47 tests passing in test-t19c.mjs

---

### [T19d] Edge Cases Testing
**Status:** ✅ DONE
**Description:** Create comprehensive test suite for edge cases.
**File:** DEVGUIDE.md - Task 19d
**Dependencies:** T19a, T19b, T19c
**Started:** 2026-02-11 13:08
**Completed:** 2026-02-11 13:08
**Success Criteria:**
- [x] Test suite for edge cases
- [x] Production scenarios documented
- [x] Regression tests for reported bugs

**Notes:**
- 26 tests passing in test-t19d-edge-cases.mjs covering 7 sections:
  1. Pokemon Checkup (KO by poison/burn, survival, paralysis auto-cure)
  2. Turn limit (P1 wins, P2 wins, draw, before-limit no winner)
  3. Hand/deck limits (hand full discard, deck empty no loss, bench max)
  4. Win conditions (3 pts, no-Pokemon gap documented, KO points)
  5. State validation (initial state, deep copy, hand over max)
  6. Evolution (damage/energy preservation concept)
  7. Energy Zone (configured types respected)
- 6 scenario JSON files in scenarios/t19d-*.json for manual testing
- 2 tests marked TODO-Pocket-Verify (energy generation, evolution HP)
- Discovered gap: checkWinCondition doesn't check "no Pokemon left" — handled by handleKOPokemon flow instead
- All unknown rules marked with // TODO-Pocket-Verify comments

---

## Known Bugs (QA Session - 2026-02-11)

### 🔴 BUG-001: Shallow Copy in turn-manager.js Causes State Mutation
**Severity:** HIGH
**File:** `js/engine/turn-manager.js`
**Description:** All functions in turn-manager.js use `{ ...state }` (shallow spread) instead of `cloneState()` (deep clone). This means nested objects (player data, pokemon arrays, energy zones) are shared references. Mutations like `player.deck.shift()` and `player.hand.push()` directly modify the original state.
**Steps to reproduce:**
1. Save a reference to `state` before calling `startTurn(state)` or `drawCard(state, 'player1')`
2. Call the function
3. Check the original reference — its nested properties have been mutated
**Expected:** Original state unchanged (immutability contract).
**Actual:** Original state is mutated via shared references.
**Fix:** Replace all `{ ...state }` with `cloneState(state)` in turn-manager.js (lines 21, 64, 108, 194).

### ✅ BUG-002: EX Pokemon Always Award 1 Point Instead of 2
**Severity:** HIGH
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added `getCardFn` parameter to `handleKOPokemon`. Now resolves card data and checks `card.rules.some(r => r.label === 'ex')` to detect EX cards. Updated all callers (`processPokemonCheckup`, `applyDamage`, `executeAttack`, `applyAbilityEffect`, `endTurn`) to pass `getCardFn` through the call chain. Verified with test: EX Pokemon now correctly awards 2 points.

### ✅ BUG-003: Bench Null Slots After KO Block New Plays
**Severity:** MEDIUM
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Changed `handleKOPokemon` to use `player.bench.splice(index, 1)` instead of `player.bench[index] = null`. This removes the slot entirely, keeping bench.length accurate. Verified with test: bench length is 2 after KO with no null slots.

### ✅ BUG-004: Confusion Status Not Implemented in Game Logic
**Severity:** MEDIUM
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added confusion handling in `handleAttackClick` (main.js). When a confused Pokemon attacks: coin flip from queue (or random). Tails = 20 damage to self (can KO), turn ends. Heads = attack proceeds normally. Note: confusion has no checkup effect (correct per TCG rules - only affects attacks).

### ✅ BUG-005: checkWinCondition Doesn't Check "No Pokemon Left"
**Severity:** LOW
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added "no Pokemon left" check at the top of `checkWinCondition`. Checks both active and bench for each player. If a player has no Pokemon at all, opponent wins. If neither has Pokemon, it's a tie. Verified with test.

### ✅ BUG-006: Evolution HP Handling May Be Incorrect
**Severity:** LOW
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added `getCardFn` parameter to `executeEvolve`. Now calculates damage counters correctly: `damageCounters = oldMaxHp - oldCurrentHp`, `newHp = newMaxHp - damageCounters` (minimum 1 HP). Example: Bulbasaur (70 max, 40 current = 30 damage) → Ivysaur (90 max) = 90-30 = 60 HP.

### ✅ BUG-007: executeAttack Does Not Validate Energy Cost
**Severity:** HIGH
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added `canAttack(state, attackIndex, getCard)` validation in `handleAttackClick` before `executeAttack`. Shows "Not enough energy" error if validation fails. Added i18n keys for error messages in both EN and ES.

### ✅ BUG-008: canEvolve Does Not Validate evolvesFrom Relationship
**Severity:** HIGH
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added `getCardFn` parameter to `canEvolve`. Now validates that the evolution card's `evolvesFrom`/`stage` field matches the target Pokemon's name. Returns `evolutionMismatch` error if invalid. Added i18n keys in both EN and ES.

### ✅ BUG-009: canAttack Does Not Validate PARALYSIS or SLEEP Status
**Severity:** MEDIUM
**Status:** ✅ FIXED (2026-02-11 19:13)
**Fix applied:** Added status validation in `handleAttackClick` (main.js). Paralysis and Sleep now block attacks with localized error message. Added i18n keys in both EN and ES.

---

## QA Test Results (2026-02-11)

### Tests Executed

1. **test-qa-workflow.js** - Functional workflow testing
   - 14/14 tests passed ✅
   - Scenarios tested:
     - Complete game from start to win
     - Full turn flow with status effects
     - Simultaneous KO scenario
     - Evolution during battle
     - Turn limit tie-breaker
     - Energy zone configuration
     - Hand full with draw
     - Bench full when playing

2. **test-verify-known-bugs.mjs** - Verification of known bugs from TODO.md
   - BUG-001: ✅ FIXED - Deep copy implemented correctly
   - BUG-002: 🔴 CONFIRMED - EX Pokemon award 1 point instead of 2
   - BUG-003: 🔴 CONFIRMED - Bench null slots block new plays
   - BUG-004: 🔴 CONFIRMED - Confusion status not handled
   - BUG-005: 🔴 CONFIRMED - checkWinCondition doesn't check "no Pokemon left"
   - BUG-006: 🔴 DOCUMENTED GAP - Evolution HP handling

3. **test-qa-edge-cases-workflow.mjs** - Advanced edge cases & workflows
   - 9/9 tests passed ✅
   - Scenarios tested:
     - Multiple status effects on same Pokemon
     - Energy zone after turn limit
     - KO during checkup - multiple Pokemon
     - Draw from empty deck
     - Bench promotion after active KO
     - Attack with insufficient energy (conceptual)
     - Status cure on evolve
     - Retire Pokemon manually (conceptual)
     - Multiple damage applications
     - Points tracking throughout game
     - Energy zone type rotation

### Bug Status Summary

| Bug ID | Description | Severity | Status |
|--------|-------------|----------|--------|
| BUG-001 | Shallow copy mutation | HIGH | ✅ FIXED |
| BUG-002 | EX Pokemon award 1pt instead of 2pt | HIGH | ✅ FIXED (2026-02-11 19:13) |
| BUG-003 | Bench null slots block plays | MEDIUM | ✅ FIXED (2026-02-11 19:13) |
| BUG-004 | Confusion not implemented | MEDIUM | ✅ FIXED (2026-02-11 19:13) |
| BUG-005 | checkWinCondition gap | LOW | ✅ FIXED (2026-02-11 19:13) |
| BUG-006 | Evolution HP handling | LOW | ✅ FIXED (2026-02-11 19:13) |
| BUG-007 | Attack without energy validation | HIGH | ✅ FIXED (2026-02-11 19:13) |
| BUG-008 | Evolution chain not validated | HIGH | ✅ FIXED (2026-02-11 19:13) |
| BUG-009 | Paralysis/Sleep don't block attack | MEDIUM | ✅ FIXED (2026-02-11 19:13) |

All known bugs resolved! 🎉

---

## Notes

### Unknown Rules (to verify with Pocket app)
- Energy Zone generation logic (random vs weighted)
- Simultaneous effects resolution order
- Fossil retreat with cost-reducing effects
- Pokemon Checkup edge cases for multiple KOs

### Testing Strategy
- Create scenario JSONs for edge cases
- Test with each task completion
- Mark unknowns with `// TODO-Pocket-Verify` comments

### CI/CD Requirements
- Each task should include tests
- Tests run on push/PR
- Coverage reports generated

---

## QA Sessions

### [QA-2026-02-11-20:13] Automated Cron Job Testing
**Date:** 2026-02-11 20:13
**Type:** Automated QA via cron job
**Result:** ✅ ALL TESTS PASSED - NO NEW BUGS

**Tests Executed:**
1. `test-verify-known-bugs.mjs` - 9/9 passed ✅
2. `test-qa-workflow.js` - 14/14 passed ✅
3. `test-qa-edge-cases-workflow.mjs` - 9/9 passed ✅
4. `test-t19d-edge-cases.mjs` - 26/26 passed ✅
5. `test-full-game-qa.mjs` - 18/18 passed ✅ (NEW)

**Total:** 76/76 tests passed (100% pass rate)

**Bugs Fixed (Verified):**
- BUG-001 through BUG-009 all verified as fixed ✅

**New Bugs Found:** 0

**Report:** QA-SUMMARY-2026-02-11-2013.md
