# Pokemon TCG Pocket Battle Simulator - Specification

## Core Concept

A browser-based battle simulator for Pokemon TCG Pocket where users can:
- Configure a battle scenario (or start from setup)
- Hit play and watch the simulation run
- Control BOTH players (sandbox mode - AI and PvP come later)
- Pause mid-game, modify board state, and resume
- Export/import scenarios as JSON

## Tech Stack

**Vanilla HTML/CSS/JS** - No frameworks, no build step
- Served locally with `npx serve`
- ES modules for code organization
- JSDoc for type hints
- Desktop-first, prepared for mobile

## Key Design Decisions

### Phase 1: Sandbox Mode
- User controls both players manually
- No AI opponent (coming in later phases)
- No PvP networking (coming in later phases)
- Focus: accurate game engine + UI for testing mechanics

### Unknown Rules Handling
- Use baseline TCG rules for unknowns
- Flag them clearly in code comments for later correction
- Prioritize getting a working simulator over perfect accuracy

### Deck Management
- Decks hardcoded for now (2-3 sample decks)
- Deck builder screen comes later
- Focus on battle mechanics first

### Coin Flip System
- Pre-generate 10 coins at game start
- User can configure coin results before/during game
- Queue-based: use coins in order, refill when exhausted
- UI shows next 3 coins in queue

### Scenario System
- User can pause mid-game, edit board state (HP, energy, status, etc.)
- Resume from any point
- Export/import as JSON for testing specific situations
- Scenario editor UI with form controls

### Card Images
- Real card images from Limitless CDN
- Format: `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/{setId}/{setId}_{number}_EN.png`
- Number padded to 3 digits (e.g., `A1_001_EN.png`)
- Fallback placeholder for missing images

### Internationalization
- Spanish (default) + English
- Simple key-value JSON files (`es.json`, `en.json`)
- No ICU/complex formatting needed yet
- Language switcher in UI

### Action Log
- Panel on right side showing everything that happened
- Each turn's actions grouped together
- Color-coded by type (damage, healing, status, etc.)
- Auto-scroll to latest
- Exportable as text

### Layout
- Desktop-first: 16:9 landscape preferred
- Battlefield in center (portrait-oriented game board)
- Action log panel on right
- Control buttons at bottom
- Prepared for mobile: responsive breakpoints defined (implementation later)

---

## Game Mechanics (Pokemon TCG Pocket Rules)

### Deck & Setup
- **Deck size:** 20 cards
- **Max copies:** 2 per card name
- **Starting hand:** 5 cards (always contains at least 1 Basic Pokemon - no mulligans)
- **Hand limit:** 10 cards max
- **Bench limit:** 3 Pokemon max

### Start-of-Game Setup

The simulator supports three distinct game start modes, each with specific initialization rules:

#### Mode 1: App Boot → Empty State (Fresh Startup)

**When it occurs:** Application first launches or when user explicitly creates a fresh game state without deck data.

**Purpose:** Provides a blank canvas for manual setup, scenario editing, or testing custom configurations.

**Initialization Process:**
- Called via: `createInitialState()` in `js/engine/game-state.js`
- No deck data is loaded
- No Pokemon are placed on the field

**Explicit Board State Rules:**
- **Active Pokemon:** `null` for both players (no Pokemon in active spot)
- **Bench:** Empty array (0/3 slots filled) for both players
- **Hand:** Empty array (0 cards) for both players
- **Deck:** Empty array (0 cards) for both players
- **Discard Pile:** Empty array (0 cards) for both players
- **Energy Zone:**
  - `currentEnergy`: `null`
  - `nextEnergy`: `null`
  - `configuredTypes`: Empty array `[]`
  - `usedThisTurn`: `false`
- **Turn State:**
  - `turn`: `0` (pre-game state)
  - `currentPlayer`: `'player1'`
