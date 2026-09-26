export type MonitorState = {
  version: 2;
  updatedAt: string;
  listingIds: string[];
  /** 問い合わせ済み SUUMO 部屋コード（bc / 物件コード） */
  inquiredBc: string[];
};

/** 通知・state 用（SUUMO 1 部屋） */
export type StructureKind = "rc" | "steel" | "light_steel" | "other" | "unknown";

export type CancellationClass = "review" | "term_only" | "not_listed";

/** SUUMO 詳細ページ data_table の比較用スナップショット */
export type SuumoDataTableSnapshot = {
  madoriDetail: string | null;
  structure: string | null;
  floors: string | null;
  builtYm: string | null;
  energyConsumption: string | null;
  insulation: string | null;
  estimatedUtility: string | null;
  insurance: string | null;
  parking: string | null;
  moveIn: string | null;
  transactionType: string | null;
  conditions: string | null;
  shopPropertyCode: string | null;
  suumoPropertyCode: string | null;
  totalUnits: string | null;
  infoUpdatedAt: string | null;
  nextUpdateAt: string | null;
  contractTerm: string | null;
  guarantorCompany: string | null;
};

export type ListingDetail = {
  propertyName: string;
  /** 詳細 data_table / property_view の所在地（無ければ null） */
  address: string | null;
  structureRaw: string | null;
  structureKind: StructureKind;
  areaSqm: number | null;
  stationAccess: string[];
  equipmentTags: string[];
  appealTexts: string[];
  soundKeywords: string[];
  isLeoPalace: boolean;
  cancellationClass: CancellationClass;
  cancellationMailLabel: string;
  contractTerm: string | null;
  cancellationHints: string[];
  dataTable: SuumoDataTableSnapshot;
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

export type StructureTrust =
  | "listing_only"
  | "building_consensus"
  | "conflict_safe_side";

export type ScoredListing = Listing & {
  detail?: ListingDetail;
  detailFetchError?: string;
  score: number;
  tier: "recommended" | "neutral" | "caution" | "exclude";
  scoreReasons: string[];
  /** 同一建物グルーピング用（正規化済み） */
  buildingKey?: string;
  /** 掲載表記を建物内で統合した後の構造 */
  structureEffective?: StructureKind;
  structureTrust?: StructureTrust;
  structureConflict?: boolean;
  /** コード算出の心斎橋通勤目安（JSON 根拠用） */
  commuteHintShinsaibashi?: string | null;
};

export type AreaFetchSummary = {
  searchArea: string;
  siteTotal: number | null;
  parsedRows: number;
};
