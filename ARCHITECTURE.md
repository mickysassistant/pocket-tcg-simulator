# Architecture - Pokemon TCG Pocket Simulator

This document explains how the simulator is built, for junior developers who will maintain and extend it.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│  (Battlefield layout + Action Log + Controls)       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├─> css/
                   │   ├─ battlefield.css (game board styles)
                   │   ├─ log.css (action log panel)
                   │   └─ dialogs.css (modals)
                   │
                   └─> js/
                       ├─ main.js (entry point, wires everything)
                       ├─ i18n/
                       │  ├─ es.json (Spanish translations)
                       │  └─ en.json (English translations)
                       ├─ data/
                       │  └─ card-loader.js (loads card JSONs)
                       └─ engine/
                          ├─ constants.js (game constants)
                          └─ game-state.js (core state model)
```

---

## Core Principles

### 1. Pure State Machine
The game engine (`js/engine/game-state.js`) is a **pure state machine**:
- All game state is in one JavaScript object
- Functions take state + action, return new state
- **No side effects** (no DOM manipulation, no API calls)
- Easy to test, easy to serialize

### 2. UI Follows State
The UI (`index.html` + event handlers in `main.js`) **renders from state**:
- State changes → re-render UI
- Don't manipulate DOM directly during game logic
- One-way data flow: `State → Render → User Input → New State`

### 3. No Build Step
- ES modules (`import`/`export`) with `type="module"`
- No Babel, no Webpack, no bundler
- Runs directly in modern browsers
- Development = production (just `npx serve`)

### 4. JSDoc for Types
```javascript
/**
 * @typedef {Object} Pokemon
 * @property {string} cardId - e.g. "A1-003"
 * @property {number} currentHp
 * @property {string[]} energy - e.g. ["G", "G"]
 */
```
Gives us type hints without TypeScript compilation.

---

## File Structure & Responsibilities

### `index.html`
- Main page with battlefield layout
- Loads all CSS and JS files
- Contains empty DOM structure (filled by JS)
- Semantic HTML with data attributes for JS selectors

**Key sections:**
- `#battlefield` - The game board
- `#action-log` - Right sidebar
- `#controls` - Bottom buttons
- `#modals` - Dialog overlays (scenario editor, coin editor)

### `css/battlefield.css`
- Game board layout (evolved from campo.html)
- Two player zones (top/bottom)
- Active Pokemon center
- Bench slots (max 3)
- Energy Zone indicator
- Deck/discard piles
- Stadium zone
- Responsive breakpoints (desktop-first)

