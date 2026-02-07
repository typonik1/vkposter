chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'open_popup') {
    const baseUrl = chrome.runtime.getURL('popup.html');
    const targetUrl = message.postUrl
      ? `${baseUrl}?post=${encodeURIComponent(message.postUrl)}`
      : baseUrl;
    chrome.tabs.create({ url: targetUrl });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
