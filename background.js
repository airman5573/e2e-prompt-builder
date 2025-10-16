const TAB_STATE = new Map();

const ICONS = {
  enabled: {
    16: 'icons/inspector-on-16.png',
    32: 'icons/inspector-on-32.png',
    48: 'icons/inspector-on-48.png',
    128: 'icons/inspector-on-128.png',
  },
  disabled: {
    16: 'icons/inspector-off-16.png',
    32: 'icons/inspector-off-32.png',
    48: 'icons/inspector-off-48.png',
    128: 'icons/inspector-off-128.png',
  },
};

function updateActionIcon(tabId, enabled) {
  const iconPath = enabled ? ICONS.enabled : ICONS.disabled;
  chrome.action.setIcon({ tabId, path: iconPath });
  chrome.action.setBadgeText({ tabId, text: enabled ? 'ON' : '' });
  if (enabled) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#d32f2f' });
  }
}

function toggleInspector(tabId) {
  const nextState = !TAB_STATE.get(tabId);
  TAB_STATE.set(tabId, nextState);
  updateActionIcon(tabId, nextState);

  chrome.tabs.sendMessage(
    tabId,
    { type: 'ELEMENT_INSPECTOR_SET_STATE', enabled: nextState },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Element Inspector] 메시지 전송 실패:', chrome.runtime.lastError.message);
        TAB_STATE.set(tabId, false);
        updateActionIcon(tabId, false);
      } else if (!response) {
        TAB_STATE.set(tabId, false);
        updateActionIcon(tabId, false);
      }
    },
  );
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  toggleInspector(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  TAB_STATE.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === 'ELEMENT_INSPECTOR_REQUEST_STATE') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ enabled: false });
      return;
    }

    const enabled = Boolean(TAB_STATE.get(tabId));
    TAB_STATE.set(tabId, enabled);
    updateActionIcon(tabId, enabled);
    sendResponse({ enabled });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