**Design decisions:**
- Flexbox for player zones
- CSS Grid for bench slots
- Absolute positioning for energy/stadium zones (they're fixed)
- Aspect ratio preserved (portrait battlefield)

### `css/log.css`
- Action log panel styles
- Turn headers
- Action entries with icons
- Color coding by action type
- Scrollable container
- Export button

### `css/dialogs.css`
- Modal overlay styles
- Scenario editor form
- Coin queue editor
- Buttons and form controls

### `js/main.js`
**Entry point** - wires everything together:
```javascript
// 1. Load translations
// 2. Load card data
// 3. Initialize game state
// 4. Set up event listeners
// 5. Render initial UI
// 6. Game loop (if auto-playing)
```

**Responsibilities:**
- DOM manipulation
- Event handling (clicks, drags)
- Rendering (state → DOM)
- I18n lookup
- Calling engine functions

**Does NOT:**
- Game logic (that's in `engine/`)
- Direct state mutation (always clone + modify)

### `js/i18n/es.json` & `en.json`
Simple key-value translation files:
```json
{
  "game.turn": "Turno",
  "game.draw": "Robar",
  "game.attack": "Atacar",
  "status.poison": "Envenenado",
  "ui.play": "Jugar",
  "ui.pause": "Pausar"
}
```

**Usage in main.js:**
```javascript
function t(key) {
  return translations[currentLanguage][key] || key;
}
document.querySelector('#play-btn').textContent = t('ui.play');
```

**Guidelines:**
- Nested keys with dots (e.g., `game.turn`, `ui.play`)
- No complex ICU formatting yet (just strings)
- Keep keys in sync between files

### `js/data/card-loader.js`
Loads card data from JSON files in `data/` folder.

**Exports:**
```javascript
export async function loadCards() {
  // Returns Map<cardId, cardData>
}

export function getCard(cardId) {
  // Returns card data or null
}

export function getCardImage(cardId) {
  // Returns Limitless CDN URL
}
```

**Data source:**
- Symlinked `data/` → `../pocket-tcg-pocket-research/data/limitless/raw/`
- Loads `A1.json`, `A1a.json`, `A2.json`, `A2a.json`
- Combines into single card database

**Card data structure:**
```javascript
{
  id: "A1-003",
  name: "Venusaur",
  supertype: "Pokémon",
  subtype: "Stage 2",
  element: "Grass",
  hp: 180,
  weakness: "Fire",
  retreat: 3,
  attacks: [...],
  abilities: [...]
}
```

### `js/engine/constants.js`
All game constants in one place:
```javascript
export const MAX_BENCH = 3;
export const MAX_HAND = 10;
export const DECK_SIZE = 20;
export const MAX_COPIES = 2;
export const POINTS_TO_WIN = 3;
export const TURN_LIMIT = 30;

export const ENERGY_TYPES = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];

export const STATUS_EFFECTS = {
  POISON: 'poison',
  POISON_PLUS: 'poisonPlus',
  BURN: 'burn',
  SLEEP: 'sleep',
  PARALYSIS: 'paralysis',
  CONFUSION: 'confusion'
};

export const CHECKUP_ORDER = [
  STATUS_EFFECTS.POISON,
  STATUS_EFFECTS.BURN,
  STATUS_EFFECTS.SLEEP,
  STATUS_EFFECTS.PARALYSIS
];
```

**Why:**
- Single source of truth
- Easy to adjust for testing (e.g., test with 5 points to win)
- No magic numbers scattered in code

### `js/engine/game-state.js`
**The heart of the simulator** - pure game logic.

**Exports:**
```javascript
// State creators
export function createInitialState()
export function createPlayer()
export function createPokemon(cardId)

// State validation
export function isValidState(state)
export function isValidMove(state, action)

// State transformers (pure functions)
export function drawCard(state, playerId)
export function attachEnergy(state, playerId, pokemonIndex, energyType)
export function attack(state, playerId, attackIndex)
export function retreat(state, playerId)
export function evolve(state, playerId, pokemonIndex, evolutionCardId)
export function playTrainer(state, playerId, cardId)
export function endTurn(state)

// Game flow
export function processPokemonCheckup(state)
export function checkWinCondition(state)

// Helpers
export function cloneState(state)
export function applyDamage(pokemon, damage)
export function calculateDamage(attacker, defender, attack)
```

**State shape:**
```javascript
{
  version: 1,
  turn: 0,
  currentPlayer: 'player1',
  coinQueue: [true, false, true, ...],
  player1: { ... },
  player2: { ... },
  stadium: null,
  turnEffects: [],
  log: []
}
```

**Key concepts:**

**Immutability:**
```javascript
// ❌ BAD - mutates state
function drawCard(state, playerId) {
  state[playerId].hand.push(state[playerId].deck.pop());
  return state;
}

// ✅ GOOD - returns new state
function drawCard(state, playerId) {
  const newState = cloneState(state);
  const card = newState[playerId].deck.pop();
  if (card) {
    newState[playerId].hand.push(card);
    newState.log.push({ action: 'draw', card });
  }
  return newState;
}
```

**Validation before action:**
```javascript
export function isValidMove(state, action) {
  switch (action.type) {
    case 'draw':
      return state[action.playerId].deck.length > 0;
    case 'attachEnergy':
      return !state[action.playerId].normalAttachUsedThisTurn;
    case 'retreat':
      return !state[action.playerId].retreatedThisTurn
        && !hasBlockingStatus(state[action.playerId].active);
    // ... more validations
  }
}
```

**Coin queue system:**
```javascript
export function flipCoin(state) {
  const newState = cloneState(state);
  const result = newState.coinQueue.shift();
  
  // Refill if empty
  if (newState.coinQueue.length === 0) {
    newState.coinQueue = generateCoins(10);
  }
  
  newState.log.push({ action: 'coinFlip', result });
  return { state: newState, result };
}
```

---

## How The UI Works

### Rendering Pipeline

```
State Change → render() → Update DOM
```

**Example flow:**
1. User clicks "Attack" button
2. Event handler calls `state = attack(state, 'player1', 0)`
3. Call `render(state)`
4. `render()` updates all UI elements from state:
   - Active Pokemon HP bars
   - Energy indicators
   - Hand cards
   - Action log

### Render Function Pattern
```javascript
function render(state) {
  renderPlayerZone(state.player1, 'bottom');
  renderPlayerZone(state.player2, 'top');
  renderActionLog(state.log);
  renderControls(state);
  renderStadium(state.stadium);
}

function renderPlayerZone(player, position) {
  renderActive(player.active, position);
  renderBench(player.bench, position);
  renderHand(player.hand, position);
  renderDeck(player.deck, position);
  renderDiscard(player.discard, position);
  renderEnergyZone(player.energyZone, position);
}
```

**Key principles:**
- Render full UI on every state change (simple, predictable)
- Use data attributes for selectors: `data-zone="active"`, `data-player="player1"`
- Hide/show with CSS classes, not `display: none`

### Drag & Drop (Future)

**Pattern:**
```javascript
// Make cards draggable
card.draggable = true;
card.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('cardId', cardId);
  e.dataTransfer.setData('sourceZone', 'hand');
});

// Make drop zones
zone.addEventListener('dragover', (e) => e.preventDefault());
zone.addEventListener('drop', (e) => {
  const cardId = e.dataTransfer.getData('cardId');
  const sourceZone = e.dataTransfer.getData('sourceZone');
  
  // Validate move
  if (isValidMove(state, { type: 'playCard', cardId, targetZone: 'bench' })) {
    state = playCard(state, 'player1', cardId, 'bench');
    render(state);
  }
});
```

---

## How Card Effects Work (Extensibility)

**Problem:** 500+ unique cards with different effects. Can't hardcode them all.

**Solution:** Pattern-based effect system.

### Effect Categories

1. **Simple damage:** Just a number
2. **Conditional damage:** +X if condition
3. **Status effects:** Apply status to target
4. **Energy manipulation:** Attach/discard energy
5. **Card draw/search:** Manipulate deck/hand
6. **Switch/retreat effects:** Move Pokemon around

### Effect Implementation Pattern

**In card data:**
```javascript
{
  id: "A1-003",
  name: "Venusaur",
  attacks: [
    {
      name: "Giga Drain",
      energyCost: ["G", "G", "G", "G"],
      damage: "100",
      effect: {
        type: "heal",
        amount: 30,
        target: "self"
      }
    }
  ]
}
```

**In engine:**
```javascript
function executeAttack(state, attacker, defender, attack) {
  let newState = cloneState(state);
  
  // Base damage
  const damage = calculateDamage(attacker, defender, attack);
  newState = applyDamage(newState, defender, damage);
  
  // Execute effect (if any)
  if (attack.effect) {
    newState = executeEffect(newState, attack.effect, attacker, defender);
  }
  
  return newState;
}

function executeEffect(state, effect, attacker, defender) {
  switch (effect.type) {
    case 'heal':
      return healPokemon(state, attacker, effect.amount);
    case 'applyStatus':
      return applyStatus(state, defender, effect.status);
    case 'attachEnergy':
      return attachEnergyFromZone(state, effect.target, effect.energyType);
    // ... more effect types
  }
}
```

**Adding new cards:**
1. Add effect metadata to card JSON (or in card-loader.js as override)
2. If effect type exists, it Just Works™
3. If new effect type needed, add case to `executeEffect()`

**Complex effects:**
For effects that need full state access (e.g., "draw cards equal to opponent's bench size"):
```javascript
{
  effect: {
    type: "custom",
    fn: "drawCardsEqualToBenchSize"
  }
}

// In engine/effects.js
export const customEffects = {
  drawCardsEqualToBenchSize: (state, attacker, defender) => {
    const count = state[defender.owner].bench.length;
    let newState = state;
    for (let i = 0; i < count; i++) {
      newState = drawCard(newState, attacker.owner);
    }
    return newState;
  }
};
```

---

## Scenario System

### Loading a Scenario

```javascript
function loadScenario(json) {
  // 1. Parse JSON
  const scenario = JSON.parse(json);
  
  // 2. Validate schema
  if (!isValidState(scenario)) {
    throw new Error('Invalid scenario');
  }
  
  // 3. Set as current state
  state = scenario;
  
  // 4. Render
  render(state);
}
```

### Saving a Scenario

```javascript
function saveScenario() {
  // Just serialize current state
  const json = JSON.stringify(state, null, 2);
  
  // Download as file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scenario-${state.turn}.json`;
  a.click();
}
```

### Scenario Editor UI

Modal dialog with form controls:
- **Turn counter:** Number input
- **Current player:** Radio buttons
- **Points:** Number inputs (both players)
- **Active Pokemon HP:** Range sliders
- **Energy:** Checkboxes per type
- **Status:** Dropdown
- **Coin queue:** Grid of buttons (heads/tails)

**On submit:**
1. Read form values
2. Update state object
3. Validate state
4. Close modal
5. Render

---

## Coding Conventions

### Naming
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Functions:** `camelCase`
- **Files:** `kebab-case.js`
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

### Error Handling
```javascript
// Validate before action
if (!isValidMove(state, action)) {
  console.warn('Invalid move:', action);
  return state; // Return unchanged state
}

// Graceful fallback for missing cards
const card = getCard(cardId);
if (!card) {
  console.warn('Card not found:', cardId);
  return { id: cardId, name: 'Unknown', hp: 50 }; // Placeholder
}
```

### JSDoc Types
Add JSDoc for complex functions:
```javascript
/**
 * Calculate final damage from attacker to defender
 * @param {Pokemon} attacker
 * @param {Pokemon} defender
 * @param {Attack} attack
 * @returns {number} Final damage (minimum 0)
 */
function calculateDamage(attacker, defender, attack) {
  // ...
}
```

---

## Testing Strategy

### Unit Tests (Future)
For pure functions in `engine/game-state.js`:
```javascript
test('drawCard removes from deck and adds to hand', () => {
  const state = {
    player1: { deck: ['A1-001', 'A1-002'], hand: [] }
  };
  const newState = drawCard(state, 'player1');
  assert(newState.player1.hand.length === 1);
  assert(newState.player1.deck.length === 1);
});
```

### Scenario Tests (Current Approach)
Create JSON scenarios for edge cases:
- `scenarios/test-poison-ko.json` - Pokemon KO'd by poison during checkup
- `scenarios/test-first-turn.json` - Verify first turn restrictions
- `scenarios/test-simultaneous-ko.json` - Both reach 3 points at once

**To test:**
1. Load scenario
2. Take specific actions
3. Check resulting state
4. Compare to expected state

---

## Performance Considerations

### Current Scale
- 20 card deck
- Max 3 bench Pokemon
- Max 10 hand cards
- ~30 turn limit

**Total state size:** ~5-10KB JSON

**Rendering frequency:** Every action (~1-5 per second during gameplay)

**Conclusion:** No optimization needed yet. Full re-render is fine.

### Future Optimizations (If Needed)
1. **Dirty checking:** Only re-render changed zones
2. **Virtual DOM:** Library or mini implementation
3. **Web Workers:** Move game logic to background thread
4. **IndexedDB:** Cache card data locally

**Current philosophy:** Keep it simple, optimize when it's actually slow.

---

## Adding New Features

### Adding a New Card Effect Type

1. **Identify the pattern:**
   - What does the effect do?
   - What state does it need?
   - What state does it change?

2. **Add to effect system:**
   ```javascript
   // In engine/effects.js
   case 'newEffectType':
     return handleNewEffect(state, effect, attacker, defender);
   ```

3. **Test with scenario:**
   - Create scenario with card
   - Execute effect
   - Verify state changes

4. **Document:**
   - Add JSDoc comment
   - Update DEVGUIDE.md

### Adding a New UI Feature

1. **Add HTML structure:**
   ```html
   <div id="new-feature" class="hidden">
     <!-- content -->
   </div>
   ```

2. **Add CSS:**
   ```css
   #new-feature {
     /* styles */
   }
   ```

3. **Add JS:**
   ```javascript
   function renderNewFeature(state) {
     const el = document.querySelector('#new-feature');
     el.textContent = state.something;
   }
   ```

4. **Wire to render:**
   ```javascript
   function render(state) {
     // ... existing renders
     renderNewFeature(state);
   }
   ```

---

## Common Pitfalls

### ❌ Mutating State
```javascript
// BAD
function addEnergy(state, pokemon) {
  pokemon.energy.push('G'); // Mutates!
  return state;
}

