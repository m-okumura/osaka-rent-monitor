import {
  ACTION_BAND_HEADINGS,
  bandOrder,
  formatThresholdsNote,
  type ActionBand,
} from "./action-bands.js";
import { listingDisplayName } from "./build-comparison-report-shared.js";
import {
  renderHorizontalComparisonMatrix,
  renderLiteComparisonMatrixEmail,
  renderPropertyCardsEmail,
} from "./comparison-matrix-html.js";
import type { PreparedComparisonReport } from "./prepare-comparison.js";
import type { SanitizedComparisonEntry } from "./comparison-sanitize.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function passedReasonsHtml(entries: SanitizedComparisonEntry[]): string {
  if (entries.length === 0) return "";
  const items = entries
    .map((e) => {
      const name = escapeHtml(listingDisplayName(e));
      const reasons = escapeHtml(e.reportReasons.join("、"));
      return `<li><strong>${e.score}点</strong> ${name}: ${reasons}</li>`;
    })
    .join("\n");
  return `<ul style="margin:8px 0 12px;padding-left:1.2em;font-size:0.95em;">${items}</ul>`;
}

function renderBandBlock(
  band: ActionBand,
  listings: SanitizedComparisonEntry[],
): string {
  if (listings.length === 0) return "";
  const { title, hint } = ACTION_BAND_HEADINGS[band];
  return `<section style="margin:1.4em 0;">
<h3 style="font-size:1em;margin:0 0 4px;">${escapeHtml(title)}（${listings.length} 件）</h3>
<p style="margin:0 0 8px;color:#666;font-size:0.9em;">${escapeHtml(hint)}</p>
<p style="margin:0 0 6px;font-size:0.85em;color:#888;">📱 サクッと見る（1物件1カード）</p>
${renderPropertyCardsEmail(listings)}
<p style="margin:12px 0 6px;font-size:0.85em;color:#888;">主要項目（横並び · 5行まで）</p>
${renderLiteComparisonMatrixEmail(listings)}
<p style="margin:12px 0 6px;font-size:0.85em;color:#888;">全項目（空欄行は非表示 · 横スクロール）</p>
${renderHorizontalComparisonMatrix(listings, "email", { omitEmptyRows: true })}
</section>`;
}

/** メール本文：A/B/C 区分 + 横並び全項目 + 見送り */
export function renderMailComparisonHtml(
  prepared: PreparedComparisonReport | undefined,
): string {
  if (!prepared || (prepared.notify.length === 0 && prepared.passed.length === 0)) {
    return "";
  }

  const { mergeStats: ms } = prepared;
  const mergeNote =
    ms.before > ms.after
      ? `<p style="color:#666;font-size:0.9em;">重複掲載を統合: ${ms.before} 件 → ${ms.after} 件（同一マンション×階/面積は最安1行）</p>`
      : "";

  const bands = bandOrder()
    .map((b) => renderBandBlock(b, prepared.notifyByBand[b]))
    .filter(Boolean)
    .join("\n");

  const passedBlock =
    prepared.passed.length > 0
      ? `<section style="margin:1.6em 0;">
<h2 style="font-size:1.05em;margin:0 0 8px;">見送り（${prepared.passed.length} 件）</h2>
${passedReasonsHtml(prepared.passed)}
${renderPropertyCardsEmail(prepared.passed)}
${renderHorizontalComparisonMatrix(prepared.passed, "email", { omitEmptyRows: true })}
</section>`
      : "";

  return `<section style="margin:1em 0;">
<h2 style="font-size:1.05em;margin:0 0 8px;">横断比較（本文完結）</h2>
<p style="margin:0 0 8px;color:#666;font-size:0.9em;">${escapeHtml(formatThresholdsNote(prepared.thresholds))} · 住所クリックで Google マップ</p>
${mergeNote}
${bands}
${passedBlock}
<p style="color:#888;font-size:0.85em;margin:16px 0 0;">※ SUUMO data_table 項目。未取得は —。契約・空室は店舗確認。</p>
</section>`;
}
