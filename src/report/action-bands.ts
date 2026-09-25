import { config } from "../config.js";
import type { ScoredListing } from "../types.js";

export type ActionBand = "A" | "B" | "C";

export const ACTION_BAND_HEADINGS: Record<
  ActionBand,
  { title: string; hint: string }
> = {
  A: { title: "A — すぐ連絡", hint: "最優先で内見・問い合わせ" },
  B: { title: "B — 気に入れば検討", hint: "条件が合えば候補に" },
  C: { title: "C — 優先低め", hint: "時間があれば確認" },
};

export type ActionBandThresholds = {
  aMin: number;
  bMin: number;
  mode: "fixed" | "dynamic";
};

export function resolveActionBandThresholds(
  notify: ScoredListing[],
): ActionBandThresholds {
  if (config.actionBandMode === "dynamic" && notify.length > 0) {
    const max = Math.max(...notify.map((n) => n.score));
    const spread = config.actionBandDynamicSpread;
    return {
      aMin: max,
      bMin: Math.max(0, max - spread),
      mode: "dynamic",
    };
  }
  return {
    aMin: config.actionScoreBandA,
    bMin: config.actionScoreBandB,
    mode: "fixed",
  };
}

export function actionBandForScore(
  score: number,
  thresholds: ActionBandThresholds,
): ActionBand {
  if (score >= thresholds.aMin) return "A";
  if (score >= thresholds.bMin) return "B";
  return "C";
}

export function formatThresholdsNote(thresholds: ActionBandThresholds): string {
  if (thresholds.mode === "dynamic") {
    return `動的区分（今回の最高 ${thresholds.aMin} 点 / B は ${thresholds.bMin} 点以上）`;
  }
  return `A: ${thresholds.aMin} 点以上 / B: ${thresholds.bMin} 点以上 / C: それ未満`;
}

const BAND_ORDER: ActionBand[] = ["A", "B", "C"];

export function groupByActionBand<T extends ScoredListing>(
  listings: T[],
  thresholds: ActionBandThresholds,
): Record<ActionBand, T[]> {
  const groups: Record<ActionBand, T[]> = { A: [], B: [], C: [] };
  for (const l of listings) {
    groups[actionBandForScore(l.score, thresholds)].push(l);
  }
  for (const band of BAND_ORDER) {
    groups[band].sort(
      (a, b) => b.score - a.score || a.totalYen - b.totalYen,
    );
  }
  return groups;
}

export function bandOrder(): ActionBand[] {
  return BAND_ORDER;
}
