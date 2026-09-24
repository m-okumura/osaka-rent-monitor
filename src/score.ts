import { config } from "./config.js";
import type { ParsedDetail } from "./parse-detail.js";
import type { Listing, ScoredListing, StructureKind } from "./types.js";

export function parseWalkMinutes(accessLine: string): number | null {
  const m = accessLine.match(/歩(\d+)分/);
  if (!m) return null;
  return parseInt(m[1]!, 10);
}

export function parseAreaFromListText(areaText: string): number | null {
  const m = areaText.replace(/,/g, "").match(/([\d.]+)\s*m/i);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

export function structureScoreDelta(kind: StructureKind): number {
  switch (kind) {
    case "rc":
      return 25;
    case "steel":
      return -15;
    case "light_steel":
      return -10;
    default:
      return 0;
  }
}

export function applyStructureTierCap(
  tier: ScoredListing["tier"],
  kind: StructureKind,
): ScoredListing["tier"] {
  if (kind === "steel" || kind === "light_steel") {
    return tier === "recommended" ? "neutral" : tier;
  }
  return tier;
}

export function structureLabel(kind: StructureKind): string {
  switch (kind) {
    case "rc":
      return "RC（鉄筋コン）";
    case "steel":
      return "鉄骨造";
    case "light_steel":
      return "軽量鉄骨";
    case "other":
      return "その他";
    default:
      return "不明";
  }
}

export function scoreListing(
  listing: Listing,
  detail: ParsedDetail | undefined,
  detailFetchError?: string,
): ScoredListing {
  const reasons: string[] = [];
  let score = 50;

  const areaSqm =
    detail?.areaSqm ?? parseAreaFromListText(listing.areaText) ?? null;
  const access = detail?.stationAccess[0] ?? listing.accessSummary;
  const walkMin = access ? parseWalkMinutes(access) : null;

  if (detailFetchError) {
    reasons.push(`詳細取得失敗: ${detailFetchError}`);
    score -= 5;
  }

  if (detail?.isLeoPalace) {
    return {
      ...listing,
      detail,
      detailFetchError,
      score: 0,
      tier: "exclude",
      scoreReasons: ["レオパレス系は防音・広さ要件から除外"],
    };
  }

  const kind = detail?.structureKind ?? "unknown";
  const structDelta = structureScoreDelta(kind);
  if (structDelta !== 0) {
    score += structDelta;
    if (kind === "rc") reasons.push("RC造 (+25)");
    else if (kind === "steel") reasons.push("鉄骨造は防音面で慎重 (-15)");
    else if (kind === "light_steel") reasons.push("軽量鉄骨 (-10)");
  } else if (kind === "unknown") {
    reasons.push("構造不明（詳細要確認）");
  }

  if (areaSqm != null) {
    if (areaSqm >= 25) {
      score += 15;
      reasons.push(`広め ${areaSqm}㎡ (+15)`);
    } else if (areaSqm >= 22) {
      score += 10;
      reasons.push(`${areaSqm}㎡ (+10)`);
    } else if (areaSqm >= 20) {
      score += 5;
      reasons.push(`${areaSqm}㎡ (+5)`);
    } else if (areaSqm < 18) {
      score -= 20;
      reasons.push(`狭い ${areaSqm}㎡ (-20)`);
    } else {
      score -= 10;
      reasons.push(`やや狭い ${areaSqm}㎡ (-10)`);
    }
  }

  if (walkMin != null) {
    if (walkMin <= 5) {
      score += 10;
      reasons.push(`駅徒歩${walkMin}分 (+10)`);
    } else if (walkMin <= 10) {
      score += 5;
      reasons.push(`駅徒歩${walkMin}分 (+5)`);
    }
  }

  const sound = detail?.soundKeywords ?? [];
  if (sound.length > 0) {
    const bonus = Math.min(15, sound.length * 5);
    score += bonus;
    reasons.push(`防音関連キーワード: ${sound.join("、")} (+${bonus})`);
  }

  if (listing.totalYen <= config.rentMaxTotal - 5000) {
    score += 3;
    reasons.push("家賃込みが予算内で余裕 (+3)");
  }

  let tier: ScoredListing["tier"] = "neutral";
  if (score >= 75) tier = "recommended";
  else if (score < 45) tier = "caution";
  tier = applyStructureTierCap(tier, kind);

  if (detail) {
    reasons.unshift(
      `構造: ${structureLabel(kind)}${detail.structureRaw ? `（${detail.structureRaw}）` : ""}`,
    );
  }

  return {
    ...listing,
    detail,
    detailFetchError,
    score,
    tier,
    scoreReasons: reasons,
  };
}

export function sortByScore(listings: ScoredListing[]): ScoredListing[] {
  return [...listings].sort((a, b) => b.score - a.score || a.totalYen - b.totalYen);
}