- **Coin Queue:** Pre-generated with 10 random coin flips (array of booleans)
- **Stadium:** `null`
- **Turn Effects:** Empty array `[]`
- **Log:** Empty array `[]`

**Validation:** Empty state always passes `isValidState()` validation.

**Usage Patterns:**
- User manually adds cards via drag-and-drop UI
- User enters Edit Mode to configure board state manually
- User loads a scenario JSON to populate state
- User clicks "New Game" to start from deck presets (transitions to Mode 2)

---

#### Mode 2: New Game from Deck Presets

**When it occurs:** User selects deck presets for both players via "New Game" modal and confirms start.

**Purpose:** Start a competitive game with properly configured decks following Pocket TCG rules.

**Initialization Process:**
- Called via: `startNewGameFromPresets(deckId1, deckId2)` in `js/main.js`
- Deck presets are loaded from `js/data/deck-presets.js`
- Each player's state is built via `buildPlayerFromPreset(preset, turnPlayed)`

**Explicit Board State Setup Rules:**

1. **Deck Shuffling:**
   - Each player's 20-card deck is shuffled using Fisher-Yates algorithm
   - `TODO-Pocket-Verify: Does official Pokemon TCG Pocket shuffle before placing active/bench?`
   - Current implementation: Shuffles before selecting active/bench cards

2. **Active Pokemon Selection:**
   - First Basic Pokemon (as defined by `isBasicPokemonCard()`) in the shuffled deck is placed in active spot
   - The Basic Pokemon is removed from the deck after selection
   - Active Pokemon's `currentHp` is set to the card's full HP value
   - Active Pokemon's `turnPlayed` is set to `0`

3. **Bench Pokemon Placement:**
   - Up to 3 additional Basic Pokemon are placed on bench
   - Selection order: First 3 Basic Pokemon in the remaining shuffled deck (after removing active)
   - Each bench Pokemon is removed from the deck
   - Bench Pokemon's `currentHp` is set to the card's full HP value
   - `TODO-Pocket-Verify: Does official Pocket place exactly 3 basics, or up to 3 basics on bench?`
   - `TODO-Pocket-Verify: In official Pocket, are bench Pokemon placed in deck order or shuffled order?`
   - Current implementation: Up to 3 basics, in shuffled order

4. **Hand Dealing:**
   - Exactly 5 cards are dealt from the remaining deck to hand
   - Cards are taken from the top of the deck (indices 0-4 after removing active and bench)
   - `TODO-Pocket-Verify: What is the official hand size in Pokemon TCG Pocket?`
   - Current assumption: 5 cards

5. **Remaining Deck:**
   - All remaining cards (after active, bench, and hand) stay in deck
   - Deck count should be: `20 - 1 (active) - benchCount - 5 (hand)`
   - Minimum deck after setup: `20 - 1 - 3 - 5 = 11 cards` (if 3 basics placed on bench)

6. **Energy Zone Configuration:**
   - `configuredTypes`: Set to the deck preset's `energyTypes` array (up to 3 types)
   - `currentEnergy`: Set to `energyTypes[0]` (first energy type from preset)
   - `nextEnergy`: Set to `energyTypes[1]` or falls back to `energyTypes[0]` if only one type
   - `usedThisTurn`: `false`
   - `TODO-Pocket-Verify: Does Energy Zone start with energy ready on turn 1 in official Pocket?`
   - Current implementation: Yes, `currentEnergy` is pre-filled

7. **Turn State:**
   - `turn`: `1` (first turn)
   - `currentPlayer`: `'player1'` (player1 goes first)

8. **Coin Queue:**
   - Pre-generated with 10 random coin flips (array of booleans)

9. **Other Fields:**
   - `points`: `0` for both players
   - `stadium`: `null`
   - `turnEffects`: Empty array `[]`
   - `log`: Initial log entry indicating game start

