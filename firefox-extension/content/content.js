const BACKEND_URL = "https://tts.brandonbassett.xyz";
//const BACKEND_URL = "http://localhost:3000";

const WIDGET_CSS = `
  :host {
    all: initial;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #e5e7eb;
  }

  .tts-panel {
    width: 340px;
    background: #1f2937;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    border: 1px solid #374151;
  }

  .tts-panel.hidden {
    display: none;
  }

  .tts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #111827;
    border-bottom: 1px solid #374151;
    border-radius: 12px 12px 0 0;
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
    padding: 0;
    line-height: 1;
  }

  .tts-header-btn:hover {
    color: #f9fafb;
  }

  .tts-body {
    padding: 16px;
  }

  .tts-text-preview {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 10px 12px;
    max-height: 80px;
    overflow-y: auto;
    font-size: 12px;
    color: #d1d5db;
    margin-bottom: 8px;
  }

  .tts-text-preview .tts-article-title {
    font-weight: 600;
    color: #f9fafb;
    margin-bottom: 4px;
  }

  .tts-paste-area {
    width: 100%;
    min-height: 80px;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    color: #d1d5db;
    box-sizing: border-box;
    resize: vertical;
    font-family: inherit;
    margin-bottom: 8px;
  }

  .tts-extraction-msg {
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 8px;
  }

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

  .tts-playback-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .tts-speed-group {
    display: flex;
    gap: 2px;
  }

  .tts-skip-group {
    display: flex;
    gap: 6px;
  }

  .tts-skip-btn {
    background: #374151;
    border: 1px solid #4b5563;
    color: #d1d5db;
    padding: 4px;
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tts-skip-btn:hover {
    background: #4b5563;
  }

  .tts-speed-btn {
    background: #374151;
    border: 1px solid #4b5563;
    color: #d1d5db;
    padding: 5px 10px;
    font-size: 11px;
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

  .tts-generate-btn {
    width: 100%;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 12px;
    font-family: inherit;
  }

  .tts-generate-btn:hover {
    background: #2563eb;
  }

  .tts-generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

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
    border: 1px solid #4b5563;
    color: #d1d5db;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }

  .tts-download-btn:hover {
    background: #4b5563;
  }

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

  .tts-paste-toggle {
    display: block;
    background: none;
    border: none;
    color: #60a5fa;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    margin-top: 4px;
    font-family: inherit;
  }

  .tts-paste-toggle:hover {
    color: #93c5fd;
    text-decoration: underline;
  }
`;

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
      <div class="tts-playback-controls">
        <div class="tts-speed-group">
          <button class="tts-speed-btn active" data-speed="1">1x</button>
          <button class="tts-speed-btn" data-speed="1.5">1.5x</button>
          <button class="tts-speed-btn" data-speed="2">2x</button>
        </div>
        <div class="tts-skip-group">
          <button class="tts-skip-btn" id="tts-skip-back" title="Back 15 seconds">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              <text x="12" y="15.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" font-weight="bold">15</text>
            </svg>
          </button>
          <button class="tts-skip-btn" id="tts-skip-forward" title="Forward 15 seconds">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
              <text x="12" y="15.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" font-weight="bold">15</text>
            </svg>
          </button>
        </div>
      </div>
      <button class="tts-download-btn" id="tts-download">Download Audio</button>
    </div>

    <button class="tts-paste-toggle" id="tts-paste-toggle">Paste text instead</button>
  </div>
