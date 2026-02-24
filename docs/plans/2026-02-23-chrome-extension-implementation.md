# Chrome Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome Manifest V3 extension that injects a floating TTS widget into web pages, extracts text via Readability, and generates audio via the existing hosted Next.js backend.

**Architecture:** Content-script-injected floating widget using Shadow DOM for style isolation. Service worker handles icon click and injects content script on demand. Readability is bundled via esbuild. All TTS calls go to the existing backend API routes (`/api/tts`, `/api/tts-status`, `/api/download-audio`).

**Tech Stack:** Vanilla JS (no framework), Shadow DOM, Chrome Manifest V3 APIs, esbuild (bundling Readability only)

**Design doc:** `docs/plans/2026-02-23-chrome-extension-design.md`

---

### Task 1: Extension Scaffold — Manifest, Service Worker, Directory Structure

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/background/service-worker.js`
- Create: `extension/content/content.js` (stub)
- Create: `extension/icons/` (placeholder)

**Step 1: Create directory structure**

```bash
mkdir -p extension/background extension/content extension/lib extension/icons
```

**Step 2: Create manifest.json**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Text to Speech",
  "version": "1.0.0",
  "description": "Extract text from any web page and convert it to speech using Google Cloud TTS.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["http://localhost:3000/*"],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_title": "Text to Speech"
  }
}
```

Note: `host_permissions` uses `localhost:3000` for development. Update to production URL before Chrome Web Store submission. The `action` field with no `default_popup` means clicks fire `chrome.action.onClicked`.

**Step 3: Create service worker**

Create `extension/background/service-worker.js`:

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Check if we can inject into this tab
  try {
    // Try to send a message to existing content script first
    const response = await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    // Content script already exists, it handled the toggle
    return;
  } catch {
    // Content script not injected yet, inject it
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/readability.js", "content/content.js"],
    });
  } catch (err) {
    console.error("Cannot inject into this page:", err);
  }
});
```

**Step 4: Create content script stub**

Create `extension/content/content.js`:

```javascript
// Marker to detect if already injected
if (window.__ttsExtensionInjected) {
  // Already injected — this shouldn't happen since service worker checks first
} else {
  window.__ttsExtensionInjected = true;

  // Listen for messages from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle") {
      console.log("TTS Extension: toggle received");
      sendResponse({ status: "ok" });
    }
    return true;
  });

  console.log("TTS Extension: content script injected");
}
```

**Step 5: Create placeholder icons**

Generate simple placeholder PNG icons. For now, create 16x16, 48x48, and 128x128 solid-color PNGs. These can be replaced with real icons later.

Use an inline SVG converted to PNG, or create minimal canvas-based PNGs with a build script. For immediate testing, you can skip icons (Chrome shows a default puzzle piece).

Alternatively, create a simple icon generation script at `extension/generate-icons.js`:

```javascript
// Run with: node extension/generate-icons.js
// Creates minimal placeholder PNG icons
const fs = require("fs");

function createMinimalPng(size) {
  // Minimal valid PNG: solid blue square
  const { createCanvas } = require("canvas");
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(size * 0.5)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("T", size / 2, size / 2);
  return canvas.toBuffer("image/png");
}

[16, 48, 128].forEach((size) => {
  fs.writeFileSync(`extension/icons/icon${size}.png`, createMinimalPng(size));
});
```

If `canvas` package is not available, manually create or download placeholder icons. The extension will load without icons — Chrome uses a default.

**Step 6: Test — load unpacked extension**

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` directory
4. Navigate to any webpage
5. Click the extension icon
6. Open DevTools console — verify "TTS Extension: content script injected" appears
7. Click the icon again — verify "TTS Extension: toggle received" appears

**Step 7: Commit**

```bash
git add extension/
git commit -m "scaffold chrome extension with manifest, service worker, and content script stub"
```

---

### Task 2: Bundle Readability for Extension

**Files:**
- Create: `extension/lib/readability.js` (generated)
- Modify: `package.json` (add build script)

**Step 1: Add esbuild and build script to package.json**

