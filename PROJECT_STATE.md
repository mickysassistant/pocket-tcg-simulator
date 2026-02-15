# PROJECT_STATE - Pokemon TCG Pocket Simulator

This file tracks the current state of the Pokemon TCG Pocket Simulator project.

## Project Overview

**Goal:** Create a browser-based battle simulator for Pokemon TCG Pocket where users can configure battle scenarios, watch simulations run, control both players (sandbox mode), pause mid-game to modify board state, and export/import scenarios as JSON.

**Tech Stack:** Vanilla HTML/CSS/JS - No frameworks, no build step
**Served locally:** `npx serve -l 3000`
**Target URL:** http://192.168.0.29:3000

## Current Status

### Phase: Initial Setup

**Completion:** 90% (18/20 tasks complete)

### Completed Tasks
- ✅ T01: Project Setup + Serve Locally (2026-02-11)
- ✅ T02: Load Card Data from JSON (2026-02-11)
- ✅ T03: Render Empty Battlefield (2026-02-11)
- ✅ T04: Render Cards with Real Images (2026-02-11)
- ✅ T05: Implement Game State Model (2026-02-11)
- ✅ T06: Implement Scenario Load/Save + Editor UI (2026-02-11)
- ✅ T07: Implement Turn Flow (2026-02-11)
- ✅ T08: Drag & Drop (2026-02-11)
- ✅ T09: Damage Calculation + Weakness (2026-02-11)
- ✅ T10: Status Effects + Pokemon Checkup (2026-02-11)
- ✅ T11: Evolution (2026-02-11)
- ✅ T12: Trainers - Items + Supporters (2026-02-11)
- ✅ T13: Abilities (2026-02-11)
- ✅ T14: Win Conditions + Points (2026-02-11)
- ✅ T15: Action Log Panel (2026-02-11)
- ✅ T16: Coin Flip System (2026-02-11)

### In Progress Tasks
None yet.

### Blocked Tasks
None yet.

### Next Task
**T19a:** Better Error Messages

**Previous Task:** ✅ T18 - i18n Support (Completed 2026-02-11)

**Previous Task:** ✅ T18 - i18n Support (Completed 2026-02-11)
- Created translation helper function t() with parameter support
- Translated all hardcoded strings in JavaScript:
  - Alert messages (gameOver, errors, validations)
  - Log messages (turn headers, export format)
  - UI elements (empty slot, unknown card, edit modal labels)
- Updated HTML with data-i18n attributes for static elements
- Implemented dynamic select options update for status and energy types
- Language switcher button (🌐 ES/EN) toggles between Spanish and English
- All translations load from js/i18n/es.json and js/i18n/en.json
- 110 automated tests (test-t18.mjs), 5 browser tests (test-t18.html)
- All tests pass (100% success rate)

## Project Structure

```
pocket-tcg-simulator/
├── index.html          ✅ Exists
├── package.json        ✅ Exists
├── SPEC.md             ✅ Exists
├── DEVGUIDE.md         ✅ Exists
├── ARCHITECTURE.md     ✅ Exists
├── TODO.md             ✅ Created
├── PROJECT_STATE.md    ✅ Created
├── AGENT.md            ✅ Created
├── css/                ⬜ To create
│   ├── battlefield.css
│   ├── log.css
│   └── dialogs.css
├── js/                 ⬜ To create
│   ├── main.js
│   ├── i18n/
│   │   ├── es.json
│   │   └── en.json
│   ├── data/
│   │   └── card-loader.js
│   └── engine/
│       ├── constants.js
│       └── game-state.js
├── data/               ⬜ To create (symlink to ../pocket-tcg-pocket-research/data/limitless/raw)
└── scenarios/          ⬜ To create
```

## Current File Status

