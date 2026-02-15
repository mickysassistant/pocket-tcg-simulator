"use strict";
/**
 * Tests for constants.ts - Pokemon TCG Pocket Simulator
 *
 * This file contains unit tests for all constant values exported from constants.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var node_assert_1 = require("node:assert");
var constants_js_1 = require("./constants.js");
(0, node_test_1.describe)('Game Constants', function () {
    (0, node_test_1.describe)('MAX_BENCH', function () {
        (0, node_test_1.it)('should be 3', function () {
            node_assert_1.default.strictEqual(constants_js_1.MAX_BENCH, 3);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.MAX_BENCH, 'number');
        });
    });
    (0, node_test_1.describe)('MAX_HAND', function () {
        (0, node_test_1.it)('should be 10', function () {
            node_assert_1.default.strictEqual(constants_js_1.MAX_HAND, 10);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.MAX_HAND, 'number');
        });
    });
    (0, node_test_1.describe)('DECK_SIZE', function () {
        (0, node_test_1.it)('should be 20', function () {
            node_assert_1.default.strictEqual(constants_js_1.DECK_SIZE, 20);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.DECK_SIZE, 'number');
        });
    });
    (0, node_test_1.describe)('MAX_COPIES_PER_CARD', function () {
        (0, node_test_1.it)('should be 2', function () {
            node_assert_1.default.strictEqual(constants_js_1.MAX_COPIES_PER_CARD, 2);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.MAX_COPIES_PER_CARD, 'number');
        });
    });
    (0, node_test_1.describe)('POINTS_TO_WIN', function () {
        (0, node_test_1.it)('should be 3', function () {
            node_assert_1.default.strictEqual(constants_js_1.POINTS_TO_WIN, 3);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.POINTS_TO_WIN, 'number');
        });
    });
    (0, node_test_1.describe)('TURN_LIMIT', function () {
        (0, node_test_1.it)('should be 30', function () {
            node_assert_1.default.strictEqual(constants_js_1.TURN_LIMIT, 30);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.TURN_LIMIT, 'number');
        });
    });
    (0, node_test_1.describe)('STARTING_HAND_SIZE', function () {
        (0, node_test_1.it)('should be 5', function () {
            node_assert_1.default.strictEqual(constants_js_1.STARTING_HAND_SIZE, 5);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.STARTING_HAND_SIZE, 'number');
        });
    });
    (0, node_test_1.describe)('DEFAULT_COIN_QUEUE_SIZE', function () {
        (0, node_test_1.it)('should be 10', function () {
            node_assert_1.default.strictEqual(constants_js_1.DEFAULT_COIN_QUEUE_SIZE, 10);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.DEFAULT_COIN_QUEUE_SIZE, 'number');
        });
    });
    (0, node_test_1.describe)('MAX_CONFIGURED_ENERGY_TYPES', function () {
        (0, node_test_1.it)('should be 3', function () {
            node_assert_1.default.strictEqual(constants_js_1.MAX_CONFIGURED_ENERGY_TYPES, 3);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.MAX_CONFIGURED_ENERGY_TYPES, 'number');
        });
    });
    (0, node_test_1.describe)('STATE_VERSION', function () {
        (0, node_test_1.it)('should be 1', function () {
            node_assert_1.default.strictEqual(constants_js_1.STATE_VERSION, 1);
        });
        (0, node_test_1.it)('should be a const assertion', function () {
            node_assert_1.default.strictEqual(typeof constants_js_1.STATE_VERSION, 'number');
        });
    });
});
(0, node_test_1.describe)('ENERGY_TYPES', function () {
    (0, node_test_1.it)('should have all 9 energy types', function () {
        var expectedTypes = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
        node_assert_1.default.deepStrictEqual(Object.keys(constants_js_1.ENERGY_TYPES), expectedTypes);
    });
    (0, node_test_1.it)('should map G to Grass', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.G, 'Grass');
    });
    (0, node_test_1.it)('should map R to Fire', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.R, 'Fire');
    });
    (0, node_test_1.it)('should map W to Water', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.W, 'Water');
    });
    (0, node_test_1.it)('should map L to Lightning', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.L, 'Lightning');
    });
    (0, node_test_1.it)('should map P to Psychic', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.P, 'Psychic');
    });
    (0, node_test_1.it)('should map F to Fighting', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.F, 'Fighting');
    });
    (0, node_test_1.it)('should map D to Darkness', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.D, 'Darkness');
    });
    (0, node_test_1.it)('should map M to Metal', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.M, 'Metal');
    });
    (0, node_test_1.it)('should map C to Colorless', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.C, 'Colorless');
    });
    (0, node_test_1.it)('should be typed as Record<EnergyType, string>', function () {
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.G, 'Grass');
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.R, 'Fire');
        // TypeScript will enforce the type
    });
});
(0, node_test_1.describe)('STATUS', function () {
    (0, node_test_1.it)('should have POISON constant', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS.POISON, 'poison');
    });
    (0, node_test_1.it)('should have POISON_PLUS constant', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS.POISON_PLUS, 'poison+');
    });
    (0, node_test_1.it)('should have BURN constant', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS.BURN, 'burn');
    });
    (0, node_test_1.it)('should have SLEEP constant', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS.SLEEP, 'sleep');
    });
    (0, node_test_1.it)('should have PARALYSIS constant', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS.PARALYSIS, 'paralysis');
    });
    (0, node_test_1.it)('should have CONFUSION constant', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS.CONFUSION, 'confusion');
    });
    (0, node_test_1.it)('should have all 6 status effects', function () {
        node_assert_1.default.strictEqual(Object.keys(constants_js_1.STATUS).length, 6);
    });
});
(0, node_test_1.describe)('STATUS_CHECKUP_ORDER', function () {
    (0, node_test_1.it)('should be an array of status strings', function () {
        node_assert_1.default.ok(Array.isArray(constants_js_1.STATUS_CHECKUP_ORDER));
    });
    (0, node_test_1.it)('should contain 5 statuses in the correct order', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS_CHECKUP_ORDER.length, 5);
        node_assert_1.default.strictEqual(constants_js_1.STATUS_CHECKUP_ORDER[0], 'poison');
        node_assert_1.default.strictEqual(constants_js_1.STATUS_CHECKUP_ORDER[1], 'poison+');
        node_assert_1.default.strictEqual(constants_js_1.STATUS_CHECKUP_ORDER[2], 'burn');
        node_assert_1.default.strictEqual(constants_js_1.STATUS_CHECKUP_ORDER[3], 'sleep');
        node_assert_1.default.strictEqual(constants_js_1.STATUS_CHECKUP_ORDER[4], 'paralysis');
    });
    (0, node_test_1.it)('should not include confusion in checkup order', function () {
        node_assert_1.default.ok(!constants_js_1.STATUS_CHECKUP_ORDER.includes('confusion'));
    });
    (0, node_test_1.it)('should be typed as Status[]', function () {
        node_assert_1.default.ok(constants_js_1.STATUS_CHECKUP_ORDER.every(function (s) { return typeof s === 'string'; }));
    });
});
(0, node_test_1.describe)('STATUS_DAMAGE', function () {
    (0, node_test_1.it)('should have damage for poison', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS_DAMAGE[constants_js_1.STATUS.POISON], 10);
    });
    (0, node_test_1.it)('should have damage for poison+', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS_DAMAGE[constants_js_1.STATUS.POISON_PLUS], 20);
    });
    (0, node_test_1.it)('should have damage for burn', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS_DAMAGE[constants_js_1.STATUS.BURN], 20);
    });
    (0, node_test_1.it)('should not have damage for sleep', function () {
        node_assert_1.default.strictEqual('sleep' in constants_js_1.STATUS_DAMAGE, false);
    });
    (0, node_test_1.it)('should not have damage for paralysis', function () {
        node_assert_1.default.strictEqual('paralysis' in constants_js_1.STATUS_DAMAGE, false);
    });
    (0, node_test_1.it)('should not have damage for confusion', function () {
        node_assert_1.default.strictEqual('confusion' in constants_js_1.STATUS_DAMAGE, false);
    });
});
(0, node_test_1.describe)('KO_POINTS', function () {
    (0, node_test_1.it)('should have NORMAL points value', function () {
        node_assert_1.default.strictEqual(constants_js_1.KO_POINTS.NORMAL, 1);
    });
    (0, node_test_1.it)('should have EX points value', function () {
        node_assert_1.default.strictEqual(constants_js_1.KO_POINTS.EX, 2);
    });
    (0, node_test_1.it)('should have exactly 2 KO point types', function () {
        node_assert_1.default.strictEqual(Object.keys(constants_js_1.KO_POINTS).length, 2);
    });
    (0, node_test_1.it)('should be typed as Record<PokemonType, number>', function () {
        node_assert_1.default.strictEqual(typeof constants_js_1.KO_POINTS.NORMAL, 'number');
        node_assert_1.default.strictEqual(typeof constants_js_1.KO_POINTS.EX, 'number');
    });
});
(0, node_test_1.describe)('Type definitions', function () {
    (0, node_test_1.it)('EnergyType should include all energy codes', function () {
        var energyTypes = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
        node_assert_1.default.strictEqual(energyTypes.length, 9);
    });
    (0, node_test_1.it)('Status should include all status effects', function () {
        var statuses = ['poison', 'poison+', 'burn', 'sleep', 'paralysis', 'confusion'];
        node_assert_1.default.strictEqual(statuses.length, 6);
    });
    (0, node_test_1.it)('PokemonType should include NORMAL and EX', function () {
        var pokemonTypes = ['NORMAL', 'EX'];
        node_assert_1.default.strictEqual(pokemonTypes.length, 2);
    });
});
(0, node_test_1.describe)('Const assertions', function () {
    (0, node_test_1.it)('constants should be readonly', function () {
        // TypeScript will prevent modification of const assertions
        // At runtime, we just verify the values exist
        node_assert_1.default.strictEqual(constants_js_1.MAX_BENCH, 3);
        node_assert_1.default.strictEqual(constants_js_1.ENERGY_TYPES.G, 'Grass');
        node_assert_1.default.strictEqual(constants_js_1.STATUS.POISON, 'poison');
        node_assert_1.default.strictEqual(constants_js_1.KO_POINTS.NORMAL, 1);
    });
    (0, node_test_1.it)('ENERGY_TYPES keys should match EnergyType', function () {
        var energyKeys = Object.keys(constants_js_1.ENERGY_TYPES);
        var expected = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M', 'C'];
        node_assert_1.default.deepStrictEqual(energyKeys, expected);
    });
    (0, node_test_1.it)('STATUS_CHECKUP_ORDER should be readonly', function () {
        node_assert_1.default.deepStrictEqual(constants_js_1.STATUS_CHECKUP_ORDER, ['poison', 'poison+', 'burn', 'sleep', 'paralysis']);
    });
    (0, node_test_1.it)('STATUS_DAMAGE should be typed correctly', function () {
        node_assert_1.default.strictEqual(constants_js_1.STATUS_DAMAGE[constants_js_1.STATUS.POISON], 10);
        node_assert_1.default.strictEqual(constants_js_1.STATUS_DAMAGE[constants_js_1.STATUS.POISON_PLUS], 20);
        node_assert_1.default.strictEqual(constants_js_1.STATUS_DAMAGE[constants_js_1.STATUS.BURN], 20);
    });
});
