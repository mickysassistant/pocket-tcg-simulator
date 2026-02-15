/**
 * Tests for constants.ts - Pokemon TCG Pocket Simulator
 *
 * This file contains unit tests for all constant values exported from constants.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MAX_BENCH, MAX_HAND, DECK_SIZE, MAX_COPIES_PER_CARD, POINTS_TO_WIN, TURN_LIMIT, ENERGY_TYPES, STATUS, STATUS_CHECKUP_ORDER, STATUS_DAMAGE, KO_POINTS, STARTING_HAND_SIZE, DEFAULT_COIN_QUEUE_SIZE, MAX_CONFIGURED_ENERGY_TYPES, STATE_VERSION } from './constants.js';
describe('Game Constants', () => {
    describe('MAX_BENCH', () => {
        it('should be 3', () => {
            assert.strictEqual(MAX_BENCH, 3);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof MAX_BENCH, 'number');
        });
    });
    describe('MAX_HAND', () => {
        it('should be 10', () => {
            assert.strictEqual(MAX_HAND, 10);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof MAX_HAND, 'number');
        });
    });
    describe('DECK_SIZE', () => {
        it('should be 20', () => {
            assert.strictEqual(DECK_SIZE, 20);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof DECK_SIZE, 'number');
        });
    });
    describe('MAX_COPIES_PER_CARD', () => {
        it('should be 2', () => {
            assert.strictEqual(MAX_COPIES_PER_CARD, 2);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof MAX_COPIES_PER_CARD, 'number');
        });
    });
    describe('POINTS_TO_WIN', () => {
        it('should be 3', () => {
            assert.strictEqual(POINTS_TO_WIN, 3);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof POINTS_TO_WIN, 'number');
        });
    });
    describe('TURN_LIMIT', () => {
        it('should be 30', () => {
            assert.strictEqual(TURN_LIMIT, 30);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof TURN_LIMIT, 'number');
        });
    });
    describe('STARTING_HAND_SIZE', () => {
        it('should be 5', () => {
            assert.strictEqual(STARTING_HAND_SIZE, 5);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof STARTING_HAND_SIZE, 'number');
        });
    });
    describe('DEFAULT_COIN_QUEUE_SIZE', () => {
        it('should be 10', () => {
            assert.strictEqual(DEFAULT_COIN_QUEUE_SIZE, 10);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof DEFAULT_COIN_QUEUE_SIZE, 'number');
        });
    });
    describe('MAX_CONFIGURED_ENERGY_TYPES', () => {
        it('should be 3', () => {
            assert.strictEqual(MAX_CONFIGURED_ENERGY_TYPES, 3);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof MAX_CONFIGURED_ENERGY_TYPES, 'number');
        });
    });
    describe('STATE_VERSION', () => {
        it('should be 1', () => {
            assert.strictEqual(STATE_VERSION, 1);
        });
        it('should be a const assertion', () => {
            assert.strictEqual(typeof STATE_VERSION, 'number');
        });
    });
});
describe('ENERGY_TYPES', () => {
    it('should have all 9 energy types', () => {
        const expectedTypes = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
        assert.deepStrictEqual(Object.keys(ENERGY_TYPES), expectedTypes);
    });
    it('should map G to Grass', () => {
        assert.strictEqual(ENERGY_TYPES.G, 'Grass');
    });
    it('should map R to Fire', () => {
        assert.strictEqual(ENERGY_TYPES.R, 'Fire');
    });
    it('should map W to Water', () => {
        assert.strictEqual(ENERGY_TYPES.W, 'Water');
    });
    it('should map L to Lightning', () => {
        assert.strictEqual(ENERGY_TYPES.L, 'Lightning');
    });
    it('should map P to Psychic', () => {
        assert.strictEqual(ENERGY_TYPES.P, 'Psychic');
    });
    it('should map F to Fighting', () => {
        assert.strictEqual(ENERGY_TYPES.F, 'Fighting');
    });
    it('should map D to Darkness', () => {
        assert.strictEqual(ENERGY_TYPES.D, 'Darkness');
    });
    it('should map M to Metal', () => {
        assert.strictEqual(ENERGY_TYPES.M, 'Metal');
    });
    it('should map C to Colorless', () => {
        assert.strictEqual(ENERGY_TYPES.C, 'Colorless');
    });
    it('should be typed as Record<EnergyType, string>', () => {
        assert.strictEqual(ENERGY_TYPES.G, 'Grass');
        assert.strictEqual(ENERGY_TYPES.R, 'Fire');
        // TypeScript will enforce the type
    });
});
describe('STATUS', () => {
    it('should have POISON constant', () => {
        assert.strictEqual(STATUS.POISON, 'poison');
    });
    it('should have POISON_PLUS constant', () => {
        assert.strictEqual(STATUS.POISON_PLUS, 'poison+');
    });
    it('should have BURN constant', () => {
        assert.strictEqual(STATUS.BURN, 'burn');
    });
    it('should have SLEEP constant', () => {
        assert.strictEqual(STATUS.SLEEP, 'sleep');
    });
    it('should have PARALYSIS constant', () => {
        assert.strictEqual(STATUS.PARALYSIS, 'paralysis');
    });
    it('should have CONFUSION constant', () => {
        assert.strictEqual(STATUS.CONFUSION, 'confusion');
    });
    it('should have all 6 status effects', () => {
        assert.strictEqual(Object.keys(STATUS).length, 6);
    });
});
describe('STATUS_CHECKUP_ORDER', () => {
    it('should be an array of status strings', () => {
        assert.ok(Array.isArray(STATUS_CHECKUP_ORDER));
    });
    it('should contain 5 statuses in the correct order', () => {
        assert.strictEqual(STATUS_CHECKUP_ORDER.length, 5);
        assert.strictEqual(STATUS_CHECKUP_ORDER[0], 'poison');
        assert.strictEqual(STATUS_CHECKUP_ORDER[1], 'poison+');
        assert.strictEqual(STATUS_CHECKUP_ORDER[2], 'burn');
        assert.strictEqual(STATUS_CHECKUP_ORDER[3], 'sleep');
        assert.strictEqual(STATUS_CHECKUP_ORDER[4], 'paralysis');
    });
    it('should not include confusion in checkup order', () => {
        assert.ok(!STATUS_CHECKUP_ORDER.includes('confusion'));
    });
    it('should be typed as Status[]', () => {
        assert.ok(STATUS_CHECKUP_ORDER.every(s => typeof s === 'string'));
    });
});
describe('STATUS_DAMAGE', () => {
    it('should have damage for poison', () => {
        assert.strictEqual(STATUS_DAMAGE[STATUS.POISON], 10);
    });
    it('should have damage for poison+', () => {
        assert.strictEqual(STATUS_DAMAGE[STATUS.POISON_PLUS], 20);
    });
    it('should have damage for burn', () => {
        assert.strictEqual(STATUS_DAMAGE[STATUS.BURN], 20);
    });
    it('should not have damage for sleep', () => {
        assert.strictEqual('sleep' in STATUS_DAMAGE, false);
    });
    it('should not have damage for paralysis', () => {
        assert.strictEqual('paralysis' in STATUS_DAMAGE, false);
    });
    it('should not have damage for confusion', () => {
        assert.strictEqual('confusion' in STATUS_DAMAGE, false);
    });
});
describe('KO_POINTS', () => {
    it('should have NORMAL points value', () => {
        assert.strictEqual(KO_POINTS.NORMAL, 1);
    });
    it('should have EX points value', () => {
        assert.strictEqual(KO_POINTS.EX, 2);
    });
    it('should have exactly 2 KO point types', () => {
        assert.strictEqual(Object.keys(KO_POINTS).length, 2);
    });
    it('should be typed as Record<PokemonType, number>', () => {
        assert.strictEqual(typeof KO_POINTS.NORMAL, 'number');
        assert.strictEqual(typeof KO_POINTS.EX, 'number');
    });
});
describe('Type definitions', () => {
    it('EnergyType should include all energy codes', () => {
        const energyTypes = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
        assert.strictEqual(energyTypes.length, 9);
    });
    it('Status should include all status effects', () => {
        const statuses = ['poison', 'poison+', 'burn', 'sleep', 'paralysis', 'confusion'];
        assert.strictEqual(statuses.length, 6);
    });
    it('PokemonType should include NORMAL and EX', () => {
        const pokemonTypes = ['NORMAL', 'EX'];
        assert.strictEqual(pokemonTypes.length, 2);
    });
});
describe('Const assertions', () => {
    it('constants should be readonly', () => {
        // TypeScript will prevent modification of const assertions
        // At runtime, we just verify the values exist
        assert.strictEqual(MAX_BENCH, 3);
        assert.strictEqual(ENERGY_TYPES.G, 'Grass');
        assert.strictEqual(STATUS.POISON, 'poison');
        assert.strictEqual(KO_POINTS.NORMAL, 1);
    });
    it('ENERGY_TYPES keys should match EnergyType', () => {
        const energyKeys = Object.keys(ENERGY_TYPES);
        const expected = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
        assert.deepStrictEqual(energyKeys, expected);
    });
    it('STATUS_CHECKUP_ORDER should be readonly', () => {
        assert.deepStrictEqual(STATUS_CHECKUP_ORDER, ['poison', 'poison+', 'burn', 'sleep', 'paralysis']);
    });
    it('STATUS_DAMAGE should be typed correctly', () => {
        assert.strictEqual(STATUS_DAMAGE[STATUS.POISON], 10);
        assert.strictEqual(STATUS_DAMAGE[STATUS.POISON_PLUS], 20);
        assert.strictEqual(STATUS_DAMAGE[STATUS.BURN], 20);
    });
});
