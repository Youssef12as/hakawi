/**
 * Split text into breath groups optimized for TTS and Gradio efficiency.
 *
 * Aim for chunks close to the 20-word maximum to minimize the number of requests to Gradio.
 * Splits on sentence-ending punctuation (. ! ؟), commas (، ,), and ellipses (...).
 * If a chunk is still too long (> 20 words), splits on conjunctions (و، لكن، بس).
 * Finally, uses whitespace splitting if absolutely necessary to enforce the limit.
 */
export function splitIntoBreathGroups(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const MAX_WORDS = 20;

    // 1. Primary Split: Sentence endings and breath pauses (periods, commas, ellipses, newlines)
    // Keep the punctuation attached to the preceding text.
    const primaryPattern = /(?<=[.!؟،,]|...|\n)\s+/;
    let rawChunks = trimmed.split(primaryPattern).map(c => c.trim()).filter(Boolean);

    // 2. Optimization and Secondary Splitting
    const finalChunks = [];
    let currentChunk = "";

    function wordCount(str) {
        return str.trim().split(/\s+/).filter(Boolean).length;
    }

    // Helper: Split a long string on conjunctions
    function splitOnConjunctions(longStr) {
        const conjPattern = /(\s+(?:و|لكن|ولكن|بس)\s+)/;
        const parts = longStr.split(conjPattern);
        const splitChunks = [];
        let tempChunk = "";

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;

            const isConj = conjPattern.test(part);
            if (isConj) {
                tempChunk += part;
            } else {
                if (tempChunk && (wordCount(tempChunk + part) > MAX_WORDS)) {
                    if (wordCount(tempChunk.trim()) > 0) {
                        splitChunks.push(tempChunk.trim());
                    }
                    tempChunk = part;
                } else {
                    tempChunk += part;
                }
            }
        }
        if (tempChunk.trim()) {
            splitChunks.push(tempChunk.trim());
        }
        return splitChunks;
    }

    // Helper: Force split on whitespace if still too long
    function forceSplitWhitespace(str) {
        const words = str.split(/\s+/);
        const forced = [];
        let temp = "";
        for (const word of words) {
            if (wordCount(temp + " " + word) > MAX_WORDS) {
                forced.push(temp.trim());
                temp = word;
            } else {
                temp = temp ? temp + " " + word : word;
            }
        }
        if (temp.trim()) forced.push(temp.trim());
        return forced;
    }


    for (const chunk of rawChunks) {
        const currentWords = wordCount(currentChunk);
        const chunkWords = wordCount(chunk);

        // Try to combine to minimize requests, up to MAX_WORDS limit
        if (currentChunk && (currentWords + chunkWords <= MAX_WORDS)) {
            currentChunk += " " + chunk;
        } else {
            if (currentChunk) {
                finalChunks.push(currentChunk.trim());
                currentChunk = "";
            }

            if (chunkWords <= MAX_WORDS) {
                currentChunk = chunk;
            } else {
                // Chunk is too long by itself, need secondary splitting
                const conjChunks = splitOnConjunctions(chunk);
                for (const cChunk of conjChunks) {
                    if (wordCount(cChunk) <= MAX_WORDS) {
                        // Attempt to pack into finalChunks immediately if possible
                        if (finalChunks.length > 0 && wordCount(finalChunks[finalChunks.length - 1] + " " + cChunk) <= MAX_WORDS) {
                            finalChunks[finalChunks.length - 1] += " " + cChunk;
                        } else {
                            finalChunks.push(cChunk.trim());
                        }
                    } else {
                        // Force split
                        const forced = forceSplitWhitespace(cChunk);
                        for (let i = 0; i < forced.length; i++) {
                            const fChunk = forced[i];
                            if (finalChunks.length > 0 && i === 0 && wordCount(finalChunks[finalChunks.length - 1] + " " + fChunk) <= MAX_WORDS) {
                                finalChunks[finalChunks.length - 1] += " " + fChunk;
                            } else {
                                finalChunks.push(fChunk.trim());
                            }
                        }
                    }
                }
            }
        }
    }

    if (currentChunk) {
        finalChunks.push(currentChunk.trim());
    }

    // Return the processed chunks
    return finalChunks.length > 0 ? finalChunks : [trimmed];
}
