# Development Guide - Pokemon TCG Pocket Simulator

This guide breaks down the work into ordered tasks. Each task builds on the previous ones.

**Target audience:** Junior developers who want to contribute or understand the codebase.

---

## Prerequisites

- Basic HTML/CSS/JS knowledge
- Familiarity with ES6+ (arrow functions, destructuring, modules)
- Understanding of Pokemon TCG basics (helpful but not required)

**Read first:**
1. `SPEC.md` - What we're building
2. `ARCHITECTURE.md` - How it's structured

---

## Task 1: Project Setup + Serve Locally

**Goal:** Get a "Hello World" version running locally.

### Steps

1. **Install Node.js** (if not already):
   - Download from nodejs.org (v18+ recommended)
   - Verify: `node --version`

2. **Create project structure:**
   ```
   pocket-tcg-simulator/
   ├── index.html
   ├── package.json
   ├── css/
   ├── js/
   └── data/ (symlink)
   ```

3. **Create `package.json`:**
   ```json
   {
     "name": "pocket-tcg-simulator",
     "version": "0.1.0",
     "scripts": {
       "serve": "npx serve -l 3000"
     }
   }
   ```

4. **Create minimal `index.html`:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Pokemon TCG Pocket Simulator</title>
   </head>
   <body>
     <h1>Pokemon TCG Pocket Simulator</h1>
     <p>It works!</p>
   </body>
   </html>
   ```

5. **Serve locally:**
   ```bash
   npm run serve
   ```
   Open `http://localhost:3000` - should see "It works!"

**Success criteria:**
- ✅ Can access the page in browser
- ✅ Changes to HTML auto-reload (refresh page)

---

## Task 2: Load Card Data from JSON

**Goal:** Load card data from JSON files and display basic info.

### Steps

1. **Create symlink to card data:**
   ```bash
   cd pocket-tcg-simulator
   ln -s ../pocket-tcg-pocket-research/data/limitless/raw data
   ```

2. **Create `js/data/card-loader.js`:**
   ```javascript
   let cardsDB = new Map();
   
   export async function loadCards() {
     const sets = ['A1', 'A1a', 'A2', 'A2a'];
     for (const set of sets) {
       const response = await fetch(`/data/${set}.json`);
       const cards = await response.json();
       cards.forEach(card => cardsDB.set(card.id, card));
     }
     return cardsDB;
   }
   
   export function getCard(cardId) {
     return cardsDB.get(cardId) || null;
   }
   
   export function getCardImage(cardId) {
     const card = getCard(cardId);
     if (!card) return null;
     return card.images?.small || card.images?.full;
   }
   ```

3. **Create `js/main.js`:**
   ```javascript
   import { loadCards, getCard } from './data/card-loader.js';
   
   async function init() {
     console.log('Loading cards...');
     await loadCards();
     console.log('Cards loaded!');
     
     // Test: display a random card
     const testCard = getCard('A1-001');
     document.body.innerHTML += `<p>Test card: ${testCard.name}</p>`;
   }
   
   init();
   ```

4. **Update `index.html` to use module:**
   ```html
   <script type="module" src="js/main.js"></script>
   ```

5. **Test:**
   - Refresh page
   - Check console for "Cards loaded!"
   - Should see "Test card: Bulbasaur" (or similar)

**Success criteria:**
- ✅ Cards load without errors
- ✅ Can access card data by ID
- ✅ Console shows success message

**Common issues:**
- **CORS error:** Make sure you're using `npx serve`, not just opening `index.html` as file://
- **Symlink not working on Windows:** Copy the `data/` folder instead of symlinking

---

## Task 3: Render Empty Battlefield

**Goal:** Create the game board layout (no cards yet, just zones).

### Steps

1. **Study reference:** Open `campo.html` in browser - this is our design reference

2. **Create `css/battlefield.css`:**
   - Copy styles from campo.html as starting point
   - Improve layout, make it responsive
   - Add better colors, shadows, hover effects

