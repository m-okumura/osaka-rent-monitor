import { fetchSuumoHtml } from "./suumo-client.js";
import { parseSuumoDetailHtml } from "./parse-detail.js";
import { scoreListing, sortByScore } from "./score.js";
import type { Listing, ScoredListing } from "./types.js";

const DETAIL_GAP_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 通知対象のみ詳細 GET（1.5秒間隔）→ スコア付与 */
export async function enrichAndScoreListings(
  listings: Listing[],
): Promise<ScoredListing[]> {
  const scored: ScoredListing[] = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]!;
    if (i > 0) await sleep(DETAIL_GAP_MS);

    try {
      const html = await fetchSuumoHtml(listing.detailUrl);
      const detail = parseSuumoDetailHtml(html);
      scored.push(scoreListing(listing, detail));
      console.log(
        `  詳細: ${detail.propertyName || listing.buildingTitle} score=${scored.at(-1)!.score}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`  詳細スキップ (${listing.id}): ${msg}`);
      scored.push(scoreListing(listing, undefined, msg));
    }
  }

  return sortByScore(scored);
}
