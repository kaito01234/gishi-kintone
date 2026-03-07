import type { FieldMap, MentionRef, MentionType, ResolvedMentionMap } from "../types";

const BRIDGE_TIMEOUT = 5000;

export function getFieldValues(): Promise<FieldMap> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type !== "gishi-kintone-response") return;
      window.removeEventListener("message", handler);
      clearTimeout(timer);
      resolve((e.data.fields as FieldMap) ?? {});
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "gishi-kintone-request" }, location.origin);

    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({});
    }, BRIDGE_TIMEOUT);
  });
}

export function getFormFieldDefs(): Promise<
  Array<{ code: string; label: string }>
> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type !== "gishi-kintone-field-defs-response") return;
      window.removeEventListener("message", handler);
      clearTimeout(timer);
      resolve(
        (e.data.fields as Array<{ code: string; label: string }>) ?? [],
      );
    };
    window.addEventListener("message", handler);
    window.postMessage(
      { type: "gishi-kintone-get-field-defs" },
      location.origin,
    );
    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve([]);
    }, BRIDGE_TIMEOUT);
  });
}

export function searchDirectory(
  term: string,
): Promise<Array<{ type: MentionType; code: string; name: string }>> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type !== "gishi-kintone-directory-search-response") return;
      window.removeEventListener("message", handler);
      clearTimeout(timer);
      resolve(
        (e.data.results as Array<{
          type: MentionType;
          code: string;
          name: string;
        }>) ?? [],
      );
    };
    window.addEventListener("message", handler);
    window.postMessage(
      { type: "gishi-kintone-directory-search", term },
      location.origin,
    );
    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve([]);
    }, BRIDGE_TIMEOUT);
  });
}

export function resolveMentions(
  mentions: MentionRef[],
): Promise<ResolvedMentionMap> {
  if (mentions.length === 0) return Promise.resolve({});
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type !== "gishi-kintone-mentions-resolved") return;
      window.removeEventListener("message", handler);
      clearTimeout(timer);
      resolve((e.data.resolved as ResolvedMentionMap) ?? {});
    };
    window.addEventListener("message", handler);
    window.postMessage(
      { type: "gishi-kintone-resolve-mentions", mentions },
      location.origin,
    );
    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({});
    }, BRIDGE_TIMEOUT);
  });
}
