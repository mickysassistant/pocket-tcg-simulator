# T18 Completion Report - i18n Support

**Task:** T18 - i18n Support
**Completed:** 2026-02-11 08:20
**Status:** ✅ DONE

---

## Summary

Implemented full internationalization support for the Pokemon TCG Pocket Simulator, enabling the application to switch between Spanish and English languages dynamically.

---

## Implementation Details

### 1. Translation Helper Function

Created `t(key, params)` function in `js/main.js`:

```javascript
function t(key, params = {}) {
    const lang = translations[currentLanguage];
    const parts = key.split('.');
    let value = lang;
    for (const part of parts) {
        if (value && value[part]) { value = value[part]; } else { value = null; break; }
    }
    
    if (!value) return key;
    
    // Replace parameters in template (e.g., "{winner}" with actual value)
    let result = value;
    for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
    }
    
    return result;
}
```

### 2. Translation Files

Updated and enhanced `js/i18n/es.json` and `js/i18n/en.json` with:

- **game**: UI labels (turn, points, player names, attacks, empty, unknown)
- **ui**: Button labels (play, pause, step, speed, load/save scenario, edit mode, loading)
- **edit**: Edit modal (title, hp, status, energy, location, clickToEdit, locationFormat, benchSlot)
- **status**: Status effects (none, poison, poisonPlus, burn, sleep, paralysis, confusion)
- **energyTypes**: Energy type names (Grass/Planta, Fire/Fuego, Water/Agua, etc.)
- **alerts**: Alert and error messages with parameter support:
  - gameOverLoadScenario
  - gameOver
  - gameOverWinnerWins (with {winner} parameter)
  - noLogEntriesToExport
  - errorLoadingScenario (with {error} parameter)
  - canOnlyAttachToOwnPokemon
  - dropEnergyOnPokemon
  - noPokemonInSlot
  - cardNotFound
  - canOnlyPlayToOwnZones
  - onlyBasicToActive
  - onlyBasicToBench
  - hpMustBeNonNegative
  - hpCannotExceedMax (with {maxHp} parameter)
  - pokemonNoLongerExists
  - alreadyAttackedThisTurn
  - invalidDropZone
  - noPokemonToEvolve
  - targetCardNotFound
  - evolutionMismatch (with {cardName}, {evolvesFrom}, {targetName} parameters)
  - confirmRemovePokemon
- **log**: Log export format and headers:
  - exported
  - totalTurns
  - turnHeader (with {turn} parameter)
  - logHeader

### 3. JavaScript Updates

Replaced all hardcoded strings with calls to `t()`:

**Alert messages:**
- `alert('Game over! Load a new scenario.')` → `alert(t('alerts.gameOverLoadScenario'))`
- `alert(\`Game Over! ${state.winner} wins!\`)` → `alert(t('alerts.gameOverWinnerWins', { winner: state.winner }))`
- `alert('No log entries to export')` → `alert(t('alerts.noLogEntriesToExport'))`
- `alert('Error loading scenario: ' + e.message)` → `alert(t('alerts.errorLoadingScenario', { error: e.message }))`

**Validation messages:**
- `'HP must be a non-negative number'` → `t('alerts.hpMustBeNonNegative')`
- `` `HP cannot exceed max HP (${maxHp})` `` → `t('alerts.hpCannotExceedMax', { maxHp })`
- `'Pokemon no longer exists'` → `t('alerts.pokemonNoLongerExists')`

**Drag & drop error messages:**
- `'Already attacked this turn'` → `t('alerts.alreadyAttackedThisTurn')`
- `'Can only attach energy to your own Pokemon'` → `t('alerts.canOnlyAttachToOwnPokemon')`
- `'Drop energy on a Pokemon'` → `t('alerts.dropEnergyOnPokemon')`
- `'No Pokemon in that slot'` → `t('alerts.noPokemonInSlot')`
- `'Card not found'` → `t('alerts.cardNotFound')`
- `'Can only play cards to your own zones'` → `t('alerts.canOnlyPlayToOwnZones')`
- `'Only Basic Pokemon can be played to Active'` → `t('alerts.onlyBasicToActive')`
- `'Only Basic Pokemon can be played to Bench'` → `t('alerts.onlyBasicToBench')`
- `'Invalid drop zone'` → `t('alerts.invalidDropZone')`
- `'No Pokemon to evolve'` → `t('alerts.noPokemonToEvolve')`
- `'Target card not found'` → `t('alerts.targetCardNotFound')`
- `${evoCard.name} evolves from ${evoCard.evolvesFrom}, not ${targetCard.name}` → `t('alerts.evolutionMismatch', { cardName: evoCard.name, evolvesFrom: evoCard.evolvesFrom, targetName: targetCard.name })`

