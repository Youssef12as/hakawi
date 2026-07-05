// ═══════════════════════════════════════════════════════════════════════════
// Hikawi (حكاوي) — Frontend Chat Logic
// ═══════════════════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────────────────────
let sessionId = crypto.randomUUID();
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let mediaStream = null;
let currentCharacter = null; // Name of the saved voice character

// ── DOM References ───────────────────────────────────────────────────────────
const chatMessages = document.getElementById("chat-messages");
const textInput = document.getElementById("text-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const recordingIndicator = document.getElementById("recording-indicator");
const voiceBar = document.getElementById("voice-bar");
const voiceBarText = document.getElementById("voice-bar-text");
const voiceBarArrow = document.getElementById("voice-bar-arrow");
const characterPanel = document.getElementById("character-panel");
const characterForm = document.getElementById("character-form");
const charStatus = document.getElementById("char-status");
const saveCharBtn = document.getElementById("save-char-btn");
const charSelector = document.getElementById("char-selector");
const charSelectorSection = document.getElementById("char-selector-section");
const savedCharacters = []; // List of saved character names

// ── Initialize ───────────────────────────────────────────────────────────────
updateVoiceBar();

// ── Chat Message Functions ───────────────────────────────────────────────────

function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);

    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("message-bubble");

    const textP = document.createElement("p");
    textP.classList.add("message-text");
    textP.textContent = text;
    bubbleDiv.appendChild(textP);

    // Add play button for AI messages
    if (sender === "ai") {
        const playBtn = document.createElement("button");
        playBtn.classList.add("play-btn");
        playBtn.title = "شغّل الصوت";
        playBtn.textContent = "🔊";
        playBtn.addEventListener("click", () => playTTS(text, playBtn));
        bubbleDiv.appendChild(playBtn);
    }

    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    return messageDiv;
}

function showLoading() {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "ai-message");
    messageDiv.id = "loading-message";

    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("message-bubble");

    const dotsDiv = document.createElement("div");
    dotsDiv.classList.add("loading-dots");
    dotsDiv.innerHTML = "<span></span><span></span><span></span>";

    bubbleDiv.appendChild(dotsDiv);
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    return messageDiv;
}

function removeLoading() {
    const loading = document.getElementById("loading-message");
    if (loading) loading.remove();
}

function showError(text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "ai-message", "error-message");

    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("message-bubble");

    const textP = document.createElement("p");
    textP.classList.add("message-text");
    textP.textContent = `⚠️ ${text}`;
    bubbleDiv.appendChild(textP);

    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

// ── Text Chat ────────────────────────────────────────────────────────────────

async function sendTextMessage() {
    const text = textInput.value.trim();
    if (!text) return;

    textInput.value = "";
    setInputEnabled(false);
    addMessage(text, "user");
    showLoading();

    try {
        // 1. Get AI response
        const response = await fetch("/api/chat/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, session_id: sessionId }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();
        sessionId = data.session_id;
        const aiText = data.response;

        removeLoading();

        // 2. If character is set → sentence-by-sentence TTS pipeline
        if (currentCharacter) {
            await playSentencePipeline(aiText);
        } else {
            // No character — just show text
            addMessage(aiText, "ai");
        }

    } catch (err) {
        removeLoading();
        showError(`فشل إرسال الرسالة: ${err.message}`);
    } finally {
        setInputEnabled(true);
        textInput.focus();
    }
}

// ── Sentence Pipeline ────────────────────────────────────────────────────────

/**
 * Split text into breath groups optimized for TTS and Gradio efficiency.
 *
 * Aim for chunks close to the 20-word maximum to minimize the number of requests to Gradio.
 * Splits on sentence-ending punctuation (. ! ؟), commas (، ,), and ellipses (...).
 * If a chunk is still too long (> 20 words), splits on conjunctions (و، لكن، بس).
 * Finally, uses whitespace splitting if absolutely necessary to enforce the limit.
 */
function splitIntoBreathGroups(text) {
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

/**
 * Fetch TTS audio for a single sentence.
 * Returns an Audio element ready to play, or null on failure.
 */
async function fetchSentenceAudio(sentence) {
    try {
        const resp = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sentence, character_name: currentCharacter }),
        });

        if (!resp.ok) return null;

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio._blobUrl = url; // Store for cleanup
        return audio;
    } catch {
        return null;
    }
}

/**
 * Play a single audio element and type text simultaneously.
 * Returns a promise that resolves when audio finishes.
 */
