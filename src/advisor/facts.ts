import type { ScoredListing } from "../types.js";

/** LLM に渡す事実のみ（推測禁止用） */
export type AdvisorFact = {
  id: string;
  propertyName: string;
  searchArea: string;
  totalYen: number;
  rentYen: number;
  adminYen: number | null;
  madori: string;
  areaSqm: number | null;
  floor: string;
  structureKind: string;
  structureEffective: string;
  structureTrust: string;
  structureConflict: boolean;
  structureRaw: string | null;
  stationAccess: string[];
  commuteHintShinsaibashi: string | null;
  soundKeywords: string[];
  isLeoPalace: boolean;
  cancellationClass: string;
  cancellationMailLabel: string;
  contractTerm: string | null;
  cancellationHints: string[];
  score: number;
  tier: string;
  scoreReasons: string[];
  equipmentTags: string[];
  appealTexts: string[];
  detailUrl: string;
  detailFetchError?: string;
};

export function toAdvisorFacts(listings: ScoredListing[]): AdvisorFact[] {
  return listings.map((l) => ({
    id: l.id,
    propertyName: l.detail?.propertyName || l.buildingTitle,
    searchArea: l.searchArea,
    totalYen: l.totalYen,
    rentYen: l.rentYen,
    adminYen: l.adminYen,
    madori: l.madori,
    areaSqm: l.detail?.areaSqm ?? null,
    floor: l.floor,
    structureKind: l.detail?.structureKind ?? "unknown",
    structureEffective: l.structureEffective ?? l.detail?.structureKind ?? "unknown",
    structureTrust: l.structureTrust ?? "listing_only",
    structureConflict: l.structureConflict ?? false,
    structureRaw: l.detail?.structureRaw ?? null,
    stationAccess: l.detail?.stationAccess.length
      ? l.detail.stationAccess
      : [l.accessSummary].filter(Boolean),
    commuteHintShinsaibashi: l.commuteHintShinsaibashi ?? null,
    soundKeywords: l.detail?.soundKeywords ?? [],
    isLeoPalace: l.detail?.isLeoPalace ?? false,
    cancellationClass: l.detail?.cancellationClass ?? "not_listed",
    cancellationMailLabel:
      l.detail?.cancellationMailLabel ?? "解約条件:SUUMO概要に記載なし",
    contractTerm: l.detail?.contractTerm ?? null,
    cancellationHints: l.detail?.cancellationHints ?? [],
    score: l.score,
    tier: l.tier,
    scoreReasons: l.scoreReasons,
    equipmentTags: l.detail?.equipmentTags ?? [],
    appealTexts: (l.detail?.appealTexts ?? []).slice(0, 6),
    detailUrl: l.detailUrl,
    detailFetchError: l.detailFetchError,
  }));
}
