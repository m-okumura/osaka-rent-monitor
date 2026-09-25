import { passesPrimaryAccessFilter } from "./access-filter.js";
import { applyBuildingStructureConsensus } from "./building-structure.js";
import { commuteHintToShinsaibashi } from "./commute-hints.js";
import { hardDetailRejectReasons } from "./report/detail-reject-reasons.js";
import type { ComparisonReportEntry } from "./report/build-comparison-report.js";
import { fetchSuumoHtml } from "./suumo-client.js";
import { parseSuumoDetailHtml } from "./parse-detail.js";
import { scoreListing, sortByScore } from "./score.js";
import type { Listing, ScoredListing } from "./types.js";

const DETAIL_GAP_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toReportEntry(
  listing: ScoredListing,
  bucket: ComparisonReportEntry["reportBucket"],
  reasons: string[],
): ComparisonReportEntry {
  return { ...listing, reportBucket: bucket, reportReasons: reasons };
}

export type EnrichBatchResult = {
  forNotification: ScoredListing[];
  forReport: ComparisonReportEntry[];
};

/** 詳細 GET（1.5秒間隔）→ スコア → 通知用と比較レポート用に分割 */
export async function enrichAndScoreListings(
  listings: Listing[],
): Promise<EnrichBatchResult> {
  const scored: ScoredListing[] = [];
  const accessOnly: ComparisonReportEntry[] = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]!;
    if (i > 0) await sleep(DETAIL_GAP_MS);

    try {
      const html = await fetchSuumoHtml(listing.detailUrl);
      const detail = parseSuumoDetailHtml(html);
      const primary =
        detail.stationAccess[0] ?? listing.accessSummary;
      if (!passesPrimaryAccessFilter(primary)) {
        console.log(
          `  詳細で最寄り除外: ${detail.propertyName || listing.buildingTitle} (${primary})`,
        );
        accessOnly.push(
          toReportEntry(
            scoreListing(listing, detail),
            "passed_over",
            ["最寄り1行目フィルタ（私鉄等）"],
          ),
        );
        continue;
      }
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

  const withBuilding = applyBuildingStructureConsensus(scored);
  const withCommute = withBuilding.map((l) => ({
    ...l,
    commuteHintShinsaibashi: commuteHintToShinsaibashi(
      l.detail?.stationAccess?.length
        ? l.detail.stationAccess
        : [l.accessSummary],
    ),
  }));

  const forNotification: ScoredListing[] = [];
  const forReport: ComparisonReportEntry[] = [...accessOnly];

  for (const listing of withCommute) {
    const rejectReasons = hardDetailRejectReasons(listing);
    if (rejectReasons.length === 0) {
      forNotification.push(listing);
      forReport.push(toReportEntry(listing, "notify", []));
    } else {
      forReport.push(toReportEntry(listing, "passed_over", rejectReasons));
    }
  }

  return {
    forNotification: sortByScore(forNotification),
    forReport: forReport.sort(
      (a, b) =>
        (a.reportBucket === "notify" ? 0 : 1) -
          (b.reportBucket === "notify" ? 0 : 1) ||
        b.score - a.score,
    ),
  };
}
