chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Try to send a message to existing content script first
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    // Content script already exists, it handled the toggle
    return;
  } catch {
    // Content script not injected yet, inject it
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/readability.js", "content/content.js"],
    });
  } catch (err) {
    console.error("Cannot inject into this page:", err);
  }
});
