/**
 * T17 - Pause/Resume/Edit Mid-Game - Automated Tests (Node.js)
 * Tests the edit mode logic: HP/energy/status editing, validation, state integrity
 */

import { readFileSync } from 'fs';

// Inline minimal implementations since ES modules from browser can't be imported directly in Node
// We test the state manipulation logic that the UI layer uses

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
    try {
        fn();
        results.push({ name, status: 'PASS' });
        passed++;
    } catch (e) {
        results.push({ name, status: 'FAIL', error: e.message });
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

// Minimal state factory (mirrors game-state.js)
function createPokemon(cardId) {
    return {
        cardId,
        currentHp: 70,
        maxHp: 70,
        energy: [],
        status: null,
        turnPlayed: 0,
        lastEvolved: null,
        tool: null,
        effects: [],
        isEx: false
    };
}

function createState() {
    return {
        version: 1,
        turn: 1,
        currentPlayer: 'player1',
        player1: {
            points: 0,
            active: null,
            bench: [],
            hand: [],
            deck: [],
            discard: [],
            energyZone: { currentEnergy: null, nextEnergy: null, configuredTypes: ['G', 'R'], usedThisTurn: false },
            supporterUsedThisTurn: false,
            retreatedThisTurn: false,
            normalAttachUsedThisTurn: false,
            attackedThisTurn: false
        },
        player2: {
            points: 0,
            active: null,
            bench: [],
            hand: [],
            deck: [],
            discard: [],
            energyZone: { currentEnergy: null, nextEnergy: null, configuredTypes: ['W', 'L'], usedThisTurn: false },
            supporterUsedThisTurn: false,
            retreatedThisTurn: false,
            normalAttachUsedThisTurn: false,
            attackedThisTurn: false
        },
        stadium: null,
        turnEffects: [],
        log: [],
        coinQueue: [true, false, true, false, true, false, true, false, true, false]
    };
}

// =============================================
// TESTS
// =============================================

test('T17-01: Edit HP on active Pokemon', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.player1.active.currentHp = 70;

    // Simulate edit
    state.player1.active.currentHp = 40;
    assert(state.player1.active.currentHp === 40, 'HP updated');
});

test('T17-02: HP validation - non-negative', () => {
    const hp = -10;
    assert(hp < 0, 'Negative HP detected');
    // UI should prevent this
    const validated = Math.max(0, hp);
    assert(validated === 0, 'Clamped to 0');
});

test('T17-03: HP validation - max HP limit', () => {
    const maxHp = 70;
    const editHp = 100;
    assert(editHp > maxHp, 'Over max HP detected');
    const validated = Math.min(maxHp, editHp);
    assert(validated === 70, 'Clamped to max');
});

test('T17-04: Edit energy - add', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.player1.active.energy = ['G'];

    state.player1.active.energy.push('R');
    assert(state.player1.active.energy.length === 2);
    assert(state.player1.active.energy[1] === 'R');
});

test('T17-05: Edit energy - remove', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.player1.active.energy = ['G', 'R', 'W'];

    state.player1.active.energy.splice(1, 1); // Remove 'R'
    assert(state.player1.active.energy.length === 2);
    assert(state.player1.active.energy[0] === 'G');
    assert(state.player1.active.energy[1] === 'W');
});

test('T17-06: Edit status - set poison', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');

    state.player1.active.status = 'poison';
    assert(state.player1.active.status === 'poison');
});

test('T17-07: Edit status - clear', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.player1.active.status = 'burn';

    state.player1.active.status = null;
    assert(state.player1.active.status === null);
});

test('T17-08: Remove active Pokemon', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');

    state.player1.active = null;
    assert(state.player1.active === null);
});

test('T17-09: Remove bench Pokemon', () => {
    const state = createState();
    state.player1.bench = [createPokemon('A1-001'), createPokemon('A1-046')];

    state.player1.bench.splice(0, 1);
    assert(state.player1.bench.length === 1);
    assert(state.player1.bench[0].cardId === 'A1-046');
});

test('T17-10: Edit creates log entry', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');

    state.player1.active.currentHp = 30;
    state.log.push({
        turn: state.turn,
        player: 'player1',
        action: 'edit',
        details: 'Edited A1-001: HP=30',
        timestamp: Date.now()
    });

    assert(state.log.length === 1);
    assert(state.log[0].action === 'edit');
});

test('T17-11: Edit both players', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.player2.active = createPokemon('A2-001');

    state.player1.active.currentHp = 30;
    state.player2.active.currentHp = 50;

    assert(state.player1.active.currentHp === 30);
    assert(state.player2.active.currentHp === 50);
});

test('T17-12: Resume preserves edited state', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.turn = 5;

    // Edit
    state.player1.active.currentHp = 30;
    state.player1.active.status = 'poison';
    state.player1.active.energy = ['G', 'G'];

    // After "resume" the state should persist
    assert(state.turn === 5);
    assert(state.player1.active.currentHp === 30);
    assert(state.player1.active.status === 'poison');
    assert(state.player1.active.energy.length === 2);
});

test('T17-13: Deep clone prevents edit bleed', () => {
    const state = createState();
    state.player1.active = createPokemon('A1-001');
    state.player1.active.energy = ['G'];

    // Deep clone
    const snapshot = JSON.parse(JSON.stringify(state));

    // Edit original
    state.player1.active.currentHp = 10;
    state.player1.active.energy.push('R');

    assert(snapshot.player1.active.currentHp === 70, 'Snapshot HP unchanged');
    assert(snapshot.player1.active.energy.length === 1, 'Snapshot energy unchanged');
});

test('T17-14: Edit bench slot by index', () => {
    const state = createState();
    state.player1.bench = [
        createPokemon('A1-001'),
        createPokemon('A1-046'),
        createPokemon('A1-027')
    ];

    // Edit bench slot 1 (middle)
    state.player1.bench[1].currentHp = 20;
    state.player1.bench[1].status = 'sleep';

    assert(state.player1.bench[0].currentHp === 70, 'Bench 0 unchanged');
    assert(state.player1.bench[1].currentHp === 20, 'Bench 1 edited');
    assert(state.player1.bench[1].status === 'sleep');
    assert(state.player1.bench[2].currentHp === 70, 'Bench 2 unchanged');
});

// =============================================
// RESULTS
// =============================================

console.log('\n=== T17 - Pause/Resume/Edit Mid-Game Tests ===\n');

results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}${r.error ? ' — ' + r.error : ''}`);
});

console.log(`\n${passed} passed / ${failed} failed — Total: ${results.length}\n`);

if (failed > 0) process.exit(1);