Add to `package.json` scripts:

```json
"build:extension": "esbuild node_modules/@mozilla/readability/Readability.js --bundle --format=iife --global-name=ReadabilityModule --outfile=extension/lib/readability.js"
```

Add esbuild as a dev dependency:

```bash
npm install --save-dev esbuild
```

**Step 2: Run the build**

```bash
npm run build:extension
```

This creates `extension/lib/readability.js` as a self-contained IIFE that exposes `ReadabilityModule.Readability` globally.

**Step 3: Verify the bundle**

Open `extension/lib/readability.js` and confirm it:
- Is a self-contained IIFE
- Defines `ReadabilityModule` on the global scope
- Is roughly 30-40KB

**Step 4: Test in content script**

Temporarily add to the end of `extension/content/content.js`:

```javascript
const docClone = document.cloneNode(true);
const article = new ReadabilityModule.Readability(docClone).parse();
console.log("TTS Extension: extracted article:", article?.title, article?.textContent?.length, "chars");
```

Load the extension, navigate to a news article, click the icon. Verify the console shows the article title and character count. Remove this test code after verifying.

**Step 5: Commit**

```bash
git add extension/lib/readability.js package.json package-lock.json
git commit -m "bundle readability for chrome extension via esbuild"
```

---

### Task 3: Widget Shell — Shadow DOM, HTML, CSS, Toggle/Minimize/Close

This is the largest task. It creates the full widget UI (no API logic yet).

**Files:**
- Modify: `extension/content/content.js`

**Step 1: Define the widget CSS**

Add at the top of `content/content.js` as a string constant. The widget uses a dark theme, fixed positioning bottom-right, with proper z-index to float above page content.