### Existing Files
- ✅ `index.html` - Complete HTML structure with battlefield, log, controls, modals
- ✅ `package.json` - Contains serve script
- ✅ `SPEC.md` - Complete specification
- ✅ `DEVGUIDE.md` - 19 tasks documented
- ✅ `ARCHITECTURE.md` - Architecture documentation
- ✅ `TODO.md` - Task list (T01-T18, T19a-d)
- ✅ `PROJECT_STATE.md` - This file
- ✅ `AGENT.md` - AI agent instructions
- ✅ `css/battlefield.css` - Basic battlefield + card rendering styles (Task 04 complete, Task 06 updated)
- ✅ `css/log.css` - Action log panel styles
- ✅ `css/dialogs.css` - Modals and controls styles
- ✅ `js/main.js` - Main entry point with card loading + card rendering + scenario load/save (Task 06 complete)
- ✅ `js/i18n/es.json` - Spanish translations
- ✅ `js/i18n/en.json` - English translations
- ✅ `js/data/card-loader.js` - Card loading and query functions
- ✅ `js/engine/constants.js` - Game constants (Task 05 complete)
- ✅ `js/engine/game-state.js` - State management and validation (Task 05 complete)
- ✅ `css/` directory created
- ✅ `js/` directory created
- ✅ `js/i18n/` directory created
- ✅ `js/data/` directory created
- ✅ `js/engine/` directory created
- ✅ `scenarios/` directory created
- ✅ `data/` (symlink to card data from ../pocket-tcg-pocket-research/data/limitless/raw)
- ✅ `test-t02.html` - Browser-based test for card loading
- ✅ `test-t02.mjs` - Node.js test file for card loader
- ✅ `test-card-loader.mjs` - Node.js test file for card loader (reference)
- ✅ `test-t03-battlefield.mjs` - Automated test for battlefield rendering
- ✅ `test-t04.html` - Browser-based test for card rendering
- ✅ `test-t04.mjs` - Node.js test file (for reference only)
- ✅ `test-t05.html` - Browser-based test for game state model
- ✅ `test-t05.mjs` - Node.js test file for game state model
- ✅ `test-t06.html` - Browser-based test for scenario load/save
- ✅ `test-t06-basic.json` - Example scenario for testing
- ✅ `T02-COMPLETION.md` - Task 2 completion report
- ✅ `T05-COMPLETION.md` - Task 5 completion report
- ✅ `T06-COMPLETION.md` - Task 6 completion report
- ✅ `test-t14.html` - Browser-based test for win conditions
- ✅ `test-t14.mjs` - Node.js automated test for win conditions
- ✅ `test-t15.html` - Browser-based test for action log panel
- ✅ `test-t15.mjs` - Node.js automated test for action log panel
- ✅ `test-t18.html` - Browser-based test for i18n support
- ✅ `test-t18.mjs` - Node.js automated test for i18n support

### Missing Files
- ⬜ None (all required files created)

## Next Steps

**Current Task:** T19a - Better Error Messages

**Previous Task:** ✅ T18 - i18n Support (Completed 2026-02-11)
- Created translation helper function t(key, params) with template parameter support
- Translated all hardcoded strings in JavaScript:
  - Alert messages (gameOver, errors, validations)
  - Log messages (turn headers, export format)
  - UI elements (empty slot, unknown card, edit modal labels)
- Updated HTML with data-i18n attributes for static elements
- Implemented dynamic select options update for status and energy types
- Language switcher button (🌐 ES/EN) toggles between Spanish and English
- All translations load from js/i18n/es.json and js/i18n/en.json
- Translation categories:
  - game: UI labels (turn, points, player names, attacks)
  - ui: Button labels (play, pause, step, speed, load/save scenario, edit mode)
  - edit: Edit modal (title, hp, status, energy, location)
  - status: Status effects (poison, poison+, burn, sleep, paralysis, confusion)
  - energyTypes: Energy type names (Grass/Planta, Fire/Fuego, Water/Agua, etc.)
  - alerts: Alert and error messages (with parameter support)
  - log: Log export format and headers
