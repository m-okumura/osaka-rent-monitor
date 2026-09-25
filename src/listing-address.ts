import type { ScoredListing } from "./types.js";

/** 詳細ページ → 一覧の順で住所を解決 */
export function resolveListingAddress(l: ScoredListing): string | null {
  const fromDetail = l.detail?.address?.trim();
  if (fromDetail) return fromDetail;
  const fromList = l.address.trim();
  return fromList || null;
}

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** 比較レポート統合用（一覧・詳細表記ゆれを吸収） */
export function normalizeListingAddressForMerge(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/^大阪府/, "")
    .toLowerCase();
}
