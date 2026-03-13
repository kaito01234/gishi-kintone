/**
 * popup.ts
 * ポップアップ: テンプレート管理（CRUD、自動保存）
 */
import type { Template } from "./types";
import { openFieldPicker, openMentionPicker } from "./picker";

// ── テンプレート管理 ──

const listEl = document.getElementById("template-list")!;
const addBtn = document.getElementById("add-template")!;
const tmpl = document.getElementById(
  "template-item-tmpl",
) as HTMLTemplateElement;

let templates: Template[] = [];
let dirty = false;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY = 1000;

let statusTimer: ReturnType<typeof setTimeout> | null = null;

function showStatus(msg: string): void {
  const els = document.querySelectorAll<HTMLSpanElement>(".auto-save-status");
  for (const el of els) {
    el.textContent = msg;
    el.classList.add("visible");
  }
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    for (const el of els) el.classList.remove("visible");
  }, 1500);
}

function scheduleAutoSave(): void {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(save, AUTO_SAVE_DELAY);
}

function markDirty(): void {
  dirty = true;
  scheduleAutoSave();
}

function save(): void {
  if (!dirty) return;
  chrome.storage.sync.set({ templates }, () => {
    dirty = false;
    showStatus("保存済み");
  });
}

function createTemplateItem(data: Template, index: number): HTMLElement {
  const fragment = tmpl.content.cloneNode(true) as DocumentFragment;
  const item = fragment.querySelector(".template-item") as HTMLDivElement;
  item.dataset.index = String(index);

  const nameInput = item.querySelector(".template-name") as HTMLInputElement;
  const bodyTextarea = item.querySelector(
    ".template-body",
  ) as HTMLTextAreaElement;
  const deleteBtn = item.querySelector(".delete-btn") as HTMLButtonElement;

  nameInput.value = data.name ?? "";
  bodyTextarea.value = data.template ?? "";

  nameInput.addEventListener("input", () => {
    templates[index].name = nameInput.value;
    markDirty();
  });

  bodyTextarea.addEventListener("input", () => {
    templates[index].template = bodyTextarea.value;
    markDirty();
  });

  deleteBtn.addEventListener("click", () => {
    templates.splice(index, 1);
    markDirty();
    save();
    renderList();
  });

  const insertFieldBtn = item.querySelector(
    ".insert-field-btn",
  ) as HTMLButtonElement;
  const insertMentionBtn = item.querySelector(
    ".insert-mention-btn",
  ) as HTMLButtonElement;

  insertFieldBtn.addEventListener("click", () => {
    openFieldPicker(bodyTextarea);
  });
  insertMentionBtn.addEventListener("click", () => {
    openMentionPicker(bodyTextarea);
  });

  return item;
}

function renderList(): void {
  listEl.innerHTML = "";
  templates.forEach((t, i) => {
    listEl.appendChild(createTemplateItem(t, i));
  });

  if (templates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent = "テンプレートがありません。";
    listEl.appendChild(empty);
  }
}

addBtn.addEventListener("click", () => {
  templates.push({ name: "", template: "" });
  markDirty();
  renderList();
  const items = listEl.querySelectorAll<HTMLInputElement>(".template-name");
  items[items.length - 1]?.focus();
});

window.addEventListener("beforeunload", () => {
  if (dirty) save();
});

chrome.storage.sync.get({ templates: null }, (data) => {
  if (data.templates === null) {
    templates = [];
    chrome.storage.sync.set({ templates });
  } else {
    templates = data.templates as Template[];
  }
  renderList();
});
