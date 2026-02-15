/**
 * Trainer Card Tests - Stage 1
 *
 * Tests for canPlayTrainer and playTrainer functions
 *
 * Run in browser: window.runTrainerTests()
 */

import {
  createInitialState,
  createPlayer,
  createPokemon,
  cloneState
} from './game-state.js';
import {
  canPlayTrainer,
  playTrainer,
  getTrainerEffect
} from './trainers.js';

// Mock card database
const mockCards = {
  'professors-research': {
    id: 'professors-research',
    name: "Professor's Research",
    supertype: 'Trainer',
    subtype: 'Supporter'
  },
  'poke-ball': {
    id: 'poke-ball',
    name: 'Poké Ball',
    supertype: 'Trainer',
    subtype: 'Item'
  },
  'giovanni': {
    id: 'giovanni',
    name: 'Giovanni',
    supertype: 'Trainer',
    subtype: 'Supporter'
  },
  'erika': {
    id: 'erika',
    name: 'Erika',
    supertype: 'Trainer',
    subtype: 'Supporter'
  },
  'pikachu-a1-001': {
    id: 'A1-001',
    name: 'Pikachu ex',
    supertype: 'Pokémon',
    subtype: 'Basic',
    hp: 90,
    element: 'L'
  },
  'bulbasaur-a1-012': {
    id: 'A1-012',
    name: 'Bulbasaur',
    supertype: 'Pokémon',
    subtype: 'Basic',
    hp: 60,
    element: 'G'
  }
};

// Mock getCard function
function getCard(cardId) {
  return mockCards[cardId] || null;
}

// Test framework
function runTests(tests) {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    try {
      test.fn();
      passed++;
      results.push(`✅ ${test.name}`);
    } catch (e) {
      failed++;
      results.push(`❌ ${test.name}: ${e.message}`);
    }
  }

  return { passed, failed, results };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

function assertTrue(value, message) {
  if (value !== true) {
    throw new Error(message || `Expected true, got ${value}`);
  }
}

function assertFalse(value, message) {
  if (value !== false) {
    throw new Error(message || `Expected false, got ${value}`);
  }
}

// ============================================================================
// Tests
// ============================================================================

