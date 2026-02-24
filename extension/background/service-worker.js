chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  // Check for restricted pages where content scripts can't run
  const restrictedPatterns = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^about:/,
    /^edge:\/\//,
    /^https:\/\/chrome\.google\.com\/webstore/,
    /^https:\/\/chromewebstore\.google\.com/,
  ];

  const isRestricted = restrictedPatterns.some((pattern) => pattern.test(tab.url));
  if (isRestricted) {
    // Set badge to indicate can't run here
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });
    return;
  }

  // Clear any previous badge
  chrome.action.setBadgeText({ text: "", tabId: tab.id });

  // Try to send toggle to existing content script
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
