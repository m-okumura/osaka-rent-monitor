import type { ScoredListing } from "../types.js";
import type { SanitizedComparisonEntry } from "./comparison-sanitize.js";

export function propertyColumnTitle(
  l: ScoredListing | SanitizedComparisonEntry,
): string {
  const name = l.detail?.propertyName || l.buildingTitle || l.id;
  const short = name.length > 28 ? `${name.slice(0, 28)}…` : name;
  const floor = l.floor.trim() ? ` ${l.floor}` : "";
  const merge =
    "mergeSuppressed" in l && l.mergeSuppressed && l.mergeSuppressed > 0
      ? ` +${l.mergeSuppressed}統合`
      : "";
  return `${short} (${l.madori}${floor})${merge}`;
}

export function listingDisplayName(l: ScoredListing): string {
  return l.detail?.propertyName || l.buildingTitle || l.id;
}