**Validation Requirements:**
- Deck preset must contain exactly 20 cards
- Deck preset must contain at least 1 Basic Pokemon (active Pokemon required)
- Deck preset must respect max copies rule (2 per card name)
- All cards in preset must exist in card database

**First Turn Rules (Player 1 - Going First):**
- Does NOT draw a card at turn start (draw phase is skipped)
- Cannot attach energy from Energy Zone
- Cannot evolve any Pokemon (evolution ban applies to both players on turn 1)
- CAN use Supporter cards (different from physical TCG rules)

---

#### Mode 3: Scenario Load

**When it occurs:** User loads a saved scenario JSON file via "Load Scenario" button or applies scenario via Scenario Editor modal.

**Purpose:** Restore a custom game state for testing specific situations or resuming a saved game.

**Initialization Process:**
- Called via: `loadScenario(jsonString)` in `js/main.js`
- Scenario JSON is parsed from string
- Loaded state is validated via `isValidState(state)`
- If valid, current state is completely replaced with loaded scenario

**Explicit Board State Rules:**
- **Full Override:** Scenario data completely replaces current state (no merge with existing state)
- **Exact Restoration:** All fields from scenario are applied exactly as saved, including:
  - Turn number and current player
  - All Pokemon states (active, bench, hand, deck, discard)
  - Energy Zone configuration
  - Stadium card
  - Turn effects
  - Action log history
  - Points for both players
  - All Pokemon state: HP, energy, status, tools, effects, turnPlayed, lastEvolved

**Validation Requirements:**
- Scenario must have `version: 1` (or current supported version)
- All required fields must be present
- Deck sizes must be valid (0-20 cards per zone)
- Bench cannot exceed 3 Pokemon per player
- Hand cannot exceed 10 cards per player
- All card IDs must exist in card database
- Energy types must be valid constants from `ENERGY_TYPES`
- Status values must be valid constants from `STATUS`
- Turn must be within valid range (0-30 or higher for custom scenarios)

**Backward Compatibility:**
- Scenario format version 1 is always supported
- Future versions will include migration logic if format changes

**Usage Patterns:**
- User loads pre-configured test scenarios (e.g., `scenarios/demo-start-game.json`)
- User exports current state, modifies it, and re-imports it
- User shares scenarios with other players for testing

---

#### State Transition Summary

| Transition | Method | Description |
|-----------|--------|-------------|
| Fresh Startup → Empty State | `createInitialState()` | Creates blank state with no cards |
| New Game Click → Deck Select Modal | `openNewGameModal()` | Opens modal to select deck presets |
| Deck Select → Populated Game | `startNewGameFromPresets()` | Builds game state from selected decks |
| Load Scenario Click → File Select | (UI event) | Opens file picker for JSON scenario |
| Scenario Load → Custom State | `loadScenario()` | Validates and applies scenario |
| Edit Mode Toggle | `toggleEditMode()` | Enables manual state modification |
| Scenario Editor Apply | `loadScenario()` | Validates and applies edited scenario |

---

#### Critical Implementation Notes

**Full-Board Population Rules:**
- **DO NOT auto-populate full board on app boot** (Mode 1)
- **DO NOT auto-populate full board on fresh state creation**
- **FULL-BOARD POPULATION ONLY OCCURS** when:
  - Loading a scenario JSON that includes populated slots (Mode 3)
  - Building game state from deck presets (Mode 2) - which populates based on deck contents

**Common Confusions to Avoid:**
- "New Game" button does NOT create an empty state → It creates a populated game from deck presets (Mode 2)
- "App boot" does NOT start with full board → It starts with empty state (Mode 1) requiring user action
- "Scenario load" does NOT merge with existing state → It completely replaces state (Mode 3)

