/**
 * picker.ts
 * フィールド/メンション挿入ピッカー（popup・options 共通）
 */

// ── ピッカー要素 ──

const pickerOverlay = document.getElementById("picker-overlay")!;
const pickerTitle = pickerOverlay.querySelector(".picker-title")!;
const pickerSearch = pickerOverlay.querySelector(
  ".picker-search",
) as HTMLInputElement;
const pickerList = pickerOverlay.querySelector(".picker-list")!;
const pickerStatus = pickerOverlay.querySelector(".picker-status")!;
const pickerCloseBtn = pickerOverlay.querySelector(".picker-close-btn")!;

let activeTextarea: HTMLTextAreaElement | null = null;
let debounceSearchTimer: ReturnType<typeof setTimeout>;
let pickerMode: "field" | "mention" = "mention";

function closePicker(): void {
  pickerOverlay.hidden = true;
  pickerList.innerHTML = "";
  pickerSearch.value = "";
  pickerStatus.textContent = "";
  activeTextarea = null;
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = before + text + after;
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

let allFields: Array<{ code: string; label: string }> = [];

function renderFieldList(query: string): void {
  pickerList.innerHTML = "";
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allFields.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.code.toLowerCase().includes(q),
      )
    : allFields;

  if (filtered.length === 0) {
    pickerStatus.textContent = "該当するフィールドが見つかりません";
    return;
  }
  pickerStatus.textContent = "";
  for (const f of filtered) {
    const item = document.createElement("div");
    item.className = "picker-list-item";
    item.textContent = f.label;
    if (f.label !== f.code) {
      const sub = document.createElement("span");
      sub.className = "picker-item-sub";
      sub.textContent = `(${f.code})`;
      item.appendChild(sub);
    }
    item.addEventListener("click", () => {
      if (activeTextarea) {
        insertAtCursor(activeTextarea, `{{${f.label}}}`);
      }
      closePicker();
    });
    pickerList.appendChild(item);
  }
}

export function openFieldPicker(textarea: HTMLTextAreaElement): void {
  activeTextarea = textarea;
  pickerMode = "field";
  pickerTitle.textContent = "フィールド挿入";
  pickerSearch.hidden = false;
  pickerSearch.value = "";
  pickerList.innerHTML = "";
  pickerStatus.textContent = "読み込み中...";
  pickerOverlay.hidden = false;
  allFields = [];

  chrome.runtime.sendMessage({ action: "getFormFieldDefs" }, (resp) => {
    if (resp?.error) {
      pickerStatus.textContent = resp.error;
      return;
    }
    allFields = resp?.fields ?? [];
    if (allFields.length === 0) {
      pickerStatus.textContent = "フィールドが見つかりません";
      return;
    }
    renderFieldList("");
    pickerSearch.focus();
  });
}

export function openMentionPicker(textarea: HTMLTextAreaElement): void {
  activeTextarea = textarea;
  pickerMode = "mention";
  pickerTitle.textContent = "メンション挿入";
  pickerSearch.hidden = false;
  pickerSearch.value = "";
  pickerList.innerHTML = "";
  pickerStatus.textContent = "名前を入力して検索...";
  pickerOverlay.hidden = false;
  pickerSearch.focus();
}

function doMentionSearch(term: string): void {
  if (!term.trim()) {
    pickerList.innerHTML = "";
    pickerStatus.textContent = "名前を入力して検索...";
    return;
  }
  pickerStatus.textContent = "検索中...";
  pickerList.innerHTML = "";

  chrome.runtime.sendMessage(
    { action: "searchDirectory", term },
    (resp) => {
      if (resp?.error) {
        pickerStatus.textContent = resp.error;
        return;
      }
      const results: Array<{ type: string; code: string; name: string }> =
        resp?.results ?? [];
      if (results.length === 0) {
        pickerStatus.textContent = "該当する結果が見つかりません";
        return;
      }
      pickerStatus.textContent = "";
      const icons: Record<string, string> = {
        user: "\u{1F464}",
        org: "\u{1F3E2}",
        group: "\u{1F465}",
      };
      for (const r of results) {
        const item = document.createElement("div");
        item.className = "picker-list-item";
        const icon = icons[r.type] ?? "";
        item.textContent = `${icon} ${r.name}`;
        const sub = document.createElement("span");
        sub.className = "picker-item-sub";
        sub.textContent = `(${r.code})`;
        item.appendChild(sub);
        item.addEventListener("click", () => {
          if (activeTextarea) {
            const prefix =
              r.type === "org"
                ? "org/"
                : r.type === "group"
                  ? "group/"
                  : "";
            insertAtCursor(activeTextarea, `{{@${prefix}${r.code}}}`);
          }
          closePicker();
        });
        pickerList.appendChild(item);
      }
    },
  );
}

// ── イベントリスナー ──

pickerCloseBtn.addEventListener("click", closePicker);
pickerOverlay.addEventListener("click", (e) => {
  if (e.target === pickerOverlay) closePicker();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !pickerOverlay.hidden) closePicker();
});
pickerSearch.addEventListener("input", () => {
  clearTimeout(debounceSearchTimer);
  if (pickerMode === "field") {
    renderFieldList(pickerSearch.value);
  } else {
    debounceSearchTimer = setTimeout(() => {
      doMentionSearch(pickerSearch.value);
    }, 300);
  }
});