3. **Update `index.html`:**
   ```html
   <link rel="stylesheet" href="css/battlefield.css">
   
   <div id="app">
     <div id="battlefield">
       <div class="player-zone top" data-player="player2">
         <div class="deck-discard">
           <div class="pile deck"></div>
           <div class="pile discard"></div>
         </div>
         <div class="energy-zone"></div>
         <div class="hand"></div>
         <div class="bench"></div>
         <div class="active-zone"></div>
       </div>
       
       <div class="center-zone">
         <div class="stadium-zone"></div>
       </div>
       
       <div class="player-zone bottom" data-player="player1">
         <div class="active-zone"></div>
         <div class="bench"></div>
         <div class="hand"></div>
         <div class="energy-zone"></div>
         <div class="deck-discard">
           <div class="pile deck"></div>
           <div class="pile discard"></div>
         </div>
       </div>
     </div>
     
     <aside id="action-log">
       <h2>Action Log</h2>
       <div class="log-entries"></div>
     </aside>
     
     <div id="controls">
       <button id="play-btn">Play</button>
       <button id="pause-btn">Pause</button>
       <button id="step-btn">Step</button>
       <button id="load-btn">Load Scenario</button>
       <button id="save-btn">Save Scenario</button>
     </div>
   </div>
   ```

4. **Create `css/log.css`:**
   ```css
   #action-log {
     position: fixed;
     right: 0;
     top: 0;
     width: 25%;
     height: 100vh;
     background: #2c3e50;
     color: white;
     overflow-y: auto;
     padding: 20px;
   }
   
   .log-entries {
     font-family: monospace;
     font-size: 12px;
   }
   ```

5. **Create `css/dialogs.css`:**
   ```css
   .modal-overlay {
     position: fixed;
     top: 0;
     left: 0;
     right: 0;
     bottom: 0;
     background: rgba(0,0,0,0.7);
     display: none;
     align-items: center;
     justify-content: center;
   }
   
   .modal-overlay.active {
     display: flex;
   }
   
   .modal-content {
     background: white;
     padding: 30px;
     border-radius: 10px;
     max-width: 600px;
     max-height: 80vh;
     overflow-y: auto;
   }
   ```

6. **Test:**
   - Refresh page
   - Should see empty battlefield with zones
   - Action log on right side
   - Control buttons at bottom

**Success criteria:**
- ✅ Battlefield layout matches campo.html structure
- ✅ Zones are clearly visible (use borders/backgrounds for debugging)
- ✅ Responsive (looks good on desktop)
- ✅ Action log is separate, scrollable

---

## Task 4: Render Cards with Real Images

**Goal:** Display Pokemon cards with images from Limitless CDN.

### Steps

1. **Add card rendering to `main.js`:**
   ```javascript
   import { getCard, getCardImage } from './data/card-loader.js';
   
   function renderPokemon(pokemon, container) {
     if (!pokemon) {
       container.innerHTML = '<div class="empty-slot"></div>';
       return;
     }
     
     const card = getCard(pokemon.cardId);
     const imageUrl = getCardImage(pokemon.cardId);
     
     container.innerHTML = `
       <div class="pokemon-card" data-card-id="${pokemon.cardId}">
         <img src="${imageUrl}" alt="${card.name}" />
         <div class="hp-badge">${pokemon.currentHp}/${card.hp}</div>
         <div class="energy-display">
           ${pokemon.energy.map(e => `<span class="energy ${e}">${e}</span>`).join('')}
         </div>
         ${pokemon.status ? `<div class="status-badge">${pokemon.status}</div>` : ''}
       </div>
     `;
   }
   ```

2. **Add card styles to `battlefield.css`:**
   ```css
   .pokemon-card {
     width: 100px;
     height: 145px;
     position: relative;
     border-radius: 8px;
     box-shadow: 0 4px 8px rgba(0,0,0,0.3);
   }
   
   .pokemon-card img {
     width: 100%;
     height: 100%;
     object-fit: cover;
     border-radius: 8px;
   }
   
   .hp-badge {
     position: absolute;
     top: -10px;
     right: 5px;
     background: linear-gradient(90deg, #4CAF50, #45a049);
     color: white;
     padding: 2px 8px;
     border-radius: 10px;
     font-weight: bold;
     font-size: 12px;
   }
   
   .energy-display {
     position: absolute;
     bottom: 5px;
     left: 5px;
     display: flex;
     gap: 2px;
   }
   
   .energy {
     width: 20px;
     height: 20px;
     border-radius: 50%;
     display: flex;
     align-items: center;
     justify-content: center;
     font-size: 10px;
     font-weight: bold;
     background: #FFD700;
   }
   ```

