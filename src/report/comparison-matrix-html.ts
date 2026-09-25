import { googleMapsSearchUrl } from "../listing-address.js";
import type { ScoredListing } from "../types.js";
import { propertyColumnTitle } from "./build-comparison-report-shared.js";
import {
  COMPARISON_ROW_DEFS,
  formatCell,
  type ComparisonRowDef,
} from "./comparison-fields.js";

export type MatrixRenderMode = "email" | "document";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellStyle(mode: MatrixRenderMode, extra = ""): string {
  if (mode === "document") return extra;
  const base =
    "border:1px solid #ddd;padding:6px 8px;vertical-align:top;font-size:12px;max-width:200px;word-break:break-word;";
  return base + extra;
}

function thRowStyle(mode: MatrixRenderMode): string {
  if (mode === "document") return "";
  return cellStyle(mode, "background:#fafafa;font-weight:500;text-align:left;white-space:nowrap;");
}

function thColStyle(mode: MatrixRenderMode): string {
  if (mode === "document") return "";
  return cellStyle(mode, "background:#f0f4f8;font-weight:600;");
}

function tdStyle(mode: MatrixRenderMode): string {
  if (mode === "document") return "";
  return cellStyle(mode);
}

function formatMatrixCellHtml(
  l: ScoredListing,
  row: ComparisonRowDef,
  mode: MatrixRenderMode,
): string {
  const raw = formatCell(l, row);
  if (row.label === "住所" && raw !== "—") {
    const href = escapeHtml(googleMapsSearchUrl(raw));
    const label = escapeHtml(raw);
    return `<a href="${href}" style="color:#0b57d0;">${label}</a>`;
  }
  if (row.label === "詳細URL" && raw.startsWith("http")) {
    const href = escapeHtml(raw);
    return `<a href="${href}" style="color:#0b57d0;">SUUMO</a>`;
  }
  return escapeHtml(raw);
}

function columnHeaderHtml(l: ScoredListing, mode: MatrixRenderMode): string {
  const title = escapeHtml(propertyColumnTitle(l));
  const href = escapeHtml(l.detailUrl);
  const inner = `<a href="${href}" style="color:#0b57d0;">${title}</a>`;
  if (mode === "document") return inner;
  return inner;
}

/** 項目×物件の横並び比較表（メール・保存 HTML 共通） */
export function renderHorizontalComparisonMatrix(
  listings: ScoredListing[],
  mode: MatrixRenderMode,
): string {
  if (listings.length === 0) {
    return mode === "email"
      ? "<p><em>（該当なし）</em></p>"
      : "<p><em>（該当なし）</em></p>";
  }

  const headerCells =
    mode === "document"
      ? [
          '<th scope="row" class="corner">項目</th>',
          ...listings.map(
            (l) => `<th scope="col">${columnHeaderHtml(l, mode)}</th>`,
          ),
        ]
      : [
          `<th scope="row" style="${thRowStyle(mode)}">項目</th>`,
          ...listings.map(
            (l) =>
              `<th scope="col" style="${thColStyle(mode)}">${columnHeaderHtml(l, mode)}</th>`,
          ),
        ];

  const bodyRows = COMPARISON_ROW_DEFS.map((row) => {
    const label = escapeHtml(row.label);
    if (mode === "document") {
      const cells = [
        `<th scope="row">${label}</th>`,
        ...listings.map((l) => `<td>${formatMatrixCellHtml(l, row, mode)}</td>`),
      ];
      return `<tr>${cells.join("")}</tr>`;
    }
    const cells = [
      `<th scope="row" style="${thRowStyle(mode)}">${label}</th>`,
      ...listings.map(
        (l) =>
          `<td style="${tdStyle(mode)}">${formatMatrixCellHtml(l, row, mode)}</td>`,
      ),
    ];
    return `<tr>${cells.join("")}</tr>`;
  }).join("\n");

  if (mode === "document") {
    return `<div class="table-wrap">
<table>
<thead><tr>${headerCells.join("")}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
</div>`;
  }

  return `<div style="overflow-x:auto;margin:12px 0;-webkit-overflow-scrolling:touch;">
<table style="border-collapse:collapse;min-width:100%;">
<thead><tr>${headerCells.join("")}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
</div>`;
}
