import type { Listing, ScoredListing } from "../types.js";

/** SUUMO 部屋コード（bc / 物件コード）を正規化 */
export function normalizeSuumoBc(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 14) return null;
  return digits;
}

const BC_FROM_TEXT = [
  /[?&]bc=(\d{10,14})/gi,
  /bc[_=](\d{10,14})/gi,
  /\b(100\d{9})\b/g,
];

/** メール本文・URL などから SUUMO 部屋コード候補を抽出 */
export function extractSuumoBcFromText(text: string): Set<string> {
  const out = new Set<string>();
  for (const re of BC_FROM_TEXT) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = normalizeSuumoBc(m[1]!);
      if (n) out.add(n);
    }
  }
  return out;
}

export function bcFromDetailUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const bc = u.searchParams.get("bc");
    if (bc) return normalizeSuumoBc(bc);
    const path = u.pathname;
    const m = path.match(/bc_(\d{10,14})/i);
    if (m) return normalizeSuumoBc(m[1]!);
  } catch {
    /* ignore */
  }
  return null;
}

/** 1 掲載に紐づく問合判定用コード（いずれかが問合済みなら除外） */
export function inquiryCodesForListing(
  l: Pick<Listing, "id" | "detailUrl"> & {
    detail?: ScoredListing["detail"];
  },
): string[] {
  const codes = new Set<string>();
  const fromId = normalizeSuumoBc(l.id);
  if (fromId) codes.add(fromId);
  const fromUrl = bcFromDetailUrl(l.detailUrl);
  if (fromUrl) codes.add(fromUrl);
  const fromTable = l.detail?.dataTable.suumoPropertyCode;
  if (fromTable) {
    const n = normalizeSuumoBc(fromTable);
    if (n) codes.add(n);
  }
  return [...codes];
}

export function listingMatchesInquired(
  l: Pick<Listing, "id" | "detailUrl"> & {
    detail?: ScoredListing["detail"];
  },
  inquired: ReadonlySet<string>,
): boolean {
  return inquiryCodesForListing(l).some((c) => inquired.has(c));
}

export function mergeInquiredBc(
  current: Iterable<string>,
  extra: Iterable<string>,
): string[] {
  const set = new Set<string>();
  for (const raw of current) {
    const n = normalizeSuumoBc(raw);
    if (n) set.add(n);
  }
  for (const raw of extra) {
    const n = normalizeSuumoBc(raw);
    if (n) set.add(n);
  }
  return [...set].sort();
}

export function parseInquiredBcExtra(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return mergeInquiredBc(
    [],
    raw.split(/[,、/\s|]+/).map((s) => s.trim()),
  );
}
