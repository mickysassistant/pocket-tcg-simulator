/**
 * Tests for card data type definitions
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
describe('Card Types', () => {
    describe('CardSource', () => {
        it('should accept valid source data', () => {
            const source = {
                kind: 'limitless-pocket-html',
                url: 'https://pocket.limitlesstcg.com/cards/A1/1'
            };
            assert.strictEqual(source.kind, 'limitless-pocket-html');
            assert.strictEqual(source.url, 'https://pocket.limitlesstcg.com/cards/A1/1');
        });
    });
    describe('CardImages', () => {
        it('should accept valid image URLs', () => {
            const images = {
                small: 'https://example.com/small.png',
                full: 'https://example.com/full.png'
            };
            assert.strictEqual(images.small, 'https://example.com/small.png');
            assert.strictEqual(images.full, 'https://example.com/full.png');
        });
    });
    describe('Ability', () => {
        it('should accept ability with all fields', () => {
            const ability = {
                energyCost: ['G', 'C'],
                name: 'Powder Heal',
                damage: null,
                effect: 'Once during your turn, you may heal 20 damage from each of your Pokémon.',
                rawInfo: 'Ability:\nPowder Heal'
            };
            assert.strictEqual(ability.name, 'Powder Heal');
            assert.strictEqual(ability.effect, 'Once during your turn, you may heal 20 damage from each of your Pokémon.');
        });
        it('should accept ability with only required fields', () => {
            const ability = {
                name: 'Test Ability',
                rawInfo: 'Ability:\nTest Ability'
            };
            assert.strictEqual(ability.name, 'Test Ability');
            assert.strictEqual(ability.effect, undefined);
        });
    });
    describe('Attack', () => {
        it('should accept attack with all fields', () => {
            const attack = {
                energyCost: ['G', 'C', 'C', 'C'],
                name: 'Psychic',
                damage: '80+',
                effect: 'This attack does 20 more damage for each Energy attached to your opponent\'s Active Pokémon.',
                rawInfo: 'GCCC\nPsychic 80+'
            };
            assert.strictEqual(attack.name, 'Psychic');
            assert.strictEqual(attack.damage, '80+');
        });
        it('should accept attack with null damage and effect', () => {
            const attack = {
                energyCost: ['C'],
                name: 'Growth Spurt',
                damage: null,
                effect: 'Take a [G] Energy from your Energy Zone and attach it to this Pokémon.',
                rawInfo: 'C\nGrowth Spurt'
            };
            assert.strictEqual(attack.name, 'Growth Spurt');
            assert.strictEqual(attack.damage, null);
        });
    });
    describe('Card', () => {
        it('should accept valid Pokemon card data', () => {
            const card = {
                id: 'A1a-001',
                source: {
                    kind: 'limitless-pocket-html',
                    url: 'https://pocket.limitlesstcg.com/cards/A1a/1'
                },
                setId: 'A1a',
                number: 1,
                name: 'Exeggcute',
                supertype: 'Pokémon',
                subtype: 'Basic',
                stage: null,
                category: 'pokemon',
                element: 'Grass',
                hp: 50,
                weakness: 'Fire',
                retreat: 1,
                rules: [],
                abilities: [],
                attacks: [
                    {
                        energyCost: ['C'],
                        name: 'Growth Spurt',
                        damage: null,
                        effect: 'Take a [G] Energy from your Energy Zone and attach it to this Pokémon.',
                        rawInfo: 'C\nGrowth Spurt'
                    }
                ],
                trainerEffect: null,
                rarity: '◊',
                images: {
                    small: 'https://example.com/small.png',
                    full: 'https://example.com/full.png'
                },
                titleLine: 'Exeggcute\n- Grass - 50 HP',
                mechanicsTags: ['energy-zone']
            };
            assert.strictEqual(card.id, 'A1a-001');
            assert.strictEqual(card.name, 'Exeggcute');
            assert.strictEqual(card.supertype, 'Pokémon');
            assert.strictEqual(card.stage, null);
            assert.strictEqual(card.hp, 50);
            assert.strictEqual(card.abilities.length, 0);
            assert.strictEqual(card.attacks.length, 1);
            assert.strictEqual(card.trainerEffect, null);
        });
        it('should accept valid Trainer card data', () => {
            const card = {
                id: 'A1a-063',
                source: {
                    kind: 'limitless-pocket-html',
                    url: 'https://pocket.limitlesstcg.com/cards/A1a/63'
                },
                setId: 'A1a',
                number: 63,
                name: 'Old Amber',
                supertype: 'Trainer',
                subtype: 'Item',
                stage: null,
                category: 'trainer',
                element: null,
                hp: 40,
                weakness: null,
                retreat: null,
                rules: [],
                abilities: [],
                attacks: [],
                trainerEffect: 'Play this card as if it were a 40-HP Basic [C] Pokémon.',
                rarity: '◊',
                images: {
                    small: 'https://example.com/small.png',
                    full: 'https://example.com/full.png'
                },
                titleLine: 'Old Amber\n- 40 HP',
                mechanicsTags: ['discard']
            };
            assert.strictEqual(card.id, 'A1a-063');
            assert.strictEqual(card.supertype, 'Trainer');
            assert.strictEqual(card.category, 'trainer');
            assert.strictEqual(card.element, null);
            assert.strictEqual(card.trainerEffect, 'Play this card as if it were a 40-HP Basic [C] Pokémon.');
        });
        it('should accept card with ability', () => {
            const card = {
                id: 'A1-004',
                source: {
                    kind: 'limitless-pocket-html',
                    url: 'https://pocket.limitlesstcg.com/cards/A1/4'
                },
                setId: 'A1',
                number: 4,
                name: 'Butterfree',
                supertype: 'Pokémon',
                subtype: 'Stage 1',
                stage: 'Caterpie',
                category: 'pokemon',
                element: 'Grass',
                hp: 120,
                weakness: 'Fire',
                retreat: 1,
                rules: [],
                abilities: [
                    {
                        name: 'Powder Heal',
                        effect: 'Once during your turn, you may heal 20 damage from each of your Pokémon.',
                        rawInfo: 'Ability:\nPowder Heal'
                    }
                ],
                attacks: [],
                trainerEffect: null,
                rarity: '◊◊',
                images: {
                    small: 'https://example.com/small.png',
                    full: 'https://example.com/full.png'
                },
                titleLine: 'Butterfree\n- Grass - 120 HP',
                mechanicsTags: []
            };
            assert.strictEqual(card.abilities.length, 1);
            assert.strictEqual(card.abilities[0].name, 'Powder Heal');
        });
        it('should accept card with multiple attacks', () => {
            const card = {
                id: 'A1-001',
                source: {
                    kind: 'limitless-pocket-html',
                    url: 'https://pocket.limitlesstcg.com/cards/A1/1'
                },
                setId: 'A1',
                number: 1,
                name: 'Bulbasaur',
                supertype: 'Pokémon',
                subtype: 'Basic',
                stage: null,
                category: 'pokemon',
                element: 'Grass',
                hp: 60,
                weakness: 'Fire',
                retreat: 1,
                rules: [],
                abilities: [],
                attacks: [
                    {
                        energyCost: ['G', 'C'],
                        name: 'Vine Whip',
                        damage: '40',
                        effect: null,
                        rawInfo: 'GC\nVine Whip 40'
                    },
                    {
                        energyCost: ['G', 'C', 'C'],
                        name: 'Razor Leaf',
                        damage: '60',
                        effect: null,
                        rawInfo: 'GCC\nRazor Leaf 60'
                    }
                ],
                trainerEffect: null,
                rarity: '◊',
                images: {
                    small: 'https://example.com/small.png',
                    full: 'https://example.com/full.png'
                },
                titleLine: 'Bulbasaur\n- Grass - 60 HP',
                mechanicsTags: []
            };
            assert.strictEqual(card.attacks.length, 2);
            assert.strictEqual(card.attacks[0].name, 'Vine Whip');
            assert.strictEqual(card.attacks[1].name, 'Razor Leaf');
        });
        it('should have all required fields', () => {
            const card = {
                id: 'A1-001',
                source: { kind: 'test', url: 'https://test.com' },
                setId: 'A1',
                number: 1,
                name: 'Test Card',
                supertype: 'Pokémon',
                subtype: 'Basic',
                stage: null,
                category: 'pokemon',
                element: 'Grass',
                hp: 60,
                weakness: 'Fire',
                retreat: 1,
                rules: [],
                abilities: [],
                attacks: [],
                trainerEffect: null,
                rarity: '◊',
                images: { small: 'small.png', full: 'full.png' },
                titleLine: 'Test Card\n- Grass - 60 HP',
                mechanicsTags: []
            };
            // Verify all fields exist and have correct types
            assert.strictEqual(typeof card.id, 'string');
            assert.strictEqual(typeof card.source.kind, 'string');
            assert.strictEqual(typeof card.source.url, 'string');
            assert.strictEqual(typeof card.setId, 'string');
            assert.strictEqual(typeof card.number, 'number');
            assert.strictEqual(typeof card.name, 'string');
            assert.strictEqual(typeof card.supertype, 'string');
            assert.strictEqual(typeof card.subtype, 'string');
            assert.strictEqual(card.stage, null);
            assert.strictEqual(typeof card.category, 'string');
            assert.strictEqual(typeof card.element, 'string');
            assert.strictEqual(typeof card.hp, 'number');
            assert.strictEqual(typeof card.weakness, 'string');
            assert.strictEqual(typeof card.retreat, 'number');
            assert.strictEqual(Array.isArray(card.rules), true);
            assert.strictEqual(Array.isArray(card.abilities), true);
            assert.strictEqual(Array.isArray(card.attacks), true);
            assert.strictEqual(card.trainerEffect, null);
            assert.strictEqual(typeof card.rarity, 'string');
            assert.strictEqual(typeof card.images.small, 'string');
            assert.strictEqual(typeof card.images.full, 'string');
            assert.strictEqual(typeof card.titleLine, 'string');
            assert.strictEqual(Array.isArray(card.mechanicsTags), true);
        });
    });
});
