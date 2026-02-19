/**
 * GAP-003: Status Condition Immunity Tests
 *
 * Tests the special condition (status condition) system, including:
 * - Applying special conditions (Poisoned, Burned, Sleep, Paralyzed, Confused)
 * - Immunity to special conditions via ability (Arceus ex – Fabled Luster)
 * - Only one condition active at a time (new replaces old)
 * - Between-turn condition effects (damage from Poison/Burn)
 * - Condition blocking attack / retreat
 * - Removing conditions
 */

const GameState = require('../../src/game/game-state');
const AbilitySystem = require('../../src/game/ability-system');
const { StatusConditionSystem, SPECIAL_CONDITIONS } = require('../../src/game/status-condition-system');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function makeGameState() {
  const gs = new GameState();
  gs.players = {
    player1: {
      activePokemon: null,
      banque: [],
      hand: [],
      deck: [],
      discardPile: []
    },
    player2: {
      activePokemon: null,
      banque: [],
      hand: [],
      deck: [],
      discardPile: []
    }
  };
  gs.turnLog = [];
  return gs;
}

function makePokemon(overrides = {}) {
  return {
    id: overrides.id || 'pkmn-1',
    name: overrides.name || 'TestPokemon',
    type: overrides.type || 'Normal',
    hp: overrides.hp || 100,
    currentHp: overrides.currentHp !== undefined ? overrides.currentHp : overrides.hp || 100,
    specialCondition: null,
    energy: overrides.energy || [],
    ...overrides
  };
}

function makeSystems(gameState) {
  const abilitySystem = new AbilitySystem(gameState);
  const statusSystem = new StatusConditionSystem(gameState, abilitySystem);
  return { abilitySystem, statusSystem };
}

/** Register a special-condition-immunity ability for a Pokémon (simulating Arceus ex Fabled Luster) */
function registerImmunity(abilitySystem, playerId, pokemonId) {
  abilitySystem.registerAbility(playerId, pokemonId, {
    id: 'fabled-luster',
    name: 'Fabled Luster',
    pokemonId,
    type: 'passive',
    effect: { type: 'special_condition_immunity' },
    condition: { type: 'always' }
  });
}

// ---------------------------------------------------------------------------
// Tests: SPECIAL_CONDITIONS constants
// ---------------------------------------------------------------------------

console.log('\n--- SPECIAL_CONDITIONS constants ---');

runTest('SPECIAL_CONDITIONS exports the five standard conditions', () => {
  assert(SPECIAL_CONDITIONS.POISONED === 'poisoned', 'POISONED');
  assert(SPECIAL_CONDITIONS.BURNED === 'burned', 'BURNED');
  assert(SPECIAL_CONDITIONS.SLEEP === 'asleep', 'SLEEP');
  assert(SPECIAL_CONDITIONS.PARALYZED === 'paralyzed', 'PARALYZED');
  assert(SPECIAL_CONDITIONS.CONFUSED === 'confused', 'CONFUSED');
});

// ---------------------------------------------------------------------------
// Tests: Applying conditions (no immunity)
// ---------------------------------------------------------------------------

console.log('\n--- Applying special conditions (no immunity) ---');

runTest('applyCondition: Poisoned is applied to active Pokémon', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  const result = statusSystem.applyCondition('player1', 'p1', 'poisoned');
  assert(result.applied === true, 'should be applied');
  assertEqual(gs.players.player1.activePokemon.specialCondition, 'poisoned', 'condition on Pokémon');
});

runTest('applyCondition: Sleep is applied', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  const result = statusSystem.applyCondition('player1', 'p1', SPECIAL_CONDITIONS.SLEEP);
  assert(result.applied, 'applied');
  assertEqual(statusSystem.getCondition('player1', 'p1'), 'asleep', 'condition stored');
});

runTest('applyCondition: Paralyzed is applied', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', SPECIAL_CONDITIONS.PARALYZED);
  assert(statusSystem.hasCondition('player1', 'p1', 'paralyzed'), 'paralyzed');
});

runTest('applyCondition: Confused is applied', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', SPECIAL_CONDITIONS.CONFUSED);
  assert(statusSystem.hasCondition('player1', 'p1', 'confused'), 'confused');
});

runTest('applyCondition: Burned is applied', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', SPECIAL_CONDITIONS.BURNED);
  assert(statusSystem.hasCondition('player1', 'p1', 'burned'), 'burned');
});

runTest('applyCondition: Unknown condition is rejected', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  const result = statusSystem.applyCondition('player1', 'p1', 'stunned');
  assert(result.applied === false, 'unknown condition rejected');
});

