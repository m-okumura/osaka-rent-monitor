/** SUUMO 表示の家賃・管理費を円に変換（例: 8.5万円, 7000円, -） */
export function parseYen(text: string | undefined): number | null {
  if (!text) return null;
  const t = text.replace(/\s/g, "").trim();
  if (!t || t === "-") return null;
  const man = t.match(/^([\d.]+)万円$/);
  if (man) return Math.round(parseFloat(man[1]!) * 10_000);
  const yen = t.match(/^([\d,]+)円$/);
  if (yen) return parseInt(yen[1]!.replace(/,/g, ""), 10);
  return null;
}

export function totalRentYen(rentYen: number | null, adminYen: number | null): number | null {
  if (rentYen == null) return null;
  return rentYen + (adminYen ?? 0);
}
