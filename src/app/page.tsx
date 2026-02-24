"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [voice, setVoice] = useState("en-US-Wavenet-D");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<{
    title: string;
    originalLength: number;
    truncated: boolean;
  } | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoConvert, setAutoConvert] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const autoConvertDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const TTS_DEBUG = false;
  const debugLog = (...args: unknown[]) => {
    if (TTS_DEBUG) console.log("[tts-web]", ...args);
  };

  // Load playback speed and auto-convert from cookies on mount
  useEffect(() => {
    const savedSpeed = document.cookie
      .split("; ")
      .find((row) => row.startsWith("playbackSpeed="))
      ?.split("=")[1];

    if (savedSpeed) {
      setPlaybackSpeed(parseFloat(savedSpeed));
    }

    const savedAutoConvert = document.cookie
      .split("; ")
      .find((row) => row.startsWith("autoConvert="))
      ?.split("=")[1];

    if (savedAutoConvert) {
      setAutoConvert(savedAutoConvert === "true");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (urlDebounceRef.current) {
        clearTimeout(urlDebounceRef.current);
      }
      if (autoConvertDebounceRef.current) {
        clearTimeout(autoConvertDebounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Apply playback speed to audio element and save to cookie
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }

    // Save to cookie with 1 year expiry
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    document.cookie = `playbackSpeed=${playbackSpeed}; expires=${date.toUTCString()}; path=/`;
  }, [playbackSpeed, audioUrl]);

  // Save auto-convert state to cookie
  useEffect(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    document.cookie = `autoConvert=${autoConvert}; expires=${date.toUTCString()}; path=/`;
  }, [autoConvert]);

  // Auto-extract text when URL changes with debounce
  useEffect(() => {
    if (urlDebounceRef.current) {
      clearTimeout(urlDebounceRef.current);
    }

    if (url.trim() && !text.trim()) {
      urlDebounceRef.current = setTimeout(() => {
        handleExtractFromUrl();
      }, 200);
    }

    return () => {
      if (urlDebounceRef.current) {
        clearTimeout(urlDebounceRef.current);
      }
    };
  }, [url]);

  // Auto-convert to speech when text changes with debounce
  useEffect(() => {
    if (autoConvertDebounceRef.current) {
      clearTimeout(autoConvertDebounceRef.current);
    }

    if (
      autoConvert &&
      text.trim() &&
      !isLoading
    ) {
      autoConvertDebounceRef.current = setTimeout(() => {
        handleTextToSpeech();
      }, 1000);
    }

    return () => {
      if (autoConvertDebounceRef.current) {
        clearTimeout(autoConvertDebounceRef.current);
      }
    };
  }, [text, autoConvert]);

  const handleExtractFromUrl = async () => {
    if (!url.trim()) return;

    setIsExtractingText(true);
    setError(null);
    setExtractedInfo(null);

    try {
      const response = await fetch("/api/url-to-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract text from URL");
      }

      const data = await response.json();
      setText(data.text);
      setExtractedInfo({
        title: data.title,
        originalLength: data.originalLength,
        truncated: data.truncated,
      });
    } catch (error) {
      console.error("Error extracting text:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to extract text from URL",
      );
    } finally {
      setIsExtractingText(false);
    }
  };

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
        let onDrain: (() => void) | null = null;

        function appendNext() {
          if (appending || queue.length === 0) return;
          if (mediaSource.readyState !== "open") return;

          appending = true;
          const chunk = queue.shift()!;
          debugLog(`Appending chunk: ${chunk.byteLength} bytes, queue: ${queue.length}`);
          try {
            sourceBuffer.appendBuffer(chunk);
          } catch (err) {
            if (err instanceof DOMException && err.name === "QuotaExceededError") {
              queue.unshift(chunk);
              appending = false;
              const ct = audioElement.currentTime;
              if (sourceBuffer.buffered.length > 0 && ct > 1) {
                debugLog(`QuotaExceededError, evicting buffer 0-${(ct - 1).toFixed(1)}s`);
                appending = true;
                sourceBuffer.remove(0, ct - 1);
                return; // updateend will call appendNext to retry
              }
            }
            debugLog("appendBuffer error:", err);
            appending = false;
            reject(err);
          }
        }

        sourceBuffer.addEventListener("updateend", () => {
          appending = false;
          debugLog("SourceBuffer updateend");
          if (queue.length > 0) {
            appendNext();
          } else if (onDrain) {
            onDrain();
            onDrain = null;
          }
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
                    onDrain = res;
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    audioChunksRef.current = [];

    debugLog("Starting streaming TTS", { textLength: textToConvert.length, voice, playbackSpeed });

    try {
      const response = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToConvert, voice, speed: playbackSpeed }),
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

      debugLog("Response received, starting MSE playback");
      setShowAudio(true);

      if (!audioRef.current) throw new Error("Audio element not available");
      const msUrl = await playStreamingAudio(response, audioRef.current);
      setAudioUrl(msUrl);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        debugLog("Request aborted");
        return;
      }
      console.error("Error generating speech:", error);
      setError(error instanceof Error ? error.message : "Failed to generate speech");
      setShowAudio(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setText("");
    setUrl("");
    setExtractedInfo(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setShowAudio(false);
    setError(null);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Text to Speech
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-6">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Choose input method below - filling one field will disable the
                  other
                </div>
              </div>

              {/* URL Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="url-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enter URL to extract and convert text:
                  </label>
                  {url && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    id="url-input"
                    type="url"
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      text.trim()
                        ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={text.trim() !== ""}
                  />
                </div>
              </div>

              <div className="text-center text-gray-400 dark:text-gray-500">
                OR
              </div>

              {/* Text Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="text-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enter text directly:
                  </label>
                  {text && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  id="text-input"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    url.trim()
                      ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Type your text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={url.trim() !== ""}
                />
              </div>
            </div>
          </div>

          {/* Extracted content info */}
          {extractedInfo && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                Extracted from: {extractedInfo.title}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Original length: {extractedInfo.originalLength} characters
                {extractedInfo.truncated && " (truncated to 5000 characters)"}
                {extractedInfo.originalLength > 5000 &&
                  " - Long texts will use advanced processing"}
              </p>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="voice-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Voice:
            </label>
            <select
              id="voice-select"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <optgroup label="English (US) - WaveNet">
                <option value="en-US-Wavenet-A">en-US-Wavenet-A (Male)</option>
                <option value="en-US-Wavenet-B">en-US-Wavenet-B (Male)</option>
                <option value="en-US-Wavenet-C">
                  en-US-Wavenet-C (Female)
                </option>
                <option value="en-US-Wavenet-D">en-US-Wavenet-D (Male)</option>
                <option value="en-US-Wavenet-E">
                  en-US-Wavenet-E (Female)
                </option>
                <option value="en-US-Wavenet-F">
                  en-US-Wavenet-F (Female)
                </option>
              </optgroup>
              <optgroup label="English (US) - Standard">
                <option value="en-US-Standard-A">
                  en-US-Standard-A (Male)
                </option>
                <option value="en-US-Standard-B">
                  en-US-Standard-B (Male)
                </option>
                <option value="en-US-Standard-C">
                  en-US-Standard-C (Female)
                </option>
                <option value="en-US-Standard-D">
                  en-US-Standard-D (Male)
                </option>
                <option value="en-US-Standard-E">
                  en-US-Standard-E (Female)
                </option>
              </optgroup>
              <optgroup label="English (UK)">
                <option value="en-GB-Wavenet-A">
                  en-GB-Wavenet-A (Female)
                </option>
                <option value="en-GB-Wavenet-B">en-GB-Wavenet-B (Male)</option>
                <option value="en-GB-Wavenet-C">
                  en-GB-Wavenet-C (Female)
                </option>
                <option value="en-GB-Wavenet-D">en-GB-Wavenet-D (Male)</option>
              </optgroup>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md">
              {error}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={handleTextToSpeech}
              disabled={
                (!text.trim() && !url.trim()) ||
                isLoading ||
                isExtractingText
              }
              className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Generating Speech..."
                : isExtractingText
                  ? "Extracting Text..."
                  : url.trim() && !text.trim()
                    ? "Extract & Convert to Speech"
                    : "Convert to Speech"}
            </button>

            {/* Auto-convert toggle */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoConvert}
                onChange={(e) => setAutoConvert(e.target.checked)}
                className="sr-only"
              />
              <div className="relative">
                <div
                  className={`block w-10 h-6 rounded-full ${autoConvert ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoConvert ? "transform translate-x-4" : ""}`}
                ></div>
              </div>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Auto
              </span>
            </label>
          </div>

          <div className={`mt-6 ${showAudio ? "" : "hidden"}`}>
              <audio
                ref={audioRef}
                controls
                className="w-full"
              />

              {/* Playback Speed Controls */}
              <div className="mt-3 flex justify-center space-x-2">
                <button
                  onClick={() => setPlaybackSpeed(1)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    playbackSpeed === 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  1x
                </button>
                <button
                  onClick={() => setPlaybackSpeed(1.5)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    playbackSpeed === 1.5
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  1.5x
                </button>
                <button
                  onClick={() => setPlaybackSpeed(2)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    playbackSpeed === 2
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  2x
                </button>
              </div>

              <button
                onClick={downloadAudio}
                className="mt-3 w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Download Audio
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