3. **Test with dummy data:**
   ```javascript
   // In main.js
   const testState = {
     player1: {
       active: {
         cardId: 'A1-003',
         currentHp: 160,
         energy: ['G', 'G', 'G'],
         status: null
       }
     }
   };
   
   function render(state) {
     const activeZone = document.querySelector('.player-zone.bottom .active-zone');
     renderPokemon(state.player1.active, activeZone);
   }
   
   render(testState);
   ```

4. **Verify:**
   - Should see Venusaur card image
   - HP badge shows "160/180"
   - 3 green energy circles at bottom

**Success criteria:**
- ✅ Card images load from Limitless CDN
- ✅ HP badge displays correctly
- ✅ Energy display shows correct types
- ✅ Placeholder for empty slots

**Troubleshooting:**
- **Image not loading:** Check network tab, verify URL format
- **Image too big/small:** Adjust CSS `object-fit` and dimensions

---

## Task 5: Implement Game State Model

**Goal:** Create the core state structure and basic transformations.

### Steps

1. **Create `js/engine/constants.js`:**
   ```javascript
   export const MAX_BENCH = 3;
   export const MAX_HAND = 10;
   export const DECK_SIZE = 20;
   export const POINTS_TO_WIN = 3;
   export const TURN_LIMIT = 30;
   
   export const ENERGY_TYPES = {
     G: 'Grass',
     R: 'Fire',
     W: 'Water',
     L: 'Lightning',
     P: 'Psychic',
     F: 'Fighting',
     D: 'Darkness',
     M: 'Metal',
     C: 'Colorless'
   };
   
   export const STATUS = {
     POISON: 'poison',
     BURN: 'burn',
     SLEEP: 'sleep',
     PARALYSIS: 'paralysis',
     CONFUSION: 'confusion'
   };
   ```

2. **Create `js/engine/game-state.js`:**
   ```javascript
   import { MAX_BENCH, MAX_HAND } from './constants.js';
   
   export function createInitialState() {
     return {
       version: 1,
       turn: 0,
       currentPlayer: 'player1',
       coinQueue: generateCoins(10),
       player1: createPlayer(),
       player2: createPlayer(),
       stadium: null,
       turnEffects: [],
       log: []
     };
   }
   
   export function createPlayer() {
     return {
       points: 0,
       active: null,
       bench: [],
       hand: [],
       deck: [],
       discard: [],
       energyZone: {
         currentEnergy: null,
         nextEnergy: null,
         configuredTypes: [],
         usedThisTurn: false
       },
       supporterUsedThisTurn: false,
       retreatedThisTurn: false,
       normalAttachUsedThisTurn: false
     };
   }
   
   export function createPokemon(cardId, turnPlayed = 0) {
     const card = getCard(cardId); // Import from card-loader
     return {
       cardId,
       currentHp: card.hp,
       energy: [],
       status: null,
       turnPlayed,
       lastEvolved: null,
       tool: null,
       effects: []
     };
   }
   
   function generateCoins(count) {
     return Array.from({ length: count }, () => Math.random() < 0.5);
   }
   
   export function cloneState(state) {
     return JSON.parse(JSON.stringify(state));
   }
   
   export function isValidState(state) {
     // Basic validation
     if (!state.player1 || !state.player2) return false;
     if (state.player1.bench.length > MAX_BENCH) return false;
     if (state.player2.bench.length > MAX_BENCH) return false;
     if (state.player1.hand.length > MAX_HAND) return false;
     if (state.player2.hand.length > MAX_HAND) return false;
     return true;
   }
   ```

3. **Test in console:**
   ```javascript
   import { createInitialState } from './engine/game-state.js';
   const state = createInitialState();
   console.log(state);
   ```

**Success criteria:**
- ✅ Can create initial state
- ✅ State structure matches SPEC.md format
- ✅ Validation catches invalid states

---

## Task 6: Implement Scenario Load/Save + Editor UI

**Goal:** Let users load/save/edit scenarios.

### Steps

1. **Add modal HTML to `index.html`:**
   ```html
   <div id="scenario-modal" class="modal-overlay">
     <div class="modal-content">
       <h2>Scenario Editor</h2>
       <textarea id="scenario-json" rows="20" cols="60"></textarea>
       <div class="modal-actions">
         <button id="apply-scenario">Apply</button>
         <button id="cancel-scenario">Cancel</button>
       </div>
     </div>
   </div>
   ```

