import {
  normalizeListingAddressForMerge,
  resolveListingAddress,
} from "../listing-address.js";
import { parseAreaFromListText, sortByScore } from "../score.js";
import type { ScoredListing } from "../types.js";
import type { ComparisonReportEntry } from "./comparison-report-entry.js";

export type SanitizedComparisonEntry = ComparisonReportEntry & {
  /** 同一キーで統合した掲載数（表示行以外） */
  mergeSuppressed?: number;
};

export function normalizeBuildingName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[0-9０-９]+号室.*$/i, "")
    .replace(/[\d０-９]+階.*$/i, "")
    .toLowerCase();
}

function floorKey(l: ScoredListing): string {
  const f = l.floor.trim().normalize("NFKC");
  if (!f || f === "—" || f === "-") return "";
  return f;
}

function areaKey(l: ScoredListing): string {
  const sqm = l.detail?.areaSqm ?? parseAreaFromListText(l.areaText);
  if (sqm != null) return sqm.toFixed(2);
  return l.areaText.trim().normalize("NFKC") || "?";
}

/** 同一マンション単位（メールカード集約用） */
export function buildingGroupKey(l: ScoredListing): string {
  return normalizeBuildingName(
    l.detail?.propertyName || l.buildingTitle || l.id,
  );
}

/** 同一マンション×同一階（階不明なら専有面積）でまとめるキー */
export function comparisonMergeKey(l: ScoredListing): string {
  const floor = floorKey(l);
  const area = areaKey(l);
  const addr = resolveListingAddress(l);
  if (addr) {
    const normalized = normalizeListingAddressForMerge(addr);
    if (floor) return `addr:${normalized}|f:${floor}|a:${area}`;
    return `addr:${normalized}|a:${area}`;
  }
  const building = buildingGroupKey(l);
  if (floor) return `${building}|f:${floor}`;
  return `${building}|a:${area}`;
}

/** 統合後の代表行: 沿線名タイトルより物件名を優先 */
function mergeWinnerRank(l: ComparisonReportEntry): number {
  const name = l.detail?.propertyName || l.buildingTitle;
  if (/^(地下鉄|ＪＲ|JR|阪急|近鉄|南海|京阪|阪神)/.test(name.trim())) return 0;
  if (l.detail?.propertyName?.trim()) return 2;
  return 1;
}

export function dedupeByDetailUrl<T extends ComparisonReportEntry>(
  entries: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of entries) {
    const key = e.detailUrl.split("?")[0] ?? e.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function pickMergeWinner(
  group: ComparisonReportEntry[],
): SanitizedComparisonEntry {
  const sorted = [...group].sort(
    (a, b) =>
      a.totalYen - b.totalYen ||
      b.score - a.score ||
      mergeWinnerRank(b) - mergeWinnerRank(a),
  );
  const winner = sorted[0]!;
  if (group.length <= 1) return winner;
  return { ...winner, mergeSuppressed: group.length - 1 };
}

/** 詳細 URL → 建物キー の順で重複を落とし、最安値1行を残す */
export function sanitizeComparisonEntries<T extends ComparisonReportEntry>(
  entries: T[],
): SanitizedComparisonEntry[] {
  const afterUrl = dedupeByDetailUrl(entries);
  const groups = new Map<string, ComparisonReportEntry[]>();
  for (const e of afterUrl) {
    const key = comparisonMergeKey(e);
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  const merged = [...groups.values()].map(pickMergeWinner);
  return sortByScore(merged) as SanitizedComparisonEntry[];
}

export function mergeStats(before: number, after: number): {
  before: number;
  after: number;
  mergedAway: number;
} {
  return { before, after, mergedAway: Math.max(0, before - after) };
}