**Unknowns Requiring Verification:**
1. `TODO-Pocket-Verify: Deck shuffling order` - Does official Pocket shuffle before or after selecting active/bench?
2. `TODO-Pocket-Verify: Bench count expectation` - Does official Pocket place exactly 3 basics or up to 3 basics?
3. `TODO-Pocket-Verify: Hand size` - What is the official hand size in Pokemon TCG Pocket? (Current assumption: 5)
4. `TODO-Pocket-Verify: Energy Zone initial state` - Does Energy Zone start with energy ready on turn 1 in official Pocket?
5. `TODO-Pocket-Verify: Basic Pokemon detection` - How does official Pocket determine if a card is a Basic Pokemon? (Current implementation: checks card stage or name)

### Win Conditions
- **Primary:** First to 3 points wins
- **Points awarded:**
  - 1 point for KO'ing normal Pokemon
  - 2 points for KO'ing Pokemon ex
- **No deck-out loss:** If deck is empty, skip draw (no loss)
- **Turn limit:** 30 turns (if reached, player with more points wins; tie = draw)
- **Simultaneous KO:** If both reach 3 points simultaneously:
  - Winner is who still has Pokemon on bench
  - If both have bench, it's a draw

### Energy Zone
- **No energy cards** - Energy generated by Energy Zone
- **Generation:** At turn start, 1 energy type generated (from configured types)
- **Configuration:** Up to 3 energy types per deck
- **Manual attach:** 1 energy per turn from Energy Zone to any Pokemon
- **Effects can attach extra:** Attacks/abilities can attach additional energy
- **Display:** Shows current energy + next turn's energy
- **Energy types:** G (Grass), R (Fire), W (Water), L (Lightning), P (Psychic), F (Fighting), D (Darkness), M (Metal), C (Colorless - generic)
- **Retreat/effects discard energy permanently**

### Turn Flow
1. **Draw phase:** Draw 1 card (skipped on first turn for player going first)
2. **Energy attach:** Can attach 1 energy from Energy Zone (disabled first turn for player going first)
3. **Main phase:** Can perform actions in any order:
   - Play Basic Pokemon to bench
   - Evolve Pokemon (max 1 evolution per Pokemon per turn)
   - Play Trainer cards (Items unlimited, max 1 Supporter per turn)
   - Use Abilities
   - Retreat (max once per turn)
4. **Attack phase:** Attack with active Pokemon (ends turn)
5. **Pokemon Checkup:** Resolve status effects at end of turn

### First Turn Rules (Player Going First)
- **No draw** at turn start
- **No energy attach** from Energy Zone
- **No evolution** (applies to both players turn 1)
- **CAN use Supporter** (different from physical TCG)

### Battle Positions
- **Active Pokemon:** 1 required, center of field
- **Bench:** 0-3 Pokemon, behind active
- **Prizes:** None (uses point system instead)
- **Stadium:** 1 shared zone (either player can play, replaces previous)

### Weakness & Resistance
- **Weakness:** +20 damage (not x2 like physical TCG)
- **No Resistance** in Pocket

### Status Effects
Resolved during **Pokemon Checkup** (end of turn):

1. **Poison:** 10 damage per checkup
2. **Poison+ (Toxic):** 20 damage per checkup (special variant)
3. **Burn:** 20 damage per checkup + coin flip (heads = cured)
4. **Sleep:** Can't attack or retreat + coin flip each checkup (heads = wake up)
5. **Paralysis:** Can't attack or retreat + auto-cure after 1 turn
6. **Confusion:** Coin flip when attacking (tails = attack fails)

**Checkup order:** Poison → Burn → Sleep → Paralysis

**Curing status:**
- Evolving the Pokemon
- Retreating to bench (cures all status)
- Forced switch to bench (by opponent effect)
- Lum Berry (Pokemon Tool)
- Specific card effects

### Pokemon Checkup Details
- Happens at **end of each player's turn**
- **Order of resolution:**
  1. Poison damage
  2. Burn damage + coin flip to cure
  3. Sleep coin flip to wake
  4. Paralysis auto-cure
- Pokemon can be KO'd during checkup (awards points normally)
- Multiple status effects resolve in order above

