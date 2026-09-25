import { formatSearchConditionsShort } from "../listing-requirements.js";
import {
  ACTION_BAND_HEADINGS,
  bandOrder,
  formatThresholdsNote,
} from "./action-bands.js";
import { listingDisplayName } from "./build-comparison-report-shared.js";
import { renderHorizontalComparisonMatrix } from "./comparison-matrix-html.js";
import type { SanitizedComparisonEntry } from "./comparison-sanitize.js";
import type { PreparedComparisonReport } from "./prepare-comparison.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reasonsListHtml(entries: SanitizedComparisonEntry[]): string {
  if (entries.length === 0) {
    return "<p><em>なし</em></p>";
  }
  const items = entries
    .map((e) => {
      const name = escapeHtml(listingDisplayName(e));
      const merge =
        e.mergeSuppressed && e.mergeSuppressed > 0
          ? ` <span class="merge">(+${e.mergeSuppressed}件統合)</span>`
          : "";
      if (e.reportReasons.length === 0) {
        return `<li><strong>${e.score}点</strong> ${name}${merge}</li>`;
      }
      const reasons = escapeHtml(e.reportReasons.join("、"));
      return `<li><strong>${e.score}点</strong> ${name}${merge}: ${reasons}</li>`;
    })
    .join("\n");
  return `<ul class="reasons">${items}</ul>`;
}

function renderNotifyByBands(prepared: PreparedComparisonReport): string {
  const parts: string[] = [];
  for (const band of bandOrder()) {
    const list = prepared.notifyByBand[band];
    if (list.length === 0) continue;
    const { title, hint } = ACTION_BAND_HEADINGS[band];
    parts.push(
      `<h3>${escapeHtml(title)} <span class="hint">${escapeHtml(hint)}</span></h3>`,
    );
    parts.push(renderHorizontalComparisonMatrix(list, "document", {
      omitEmptyRows: true,
    }));
  }
  return parts.join("\n");
}

const REPORT_STYLES = `
  :root { color-scheme: light; }
  body {
    font-family: "Segoe UI", "Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif;
    font-size: 14px;
    line-height: 1.45;
    color: #1a1a1a;
    max-width: 100%;
    margin: 24px;
  }
  h1 { font-size: 1.35rem; margin: 0 0 8px; }
  h2 { font-size: 1.1rem; margin: 28px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 1rem; margin: 20px 0 8px; }
  h3 .hint { font-weight: normal; color: #666; font-size: 0.9em; }
  .meta { color: #444; margin: 0 0 6px; }
  .meta ul { margin: 8px 0; padding-left: 1.2em; }
  .reasons { margin: 8px 0 16px; padding-left: 1.2em; }
  .merge { color: #888; font-size: 0.9em; }
  .table-wrap {
    overflow-x: auto;
    margin: 12px 0 24px;
    border: 1px solid #ccc;
    border-radius: 6px;
    -webkit-overflow-scrolling: touch;
  }
  table {
    border-collapse: collapse;
    min-width: 100%;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    vertical-align: top;
    max-width: 220px;
    word-break: break-word;
  }
  thead th {
    background: #f0f4f8;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  tbody th[scope="row"] {
    background: #fafafa;
    font-weight: 500;
    text-align: left;
    white-space: nowrap;
    position: sticky;
    left: 0;
    z-index: 1;
  }
  thead th.corner {
    left: 0;
    z-index: 3;
  }
  tbody tr:nth-child(even) td { background: #fcfcfc; }
  a { color: #0b57d0; }
  .footnote { color: #666; font-size: 12px; margin-top: 32px; }
`;

export function buildComparisonReportHtml(options: {
  generatedAt: Date;
  prepared: PreparedComparisonReport;
  mode: "new" | "snapshot";
}): string {
  const { generatedAt, prepared, mode } = options;
  const stamp = generatedAt.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  const { notify, passed, notifyRawCount, mergeStats: ms, thresholds } =
    prepared;

  const intro =
    mode === "snapshot"
      ? "スナップショット時点の該当物件"
      : "今回の新規差分物件";

  const mergeLine =
    ms.before > ms.after
      ? `<li>重複統合: 通知 ${ms.before} 件 → ${ms.after} 件</li>`
      : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>大阪 SUUMO 賃貸 横断比較</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<h1>大阪 SUUMO 賃貸 横断比較レポート</h1>
<div class="meta">
<ul>
<li>生成: ${escapeHtml(stamp)} (JST)</li>
<li>対象: ${escapeHtml(intro)}</li>
<li>検索条件: ${escapeHtml(formatSearchConditionsShort())}</li>
<li>区分: ${escapeHtml(formatThresholdsNote(thresholds))}</li>
<li>住所: Google マップリンク</li>
${mergeLine}
</ul>
</div>

<h2>おすすめ候補（統合後 ${notify.length} 件 / 取得 ${notifyRawCount} 件）</h2>
${renderNotifyByBands(prepared)}

<h2>見送り（統合後 ${passed.length} 件）</h2>
${reasonsListHtml(passed)}
${renderHorizontalComparisonMatrix(passed, "document", { omitEmptyRows: true })}

<p class="footnote">※ SUUMO 詳細 data_table の項目を横並びにしたものです。</p>
</body>
</html>
`;
}
