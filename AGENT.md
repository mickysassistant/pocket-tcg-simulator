# AGENT.md - Pokemon TCG Pocket Simulator AI Agent

This file provides instructions for the AI agent (me) working on the Pokemon TCG Pocket Simulator project.

## My Role

I am a developer AI working on the Pokemon TCG Pocket Simulator. My job is to:

1. Read PROJECT_STATE.md, TODO.md, and this file (AGENT.md) in order
2. Take the first incomplete task from TODO.md (starting with T01)
3. Implement the task according to DEVGUIDE.md
4. Test the implementation with `cd simulator && npm run serve`
5. Report progress
6. Mark tasks as BLOCKED if I encounter blockers

## Workflow

### Starting Work

1. **Read the required files:**
   ```bash
   read PROJECT_STATE.md
   read TODO.md
   read AGENT.md
   ```

2. **Find the first incomplete task:**
   - Look for tasks with status `⬜ TODO`
   - Start with the lowest ticket number (T01, T02, etc.)

3. **Read the task details:**
   - Check DEVGUIDE.md for the corresponding task
   - Review success criteria
   - Check dependencies

### Implementing a Task

1. **Follow DEVGUIDE.md instructions:**
   - Each task has detailed steps in DEVGUIDE.md
   - Follow the steps in order
   - Test as you go

2. **Write clean code:**
   - Follow ARCHITECTURE.md conventions
   - Use JSDoc for type hints
   - Add meaningful comments (explain WHY, not WHAT)

3. **Handle unknowns:**
   - If a rule is unknown, use baseline TCG rules
   - Add `// TODO-Pocket-Verify` comment
   - Note the unknown in TODO.md if it affects implementation

4. **Create tests:**
   - Each task needs tests for CI
   - Use scenario JSONs for testing when applicable
   - Test edge cases

### Testing

1. **Test locally:**
   ```bash
   cd /home/deckie/.openclaw/workspace/pocket-tcg-simulator
   npm run serve
   ```

2. **Verify:**
   - Access http://192.168.0.29:3000 (or http://localhost:3000)
   - Check all success criteria for the task
   - Test edge cases

3. **Create test scenarios:**
   - Save relevant states as JSON files
   - Store in `scenarios/` directory
   - Document what each scenario tests

### Reporting Progress

1. **Update TODO.md:**
   - Mark task as `🟡 IN_PROGRESS` when starting
   - Mark task as `✅ DONE` when complete
   - Check off success criteria checkboxes

2. **Update PROJECT_STATE.md:**
   - Update completion percentage
   - Add to "Completed Tasks" list
   - Update "Current File Status"
   - Update "Next Steps"

3. **Create summary report:**
   - Task completed
   - What was implemented
   - Tests created
   - Known issues/unknowns
   - Next task to work on

### When Blocked

1. **Mark task as blocked:**
   - Change status to `🟥 BLOCKED`
   - Add blocking reason to task description
   - Document what's needed to unblock

2. **Move to next task:**
   - If there are unblocked tasks, continue with the next one
   - If all tasks blocked, wait for clarification

## Code Conventions

### File Organization
- Use kebab-case for file names (e.g., `card-loader.js`)
- Follow ARCHITECTURE.md structure
- Keep related files together

### Naming
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Functions:** `camelCase`
- **CSS classes:** `kebab-case`

### Comments
```javascript
// ✅ GOOD - explains WHY
// Pre-generate coins to let user configure results for testing
const coinQueue = generateCoins(10);

// ❌ BAD - explains WHAT (code already says that)
// Generate 10 coins
const coinQueue = generateCoins(10);
```

### State Management
- **Always clone state before modifying:**
  ```javascript
  const newState = cloneState(state);
  newState.player1.hand.push(card); // Modify clone, not original
  return newState;
  ```

- **Validate before actions:**
  ```javascript
  if (!isValidMove(state, action)) {
    console.warn('Invalid move:', action);
    return state; // Return unchanged state
  }
  ```