### Evolution Rules
- **Can't evolve:**
  - On first turn (both players)
  - The turn a Pokemon was played
  - A Pokemon that already evolved this turn
- **Can evolve:**
  - Multiple different Pokemon per turn
  - Pokemon on bench or active
- **Evolution cures:** All status effects
- **Evolution preserves:** Damage counters, attached energy/tools

### Retreat Rules
- **Cost:** Discard energy equal to retreat cost
- **Limit:** Once per turn
- **Blocked by:** Sleep or Paralysis status
- **Effect:** Cures all status effects when retreating
- **Cost reduction:** X Speed (-1), Leaf (-2), abilities

### Trainer Cards
- **Items:** Play unlimited per turn
- **Supporters:** Max 1 per turn
- **Pokemon Tools:** Attach to Pokemon, max 1 per Pokemon
- **Stadiums:** Shared zone, replaces previous stadium

### Fossils (Special Mechanic)
- Fossil cards are Trainer Items
- Played as Basic Pokemon with 40 HP
- Cannot retreat
- Count as Pokemon for game purposes

### Abilities
- **Once per turn:** Most abilities (per copy)
- **Passive:** Some abilities always active
- Can use before, during, or after other actions
- Some require specific positions (Active/Bench)

### Damage Calculation
```
Final Damage = Base Damage + Modifiers + Weakness
Final Damage = max(0, Final Damage)  // Can't go below 0
```

**Modifiers:**
- Attack effects (e.g., bonus damage if condition met)
- Trainer effects (e.g., Giovanni +10)
- Abilities
- Stadium effects

**Weakness:** +20 damage if attacking type matches defender's weakness

### Discard Pile
- Each player has own discard pile
- Face-up, order matters for some effects
- Can be viewed/searched by card effects

---

## Scenario JSON Format

```json
{
  "version": 1,
  "name": "Scenario name",
  "description": "What this scenario tests",
  "turn": 5,
  "currentPlayer": "player1",
  "coinQueue": [true, false, true, true, false, true, false, true, true, false],
  
  "player1": {
    "points": 1,
    "active": {
      "cardId": "A1-003",
      "currentHp": 60,
      "energy": ["G", "G"],
      "status": null,
      "turnPlayed": 1,
      "lastEvolved": null,
      "tool": null,
      "effects": []
    },
    "bench": [
      {
        "cardId": "A1-001",
        "currentHp": 70,
        "energy": ["G"],
        "status": null,
        "turnPlayed": 0,
        "lastEvolved": null,
        "tool": null,
        "effects": []
      }
    ],
    "hand": ["A1-131", "A1-224"],
    "deck": ["A1-004", "A1-005", "..."],
    "discard": ["A1-220"],
    "energyZone": {
      "currentEnergy": "G",
      "nextEnergy": "W",
      "configuredTypes": ["G", "W"],
      "usedThisTurn": false
    },
    "supporterUsedThisTurn": false,
    "retreatedThisTurn": false,
    "normalAttachUsedThisTurn": false
  },
  
  "player2": {
    "points": 0,
    "active": null,
    "bench": [],
    "hand": [],
    "deck": [],
    "discard": [],
    "energyZone": {
      "currentEnergy": "R",
      "nextEnergy": "R",
      "configuredTypes": ["R"],
      "usedThisTurn": false
    },
    "supporterUsedThisTurn": false,
    "retreatedThisTurn": false,
    "normalAttachUsedThisTurn": false
  },
  
  "stadium": null,
  "turnEffects": [],
  "log": [
    {
      "turn": 5,
      "player": "player1",
      "action": "draw",
      "details": "Drew Potion"
    }
  ]
}
```

