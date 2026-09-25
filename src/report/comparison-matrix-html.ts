import { googleMapsSearchUrl, resolveListingAddress } from "../listing-address.js";
import type { ScoredListing } from "../types.js";
import { propertyColumnTitle, listingDisplayName } from "./build-comparison-report-shared.js";
import {
  COMPARISON_ROW_DEFS,
  comparisonLiteRowDefs,
  formatCell,
  rowsWithDataForListings,
  type ComparisonRowDef,
} from "./comparison-fields.js";

export type MatrixRenderMode = "email" | "document";

export type MatrixRenderOptions = {
  /** 指定時はその行だけ。未指定は COMPARISON_ROW_DEFS */
  rows?: ComparisonRowDef[];
  /** 全列が — の行を省略 */
  omitEmptyRows?: boolean;
};

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
  return cellStyle(
    mode,
    "background:#fafafa;font-weight:500;text-align:left;white-space:nowrap;",
  );
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

function columnHeaderHtml(l: ScoredListing): string {
  const title = escapeHtml(propertyColumnTitle(l));
  const href = escapeHtml(l.detailUrl);
  return `<a href="${href}" style="color:#0b57d0;">${title}</a>`;
}

function resolveRows(
  listings: ScoredListing[],
  options?: MatrixRenderOptions,
): ComparisonRowDef[] {
  const base = options?.rows ?? COMPARISON_ROW_DEFS;
  if (options?.omitEmptyRows) {
    return rowsWithDataForListings(listings, base);
  }
  return base;
}

/** 項目×物件の横並び比較表 */
export function renderHorizontalComparisonMatrix(
  listings: ScoredListing[],
  mode: MatrixRenderMode,
  options?: MatrixRenderOptions,
): string {
  if (listings.length === 0) {
    return "<p><em>（該当なし）</em></p>";
  }

  const rowDefs = resolveRows(listings, options);
  if (rowDefs.length === 0) {
    return "<p><em>（表示可能な項目なし）</em></p>";
  }

  const headerCells =
    mode === "document"
      ? [
          '<th scope="row" class="corner">項目</th>',
          ...listings.map((l) => `<th scope="col">${columnHeaderHtml(l)}</th>`),
        ]
      : [
          `<th scope="row" style="${thRowStyle(mode)}">項目</th>`,
          ...listings.map(
            (l) =>
              `<th scope="col" style="${thColStyle(mode)}">${columnHeaderHtml(l)}</th>`,
          ),
        ];

  const bodyRows = rowDefs
    .map((row) => {
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
    })
    .join("\n");

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

/** メール用：1物件1カード（縦スクロールで一覧） */
export function renderPropertyCardsEmail(
  listings: ScoredListing[],
): string {
  if (listings.length === 0) return "";

  const cards = listings
    .map((l) => {
      const name = escapeHtml(listingDisplayName(l));
      const suumo = escapeHtml(l.detailUrl);
      const addr = resolveListingAddress(l);
      const addrBlock =
        addr != null
          ? `<div style="margin-top:4px;"><a href="${escapeHtml(googleMapsSearchUrl(addr))}" style="color:#0b57d0;font-size:0.9em;">${escapeHtml(addr)}</a></div>`
          : "";
      const lines = comparisonLiteRowDefs()
        .filter((row) => formatCell(l, row) !== "—")
        .map(
          (row) =>
            `<tr><th style="text-align:left;padding:2px 8px 2px 0;color:#666;font-weight:normal;vertical-align:top;">${escapeHtml(row.label)}</th><td style="padding:2px 0;">${formatMatrixCellHtml(l, row, "email")}</td></tr>`,
        )
        .join("");

      return `<div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin:0 0 10px;background:#fff;">
<div style="font-weight:600;margin-bottom:6px;"><span style="color:#333;">${l.score}点</span> · <a href="${suumo}" style="color:#0b57d0;">${name}</a></div>
<table style="border-collapse:collapse;font-size:13px;width:100%;">${lines}</table>
${addrBlock}
</div>`;
    })
    .join("\n");

  return `<div style="margin:8px 0 16px;">${cards}</div>`;
}

/** 主要5項目の横並び（カードの次・全表の前） */
export function renderLiteComparisonMatrixEmail(
  listings: ScoredListing[],
): string {
  return renderHorizontalComparisonMatrix(listings, "email", {
    rows: comparisonLiteRowDefs(),
    omitEmptyRows: true,
  });
}