```javascript
const WIDGET_CSS = `
  :host {
    all: initial;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #e5e7eb;
  }

  .tts-panel {
    width: 340px;
    background: #1f2937;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    border: 1px solid #374151;
  }

  .tts-panel.hidden {
    display: none;
  }

  /* Header */
  .tts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #111827;
    border-bottom: 1px solid #374151;
    cursor: default;
  }

  .tts-title {
    font-size: 14px;
    font-weight: 600;
    color: #f9fafb;
  }

  .tts-header-buttons {
    display: flex;
    gap: 8px;
  }

  .tts-header-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }

  .tts-header-btn:hover {
    color: #f9fafb;
  }

  /* Body */
  .tts-body {
    padding: 16px;
  }

  /* Text preview */
  .tts-text-preview {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
    max-height: 80px;
    overflow-y: auto;
    font-size: 12px;
    color: #d1d5db;
    line-height: 1.4;
  }

  .tts-text-preview .tts-article-title {
    font-weight: 600;
    color: #f9fafb;
    margin-bottom: 4px;
  }

  /* Paste fallback */
  .tts-paste-area {
    width: 100%;
    min-height: 80px;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    color: #d1d5db;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }

  .tts-paste-area::placeholder {
    color: #6b7280;
  }

  .tts-paste-area:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .tts-extraction-msg {
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 8px;
  }

  /* Controls row */
  .tts-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    align-items: center;
  }

  .tts-voice-select {
    flex: 1;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    padding: 6px 8px;
    color: #e5e7eb;
    font-size: 12px;
    font-family: inherit;
  }

  .tts-voice-select:focus {
    outline: none;
    border-color: #3b82f6;
  }

  /* Speed buttons */
  .tts-speed-group {
    display: flex;
    gap: 2px;
  }

  .tts-speed-btn {
    background: #374151;
    border: 1px solid #4b5563;
    color: #d1d5db;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
  }

  .tts-speed-btn:first-child {
    border-radius: 6px 0 0 6px;
  }

  .tts-speed-btn:last-child {
    border-radius: 0 6px 6px 0;
  }

  .tts-speed-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #ffffff;
  }

  .tts-speed-btn:hover:not(.active) {
    background: #4b5563;
  }

  /* Generate button */
  .tts-generate-btn {
    width: 100%;
    padding: 8px 16px;
    background: #3b82f6;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    margin-bottom: 12px;
  }

  .tts-generate-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .tts-generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Audio player */
  .tts-audio-section {
    display: none;
  }

  .tts-audio-section.visible {
    display: block;
  }

  .tts-audio-player {
    width: 100%;
    height: 36px;
    margin-bottom: 8px;
  }

  .tts-download-btn {
    width: 100%;
    padding: 6px 12px;
    background: #374151;
    color: #d1d5db;
    border: 1px solid #4b5563;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }

  .tts-download-btn:hover {
    background: #4b5563;
  }

  /* Progress bar */
  .tts-progress-section {
    display: none;
    margin-bottom: 12px;
  }

  .tts-progress-section.visible {
    display: block;
  }

  .tts-progress-label {
    font-size: 12px;
    color: #93c5fd;
    margin-bottom: 4px;
  }

  .tts-progress-bar {
    width: 100%;
    height: 6px;
    background: #374151;
    border-radius: 3px;
    overflow: hidden;
  }

  .tts-progress-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 3px;
    transition: width 0.3s ease;
    width: 0%;
  }

  /* Error */
  .tts-error {
    display: none;
    padding: 8px 12px;
    background: #7f1d1d;
    border: 1px solid #991b1b;
    border-radius: 6px;
    font-size: 12px;
    color: #fca5a5;
    margin-bottom: 12px;
  }

  .tts-error.visible {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tts-error-msg {
    flex: 1;
  }

  .tts-retry-btn {
    background: none;
    border: 1px solid #991b1b;
    color: #fca5a5;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    margin-left: 8px;
    font-family: inherit;
  }

  .tts-retry-btn:hover {
    background: #991b1b;
  }

  /* Paste toggle */
  .tts-paste-toggle {
    display: block;
    background: none;
    border: none;
    color: #60a5fa;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    margin-top: 4px;
  }

  .tts-paste-toggle:hover {
    color: #93c5fd;
    text-decoration: underline;
  }
`;
```

**Step 2: Define the widget HTML**

Add as a string constant in `content/content.js`:

```javascript
const WIDGET_HTML = `
  <div class="tts-panel" id="tts-panel">
    <div class="tts-header">
      <span class="tts-title">Text to Speech</span>
      <div class="tts-header-buttons">
        <button class="tts-header-btn" id="tts-minimize" title="Minimize">&#8211;</button>
        <button class="tts-header-btn" id="tts-close" title="Close">&times;</button>
      </div>
    </div>
    <div class="tts-body">
      <div id="tts-text-preview" class="tts-text-preview"></div>
      <textarea id="tts-paste-area" class="tts-paste-area" style="display: none;" placeholder="Paste or type text here..."></textarea>

      <div class="tts-error" id="tts-error">
        <span class="tts-error-msg" id="tts-error-msg"></span>
        <button class="tts-retry-btn" id="tts-retry">Retry</button>
      </div>

      <div class="tts-controls">
        <select class="tts-voice-select" id="tts-voice">
          <optgroup label="US - WaveNet">
            <option value="en-US-Wavenet-A">Wavenet-A (Male)</option>
            <option value="en-US-Wavenet-B">Wavenet-B (Male)</option>
            <option value="en-US-Wavenet-C">Wavenet-C (Female)</option>
            <option value="en-US-Wavenet-D" selected>Wavenet-D (Male)</option>
            <option value="en-US-Wavenet-E">Wavenet-E (Female)</option>
            <option value="en-US-Wavenet-F">Wavenet-F (Female)</option>
          </optgroup>
          <optgroup label="US - Standard">
            <option value="en-US-Standard-A">Standard-A (Male)</option>
            <option value="en-US-Standard-B">Standard-B (Male)</option>
            <option value="en-US-Standard-C">Standard-C (Female)</option>
            <option value="en-US-Standard-D">Standard-D (Male)</option>
            <option value="en-US-Standard-E">Standard-E (Female)</option>
          </optgroup>
          <optgroup label="UK - WaveNet">
            <option value="en-GB-Wavenet-A">UK Wavenet-A (Female)</option>
            <option value="en-GB-Wavenet-B">UK Wavenet-B (Male)</option>
            <option value="en-GB-Wavenet-C">UK Wavenet-C (Female)</option>
            <option value="en-GB-Wavenet-D">UK Wavenet-D (Male)</option>
          </optgroup>
        </select>
        <div class="tts-speed-group">
          <button class="tts-speed-btn active" data-speed="1">1x</button>
          <button class="tts-speed-btn" data-speed="1.5">1.5x</button>
          <button class="tts-speed-btn" data-speed="2">2x</button>
        </div>
      </div>

      <button class="tts-generate-btn" id="tts-generate">Generate Speech</button>

      <div class="tts-progress-section" id="tts-progress">
        <div class="tts-progress-label" id="tts-progress-label">Processing long audio... 0%</div>
        <div class="tts-progress-bar">
          <div class="tts-progress-fill" id="tts-progress-fill"></div>
        </div>
      </div>

      <div class="tts-audio-section" id="tts-audio-section">
        <audio class="tts-audio-player" id="tts-audio" controls></audio>
        <button class="tts-download-btn" id="tts-download">Download Audio</button>
      </div>

      <button class="tts-paste-toggle" id="tts-paste-toggle">Paste text instead</button>
    </div>
  </div>
`;
```

**Step 3: Build the widget injection and toggle logic**

Replace the content of `extension/content/content.js` with the full widget shell (no API logic yet):

```javascript
// content/content.js — TTS Extension Content Script

const BACKEND_URL = "http://localhost:3000";

// [WIDGET_CSS constant from Step 1 goes here]
// [WIDGET_HTML constant from Step 2 goes here]

(function () {
  if (window.__ttsExtensionInjected) return;
  window.__ttsExtensionInjected = true;

  let shadowHost = null;
  let shadowRoot = null;
  let isMinimized = false;

  function createWidget() {
    // Create Shadow DOM host
    shadowHost = document.createElement("div");
    shadowHost.id = "__tts-extension-host";
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: "closed" });

    // Inject styles
    const style = document.createElement("style");
    style.textContent = WIDGET_CSS;
    shadowRoot.appendChild(style);

    // Inject HTML
    const wrapper = document.createElement("div");
    wrapper.innerHTML = WIDGET_HTML;
    shadowRoot.appendChild(wrapper);

    // Wire up minimize
    const minimizeBtn = shadowRoot.getElementById("tts-minimize");
    minimizeBtn.addEventListener("click", () => {
      isMinimized = true;
      shadowRoot.getElementById("tts-panel").classList.add("hidden");
    });

    // Wire up close
    const closeBtn = shadowRoot.getElementById("tts-close");
    closeBtn.addEventListener("click", () => {
      destroyWidget();
    });

    // Wire up paste toggle
    const pasteToggle = shadowRoot.getElementById("tts-paste-toggle");
    pasteToggle.addEventListener("click", () => {
      const preview = shadowRoot.getElementById("tts-text-preview");
      const pasteArea = shadowRoot.getElementById("tts-paste-area");
      const isShowingPaste = pasteArea.style.display !== "none";

      if (isShowingPaste) {
        pasteArea.style.display = "none";
        preview.style.display = "block";
        pasteToggle.textContent = "Paste text instead";
      } else {
        pasteArea.style.display = "block";
        preview.style.display = "none";
        pasteToggle.textContent = "Show extracted text";
      }
    });

    // Load saved preferences
    loadPreferences();

    // Extract text from page
    extractText();
  }

  function destroyWidget() {
    // Stop any audio
    if (shadowRoot) {
      const audio = shadowRoot.getElementById("tts-audio");
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    }

    if (shadowHost) {
      shadowHost.remove();
      shadowHost = null;
      shadowRoot = null;
    }

    isMinimized = false;
    window.__ttsExtensionInjected = false;
  }

  function toggleWidget() {
    if (!shadowHost) {
      window.__ttsExtensionInjected = true;
      createWidget();
      return;
    }

    if (isMinimized) {
      isMinimized = false;
      shadowRoot.getElementById("tts-panel").classList.remove("hidden");
    } else {
      isMinimized = true;
      shadowRoot.getElementById("tts-panel").classList.add("hidden");
    }
  }

  function extractText() {
    // Placeholder — implemented in Task 4
    const preview = shadowRoot.getElementById("tts-text-preview");
    preview.textContent = "Text extraction will be implemented next...";
  }

  function loadPreferences() {
    // Placeholder — implemented in Task 7
  }

  // Listen for messages from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle") {
      toggleWidget();
      sendResponse({ status: "ok" });
    }
    return true;
  });

  // Initial creation
  createWidget();
})();
```

**Step 4: Test the widget shell**

1. Reload the extension at `chrome://extensions`
2. Navigate to any webpage
3. Click the extension icon — widget appears bottom-right
4. Click minimize (─) — widget hides
5. Click the extension icon — widget reappears
6. Click close (✕) — widget removed from DOM
7. Click the extension icon — widget re-created
8. Click "Paste text instead" — toggles between preview and textarea

**Step 5: Commit**

```bash
git add extension/content/content.js
git commit -m "add floating widget shell with shadow DOM, minimize, and close"
```

---

### Task 4: Text Extraction with Readability

**Files:**
- Modify: `extension/content/content.js` (replace `extractText` function)

**Step 1: Implement text extraction**

Replace the `extractText` function in `content/content.js`:

```javascript
function extractText() {
  const preview = shadowRoot.getElementById("tts-text-preview");
  const pasteArea = shadowRoot.getElementById("tts-paste-area");
  const pasteToggle = shadowRoot.getElementById("tts-paste-toggle");
  const generateBtn = shadowRoot.getElementById("tts-generate");

  try {
    const docClone = document.cloneNode(true);
    const article = new ReadabilityModule.Readability(docClone).parse();

    if (article && article.textContent && article.textContent.trim().length > 0) {
      // Successful extraction
      const titleHtml = article.title
        ? `<div class="tts-article-title">${escapeHtml(article.title)}</div>`
        : "";
      const previewText = article.textContent.trim().substring(0, 300);
      preview.innerHTML = titleHtml + escapeHtml(previewText) + (article.textContent.length > 300 ? "..." : "");
      preview.style.display = "block";
      pasteArea.style.display = "none";

      // Store full text for TTS
      window.__ttsExtractedText = article.textContent.trim();
      window.__ttsArticleTitle = article.title || "";

      // Auto-generate
      generateBtn.textContent = "Generate Speech";
      handleGenerate();
    } else {
      // Extraction failed — show paste area
      showPasteFallback("Couldn't extract text from this page.");
    }
  } catch (err) {
    console.error("TTS Extension: Readability error", err);
    showPasteFallback("Couldn't extract text from this page.");
  }
}

function showPasteFallback(message) {
  const preview = shadowRoot.getElementById("tts-text-preview");
  const pasteArea = shadowRoot.getElementById("tts-paste-area");
  const pasteToggle = shadowRoot.getElementById("tts-paste-toggle");

  preview.style.display = "none";
  pasteArea.style.display = "block";
  pasteToggle.style.display = "none";

  const extractionMsg = document.createElement("div");
  extractionMsg.className = "tts-extraction-msg";
  extractionMsg.textContent = message;
  pasteArea.parentNode.insertBefore(extractionMsg, pasteArea);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
```

**Step 2: Test text extraction**

1. Reload extension
2. Navigate to a news article (e.g., any blog post or Wikipedia page)
3. Click extension icon — widget should show article title and text preview
4. Navigate to a page with minimal content (e.g., a login page)
5. Click icon — should show paste fallback textarea

**Step 3: Commit**

```bash
git add extension/content/content.js
git commit -m "add readability text extraction with paste fallback"
```

---

### Task 5: TTS API Integration — Short and Long Audio

**Files:**
- Modify: `extension/content/content.js` (add `handleGenerate`, polling, download functions)

**Step 1: Implement the generate handler and short audio flow**

Add these functions to `content/content.js`:

```javascript
let pollingInterval = null;
let currentAudioUrl = null;

function getTextToConvert() {
  const pasteArea = shadowRoot.getElementById("tts-paste-area");
  // Use pasted text if paste area is visible and has content
  if (pasteArea.style.display !== "none" && pasteArea.value.trim()) {
    return pasteArea.value.trim();
  }
  return window.__ttsExtractedText || "";
}

async function handleGenerate() {
  const text = getTextToConvert();
  if (!text) return;

  const generateBtn = shadowRoot.getElementById("tts-generate");
  const voiceSelect = shadowRoot.getElementById("tts-voice");
  const errorEl = shadowRoot.getElementById("tts-error");
  const audioSection = shadowRoot.getElementById("tts-audio-section");
  const progressSection = shadowRoot.getElementById("tts-progress");

  // Reset state
  errorEl.classList.remove("visible");
  audioSection.classList.remove("visible");
  progressSection.classList.remove("visible");
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  // Clean up previous audio
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }

  const voice = voiceSelect.value;
  const speed = parseFloat(
    shadowRoot.querySelector(".tts-speed-btn.active")?.dataset.speed || "1"
  );

  try {
    const response = await fetch(`${BACKEND_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate speech");
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      // Long audio — start polling
      const data = await response.json();
      if (data.isLongAudio) {
        startPolling(data.operationName, data.outputFileName);
      }
    } else {
      // Short audio — play directly
      const blob = await response.blob();
      playAudio(blob);
    }
  } catch (err) {
    showError(err.message || "Failed to generate speech");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Speech";
  }
}

