import { config } from "./config.js";

/** 最寄り1行目に含まれたら除外（心斎橋通勤向け・私鉄系） */
const PRIMARY_DENY = [
  /近鉄/,
  /阪急/,
  /阪神/,
  /南海/,
  /泉北/,
  /北大阪急行/,
  /能勢電/,
  /私鉄/,
  /モノレール/,
  /ポートライナー/,
] as const;

/** 最寄り1行目に含まれる必要がある（大阪メトロ・JR 等） */
const PRIMARY_ALLOW = [
  /地下鉄/,
  /御堂筋/,
  /千日前/,
  /長堀/,
  /堺筋/,
  /今里筋/,
  /四つ橋/,
  /谷町/,
  /中央線/,
  /ＪＲ/,
  /JR/,
  /jr/,
] as const;

export function normalizeAccessLine(line: string): string {
  return line.replace(/\s+/g, "").trim();
}

/**
 * 一覧の最寄り1行目（太字）で判定。
 * DENY 優先 → ALLOW 必須 → どちらも無ければ除外。
 */
export function passesPrimaryAccessFilter(primaryLine: string | undefined): boolean {
  if (!config.accessFilterEnabled) return true;

  const line = normalizeAccessLine(primaryLine ?? "");
  if (!line) return false;

  for (const re of PRIMARY_DENY) {
    if (re.test(line)) return false;
  }
  for (const re of PRIMARY_ALLOW) {
    if (re.test(line)) return true;
  }
  return false;
}
