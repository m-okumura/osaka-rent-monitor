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

export function comparisonRowsForListing(l: ScoredListing): ComparisonRowDef[] {
  const d = l.detail;
  const t = d?.dataTable;
  return [
    { label: "間取り", value: () => l.madori },
    { label: "間取り詳細", value: () => t?.madoriDetail ?? null },
    { label: "専有面積", value: () => (d?.areaSqm != null ? `${d.areaSqm}㎡` : l.areaText) },
    { label: "家賃+管理費", value: () => `${l.totalYen.toLocaleString("ja-JP")}円` },
    { label: "最寄り", value: () => d?.stationAccess[0] ?? l.accessSummary },
    { label: "監視エリア", value: () => l.searchArea },
    { label: "構造", value: () => t?.structure ?? d?.structureRaw ?? null },
    { label: "階建", value: () => t?.floors ?? null },
    { label: "築年月", value: () => t?.builtYm ?? null },
    { label: "エネルギー消費性能", value: () => t?.energyConsumption ?? null },
    { label: "断熱性能", value: () => t?.insulation ?? null },
    { label: "目安光熱費", value: () => t?.estimatedUtility ?? null },
    { label: "損保", value: () => t?.insurance ?? null },
    { label: "駐車場", value: () => t?.parking ?? null },
    { label: "入居", value: () => t?.moveIn ?? null },
    { label: "取引態様", value: () => t?.transactionType ?? null },
    { label: "条件", value: () => t?.conditions ?? null },
    { label: "取り扱い店舗物件コード", value: () => t?.shopPropertyCode ?? null },
    { label: "SUUMO物件コード", value: () => t?.suumoPropertyCode ?? l.id },
    { label: "総戸数", value: () => t?.totalUnits ?? null },
    { label: "情報更新日", value: () => t?.infoUpdatedAt ?? null },
    { label: "次回更新予定日", value: () => t?.nextUpdateAt ?? null },
    { label: "契約期間", value: () => t?.contractTerm ?? d?.contractTerm ?? null },
    {
      label: "保証会社",
      value: () => t?.guarantorCompany ?? null,
    },
    { label: "解約・違約金", value: () => d?.cancellationMailLabel ?? null },
    { label: "スコア / tier", value: () => `${l.score} / ${l.tier}` },
    { label: "詳細URL", value: () => l.detailUrl },
  ];
}

export function formatCell(
  l: ScoredListing,
  row: ComparisonRowDef,
  maxLen?: number,
): string {
  return dash(row.value(l), maxLen ?? (row.label === "保証会社" ? 200 : 140));
}
