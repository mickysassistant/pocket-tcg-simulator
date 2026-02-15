import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const en = readJson(path.join(process.cwd(), 'js/i18n/en.json'));
const es = readJson(path.join(process.cwd(), 'js/i18n/es.json'));

const required = [
  'title', 'selectDeckPlayer1', 'selectDeckPlayer2', 'startGame', 'cancel',
  'deckSelectRequired', 'invalidDeck', 'gameStarted', 'selectDeckLabel'
];

for (const key of required) {
  assert.ok(en.newGame?.[key], `missing en.newGame.${key}`);
  assert.ok(es.newGame?.[key], `missing es.newGame.${key}`);
}

assert.ok(en.ui?.newGame, 'missing en.ui.newGame');
assert.ok(es.ui?.newGame, 'missing es.ui.newGame');

console.log('✅ test-new-game-i18n passed');
