/**
 * Split text into TTS chunks for low-latency playback on L4.
 *
 * - Single-chunk mode up to 55 words (typical full response).
 * - Primary split: paragraph breaks (\\n\\n) only — no comma splitting.
 * - Fallback: sentence endings (. ! ؟) at 28 words when text exceeds 55 words.
 */


export function splitIntoBreathGroups(text) {
  if (!text) return [];
  const trimmed = text.trim().replace(/\s*\n\s*/g, " ").trim();
  if (!trimmed) return [];

  const CHUNK_SIZE = 40;
  const words = trimmed.split(/\s+/);
  if (words.length <= CHUNK_SIZE) return [trimmed];

  const chunks = [];
  let currentChunkStart = 0;

  while (currentChunkStart < words.length) {
    if (words.length - currentChunkStart <= 55) {
      chunks.push(words.slice(currentChunkStart).join(" "));
      break;
    }

    let targetEnd = currentChunkStart + CHUNK_SIZE;
    if (targetEnd >= words.length) {
      chunks.push(words.slice(currentChunkStart).join(" "));
      break;
    }

    let bestCommaIndex = -1;
    let windowStart = Math.max(currentChunkStart, targetEnd - 15);
    let windowEnd = Math.min(words.length - 1, targetEnd + 15);
    
    for (let i = windowStart; i <= windowEnd; i++) {
      if (words[i].endsWith('،') || words[i].endsWith(',')) {
        if (bestCommaIndex === -1 || Math.abs(i - targetEnd) < Math.abs(bestCommaIndex - targetEnd)) {
          bestCommaIndex = i;
        }
      }
    }

    let splitWordIndex = targetEnd;
    if (bestCommaIndex !== -1) {
      splitWordIndex = bestCommaIndex + 1;
    }

    chunks.push(words.slice(currentChunkStart, splitWordIndex).join(" "));
    currentChunkStart = splitWordIndex;
  }

  return chunks;
}
