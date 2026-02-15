# Deck Validation - Max 2 Copies Per Card

## Rule (from SPEC.md)
- **Max copies:** 2 per card name
- Applies to: deck, hand, bench, active, and discard (all cards owned by a player)

## Implementation
- **File:** `js/engine/game-state.js`
- **Function:** `validatePlayer()`
- **Constant:** `MAX_COPIES_PER_CARD = 2` (in `js/engine/constants.js`)

## Validation Logic
The validator counts all card IDs across all zones:
- Deck cards
- Hand cards
- Bench Pokemon (cardId only)
- Active Pokemon (if present)
- Discard pile

If any card appears more than 2 times, validation fails with error:
```
player1 has 3 copies of card A1-001 (max 2)
```

## Valid Deck Examples

### ✅ Valid: 2 copies of each card
```
Deck: [A1-001, A1-001, A1-002, A1-002, A1-003, ...]
Hand: [A1-004]
Active: A1-005
Bench: [A1-006, A1-007]
```

### ❌ Invalid: 3 copies of same card
```
Deck: [A1-001, A1-001, A1-001, A1-002, ...]  // ❌ A1-001 appears 3 times
Hand: [A1-001, A1-002]  // ❌ Now A1-001 appears 4 times
```

## Evolution Lines
Each Pokemon in an evolution line is a different card:
- **Bulbasaur** (A1-001) — 2 copies max
- **Ivysaur** (A1-002) — 2 copies max
- **Venusaur** (A1-003) — 2 copies max

So you CAN have 2 Bulbasaur, 2 Ivysaur, and 2 Venusaur in the same deck.

## Testing
Run the simulator and try loading a scenario:
1. Click "Load Scenario"
2. Select a JSON file
3. If validation fails, check console (F12) for errors
4. Debug logging is enabled in `loadScenario()` function

## Troubleshooting

### Load Scenario doesn't work:
1. Open browser console (F12)
2. Look for `[DEBUG]` messages
3. Check for validation errors
4. Ensure JSON file is valid (no syntax errors)

### Validation errors:
- Check that no card appears more than 2 times across all zones
- Check that deck size ≤ 20 cards
- Check that bench size ≤ 3 Pokemon
- Check that hand size ≤ 10 cards