2. **Add load/save functions to `main.js`:**
   ```javascript
   function loadScenario(json) {
     try {
       const scenario = JSON.parse(json);
       if (!isValidState(scenario)) {
         throw new Error('Invalid scenario');
       }
       state = scenario;
       render(state);
       console.log('Scenario loaded');
     } catch (e) {
       alert('Error loading scenario: ' + e.message);
     }
   }
   
   function saveScenario() {
     const json = JSON.stringify(state, null, 2);
     const blob = new Blob([json], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `scenario-turn-${state.turn}.json`;
     a.click();
   }
   
   function openScenarioEditor() {
     const modal = document.querySelector('#scenario-modal');
     const textarea = document.querySelector('#scenario-json');
     textarea.value = JSON.stringify(state, null, 2);
     modal.classList.add('active');
   }
   ```

3. **Wire up buttons:**
   ```javascript
   document.querySelector('#load-btn').addEventListener('click', () => {
     const input = document.createElement('input');
     input.type = 'file';
     input.accept = '.json';
     input.onchange = (e) => {
       const file = e.target.files[0];
       const reader = new FileReader();
       reader.onload = (e) => loadScenario(e.target.result);
       reader.readAsText(file);
     };
     input.click();
   });
   
   document.querySelector('#save-btn').addEventListener('click', saveScenario);
   
   document.querySelector('#apply-scenario').addEventListener('click', () => {
     const json = document.querySelector('#scenario-json').value;
     loadScenario(json);
     document.querySelector('#scenario-modal').classList.remove('active');
   });
   ```

4. **Create test scenario:**
   ```json
   {
     "version": 1,
     "turn": 1,
     "currentPlayer": "player1",
     "coinQueue": [true, false, true, true, false],
     "player1": {
       "points": 0,
       "active": {
         "cardId": "A1-003",
         "currentHp": 180,
         "energy": ["G", "G"],
         "status": null,
         "turnPlayed": 0
       },
       "bench": [],
       "hand": ["A1-001", "A1-002"],
       "deck": [],
       "discard": []
     },
     "player2": { /* same structure */ },
     "log": []
   }
   ```

5. **Test:**
   - Click "Save Scenario" → downloads JSON
   - Click "Load Scenario" → opens file picker → loads state
   - Edit textarea → Apply → state updates

**Success criteria:**
- ✅ Can export current state as JSON
- ✅ Can import JSON scenario
- ✅ Can edit JSON in modal
- ✅ Validation catches errors

---

## Task 7: Implement Turn Flow

**Goal:** Implement draw → energy → actions → attack → checkup.

### Steps

1. **Add turn functions to `game-state.js`:**
   ```javascript
   export function startTurn(state) {
     const newState = cloneState(state);
     const player = newState[newState.currentPlayer];
     
     // Reset turn flags
     player.supporterUsedThisTurn = false;
     player.retreatedThisTurn = false;
     player.energyZone.usedThisTurn = false;
     player.normalAttachUsedThisTurn = false;
     
     // Generate next energy
     if (player.energyZone.nextEnergy) {
       player.energyZone.currentEnergy = player.energyZone.nextEnergy;
     }
     player.energyZone.nextEnergy = generateEnergy(player.energyZone.configuredTypes);
     
     // First turn rules
     const isFirstTurn = newState.turn === 0;
     const isGoingFirst = newState.currentPlayer === 'player1';
     
     // Draw card (skip if first turn going first)
     if (!(isFirstTurn && isGoingFirst)) {
       newState = drawCard(newState, newState.currentPlayer);
     }
     
     newState.log.push({
       turn: newState.turn,
       player: newState.currentPlayer,
       action: 'startTurn'
     });
     
     return newState;
   }
   
   export function endTurn(state) {
     let newState = cloneState(state);
     
     // Pokemon Checkup
     newState = processPokemonCheckup(newState);
     
     // Check win condition
     const winner = checkWinCondition(newState);
     if (winner) {
       newState.winner = winner;
     }
     
     // Switch player
     newState.currentPlayer = newState.currentPlayer === 'player1' ? 'player2' : 'player1';
     newState.turn++;
     
     newState.log.push({
       turn: newState.turn - 1,
       action: 'endTurn'
     });
     
     return newState;
   }
   
   export function drawCard(state, playerId) {
     const newState = cloneState(state);
     const player = newState[playerId];
     
     if (player.deck.length === 0) {
       // No deck-out loss in Pocket
       newState.log.push({ action: 'draw', result: 'deck empty' });
       return newState;
     }
     
     const card = player.deck.pop();
     if (player.hand.length < MAX_HAND) {
       player.hand.push(card);
       newState.log.push({ action: 'draw', card });
     } else {
       // Hand full, discard
       player.discard.push(card);
       newState.log.push({ action: 'draw', result: 'hand full', card });
     }
     
     return newState;
   }
   ```

