/**
 * Monument key ↔ URL slug mapping.
 * The "*-general" keys use the slug "hawari" (scoped by governorate).
 */

const KEY_TO_SLUG = {
  'aswan-general': 'hawari',
  'cairo-general': 'hawari',
  'giza-general': 'hawari',
  'khufu_pyramid': 'khufu',
};

export function keyToSlug(key) {
  return KEY_TO_SLUG[key] || key;
}

export function slugToKey(govKey, slug) {
  if (slug === 'hawari') {
    return `${govKey}-general`;
  }
  if (slug === 'khufu') {
    return 'khufu_pyramid';
  }
  return slug;
}
