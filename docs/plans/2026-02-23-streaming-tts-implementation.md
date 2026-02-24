# Streaming TTS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a streaming TTS endpoint that synthesizes text sentence-by-sentence and streams MP3 audio, with MSE-based playback in both the extension and web app.

**Architecture:** New `/api/tts-stream` endpoint splits text into sentences, pipelines 2-3 concurrent synthesis calls, and streams MP3 bytes as each completes. Clients use `MediaSource` + `SourceBuffer` to play audio as it arrives. Debug logging throughout, controlled by env var (server) and global flag (client).

**Tech Stack:** Next.js API route with `ReadableStream`, Google Cloud `TextToSpeechClient`, Media Source Extensions, vanilla JS (extension), React (web app)

**Design doc:** `docs/plans/2026-02-23-streaming-tts-design.md`

---

### Task 1: CORS Fix and Manifest Update

**Files:**
- Modify: `src/middleware.ts`
- Modify: `extension/manifest.json`

**Step 1: Update CORS middleware to expose headers for streaming**

In `src/middleware.ts`, update the `CORS_HEADERS` object:

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "Content-Type",
};
```

**Step 2: Add localhost to manifest host_permissions for development**

The manifest currently only has `https://tts.brandonbassett.xyz/*`. Add localhost for dev:

```json
"host_permissions": [
  "https://tts.brandonbassett.xyz/*",
  "http://localhost:3000/*"
]
```

**Step 3: Commit**

```bash
git add src/middleware.ts extension/manifest.json
git commit -m "update CORS headers for streaming and add localhost to host_permissions"
```

---

### Task 2: Streaming TTS Backend Endpoint

**Files:**
- Create: `src/app/api/tts-stream/route.ts`

**Step 1: Create the streaming endpoint**