**UI elements:**
- `'No actions yet'` → `t('ui.noActions')`
- `'Empty'` → `t('game.empty')`
- `'Unknown'` → `t('game.unknown')`
- `'Turn ${turn}'` → `${t('game.turn')} ${turn}`
- `'Edit Pokemon'` → `t('edit.title')`
- `'Remove this Pokemon from the field?'` → `t('alerts.confirmRemovePokemon')`

**Edit modal:**
```javascript
const playerLabel = playerId === 'player1' ? t('game.player1') : t('game.player2');
const locationLabel = location === 'active' ? t('edit.locationActive') : t('edit.benchSlot', { slot: location });
document.querySelector('#edit-pokemon-location').textContent =
    t('edit.locationFormat', { player: playerLabel, location: locationLabel });
```

**Log export:**
```javascript
lines.push(t('log.logHeader'));
lines.push(`${t('log.exported')} ${new Date().toISOString()}`);
lines.push(`${t('log.totalTurns')} ${Math.max(...sortedTurns)}`);
lines.push(t('log.turnHeader', { turn }));
```

### 4. HTML Updates

Added `data-i18n` attributes to static elements:

**Edit modal:**
```html
<h2 data-i18n="edit.title">Edit Pokemon</h2>
<span data-i18n="edit.hp">HP:</span>
<span data-i18n="edit.status">Status:</span>
<span data-i18n="edit.energy">Energy:</span>
<button data-i18n="edit.addEnergy">+ Add</button>
<button data-i18n="edit.apply">Apply</button>
<button data-i18n="edit.removePokemon">Remove Pokemon</button>
<button data-i18n="edit.cancel">Cancel</button>
```

**Loading overlay:**
```html
<p id="status-text" data-i18n="ui.loading">Loading...</p>
```

### 5. Dynamic Translation Updates

Created `updateDynamicTranslations()` function to update elements that change at runtime:

```javascript
function updateDynamicTranslations() {
    // Update edit mode banner
    const editModeBanner = document.querySelector('.edit-mode-banner');
    if (editModeBanner && editModeBanner.textContent.includes('EDIT MODE')) {
        editModeBanner.textContent = '✏️ ' + t('ui.editMode') + ' — ' + t('edit.clickToEdit');
    }

    // Update status select options
    updateSelectOptions('edit-status', [
        { value: '', label: t('status.none') },
        { value: 'poison', label: t('status.poison') },
        { value: 'poison+', label: t('status.poisonPlus') },
        { value: 'burn', label: t('status.burn') },
        { value: 'sleep', label: t('status.sleep') },
        { value: 'paralysis', label: t('status.paralysis') },
        { value: 'confusion', label: t('status.confusion') }
    ]);

    // Update energy type select options
    updateSelectOptions('edit-energy-type', [
        { value: 'G', label: t('energyTypes.G') },
        { value: 'R', label: t('energyTypes.R') },
        // ... etc
    ]);
}
```

### 6. Language Switcher

Language switcher button already existed in HTML:
```html
<button id="lang-btn" class="btn-secondary">🌐 ES/EN</button>
```

Updated event listener to call `updateDynamicTranslations()`:
```javascript
document.querySelector('#lang-btn')?.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'es' ? 'en' : 'es';
    applyTranslations();
    updateDynamicTranslations();
});
```

### 7. Initialization

