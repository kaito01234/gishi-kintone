import type { FieldMap, MentionRef, MentionType, ResolvedMentionMap } from "../types";

export function extractMentions(template: string): MentionRef[] {
  const mentions: MentionRef[] = [];
  const regex = /\{\{@(?:(org|group)\/)?(.+?)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(template)) !== null) {
    mentions.push({
      type: (m[1] as MentionType) ?? "user",
      code: m[2].trim(),
    });
  }
  return mentions;
}

function parseMentionToken(
  trimmed: string,
): { type: MentionType; code: string } | null {
  if (!trimmed.startsWith("@")) return null;
  const rest = trimmed.slice(1);
  if (rest.startsWith("org/")) return { type: "org", code: rest.slice(4) };
  if (rest.startsWith("group/")) return { type: "group", code: rest.slice(6) };
  return { type: "user", code: rest };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyTemplate(
  template: string,
  fields: FieldMap,
  resolved: ResolvedMentionMap,
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (match, content: string) => {
    const trimmed = content.trim();
    const mention = parseMentionToken(trimmed);
    if (mention) {
      const entity = resolved[`${mention.type}:${mention.code}`];
      return entity ? `@${entity.name}` : match;
    }
    return fields[trimmed] ?? match;
  });
}

export function applyTemplateHtml(
  template: string,
  fields: FieldMap,
  resolved: ResolvedMentionMap,
): string {
  // 新エディタ(CKEditor)のメンション形式。旧エディタ(ocean-ui)も貼り付け時に
  // この形式を自前のメンションに変換する。どちらも先頭に "@" を付けて表示するため、
  // 本文には名前だけを入れる
  const body = template.replace(
    /\{\{(.+?)\}\}/g,
    (match, content: string) => {
      const trimmed = content.trim();
      const mention = parseMentionToken(trimmed);
      if (mention) {
        const entity = resolved[`${mention.type}:${mention.code}`];
        if (!entity) return escapeHtml(match);
        const attr =
          mention.type === "user"
            ? "mention-id"
            : mention.type === "org"
              ? "org-mention-id"
              : "group-mention-id";
        return `<button class="editor-mention" type="button" data-mention-code="${escapeHtml(entity.code)}" data-${attr}="${entity.id}">${escapeHtml(entity.name)}</button>`;
      }
      const value = fields[trimmed];
      return value !== undefined ? escapeHtml(value) : escapeHtml(match);
    },
  );

  return body.replace(/\n/g, "<br>");
}