Create `src/app/api/tts-stream/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

function debugLog(...args: unknown[]) {
  if (process.env.DEBUG_TTS) {
    console.log("[tts-stream]", ...args);
  }
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  // Handles: periods, exclamation marks, question marks
  // Avoids splitting on common abbreviations (Mr., Mrs., Dr., etc.)
  const abbreviations = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|approx|dept|est|inc|ltd|vol|rev)\./gi;

  // Temporarily replace abbreviation periods with a placeholder
  let processed = text;
  const placeholders: string[] = [];
  processed = processed.replace(abbreviations, (match) => {
    placeholders.push(match);
    return `__ABBR${placeholders.length - 1}__`;
  });

  // Split on sentence boundaries
  const rawSentences = processed.split(/(?<=[.!?])\s+/);

  // Restore abbreviations and filter empty strings
  const sentences = rawSentences
    .map((s) => {
      let restored = s;
      placeholders.forEach((p, i) => {
        restored = restored.replace(`__ABBR${i}__`, p);
      });
      return restored.trim();
    })
    .filter((s) => s.length > 0);

  debugLog(`Split text into ${sentences.length} sentences`);
  return sentences;
}

async function synthesizeSentence(
  client: TextToSpeechClient,
  text: string,
  voice: string,
  languageCode: string,
  speed: number,
  index: number
): Promise<Uint8Array> {
  debugLog(`Synthesizing sentence ${index}: "${text.substring(0, 50)}..." (${text.length} chars)`);
  const startTime = Date.now();

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode, name: voice },
    audioConfig: { audioEncoding: "MP3" as const, speakingRate: speed },
  });

  if (!response.audioContent) {
    throw new Error(`No audio content for sentence ${index}`);
  }

  const audioBytes = response.audioContent as Uint8Array;
  debugLog(`Sentence ${index} synthesized: ${audioBytes.length} bytes in ${Date.now() - startTime}ms`);
  return audioBytes;
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = "en-US-Wavenet-D", speed = 1.0 } = await request.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    debugLog(`Received request: ${text.length} chars, voice=${voice}, speed=${speed}`);

    const client = new TextToSpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const languageCode = voice.split("-").slice(0, 2).join("-");
    const sentences = splitIntoSentences(text);

    if (sentences.length === 0) {
      return new Response(JSON.stringify({ error: "No sentences found in text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    debugLog(`Starting pipelined synthesis of ${sentences.length} sentences`);

    const stream = new ReadableStream({
      async start(controller) {
        const PIPELINE_SIZE = 3;
        let nextToSynthesize = 0;
        let nextToWrite = 0;

        // Map of sentence index -> Promise<Uint8Array>
        const pending = new Map<number, Promise<Uint8Array>>();

        // Fill the initial pipeline
        while (nextToSynthesize < Math.min(PIPELINE_SIZE, sentences.length)) {
          const idx = nextToSynthesize;
          pending.set(
            idx,
            synthesizeSentence(client, sentences[idx], voice, languageCode, speed, idx)
          );
          nextToSynthesize++;
        }

        // Process results in order, refilling the pipeline
        while (nextToWrite < sentences.length) {
          try {
            const audioBytes = await pending.get(nextToWrite)!;
            pending.delete(nextToWrite);

            debugLog(`Writing sentence ${nextToWrite}: ${audioBytes.length} bytes`);
            controller.enqueue(audioBytes);
            nextToWrite++;

            // Refill pipeline
            if (nextToSynthesize < sentences.length) {
              const idx = nextToSynthesize;
              pending.set(
                idx,
                synthesizeSentence(client, sentences[idx], voice, languageCode, speed, idx)
              );
              nextToSynthesize++;
            }
          } catch (err) {
            debugLog(`Error at sentence ${nextToWrite}:`, err);
            controller.error(err);
            return;
          }
        }

        debugLog("Stream complete, all sentences written");
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    debugLog("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start streaming synthesis" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

Key implementation details:
- `splitIntoSentences`: splits on `.!?` followed by whitespace, with abbreviation handling
- `synthesizeSentence`: wraps a single Google Cloud TTS call with debug logging
- Pipeline: starts 3 concurrent synthesis calls, writes results in order, refills the pipeline as each completes
- Uses Web Streams API (`ReadableStream`) which Next.js App Router supports natively
- Returns raw `Response` (not `NextResponse`) for streaming compatibility

**Step 2: Test the endpoint**

Start the dev server and use curl to verify streaming:

```bash
curl -X POST http://localhost:3000/api/tts-stream \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world. This is a test. How are you today?"}' \
  --output test.mp3
```

Verify `test.mp3` plays correctly and contains all three sentences.

**Step 3: Commit**

```bash
git add src/app/api/tts-stream/route.ts
git commit -m "add streaming TTS endpoint with sentence chunking and pipelined synthesis"
```

---

### Task 3: MSE Streaming Playback in Extension

**Files:**
- Modify: `extension/content/content.js`

This task replaces `handleGenerate()` and `playAudio()` with streaming MSE-based versions. The old polling functions (`startPolling`, `downloadLongAudio`) remain but are no longer called from `handleGenerate`.

**Step 1: Add debug logging helper**

Near the top of the IIFE (after the state variables), add:

```javascript
const TTS_DEBUG = true; // Set to false to disable debug logging