function playAudio(blob) {
  const audioSection = shadowRoot.getElementById("tts-audio-section");
  const audioEl = shadowRoot.getElementById("tts-audio");

  currentAudioUrl = URL.createObjectURL(blob);
  audioEl.src = currentAudioUrl;
  audioEl.playbackRate = parseFloat(
    shadowRoot.querySelector(".tts-speed-btn.active")?.dataset.speed || "1"
  );

  audioSection.classList.add("visible");
  audioEl.play();
}
```

**Step 2: Implement long audio polling**

```javascript
function startPolling(operationName, fileName) {
  const progressSection = shadowRoot.getElementById("tts-progress");
  const progressLabel = shadowRoot.getElementById("tts-progress-label");
  const progressFill = shadowRoot.getElementById("tts-progress-fill");
  const generateBtn = shadowRoot.getElementById("tts-generate");

  progressSection.classList.add("visible");
  generateBtn.disabled = true;
  generateBtn.textContent = "Processing...";

  let pollCount = 0;
  const maxPolls = 100; // ~5 minutes at 3s intervals

  pollingInterval = setInterval(async () => {
    pollCount++;
    if (pollCount > maxPolls) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      progressSection.classList.remove("visible");
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Speech";
      showError("Audio generation timed out. Please try again.");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/tts-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName }),
      });

      if (!response.ok) throw new Error("Failed to check status");

      const data = await response.json();

      if (data.status === "completed") {
        clearInterval(pollingInterval);
        pollingInterval = null;
        progressFill.style.width = "100%";
        progressLabel.textContent = "Processing long audio... 100%";
        await downloadLongAudio(fileName);
        progressSection.classList.remove("visible");
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Speech";
      } else if (data.status === "error") {
        clearInterval(pollingInterval);
        pollingInterval = null;
        progressSection.classList.remove("visible");
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Speech";
        showError(data.error || "Audio generation failed");
      } else {
        const progress = data.progress || 0;
        progressFill.style.width = `${progress}%`;
        progressLabel.textContent = `Processing long audio... ${progress}%`;
      }
    } catch (err) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      progressSection.classList.remove("visible");
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Speech";
      showError("Lost connection while checking audio status");
    }
  }, 3000);
}

