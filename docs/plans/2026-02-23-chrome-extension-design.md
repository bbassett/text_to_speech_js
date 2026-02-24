# Chrome Extension Design — Text to Speech

## Summary

Convert the existing TTS web app into a Chrome browser extension for public distribution via the Chrome Web Store. The extension injects a floating widget into the current page, extracts text using Readability, and generates audio via the existing hosted backend. The web app continues to work independently alongside the extension.

## Architecture

### Extension Structure

```
extension/
├── manifest.json              # Manifest V3 config
├── background/
│   └── service-worker.js      # Handles icon click, injects content script
├── content/
│   ├── content.js             # Widget injection, text extraction, TTS calls
│   ├── widget.html            # Widget markup (inlined into Shadow DOM)
│   └── widget.css             # Widget styles (scoped via Shadow DOM)
├── lib/
│   └── readability.js         # Bundled Mozilla Readability
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── build/                     # Bundled output for distribution
```

### Manifest V3 Permissions

- `activeTab` — access current tab content when user clicks the icon
- `scripting` — inject content script on demand
- `storage` — persist user preferences (voice, speed)
- Host permissions for the hosted backend URL

### Project Layout

The extension lives alongside the existing Next.js app as a separate directory with no build dependency on it:

```
text_to_speech_js/
├── src/                    # Existing Next.js web app (unchanged)
├── extension/              # Chrome extension source
├── docker-compose.yml      # Backend deployment
└── ...
```

## User Flow

1. User clicks extension icon
2. Service worker injects content script into the active tab (if not already present)
3. Content script creates a Shadow DOM container and appends the floating widget
4. Widget runs Readability on the page DOM to extract text
5. If text found: shows truncated preview, auto-starts TTS generation
6. If extraction fails: shows textarea for manual copy/paste
7. Audio plays in the widget's audio element

### Widget Controls

- **Minimize (─):** Hides widget visually. Audio keeps playing. Click extension icon to restore.
- **Close (✕):** Stops audio, removes widget from DOM entirely.
- **Voice selector:** Dropdown with available voices.
- **Speed buttons:** 1x, 1.5x, 2x playback speed.
- **Audio player:** Play/pause, progress bar, time display.
- **Paste fallback:** Link to switch to manual text input when extraction fails.

### Widget Layout

```
┌─────────────────────────────────┐
│  Text to Speech        ─  ✕    │  title, minimize, close
├─────────────────────────────────┤
│  "Article title or first few    │
│   lines of extracted text..."   │  text preview (read-only)
├─────────────────────────────────┤
│  Voice: [en-US-Wavenet-D  ▾]   │  voice selector
│  Speed: [1x] [1.5x] [2x]      │  speed buttons
├─────────────────────────────────┤
│  ▶ ━━━━━━━━━━━━━━━━━ 0:00/3:42 │  audio player
├─────────────────────────────────┤
│  [Paste text instead]           │  fallback link
└─────────────────────────────────┘
```

## Backend Integration

### No Backend Changes Required

Chrome extensions with `host_permissions` bypass CORS. The existing Next.js API routes work as-is.

### Endpoints Used by Extension

- `POST /api/tts` — send text, voice, speed; receive audio
- `POST /api/tts-status` — poll long audio operation status (>5000 chars)
- `POST /api/download-audio` — download completed long audio

### Endpoint NOT Used

- `POST /api/url-to-text` — replaced by client-side Readability in the content script. This is an improvement: the content script has access to the fully-rendered DOM including JS-rendered content.

### Configuration

- Backend URL hardcoded to hosted instance as default
- Stored in `chrome.storage.sync` for potential future override
- User preferences (voice, speed) synced across devices via `chrome.storage.sync`

## Build & Distribution

- Vanilla JS for the content script and widget (no framework — lightweight, injects into arbitrary pages)
- Readability library vendored or bundled with esbuild (~30KB)
- No build dependency on the Next.js app
- Development: load unpacked from `extension/` via `chrome://extensions`
- Distribution: zip and upload to Chrome Developer Dashboard

## Error Handling

### Text Extraction Failures

Pages that resist Readability (SPAs, paywalled content, PDFs): widget shows "Couldn't extract text from this page" and presents the paste-text textarea as primary input.

### Audio Generation Failures

- Network errors: show error in widget, offer retry button
- Backend errors (quota, etc.): display error message, no auto-retry
- Long audio polling timeout (~5 min): stop polling, show error

### Page Navigation

Audio stops when the page navigates (DOM destroyed). Expected behavior — new page = new content.

### Restricted Pages

`chrome://` pages, Chrome Web Store, etc. where content scripts can't run: service worker sets a badge or greys the icon to indicate the extension can't operate.

### Duplicate Injection

Clicking the icon when widget already exists toggles visibility instead of injecting again. Content script tracks injection state via a DOM marker.