function debugLog(...args) {
  if (TTS_DEBUG) {
    console.log("[tts-ext]", ...args);
  }
}
```

**Step 2: Replace `handleGenerate()` with streaming version**

Replace the entire `handleGenerate()` function (currently lines ~591-659) with:

```javascript
async function handleGenerate() {
    const text = getTextToConvert();
    if (!text) return;

    // Check MSE support
    if (typeof MediaSource === "undefined") {
      showError("Your browser does not support audio streaming. Please use a modern browser.");
      return;
    }

    const generateBtn = shadowRoot.getElementById("tts-generate");
    const voiceSelect = shadowRoot.getElementById("tts-voice");
    const errorEl = shadowRoot.getElementById("tts-error");
    const audioSection = shadowRoot.getElementById("tts-audio-section");
    const audioEl = shadowRoot.getElementById("tts-audio");
    const progressSection = shadowRoot.getElementById("tts-progress");

    // Reset state
    errorEl.classList.remove("visible");
    audioSection.classList.remove("visible");
    progressSection.classList.remove("visible");
    generateBtn.disabled = true;
    generateBtn.textContent = "Streaming...";

    // Clean up previous audio
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }

    // Reset collected chunks for download
    audioChunks = [];

    const voice = voiceSelect.value;
    const speed = parseFloat(
      shadowRoot.querySelector(".tts-speed-btn.active")?.dataset.speed || "1"
    );

    debugLog("Starting streaming TTS", { textLength: text.length, voice, speed });

    try {
      const response = await fetch(`${BACKEND_URL}/api/tts-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
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

      debugLog("Response received, starting MSE playback");
      await playStreamingAudio(response, audioEl, audioSection);
    } catch (err) {
      debugLog("Error:", err);
      showError(err.message || "Failed to generate speech");
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Speech";
    }
  }
```

**Step 3: Add `audioChunks` state variable**

Near the top of the IIFE, alongside the other state variables, add:

```javascript
let audioChunks = [];
```

**Step 4: Replace `playAudio()` with `playStreamingAudio()`**

Replace the current `playAudio(blob)` function with:

```javascript
async function playStreamingAudio(response, audioEl, audioSection) {
    return new Promise((resolve, reject) => {
      const mediaSource = new MediaSource();
      currentAudioUrl = URL.createObjectURL(mediaSource);
      audioEl.src = currentAudioUrl;

      const speed = parseFloat(
        shadowRoot.querySelector(".tts-speed-btn.active")?.dataset.speed || "1"
      );
      audioEl.playbackRate = speed;

      mediaSource.addEventListener("sourceopen", async () => {
        debugLog("MediaSource opened");
        let sourceBuffer;
        try {
          sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        } catch (err) {
          debugLog("Failed to create SourceBuffer:", err);
          reject(new Error("Failed to initialize audio player"));
          return;
        }

        const reader = response.body.getReader();
        let firstChunk = true;
        const queue = [];
        let appending = false;

        function appendNext() {
          if (appending || queue.length === 0) return;
          if (mediaSource.readyState !== "open") return;

          appending = true;
          const chunk = queue.shift();
          debugLog(`Appending chunk: ${chunk.byteLength} bytes, queue: ${queue.length}`);

          try {
            sourceBuffer.appendBuffer(chunk);
          } catch (err) {
            debugLog("appendBuffer error:", err);
            appending = false;
            reject(err);
          }
        }

        sourceBuffer.addEventListener("updateend", () => {
          appending = false;
          debugLog("SourceBuffer updateend, buffered:", sourceBuffer.buffered.length > 0
            ? `${sourceBuffer.buffered.start(0).toFixed(1)}s - ${sourceBuffer.buffered.end(0).toFixed(1)}s`
            : "empty");
          appendNext();
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              debugLog("Stream complete, total chunks:", audioChunks.length);
              // Wait for any pending appends to finish
              const waitForAppends = () => new Promise((res) => {
                if (!appending && queue.length === 0) {
                  res();
                } else {
                  sourceBuffer.addEventListener("updateend", function handler() {
                    if (queue.length === 0) {
                      sourceBuffer.removeEventListener("updateend", handler);
                      res();
                    } else {
                      appendNext();
                    }
                  });
                  appendNext();
                }
              });
              await waitForAppends();

              if (mediaSource.readyState === "open") {
                mediaSource.endOfStream();
                debugLog("MediaSource endOfStream called");
              }
              resolve();
              return;
            }

            debugLog(`Received chunk: ${value.byteLength} bytes`);
            audioChunks.push(new Uint8Array(value));
            queue.push(value);

            if (firstChunk) {
              firstChunk = false;
              audioSection.classList.add("visible");
              appendNext();
              // Start playback after first append completes
              sourceBuffer.addEventListener("updateend", function playOnce() {
                sourceBuffer.removeEventListener("updateend", playOnce);
                debugLog("First chunk appended, starting playback");
                audioEl.play().catch((err) => debugLog("Play error:", err));
              }, { once: true });
            } else {
              appendNext();
            }
          }
        } catch (err) {
          debugLog("Stream read error:", err);
          if (mediaSource.readyState === "open") {
            mediaSource.endOfStream("network");
          }
          reject(err);
        }
      });
    });
  }
```

**Step 5: Update download button handler to use collected chunks**

Find the download button handler in `createWidget()` and replace it:

```javascript
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
```

**Step 6: Test in extension**

1. Restart dev server with `DEBUG_TTS=true npm run dev`
2. Reload extension at `chrome://extensions`
3. Navigate to a news article, click extension icon
4. Watch DevTools console for `[tts-ext]` debug logs
5. Verify: audio starts playing before full text is synthesized
6. Verify: speed controls work during playback
7. Verify: download produces a valid MP3

**Step 7: Commit**

```bash
git add extension/content/content.js
git commit -m "replace extension TTS with streaming MSE playback"
```

---

### Task 4: MSE Streaming Playback in Web App

**Files:**
- Modify: `src/app/page.tsx`

This task updates the web app's `handleTextToSpeech()` to use the same streaming approach.

**Step 1: Add debug logging**

At the top of the `Home` component (after the state declarations), add:

```typescript
const TTS_DEBUG = true;
const debugLog = (...args: unknown[]) => {
  if (TTS_DEBUG) console.log("[tts-web]", ...args);
};
```

**Step 2: Add audioChunks ref**

Add alongside the other refs:

```typescript
const audioChunksRef = useRef<Uint8Array[]>([]);
```

**Step 3: Add MSE check and playStreamingAudio function**

Add before the `handleTextToSpeech` function:

```typescript
const playStreamingAudio = async (
  response: Response,
  audioElement: HTMLAudioElement
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const mediaSource = new MediaSource();
    const msUrl = URL.createObjectURL(mediaSource);
    audioElement.src = msUrl;
    audioElement.playbackRate = playbackSpeed;

    mediaSource.addEventListener("sourceopen", async () => {
      debugLog("MediaSource opened");
      let sourceBuffer: SourceBuffer;
      try {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      } catch (err) {
        debugLog("Failed to create SourceBuffer:", err);
        reject(new Error("Failed to initialize audio player"));
        return;
      }

      const reader = response.body!.getReader();
      let firstChunk = true;
      const queue: Uint8Array[] = [];
      let appending = false;

      function appendNext() {
        if (appending || queue.length === 0) return;
        if (mediaSource.readyState !== "open") return;
        appending = true;
        const chunk = queue.shift()!;
        debugLog(`Appending chunk: ${chunk.byteLength} bytes, queue: ${queue.length}`);
        try {
          sourceBuffer.appendBuffer(chunk);
        } catch (err) {
          debugLog("appendBuffer error:", err);
          appending = false;
          reject(err);
        }
      }

      sourceBuffer.addEventListener("updateend", () => {
        appending = false;
        debugLog("SourceBuffer updateend");
        appendNext();
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            debugLog("Stream complete, total chunks:", audioChunksRef.current.length);
            const waitForAppends = () =>
              new Promise<void>((res) => {
                if (!appending && queue.length === 0) {
                  res();
                } else {
                  sourceBuffer.addEventListener("updateend", function handler() {
                    if (queue.length === 0) {
                      sourceBuffer.removeEventListener("updateend", handler);
                      res();
                    } else {
                      appendNext();
                    }
                  });
                  appendNext();
                }
              });
            await waitForAppends();
            if (mediaSource.readyState === "open") {
              mediaSource.endOfStream();
              debugLog("MediaSource endOfStream called");
            }
            resolve(msUrl);
            return;
          }

          debugLog(`Received chunk: ${value.byteLength} bytes`);
          audioChunksRef.current.push(new Uint8Array(value));
          queue.push(value);

          if (firstChunk) {
            firstChunk = false;
            appendNext();
            sourceBuffer.addEventListener(
              "updateend",
              function playOnce() {
                sourceBuffer.removeEventListener("updateend", playOnce);
                debugLog("First chunk appended, starting playback");
                audioElement.play().catch((err) => debugLog("Play error:", err));
              },
              { once: true }
            );
          } else {
            appendNext();
          }
        }
      } catch (err) {
        debugLog("Stream read error:", err);
        if (mediaSource.readyState === "open") {
          mediaSource.endOfStream("network");
        }
        reject(err);
      }
    });
  });
};
```

**Step 4: Replace `handleTextToSpeech`**

Replace the entire `handleTextToSpeech` function with:

```typescript
const handleTextToSpeech = async () => {
  const textToConvert = text;

  if (url.trim() && !text.trim()) {
    await handleExtractFromUrl();
    return;
  }

  if (!textToConvert.trim()) return;

  // Check MSE support
  if (typeof MediaSource === "undefined") {
    setError("Your browser does not support audio streaming. Please use a modern browser.");
    return;
  }

  setIsLoading(true);
  setError(null);
  setAudioUrl(null);
  setLongAudioProgress({ isProcessing: false, progress: 0 });
  audioChunksRef.current = [];

  debugLog("Starting streaming TTS", { textLength: textToConvert.length, voice, playbackSpeed });

  try {
    const response = await fetch("/api/tts-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textToConvert, voice, speed: playbackSpeed }),
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

    debugLog("Response received, starting MSE playback");

    if (!audioRef.current) throw new Error("Audio element not available");
    const msUrl = await playStreamingAudio(response, audioRef.current);
    setAudioUrl(msUrl);
  } catch (error) {
    console.error("Error generating speech:", error);
    setError(error instanceof Error ? error.message : "Failed to generate speech");
  } finally {
    setIsLoading(false);
  }
};
```

**Step 5: Update the download handler**

Replace the `downloadAudio` function:

```typescript
const downloadAudio = () => {
  if (audioChunksRef.current.length > 0) {
    const blob = new Blob(audioChunksRef.current, { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "speech.mp3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
```

**Step 6: Test in web app**

1. Run `DEBUG_TTS=true npm run dev`
2. Open `http://localhost:3000`
3. Enter text or URL, click Convert to Speech
4. Watch browser console for `[tts-web]` logs
5. Verify audio starts streaming before full synthesis completes
6. Verify download works

**Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "replace web app TTS with streaming MSE playback"
```

---

### Task 5: Debug Logging on Backend

**Files:**
- Modify: `src/app/api/tts-stream/route.ts` (already has debug logging from Task 2)

This task is already done — the `debugLog` function in the streaming endpoint reads from `process.env.DEBUG_TTS`. Verify it works:

**Step 1: Test with debug mode on**

```bash
DEBUG_TTS=true npm run dev
```

Make a request and verify server console shows logs like:
```
[tts-stream] Received request: 150 chars, voice=en-US-Wavenet-D, speed=1
[tts-stream] Split text into 3 sentences
[tts-stream] Starting pipelined synthesis of 3 sentences
[tts-stream] Synthesizing sentence 0: "Hello world." (12 chars)
[tts-stream] Synthesizing sentence 1: "This is a test." (15 chars)
[tts-stream] Synthesizing sentence 2: "How are you today?" (18 chars)
[tts-stream] Sentence 0 synthesized: 4523 bytes in 340ms
[tts-stream] Writing sentence 0: 4523 bytes
...
[tts-stream] Stream complete, all sentences written
```

**Step 2: Test with debug mode off**

```bash
npm run dev
```

Verify no `[tts-stream]` logs appear.

No commit needed — already included in Task 2.

---

## Summary of Tasks

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | CORS fix + manifest localhost | `src/middleware.ts`, `extension/manifest.json` |
| 2 | Streaming TTS backend endpoint | `src/app/api/tts-stream/route.ts` |
| 3 | MSE streaming playback in extension | `extension/content/content.js` |
| 4 | MSE streaming playback in web app | `src/app/page.tsx` |
| 5 | Verify debug logging (no code change) | — |
