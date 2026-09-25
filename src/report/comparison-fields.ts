import { resolveListingAddress } from "../listing-address.js";
import type { ScoredListing, SuumoDataTableSnapshot } from "../types.js";

export function normalizeTableCell(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t || t === "-") return null;
  return t;
}

export function extractDataTableSnapshot(
  table: Map<string, string>,
): SuumoDataTableSnapshot {
  const get = (key: string) => normalizeTableCell(table.get(key));

  return {
    madoriDetail: get("間取り詳細"),
    structure: get("構造"),
    floors: get("階建"),
    builtYm: get("築年月"),
    energyConsumption: get("エネルギー消費性能"),
    insulation: get("断熱性能"),
    estimatedUtility: get("目安光熱費"),
    insurance: get("損保"),
    parking: get("駐車場"),
    moveIn: get("入居"),
    transactionType: get("取引態様"),
    conditions: get("条件"),
    shopPropertyCode: get("取り扱い店舗物件コード"),
    suumoPropertyCode: get("SUUMO物件コード"),
    totalUnits: get("総戸数"),
    infoUpdatedAt: get("情報更新日"),
    nextUpdateAt: get("次回更新予定日"),
    contractTerm: get("契約期間"),
    guarantorCompany: get("保証会社"),
  };
}

export type ComparisonRowDef = {
  label: string;
  value: (l: ScoredListing) => string | null;
};

function dash(v: string | null | undefined, maxLen = 140): string {
  if (v == null || !v.trim()) return "—";
  const t = v.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

/** 比較表の行定義（各列は引数の ScoredListing から値を取る） */
export const COMPARISON_ROW_DEFS: ComparisonRowDef[] = [
  { label: "間取り", value: (l) => l.madori },
  {
    label: "間取り詳細",
    value: (l) => l.detail?.dataTable.madoriDetail ?? null,
  },
  {
    label: "専有面積",
    value: (l) =>
      l.detail?.areaSqm != null ? `${l.detail.areaSqm}㎡` : l.areaText,
  },
  {
    label: "家賃+管理費",
    value: (l) => `${l.totalYen.toLocaleString("ja-JP")}円`,
  },
  { label: "住所", value: (l) => resolveListingAddress(l) },
  {
    label: "最寄り",
    value: (l) => l.detail?.stationAccess[0] ?? l.accessSummary,
  },
  { label: "監視エリア", value: (l) => l.searchArea },
  {
    label: "構造",
    value: (l) =>
      l.detail?.dataTable.structure ??
      l.detail?.structureRaw ??
      null,
  },
  { label: "階建", value: (l) => l.detail?.dataTable.floors ?? null },
  { label: "築年月", value: (l) => l.detail?.dataTable.builtYm ?? null },
  {
    label: "エネルギー消費性能",
    value: (l) => l.detail?.dataTable.energyConsumption ?? null,
  },
  {
    label: "断熱性能",
    value: (l) => l.detail?.dataTable.insulation ?? null,
  },
  {
    label: "目安光熱費",
    value: (l) => l.detail?.dataTable.estimatedUtility ?? null,
  },
  { label: "損保", value: (l) => l.detail?.dataTable.insurance ?? null },
  { label: "駐車場", value: (l) => l.detail?.dataTable.parking ?? null },
  { label: "入居", value: (l) => l.detail?.dataTable.moveIn ?? null },
  {
    label: "取引態様",
    value: (l) => l.detail?.dataTable.transactionType ?? null,
  },
  { label: "条件", value: (l) => l.detail?.dataTable.conditions ?? null },
  {
    label: "取り扱い店舗物件コード",
    value: (l) => l.detail?.dataTable.shopPropertyCode ?? null,
  },
  {
    label: "SUUMO物件コード",
    value: (l) => l.detail?.dataTable.suumoPropertyCode ?? l.id,
  },
  { label: "総戸数", value: (l) => l.detail?.dataTable.totalUnits ?? null },
  {
    label: "情報更新日",
    value: (l) => l.detail?.dataTable.infoUpdatedAt ?? null,
  },
  {
    label: "次回更新予定日",
    value: (l) => l.detail?.dataTable.nextUpdateAt ?? null,
  },
  {
    label: "契約期間",
    value: (l) =>
      l.detail?.dataTable.contractTerm ?? l.detail?.contractTerm ?? null,
  },
  {
    label: "保証会社",
    value: (l) => l.detail?.dataTable.guarantorCompany ?? null,
  },
  {
    label: "解約・違約金",
    value: (l) => l.detail?.cancellationMailLabel ?? null,
  },
  { label: "スコア / tier", value: (l) => `${l.score} / ${l.tier}` },
  { label: "詳細URL", value: (l) => l.detailUrl },
];

export function formatCell(
  l: ScoredListing,
  row: ComparisonRowDef,
  maxLen?: number,
): string {
  return dash(row.value(l), maxLen ?? (row.label === "保証会社" ? 200 : 140));
}
