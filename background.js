let authTabId = null;

function startAuthFlow() {
  const authUrl =
    'https://oauth.vk.com/authorize?client_id=6121396&scope=wall,groups,photos,video,offline&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&v=5.199';
  chrome.tabs.create({ url: authUrl }, (tab) => {
    authTabId = tab?.id ?? null;
  });
}

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
  if (message?.type === 'start_auth') {
    startAuthFlow();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!authTabId || tabId !== authTabId) return;
  if (!changeInfo.url || !changeInfo.url.includes('access_token=')) return;
  const hash = changeInfo.url.split('#')[1];
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (!token) return;
  chrome.storage.local.set({ vk_token: token }, () => {
    chrome.tabs.remove(tabId);
    authTabId = null;
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === authTabId) {
    authTabId = null;
  }
});