async function downloadLongAudio(fileName) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/download-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName }),
    });

    if (!response.ok) throw new Error("Failed to download audio");

    const blob = await response.blob();
    playAudio(blob);
  } catch (err) {
    showError("Failed to download generated audio");
  }
}
```

**Step 3: Implement error display**

```javascript
function showError(message) {
  const errorEl = shadowRoot.getElementById("tts-error");
  const errorMsg = shadowRoot.getElementById("tts-error-msg");
  errorMsg.textContent = message;
  errorEl.classList.add("visible");
}
```

**Step 4: Wire up the generate button click handler**

Inside `createWidget()`, after the paste toggle listener, add:

```javascript
// Wire up generate button
const generateBtn = shadowRoot.getElementById("tts-generate");
generateBtn.addEventListener("click", handleGenerate);

// Wire up retry button
const retryBtn = shadowRoot.getElementById("tts-retry");
retryBtn.addEventListener("click", () => {
  shadowRoot.getElementById("tts-error").classList.remove("visible");
  handleGenerate();
});
```

**Step 5: Test short audio**

1. Start the Next.js dev server: `npm run dev`
2. Reload extension
3. Navigate to a short article
4. Click extension icon — widget extracts text and auto-generates
5. Verify audio plays in the widget

**Step 6: Test long audio (if possible)**

Navigate to a very long article (>5000 characters). Verify the progress bar appears and polling works.

**Step 7: Commit**

```bash
git add extension/content/content.js
git commit -m "add TTS API integration with short audio, long audio polling, and error handling"
```

---

### Task 6: Audio Controls — Speed, Download, Voice

**Files:**
- Modify: `extension/content/content.js` (add speed/download/voice handlers)

**Step 1: Wire up speed buttons**

Inside `createWidget()`, add:

```javascript
// Wire up speed buttons
const speedBtns = shadowRoot.querySelectorAll(".tts-speed-btn");
speedBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    speedBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const speed = parseFloat(btn.dataset.speed);
    const audioEl = shadowRoot.getElementById("tts-audio");
    if (audioEl) {
      audioEl.playbackRate = speed;
    }

    // Save preference
    chrome.storage.sync.set({ playbackSpeed: speed });
  });
});
```

**Step 2: Wire up download button**

Inside `createWidget()`, add:

```javascript
// Wire up download button
const downloadBtn = shadowRoot.getElementById("tts-download");
downloadBtn.addEventListener("click", () => {
  if (!currentAudioUrl) return;
  const a = document.createElement("a");
  a.href = currentAudioUrl;
  const text = getTextToConvert();
  a.download = text.length > 5000 ? "speech.wav" : "speech.mp3";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
```

**Step 3: Wire up voice change to save preference**

Inside `createWidget()`, add to voice select:

```javascript
// Save voice preference on change
const voiceSelect = shadowRoot.getElementById("tts-voice");
voiceSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ voice: voiceSelect.value });
});
```

**Step 4: Implement loadPreferences**

Replace the placeholder `loadPreferences` function:

```javascript
function loadPreferences() {
  chrome.storage.sync.get(["voice", "playbackSpeed"], (result) => {
    if (result.voice) {
      const voiceSelect = shadowRoot.getElementById("tts-voice");
      voiceSelect.value = result.voice;
    }

    if (result.playbackSpeed) {
      const speed = result.playbackSpeed;
      const speedBtns = shadowRoot.querySelectorAll(".tts-speed-btn");
      speedBtns.forEach((btn) => {
        btn.classList.toggle("active", parseFloat(btn.dataset.speed) === speed);
      });
    }
  });
}
```

**Step 5: Test preferences**

1. Reload extension
2. Click icon, change voice to UK Wavenet-B, set speed to 1.5x
3. Close widget (✕)
4. Click icon again — voice and speed should be restored from storage
5. Navigate to different page, click icon — preferences persist

**Step 6: Commit**

```bash
git add extension/content/content.js
git commit -m "add speed controls, voice persistence, and download via chrome.storage.sync"
```

---

### Task 7: Error Handling and Polish

**Files:**
- Modify: `extension/background/service-worker.js` (restricted page handling)
- Modify: `extension/content/content.js` (cleanup and edge cases)

**Step 1: Handle restricted pages in service worker**

Update `extension/background/service-worker.js`:

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  // Check for restricted pages where content scripts can't run
  const restrictedPatterns = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^about:/,
    /^edge:\/\//,
    /^https:\/\/chrome\.google\.com\/webstore/,
    /^https:\/\/chromewebstore\.google\.com/,
  ];

  const isRestricted = restrictedPatterns.some((pattern) => pattern.test(tab.url));
  if (isRestricted) {
    // Set badge to indicate can't run here
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });
    return;
  }

  // Clear any previous badge
  chrome.action.setBadgeText({ text: "", tabId: tab.id });

  // Try to send toggle to existing content script
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    return;
  } catch {
    // Content script not injected yet
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/readability.js", "content/content.js"],
    });
  } catch (err) {
    console.error("Cannot inject into this page:", err);
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });
  }
});
```

