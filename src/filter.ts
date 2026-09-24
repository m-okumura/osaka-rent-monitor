import { passesPrimaryAccessFilter } from "./access-filter.js";
import { config } from "./config.js";
import {
  areaSqmFromListing,
  isAllowedMadori,
} from "./listing-requirements.js";
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

function passesCoreFilters(l: Listing): boolean {
  if (!isAllowedMadori(l.madori)) return false;
  if (l.totalYen > config.rentMaxTotal) return false;
  if (!l.buildingKind.includes("マンション")) return false;
  const area = areaSqmFromListing(l.areaText);
  if (area != null && area < config.minAreaSqm) return false;
  return true;
}

/** 家賃・間取り・マンション（アクセス判定前） */
export function applyCoreFilters(listings: Listing[]): Listing[] {
  return listings.filter(passesCoreFilters);
}

/** MVP + 最寄り1行目（私鉄除外） */
export function applyMvpFilters(listings: Listing[]): Listing[] {
  return applyCoreFilters(listings).filter((l) =>
    passesPrimaryAccessFilter(l.accessSummary),
  );
}

export function countAccessFilteredOut(mapped: Listing[]): number {
  if (!config.accessFilterEnabled) return 0;
  return applyCoreFilters(mapped).filter(
    (l) => !passesPrimaryAccessFilter(l.accessSummary),
  ).length;
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

