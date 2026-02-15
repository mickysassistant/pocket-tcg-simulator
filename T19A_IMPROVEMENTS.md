# Task 19a Improvements - Better Error Messages

## Current State Analysis

### ✅ Already Implemented
- Error modal system with context (`showErrorModal()`)
- Toast notification system (`logError()`, `logInfo()`)
- Error severity levels (WARNING, ERROR, CRITICAL)
- Error categorization (VALIDATION, GAME_STATE, NETWORK, SYSTEM)
- Loading overlay (`showLoading()`, `hideLoading()`)
- Game over banner
- Comprehensive i18n translations in es.json and en.json

### 🔧 Identified Issues

#### Issue 1: Validation messages in moves.js are not internationalized
**Location:** `js/engine/moves.js`

The validation functions return error messages in English:
- `'Active zone occupied'`
- `'Bench full (max 3)'`
- `'No energy available'`
- `'Energy already used this turn'`
- `'No energy on first turn (going first)'`
- `'Cannot retreat while asleep'`
- `'Cannot retreat while paralyzed'`
- etc.

**Impact:** These messages appear untranslated in the UI when `logError(check.reason)` is called.

#### Issue 2: Missing i18n keys for some validation errors
Some validation errors from moves.js don't have corresponding keys in the translation files.

## Implementation Plan

### Step 1: Add missing i18n keys
Add validation error keys to both `js/i18n/en.json` and `js/i18n/es.json`:

```json
"errors": {
  "validation": {
    "invalidPlayer": "Invalid player",
    "activeZoneOccupied": "Active zone is already occupied",
    "benchFull": "Bench is full (max 3 Pokemon)",
    "invalidHandIndex": "Invalid card in hand",
    "noEnergyAvailable": "No energy available to attach",
    "energyAlreadyUsed": "Energy already attached this turn",
    "noEnergyFirstTurn": "Cannot attach energy on first turn (going first)",
    "alreadyRetreated": "Already retreated this turn",
    "noActivePokemon": "No active Pokemon to retreat",
    "invalidBenchIndex": "Invalid bench slot",
    "benchSlotEmpty": "Bench slot is empty",
    "cannotRetreatAsleep": "Cannot retreat while asleep",
    "cannotRetreatParalyzed": "Cannot retreat while paralyzed",
    "cannotEvolveFirstTurn": "Cannot evolve on first turn",
    "targetPokemonNotFound": "Target Pokemon not found",
    "cannotEvolvePlayedThisTurn": "Cannot evolve a Pokemon played this turn",
    "alreadyEvolvedThisTurn": "Already evolved this turn"
  }
}
```

### Step 2: Update moves.js to return i18n keys
Change all validation functions in `moves.js` to return i18n keys instead of English messages:

**Before:**
```javascript
export function canPlayToActive(state, playerId, handIndex) {
  const player = state[playerId];
  if (!player) return { valid: false, reason: 'Invalid player' };
  if (player.active !== null) return { valid: false, reason: 'Active zone occupied' };
  // ...
}
```

**After:**
```javascript
export function canPlayToActive(state, playerId, handIndex) {
  const player = state[playerId];
  if (!player) return { valid: false, reasonKey: 'errors.validation.invalidPlayer' };
  if (player.active !== null) return { valid: false, reasonKey: 'errors.validation.activeZoneOccupied' };
  // ...
}
```

### Step 3: Update main.js to translate error keys
Change all places where `check.reason` is used to use `check.reasonKey` with `t()`:

**Before:**
```javascript
const check = canPlayToActive(state, playerId, handIndex);
if (!check.valid) { logError(check.reason); return; }
```

**After:**
```javascript
const check = canPlayToActive(state, playerId, handIndex);
if (!check.valid) { logError(t(check.reasonKey)); return; }
```

## Success Criteria Checklist

- [x] Error modals with context - ✅ Already implemented
- [ ] Clear validation messages - Need to internationalize
- [x] Toast notifications for non-critical errors - ✅ Already implemented

## Files to Modify

1. `js/engine/moves.js` - Change `reason` to `reasonKey`
2. `js/main.js` - Use `t(check.reasonKey)` instead of `check.reason`
3. `js/i18n/en.json` - Add validation error keys
4. `js/i18n/es.json` - Add validation error keys

## Testing

After implementation:
1. Test all drag & drop operations to see error messages
2. Test in both English and Spanish
3. Verify all validation messages are translated
4. Test edge cases (bench full, no energy, etc.)
