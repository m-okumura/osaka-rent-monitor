import { config } from "./config.js";
import type { SuumoListing } from "./parse-listings.js";
import type { Listing } from "./types.js";

export function suumoRowToListing(
  row: SuumoListing,
  searchArea: string,
): Listing | null {
  if (row.rentYen == null || row.totalYen == null) return null;

  return {
    id: row.suumoId,
    searchArea,
    buildingTitle: row.buildingTitle,
    buildingKind: row.buildingKind,
    address: row.address,
    accessSummary: row.accessLines[0] ?? "",
    floor: row.floor,
    rentYen: row.rentYen,
    adminYen: row.adminYen,
    totalYen: row.totalYen,
    madori: row.madori,
    areaText: row.areaText,
    detailUrl: row.detailUrl,
  };
}

/** MVP: 1K・管理費込上限・賃貸マンション（/mansion/ 取得） */
export function applyMvpFilters(listings: Listing[]): Listing[] {
  return listings.filter((l) => {
    if (l.madori !== config.madori) return false;
    if (l.totalYen > config.rentMaxTotal) return false;
    if (!l.buildingKind.includes("マンション")) return false;
    return true;
  });
}

export function rowsToListings(
  rows: SuumoListing[],
  searchArea: string,
): Listing[] {
  const mapped: Listing[] = [];
  for (const row of rows) {
    const listing = suumoRowToListing(row, searchArea);
    if (listing) mapped.push(listing);
  }
  return applyMvpFilters(mapped);
}