- 110 automated tests (test-t18.mjs), 5 browser tests (test-t18.html)
- All tests pass (100% success rate)
- All success criteria met
- Edit mode toggle (Edit Mode button toggles visual edit mode)
- Click any Pokemon on Active/Bench to open edit modal
- Edit HP (validated: non-negative, ≤ max HP), energy (add/remove), status
- Remove Pokemon from field
- All edits logged to action log
- Resume preserves edited state
- 14 automated tests (test-t17.mjs), 12 browser tests (test-t17.html)

**Previous Task:** ✅ T16 - Coin Flip System (Completed 2026-02-11)
- Color-coded entries (damage, healing, status, card, ability)
- Turn grouping with turn headers
- Export as text file
- Auto-scroll to bottom

**Completed Tasks:**
- ✅ T01: Project Setup + Serve Locally
  - Created directory structure
  - Created basic CSS files (battlefield.css, log.css, dialogs.css)
  - Created i18n files (es.json, en.json)
  - Created basic main.js with i18n support
  - Verified server runs on http://localhost:3000
  - All resources return 200 status code

- ✅ T02: Load Card Data from JSON
  - Created symlink to card data (data/ -> ../pocket-tcg-pocket-research/data/limitless/raw)
  - Created js/data/card-loader.js with full API:
    - loadCards() - loads 14 sets, 2418 total cards
    - getCard() - retrieve card by ID
    - getCardImage() - get card image URL
    - getCardCount() - get total cards loaded
    - getAllCards() - get all cards as array
    - getCardsBySet() - filter by set ID
    - searchCardsByName() - search by name
    - getCardsByType() - filter by type

**Completed Tasks:**
- ✅ T01: Project Setup + Serve Locally
  - Created directory structure
  - Created basic CSS files (battlefield.css, log.css, dialogs.css)
  - Created i18n files (es.json, en.json)
  - Created basic main.js with i18n support
  - Verified server runs on http://localhost:3000
  - All resources return 200 status code

- ✅ T02: Load Card Data from JSON
  - Created symlink to card data (data/ -> ../pocket-tcg-pocket-research/data/limitless/raw)
  - Created js/data/card-loader.js with full API:
    - loadCards() - loads 14 sets, 2418 total cards
    - getCard() - retrieve card by ID
    - getCardImage() - get card image URL
    - getCardCount() - get total cards loaded
    - getAllCards() - get all cards as array
    - getCardsBySet() - filter by set ID
    - searchCardsByName() - search by name
    - getCardsByType() - filter by type
  - Updated js/main.js to load and test cards
  - Created test-t02.html for manual testing
  - Created test-card-loader.mjs for automated testing
  - Verified 2418 cards load successfully:
    - 2206 Pokémon cards
    - 212 Trainer cards
    - 0 Energy cards (none in the sets)
  - All tests pass

- ✅ T03: Render Empty Battlefield
  - Verified complete HTML structure with all zones:
    - Player 1 & 2: active, bench (3 slots), hand, deck, discard, energy
    - Center zone: active zones for both players, stadium zone
  - Verified CSS styling for visibility:
    - All zones have visible borders (dashed, 2px, 30-50% opacity)
    - Player zones have gradient backgrounds
    - Active zone has higher opacity border for emphasis
  - Verified responsive layout:
    - Uses flexbox for flexible positioning
    - Relative units (vh/vw) for viewport-based sizing
    - Action log as separate aside (300px fixed width)
  - Verified action log scrollability:
    - Separate aside container
    - Overflow-y: auto on log-entries
    - Custom scrollbar styling
  - Created automated test: test-t03-battlefield.mjs
  - All 32 tests pass

