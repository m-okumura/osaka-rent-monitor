import type { ScoredListing } from "../types.js";
import { formatSearchConditionsShort } from "../listing-requirements.js";
import {
  COMPARISON_ROW_DEFS,
  formatCell,
  type ComparisonRowDef,
} from "./comparison-fields.js";
import type { ComparisonReportEntry } from "./comparison-report-entry.js";
import { dedupeByDetailUrl, propertyColumnTitle } from "./build-comparison-report-shared.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCellHtml(l: ScoredListing, row: ComparisonRowDef): string {
  const raw = formatCell(l, row);
  if (row.label === "詳細URL" && raw.startsWith("http")) {
    const href = escapeHtml(raw);
    return `<a href="${href}">SUUMO</a>`;
  }
  return escapeHtml(raw);
}

function reasonsListHtml(entries: ComparisonReportEntry[]): string {
  if (entries.length === 0) {
    return "<p><em>なし</em></p>";
  }
  const items = entries
    .map((e) => {
      const name = escapeHtml(
        e.detail?.propertyName || e.buildingTitle || e.id,
      );
      if (e.reportReasons.length === 0) {
        return `<li><strong>${name}</strong></li>`;
      }
      const reasons = escapeHtml(e.reportReasons.join("、"));
      return `<li><strong>${name}</strong>: ${reasons}</li>`;
    })
    .join("\n");
  return `<ul class="reasons">${items}</ul>`;
}

function buildMatrixTableHtml(listings: ScoredListing[]): string {
  if (listings.length === 0) {
    return "<p><em>（該当なし）</em></p>";
  }

  const headerCells = [
    '<th scope="row" class="corner">項目</th>',
    ...listings.map(
      (l) => `<th scope="col">${escapeHtml(propertyColumnTitle(l))}</th>`,
    ),
  ];

  const bodyRows = COMPARISON_ROW_DEFS.map((row) => {
    const cells = [
      `<th scope="row">${escapeHtml(row.label)}</th>`,
      ...listings.map((l) => `<td>${formatCellHtml(l, row)}</td>`),
    ];
    return `<tr>${cells.join("")}</tr>`;
  }).join("\n");

  return `<div class="table-wrap">
<table>
<thead><tr>${headerCells.join("")}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
</div>`;
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
  .meta { color: #444; margin: 0 0 6px; }
  .meta ul { margin: 8px 0; padding-left: 1.2em; }
  .reasons { margin: 8px 0 16px; padding-left: 1.2em; }
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
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): string {
  const { generatedAt, entries, mode } = options;
  const stamp = generatedAt.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  const notify = dedupeByDetailUrl(
    entries.filter((e) => e.reportBucket === "notify"),
  );
  const passed = dedupeByDetailUrl(
    entries.filter((e) => e.reportBucket === "passed_over"),
  );

  const intro =
    mode === "snapshot"
      ? "スナップショット時点の該当物件"
      : "今回の新規差分物件";

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
</ul>
</div>

<h2>おすすめ候補（通知対象 ${notify.length} 件）</h2>
${reasonsListHtml(notify)}
${buildMatrixTableHtml(notify)}

<h2>見送り（${passed.length} 件）</h2>
${reasonsListHtml(passed)}
${buildMatrixTableHtml(passed)}

<p class="footnote">※ SUUMO 詳細 data_table の項目を横並びにしたものです。未取得項目は — 表示。契約・空室は店舗で要確認。</p>
</body>
</html>
`;
}
