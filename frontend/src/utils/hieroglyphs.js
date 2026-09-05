export const arabicToHieroglyphsMap = {
  // Letters
  'ا': '𓄿', 'أ': '𓄿', 'إ': '𓄿', 'آ': '𓄿',
  'ب': '𓃀',
  'ت': '𓏏', 'ة': '𓏏',
  'ث': '𓍘',
  'ج': '𓆓',
  'ح': '𓎛',
  'خ': '𓐍',
  'د': '𓂧',
  'ذ': '𓂧',
  'ر': '𓂋',
  'ز': '𓊃',
  'س': '𓋴',
  'ش': '𓈙',
  'ص': '𓋴',
  'ض': '𓂧',
  'ط': '𓏏',
  'ظ': '𓆓',
  'ع': '𓂝',
  'غ': '𓎼',
  'ف': '𓆑',
  'ق': '𓈎',
  'ك': '𓎡',
  'ل': '𓃭',
  'م': '𓅓',
  'ن': '𓈖',
  'ه': '𓉔',
  'و': '𓅱', 'ؤ': '𓅱',
  'ي': '𓇋', 'ى': '𓇋', 'ئ': '𓇋',

  // Punctuation (optional, we can leave these as is or map them)
  '؟': '𓏤',
  '،': ' ',
  ',': ' ',
  '.': '𓏤',
  ':': '𓏤'
};

/**
 * Converts standard Arabic text into Egyptian Hieroglyphic unicode symbols.
 * Characters not in the map are left as is.
 * 
 * @param {string} text - The input Arabic string.
 * @returns {string} - The string converted to Hieroglyphs.
 */
export function arabicToHieroglyphs(text) {
  if (!text) return '';
  return text.split('').map(char => {
    // Check if the character is in our map, otherwise leave as is.
    // E.g., numbers, spaces, non-mapped characters.
    return arabicToHieroglyphsMap[char] || char;
  }).join('');
}