- ✅ T04: Render Cards with Real Images
  - Added renderPokemon() function to js/main.js
  - Implemented card rendering with:
    - Pokemon card image from Limitless CDN
    - HP badge (current/max HP) with green gradient
    - Energy display (colored circles for each energy type)
    - Status badge (poison, burn, sleep, paralysis, confusion)
    - Empty slot placeholder
  - Added CSS styles to battlefield.css:
    - .pokemon-card with hover effects
    - .hp-badge with gradient background
    - .energy-display with type-specific colors (G, R, W, L, P, F, D, M, C)
    - .status-badge with condition-specific colors
    - .empty-slot placeholder
  - Energy type colors implemented:
    - Grass (G): Green gradient
    - Fire (R): Orange-red gradient
    - Water (W): Blue gradient
    - Lightning (L): Yellow gradient
    - Psychic (P): Purple gradient
    - Fighting (F): Brown gradient
    - Darkness (D): Gray-blue gradient
    - Metal (M): Gray gradient
    - Colorless (C): Gold gradient
  - Status badge colors implemented:
    - Poison: Purple gradient
    - Burn: Orange-red gradient
    - Sleep: Gray gradient
    - Paralysis: Yellow gradient (dark text)
    - Confusion: Pink gradient
  - Created browser-based test: test-t04.html
  - Tests verify:
    - Card loading from CDN
    - HP badge display
    - Energy display with correct types
    - Empty slot placeholder
    - Status badge rendering

- ✅ T05: Implement Game State Model
  - Created js/engine/constants.js with:
    - Game constants (MAX_BENCH=3, MAX_HAND=10, DECK_SIZE=20, POINTS_TO_WIN=3, TURN_LIMIT=30)
    - ENERGY_TYPES mapping (G, R, W, L, P, F, D, M, C)
    - STATUS constants (poison, poison+, burn, sleep, paralysis, confusion)
    - STATUS_CHECKUP_ORDER (order for checkup resolution)
    - STATUS_DAMAGE values (poison=10, poison+=20, burn=20)
    - KO_POINTS (NORMAL=1, EX=2)
    - Other utility constants
  - Created js/engine/game-state.js with:
    - createInitialState() - creates fresh game state with players, coin queue, empty board
    - createPlayer() - creates empty player state (0 points, empty arrays, flags)
    - createPokemon() - creates Pokemon instance with cardId, turnPlayed, default values
    - cloneState() - deep clones state for immutability
    - validateState() - validates entire state structure and constraints
    - validatePlayer() - validates player state (bench size, hand size, etc.)
    - validatePokemon() - validates Pokemon state (HP, energy array, status, etc.)
    - validateEnergyZone() - validates energy zone structure
    - isValidState() - quick validation check
    - addLogEntry() - adds entry to action log with timestamp, turn, player
    - exportState() - creates clean state for scenario export (removes metadata)
  - Validation checks:
    - Version compatibility
    - Turn number (non-negative)
    - Current player (player1 or player2)
    - Coin queue (array of booleans)
    - Player constraints:
      - Points: non-negative
      - Bench: max 3 Pokemon
      - Hand: max 10 cards
      - Deck: max 20 cards
      - Active Pokemon: valid structure
      - Energy Zone: valid structure
      - Boolean flags: correct types
    - Pokemon constraints:
      - cardId: string
      - currentHp: non-negative number
      - energy: array
      - status: string or null
      - turnPlayed: non-negative number
  - Created test-t05.html for browser-based testing
  - Created test-t05.mjs for automated Node.js testing
  - All 86 tests pass:
    - Test 1: createInitialState() - 22 tests
    - Test 2: createPlayer() - 15 tests
    - Test 3: createPokemon() - 11 tests
    - Test 4: cloneState() - 11 tests
    - Test 5: validateState() - 8 tests
    - Test 6: SPEC.md Format Compliance - 19 tests
  - State structure matches SPEC.md format exactly
  - All success criteria met