**Step 2: Clean up polling on widget destroy**

In the `destroyWidget` function in `content.js`, add polling cleanup:

```javascript
function destroyWidget() {
  // Stop polling if active
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  // Stop any audio and revoke URL
  if (shadowRoot) {
    const audio = shadowRoot.getElementById("tts-audio");
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }

  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
    shadowRoot = null;
  }

  isMinimized = false;
  window.__ttsExtensionInjected = false;
}
```

**Step 3: Test restricted pages**

1. Navigate to `chrome://extensions`
2. Click the extension icon — should show "!" badge, no errors in console
3. Navigate to a normal page — badge should clear, widget should work

**Step 4: Test full end-to-end flow**

1. Navigate to a news article
2. Click icon — text extracted, audio auto-generates, plays
3. Change speed to 2x — audio speed changes
4. Click minimize — audio continues
5. Click icon — widget restored
6. Click close — audio stops
7. Navigate to a minimal page — paste fallback shown
8. Paste text, click Generate Speech — audio plays

**Step 5: Commit**

```bash
git add extension/
git commit -m "add restricted page handling, cleanup on destroy, and polish"
```

---

### Task 8: Build Script and Distribution Prep

**Files:**
- Modify: `package.json` (add zip script)
- Modify: `extension/manifest.json` (production URL note)
- Create: `.gitignore` update (ignore build artifacts)

