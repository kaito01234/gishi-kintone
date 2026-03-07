/**
 * popup.ts
 * ポップアップ: テンプレート管理（CRUD、手動保存）
 */
import type { Template } from "./types";
import { openFieldPicker, openMentionPicker } from "./picker";

// ── テンプレート管理 ──

const listEl = document.getElementById("template-list")!;
const addBtn = document.getElementById("add-template")!;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const saveHint = document.getElementById("save-hint")!;
const tmpl = document.getElementById(
  "template-item-tmpl",
) as HTMLTemplateElement;

let templates: Template[] = [];
let dirty = false;

function markDirty(): void {
  dirty = true;
  saveBtn.disabled = false;
  saveHint.textContent = "未保存";
}

function markClean(): void {
  dirty = false;
  saveBtn.disabled = true;
  saveHint.textContent = "";
}

function save(): void {
  chrome.storage.sync.set({ templates }, () => {
    markClean();
    showStatus("保存しました");
  });
}

function showStatus(msg: string): void {
  let status = document.querySelector(".save-status") as HTMLDivElement | null;
  if (!status) {
    status = document.createElement("div");
    status.className = "save-status";
    document.body.appendChild(status);
  }
  status.textContent = msg;
  status.classList.add("visible");
  setTimeout(() => status!.classList.remove("visible"), 1500);
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

saveBtn.addEventListener("click", save);

addBtn.addEventListener("click", () => {
  templates.push({ name: "", template: "" });
  markDirty();
  renderList();
  const items = listEl.querySelectorAll<HTMLInputElement>(".template-name");
  items[items.length - 1]?.focus();
});

const defaultTemplates: Template[] = [
  {
    name: "サンプルテンプレート",
    template:
      "{{@org/営業部}} {{@tanaka.taro}}\n\nお疲れ様です。\n案件番号 {{レコード番号}} の件について、対応をお願いいたします。\n\n■ 会社名: {{会社名}}\n■ 担当者: {{担当者名}}\n■ ステータス: {{ステータス}}\n\n{{@group/プロジェクトA}} の皆様もご確認ください。\nよろしくお願いいたします。",
  },
];

chrome.storage.sync.get({ templates: null }, (data) => {
  if (data.templates === null) {
    templates = defaultTemplates;
    chrome.storage.sync.set({ templates });
  } else {
    templates = data.templates as Template[];
  }
  renderList();
});