**Field explanations:**
- `version`: Schema version for future compatibility
- `turn`: Current turn number (starts at 0 or 1)
- `currentPlayer`: "player1" or "player2"
- `coinQueue`: Array of booleans (true=heads, false=tails)
- `active`/`bench`: Pokemon instances with state
- `hand`/`deck`/`discard`: Arrays of card IDs
- `energyZone.currentEnergy`: Energy available this turn
- `energyZone.nextEnergy`: Energy that will be available next turn
- `stadium`: Card ID of active stadium or null
- `turnEffects`: Temporary effects that expire (e.g., "next attack does +20")
- `log`: Full action history

---

## UI Components

### Main Battlefield
- Two player zones (top=opponent, bottom=player)
- Active Pokemon center (portrait orientation)
- Bench left/right of active (max 3 slots)
- Energy Zone indicator (shows current + next)
- Deck pile + count
- Discard pile + count
- Stadium zone (shared, center)
- Hand display (fan layout)

### Action Log Panel
- Right sidebar (~25% width)
- Turn headers
- Action entries with icons
- Color coding:
  - Red: Damage
  - Green: Healing
  - Yellow: Status
  - Blue: Cards played
  - Purple: Abilities
- Auto-scroll to latest
- Export button

### Control Panel
- Play/Pause button
- Step Forward (1 action at a time)
- Speed control (1x, 2x, 5x)
- Load Scenario button
- Save Scenario button
- Edit Mode toggle
- Coin Queue viewer/editor

### Scenario Editor
- Modal dialog
- JSON import/export
- Form controls for common edits:
  - HP sliders
  - Energy dropdowns
  - Status checkboxes
  - Turn counter
- Validate before apply

### Coin Queue UI
- Shows next 3 coins
- Click to flip
- Edit mode: click to toggle
- Refill button (generates 10 more)

---

## Non-Goals (Out of Scope for Phase 1)

- AI opponent
- PvP networking
- Deck builder UI
- Comprehensive card effect implementation (focus on common patterns)
- Mobile touch optimization (layout prepared, interactions later)
- Animations (static for now)
- Sound effects
- Tournament mode
- Replay system
- Statistics/analytics

---

## Future Phases (Not Implemented Yet)

### Phase 2: Card Effects
- Implement all attacks/abilities from A1/A1a/A2/A2a sets
- Extensible pattern for new cards

### Phase 3: AI Opponent
- Rule-based AI for testing
- Difficulty levels

### Phase 4: Deck Builder
- Collection manager
- Deck editor UI
- Import/export decks

### Phase 5: Polish
- Animations
- Sound effects
- Mobile touch optimization
- Better visual feedback

### Phase 6: PvP
- WebSocket-based networking
- Matchmaking
- Spectator mode

---

## Open Questions / Unknowns - Research TODOs

These need verification against the real Pokemon TCG Pocket app. Each item has a concrete research TODO with owner, context, and decision needed.

### High Priority Research TODOs

1. **RESEARCH-001: Energy Zone Generation Algorithm**
   - **Context:** Energy Zone generates 1 energy per turn from configured deck types (up to 3 types)
   - **Current Implementation:** Pure random selection from configured types
   - **Question:** Is energy generation random, or is it weighted by deck composition? Is there any pattern or predictability?
   - **Owner:** Core Game Engine Team
   - **Decision Needed:** Implement correct algorithm (random vs weighted vs other)
   - **Impact:** High - affects game balance and strategy
   - **Reference:** Code location: `js/engine/game-state.js:generateEnergy()`
   - **Related TODOs:** TODO-Pocket-Verify in game-state.js

2. **RESEARCH-002: Exact Turn Limit Behavior**
   - **Context:** Game ends at turn 30, but exact behavior unclear
   - **Current Implementation:** Immediate point comparison; tie = draw
   - **Question:** Does the current turn complete before checking? Are there any special rules for turn 30?
   - **Owner:** Core Game Engine Team
   - **Decision Needed:** Confirm turn 30 win condition behavior
   - **Impact:** Medium - affects late-game strategy
   - **Reference:** Code location: `js/engine/game-state.js:checkWinCondition()`
   - **Related TODOs:** TODO-Pocket-Verify in game-state.js