function playAudioWithTyping(audio, sentence, textP, existingText) {
    return new Promise((resolve) => {
        const startOffset = existingText.length;

        // Typing function
        let charIndex = 0;
        let typingTimer = null;

        function startTyping(msPerChar) {
            function typeNext() {
                if (charIndex < sentence.length) {
                    charIndex++;
                    textP.textContent = existingText + sentence.slice(0, charIndex);
                    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
                    typingTimer = setTimeout(typeNext, msPerChar);
                }
            }
            typeNext();
        }

        function finishUp() {
            if (typingTimer) clearTimeout(typingTimer);
            // Ensure full sentence is shown
            textP.textContent = existingText + sentence;
            if (audio._blobUrl) URL.revokeObjectURL(audio._blobUrl);
            resolve();
        }

        audio.onended = finishUp;
        audio.onerror = finishUp;

        // Try to get real duration for typing speed
        audio.onloadedmetadata = () => {
            const msPerChar = Math.max(20, (audio.duration * 1000) / sentence.length);
            startTyping(msPerChar);
        };

        audio.play().then(() => {
            // Fallback: if metadata didn't load yet, use estimate
            if (charIndex === 0) {
                startTyping(50); // ~50ms per char as fallback
            }
        }).catch(() => {
            // Audio can't play — just show text
            finishUp();
        });
    });
}

/**
 * Main pipeline: split text into sentences, prefetch next while current plays.
 */
async function playSentencePipeline(fullText) {
    const sentences = splitIntoBreathGroups(fullText);

    // Guard: if splitting returned nothing, just show the full text
    if (!sentences || sentences.length === 0) {
        addMessage(fullText, "ai");
        return;
    }

    // Create the message bubble (empty, will be filled sentence by sentence)
    const msgEl = addMessageEmpty("ai", fullText);
    const textP = msgEl.querySelector(".message-text");
    const playBtn = msgEl.querySelector(".play-btn");

    if (playBtn) {
        playBtn.classList.add("playing");
        playBtn.textContent = "🔉";
    }

    let displayedText = "";

    // Start fetching sentence 0 immediately
    let nextAudioPromise = fetchSentenceAudio(sentences[0]);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        // Skip empty or whitespace-only chunks (extra safety)
        if (!sentence || !sentence.trim()) {
            if (i + 1 < sentences.length) {
                nextAudioPromise = fetchSentenceAudio(sentences[i + 1]);
            }
            continue;
        }

        // Wait for current sentence's audio
        const audio = await nextAudioPromise;

        // Start prefetching NEXT sentence while current plays
        if (i + 1 < sentences.length) {
            nextAudioPromise = fetchSentenceAudio(sentences[i + 1]);
        }

        if (audio) {
            // Play audio + type sentence simultaneously
            await playAudioWithTyping(audio, sentence + " ", textP, displayedText);
        } else {
            // TTS failed for this sentence — just show text
            textP.textContent = displayedText + sentence + " ";
        }

        displayedText += sentence + " ";
    }

    // Clean up: show full text, reset play button
    textP.textContent = fullText;
    if (playBtn) {
        playBtn.classList.remove("playing");
        playBtn.textContent = "🔊";
    }
}

/**
 * Create an AI message bubble with empty text (for typing effect).
 */
function addMessageEmpty(sender, fullText) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);

    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("message-bubble");

    const textP = document.createElement("p");
    textP.classList.add("message-text");
    textP.textContent = "";
    bubbleDiv.appendChild(textP);

    if (sender === "ai") {
        const playBtn = document.createElement("button");
        playBtn.classList.add("play-btn");
        playBtn.title = "شغّل الصوت";
        playBtn.textContent = "🔊";
        playBtn.addEventListener("click", () => playTTS(fullText, playBtn));
        bubbleDiv.appendChild(playBtn);
    }

    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    return messageDiv;
}

/**
 * Update loading indicator text
 */
function updateLoadingText(text) {
    const loading = document.getElementById("loading-message");
    if (loading) {
        const bubble = loading.querySelector(".message-bubble");
        if (bubble) {
            bubble.innerHTML = `<p class="message-text" style="color: var(--accent-gold); font-size: 0.85rem;">${text}</p>`;
        }
    }
}


// ── Audio Recording ──────────────────────────────────────────────────────────

async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        let mimeType = "audio/webm;codecs=opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "audio/webm";
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";
        }

        const options = mimeType ? { mimeType } : {};
        mediaRecorder = new MediaRecorder(mediaStream, options);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.onstop = () => sendAudioMessage();

        mediaRecorder.start();
        isRecording = true;
        micBtn.classList.add("recording");
        recordingIndicator.classList.remove("hidden");
    } catch (err) {
        showError("لم نتمكن من الوصول للميكروفون. تأكد من إعطاء الإذن.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
    }
    isRecording = false;
    micBtn.classList.remove("recording");
    recordingIndicator.classList.add("hidden");
}

