/**
 * background.ts
 * Service Worker: オプションページを開くメッセージ処理 & Popup→Content リレー
 */

const KINTONE_URL_RE =
  /^https?:\/\/[^/]*(\.(cybozu\.com|cybozu-dev\.com|kintone\.com|kintone-dev\.com|cybozu\.cn|cybozu-dev\.cn)|localhost)\/k\//;

chrome.runtime.onMessage.addListener(
  (
    msg: { action?: string; term?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    if (msg.action === "openOptions") {
      chrome.runtime.openOptionsPage();
      return;
    }

    if (
      msg.action === "getFormFieldDefs" ||
      msg.action === "searchDirectory"
    ) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || !tab.url || !KINTONE_URL_RE.test(tab.url)) {
          sendResponse({
            error: "kintoneタブを開いた状態でご利用ください",
          });
          return;
        }
        chrome.tabs.sendMessage(tab.id, msg, (resp) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              error: "kintoneタブを開いた状態でご利用ください",
            });
            return;
          }
          sendResponse(resp);
        });
      });
      return true;
    }
  },
);
