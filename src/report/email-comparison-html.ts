import {
  ACTION_BAND_HEADINGS,
  bandOrder,
  formatThresholdsNote,
  type ActionBand,
} from "./action-bands.js";
import { listingDisplayName, propertyColumnTitle } from "./build-comparison-report-shared.js";
import type { PreparedComparisonReport } from "./prepare-comparison.js";
import type { SanitizedComparisonEntry } from "./comparison-sanitize.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function areaText(l: SanitizedComparisonEntry): string {
  if (l.detail?.areaSqm != null) return `${l.detail.areaSqm}㎡`;
  return l.areaText;
}

function accessLine(l: SanitizedComparisonEntry): string {
  return l.detail?.stationAccess[0] ?? l.accessSummary;
}

function renderCompactTableRows(listings: SanitizedComparisonEntry[]): string {
  if (listings.length === 0) return "";
  return listings
    .map((l) => {
      const name = listingDisplayName(l);
      const merge =
        l.mergeSuppressed && l.mergeSuppressed > 0
          ? ` <span style="color:#888;font-size:0.85em;">(+${l.mergeSuppressed}件統合)</span>`
          : "";
      return `<tr>
<td style="padding:6px 8px;border:1px solid #ddd;">${l.score}</td>
<td style="padding:6px 8px;border:1px solid #ddd;"><a href="${escapeHtml(l.detailUrl)}" style="color:#0b57d0;">${escapeHtml(name)}</a>${merge}</td>
<td style="padding:6px 8px;border:1px solid #ddd;">${escapeHtml(l.madori)}</td>
<td style="padding:6px 8px;border:1px solid #ddd;">${escapeHtml(areaText(l))}</td>
<td style="padding:6px 8px;border:1px solid #ddd;">${escapeHtml(l.totalYen.toLocaleString("ja-JP"))}円</td>
<td style="padding:6px 8px;border:1px solid #ddd;font-size:0.9em;">${escapeHtml(accessLine(l))}</td>
</tr>`;
    })
    .join("\n");
}

function renderBandBlock(
  band: ActionBand,
  listings: SanitizedComparisonEntry[],
): string {
  if (listings.length === 0) return "";
  const { title, hint } = ACTION_BAND_HEADINGS[band];
  const listItems = listings
    .map((l) => {
      const label = propertyColumnTitle(l);
      return `<li>${l.score}点 — <a href="${escapeHtml(l.detailUrl)}" style="color:#0b57d0;">${escapeHtml(label)}</a>（${escapeHtml(l.totalYen.toLocaleString("ja-JP"))}円）</li>`;
    })
    .join("\n");

  return `<section style="margin:1.2em 0;">
<h3 style="font-size:1em;margin:0 0 4px;">${escapeHtml(title)}</h3>
<p style="margin:0 0 8px;color:#666;font-size:0.9em;">${escapeHtml(hint)}</p>
<ul style="margin:0 0 10px;padding-left:1.2em;font-size:0.95em;">${listItems}</ul>
<table style="border-collapse:collapse;width:100%;max-width:640px;font-size:13px;">
<thead><tr style="background:#f0f4f8;">
<th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">スコア</th>
<th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">物件</th>
<th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">間取</th>
<th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">専有</th>
<th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">家賃込</th>
<th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">最寄り</th>
</tr></thead>
<tbody>
${renderCompactTableRows(listings)}
</tbody>
</table>
</section>`;
}

/** メール本文用：A/B/C 区分 + コンパクト比較表（添付を開かなくてよい要点） */
export function renderMailComparisonHtml(
  prepared: PreparedComparisonReport | undefined,
): string {
  if (!prepared || prepared.notify.length === 0) return "";

  const { mergeStats: ms } = prepared;
  const mergeNote =
    ms.before > ms.after
      ? `<p style="color:#666;font-size:0.9em;">重複掲載を統合: ${ms.before} 件 → ${ms.after} 件（同一マンション×階/面積は最安1行）</p>`
      : "";

  const bands = bandOrder()
    .map((b) => renderBandBlock(b, prepared.notifyByBand[b]))
    .filter(Boolean)
    .join("\n");

  return `<section style="margin:1em 0;padding:12px;background:#fafafa;border-radius:6px;">
<h2 style="font-size:1.05em;margin:0 0 8px;">横断比較（スコア順 · 本文）</h2>
<p style="margin:0 0 8px;color:#666;font-size:0.9em;">${escapeHtml(formatThresholdsNote(prepared.thresholds))}</p>
${mergeNote}
${bands}
<p style="color:#888;font-size:0.85em;margin:12px 0 0;">詳細項目（保証・契約・data_table 全項目）は添付 HTML を参照。</p>
</section>`;
}
