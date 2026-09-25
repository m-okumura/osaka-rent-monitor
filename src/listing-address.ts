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
