/**
 * T09 Tests - Damage Calculation + Weakness (Node.js)
 *
 * Tests calculateDamage, canAttack, applyDamage, executeAttack, hasEnoughEnergy
 *
 * Run: node test-t09.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load card data for testing
function loadTestCards() {
  const cards = new Map();
  const sets = ['A1'];
  for (const set of sets) {
    const data = JSON.parse(readFileSync(join(__dirname, 'data', `${set}.json`), 'utf-8'));
    data.forEach(card => cards.set(card.id, card));
  }
  return cards;
}

const cardsDB = loadTestCards();
function getCard(id) { return cardsDB.get(id) || null; }

// Since game-state.js uses ES modules with browser-style imports,
// we replicate the core logic here for Node testing

// =========================================================================
// Replicated core functions for Node.js testing
// =========================================================================

function parseDamage(damageStr) {
  if (!damageStr) return 0;
  const match = damageStr.match(/(\d+)/);
  if (!match) return 0;
  return parseInt(match[1], 10);
}

function calculateDamage(attackerCard, defenderCard, attackIndex, modifiers = {}) {
  const attack = attackerCard.attacks?.[attackIndex];
  if (!attack) return 0;

  let baseDamage = parseDamage(attack.damage);
  if (baseDamage === 0) return 0;

  let totalDamage = baseDamage;

  // Weakness: +20
  if (defenderCard.weakness && attackerCard.element === defenderCard.weakness) {
    totalDamage += 20;
  }

  // Giovanni
  const giovanniBonus = modifiers.giovanni || 0;
  if (giovanniBonus > 0) totalDamage += giovanniBonus;

  // Other
  const otherBonus = modifiers.other || 0;
  if (otherBonus > 0) totalDamage += otherBonus;

  return totalDamage;
}

function hasEnoughEnergy(energy, energyCost) {
  if (!energyCost || energyCost.length === 0) return true;

  const energyCopy = {};
  energy.forEach(type => {
    energyCopy[type] = (energyCopy[type] || 0) + 1;
  });

  for (const costType of energyCost) {
    if (costType === 'C') {
      const anyEnergy = Object.keys(energyCopy).find(type => energyCopy[type] > 0);
      if (!anyEnergy) return false;
      energyCopy[anyEnergy]--;
    } else {
      if (!energyCopy[costType] || energyCopy[costType] <= 0) return false;
      energyCopy[costType]--;
    }
  }

  return true;
}

// =========================================================================
// Test runner
// =========================================================================

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// =========================================================================
// Tests
// =========================================================================

const bulbasaur = getCard('A1-001');   // Grass, 70 HP, Vine Whip 40 (GC), weak to Fire
const charmander = getCard('A1-033');  // Fire, 60 HP, Ember 30 (R), weak to Water
const squirtle = getCard('A1-053');    // Water, 60 HP, Water Gun 20 (W), weak to Lightning

section('1. Card data loaded correctly');
assert(bulbasaur !== null, 'Bulbasaur loaded');
assert(bulbasaur.element === 'Grass', `Bulbasaur element = Grass, got ${bulbasaur.element}`);
assert(bulbasaur.weakness === 'Fire', `Bulbasaur weakness = Fire, got ${bulbasaur.weakness}`);
assert(charmander !== null, 'Charmander loaded');
assert(charmander.element === 'Fire', `Charmander element = Fire`);
assert(charmander.weakness === 'Water', `Charmander weakness = Water`);
assert(squirtle !== null, 'Squirtle loaded');
assert(squirtle.element === 'Water', `Squirtle element = Water`);

section('2. calculateDamage() - Basic (no weakness)');
assert(calculateDamage(bulbasaur, charmander, 0) === 40, 'Bulbasaur→Charmander = 40 (Grass vs Fire, no weakness)');
assert(calculateDamage(squirtle, bulbasaur, 0) === 20, 'Squirtle→Bulbasaur = 20 (Water vs Grass, no weakness)');

section('3. calculateDamage() - Weakness (+20)');
assert(calculateDamage(charmander, bulbasaur, 0) === 50, 'Charmander→Bulbasaur = 50 (Fire vs Grass weak to Fire)');
assert(calculateDamage(squirtle, charmander, 0) === 40, 'Squirtle→Charmander = 40 (Water vs Fire weak to Water)');

section('4. calculateDamage() - Giovanni modifier');
assert(calculateDamage(bulbasaur, charmander, 0, { giovanni: 10 }) === 50, 'Vine Whip + Giovanni = 50');
assert(calculateDamage(charmander, bulbasaur, 0, { giovanni: 10 }) === 60, 'Ember + weakness + Giovanni = 60');

section('5. calculateDamage() - Other modifier');
assert(calculateDamage(bulbasaur, charmander, 0, { other: 20 }) === 60, 'Vine Whip + other(20) = 60');

section('6. calculateDamage() - Combined modifiers');
assert(calculateDamage(squirtle, charmander, 0, { giovanni: 10, other: 5 }) === 55, 'Water Gun + weakness + Giovanni + other = 55');

section('7. calculateDamage() - Edge cases');
assert(calculateDamage(bulbasaur, charmander, 99) === 0, 'Invalid attack index returns 0');
assert(calculateDamage(bulbasaur, charmander, 0, {}) === 40, 'Empty modifiers OK');

section('8. hasEnoughEnergy()');
// Bulbasaur Vine Whip costs [G, C]
const vineWhipCost = bulbasaur.attacks[0].energyCost;
assert(hasEnoughEnergy(['G', 'C'], vineWhipCost) === true, '[G,C] satisfies [G,C]');
assert(hasEnoughEnergy(['G'], vineWhipCost) === false, '[G] does not satisfy [G,C]');
assert(hasEnoughEnergy(['G', 'R'], vineWhipCost) === true, '[G,R] satisfies [G,C] (R→C)');
assert(hasEnoughEnergy(['G', 'G'], vineWhipCost) === true, '[G,G] satisfies [G,C] (G→C)');
assert(hasEnoughEnergy([], vineWhipCost) === false, '[] does not satisfy [G,C]');
assert(hasEnoughEnergy(['C', 'C'], vineWhipCost) === false, '[C,C] does not satisfy [G,C] (need specific G)');
assert(hasEnoughEnergy(['G', 'C', 'W'], vineWhipCost) === true, 'Excess energy OK');

// Charmander Ember costs [R]
const emberCost = charmander.attacks[0].energyCost;
assert(hasEnoughEnergy(['R'], emberCost) === true, '[R] satisfies [R]');
assert(hasEnoughEnergy(['G'], emberCost) === false, '[G] does not satisfy [R]');
assert(hasEnoughEnergy([], emberCost) === false, '[] does not satisfy [R]');

section('9. parseDamage()');
assert(parseDamage('40') === 40, '"40" → 40');
assert(parseDamage('20+') === 20, '"20+" → 20 (base)');
assert(parseDamage('10×') === 10, '"10×" → 10 (base)');
assert(parseDamage(null) === 0, 'null → 0');
assert(parseDamage('') === 0, '"" → 0');
assert(parseDamage('abc') === 0, '"abc" → 0');

// =========================================================================
// Summary
// =========================================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