### Error Handling
- **Graceful fallbacks:**
  ```javascript
  const card = getCard(cardId);
  if (!card) {
    console.warn('Card not found:', cardId);
    return { id: cardId, name: 'Unknown', hp: 50 }; // Placeholder
  }
  ```

## Unknown Rules Handling

When you encounter a rule that's not documented or unclear:

1. **Use baseline TCG behavior:**
   - Physical TCG rules as default
   - Logical extrapolation from similar mechanics

2. **Add comment flag:**
   ```javascript
   // TODO-Pocket-Verify: Does this work the same as physical TCG?
   ```

3. **Document in TODO.md:**
   - Add note to the relevant task
   - Mention what needs verification

4. **Create test scenario:**
   - Save the edge case as a scenario JSON
   - Note what should happen vs. what happens

## Testing Strategy

### Unit Tests
For pure functions in `engine/`:
- Test with various inputs
- Verify output matches expected
- Test edge cases

### Scenario Tests
For complex game flows:
1. Create scenario JSON
2. Load scenario
3. Take specific actions
4. Verify resulting state
5. Compare to expected state

### CI Tests
- Each task must include tests
- Tests run on push/PR
- Coverage reports generated

## Common Pitfalls to Avoid

### ❌ Mutating State Directly
```javascript
// BAD
function drawCard(state, playerId) {
  state[playerId].hand.push(state[playerId].deck.pop());
  return state;
}

// GOOD
function drawCard(state, playerId) {
  const newState = cloneState(state);
  const card = newState[playerId].deck.pop();
  if (card) {
    newState[playerId].hand.push(card);
  }
  return newState;
}
```

### ❌ Mixing UI and Logic
```javascript
// BAD - UI logic in game engine
function attack(state) {
  const damage = calculateDamage();
  document.querySelector('#hp').textContent = damage;
  return state;
}

// GOOD - Pure game logic
function attack(state) {
  const damage = calculateDamage();
  const newState = applyDamage(state, damage);
  return newState; // UI renders separately
}
```

### ❌ Forgetting Validation
```javascript
// BAD - No validation
function retreat(state) {
  // Just retreat
  return executeRetreat(state);
}

// GOOD - Validate first
function retreat(state, playerId) {
  if (!canRetreat(state, playerId)) {
    console.warn('Cannot retreat');
    return state;
  }
  return executeRetreat(state, playerId);
}
```

## Git Workflow

When completing a task:

```bash
cd /home/deckie/.openclaw/workspace/pocket-tcg-simulator
git checkout -b feature/task-<number>-<short-name>
# Example: git checkout -b feature/task-01-project-setup

# Make changes
# ...

git add .
git commit -m "Complete Task 01: Project Setup + Serve Locally"
# Include success criteria in commit message if helpful

git push origin feature/task-<number>-<short-name>
```

## Getting Help

When stuck:

1. **Re-read documentation:**
   - ARCHITECTURE.md for architecture
   - DEVGUIDE.md for specific task
   - SPEC.md for requirements

2. **Check existing files:**
   - Look for similar implementations
   - Check ARCHITECTURE.md patterns

3. **Console log everything:**
   - Debug with console.log
   - Check Chrome DevTools

4. **Create minimal reproduction:**
   - Simplify the problem
   - Isolate the issue

5. **Mark as BLOCKED:**
   - Document the issue clearly
   - Explain what's needed to unblock
   - Move to next task if possible

## Summary

**My goal:** Build a working Pokemon TCG Pocket simulator step by step, following the task list in TODO.md.

**Key principles:**
1. Follow DEVGUIDE.md for each task
2. Test thoroughly before marking complete
3. Use baseline TCG rules for unknowns, flag with `// TODO-Pocket-Verify`
4. Update TODO.md and PROJECT_STATE.md as I progress
5. Report progress clearly

**Happy coding!** 🎮✨
