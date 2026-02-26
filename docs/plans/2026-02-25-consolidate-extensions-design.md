# Consolidate Chrome & Firefox Extensions

## Problem

`extension/` and `firefox-extension/` are near-copies with three differences:
1. `manifest.json` — `service_worker` vs `scripts`, plus Firefox's `browser_specific_settings`
2. `background/service-worker.js` — different restricted URL patterns (~5 lines)
3. `content/content.js` — Chrome uses MSE streaming, Firefox uses blob accumulation

## Decision

- Firefox switches to MSE (supported since Firefox 42), eliminating difference #3
- Single shared source with a build step to produce browser-specific outputs

## Directory Structure

```
src/extension/
├── manifest.chrome.json
├── manifest.firefox.json
├── background/
│   └── service-worker.js      # shared, runtime browser detection for restricted URLs
├── content/
│   └── content.js             # shared, MSE implementation
├── lib/
│   └── readability.js         # shared
└── icons/

dist/
├── chrome/                    # built output
└── firefox/                   # built output
```

## Browser Detection

`service-worker.js` uses runtime detection for restricted URL patterns:

```js
const IS_FIREFOX = typeof browser !== 'undefined';
```

Chrome patterns: `chrome://`, `chrome-extension://`, `about:`, `edge://`, Chrome Web Store
Firefox patterns: `about:`, `moz-extension://`, Mozilla Add-ons

## Build (Makefile)

| Target | Description |
|--------|-------------|
| `make extension` | Build both chrome and firefox |
| `make chrome` | Build `dist/chrome/` |
| `make firefox` | Build `dist/firefox/` |
| `make chrome-zip` | Build + zip to `dist/chrome.zip` |
| `make firefox-zip` | Build + zip to `dist/firefox.zip` |
| `make clean-extensions` | Remove `dist/` outputs |

Each build: copies shared files, places correct manifest as `manifest.json`.

Existing `transfer` and `rebuild` Makefile targets unchanged.

## Changes

- Create `src/extension/` with shared source
- Delete `extension/` and `firefox-extension/`
- Update Makefile with new targets
- Add `dist/` to `.gitignore`
