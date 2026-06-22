/* ═══════════════════════════════════════════
   حكاوي — Chat Engine + Voice
   ═══════════════════════════════════════════ */

const API_URL = 'http://localhost:8000';

// ─── DOM Elements ───
const messagesScroll = document.getElementById('messagesScroll');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const quickActions = document.getElementById('quickActions');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// ─── State ───
let isWaiting = false;
let messageCount = 0;
let isMuted = false;
let currentAudio = null;

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
    showWelcome();
    messageInput.focus();
});

// ─── App Navigation ───
function switchView(viewId) {
    // 1. Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });

    // 2. Show selected view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
    }

    // 3. Update nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.nav-item[onclick="switchView('${viewId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// ─── Map to Chat Navigation ───
function openChat(characterId) {
    // Currently only Sheikh Salem is supported, but characterId can be used later
    document.getElementById('mapScreen').classList.add('hidden');
    document.getElementById('mapScreen').classList.remove('active');
    
    document.getElementById('chatScreen').classList.remove('hidden');
    document.getElementById('chatScreen').classList.add('active');
    
    // Auto-focus input when chat opens
    setTimeout(() => messageInput.focus(), 400);
}

function closeChat() {
    document.getElementById('chatScreen').classList.add('hidden');
    document.getElementById('chatScreen').classList.remove('active');
    
    document.getElementById('mapScreen').classList.remove('hidden');
    document.getElementById('mapScreen').classList.add('active');
    
    stopAudio();
}

// ─── Input Events ───
messageInput.addEventListener('input', () => {
    sendBtn.disabled = messageInput.value.trim().length === 0;
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ─── Welcome Message ───
function showWelcome() {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-block';
    welcome.innerHTML = `
        <span class="welcome-icon">🏜️</span>
        <h2 class="welcome-title">أهلاً في خيمة الشيخ سالم</h2>
        <p class="welcome-subtitle">
            شيخ قبيلة من سيناء، حارس حكايات الصحراء ورموز الكليم البدوي.
            <br>اسأله عن الصحراء، النجوم، الضيافة، أو أي حاجة عايز تعرفها.
        </p>
    `;
    messagesScroll.appendChild(welcome);
}

// ─── Send Message ───
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isWaiting) return;

    // Remove welcome on first message
    const welcomeBlock = messagesScroll.querySelector('.welcome-block');
    if (welcomeBlock) {
        welcomeBlock.style.animation = 'fadeOut 0.25s ease forwards';
        setTimeout(() => welcomeBlock.remove(), 250);
    }

    // Stop any playing audio
    stopAudio();

    // Add user message
    addMessage(text, 'user');
    messageInput.value = '';
    sendBtn.disabled = true;
    isWaiting = true;

    // Hide quick actions after first few messages
    messageCount++;
    if (messageCount >= 2) {
        quickActions.style.display = 'none';
    }

    // Show typing
    showTyping();

    // Call API
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) throw new Error('Network error');

        const data = await response.json();

        // Simulate natural typing delay
        const delay = Math.min(800 + data.reply.length * 8, 2500);
        await sleep(delay);

        hideTyping();

        // Add message with unique ID for audio button
        const msgId = 'msg-' + Date.now();
        addMessage(data.reply, 'ai', data.mood, msgId);

        // Auto-play voice
        if (!isMuted) {
            playAudio(data.reply, msgId);
        }

    } catch (err) {
        console.error('Chat error:', err);
        hideTyping();
        addMessage(
            'عذراً يا ولدي... الريح قوية النهاردة وقطعت الطريق. تأكد إن السيرفر شغال وجرب تاني.',
            'ai',
            'calm'
        );
    }

    isWaiting = false;
}

// ─── Quick Send ───
function quickSend(text) {
    messageInput.value = text;
    sendBtn.disabled = false;
    sendMessage();
}

// ─── Add Message ───
function addMessage(text, sender, mood = '', msgId = '') {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;

    let avatarHtml = '';
    if (sender === 'ai') {
        avatarHtml = `<img src="assets/sheikh_salem.png" alt="" class="msg-avatar">`;
    }

    const now = new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const senderLabel = sender === 'ai' ? 'الشيخ سالم' : 'أنت';

    // Audio button for AI messages
    let audioBtn = '';
    if (sender === 'ai' && msgId) {
        audioBtn = `
            <button class="audio-btn" id="audio-${msgId}" onclick="replayAudio('${msgId}')" title="شغّل الصوت">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
            </button>
        `;
    }

    row.innerHTML = `
        ${avatarHtml}
        <div class="message-bubble ${mood}">
            <p class="message-text">${escapeHtml(text)}</p>
            <div class="message-meta">
                <span class="message-sender">${senderLabel}</span>
                <span class="message-time">${now}</span>
                ${audioBtn}
            </div>
        </div>
    `;

    // Store text for replay
    if (msgId) {
        row.dataset.text = text;
        row.id = msgId;
    }

    messagesScroll.appendChild(row);
    scrollToBottom();
}

// ─── Audio Playback ───
async function playAudio(text, msgId) {
    const btn = document.getElementById(`audio-${msgId}`);
    if (btn) {
        btn.classList.add('playing');
    }

    try {
        const response = await fetch(`${API_URL}/speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error('TTS error');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Stop any previous audio
        stopAudio();

        currentAudio = new Audio(url);
        currentAudio.onended = () => {
            if (btn) btn.classList.remove('playing');
            currentAudio = null;
        };
        currentAudio.onerror = () => {
            if (btn) btn.classList.remove('playing');
            currentAudio = null;
        };
        currentAudio.play();

    } catch (err) {
        console.error('Audio error:', err);
        if (btn) btn.classList.remove('playing');
    }
}

function replayAudio(msgId) {
    const row = document.getElementById(msgId);
    if (row && row.dataset.text) {
        stopAudio();
        playAudio(row.dataset.text, msgId);
    }
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    // Remove playing state from all buttons
    document.querySelectorAll('.audio-btn.playing').forEach(btn => {
        btn.classList.remove('playing');
    });
}

// ─── Mute Toggle ───
function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.innerHTML = isMuted
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;

        muteBtn.title = isMuted ? 'تشغيل الصوت' : 'كتم الصوت';
    }

    if (isMuted) {
        stopAudio();
    }
}

// ─── Typing Indicator ───
function showTyping() {
    typingIndicator.classList.add('visible');
    scrollToBottom();
}

function hideTyping() {
    typingIndicator.classList.remove('visible');
}

// ─── Sidebar Toggle (Mobile) ───
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible');
}

// ─── Utilities ───
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Injected Styles ───
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        to { opacity: 0; transform: translateY(-8px); }
    }
`;
document.head.appendChild(style);