2. **Add control flow to `main.js`:**
   ```javascript
   let state = createInitialState();
   let isPaused = true;
   
   document.querySelector('#play-btn').addEventListener('click', () => {
     isPaused = false;
     gameLoop();
   });
   
   document.querySelector('#pause-btn').addEventListener('click', () => {
     isPaused = true;
   });
   
   document.querySelector('#step-btn').addEventListener('click', () => {
     // Execute one action
     state = startTurn(state);
     render(state);
   });
   
   function gameLoop() {
     if (isPaused || state.winner) return;
     
     // Auto-play logic (for now, just advance turn)
     state = startTurn(state);
     render(state);
     
     setTimeout(gameLoop, 1000); // 1 action per second
   }
   ```

3. **Test:**
   - Click "Play" → turns advance automatically
   - Click "Pause" → stops
   - Click "Step" → advances one turn

**Success criteria:**
- ✅ Turns advance with proper flow
- ✅ First turn rules apply (no draw, no energy)
- ✅ Action log shows each step
- ✅ Can pause/resume

---

## Tasks 8-19: Remaining Features

Due to length, here's the checklist. Each follows the same pattern: add logic to `game-state.js`, add UI to `main.js`, test with scenarios.

### Task 8: Drag & Drop
- Make cards draggable
- Make zones droppable
- Validate moves
- Update state on drop

### Task 9: Damage Calculation + Weakness
- Implement `calculateDamage()`
- Add weakness modifier (+20)
- Add Giovanni/other modifiers
- Test with scenarios

### Task 10: Status Effects + Pokemon Checkup
- Implement each status
- Add checkup resolution
- Coin flips for Burn/Sleep
- Test KO during checkup

### Task 11: Evolution
- Validate evolution rules
- Cure status on evolve
- Preserve damage/energy
- Test edge cases

### Task 12: Trainers (Items + Supporters)
- Implement common trainers
- Enforce supporter limit
- Add effect system
- Test interactions

### Task 13: Abilities
- Parse ability data
- Implement "once per turn" tracking
- Add passive abilities
- Test triggers

### Task 14: Win Conditions + Points
- Award points on KO
- Check for 3 points
- Handle simultaneous KO
- Turn limit tie-breaker

### Task 15: Action Log Panel
- Color-coded entries
- Turn grouping
- Export as text
- Auto-scroll

### Task 16: Coin Flip System
- UI to view queue
- Edit queue
- Refill when empty
- Log flips

### Task 17: Pause/Resume/Edit Mid-Game
- Edit mode toggle
- Click to edit HP/energy
- Validate edits
- Resume from edit

### Task 18: i18n Support
- Load translations
- Replace hardcoded strings
- Language switcher
- Test both languages

### Task 19: Polish + Edge Cases
- Better error messages
- Loading states
- Empty state placeholders
- Edge case testing

---

## Tips for Success

### Debugging
- Use `console.log(state)` liberally
- Chrome DevTools is your friend
- Test with simple scenarios first

### Git Workflow
```bash
git checkout -b feature/task-5-game-state
# ... make changes
git add .
git commit -m "Implement game state model (Task 5)"
git push origin feature/task-5-game-state
```

### Testing Approach
1. Write scenario JSON
2. Load it
3. Take action
4. Check resulting state
5. Fix bugs
6. Repeat

### When Stuck
1. Re-read ARCHITECTURE.md
2. Check campo.html reference
3. Console log everything
4. Create minimal reproduction
5. Ask for help with specific error

---

## Next Steps

After completing these tasks, the simulator will be fully functional for basic gameplay. Future work:
- Implement more card effects
- Add AI opponent
- Build deck editor
- Add animations
- Mobile optimization

**Good luck, and have fun building!** 🎮✨
