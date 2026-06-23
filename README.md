# 🏛️ Hikawi (حكاوي) — Frontend Implementation Plan

> This is the single source of truth for the frontend developer.  
> Stack: **Vanilla HTML/CSS/JS** (current codebase) — no React needed.  
> Deadline: **August 15, 2026 — CU AI Nexus Hackathon**

---

## 🏗️ App Structure (What Already Exists)

```
index.html         ← App shell + all views
style.css          ← All styling
script.js          ← All logic + switchView()
/assets/
  /characters/     ← Character video/image files (you add these)
  /audio/          ← Pre-cached audio responses
  /backgrounds/    ← Regional background photos
```

Three main views, controlled by `switchView(id)` in `script.js`:

| View ID | Arabic Name | What it is |
|---|---|---|
| `#view-map` | الخريطة | SVG map of Egypt → opens chat |
| `#view-family` | شخصياتي | Add/manage grandparent characters |
| `#view-kids` | حكايات أطفال | Kids story generator |

---

## 🎭 Character Display — Two Options (Pick One Before You Start)

This is the most important decision. Everything else depends on it.

---

### Option A — AI Selects the Character Automatically

**How it works:**
1. User clicks a site on the map
2. Frontend sends site name + region to backend
3. Backend calls Llama-3 + Wikipedia → generates character identity (name, role, era, personality)
4. Backend calls DALL-E/Gemini Imagen → generates a portrait image of that character
5. Frontend receives `{ name, role, portrait_url, greeting_audio_url }` and displays it

**What you build on the frontend:**
```js
async function openChat(siteName, region) {
  // 1. Show loading skeleton
  showLoadingSkeleton();

  // 2. Ask backend to generate the character
  const res = await fetch('/api/generate-character', {
    method: 'POST',
    body: JSON.stringify({ site: siteName, region })
  });
  const character = await res.json();
  // character = { name, role, portrait_url, background_type, greeting_audio_url }

  // 3. Display character panel
  renderCharacterPanel(character);

  // 4. Play greeting audio → triggers talking animation
  playAudio(character.greeting_audio_url);
}
```

**Character panel HTML structure:**
```html
<div class="character-panel">
  <div class="background" id="char-bg"></div>        <!-- regional photo -->
  <img id="char-portrait" src="" alt="" />            <!-- AI generated face -->
  <div class="talking-ring" id="ring"></div>          <!-- CSS ring when talking -->
  <div class="char-info">
    <h2 id="char-name"></h2>
    <p id="char-role"></p>
  </div>
</div>
```

**Talking ring CSS (all the "mouth movement" you need):**
```css
.talking-ring {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 3px solid #D4A843;
  opacity: 0;
  transition: opacity 0.3s;
}

.talking-ring.active {
  opacity: 1;
  animation: pulse 0.6s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { transform: scale(1);   border-color: #D4A843; }
  to   { transform: scale(1.08); border-color: #C4956A; }
}
```

**Trigger ring from audio:**
```js
function playAudio(url) {
  const audio = new Audio(url);
  const ring = document.getElementById('ring');

  audio.addEventListener('play',  () => ring.classList.add('active'));
  audio.addEventListener('ended', () => ring.classList.remove('active'));
  audio.addEventListener('pause', () => ring.classList.remove('active'));

  audio.play();
}
```

**The 5 regional background photos (download once, assign by `background_type`):**
```js
const backgrounds = {
  nubia:      '/assets/backgrounds/nubia.jpg',
  luxor:      '/assets/backgrounds/luxor.jpg',
  cairo:      '/assets/backgrounds/cairo.jpg',
  alexandria: '/assets/backgrounds/alexandria.jpg',
  sinai:      '/assets/backgrounds/sinai.jpg',
};

function renderCharacterPanel(character) {
  document.getElementById('char-bg').style.backgroundImage =
    `url(${backgrounds[character.background_type]})`;
  document.getElementById('char-portrait').src = character.portrait_url;
  document.getElementById('char-name').textContent = character.name;
  document.getElementById('char-role').textContent = character.role;
}
```

**Pros:** Zero manual character work, every site gets a unique historically accurate face, impressive to judges  
**Cons:** ~2-3 second delay on first click, DALL-E costs per image, needs internet for generation

---

### Option B — You Pre-Select the Character (Pre-uploaded Videos)

**How it works:**
1. You pre-upload 2 video files per character:
   - `nubian_elder_idle.mp4` → only eyes/lashes move, mouth closed
   - `nubian_elder_talking.mp4` → mouth moves, full expression
2. You hardcode which character appears at each map marker
3. When user clicks → swap between the two videos based on audio state

