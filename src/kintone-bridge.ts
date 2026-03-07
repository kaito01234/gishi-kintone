/**
 * kintone-bridge.ts
 * MAIN world で動作: kintone JS API にアクセスし、ISOLATED world と postMessage で通信
 */
import type {
  FieldMap,
  MentionType,
  ResolvedEntity,
  ResolvedMentionMap,
} from "./types";

declare const kintone: {
  app: {
    getId(): number;
    record: {
      get(): { record: Record<string, { type: string; value: unknown }> } | null;
    };
  };
  api(
    url: string,
    method: string,
    params: Record<string, unknown>,
  ): Promise<{ properties: Record<string, { label: string }> }>;
  getRequestToken?(): string;
};

// ── キャッシュ ──

const formFieldsCache: Record<number, Record<string, { label: string }>> = {};
const mentionCache: Record<string, ResolvedEntity> = {};

// ── ユーティリティ ──

function getApiBasePath(): string {
  const m = location.pathname.match(/\/k\/guest\/(\d+)\//);
  return m ? `/k/guest/${m[1]}/api` : "/k/api";
}

function getRestApiBasePath(): string {
  const m = location.pathname.match(/\/k\/guest\/(\d+)\//);
  return m ? `/k/guest/${m[1]}/v1` : "/k/v1";
}

function getRequestToken(): string {
  if (typeof kintone !== "undefined" && kintone.getRequestToken) {
    return kintone.getRequestToken();
  }
  return "";
}

async function getFormFields(
  appId: number,
): Promise<Record<string, { label: string }>> {
  if (formFieldsCache[appId]) return formFieldsCache[appId];
  const apiUrl = `${getRestApiBasePath()}/app/form/fields.json`;
  const resp = await kintone.api(apiUrl, "GET", { app: appId });
  formFieldsCache[appId] = resp.properties;
  return resp.properties;
}

function formatValue(field: { type: string; value: unknown }): string {
  if (field.value === null || field.value === undefined) return "";
  if (Array.isArray(field.value)) {
    return field.value
      .map((v: unknown) =>
        typeof v === "object" && v !== null
          ? (v as Record<string, string>).name ||
            (v as Record<string, string>).code ||
            ""
          : String(v),
      )
      .join(", ");
  }
  return String(field.value);
}

// ── メンション解決 ──

interface DirectoryEntity {
  id: string;
  code: string;
  name: string;
}

interface DirectorySearchResult {
  result?: {
    users?: DirectoryEntity[];
    orgs?: DirectoryEntity[];
    groups?: DirectoryEntity[];
  };
}

async function resolveDirectoryEntity(
  type: MentionType,
  code: string,
): Promise<ResolvedEntity | null> {
  const key = `${type}:${code}`;
  if (mentionCache[key]) return mentionCache[key];

  const resp = await fetch(`${getApiBasePath()}/directory/search.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Cybozu-RequestToken": getRequestToken(),
    },
    body: JSON.stringify({
      term: code,
      appId: null,
      recordId: null,
      spaceId: null,
    }),
  });

  if (!resp.ok) {
    console.error(
      `[gishi-kintone] directory search failed: ${resp.status} ${resp.statusText}`,
    );
    return null;
  }

  const data: DirectorySearchResult = await resp.json();
  const pool =
    type === "org"
      ? data.result?.orgs
      : type === "group"
        ? data.result?.groups
        : data.result?.users;

  const entity = pool?.find((e) => e.code === code) ?? null;
  if (entity) {
    mentionCache[key] = {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      type,
    };
  }
  return mentionCache[key] ?? null;
}

// ── メッセージハンドラ ──

window.addEventListener("message", async (e: MessageEvent) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type !== "gishi-kintone-resolve-mentions") return;

  const mentions: { type: MentionType; code: string }[] =
    e.data.mentions ?? [];
  const resolved: ResolvedMentionMap = {};
  const seen = new Set<string>();

  for (const m of mentions) {
    const key = `${m.type}:${m.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const entity = await resolveDirectoryEntity(m.type, m.code);
      if (entity) resolved[key] = entity;
    } catch (err) {
      console.error(`[gishi-kintone] mention resolve error for ${key}:`, err);
    }
  }

  window.postMessage(
    { type: "gishi-kintone-mentions-resolved", resolved },
    location.origin,
  );
});

// ── フォームフィールド定義ハンドラ ──

window.addEventListener("message", async (e: MessageEvent) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type !== "gishi-kintone-get-field-defs") return;

  try {
    if (typeof kintone === "undefined" || !kintone.app?.getId) {
      window.postMessage(
        { type: "gishi-kintone-field-defs-response", fields: [], error: "kintone API not available" },
        location.origin,
      );
      return;
    }
    const appId = kintone.app.getId();
    const properties = await getFormFields(appId);
    const fields = Object.entries(properties).map(([code, def]) => ({
      code,
      label: def.label,
    }));
    window.postMessage(
      { type: "gishi-kintone-field-defs-response", fields },
      location.origin,
    );
  } catch (err) {
    window.postMessage(
      { type: "gishi-kintone-field-defs-response", fields: [], error: String(err) },
      location.origin,
    );
  }
});

