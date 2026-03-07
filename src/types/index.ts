/** chrome.storage に保存するテンプレート */
export interface Template {
  name: string;
  template: string;
}

/** 対象アプリの制限エントリ */
export interface AppFilter {
  domain: string;
  appId: string;
}

/** フィールド名/コード → 値 のマップ */
export type FieldMap = Record<string, string>;

/** メンション種別 */
export type MentionType = "user" | "org" | "group";

/** テンプレートから抽出したメンション */
export interface MentionRef {
  type: MentionType;
  code: string;
}

/** ディレクトリ検索で解決済みのメンションエンティティ */
export interface ResolvedEntity {
  id: string;
  name: string;
  code: string;
  type: MentionType;
}

/** 解決済みメンション: "type:code" → entity */
export type ResolvedMentionMap = Record<string, ResolvedEntity>;

// ── postMessage プロトコル ──

export interface FieldRequest {
  type: "gishi-kintone-request";
}

export interface FieldResponse {
  type: "gishi-kintone-response";
  fields: FieldMap;
  error?: string;
}

export interface MentionRequest {
  type: "gishi-kintone-resolve-mentions";
  mentions: MentionRef[];
}

export interface MentionResponse {
  type: "gishi-kintone-mentions-resolved";
  resolved: ResolvedMentionMap;
}

export interface FormFieldDefsRequest {
  type: "gishi-kintone-get-field-defs";
}

export interface FormFieldDefsResponse {
  type: "gishi-kintone-field-defs-response";
  fields: Array<{ code: string; label: string }>;
  error?: string;
}

export interface DirectorySearchRequest {
  type: "gishi-kintone-directory-search";
  term: string;
}

export interface DirectorySearchResponse {
  type: "gishi-kintone-directory-search-response";
  results: Array<{ type: MentionType; code: string; name: string }>;
  error?: string;
}

export type BridgeMessage =
  | FieldRequest
  | FieldResponse
  | MentionRequest
  | MentionResponse
  | FormFieldDefsRequest
  | FormFieldDefsResponse
  | DirectorySearchRequest
  | DirectorySearchResponse;
