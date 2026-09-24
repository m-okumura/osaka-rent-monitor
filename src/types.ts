export type MonitorState = {
  version: 1;
  updatedAt: string;
  listingIds: string[];
};

/** 通知・state 用（SUUMO 1 部屋） */
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

export type AreaFetchSummary = {
  searchArea: string;
  siteTotal: number | null;
  parsedRows: number;
};
