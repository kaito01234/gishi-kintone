/**
 * options.ts
 * 設定ページ: アプリ制限・テンプレートの管理
 */
import type { AppFilter, Template } from "./types";

const filterListEl = document.getElementById("filter-list")!;
const addFilterBtn = document.getElementById("add-filter")!;
const templateListEl = document.getElementById("template-list")!;
const addTemplateBtn = document.getElementById("add-template")!;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const saveHint = document.getElementById("save-hint")!;
const templateTmpl = document.getElementById(
  "template-item-tmpl",
) as HTMLTemplateElement;

let appFilters: AppFilter[] = [];
let templates: Template[] = [];
let dirty = false;

function markDirty(): void {
  dirty = true;
  saveBtn.disabled = false;
  saveHint.textContent = "未保存の変更があります";
}

function markClean(): void {
  dirty = false;
  saveBtn.disabled = true;
  saveHint.textContent = "";
}

function save(): void {
  chrome.storage.sync.set({ appFilters, templates }, () => {
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

// ── アプリ制限 ──

function createFilterItem(filter: AppFilter, index: number): HTMLElement {
  const item = document.createElement("div");
  item.className = "filter-item";

  const domainInput = document.createElement("input");
  domainInput.type = "text";
  domainInput.className = "filter-domain";
  domainInput.placeholder = "ドメイン (例: example.cybozu.com)";
  domainInput.value = filter.domain;
  domainInput.addEventListener("input", () => {
    appFilters[index].domain = domainInput.value.trim();
    markDirty();
  });

  const appIdInput = document.createElement("input");
  appIdInput.type = "text";
  appIdInput.className = "filter-appid";
  appIdInput.placeholder = "アプリID (例: 123)";
  appIdInput.value = filter.appId;
  appIdInput.addEventListener("input", () => {
    appFilters[index].appId = appIdInput.value.trim();
    markDirty();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger btn-sm";
  deleteBtn.textContent = "削除";
  deleteBtn.addEventListener("click", () => {
    appFilters.splice(index, 1);
    markDirty();
    renderFilterList();
  });

  item.appendChild(domainInput);
  item.appendChild(appIdInput);
  item.appendChild(deleteBtn);
  return item;
}

function renderFilterList(): void {
  filterListEl.innerHTML = "";
  appFilters.forEach((f, i) => {
    filterListEl.appendChild(createFilterItem(f, i));
  });
}

// ── テンプレート ──

function createTemplateItem(data: Template, index: number): HTMLElement {
  const fragment = templateTmpl.content.cloneNode(true) as DocumentFragment;
  const item = fragment.querySelector(".template-item") as HTMLDivElement;
  item.dataset.index = String(index);

  const nameInput = item.querySelector(".template-name") as HTMLInputElement;
  const bodyTextarea = item.querySelector(
    ".template-body",
  ) as HTMLTextAreaElement;
  const deleteBtn = item.querySelector(
    ".delete-template-btn",
  ) as HTMLButtonElement;

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
    renderTemplateList();
  });

  return item;
}

function renderTemplateList(): void {
  templateListEl.innerHTML = "";
  templates.forEach((t, i) => {
    templateListEl.appendChild(createTemplateItem(t, i));
  });

  if (templates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent = "テンプレートがありません。";
    templateListEl.appendChild(empty);
  }
}

// ── イベント ──

saveBtn.addEventListener("click", save);

addFilterBtn.addEventListener("click", () => {
  appFilters.push({ domain: "", appId: "" });
  markDirty();
  renderFilterList();
  const inputs = filterListEl.querySelectorAll<HTMLInputElement>(".filter-domain");
  inputs[inputs.length - 1]?.focus();
});

addTemplateBtn.addEventListener("click", () => {
  templates.push({ name: "", template: "" });
  markDirty();
  renderTemplateList();
  const items = templateListEl.querySelectorAll<HTMLInputElement>(".template-name");
  items[items.length - 1]?.focus();
});

// ── 初期化 ──

chrome.storage.sync.get({ appFilters: [], templates: [] }, (data) => {
  appFilters = data.appFilters as AppFilter[];
  templates = data.templates as Template[];
  renderFilterList();
  renderTemplateList();
});
