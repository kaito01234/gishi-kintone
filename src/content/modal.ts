import type { FieldMap, ResolvedMentionMap, Template } from "../types";
import { resolveMentions } from "./bridge-client";
import {
  applyTemplate,
  applyTemplateHtml,
  extractMentions,
} from "./template";

const MODAL_ID = "gishi-kintone-modal";

const emptyHtml = `
  <div class="ktc-modal">
    <div class="ktc-modal-body">
      <p class="ktc-empty-msg">テンプレートが登録されていません。<br>拡張機能のポップアップからテンプレートを追加してください。</p>
      <button class="ktc-btn ktc-btn-normal">設定を開く</button>
    </div>
  </div>
`;

const mainHtml = `
  <div class="ktc-modal">
    <div class="ktc-modal-body">
      <select class="ktc-select"></select>
      <pre class="ktc-preview"></pre>
      <div class="ktc-actions">
        <button class="ktc-btn ktc-btn-submit">コピー</button>
        <span class="ktc-status"></span>
      </div>
    </div>
  </div>
`;

export function closeModal(): void {
  document.getElementById(MODAL_ID)?.remove();
}

export function showModal(templates: Template[], fields: FieldMap): void {
  closeModal();

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.className = "ktc-modal-overlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  if (templates.length === 0) {
    overlay.innerHTML = emptyHtml;
    overlay.querySelector(".ktc-btn")!.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openOptions" });
    });
  } else {
    overlay.innerHTML = mainHtml;

    const select = overlay.querySelector(".ktc-select") as HTMLSelectElement;
    const preview = overlay.querySelector(".ktc-preview") as HTMLPreElement;
    const copyBtn = overlay.querySelector(".ktc-btn-submit") as HTMLButtonElement;
    const statusMsg = overlay.querySelector(".ktc-status") as HTMLSpanElement;

    templates.forEach((t, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = t.name;
      select.appendChild(opt);
    });

    let currentResolved: ResolvedMentionMap = {};
    let currentTemplate = "";

    async function updatePreview(): Promise<void> {
      currentTemplate = templates[Number(select.value)].template;
      const mentions = extractMentions(currentTemplate);
      currentResolved = await resolveMentions(mentions);
      preview.textContent = applyTemplate(
        currentTemplate,
        fields,
        currentResolved,
      );
    }

    select.addEventListener("change", () => {
      chrome.storage.local.set({ lastTemplateIndex: Number(select.value) });
      void updatePreview();
    });

    chrome.storage.local.get({ lastTemplateIndex: 0 }, (data) => {
      const idx = Math.min(data.lastTemplateIndex, templates.length - 1);
      select.value = String(idx);
      void updatePreview();
    });

    copyBtn.addEventListener("click", () => {
      const plainText = preview.textContent ?? "";
      const html = applyTemplateHtml(currentTemplate, fields, currentResolved);
      const item = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      });
      navigator.clipboard.write([item]).then(
        () => {
          statusMsg.textContent = "コピーしました!";
          statusMsg.className = "ktc-status ktc-status-success";
          setTimeout(() => {
            statusMsg.textContent = "";
          }, 2000);
        },
        () => {
          statusMsg.textContent = "コピーに失敗しました";
          statusMsg.className = "ktc-status ktc-status-error";
        },
      );
    });
  }

  document.body.appendChild(overlay);
}
