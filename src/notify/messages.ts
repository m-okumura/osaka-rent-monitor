import { formatSearchConditionsShort } from "../listing-requirements.js";
import { renderMailComparisonHtml } from "../report/email-comparison-html.js";
import type { AreaFetchSummary, ScoredListing } from "../types.js";
import type { MailContext } from "./types.js";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRentLine(listing: ScoredListing): string {
  const admin =
    listing.adminYen != null
      ? ` + 管理費 ${listing.adminYen.toLocaleString("ja-JP")}円`
      : "";
  const area =
    listing.detail?.areaSqm != null
      ? `${listing.detail.areaSqm}㎡`
      : listing.areaText;
  let structure = listing.detail?.structureRaw ?? "構造不明";
  if (
    listing.structureConflict &&
    listing.structureEffective &&
    listing.structureEffective !== listing.detail?.structureKind
  ) {
    structure = `${structure} → 判定:${listing.structureEffective}`;
  }
  const commute = listing.commuteHintShinsaibashi
    ? ` / ${listing.commuteHintShinsaibashi}`
    : "";
  return `${listing.madori} / ${area} / ${listing.floor} / ${structure}${commute} / 計 ${listing.totalYen.toLocaleString("ja-JP")}円${admin ? `（${listing.rentYen.toLocaleString("ja-JP")}円${admin}）` : ""}`;
}

function renderSummaries(summaries: AreaFetchSummary[]): string {
  const lines = summaries.map((s) => {
    const site =
      s.siteTotal != null ? `${s.siteTotal.toLocaleString("ja-JP")} 件` : "—";
    return `${escapeHtml(s.searchArea)}: サイト表示 ${site} / 一覧パース ${s.parsedRows} 行`;
  });
  return lines.join("<br>");
}

/** 比較表が無いときのフォールバック（詳細付き一覧） */
function renderListingsFallback(listings: ScoredListing[]): string {
  const sorted = [...listings].sort((a, b) => b.score - a.score);
  const rows = sorted
    .map((listing) => {
      const title =
        listing.detail?.propertyName || listing.buildingTitle || listing.address;
      const access =
        listing.detail?.stationAccess[0] ?? listing.accessSummary;
      return `<li style="margin: 0.5em 0;">
        <strong>${listing.score}点</strong>
        <a href="${escapeHtml(listing.detailUrl)}" style="color: #0b57d0;">${escapeHtml(title)}</a>
        <span style="color:#333;"> — ${escapeHtml(formatRentLine(listing))}</span>
        <br><span style="color:#666;font-size:0.9em;">${escapeHtml(access)}</span>
      </li>`;
    })
    .join("\n");

  return `<section style="margin: 1em 0;">
<h3 style="font-size:1em;">物件一覧（スコア順）</h3>
<ul style="margin: 0; padding-left: 1.2em; list-style: disc;">${rows}</ul>
</section>`;
}

function buildListingsMail(options: {
  introHtml: string;
  listings: ScoredListing[];
  context: MailContext;
  subjectPrefix: string;
}): { subject: string; html: string } {
  const { introHtml, listings, context, subjectPrefix } = options;
  const advisorBlock = context.advisorHtml ?? "";
  const comparisonBlock = renderMailComparisonHtml(context.comparisonReport);
  const listingFallback =
    comparisonBlock.length === 0 ? renderListingsFallback(listings) : "";

  const html = `
    ${introHtml}
    <p style="color: #444;">条件: ${escapeHtml(formatSearchConditionsShort())}（設備・RC/SRC は詳細で確認）</p>
    <p style="color: #444;">${renderSummaries(context.summaries)}</p>
    <p style="color: #444;">フィルタ後の該当: ${context.matchedCount} 件 / 通知対象: ${listings.length} 件</p>
    ${comparisonBlock}
    ${advisorBlock}
    ${listingFallback}
  `;

  return {
    subject: `[大阪SUUMO] ${subjectPrefix} ${listings.length} 件（該当 ${context.matchedCount} 件）`,
    html,
  };
}

export function buildNewListingsMail(
  listings: ScoredListing[],
  context: MailContext,
): { subject: string; html: string } {
  return buildListingsMail({
    introHtml: `<p>SUUMO 賃貸の<strong>新規差分</strong>です（${listings.length} 件）。下の比較表と AI メモを参照。</p>`,
    listings,
    context,
    subjectPrefix: "新規差分",
  });
}

export function buildSnapshotMail(
  listings: ScoredListing[],
  context: MailContext,
): { subject: string; html: string } {
  return buildListingsMail({
    introHtml:
      "<p>SUUMO 賃貸の<strong>現時点</strong>一覧です。下の比較表（A/B/C）と AI メモを参照。</p>",
    listings,
    context,
    subjectPrefix: "現時点",
  });
}

export function buildFailureMail(message: string): { subject: string; html: string } {
  return {
    subject: "[大阪SUUMO] 監視エラー",
    html: `<p>大阪 SUUMO 賃貸監視でエラーが発生しました。</p><pre style="white-space: pre-wrap;">${escapeHtml(message)}</pre>`,
  };
}
