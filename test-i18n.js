#!/usr/bin/env node
/**
 * i18n Test Script - T07
 * Tests that translations are loaded and applied correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('========================================');
console.log('i18n Test - T07');
console.log('========================================\n');

// Load translations
const esData = JSON.parse(fs.readFileSync(path.join(__dirname, 'js/i18n/es.json'), 'utf8'));
const enData = JSON.parse(fs.readFileSync(path.join(__dirname, 'js/i18n/en.json'), 'utf8'));

// Expected keys from HTML
const expectedKeys = [
  'game.currentPlayer',
  'game.deck',
  'game.discard',
  'game.opponent',
  'game.points',
  'game.turn',
  'game.you',
  'ui.actionLog',
  'ui.apply',
  'ui.cancel',
  'ui.close',
  'ui.coinQueue',
  'ui.coinQueueEditor',
  'ui.coinQueueHelp',
  'ui.editMode',
  'ui.export',
  'ui.loadScenario',
  'ui.noActions',
  'ui.pause',
  'ui.play',
  'ui.refill',
  'ui.saveScenario',
  'ui.scenarioEditor',
  'ui.speed',
  'ui.step'
];

// Helper function to get nested value
function getNestedValue(obj, key) {
  const parts = key.split('.');
  let value = obj;
  for (const part of parts) {
    if (value && value[part]) {
      value = value[part];
    } else {
      return null;
    }
  }
  return value;
}

console.log('✅ Test 1: Translation files exist and are valid');
console.log('   es.json: ' + Object.keys(esData.game).length + ' game keys, ' + Object.keys(esData.ui).length + ' ui keys');
console.log('   en.json: ' + Object.keys(enData.game).length + ' game keys, ' + Object.keys(enData.ui).length + ' ui keys');
console.log('');

console.log('✅ Test 2: All expected keys have translations in Spanish');
let esMissing = [];
expectedKeys.forEach(key => {
  const value = getNestedValue(esData, key);
  if (!value) {
    esMissing.push(key);
  }
});
if (esMissing.length === 0) {
  console.log('   All ' + expectedKeys.length + ' keys have translations');
} else {
  console.log('   ❌ Missing keys: ' + esMissing.join(', '));
}
console.log('');

console.log('✅ Test 3: All expected keys have translations in English');
let enMissing = [];
expectedKeys.forEach(key => {
  const value = getNestedValue(enData, key);
  if (!value) {
    enMissing.push(key);
  }
});
if (enMissing.length === 0) {
  console.log('   All ' + expectedKeys.length + ' keys have translations');
} else {
  console.log('   ❌ Missing keys: ' + enMissing.join(', '));
}
console.log('');

console.log('✅ Test 4: Sample translations comparison');
console.log('   Key: game.opponent');
console.log('     ES: ' + esData.game.opponent);
console.log('     EN: ' + enData.game.opponent);
console.log('');
console.log('   Key: game.you');
console.log('     ES: ' + esData.game.you);
console.log('     EN: ' + enData.game.you);
console.log('');
console.log('   Key: ui.play');
console.log('     ES: ' + esData.ui.play);
console.log('     EN: ' + enData.ui.play);
console.log('');

console.log('✅ Test 5: Function getNestedValue works correctly');
const testKey = 'game.points';
const esValue = getNestedValue(esData, testKey);
const enValue = getNestedValue(enData, testKey);
console.log('   ' + testKey + ' → ES: "' + esValue + '", EN: "' + enValue + '"');
console.log('');

// Final result
const allTestsPassed = esMissing.length === 0 && enMissing.length === 0 && esValue && enValue;

console.log('========================================');
if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED');
} else {
  console.log('❌ SOME TESTS FAILED');
}
console.log('========================================\n');

process.exit(allTestsPassed ? 0 : 1);