const tests = [
  {
    name: 'getTrainerEffect returns effect for known trainer',
    fn: () => {
      const effect = getTrainerEffect("Professor's Research");
      assertNotNull(effect, 'Effect should exist');
      assertEqual(effect.type, 'supporter', 'Type should be supporter');
      assertFalse(effect.needsTarget, 'Should not need target');
    }
  },
  {
    name: 'getTrainerEffect returns null for unknown trainer',
    fn: () => {
      const effect = getTrainerEffect('Unknown Trainer');
      assert(effect === null, 'Effect should be null for unknown trainer');
    }
  },
  {
    name: 'canPlayTrainer returns false for non-trainer card',
    fn: () => {
      const state = createInitialState();
      const result = canPlayTrainer(state, 'player1', 'A1-001', getCard);
      assertFalse(result, 'Should not be able to play Pokemon card as trainer');
    }
  },
  {
    name: 'canPlayTrainer returns true for item without target',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['poke-ball'];
      state.player1.deck = ['A1-001', 'A1-012']; // Basic Pokemon in deck

      const result = canPlayTrainer(state, 'player1', 'poke-ball', getCard);
      assertTrue(result, 'Should be able to play Poké Ball with Basic in deck');
    }
  },
  {
    name: 'canPlayTrainer returns false for supporter already used',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['professors-research'];
      state.player1.supporterUsedThisTurn = true;

      const result = canPlayTrainer(state, 'player1', 'professors-research', getCard);
      assertFalse(result, 'Should not be able to play supporter if already used this turn');
    }
  },
  {
    name: 'canPlayTrainer returns true for supporter without conditions',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['giovanni'];
      state.player1.supporterUsedThisTurn = false;

      const result = canPlayTrainer(state, 'player1', 'giovanni', getCard);
      assertTrue(result, 'Should be able to play Giovanni without conditions');
    }
  },
  {
    name: 'canPlayTrainer returns false for supporter needing valid target',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['erika'];
      state.player1.active = null;
      state.player1.bench = [null, null, null];

      const result = canPlayTrainer(state, 'player1', 'erika', getCard, { pokemonIndex: 'active' });
      assertFalse(result, 'Should not be able to play Erika without Grass Pokemon');
    }
  },
  {
    name: 'canPlayTrainer returns true for supporter with valid target',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['erika'];
      state.player1.active = createPokemon('A1-012', 40); // Bulbasaur (Grass)

      const result = canPlayTrainer(state, 'player1', 'erika', getCard, { pokemonIndex: 'active' });
      assertTrue(result, 'Should be able to play Erika with Grass Pokemon');
    }
  },
  {
    name: 'playTrainer removes card from hand',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['giovanni'];

      const newState = playTrainer(state, 'player1', 'giovanni', getCard);

      assertEqual(newState.player1.hand.length, 0, 'Card should be removed from hand');
    }
  },
  {
    name: 'playTrainer sets supporterUsedThisTurn flag',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['giovanni'];

      const newState = playTrainer(state, 'player1', 'giovanni', getCard);

      assertTrue(newState.player1.supporterUsedThisTurn, 'Supporter used flag should be set');
    }
  },
  {
    name: 'playTrainer adds turn effect for Giovanni',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['giovanni'];

      const newState = playTrainer(state, 'player1', 'giovanni', getCard);

      const effects = newState.turnEffects.filter(e => e.source === 'Giovanni');
      assert(effects.length > 0, 'Giovanni effect should be added');
      assertEqual(effects[0].amount, 10, 'Giovanni should add +10 damage');
    }
  },
  {
    name: 'playTrainer adds card to discard',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['giovanni'];

      const newState = playTrainer(state, 'player1', 'giovanni', getCard);

      assertTrue(newState.player1.discard.includes('giovanni'), 'Card should be in discard');
    }
  },
  {
    name: 'playTrainer returns same state if cannot play',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['professors-research'];
      state.player1.supporterUsedThisTurn = true;

      const newState = playTrainer(state, 'player1', 'professors-research', getCard);

      assert(newState === state, 'Should return same state if cannot play');
    }
  },
  {
    name: 'playTrainer logs action',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['giovanni'];

      const newState = playTrainer(state, 'player1', 'giovanni', getCard);

      const lastLog = newState.log[newState.log.length - 1];
      assertEqual(lastLog.action, 'trainer', 'Log action should be trainer');
      assertEqual(lastLog.card, 'Giovanni', 'Log should show card name');
    }
  },
  {
    name: 'canPlayTrainer with empty deck for Poké Ball',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['poke-ball'];
      state.player1.deck = [];

      const result = canPlayTrainer(state, 'player1', 'poke-ball', getCard);
      assertFalse(result, 'Should not be able to play Poké Ball with empty deck');
    }
  },
  {
    name: 'playTrainer for Poké Ball with Basic in deck',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['poke-ball'];
      state.player1.deck = ['A1-001', 'A1-012'];

      const newState = playTrainer(state, 'player1', 'poke-ball', getCard);

      assertEqual(newState.player1.hand.length, 1, 'Should add one Basic Pokemon to hand');
      assertEqual(newState.player1.deck.length, 1, 'Deck should have one card removed');
    }
  },
  {
    name: 'playTrainer for Erika with target',
    fn: () => {
      const state = createInitialState();
      state.player1.hand = ['erika'];
      state.player1.active = createPokemon('A1-012', 40); // Bulbasaur (Grass)

      const newState = playTrainer(state, 'player1', 'erika', getCard, { pokemonIndex: 'active' });

      assertEqual(newState.player1.active.currentHp, 60, 'Should heal 50 HP to Grass Pokemon');
    }
  }
];

// ============================================================================
// Export for browser testing
// ============================================================================

export function runTrainerTests() {
  const { passed, failed, results } = runTests(tests);

  console.log('\n========== Trainer Card Tests ==========');
  results.forEach(r => console.log(r));
  console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================\n');

  return { passed, failed };
}

// Make available globally
if (typeof window !== 'undefined') {
  window.runTrainerTests = runTrainerTests;
}
