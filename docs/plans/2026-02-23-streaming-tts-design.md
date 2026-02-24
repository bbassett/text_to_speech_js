# Streaming TTS Design

## Summary

Add a streaming TTS endpoint that synthesizes text sentence-by-sentence and streams MP3 audio back as each sentence completes. The client uses Media Source Extensions (MSE) to start playback as soon as the first chunk arrives. Both the extension and web app get streaming support. Verbose debug logging is included for development.

## Backend — `/api/tts-stream`

### Endpoint

`POST /api/tts-stream` — new endpoint alongside existing `/api/tts` (which remains unchanged).

### Request

```json
{ "text": "...", "voice": "en-US-Wavenet-D", "speed": 1.0 }
```

### Response

Chunked HTTP response streaming MP3 data. `Content-Type: audio/mpeg`, `Transfer-Encoding: chunked`.

### Server-Side Flow

1. Receive full text
2. Split into sentences (split on `.`, `!`, `?` followed by whitespace, handling abbreviations)
3. Pipeline synthesis with 2-3 sentences ahead:
   - Start synthesizing sentences 1, 2, 3 concurrently
   - As sentence 1 completes, write its MP3 bytes to the response stream immediately
   - Start sentence 4
   - As sentence 2 completes, write its bytes
   - Continue until all sentences are streamed
4. Close the response stream

Each sentence is synthesized via `TextToSpeechClient.synthesizeSpeech()` (short audio path, returns MP3). MP3 frames are independently decodable, so concatenation works. No need for the long audio API — even very long texts are broken into sentences well under 5000 chars.

### Debug Logging

Read from `process.env.DEBUG_TTS`. Helper function `debugLog(...args)` that only logs when enabled. Log: sentence split results, synthesis start/complete per sentence, pipeline state, bytes written, stream open/close.

## Client — MSE Audio Playback

### Flow (same for extension and web app)

1. Create a `MediaSource`, attach to `<audio>` via `URL.createObjectURL(mediaSource)`
2. On `sourceopen`, create a `SourceBuffer` with type `audio/mpeg`
3. `fetch()` `/api/tts-stream`, get a `ReadableReader` from `response.body`
4. As chunks arrive, queue and append to `SourceBuffer` (one at a time, waiting for `updateend` before appending next)
5. Call `audio.play()` after the first chunk is appended
6. When the stream ends, call `mediaSource.endOfStream()`

### Flow Control

`SourceBuffer` throws if `appendBuffer()` is called while a previous append is processing. Queue incoming chunks, append sequentially using `updateend` events.

### Speed Controls

`audio.playbackRate` works unchanged with MSE.

### Download

Collect all raw MP3 chunks into a single `Blob` for the download button.

### Browser Support

If `typeof MediaSource === "undefined"`, show an error message: "Your browser does not support audio streaming. Please use a modern browser." No fallback to the non-streaming endpoint.

### Debug Logging

Global `window.__TTS_DEBUG = true`. Helper function `debugLog(...args)` that checks the flag. Log: fetch start, chunk received (size), MSE buffer state, append events, playback start, stream end.

## Files Changed

### New
- `src/app/api/tts-stream/route.ts` — streaming TTS endpoint with sentence chunking and pipelined synthesis

### Modified
- `extension/content/content.js` — replace `handleGenerate()` with streaming + MSE, add debug logging
- `src/app/page.tsx` — replace `handleTextToSpeech()` with streaming + MSE, add debug logging
- `src/middleware.ts` — add `Access-Control-Expose-Headers` to CORS headers
- `extension/manifest.json` — add `https://tts.brandonbassett.xyz/*` to `host_permissions`

### Unchanged
- `/api/tts` — existing non-streaming endpoint, untouched
- `/api/tts-status`, `/api/download-audio` — long audio polling, untouched
- Voice list, speed controls, preferences — unchanged
