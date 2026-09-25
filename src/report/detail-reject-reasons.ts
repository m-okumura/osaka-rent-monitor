import {
  passesMinArea,
  passesRcSrcRequirement,
  passesRequiredEquipment,
} from "../listing-requirements.js";
import type { ScoredListing } from "../types.js";

export function hardDetailRejectReasons(listing: ScoredListing): string[] {
  const reasons: string[] = [];
  if (listing.tier === "exclude") {
    reasons.push("除外（レオパレス等）");
  }
  if (!listing.detail) {
    if (listing.detailFetchError) {
      reasons.push(`詳細取得失敗: ${listing.detailFetchError}`);
    } else {
      reasons.push("詳細未取得");
    }
    return reasons;
  }
  if (
    !passesMinArea(listing.areaText, listing.detail.areaSqm ?? null)
  ) {
    reasons.push("専有28㎡未満");
  }
  if (!passesRequiredEquipment(listing.detail)) {
    reasons.push("設備不足（BT別/洗面/洗濯）");
  }
  const kind =
    listing.structureEffective ?? listing.detail.structureKind ?? "unknown";
  if (!passesRcSrcRequirement(kind, listing.detail.structureRaw)) {
    reasons.push("RC/SRC以外");
  }
  return reasons;
}
