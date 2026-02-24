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