</div>
`;

(function () {
  if (window.__ttsExtensionInjected) return;
  window.__ttsExtensionInjected = true;

  let shadowHost = null;
  let shadowRoot = null;
  let isMinimized = false;
  let currentAudioUrl = null;
  let extractedText = "";
  let articleTitle = "";
  let audioChunks = [];
  let abortController = null;

  const TTS_DEBUG = false;

  function debugLog(...args) {
    if (TTS_DEBUG) {
      console.log("[tts-ext]", ...args);
    }
  }

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

    // Wire up speed buttons
    const speedBtns = shadowRoot.querySelectorAll(".tts-speed-btn");
    speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        speedBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const speed = parseFloat(btn.dataset.speed);
        chrome.storage.sync.set({ playbackSpeed: speed });
        const audioEl = shadowRoot.getElementById("tts-audio");
        if (audioEl) {
          audioEl.playbackRate = speed;
        }
      });
    });

    // Wire up generate button
    const generateBtn = shadowRoot.getElementById("tts-generate");
    generateBtn.addEventListener("click", handleGenerate);

    // Wire up retry button
    const retryBtn = shadowRoot.getElementById("tts-retry");
    retryBtn.addEventListener("click", () => {
      shadowRoot.getElementById("tts-error").classList.remove("visible");
      handleGenerate();
    });

    // Wire up skip buttons
    const skipBackBtn = shadowRoot.getElementById("tts-skip-back");
    skipBackBtn.addEventListener("click", () => {
      const audio = shadowRoot.getElementById("tts-audio");
      if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15);
    });

    const skipForwardBtn = shadowRoot.getElementById("tts-skip-forward");
    skipForwardBtn.addEventListener("click", () => {
      const audio = shadowRoot.getElementById("tts-audio");
      if (audio) audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15);
    });

    // Wire up download button
    const downloadBtn = shadowRoot.getElementById("tts-download");
    downloadBtn.addEventListener("click", () => {
      if (audioChunks.length === 0) return;
      const blob = new Blob(audioChunks, { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "speech.mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Save voice preference on change
    const voiceSelect = shadowRoot.getElementById("tts-voice");
    voiceSelect.addEventListener("change", () => {
      chrome.storage.sync.set({ voice: voiceSelect.value });
    });

    // Load saved preferences
    loadPreferences();

    // Extract text from page
    extractText();
  }

  function destroyWidget() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }

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
    extractedText = "";
    articleTitle = "";
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
    const preview = shadowRoot.getElementById("tts-text-preview");
    const pasteArea = shadowRoot.getElementById("tts-paste-area");
    const pasteToggle = shadowRoot.getElementById("tts-paste-toggle");
    const generateBtn = shadowRoot.getElementById("tts-generate");

    try {
      const docClone = document.cloneNode(true);
      const article = new ReadabilityModule(docClone).parse();

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
        extractedText = article.textContent.trim();
        articleTitle = article.title || "";

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

    // Create and insert message element
    const existingMsg = shadowRoot.querySelector(".tts-extraction-msg");
    if (!existingMsg) {
      const extractionMsg = document.createElement("div");
      extractionMsg.className = "tts-extraction-msg";
      extractionMsg.textContent = message;
      pasteArea.parentNode.insertBefore(extractionMsg, pasteArea);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getTextToConvert() {
    const pasteArea = shadowRoot.getElementById("tts-paste-area");
    // Use pasted text if paste area is visible and has content
    if (pasteArea.style.display !== "none" && pasteArea.value.trim()) {
      return pasteArea.value.trim();
    }
    return extractedText;
  }

  async function handleGenerate() {
    const text = getTextToConvert();
    if (!text) return;

    const generateBtn = shadowRoot.getElementById("tts-generate");
    const voiceSelect = shadowRoot.getElementById("tts-voice");
    const errorEl = shadowRoot.getElementById("tts-error");
    const audioSection = shadowRoot.getElementById("tts-audio-section");
    const audioEl = shadowRoot.getElementById("tts-audio");
    const progressSection = shadowRoot.getElementById("tts-progress");

    errorEl.classList.remove("visible");
    audioSection.classList.remove("visible");
    progressSection.classList.remove("visible");
    generateBtn.disabled = true;
    generateBtn.textContent = "Streaming...";

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
    audioChunks = [];

    const voice = voiceSelect.value;
    const speed = parseFloat(
      shadowRoot.querySelector(".tts-speed-btn.active")?.dataset.speed || "1"
    );

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    debugLog("Starting streaming TTS", { textLength: text.length, voice, speed });

    try {
      const response = await fetch(`${BACKEND_URL}/api/tts-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate speech";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      debugLog("Response received, starting audio download");
      await playStreamingAudio(response, audioEl, audioSection);
    } catch (err) {
      if (err.name === "AbortError") {
        debugLog("Request aborted");
        return;
      }
      debugLog("Error:", err);
      showError(err.message || "Failed to generate speech");
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Speech";
    }
  }

  async function playStreamingAudio(response, audioEl, audioSection) {
    const reader = response.body.getReader();
    let firstChunk = true;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          debugLog("Stream complete, total chunks:", audioChunks.length);
          break;
        }

        debugLog(`Received chunk: ${value.byteLength} bytes`);
        audioChunks.push(new Uint8Array(value));

        if (firstChunk) {
          firstChunk = false;
          audioSection.classList.add("visible");
        }
      }

      // Create blob from all chunks and set as audio source
      const blob = new Blob(audioChunks, { type: "audio/mpeg" });
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }
      currentAudioUrl = URL.createObjectURL(blob);
      audioEl.src = currentAudioUrl;

      const speed = parseFloat(
        shadowRoot.querySelector(".tts-speed-btn.active")?.dataset.speed || "1"
      );
      audioEl.playbackRate = speed;

      debugLog("Blob URL set, starting playback");
      await audioEl.play().catch((err) => debugLog("Play error:", err));
    } catch (err) {
      debugLog("Stream read error:", err);
      throw err;
    }
  }

  function showError(message) {
    const errorEl = shadowRoot.getElementById("tts-error");
    const errorMsg = shadowRoot.getElementById("tts-error-msg");
    errorMsg.textContent = message;
    errorEl.classList.add("visible");
  }

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
          btn.classList.toggle(
            "active",
            parseFloat(btn.dataset.speed) === speed
          );
        });
      }
    });
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
