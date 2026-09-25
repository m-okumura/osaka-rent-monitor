import type { ScoredListing } from "../types.js";
import type { ComparisonReportEntry } from "./comparison-report-entry.js";

export function propertyColumnTitle(l: ScoredListing): string {
  const name = l.detail?.propertyName || l.buildingTitle || l.id;
  const short = name.length > 28 ? `${name.slice(0, 28)}…` : name;
  const floor = l.floor.trim() ? ` ${l.floor}` : "";
  return `${short} (${l.madori}${floor})`;
}

/** 同一詳細 URL の重複列を除く（一覧の建物名違い同一部屋対策） */
export function dedupeByDetailUrl(
  entries: ComparisonReportEntry[],
): ComparisonReportEntry[] {
  const seen = new Set<string>();
  const out: ComparisonReportEntry[] = [];
  for (const e of entries) {
    const key = e.detailUrl.split("?")[0] ?? e.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
