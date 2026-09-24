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
  structureRaw: string | null;
  stationAccess: string[];
  soundKeywords: string[];
  isLeoPalace: boolean;
  cancellationClass: string;
  cancellationMailLabel: string;
  contractTerm: string | null;
  cancellationHints: string[];
  score: number;
  tier: string;
  scoreReasons: string[];
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
    structureRaw: l.detail?.structureRaw ?? null,
    stationAccess: l.detail?.stationAccess.length
      ? l.detail.stationAccess
      : [l.accessSummary].filter(Boolean),
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
    detailUrl: l.detailUrl,
    detailFetchError: l.detailFetchError,
  }));
}
