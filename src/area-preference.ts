/** 監視エリア label（searchArea）に応じたルールスコア加減。Gemini 方針と揃える */

export function areaScoreFromSearchArea(searchArea: string): {
  delta: number;
  reason: string | null;
} {
  const s = searchArea;

  if (/昭和町|玉造|中津|谷町四丁目/.test(s)) {
    return { delta: 10, reason: "優先エリア（昭和町・玉造・中津・谷町四丁目） (+10)" };
  }
  if (/あびこ|今里/.test(s)) {
    return { delta: -5, reason: "参考エリア（あびこ・今里） (-5)" };
  }
  if (/本町|江坂/.test(s)) {
    return { delta: -2, reason: "便利枠（本町・江坂は情緒加点控えめ） (-2)" };
  }

  return { delta: 0, reason: null };
}
