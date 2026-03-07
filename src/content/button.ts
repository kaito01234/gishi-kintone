import type { Template } from "../types";
import { getFieldValues } from "./bridge-client";
import { closeModal, showModal } from "./modal";
import BUTTON_SVG from "../../static/icons/button.svg";

const BUTTON_ID = "gishi-kintone-btn";

export function isRecordDetailPage(): boolean {
  return /\/k\/\d+\/show#record=\d+/.test(location.href);
}

export function getCurrentAppId(): string | null {
  const m = location.pathname.match(/\/k\/(\d+)\//);
  return m ? m[1] : null;
}

export function addButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const toolbar = document.querySelector(
    ".gaia-argoui-app-toolbar-menu, .contents-actionmenu-gaia",
  );
  if (!toolbar) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.className = "ktc-trigger-btn";
  btn.innerHTML = BUTTON_SVG;
  btn.title = "gishi-kintone";
  btn.addEventListener("click", async () => {
    if (!chrome.runtime?.id) return;
    const fields = await getFieldValues();
    chrome.storage.sync.get({ templates: [] }, (data) => {
      showModal(data.templates as Template[], fields);
    });
  });

  toolbar.prepend(btn);
}

export function removeButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  closeModal();
}