**Your character data (fill this once):**
```js
const heritageSites = [
  {
    id: 'abu_simbel',
    name: 'أبو سمبل',
    lat_svg: 120,   // SVG coordinates on your Egypt map
    lng_svg: 340,
    character: {
      name: 'عم نوبي — كاهن رمسيس',
      role: 'كاهن من عهد رمسيس الثاني',
      idle_video:    '/assets/characters/nubian_elder_idle.mp4',
      talking_video: '/assets/characters/nubian_elder_talking.mp4',
      greeting_audio: '/assets/audio/abu_simbel_greeting.mp3',
    }
  },
  {
    id: 'karnak',
    name: 'معبد الكرنك',
    lat_svg: 180,
    lng_svg: 290,
    character: {
      name: 'نفرتيتي — حارسة المعبد',
      role: 'كاهنة من الدولة الحديثة',
      idle_video:    '/assets/characters/ancient_priest_idle.mp4',
      talking_video: '/assets/characters/ancient_priest_talking.mp4',
      greeting_audio: '/assets/audio/karnak_greeting.mp3',
    }
  },
  // add more sites here...
];
```

**Character panel — video swap logic:**
```html
<div class="character-panel">
  <video id="char-video" autoplay loop muted playsinline></video>
  <div class="char-info">
    <h2 id="char-name"></h2>
    <p id="char-role"></p>
  </div>
</div>
```

```js
let currentCharacter = null;
let greetingAudio = null;

function openChat(siteId) {
  const site = heritageSites.find(s => s.id === siteId);
  currentCharacter = site.character;

  // Show idle video first
  setVideo(currentCharacter.idle_video);
  document.getElementById('char-name').textContent = currentCharacter.name;
  document.getElementById('char-role').textContent = currentCharacter.role;

  // Play greeting
  playGreeting(currentCharacter.greeting_audio);
}

function setVideo(src) {
  const video = document.getElementById('char-video');
  video.src = src;
  video.play();
}

function playGreeting(audioSrc) {
  if (greetingAudio) greetingAudio.pause();

  greetingAudio = new Audio(audioSrc);

  greetingAudio.addEventListener('play', () => {
    setVideo(currentCharacter.talking_video); // switch to talking
  });

  greetingAudio.addEventListener('ended', () => {
    setVideo(currentCharacter.idle_video);   // switch back to idle
  });

  greetingAudio.play();
}
```

**Pros:** Works fully offline, zero API delay, mouth actually moves realistically, no cost  
**Cons:** You must prepare 2 video files per character manually, characters are fixed not historically generated

---

## 🗺️ View 1 — Interactive SVG Map (`#view-map`)

Your doc already decided: **Custom SVG map** (not Leaflet, not Mapbox).  
Reasons: heritage aesthetic, works offline, no API keys, parchment feel.

**How clicking works on SVG:**
```js
// Each clickable heritage site is a <circle> or <path> in your SVG with a data-id
document.querySelectorAll('.heritage-marker').forEach(marker => {
  marker.addEventListener('click', () => {
    const siteId = marker.dataset.id;
    openChat(siteId); // triggers Option A or B above
  });
});
```

**Glowing marker CSS:**
```css
.heritage-marker {
  cursor: pointer;
  fill: #D4A843;
  filter: drop-shadow(0 0 6px #D4A843);
  transition: filter 0.3s;
}

.heritage-marker:hover {
  filter: drop-shadow(0 0 14px #D4A843) drop-shadow(0 0 30px #C4956A);
}
```

**To-Do List for Map View:**
- [ ] Add `class="heritage-marker"` and `data-id="site_id"` to every clickable point in the SVG
- [ ] Add click listeners as above
- [ ] Build the character panel overlay (see Option A or B above)
- [ ] Build the chat interface that opens after the greeting plays
- [ ] Connect chat messages to `/chat` API endpoint
- [ ] Handle audio playback with play/pause controls
- [ ] Add loading skeleton while character/audio loads
- [ ] Error state if backend is unavailable

---

## 💬 Chat Interface (opens from Map)

Appears after the character greeting plays. Simple message list + input.

**HTML structure:**
```html
<div class="chat-container">
  <div class="messages" id="messages"></div>
  <div class="chat-input-row">
    <button id="mic-btn">🎤</button>
    <input type="text" id="chat-input" placeholder="اسأل..." />
    <button id="send-btn">إرسال</button>
  </div>
</div>
```

**Send message flow:**
```js
async function sendMessage(text) {
  appendMessage('user', text);

  const res = await fetch('/chat', {
    method: 'POST',
    body: JSON.stringify({ message: text, character_id: currentCharacter.id })
  });
  const data = await res.json();
  // data = { text_response, audio_url }

  appendMessage('assistant', data.text_response);
  playAudio(data.audio_url); // this also triggers talking animation
}
```