**Step 1: Add build and package scripts**

Update `package.json` scripts:

```json
"build:extension": "esbuild node_modules/@mozilla/readability/Readability.js --bundle --format=iife --global-name=ReadabilityModule --outfile=extension/lib/readability.js",
"package:extension": "npm run build:extension && cd extension && zip -r ../extension.zip . -x '*/.*' 'generate-icons.js'"
```

**Step 2: Add extension.zip to .gitignore**

Append to `.gitignore`:

```
extension.zip
```

**Step 3: Add extension/lib/ to .gitignore**

The built readability file is a generated artifact. Add to `.gitignore`:

```
extension/lib/readability.js
```

**Step 4: Test the build**

```bash
npm run package:extension
```

Verify `extension.zip` is created and contains all necessary files.

**Step 5: Commit**

```bash
git add package.json .gitignore
git commit -m "add extension build and packaging scripts"
```

---

## Summary of Tasks

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Extension scaffold — manifest, service worker, dirs | `extension/manifest.json`, `extension/background/service-worker.js` |
| 2 | Bundle Readability via esbuild | `extension/lib/readability.js`, `package.json` |
| 3 | Widget shell — Shadow DOM, HTML, CSS, toggle/minimize/close | `extension/content/content.js` |
| 4 | Text extraction with Readability | `extension/content/content.js` |
| 5 | TTS API — short audio, long audio polling, playback | `extension/content/content.js` |
| 6 | Audio controls — speed, download, voice, preferences | `extension/content/content.js` |
| 7 | Error handling — restricted pages, cleanup, polish | `extension/background/service-worker.js`, `extension/content/content.js` |
| 8 | Build script and distribution prep | `package.json`, `.gitignore` |
