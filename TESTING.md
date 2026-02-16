# Testing Guide

This document explains how to run tests for the Pocket TCG Simulator project.

## Test Structure

Tests are organized into the following directories:

- `tests/rules/` - Unit tests for individual rule implementations (R002-R008)
- `tests/integration/` - Integration tests that verify rules work together
- `tests/rule-lock-manifest.test.js` - Validates the rule lock manifest structure

## Running Tests

### Run All Tests

```bash
# Run all rule tests and manifest test
for test in tests/rules/*.test.js tests/rule-lock-manifest.test.js; do
  echo "=== Running $test ==="
  node "$test" || exit 1
done
```

### Run Individual Test Suites

```bash
# Run a specific rule test
node tests/rules/opening-turn-draw.test.js

# Run integration regression suite
node tests/integration/regression-suite.test.js

# Run manifest validation test
node tests/rule-lock-manifest.test.js
```

### Run Integration Regression Suite

The integration regression suite verifies all rule-locked stories (R002-R008) work together without regressions:

```bash
node tests/integration/regression-suite.test.js
```

This test includes:
- 21 individual story tests (3 per story for R002-R008)
- 4 cross-story integration tests
- Total: 25 tests

## Test Output

Each test suite produces:
- Individual test pass/fail status with test names
- Summary showing total tests passed/failed
- Clear error messages for failed tests with story ID references

Example output:
```
✓ [R002] AC1.1 - Player1 draws 1 card on opening turn (turn 0)
✓ [R002] AC1.2 - Player2 draws 1 card on their first turn (turn 1)
...
================================================================================
INTEGRATION REGRESSION SUITE SUMMARY (R002-R008)
================================================================================
Total tests: 25
Passed: 25
Failed: 0
================================================================================
```

## Test Coverage

### R002: Opening-Turn Draw (3 tests)
- Player1 draws 1 card on opening turn
- Player2 draws 1 card on their first turn
- No "skip draw" message in logs

### R003: First-Turn Energy Attachment Block (3 tests)
- Player1 cannot attach energy on turn 0
- Player2 can attach energy on their first turn
- Player1 can attach energy on turn 2

### R004: Hand-Limit Draw Behavior (3 tests)
- Draw at hand size 10 leaves hand unchanged
- Draw log entry records hand limit blocking
- Draw at hand size 9 succeeds and hand reaches 10

### R005: No Deck-Out Loss (3 tests)
- Draw from empty deck does not set winner or throw
- Game state remains playable after empty-deck draw attempts
- Log captures empty-deck no-draw outcome

### R006: Turn-Limit Resolution (3 tests)
- At configured turn limit, game ends in DRAW
- Before turn limit, no premature winner declared
- Beyond turn limit, result remains stable/deterministic

### R007: First-Turn Evolution Restriction (3 tests)
- Evolution rejected on global opening turn (turn 0)
- Player1 can evolve on turn 2 (after opening turn)
- Player2 can evolve on their first turn (turn 1)

### R008: Supporter First-Turn Allowance (3 tests)
- Player1 can play Supporter on turn 0 (opening turn)
- Once-per-turn limit still applies
- Once-per-turn limit resets at start of next turn

### Cross-Story Integration Tests (4 tests)
- R002+R003: Opening turn draw + first-turn energy block work together
- R004+R005: Hand limit checked before deck out
- R007+R008: Evolution blocked but Supporter allowed on opening turn
- R002+R003+R004+R005+R006+R007+R008: All rules work together over multiple turns

## Debugging Failed Tests

If a test fails:
1. The error message will show the story ID (e.g., "R003") and test ID (e.g., "AC1")
2. Review the test code in `tests/rules/` or `tests/integration/`
3. Check the implementation in `src/game/`
4. Run the specific test file again to see the full error trace

## Continuous Integration

Run the full test suite before committing changes:

```bash
# Run all tests
for test in tests/rules/*.test.js tests/rule-lock-manifest.test.js tests/integration/regression-suite.test.js; do
  node "$test" || exit 1
done
```

## Notes

- Tests use simple Node.js scripts without a testing framework
- Test assertions use custom `assertEqual()` and `assertTrue()` helper functions
- Test names include story IDs for traceability (e.g., "[R003] AC1 - ...")
- All tests must pass before accepting a PR