runTest('applyCondition: New condition replaces existing condition', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'poisoned');
  statusSystem.applyCondition('player1', 'p1', 'asleep');
  assertEqual(statusSystem.getCondition('player1', 'p1'), 'asleep', 'sleep overwrote poison');
});

runTest('applyCondition: Condition can be applied to Pokémon on bench', () => {
  const gs = makeGameState();
  const benchPkm = makePokemon({ id: 'bench-1', name: 'BenchPoke' });
  gs.players.player1.banque = [benchPkm];
  const { statusSystem } = makeSystems(gs);

  const result = statusSystem.applyCondition('player1', 'bench-1', 'poisoned');
  assert(result.applied, 'bench Pokémon gets conditioned');
  assertEqual(benchPkm.specialCondition, 'poisoned', 'stored on bench Pokémon');
});

runTest('applyCondition: Missing Pokémon returns applied:false', () => {
  const gs = makeGameState();
  const { statusSystem } = makeSystems(gs);

  const result = statusSystem.applyCondition('player1', 'nonexistent-id', 'poisoned');
  assert(result.applied === false, 'not applied for missing pokemon');
});

// ---------------------------------------------------------------------------
// Tests: Immunity (GAP-003 core)
// ---------------------------------------------------------------------------

console.log('\n--- Immunity to Special Conditions (Arceus ex – Fabled Luster) ---');

runTest('Arceus ex with immunity ability cannot be Poisoned', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', name: 'Arceus ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  const result = statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned');
  assert(result.applied === false, 'immunity blocks poison');
  assertEqual(result.reason, 'immune', 'reason is immune');
  assertEqual(arceus.specialCondition, null, 'no condition on Arceus ex');
});

runTest('Arceus ex with immunity cannot be put to Sleep', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  const result = statusSystem.applyCondition('player1', 'arceus-ex', SPECIAL_CONDITIONS.SLEEP);
  assert(!result.applied, 'sleep blocked');
  assertEqual(arceus.specialCondition, null, 'still no condition');
});

runTest('Arceus ex with immunity cannot be Paralyzed', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  const result = statusSystem.applyCondition('player1', 'arceus-ex', SPECIAL_CONDITIONS.PARALYZED);
  assert(!result.applied, 'paralysis blocked');
});

runTest('Arceus ex with immunity cannot be Confused', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  const result = statusSystem.applyCondition('player1', 'arceus-ex', SPECIAL_CONDITIONS.CONFUSED);
  assert(!result.applied, 'confusion blocked');
});

runTest('Arceus ex with immunity cannot be Burned', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  const result = statusSystem.applyCondition('player1', 'arceus-ex', SPECIAL_CONDITIONS.BURNED);
  assert(!result.applied, 'burn blocked');
});

runTest('Immunity is per-Pokémon: opponent can still be conditioned', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  const opponent = makePokemon({ id: 'opp-1', name: 'Pikachu', hp: 60 });
  gs.players.player1.activePokemon = arceus;
  gs.players.player2.activePokemon = opponent;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  // Arceus immune...
  const r1 = statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned');
  assert(!r1.applied, 'Arceus immune');

  // ...but opponent is not
  const r2 = statusSystem.applyCondition('player2', 'opp-1', 'poisoned');
  assert(r2.applied, 'opponent gets poisoned');
  assertEqual(opponent.specialCondition, 'poisoned', 'opponent condition set');
});

runTest('Immunity is per-Pokémon: teammate without ability can still be conditioned', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  const partner = makePokemon({ id: 'partner-1', name: 'Gardevoir', hp: 130 });
  gs.players.player1.activePokemon = arceus;
  gs.players.player1.banque = [partner];
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  // Arceus immune
  const r1 = statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned');
  assert(!r1.applied, 'Arceus immune');

  // Partner on bench is not immune
  const r2 = statusSystem.applyCondition('player1', 'partner-1', 'poisoned');
  assert(r2.applied, 'partner gets poisoned');
});

runTest('Immunity is removed when ability is removed', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');

  // Check immune
  assert(!statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned').applied, 'initially immune');

  // Remove ability (e.g., Arceus is KO'd and ability is deregistered)
  abilitySystem.removeAbilities('player1', 'arceus-ex');

  // No longer immune
  const result = statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned');
  assert(result.applied, 'no longer immune after ability removed');
});

runTest('isImmuneToSpecialConditions returns true when ability is registered', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem } = makeSystems(gs);

  assert(!abilitySystem.isImmuneToSpecialConditions('player1', 'arceus-ex'), 'not immune before registration');
  registerImmunity(abilitySystem, 'player1', 'arceus-ex');
  assert(abilitySystem.isImmuneToSpecialConditions('player1', 'arceus-ex'), 'immune after registration');
});