- ✅ T06: Implement Scenario Load/Save + Editor UI
  - Added scenario modal HTML to index.html (already present)
  - Added load/save/edit functions to main.js:
    - loadScenario(json) - parses JSON, validates, loads state
    - saveScenario() - exports state as downloadable JSON file
    - openScenarioEditor() - opens modal with current state
  - Wired up all buttons:
    - Load Scenario - opens file picker
    - Save Scenario - downloads JSON file
    - Edit Mode - opens editor modal
    - Apply (in modal) - applies edited JSON
    - Cancel (in modal) - closes modal
    - Language switcher - toggles ES/EN
    - Modal overlay - click outside to close
  - Added render functions:
    - render(state) - main render function
    - renderPlayer(player, playerId) - renders player zones
    - renderStadium(stadium) - renders stadium card
    - renderLog(log) - renders action log
  - Updated HTML structure:
    - Added data-player attributes to bench-slot elements
  - Added CSS:
    - .pokemon-card.mini for hand cards (70x100px)
    - .pokemon-card.stadium for stadium cards (90x130px)
  - Created test-t06.html with 20 automated tests:
    - State creation and cloning
    - JSON serialization/deserialization
    - Validation (bench, hand, deck sizes)
    - Pokemon validation (HP, energy, status)
    - Energy zone validation
    - Status effects validation
    - Full board scenarios
    - KO scenarios
  - Created test-t06-basic.json example scenario
  - All 20 tests pass
  - Manual testing verified:
    - Save scenario downloads JSON
    - Load scenario imports and validates
    - Edit modal allows JSON modification
    - Validation catches errors
  - All success criteria met

**Completed Tasks:**
- ✅ T01: Project Setup + Serve Locally
  - Created directory structure
  - Created basic CSS files (battlefield.css, log.css, dialogs.css)
  - Created i18n files (es.json, en.json)
  - Created basic main.js with i18n support
  - Verified server runs on http://localhost:3000
  - All resources return 200 status code

- ✅ T02: Load Card Data from JSON
  - Created symlink to card data (data/ -> ../pocket-tcg-pocket-research/data/limitless/raw)
  - Created js/data/card-loader.js with full API:
    - loadCards() - loads 14 sets, 2418 total cards
    - getCard() - retrieve card by ID
    - getCardImage() - get card image URL
    - getCardCount() - get total cards loaded
    - getAllCards() - get all cards as array
    - getCardsBySet() - filter by set ID
    - searchCardsByName() - search by name
    - getCardsByType() - filter by type
  - Updated js/main.js to load and test cards
  - Created test-t02.html for manual testing
  - Created test-card-loader.mjs for automated testing
  - Verified 2418 cards load successfully:
    - 2206 Pokémon cards
    - 212 Trainer cards
    - 0 Energy cards (none in the sets)
  - All tests pass

- ✅ T03: Render Empty Battlefield
  - Verified complete HTML structure with all zones:
    - Player 1 & 2: active, bench (3 slots), hand, deck, discard, energy
    - Center zone: active zones for both players, stadium zone
  - Verified CSS styling for visibility:
    - All zones have visible borders (dashed, 2px, 30-50% opacity)
    - Player zones have gradient backgrounds
    - Active zone has higher opacity border for emphasis
  - Verified responsive layout:
    - Uses flexbox for flexible positioning
    - Relative units (vh/vw) for viewport-based sizing
    - Action log as separate aside (300px fixed width)
  - Verified action log scrollability:
    - Separate aside container
    - Overflow-y: auto on log-entries
    - Custom scrollbar styling
  - Created automated test: test-t03-battlefield.mjs
  - All 32 tests pass

- ✅ T04: Render Cards with Real Images
  - Added renderPokemon() function to js/main.js
  - Implemented card rendering with:
    - Pokemon card image from Limitless CDN
    - HP badge (current/max HP) with green gradient
    - Energy display (colored circles for each energy type)
    - Status badge (poison, burn, sleep, paralysis, confusion)
    - Empty slot placeholder
  - Added CSS styles to battlefield.css:
    - .pokemon-card with hover effects
    - .hp-badge with gradient background
    - .energy-display with type-specific colors (G, R, W, L, P, F, D, M, C)
    - .status-badge with condition-specific colors
    - .empty-slot placeholder
  - Energy type colors implemented:
    - Grass (G): Green gradient
    - Fire (R): Orange-red gradient
    - Water (W): Blue gradient
    - Lightning (L): Yellow gradient
    - Psychic (P): Purple gradient
    - Fighting (F): Brown gradient
    - Darkness (D): Gray-blue gradient
    - Metal (M): Gray gradient
    - Colorless (C): Gold gradient
  - Status badge colors implemented:
    - Poison: Purple gradient
    - Burn: Orange-red gradient
    - Sleep: Gray gradient
    - Paralysis: Yellow gradient (dark text)
    - Confusion: Pink gradient
  - Created browser-based test: test-t04.html
  - Tests verify:
    - Card loading from CDN
    - HP badge display
    - Energy display with correct types
    - Empty slot placeholder
    - Status badge rendering

