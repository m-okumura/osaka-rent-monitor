import { parseAreaFromListText } from "../score.js";
import type { ScoredListing } from "../types.js";
import { buildingGroupKey } from "./comparison-sanitize.js";
import type { SanitizedComparisonEntry } from "./comparison-sanitize.js";
import { listingDisplayName } from "./build-comparison-report-shared.js";

export type BuildingCardGroup = {
  key: string;
  displayName: string;
  listings: SanitizedComparisonEntry[];
  /** スコア最高（同点なら家賃安） */
  representative: SanitizedComparisonEntry;
  /** 家賃込最安 */
  cheapest: SanitizedComparisonEntry;
  maxScore: number;
};

function pickRepresentative(
  group: SanitizedComparisonEntry[],
): SanitizedComparisonEntry {
  return [...group].sort(
    (a, b) => b.score - a.score || a.totalYen - b.totalYen,
  )[0]!;
}

function pickCheapest(group: SanitizedComparisonEntry[]): SanitizedComparisonEntry {
  return [...group].sort(
    (a, b) => a.totalYen - b.totalYen || b.score - a.score,
  )[0]!;
}

export function groupListingsByBuilding(
  listings: SanitizedComparisonEntry[],
): BuildingCardGroup[] {
  const map = new Map<string, SanitizedComparisonEntry[]>();
  for (const l of listings) {
    const key = buildingGroupKey(l);
    const arr = map.get(key) ?? [];
    arr.push(l);
    map.set(key, arr);
  }

  const groups: BuildingCardGroup[] = [];
  for (const [key, items] of map) {
    const representative = pickRepresentative(items);
    const cheapest = pickCheapest(items);
    groups.push({
      key,
      displayName: listingDisplayName(representative),
      listings: items.sort((a, b) => b.score - a.score),
      representative,
      cheapest,
      maxScore: Math.max(...items.map((i) => i.score)),
    });
  }

  return groups.sort(
    (a, b) => b.maxScore - a.maxScore || a.cheapest.totalYen - b.cheapest.totalYen,
  );
}

function floorSortKey(floor: string): number | null {
  const m = floor.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : null;
}

export function formatFloorRange(listings: ScoredListing[]): string {
  const floors = listings
    .map((l) => l.floor.trim())
    .filter((f) => f && f !== "—" && f !== "-");
  if (floors.length === 0) return "階不明";
  const nums = floors
    .map(floorSortKey)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  if (nums.length >= 2 && nums[0] !== nums[nums.length - 1]) {
    return `${nums[0]}〜${nums.at(-1)}階`;
  }
  if (nums.length === 1) return `${nums[0]}階`;
  return [...new Set(floors)].slice(0, 2).join(" / ");
}

export function formatManYenRange(listings: ScoredListing[]): string {
  const totals = listings.map((l) => l.totalYen);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const fmt = (y: number) => `${(y / 10_000).toFixed(1)}万`;
  if (min === max) return fmt(min);
  return `${fmt(min)}〜${fmt(max)}`;
}

export function formatAreaRange(listings: ScoredListing[]): string {
  const areas = listings
    .map((l) => l.detail?.areaSqm ?? parseAreaFromListText(l.areaText))
    .filter((a): a is number => a != null);
  if (areas.length === 0) return "—";
  const min = Math.min(...areas);
  const max = Math.max(...areas);
  if (min === max) return `${min}㎡`;
  return `${min}〜${max}㎡`;
}