runTest('getImmunePokemons returns list of immune Pokémon IDs for a player', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  const other = makePokemon({ id: 'other-1', hp: 100 });
  gs.players.player1.activePokemon = arceus;
  gs.players.player1.banque = [other];
  const { abilitySystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');
  const immune = abilitySystem.getImmunePokemons('player1');
  assert(immune.includes('arceus-ex'), 'arceus-ex is in immune list');
  assert(!immune.includes('other-1'), 'other-1 is not immune');
});

runTest('Immunity condition (e.g. is_active) only applies when condition is met', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  gs.players.player1.banque = [];
  const { abilitySystem, statusSystem } = makeSystems(gs);

  // Register immunity only when arceus-ex is active
  abilitySystem.registerAbility('player1', 'arceus-ex', {
    id: 'conditional-fabled-luster',
    name: 'Fabled Luster (conditional)',
    pokemonId: 'arceus-ex',
    type: 'passive',
    effect: { type: 'special_condition_immunity' },
    condition: { type: 'is_active' }
  });

  // Arceus is currently active → immune
  assert(abilitySystem.isImmuneToSpecialConditions('player1', 'arceus-ex'), 'immune when active');

  // Simulate arceus moved to bench (bench Pokémon, active is something else)
  const other = makePokemon({ id: 'other-1', hp: 100 });
  gs.players.player1.activePokemon = other;
  gs.players.player1.banque = [arceus];

  // Condition (is_active) no longer met → not immune
  assert(!abilitySystem.isImmuneToSpecialConditions('player1', 'arceus-ex'), 'not immune when on bench');
  const result = statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned');
  assert(result.applied, 'condition applies when not active');
});

// ---------------------------------------------------------------------------
// Tests: Immunity blocks event log
// ---------------------------------------------------------------------------

console.log('\n--- Event logging ---');

runTest('Blocked condition is logged with detail:immune', () => {
  const gs = makeGameState();
  const arceus = makePokemon({ id: 'arceus-ex', hp: 220 });
  gs.players.player1.activePokemon = arceus;
  const { abilitySystem, statusSystem } = makeSystems(gs);

  registerImmunity(abilitySystem, 'player1', 'arceus-ex');
  statusSystem.applyCondition('player1', 'arceus-ex', 'poisoned');

  const log = gs.turnLog.find(e => e.type === 'condition_blocked');
  assert(log, 'condition_blocked log entry present');
  assertEqual(log.condition, 'poisoned', 'logged condition name');
  assertEqual(log.detail, 'immune', 'detail says immune');
});

runTest('Applied condition is logged with type:condition_applied', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'asleep');
  const log = gs.turnLog.find(e => e.type === 'condition_applied');
  assert(log, 'condition_applied log entry present');
  assertEqual(log.condition, 'asleep', 'logged condition name');
});

runTest('Removed condition is logged with type:condition_removed', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'paralyzed');
  statusSystem.removeCondition('player1', 'p1');
  const log = gs.turnLog.find(e => e.type === 'condition_removed');
  assert(log, 'condition_removed log entry present');
  assertEqual(log.condition, 'paralyzed', 'logged condition name');
});

// ---------------------------------------------------------------------------
// Tests: removeCondition
// ---------------------------------------------------------------------------

console.log('\n--- removeCondition ---');

runTest('removeCondition clears the condition', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'poisoned');
  statusSystem.removeCondition('player1', 'p1');
  assertEqual(statusSystem.getCondition('player1', 'p1'), null, 'no condition after remove');
});

runTest('removeCondition is safe on a Pokémon with no condition', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  // Should not throw
  statusSystem.removeCondition('player1', 'p1');
  assertEqual(statusSystem.getCondition('player1', 'p1'), null, 'still null');
});

// ---------------------------------------------------------------------------
// Tests: Between-turn effects
// ---------------------------------------------------------------------------

console.log('\n--- Between-turn effects ---');

runTest('Poisoned: deals 10 damage per between-turn', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'poisoned');
  statusSystem.applyBetweenTurnEffects('player1');
  assertEqual(pkmn.currentHp, 90, 'took 10 poison damage');
});

runTest('Poisoned: multiple between-turns accumulate damage', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'poisoned');
  statusSystem.applyBetweenTurnEffects('player1');
  statusSystem.applyBetweenTurnEffects('player1');
  statusSystem.applyBetweenTurnEffects('player1');
  assertEqual(pkmn.currentHp, 70, '3x10 = 30 damage');
});