- ✅ T05: Implement Game State Model
  - Created js/engine/constants.js with:
    - Game constants (MAX_BENCH=3, MAX_HAND=10, DECK_SIZE=20, POINTS_TO_WIN=3, TURN_LIMIT=30)
    - ENERGY_TYPES mapping (G, R, W, L, P, F, D, M, C)
    - STATUS constants (poison, poison+, burn, sleep, paralysis, confusion)
    - STATUS_CHECKUP_ORDER (order for checkup resolution)
    - STATUS_DAMAGE values (poison=10, poison+=20, burn=20)
    - KO_POINTS (NORMAL=1, EX=2)
    - Other utility constants
  - Created js/engine/game-state.js with:
    - createInitialState() - creates fresh game state with players, coin queue, empty board
    - createPlayer() - creates empty player state (0 points, empty arrays, flags)
    - createPokemon() - creates Pokemon instance with cardId, turnPlayed, default values
    - cloneState() - deep clones state for immutability
    - validateState() - validates entire state structure and constraints
    - validatePlayer() - validates player state (bench size, hand size, etc.)
    - validatePokemon() - validates Pokemon state (HP, energy array, status, etc.)
    - validateEnergyZone() - validates energy zone structure
    - isValidState() - quick validation check
    - addLogEntry() - adds entry to action log with timestamp, turn, player
    - exportState() - creates clean state for scenario export (removes metadata)
  - Validation checks:
    - Version compatibility
    - Turn number (non-negative)
    - Current player (player1 or player2)
    - Coin queue (array of booleans)
    - Player constraints:
      - Points: non-negative
      - Bench: max 3 Pokemon
      - Hand: max 10 cards
      - Deck: max 20 cards
      - Active Pokemon: valid structure
      - Energy Zone: valid structure
      - Boolean flags: correct types
    - Pokemon constraints:
      - cardId: string
      - currentHp: non-negative number
      - energy: array
      - status: string or null
      - turnPlayed: non-negative number
  - Created test-t05.html for browser-based testing
  - Created test-t05.mjs for automated Node.js testing
  - All 86 tests pass:
    - Test 1: createInitialState() - 22 tests
    - Test 2: createPlayer() - 15 tests
    - Test 3: createPokemon() - 11 tests
    - Test 4: cloneState() - 11 tests
    - Test 5: validateState() - 8 tests
    - Test 6: SPEC.md Format Compliance - 19 tests
  - State structure matches SPEC.md format exactly
  - All success criteria met

- ✅ T10: Status Effects + Pokemon Checkup
  - Corrected Paralysis behavior: auto-cures after 1 turn (without coin flip)
  - Verified all status effects work correctly:
    - Poison: applies 10 damage per checkup
    - Poison+ (Toxic): applies 20 damage per checkup
    - Burn: applies 20 damage + coin flip (heads = cures)
    - Sleep: coin flip (heads = wakes up)
    - Paralysis: auto-cures after 1 turn
  - Pokemon Checkup process:
    - Processes active and bench Pokemon at end of turn
    - Resolves status effects in order: Poison → Burn → Sleep → Paralysis
    - Handles KO during checkup (awards points to opponent)
  - Created test-t10.html for browser-based testing
  - Created test-t10.mjs for automated Node.js testing
  - All 30 tests pass:
    - Test 1: Poison damage (2 assertions)
    - Test 2: Poison+ damage (2 assertions)
    - Test 3: Burn damage + heads cure (3 assertions)
    - Test 4: Burn damage + tails remain (3 assertions)
    - Test 5: Sleep cures on heads (2 assertions)
    - Test 6: Sleep remains on tails (2 assertions)
    - Test 7: Paralysis auto-cure (2 assertions)
    - Test 8: KO from Poison (2 assertions)
    - Test 9: KO from Burn (2 assertions)
    - Test 10: Multiple Pokemon processed (3 assertions)
    - Test 11: No status - no changes (2 assertions)
    - Test 12: Checkup log entry created (2 assertions)
    - Test 13: Empty bench handled (2 assertions)
    - Test 14: State validation after checkup (1 assertion)
  - All success criteria met

