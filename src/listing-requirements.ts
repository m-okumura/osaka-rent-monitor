import { config } from "./config.js";
import type { ListingDetail, StructureKind } from "./types.js";
import { parseAreaFromListText } from "./score.js";

/** SUUMO 表記ゆれ（ワンルーム ≒ 1K） */
export function normalizeMadori(raw: string): string {
  const t = raw.replace(/\s+/g, "").trim();
  if (t === "ワンルーム") return "1K";
  return t;
}

export function isAllowedMadori(madori: string): boolean {
  return config.madoriAllowed.includes(normalizeMadori(madori));
}

export function areaSqmFromListing(areaText: string): number | null {
  return parseAreaFromListText(areaText);
}

export function passesMinArea(areaText: string, detailArea: number | null): boolean {
  const fromList = areaSqmFromListing(areaText);
  const area = detailArea ?? fromList;
  if (area == null) return true;
  return area >= config.minAreaSqm;
}

function equipmentText(detail: ListingDetail): string {
  return detail.equipmentTags.join("、");
}

/** バストイレ別・独立洗面・室内洗濯（詳細タグ） */
export function passesRequiredEquipment(detail: ListingDetail): boolean {
  const blob = equipmentText(detail);
  const bathOk = /バス.?トイレ別|バストイレ別/.test(blob);
  const vanityOk = /洗面所独立|独立洗面/.test(blob);
  const laundryOk = /室内洗濯/.test(blob);
  return bathOk && vanityOk && laundryOk;
}

export function isRcOrSrcKind(kind: StructureKind): boolean {
  return kind === "rc";
}

export function isRcOrSrcRaw(raw: string | null): boolean {
  if (!raw) return false;
  const t = raw.replace(/\s/g, "");
  return /鉄骨鉄筋|SRC|鉄筋|^RC/i.test(t);
}

export function passesRcSrcRequirement(
  kind: StructureKind,
  raw: string | null,
): boolean {
  return isRcOrSrcKind(kind) || isRcOrSrcRaw(raw);
}

export function formatSearchConditionsShort(): string {
  const madori = config.madoriAllowed.join("・");
  return `${madori} / 専有 ${config.minAreaSqm}㎡以上 / 管理費込 ${config.rentMaxTotal.toLocaleString("ja-JP")} 円以下 / RC・SRC / バス・トイレ別・独立洗面・室内洗濯`;
}
