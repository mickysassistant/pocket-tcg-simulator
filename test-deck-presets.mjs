import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deckPresets, getDeckPreset, validateDeckPreset } from './js/data/deck-presets.js';

function loadSet(setId) {
  const p = path.join(process.cwd(), 'data', `${setId}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function run() {
  assert.ok(deckPresets.length >= 2, 'must expose at least two deck presets');

  const cardIds = new Set(loadSet('A1').map(c => c.id));

  for (const preset of deckPresets) {
    const v = validateDeckPreset(preset);
    assert.equal(v.valid, true, `preset ${preset.id} should be valid: ${v.errors.join(', ')}`);
    assert.equal(preset.deck.length, 20, `preset ${preset.id} must have 20 cards`);

    for (const cardId of preset.deck) {
      assert.ok(cardIds.has(cardId), `preset ${preset.id} uses unknown card ${cardId}`);
    }
  }

  assert.ok(getDeckPreset(deckPresets[0].id), 'getDeckPreset should resolve existing preset');
  assert.equal(getDeckPreset('missing-preset'), null, 'getDeckPreset should return null for missing preset');

  // Regression sanity: scenario load/save contract still valid JSON state shape
  const scenario = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scenarios', 'demo-start-game.json'), 'utf8'));
  assert.ok(scenario.player1 && scenario.player2, 'scenario contract still has both players');
  assert.ok(Array.isArray(scenario.player1.deck) && Array.isArray(scenario.player2.deck), 'scenario decks remain arrays');

  console.log('✅ test-deck-presets passed');
}

run();
