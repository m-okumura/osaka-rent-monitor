import { applyMvpFilters, countAccessFilteredOut, suumoRowToListing } from "./filter.js";
import { parseResultCount, parseSuumoListHtml } from "./parse-listings.js";
import { fetchSuumoHtml } from "./suumo-client.js";
import { SEARCH_TARGETS } from "./suumo-urls.js";
import type { AreaFetchSummary, Listing } from "./types.js";

const FETCH_GAP_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CollectResult = {
  listings: Listing[];
  summaries: AreaFetchSummary[];
};

/** 監視対象駅の固定 URL を順に取得し、ID で重複除去 */
export async function collectListings(): Promise<CollectResult> {
  const summaries: AreaFetchSummary[] = [];
  const byId = new Map<string, Listing>();

  for (let i = 0; i < SEARCH_TARGETS.length; i++) {
    const target = SEARCH_TARGETS[i]!;
    if (i > 0) await sleep(FETCH_GAP_MS);

    const html = await fetchSuumoHtml(target.listUrl);
    const siteTotal = parseResultCount(html);
    const rows = parseSuumoListHtml(html);
    const mapped: Listing[] = [];
    for (const row of rows) {
      const listing = suumoRowToListing(row, target.label);
      if (listing) mapped.push(listing);
    }
    const accessDropped = countAccessFilteredOut(mapped);
    if (accessDropped > 0) {
      console.log(
        `${target.label}: 最寄り私鉄等で除外 ${accessDropped} 件（1行目フィルタ）`,
      );
    }
    const listings = applyMvpFilters(mapped);

    summaries.push({
      searchArea: target.label,
      siteTotal,
      parsedRows: rows.length,
    });

    for (const listing of listings) {
      if (!byId.has(listing.id)) {
        byId.set(listing.id, listing);
      }
    }
  }

  const listings = [...byId.values()].sort((a, b) =>
    a.detailUrl.localeCompare(b.detailUrl),
  );

  return { listings, summaries };
}