async function sendAudioMessage() {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];
    if (blob.size === 0) { showError("التسجيل فارغ."); return; }

    // Show transcribing indicator
    textInput.value = "جاري تحويل الصوت لنص...";
    textInput.disabled = true;

    try {
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        const response = await fetch("/api/stt", { method: "POST", body: formData });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();

        // Put transcribed text in input for user to review/edit
        textInput.value = data.text;
        textInput.disabled = false;
        textInput.focus();

    } catch (err) {
        textInput.value = "";
        textInput.disabled = false;
        showError(`فشل تحويل الصوت: ${err.message}`);
    }
}

// ── TTS Playback ─────────────────────────────────────────────────────────────

async function playTTS(text, btn) {
    // ★ GUARD: character must be saved first
    if (!currentCharacter) {
        showError("⛔ يجب حفظ شخصية صوتية أولاً! افتح لوحة الصوت واحفظ شخصية.");
        // Open the panel to guide the user
        if (characterPanel.classList.contains("collapsed")) {
            togglePanel();
        }
        return;
    }

    if (btn.classList.contains("playing")) return;
    btn.classList.add("playing");
    btn.textContent = "🔉";

    try {
        const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, character_name: currentCharacter }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `TTS failed: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            btn.classList.remove("playing");
            btn.textContent = "🔊";
        };
        audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            btn.classList.remove("playing");
            btn.textContent = "🔊";
            showError("فشل تشغيل الصوت");
        };
        await audio.play();
    } catch (err) {
        btn.classList.remove("playing");
        btn.textContent = "🔊";
        showError(`فشل تشغيل الصوت: ${err.message}`);
    }
}

// ── Sliding Character Panel ──────────────────────────────────────────────────

function togglePanel() {
    characterPanel.classList.toggle("collapsed");
    voiceBar.classList.toggle("open");
}

function updateVoiceBar() {
    if (currentCharacter) {
        voiceBar.classList.remove("no-voice");
        voiceBar.classList.add("has-voice");
        voiceBarText.textContent = `✅ الشخصية النشطة: ${currentCharacter}`;
    } else if (savedCharacters.length > 0) {
        voiceBar.classList.remove("has-voice");
        voiceBar.classList.add("no-voice");
        voiceBarText.textContent = "⚠️ اختر شخصية من القائمة";
    } else {
        voiceBar.classList.remove("has-voice");
        voiceBar.classList.add("no-voice");
        voiceBarText.textContent = "⚠️ لم يتم إضافة صوت — اضغط هنا لإضافة شخصية";
    }
}

function addCharacterToSelector(name) {
    if (!savedCharacters.includes(name)) {
        savedCharacters.push(name);
    }

    // Show selector section
    charSelectorSection.classList.remove("hidden");

    // Add option if not already there
    const exists = Array.from(charSelector.options).some(o => o.value === name);
    if (!exists) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        charSelector.appendChild(option);
    }

    // Select the new character
    charSelector.value = name;
    currentCharacter = name;
    updateVoiceBar();
}

// When user changes the dropdown
charSelector.addEventListener("change", () => {
    currentCharacter = charSelector.value;
    updateVoiceBar();
});

async function handleCharacterSubmit(e) {
    e.preventDefault();

    const charName = document.getElementById("char-name").value.trim();
    const refText = document.getElementById("ref-text").value.trim();
    const audioFile = document.getElementById("char-audio").files[0];

    if (!charName || !refText || !audioFile) {
        showCharStatus("يرجى ملء جميع الحقول", "error");
        return;
    }

    showCharStatus("جاري حفظ الشخصية... قد يستغرق بضع ثوانٍ ⏳", "loading");
    saveCharBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("char_name", charName);
        formData.append("ref_text", refText);
        formData.append("audio_file", audioFile);

        const response = await fetch("/api/characters/add", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Error: ${response.status}`);
        }

        const data = await response.json();

        // Add to selector and select it
        addCharacterToSelector(data.character_name);

        showCharStatus(`✅ تم حفظ "${data.character_name}" بنجاح!`, "success");

        // Clear the form for next character
        characterForm.reset();

        // Collapse the add form
        document.getElementById("add-char-details").removeAttribute("open");

    } catch (err) {
        showCharStatus(`❌ ${err.message}`, "error");
        console.error("Save character error:", err);
    } finally {
        saveCharBtn.disabled = false;
    }
}

function showCharStatus(text, type) {
    charStatus.textContent = text;
    charStatus.className = `form-status ${type}`;
}

// ── Utilities ────────────────────────────────────────────────────────────────

function setInputEnabled(enabled) {
    textInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
    sendBtn.style.opacity = enabled ? "1" : "0.5";
}

// ── Event Listeners ──────────────────────────────────────────────────────────

sendBtn.addEventListener("click", sendTextMessage);
micBtn.addEventListener("click", toggleRecording);
textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
});

voiceBar.addEventListener("click", togglePanel);
characterForm.addEventListener("submit", handleCharacterSubmit);