3. **RESEARCH-003: Weakness Application to Colorless Attacks**
   - **Context:** Weakness adds +20 damage when attacking type matches defender's weakness
   - **Current Implementation:** Applies weakness only when attacker's element matches
   - **Question:** Do Colorless attacks (which can be any energy type) trigger weakness if target is weak to a specific type?
   - **Owner:** Damage Calculation Team
   - **Decision Needed:** Confirm weakness rules for Colorless attacks
   - **Impact:** High - affects damage calculations significantly
   - **Reference:** Code location: `js/engine/game-state.js:calculateDamage()`
   - **Related TODOs:** TODO-Pocket-Verify in game-state.js

### Medium Priority Research TODOs

4. **RESEARCH-004: Evolution Chain Field Names in Card Data**
   - **Context:** Card data structure may use `evolvesFrom` or `stage` field to track evolution chains
   - **Current Implementation:** Checks both `evolvesFrom` and `stage` fields
   - **Question:** Which field is the canonical source? Are both always present?
   - **Owner:** Card Data Team
   - **Decision Needed:** Standardize evolution chain validation logic
   - **Impact:** Medium - affects evolution mechanics
   - **Reference:** Code location: `js/main.js:handleEvolveDrop()`
   - **Related TODOs:** TODO-Pocket-Verify in main.js

5. **RESEARCH-005: Pokemon Checkup Multiple KO Promotion Order**
   - **Context:** If multiple Pokemon are KO'd during checkup, bench promotion may be needed
   - **Current Implementation:** Not fully tested - promotion logic exists but order unclear
   - **Question:** What is the promotion order when multiple bench Pokemon are available? Does order matter?
   - **Owner:** Core Game Engine Team
   - **Decision Needed:** Document and verify promotion order behavior
   - **Impact:** Medium - affects edge-case scenarios
   - **Reference:** Code location: `js/engine/game-state.js:processPokemonCheckup()`

6. **RESEARCH-006: Ability Activation from Bench**
   - **Context:** Some Pokemon abilities may be usable from bench
   - **Current Implementation:** Abilities only work from Active Spot
   - **Question:** Can any abilities be activated from bench? Which ones?
   - **Owner:** Abilities Team
   - **Decision Needed:** Identify bench-usable abilities and implement if needed
   - **Impact:** Medium - affects gameplay variety
   - **Reference:** Code location: `js/engine/game-state.js:canUseAbility()`
   - **Related TODOs:** Multiple TODO-Pocket-Verify comments

7. **RESEARCH-007: Status Effects That Block Abilities**
   - **Context:** Physical TCG has rules about which status effects prevent ability usage
   - **Current Implementation:** No status blocks abilities currently
   - **Question:** Do any status effects (Sleep, Paralysis, etc.) prevent ability activation?
   - **Owner:** Abilities Team
   - **Decision Needed:** Add status-based ability blocking if required
   - **Impact:** Low-Medium - affects edge-case scenarios
   - **Reference:** Code location: `js/engine/game-state.js:canUseAbility()`
   - **Related TODOs:** TODO-Pocket-Verify in game-state.js

### Low Priority Research TODOs

8. **RESEARCH-008: Fossil Pokemon Retreat with Cost-Reducing Effects**
   - **Context:** Fossil Pokemon normally cannot retreat
   - **Current Implementation:** Fossils cannot retreat regardless of effects
   - **Question:** Can effects that reduce retreat cost to 0 allow fossils to retreat?
   - **Owner:** Mechanics Edge Cases Team
   - **Decision Needed:** Confirm fossil retreat exception rules
   - **Impact:** Low - niche scenario
   - **Reference:** General mechanics documentation

