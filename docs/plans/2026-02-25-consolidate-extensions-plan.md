# Consolidate Extensions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge `extension/` and `firefox-extension/` into a single `src/extension/` source with a Makefile build step that produces `dist/chrome/` and `dist/firefox/`.

**Architecture:** Single shared source, two manifest files, runtime browser detection for the ~5 lines that differ in service-worker.js. Content script uses Chrome's MSE implementation for both browsers.

**Tech Stack:** Vanilla JS, Make

---

### Task 1: Create shared source directory structure

**Files:**
- Create: `src/extension/background/` (directory)
- Create: `src/extension/content/` (directory)
- Create: `src/extension/lib/` (directory)
- Create: `src/extension/icons/` (directory)

**Step 1: Create directories**

```bash
mkdir -p src/extension/{background,content,lib,icons}
```

**Step 2: Commit**

```bash
git add src/extension/.gitkeep  # or commit with files in next tasks
```

No standalone commit needed — directories will be committed with their files in subsequent tasks.

---

### Task 2: Create browser-specific manifest files

**Files:**
- Create: `src/extension/manifest.chrome.json`
- Create: `src/extension/manifest.firefox.json`

**Step 1: Create Chrome manifest**

`src/extension/manifest.chrome.json` — identical to current `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Text to Speech",
  "version": "1.0.0",
  "description": "Extract text from any web page and convert it to speech using Google Cloud TTS.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": [
    "https://tts.brandonbassett.com/*",
    "http://localhost:3000/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "action": {
    "default_title": "Text to Speech"
  }
}
```

**Step 2: Create Firefox manifest**

`src/extension/manifest.firefox.json` — identical to current `firefox-extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Text to Speech",
  "version": "1.0.0",
  "description": "Extract text from any web page and convert it to speech using Google Cloud TTS.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": [
    "https://tts.brandonbassett.com/*",
    "http://localhost:3000/*"
  ],
  "background": {
    "scripts": ["background/service-worker.js"]
  },
  "action": {
    "default_title": "Text to Speech"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "tts@brandonbassett.com",
      "strict_min_version": "109.0"
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/extension/manifest.chrome.json src/extension/manifest.firefox.json
git commit -m "add browser-specific manifest files"
```

---

### Task 3: Create shared service-worker.js with runtime browser detection

**Files:**
- Create: `src/extension/background/service-worker.js`

**Step 1: Write the shared service worker**

Combines both versions with runtime detection. The only difference is the restricted URL patterns:

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  // Detect browser for restricted URL patterns
  const isFirefox = typeof browser !== "undefined";

  const restrictedPatterns = isFirefox
    ? [
        /^about:/,
        /^moz-extension:\/\//,
        /^https:\/\/addons\.mozilla\.org/,
      ]
    : [
        /^chrome:\/\//,
        /^chrome-extension:\/\//,
        /^about:/,
        /^edge:\/\//,
        /^https:\/\/chrome\.google\.com\/webstore/,
        /^https:\/\/chromewebstore\.google\.com/,
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

**Step 2: Commit**

```bash
git add src/extension/background/service-worker.js
git commit -m "add shared service worker with runtime browser detection"
```

---

### Task 4: Create shared content.js (MSE version for both browsers)

**Files:**
- Create: `src/extension/content/content.js`

**Step 1: Copy Chrome's content.js as the shared version**

This is the Chrome version (`extension/content/content.js`) verbatim — it already has the MSE streaming implementation that will work on both browsers. No changes needed.

```bash
cp extension/content/content.js src/extension/content/content.js
```

**Step 2: Commit**

```bash
git add src/extension/content/content.js
git commit -m "add shared content script using MSE streaming for both browsers"
```

---

### Task 5: Copy shared readability.js library

**Files:**
- Create: `src/extension/lib/readability.js`

**Step 1: Copy the library**

Both versions are identical. Copy from either source:

```bash
cp extension/lib/readability.js src/extension/lib/readability.js
```

**Step 2: Commit**

```bash
git add src/extension/lib/readability.js
git commit -m "add shared readability.js library"
```

---

### Task 6: Update Makefile with extension build targets

**Files:**
- Modify: `Makefile`

**Step 1: Add extension build targets**

Append to existing Makefile (keep `transfer` and `rebuild` targets):

```makefile
# Extension build targets
EXT_SRC = src/extension
EXT_SHARED = background content lib icons

chrome: dist/chrome
firefox: dist/firefox
extension: chrome firefox

dist/chrome: $(shell find $(EXT_SRC) -type f)
	@rm -rf dist/chrome
	@mkdir -p dist/chrome
	@cp $(EXT_SRC)/manifest.chrome.json dist/chrome/manifest.json
	@for dir in $(EXT_SHARED); do \
		cp -r $(EXT_SRC)/$$dir dist/chrome/; \
	done
	@echo "Built dist/chrome/"

dist/firefox: $(shell find $(EXT_SRC) -type f)
	@rm -rf dist/firefox
	@mkdir -p dist/firefox
	@cp $(EXT_SRC)/manifest.firefox.json dist/firefox/manifest.json
	@for dir in $(EXT_SHARED); do \
		cp -r $(EXT_SRC)/$$dir dist/firefox/; \
	done
	@echo "Built dist/firefox/"

chrome-zip: chrome
	@cd dist && zip -r chrome.zip chrome/
	@echo "Created dist/chrome.zip"

firefox-zip: firefox
	@cd dist && zip -r firefox.zip firefox/
	@echo "Created dist/firefox.zip"

clean-extensions:
	@rm -rf dist/chrome dist/firefox dist/chrome.zip dist/firefox.zip
	@echo "Cleaned extension build artifacts"
```

**Step 2: Verify build works**

```bash
make extension
ls -la dist/chrome/ dist/firefox/
# Expect: manifest.json, background/, content/, lib/, icons/ in each
```

**Step 3: Commit**

```bash
git add Makefile
git commit -m "add Makefile targets for building chrome and firefox extensions"
```

---

### Task 7: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Update gitignore**

The `dist/` line was already added in an earlier commit. Update the extension zip patterns to match new output location:

Replace:
```
# Extension build artifacts
extension.zip
firefox-extension.zip
```

With:
```
# Extension build artifacts
/dist/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "update gitignore for new extension build output"
```

---

### Task 8: Delete old extension directories

**Files:**
- Delete: `extension/` (entire directory)
- Delete: `firefox-extension/` (entire directory)

**Step 1: Remove old directories**

```bash
rm -rf extension/ firefox-extension/
```

**Step 2: Verify build still works**

```bash
make clean-extensions
make extension
ls dist/chrome/manifest.json dist/firefox/manifest.json
# Both should exist
```

**Step 3: Commit**

```bash
git add -A
git commit -m "remove old extension and firefox-extension directories"
```

---

### Task 9: Final verification

**Step 1: Clean build from scratch**

```bash
make clean-extensions
make extension
```

**Step 2: Verify Chrome output**

```bash
cat dist/chrome/manifest.json
# Should have "service_worker" key, no browser_specific_settings
```

**Step 3: Verify Firefox output**

```bash
cat dist/firefox/manifest.json
# Should have "scripts" key and browser_specific_settings block
```

**Step 4: Verify shared files are identical**

```bash
diff dist/chrome/background/service-worker.js dist/firefox/background/service-worker.js
diff dist/chrome/content/content.js dist/firefox/content/content.js
diff dist/chrome/lib/readability.js dist/firefox/lib/readability.js
# All should report no differences
```

**Step 5: Build zips**

```bash
make chrome-zip
make firefox-zip
ls -la dist/chrome.zip dist/firefox.zip
# Both should exist
```