Updated `init()` function to load translations before rendering:
```javascript
async function init() {
    console.log('🚀 Initializing...');
    await loadTranslations();
    applyTranslations();
    updateDynamicTranslations();
    await loadCards();
    // ... rest of initialization
}
```

---

## Testing

### Automated Tests (test-t18.mjs)

Created 110 automated tests covering:

1. **Load Translations** (4 tests)
   - Spanish translations loaded
   - English translations loaded
   - Both are objects

2. **Spanish Translations Structure** (7 tests)
   - All top-level keys exist (game, ui, edit, status, energyTypes, alerts, log)

3. **English Translations Structure** (7 tests)
   - All top-level keys exist

4. **Spanish Translation Values** (12 tests)
   - game.turn, ui.play, ui.pause, ui.actionLog
   - edit.title, status.poison, status.burn
   - energyTypes.G, energyTypes.R, energyTypes.W
   - alerts.gameOver, log.logHeader

5. **English Translation Values** (12 tests)
   - Same as Spanish, in English

6. **Parameter Replacement** (4 tests)
   - Spanish gameOverWinnerWins with {winner}
   - English gameOverWinnerWins with {winner}
   - Spanish hpCannotExceedMax with {maxHp}
   - English hpCannotExceedMax with {maxHp}

7. **All Energy Types Present** (18 tests)
   - All 9 energy types (G, R, W, L, P, F, D, M, C) in both languages

8. **All Status Effects Present** (14 tests)
   - All 7 status effects (none, poison, poisonPlus, burn, sleep, paralysis, confusion) in both languages

9. **Alert Messages Present** (26 tests)
   - All 13 alert keys in both languages

10. **Log Messages Present** (6 tests)
    - All 4 log keys in both languages

**Result:** All 110 tests passed (100% success rate)

### Browser Tests (test-t18.html)

Created browser-based test page with 5 test sections:

1. **Load Translations** - Verifies translations load correctly
2. **Spanish Translations** - Verifies Spanish values match expected
3. **English Translations** - Verifies English values match expected
4. **Parameter Replacement** - Verifies template parameters work
5. **Apply Translations to DOM** - Verifies DOM elements update correctly

Also includes:
- Language switcher to test switching between ES/EN
- Translation examples showing all categories

---

## Files Modified

1. **js/main.js**
   - Added `t()` translation helper function
   - Added `updateDynamicTranslations()` function
   - Added `updateSelectOptions()` function
   - Replaced all hardcoded strings with `t()` calls
   - Updated `applyTranslations()` to call `updateDynamicTranslations()`
   - Updated `init()` to load and apply translations

2. **js/i18n/es.json**
   - Enhanced with additional translation keys
   - Added support for parameterized templates
   - Added new categories: alerts.hpMustBeNonNegative, alerts.hpCannotExceedMax, alerts.pokemonNoLongerExists, alerts.alreadyAttackedThisTurn, alerts.invalidDropZone, alerts.noPokemonToEvolve, alerts.targetCardNotFound, alerts.evolutionMismatch, alerts.confirmRemovePokemon
   - Added edit.locationFormat, edit.benchSlot, edit.clickToEdit
   - Added game.empty, game.unknown
   - Added ui.loading

3. **js/i18n/en.json**
   - Same enhancements as Spanish file

4. **index.html**
   - Added data-i18n attributes to edit modal elements
   - Added data-i18n to loading overlay

5. **test-t18.html** (new)
   - Browser-based test page for i18n

6. **test-t18.mjs** (new)
   - Automated Node.js tests for i18n

---

## Known Limitations

- Select option values in HTML remain hardcoded (in English), but are updated dynamically by `updateSelectOptions()` on initialization and language switch
- No RTL (right-to-left) language support currently (only Spanish and English are LTR)

---

## Future Improvements

- Add support for more languages (German, French, Japanese, etc.)
- Implement RTL support for languages like Arabic
- Add language detection based on browser settings
- Persist language preference in localStorage
- Consider using a more robust i18n library (e.g., i18next, vue-i18n) if framework is added

---

## Success Criteria

✅ Translations loaded
✅ Strings replaced
✅ Language switcher
✅ Both languages tested

All success criteria met. Task T18 is complete.
