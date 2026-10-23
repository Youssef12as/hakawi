const AVAILABLE_CHARACTER_KEYS = new Set([
  'aswan-general',
  'abu-simbel',
  'great-pyramid',
  'khufu_pyramid',
]);

export function isCharacterAvailable(monumentKey) {
  return AVAILABLE_CHARACTER_KEYS.has(monumentKey);
}

export function findAvailableCharacter(monuments = []) {
  return monuments.find((monument) => isCharacterAvailable(monument.key));
}

