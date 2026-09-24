export type MonitorState = {
  version: 1;
  updatedAt: string;
  listingIds: string[];
};

/** 通知・state 用（SUUMO 1 部屋） */
export type StructureKind = "rc" | "steel" | "light_steel" | "other" | "unknown";

export type ListingDetail = {
  propertyName: string;
  structureRaw: string | null;
  structureKind: StructureKind;
  areaSqm: number | null;
  stationAccess: string[];
  equipmentTags: string[];
  appealTexts: string[];
  soundKeywords: string[];
  isLeoPalace: boolean;
  cancellationReview: boolean;
};

export type Listing = {
  id: string;
  searchArea: string;
  buildingTitle: string;
  buildingKind: string;
  address: string;
  accessSummary: string;
  floor: string;
  rentYen: number;
  adminYen: number | null;
  totalYen: number;
  madori: string;
  areaText: string;
  detailUrl: string;
};

export type ScoredListing = Listing & {
  detail?: ListingDetail;
  detailFetchError?: string;
  score: number;
  tier: "recommended" | "neutral" | "caution" | "exclude";
  scoreReasons: string[];
};

export type AreaFetchSummary = {
  searchArea: string;
  siteTotal: number | null;
  parsedRows: number;
};