9. **RESEARCH-009: Poison+ (Toxic) Naming and Damage**
   - **Context:** Pocket may have a "poison+" or "toxic" status
   - **Current Implementation:** Uses `poison+` as status key, deals 20 damage
   - **Question:** Is the status name "poison+", "toxic", or something else? Is damage definitely 20?
   - **Owner:** Status Effects Team
   - **Decision Needed:** Confirm correct status identifier and damage value
   - **Impact:** Low - affects status effect accuracy
   - **Reference:** Code location: `js/engine/constants.js`
   - **Related TODOs:** TODO-Pocket-Verify in constants.js

10. **RESEARCH-010: Giovanni Card Detection and Effect Scope**
    - **Context:** Giovanni is a Supporter that adds +10 damage to attacks
    - **Current Implementation:** Not implemented - placeholder logic
    - **Question:** How to detect Giovanni card? Check cardId, name, or effect? Does it affect bench attacks?
    - **Owner:** Trainer Cards Team
    - **Decision Needed:** Implement Giovanni detection and effect application
    - **Impact:** Low-Medium - affects a specific trainer card
    - **Reference:** Code location: `js/engine/game-state.js:calculateDamage()`
    - **Related TODOs:** Multiple TODO-Pocket-Verify comments

11. **RESEARCH-011: Simultaneous Effects Resolution Order**
    - **Context:** Complex interactions may require specific resolution order
    - **Current Implementation:** Not fully documented - follows implementation order
    - **Question:** Are there specific rules for resolving simultaneous effects? Does order matter?
    - **Owner:** Core Game Engine Team
    - **Decision Needed:** Document resolution order if different from current
    - **Impact:** Low - affects complex edge cases
    - **Reference:** General mechanics documentation

12. **RESEARCH-012: Attack Damage with + and × Modifiers**
    - **Context:** Some attacks have damage like "20+" or "10×"
    - **Current Implementation:** Only parses base numeric value (ignores +/×)
    - **Question:** How do + and × attacks work in Pocket? What determines the bonus or multiplier?
    - **Owner:** Damage Calculation Team
    - **Decision Needed:** Implement modifier logic for special attack damage
    - **Impact:** Medium - affects many attack cards
    - **Reference:** Code location: `js/engine/game-state.js:parseDamage()`
    - **Related TODOs:** TODO-Pocket-Verify in game-state.js

### Research Strategy

**Approach:**
1. Create test scenarios in the real Pocket app to observe behavior
2. Compare observed behavior with current implementation
3. Document findings and update implementation as needed
4. Mark each research TODO as RESOLVED with notes on findings

**Priority Order:**
1. High Priority (RESEARCH-001, -002, -003): Affects core gameplay
2. Medium Priority (RESEARCH-004 through -007): Affects mechanics variety
3. Low Priority (RESEARCH-008 through -012): Edge cases and specific cards

**Documentation Updates:**
- When a research TODO is resolved, update this section with RESOLVED status
- Add details of findings to relevant code sections
- Update SPEC.md game mechanics sections if behavior differs from documented

---

## Success Criteria (Phase 1)

✅ A junior developer can:
1. Serve the app locally and see a working battlefield
2. Load a scenario JSON and see the board state
3. Step through turns manually
4. See actions logged in real-time
5. Edit board state mid-game
6. Export current state as JSON

✅ The simulator:
1. Enforces basic turn structure (draw → actions → attack)
2. Handles energy attachment correctly
3. Calculates damage with weakness
4. Resolves status effects in Pokemon Checkup
5. Tracks points and detects win conditions
6. Prevents invalid moves (e.g., can't retreat while asleep)

---

## Development Philosophy

1. **Working > Perfect:** Get something running first, refine later
2. **Test Scenarios > Unit Tests:** Create scenario JSONs for edge cases
3. **Comments > Clever Code:** Junior devs should understand it easily
4. **State Machine > Event Soup:** Pure functions, immutable state where possible
5. **UI Follows State:** Render from state, don't manipulate DOM directly