// ── ディレクトリ検索ハンドラ ──

window.addEventListener("message", async (e: MessageEvent) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type !== "gishi-kintone-directory-search") return;

  const term: string = e.data.term ?? "";
  try {
    const resp = await fetch(`${getApiBasePath()}/directory/search.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Cybozu-RequestToken": getRequestToken(),
      },
      body: JSON.stringify({ term, appId: null, recordId: null, spaceId: null }),
    });
    if (!resp.ok) {
      window.postMessage(
        { type: "gishi-kintone-directory-search-response", results: [], error: `${resp.status}` },
        location.origin,
      );
      return;
    }
    const data: DirectorySearchResult = await resp.json();
    const results: Array<{ type: string; code: string; name: string }> = [];
    for (const u of data.result?.users ?? []) results.push({ type: "user", code: u.code, name: u.name });
    for (const o of data.result?.orgs ?? []) results.push({ type: "org", code: o.code, name: o.name });
    for (const g of data.result?.groups ?? []) results.push({ type: "group", code: g.code, name: g.name });
    window.postMessage(
      { type: "gishi-kintone-directory-search-response", results },
      location.origin,
    );
  } catch (err) {
    window.postMessage(
      { type: "gishi-kintone-directory-search-response", results: [], error: String(err) },
      location.origin,
    );
  }
});

// ── レコードフィールド値ハンドラ ──

window.addEventListener("message", async (e: MessageEvent) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type !== "gishi-kintone-request") return;

  try {
    if (typeof kintone === "undefined" || !kintone.app?.record) {
      window.postMessage(
        {
          type: "gishi-kintone-response",
          fields: {},
          error: "kintone API not available",
        },
        location.origin,
      );
      return;
    }

    const recordData = kintone.app.record.get();
    if (!recordData?.record) {
      window.postMessage(
        {
          type: "gishi-kintone-response",
          fields: {},
          error: "No record data",
        },
        location.origin,
      );
      return;
    }

    const appId = kintone.app.getId();
    const record = recordData.record;
    const fields: FieldMap = {};

    for (const [code, field] of Object.entries(record)) {
      fields[code] = formatValue(field);
    }

    try {
      const properties = await getFormFields(appId);
      for (const [code, def] of Object.entries(properties)) {
        if (record[code] && def.label && def.label !== code) {
          fields[def.label] = formatValue(record[code]);
        }
      }
    } catch {
      // フォームフィールド取得に失敗してもレコード値は返す
    }

    fields["アプリID"] = String(appId);

    window.postMessage({ type: "gishi-kintone-response", fields }, location.origin);
  } catch (err) {
    window.postMessage(
      {
        type: "gishi-kintone-response",
        fields: {},
        error: err instanceof Error ? err.message : String(err),
      },
      location.origin,
    );
  }
});