runTest('Burned: deals 20 damage per between-turn', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'burned');
  // Force tails (burn stays)
  statusSystem.applyBetweenTurnEffects('player1', () => false);
  assertEqual(pkmn.currentHp, 80, 'took 20 burn damage');
  assertEqual(pkmn.specialCondition, 'burned', 'burn still active on tails');
});

runTest('Burned: removed on coin flip heads', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'burned');
  // Force heads (burn removed)
  statusSystem.applyBetweenTurnEffects('player1', () => true);
  assertEqual(pkmn.currentHp, 80, 'still took 20 damage this turn');
  assertEqual(pkmn.specialCondition, null, 'burn removed on heads');
});

runTest('Paralyzed: auto-removed after one between-turn', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'paralyzed');
  statusSystem.applyBetweenTurnEffects('player1');
  assertEqual(pkmn.specialCondition, null, 'paralysis auto-removed');
  // No damage from paralysis
  assertEqual(pkmn.currentHp, 100, 'no damage from paralysis between turn');
});

runTest('No between-turn effects when no condition', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  const result = statusSystem.applyBetweenTurnEffects('player1');
  assertEqual(pkmn.currentHp, 100, 'no damage');
  assert(result.effects.length === 0, 'no effects');
});

runTest('Condition damage cannot reduce HP below 0', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 5 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'poisoned');
  statusSystem.applyBetweenTurnEffects('player1');
  assertEqual(pkmn.currentHp, 0, 'clamped at 0');
});

// ---------------------------------------------------------------------------
// Tests: canAttack / canRetreat
// ---------------------------------------------------------------------------

console.log('\n--- canAttack / canRetreat ---');

runTest('canAttack returns false when Asleep', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'asleep');
  const res = statusSystem.canAttack('player1', 'p1');
  assert(!res.canAttack, 'cannot attack when asleep');
  assertEqual(res.reason, 'asleep', 'reason is asleep');
});

runTest('canAttack returns false when Paralyzed', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'paralyzed');
  assert(!statusSystem.canAttack('player1', 'p1').canAttack, 'cannot attack when paralyzed');
});

runTest('canAttack returns true when Poisoned (can still attack)', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'poisoned');
  assert(statusSystem.canAttack('player1', 'p1').canAttack, 'can attack when poisoned');
});

runTest('canRetreat returns false when Asleep', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'asleep');
  assert(!statusSystem.canRetreat('player1', 'p1').canRetreat, 'cannot retreat when asleep');
});

runTest('canRetreat returns false when Paralyzed', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'paralyzed');
  assert(!statusSystem.canRetreat('player1', 'p1').canRetreat, 'cannot retreat when paralyzed');
});

runTest('canRetreat returns true when Confused (can still retreat)', () => {
  const gs = makeGameState();
  gs.players.player1.activePokemon = makePokemon({ id: 'p1' });
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'confused');
  assert(statusSystem.canRetreat('player1', 'p1').canRetreat, 'can retreat when confused');
});

// ---------------------------------------------------------------------------
// Tests: Confusion attack handling
// ---------------------------------------------------------------------------

console.log('\n--- Confusion attack handling ---');

runTest('handleConfusion: returns selfHit:false when not confused', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  const res = statusSystem.handleConfusion('player1', 'p1', 50);
  assert(!res.selfHit, 'no self hit when not confused');
  assertEqual(pkmn.currentHp, 100, 'no damage');
});

runTest('handleConfusion: heads → attack proceeds normally (no self hit)', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'confused');
  // Force heads
  const res = statusSystem.handleConfusion('player1', 'p1', 50, () => true);
  assert(!res.selfHit, 'heads: no self hit');
  assertEqual(res.coinResult, 'heads', 'coin was heads');
  assertEqual(pkmn.currentHp, 100, 'no self damage');
});

runTest('handleConfusion: tails → 30 self damage', () => {
  const gs = makeGameState();
  const pkmn = makePokemon({ id: 'p1', hp: 100, currentHp: 100 });
  gs.players.player1.activePokemon = pkmn;
  const { statusSystem } = makeSystems(gs);

  statusSystem.applyCondition('player1', 'p1', 'confused');
  // Force tails
  const res = statusSystem.handleConfusion('player1', 'p1', 50, () => false);
  assert(res.selfHit, 'tails: self hit');
  assertEqual(res.selfDamage, 30, '30 self damage');
  assertEqual(pkmn.currentHp, 70, 'HP reduced by 30');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`);
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failures.length > 0) {
  console.error('\nFailed tests:');
  for (const f of failures) {
    console.error(`  - ${f.name}: ${f.error}`);
  }
  process.exit(1);
}

console.log('All tests passed!');
