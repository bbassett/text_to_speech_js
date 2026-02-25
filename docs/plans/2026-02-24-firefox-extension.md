# Firefox Extension Variant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Firefox variant of the Chrome TTS browser extension with identical behavior.

**Architecture:** Separate `firefox-extension/` directory mirroring the Chrome extension structure. Firefox MV3 manifest with `background.scripts` (not service_worker) for broad Firefox version support (v109+). JS files reuse Chrome's `chrome.*` namespace (Firefox supports it for compat), with only restricted URL patterns adjusted.

**Tech Stack:** Firefox WebExtensions API (MV3), vanilla JavaScript, Mozilla Readability (bundled via esbuild)

---

### Task 1: Create Firefox manifest.json

**Files:**
- Create: `firefox-extension/manifest.json`

**Step 1: Create the manifest**

```json
{
  "manifest_version": 3,
  "name": "Text to Speech",
  "version": "1.0.0",
  "description": "Extract text from any web page and convert it to speech using Google Cloud TTS.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://tts.brandonbassett.xyz/*", "http://localhost:3000/*"],
  "background": {
    "scripts": ["background/service-worker.js"]
  },
  "action": {
    "default_title": "Text to Speech"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "tts@brandonbassett.xyz",
      "strict_min_version": "109.0"
    }
  }
}
```

Key differences from Chrome manifest:
- `background.scripts` array instead of `background.service_worker` string
- `browser_specific_settings.gecko` block with extension ID and minimum Firefox version

**Step 2: Commit**

```bash
git add firefox-extension/manifest.json
git commit -m "add firefox extension manifest (MV3)"
```

---

### Task 2: Create Firefox background script

**Files:**
- Create: `firefox-extension/background/service-worker.js`

**Step 1: Create the background script**

Copy from `extension/background/service-worker.js` with one change — the restricted URL patterns. Replace Chrome-specific patterns with Firefox-specific ones:

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  const restrictedPatterns = [
    /^about:/,
    /^moz-extension:\/\//,
    /^https:\/\/addons\.mozilla\.org/,
  ];

  const isRestricted = restrictedPatterns.some((pattern) => pattern.test(tab.url));
  if (isRestricted) {
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });
    return;
  }

  chrome.action.setBadgeText({ text: "", tabId: tab.id });

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

Only change: `restrictedPatterns` array — removed `chrome://`, `chrome-extension://`, `edge://`, Chrome Web Store URLs. Added `moz-extension://` and `addons.mozilla.org`.

**Step 2: Commit**

```bash
git add firefox-extension/background/service-worker.js
git commit -m "add firefox background script with firefox-specific restricted URLs"
```

---

### Task 3: Create Firefox content script

**Files:**
- Create: `firefox-extension/content/content.js`

**Step 1: Copy content script as-is**

Copy `extension/content/content.js` to `firefox-extension/content/content.js` with **no changes**. Firefox supports the `chrome.*` namespace, `chrome.storage.sync`, `chrome.runtime.onMessage`, Shadow DOM, MediaSource, and all other APIs used.

**Step 2: Commit**

```bash
git add firefox-extension/content/content.js
git commit -m "add firefox content script (identical to chrome)"
```

---

### Task 4: Set up Firefox extension build and packaging

**Files:**
- Create: `firefox-extension/lib/.gitkeep`
- Create: `firefox-extension/icons/.gitkeep`
- Modify: `package.json` (add build/package scripts)

**Step 1: Create placeholder directories**

Create `firefox-extension/lib/.gitkeep` and `firefox-extension/icons/.gitkeep` (same structure as Chrome extension).

**Step 2: Add npm scripts to package.json**

Add these scripts alongside the existing ones:

```json
"build:firefox-extension": "esbuild node_modules/@mozilla/readability/Readability.js --bundle --format=iife --global-name=ReadabilityModule --outfile=firefox-extension/lib/readability.js",
"package:firefox-extension": "npm run build:firefox-extension && cd firefox-extension && zip -r ../firefox-extension.zip . -x '*/.*'"
```

**Step 3: Build the readability lib for Firefox extension**

Run: `npm run build:firefox-extension`
Expected: `firefox-extension/lib/readability.js` created (~84KB)

**Step 4: Commit**

```bash
git add firefox-extension/lib/.gitkeep firefox-extension/icons/.gitkeep package.json
git commit -m "add firefox extension build and packaging scripts"
```

---

### Task 5: Manual smoke test

**Not automatable** — manual verification steps:

1. Run `npm run build:firefox-extension` to build readability lib
2. Open Firefox, navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on", select `firefox-extension/manifest.json`
4. Navigate to any article page (e.g. a Wikipedia article)
5. Click the extension icon in toolbar
6. Verify: widget appears bottom-right with extracted text preview
7. Verify: "Generate Speech" auto-triggers and audio streams
8. Verify: speed controls, skip buttons, voice selector, download all work
9. Verify: closing and re-clicking icon toggles the widget
10. Verify: extension shows "!" badge on `about:config` or other restricted pages

---

### Task 6: Package and commit final state

**Step 1: Build and package**

Run: `npm run package:firefox-extension`
Expected: `firefox-extension.zip` created in project root

**Step 2: Final commit**

```bash
git add -A
git commit -m "firefox extension ready for testing"
```
