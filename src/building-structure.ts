import {
  applyStructureTierCap,
  structureLabel,
  structureScoreDelta,
} from "./score.js";
import type {
  ScoredListing,
  StructureKind,
  StructureTrust,
} from "./types.js";

export function normalizeBuildingKey(name: string): string {
  return name.normalize("NFKC").replace(/[\s　]+/g, "").toLowerCase();
}

export function buildingKeyForListing(listing: ScoredListing): string {
  const name =
    listing.detail?.propertyName?.trim() || listing.buildingTitle.trim();
  return normalizeBuildingKey(name || listing.id);
}

function listingStructureKind(listing: ScoredListing): StructureKind {
  return listing.detail?.structureKind ?? "unknown";
}

function knownKinds(kinds: StructureKind[]): StructureKind[] {
  return kinds.filter((k) => k !== "unknown");
}

/**
 * 同一建物内で表記が割れたら安全側（鉄骨系を優先、RC単独表記は信用しない）。
 */
export function resolveBuildingStructure(
  kinds: StructureKind[],
): { effective: StructureKind; conflict: boolean } {
  const known = knownKinds(kinds);
  if (known.length === 0) {
    return { effective: "unknown", conflict: false };
  }
  const unique = [...new Set(known)];
  if (unique.length === 1) {
    return { effective: unique[0]!, conflict: false };
  }

  const hasSteel = unique.some((k) => k === "steel" || k === "light_steel");
  const hasRc = unique.includes("rc");
  if (hasSteel) {
    return { effective: "steel", conflict: true };
  }
  if (hasRc) {
    return { effective: "unknown", conflict: true };
  }
  return { effective: "other", conflict: true };
}

function retierFromScore(
  score: number,
  effectiveKind: StructureKind,
): ScoredListing["tier"] {
  let tier: ScoredListing["tier"] = "neutral";
  if (score >= 75) tier = "recommended";
  else if (score < 45) tier = "caution";
  return applyStructureTierCap(tier, effectiveKind);
}

function stripStructureReasons(reasons: string[]): string[] {
  return reasons.filter(
    (r) =>
      !r.startsWith("構造:") &&
      !r.startsWith("RC造") &&
      !r.startsWith("鉄骨造") &&
      !r.startsWith("軽量鉄骨") &&
      !r.startsWith("構造不明") &&
      !r.startsWith("同一建物"),
  );
}

function applyEffectiveStructureToListing(
  listing: ScoredListing,
  effective: StructureKind,
  conflict: boolean,
  trust: StructureTrust,
  peerCount: number,
): ScoredListing {
  const listingKind = listingStructureKind(listing);
  const key = buildingKeyForListing(listing);

  let score = listing.score;
  let scoreReasons = [...listing.scoreReasons];

  if (effective !== listingKind) {
    score += structureScoreDelta(effective) - structureScoreDelta(listingKind);
    scoreReasons = stripStructureReasons(scoreReasons);
    scoreReasons.unshift(
      `同一建物(${peerCount}件)で構造表記不一致 → 安全側 ${structureLabel(effective)}（掲載: ${structureLabel(listingKind)}）`,
    );
  } else if (trust === "building_consensus" && peerCount > 1) {
    scoreReasons.unshift(
      `同一建物(${peerCount}件)で構造 ${structureLabel(effective)} を確認`,
    );
  }

  if (listing.detail) {
    scoreReasons = scoreReasons.filter((r) => !r.startsWith("構造:"));
    scoreReasons.unshift(
      `構造(掲載): ${structureLabel(listingKind)}${listing.detail.structureRaw ? `（${listing.detail.structureRaw}）` : ""}`,
    );
    if (effective !== listingKind) {
      scoreReasons.unshift(`構造(判定): ${structureLabel(effective)}`);
    }
  }

  const tier =
    listing.tier === "exclude"
      ? "exclude"
      : retierFromScore(score, effective);

  return {
    ...listing,
    buildingKey: key,
    structureEffective: effective,
    structureTrust: trust,
    structureConflict: conflict,
    score,
    tier,
    scoreReasons,
  };
}

/** バッチ内の同一建物名で構造を統一し、スコア・tier を再計算 */
export function applyBuildingStructureConsensus(
  listings: ScoredListing[],
): ScoredListing[] {
  const groups = new Map<string, ScoredListing[]>();
  for (const l of listings) {
    const key = buildingKeyForListing(l);
    const arr = groups.get(key) ?? [];
    arr.push(l);
    groups.set(key, arr);
  }

  const consensusByKey = new Map<
    string,
    { effective: StructureKind; conflict: boolean; trust: StructureTrust }
  >();

  for (const [key, group] of groups) {
    const kinds = group.map(listingStructureKind);
    const { effective, conflict } = resolveBuildingStructure(kinds);
    let trust: StructureTrust = "listing_only";
    if (group.length > 1) {
      trust = conflict ? "conflict_safe_side" : "building_consensus";
    }
    consensusByKey.set(key, { effective, conflict, trust });
  }

  return listings.map((l) => {
    const key = buildingKeyForListing(l);
    const group = groups.get(key) ?? [l];
    const meta = consensusByKey.get(key)!;
    return applyEffectiveStructureToListing(
      l,
      meta.effective,
      meta.conflict,
      meta.trust,
      group.length,
    );
  });
}