- ✅ T14: Win Conditions + Points
  - Updated checkWinCondition() to handle:
    - 3 points win condition (primary)
    - Simultaneous KO (both reach 3 points at same time)
    - Turn limit tie-breaker (at turn 30)
  - Simultaneous KO handling:
    - If both have bench Pokemon → draw
    - If only one has bench → that player wins
    - If neither has bench → draw
  - Turn limit tie-breaker:
    - At turn 30, player with more points wins
    - Equal points → draw
  - Updated endTurn() to handle 'tie' winner case
  - Exported handleKOPokemon() for testing
  - Added TURN_LIMIT import to constants
  - Created hasBenchPokemon() helper function
  - Created test-t14.html for browser-based testing
  - Created test-t14.mjs for automated Node.js testing
  - All 22 tests pass:
    - Test 1: Points Awarded on KO (normal Pokemon) - 3 assertions
    - Test 2: Points Awarded on KO (EX Pokemon) - 2 assertions
    - Test 3: 3 Points Win Condition - 1 assertion
    - Test 4: No Winner Before 3 Points - 1 assertion
    - Test 5: Simultaneous KO - Player1 Has Bench - 1 assertion
    - Test 6: Simultaneous KO - Player2 Has Bench - 1 assertion
    - Test 7: Simultaneous KO - Both Have Bench (Draw) - 1 assertion
    - Test 8: Simultaneous KO - Neither Has Bench (Draw) - 1 assertion
    - Test 9: Turn Limit - Player1 Has More Points - 1 assertion
    - Test 10: Turn Limit - Player2 Has More Points - 1 assertion
    - Test 11: Turn Limit - Equal Points (Draw) - 1 assertion
    - Test 12: Before Turn Limit - No Winner - 1 assertion
    - Test 13: Game Over Logging (Tie) - 3 assertions
    - Test 14: Game Over Logging (Winner) - 4 assertions
  - All success criteria met

## Environment

**Node version:** v22.22.0
**OS:** Linux 6.14.0-37-generic (x64)
**Workspace:** /home/deckie/.openclaw/workspace/pocket-tcg-simulator/

## Development Notes

### Key Design Decisions
- **Phase 1:** Sandbox mode only (user controls both players)
- **Unknown Rules:** Use baseline TCG rules, flag with `// TODO-Pocket-Verify`
- **No Build Step:** Pure ES modules, served with npx serve
- **State Machine:** Pure functions, immutable state where possible
- **UI Follows State:** Render from state, don't manipulate DOM directly

### Cron Job Configuration
- **Job ID:** 74b32d92-1e7a-4da8-917d-6a4f02abe04f
- **Name:** Pokemon Simulator Development
- **Model:** Uses configured model for isolated session
- **Delivery:** announce → telegram
- **Frequency:** Runs periodically (check schedule in cron list)

### Testing Approach
- Create scenario JSONs for edge cases
- Test with each task completion
- CI tests required for each task

## Known Issues

None yet.

## Dependencies

**External:**
- Card data from Limitless CDN
- Symlink to `../pocket-tcg-pocket-research/data/limitless/raw/`

**NPM packages:**
- `serve` (for local development)

## Version History

- **v0.2.0** - Empty battlefield rendering (2026-02-11)
- **v0.1.0** - Initial project setup (2026-02-11)
