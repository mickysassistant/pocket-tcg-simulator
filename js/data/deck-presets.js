/**
 * Stage 3: predefined deck presets for quick game start
 */

export const deckPresets = [
  {
    id: 'preset-grass',
    name: 'Bulbasaur Line',
    description: 'Grass-focused preset based on A1 early cards',
    deck: [
      'A1-001','A1-001','A1-002','A1-002','A1-003',
      'A1-004','A1-005','A1-006','A1-007','A1-008',
      'A1-009','A1-010','A1-011','A1-012','A1-013',
      'A1-014','A1-015','A1-016','A1-017','A1-018'
    ],
    energyTypes: ['G','C']
  },
  {
    id: 'preset-fire',
    name: 'Charmander Line',
    description: 'Fire-focused preset based on A1 mid cards',
    deck: [
      'A1-045','A1-045','A1-046','A1-046','A1-047',
      'A1-048','A1-049','A1-050','A1-051','A1-052',
      'A1-053','A1-054','A1-055','A1-056','A1-057',
      'A1-058','A1-059','A1-060','A1-061','A1-062'
    ],
    energyTypes: ['R','C']
  }
];

export function getAllDeckPresets() {
  return [...deckPresets];
}

export function getDeckPreset(id) {
  return deckPresets.find(p => p.id === id) || null;
}

export function validateDeckPreset(preset) {
  const errors = [];
  if (!preset || typeof preset !== 'object') errors.push('invalid preset');
  if (!preset?.id) errors.push('missing id');
  if (!preset?.name) errors.push('missing name');
  if (!Array.isArray(preset?.deck) || preset.deck.length !== 20) errors.push('deck must contain 20 cards');
  if (!Array.isArray(preset?.energyTypes) || preset.energyTypes.length === 0) errors.push('missing energy types');
  return { valid: errors.length === 0, errors };
}
