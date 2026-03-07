/**
 * content.ts
 * ISOLATED world エントリポイント: ボタンの表示管理と画面遷移の監視
 */
import type { AppFilter } from "./types";
import { addButton, removeButton, isRecordDetailPage, getCurrentAppId } from "./content/button";
import { getFormFieldDefs, searchDirectory } from "./content/bridge-client";

function isAllowedApp(filters: AppFilter[]): boolean {
  if (filters.length === 0) return true;
  const domain = location.hostname;
  const appId = getCurrentAppId();
  if (!appId) return false;
  return filters.some((f) => f.domain === domain && f.appId === appId);
}

function observe(): void {
  if (!isRecordDetailPage()) {
    removeButton();
    return;
  }
  if (!chrome.runtime?.id) return;
  chrome.storage.sync.get({ appFilters: [] }, (data) => {
    const filters = data.appFilters as AppFilter[];
    if (isAllowedApp(filters)) {
      addButton();
    } else {
      removeButton();
    }
  });
}

window.addEventListener("hashchange", observe);

let debounceTimer: ReturnType<typeof setTimeout>;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (isRecordDetailPage() && !document.getElementById("gishi-kintone-btn") && chrome.runtime?.id) {
      chrome.storage.sync.get({ appFilters: [] }, (data) => {
        const filters = data.appFilters as AppFilter[];
        if (isAllowedApp(filters)) {
          addButton();
        }
      });
    }
  }, 300);
});
observer.observe(document.body, { childList: true, subtree: true });

observe();

// ── Background → Content リレー ──

chrome.runtime.onMessage.addListener(
  (
    msg: { action: string; term?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    if (msg.action === "getFormFieldDefs") {
      getFormFieldDefs().then((fields) => sendResponse({ fields }));
      return true;
    }
    if (msg.action === "searchDirectory") {
      searchDirectory(msg.term ?? "").then((results) =>
        sendResponse({ results }),
      );
      return true;
    }
  },
);