**To-Do List for Chat:**
- [ ] Render user and assistant messages in the message list
- [ ] Connect send button + Enter key to `sendMessage()`
- [ ] Connect mic button to Web Audio API recording → send to `/api/record`
- [ ] Play TTS audio response + trigger talking state (Option A ring / Option B video swap)
- [ ] Add typing indicator while waiting for response
- [ ] Scroll to bottom on new message automatically

---

## 👨‍👩‍👧 View 2 — My Characters (`#view-family`)

Users add their own grandparent characters here.

**To-Do List:**
- [ ] Build "Add Character" form: Name, Region, Bio, photo upload, voice sample upload
- [ ] Style file upload inputs to match heritage theme
- [ ] On submit → POST to `/clone-voice` with voice sample + `/api/add-character` with profile
- [ ] Render existing characters as cards with Edit / Delete buttons
- [ ] Connect Delete to remove from backend
- [ ] Empty state: "لم تضف شخصيات بعد — ابدأ بإضافة جدك"

---

## 📖 View 3 — Kids Tales (`#view-kids`)

Story generator for children.

**To-Do List:**
- [ ] Build story config UI: choose narrator character, story genre, child's name input
- [ ] Connect "Generate Story" button to `/generate-story` endpoint
- [ ] Display story as large scrolling text (big Arabic typography)
- [ ] Auto-read aloud using ElevenLabs TTS response
- [ ] Add play/pause control for the story audio
- [ ] Loading state while story generates ("جاري نسج الحكاية...")

---

## 🎨 Global Styling Tokens

Use these everywhere. Define as CSS variables in `:root`:

```css
:root {
  --color-bg:       #1A1208;   /* deep dark brown */
  --color-gold:     #D4A843;   /* primary accent */
  --color-clay:     #C4956A;   /* secondary accent */
  --color-sand:     #F5EDD8;   /* light text */
  --color-turquoise:#4A9B8E;   /* highlight */

  --font-arabic:    'Tajawal', 'Cairo', sans-serif;
  --font-display:   'Amiri', serif;

  --radius:         12px;
  --glass-bg:       rgba(26, 18, 8, 0.7);
  --glass-border:   rgba(212, 168, 67, 0.3);
}
```

**Glassmorphism card (use for all panels):**
```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  border-radius: var(--radius);
  padding: 1.5rem;
}
```

**To-Do List for Global Styling:**
- [ ] Define all CSS variables above in `:root`
- [ ] Import Tajawal + Amiri from Google Fonts
- [ ] Apply `direction: rtl` globally for Arabic text
- [ ] Fix sidebar mobile behavior (collapse to bottom nav on mobile)
- [ ] Add smooth `opacity + translateY` transition when switching views

---

## 📋 Build Order (What to Build First)

**Week 1 — Foundation**
1. CSS variables + typography + glassmorphism card
2. Sidebar + `switchView()` working smoothly
3. SVG map with clickable markers (no character yet, just `console.log`)
4. Character panel layout (static, hardcoded placeholder)

**Week 2 — Character + Chat**
5. Implement your chosen option (A or B) for character display
6. Audio playback + talking state (ring or video swap)
7. Chat message list + send button
8. Connect to backend `/chat` endpoint (use dummy response first)

**Week 3 — Remaining Views + Polish**
9. My Characters view — form + cards
10. Kids Tales view — config + story display
11. Mobile responsiveness
12. Loading states + error states everywhere

**48 Hours Before Demo**
- [ ] Pre-cache all demo audio responses
- [ ] Test full flow with no internet (offline failsafe)
- [ ] Rehearse the 3-minute demo 10+ times

---

## 🔌 API Endpoints Reference

| Endpoint | Method | What frontend sends | What frontend receives |
|---|---|---|---|
| `/chat` | POST | `{ message, character_id }` | `{ text_response, audio_url }` |
| `/speak` | POST | `{ text, character_id }` | audio file |
| `/generate-story` | POST | `{ narrator_id, genre, child_name }` | `{ story_text, audio_url }` |
| `/clone-voice` | POST | voice sample file | `{ voice_id }` |
| `/api/generate-character` | POST | `{ site, region }` | `{ name, role, portrait_url, background_type, greeting_audio_url }` |
| `/api/add-character` | POST | character profile | `{ character_id }` |

**Test all endpoints with dummy data before connecting real AI.**  
Dummy response example for `/chat`:
```js
// Use this while backend isn't ready
const dummyResponse = {
  text_response: "يا ابني، النيل كان أوسع وأهدى في زماننا...",
  audio_url: "/assets/audio/demo_response.mp3"
};
```

---

*Hikawi Frontend Plan — Updated June 2026*  
*CU AI Nexus Hackathon 2026 — Heritage & Culture Sector*