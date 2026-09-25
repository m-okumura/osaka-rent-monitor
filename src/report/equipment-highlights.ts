/** 比較表「設備ハイライト」: 必須・汎用タグを除き、差がつく設備だけ */

const EXCLUDE_TAG_PATTERNS: RegExp[] = [
  /^バス.?トイレ別$/,
  /^洗面所独立$/,
  /^独立洗面/,
  /^シャワー付洗面台$/,
  /^室内洗濯/,
  /^駅徒歩\d+分以内$/,
  /^2沿線利用可$/,
  /^2駅利用可$/,
  /^IT重説/,
  /^通風良好$/,
  /^陽当り良好$/,
  /^閑静な住宅地$/,
  /^耐火構造$/,
  /^耐震構造$/,
  /^平坦地$/,
  /^駅まで平坦$/,
  /^眺望良好$/,
  /^高層階$/,
  /^エレベーター$/,
  /^フローリング$/,
  /^エアコン$/,
  /^クロゼット$/,
  /^バルコニー$/,
  /^照明付$/,
  /^シューズボックス$/,
  /^TVインターホン$/,
  /^ガスコンロ対応$/,
  /^ディンプルキー$/,
  /^ダブルロックキー$/,
  /^CS$/,
  /^BS$/,
  /^BS・CS$/,
  /^CATV$/,
  /^LAN$/,
  /^高速ネット対応$/,
  /^ネット専用回線$/,
  /^24時間換気システム$/,
  /^脱衣所$/,
  /^洗面化粧台$/,
  /^洗面所にドア$/,
  /^都市ガス$/,
  /^即入居可$/,
  /^セキュリティ会社加入済$/,
  /^24時間緊急通報システム$/,
];

/** 表示順（先頭ほど優先）。温水便座・2口コンロはユーザー指定 */
const HIGHLIGHT_PRIORITY: RegExp[] = [
  /温水(式|洗浄)便座/,
  /2口コンロ/,
  /防音|遮音|二重床|ダブルフロア|サウンドプルーフ/,
  /オートロック/,
  /浴室乾燥/,
  /南向き|南東向き|南西向き/,
  /宅配ボックス/,
  /保証人不要/,
  /初期費用.*カード/,
  /防犯カメラ/,
  /24時間ゴミ/,
  /システムキッチン/,
  /駐輪場/,
  /敷地内ごみ/,
  /外壁タイル/,
  /寝室\d+畳以上/,
];

function shouldExcludeEquipmentTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return true;
  return EXCLUDE_TAG_PATTERNS.some((re) => re.test(t));
}

function highlightSortKey(tag: string): number {
  for (let i = 0; i < HIGHLIGHT_PRIORITY.length; i++) {
    if (HIGHLIGHT_PRIORITY[i]!.test(tag)) return i;
  }
  return HIGHLIGHT_PRIORITY.length;
}

export function formatEquipmentHighlights(
  equipmentTags: string[],
  soundKeywords: string[] = [],
  maxChars = 160,
): string | null {
  const merged = [...equipmentTags];
  for (const kw of soundKeywords) {
    if (kw && !merged.some((t) => t.includes(kw))) merged.push(kw);
  }

  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const raw of merged) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    if (shouldExcludeEquipmentTag(tag)) continue;
    seen.add(tag);
    filtered.push(tag);
  }

  if (filtered.length === 0) return null;

  filtered.sort(
    (a, b) =>
      highlightSortKey(a) - highlightSortKey(b) ||
      a.localeCompare(b, "ja"),
  );

  const parts: string[] = [];
  let len = 0;
  for (const tag of filtered) {
    const sep = parts.length > 0 ? "、" : "";
    const chunk = sep + tag;
    if (parts.length > 0 && len + chunk.length > maxChars) break;
    parts.push(tag);
    len += chunk.length;
  }

  const hidden = filtered.length - parts.length;
  const body = parts.join("、");
  if (hidden > 0) return `${body}…他${hidden}件`;
  return body;
}
