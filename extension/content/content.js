const BACKEND_URL = "http://localhost:3000";

const WIDGET_CSS = `
  :host {
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
  }

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
    cursor: pointer;
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

(function () {
  if (window.__ttsExtensionInjected) return;
  window.__ttsExtensionInjected = true;

  let shadowHost = null;
  let shadowRoot = null;
  let isMinimized = false;
  let pollingInterval = null;
  let currentAudioUrl = null;

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
    // Stop polling if active
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
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
      // Only reset button if we're not polling (polling manages its own button state)
      if (!pollingInterval) {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Speech";
      }
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