// GOOD
function addEnergy(state, pokemon) {
  const newState = cloneState(state);
  const newPokemon = { ...pokemon, energy: [...pokemon.energy, 'G'] };
  // ... update newState with newPokemon
  return newState;
}
```

### ❌ Forgetting to Validate
```javascript
// BAD
function attack(state) {
  // Just do it
  return executeAttack(state);
}

// GOOD
function attack(state) {
  if (!canAttack(state)) {
    console.warn('Cannot attack');
    return state;
  }
  return executeAttack(state);
}
```

### ❌ Mixing UI and Logic
```javascript
// BAD
function attack(state) {
  const damage = calculateDamage();
  document.querySelector('#hp').textContent = damage; // UI in logic!
  return state;
}

// GOOD
function attack(state) {
  const damage = calculateDamage();
  const newState = applyDamage(state, damage);
  return newState; // Logic only, UI renders separately
}
```

---

## Summary

**Core architecture:**
- Pure state machine in `engine/`
- UI renders from state in `main.js`
- No frameworks, no build step
- Extensible effect system for cards

**Key files:**
- `engine/game-state.js` - All game logic
- `main.js` - UI rendering and events
- `constants.js` - Game rules
- `card-loader.js` - Card data

**Development flow:**
1. Change state (via pure function)
2. Render UI from state
3. Test with scenarios
4. Repeat

**Next steps:** See DEVGUIDE.md for step-by-step tasks!
