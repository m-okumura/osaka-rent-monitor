import { config } from "../config.js";
import type { AreaFetchSummary, ScoredListing } from "../types.js";
import type { MailContext } from "./types.js";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tierLabel(tier: ScoredListing["tier"]): string {
  switch (tier) {
    case "recommended":
      return "◎";
    case "caution":
      return "△";
    case "exclude":
      return "×";
    default:
      return "○";
  }
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
  const structure = listing.detail?.structureRaw ?? "構造不明";
  return `${listing.madori} / ${area} / ${listing.floor} / ${structure} / 計 ${listing.totalYen.toLocaleString("ja-JP")}円${admin ? `（${listing.rentYen.toLocaleString("ja-JP")}円${admin}）` : ""}`;
}

function renderSummaries(summaries: AreaFetchSummary[]): string {
  const lines = summaries.map((s) => {
    const site =
      s.siteTotal != null ? `${s.siteTotal.toLocaleString("ja-JP")} 件` : "—";
    return `${escapeHtml(s.searchArea)}: サイト表示 ${site} / 一覧パース ${s.parsedRows} 行`;
  });
  return lines.join("<br>");
}

function renderScoreboard(listings: ScoredListing[]): string {
  const top = [...listings]
    .filter((l) => l.tier !== "exclude")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (top.length === 0) return "";

  const rows = top
    .map((l) => {
      const name = l.detail?.propertyName || l.buildingTitle || l.address;
      return `<li>${tierLabel(l.tier)} スコア ${l.score} — <a href="${escapeHtml(l.detailUrl)}">${escapeHtml(name)}</a>（${escapeHtml(formatRentLine(l))}）</li>`;
    })
    .join("");

  return `<section style="margin:1em 0;">
<h3 style="font-size:1em;">ルールスコア TOP（参考）</h3>
<ul style="margin:0;padding-left:1.2em;">${rows}</ul>
</section>`;
}

function renderListingsBody(listings: ScoredListing[]): string {
  const sorted = [...listings].sort((a, b) => b.score - a.score);
  const rows = sorted
    .map((listing) => {
      const title =
        listing.detail?.propertyName || listing.buildingTitle || listing.address;
      const access =
        listing.detail?.stationAccess[0] ?? listing.accessSummary;
      const flags: string[] = [];
      if (listing.detail?.cancellationReview) flags.push("解約条件:要確認");
      if (listing.detail?.soundKeywords.length) {
        flags.push(`防音KW: ${listing.detail.soundKeywords.join("・")}`);
      }
      return `<li style="margin: 0.5em 0;">
        <strong>${tierLabel(listing.tier)} ${listing.score}点</strong>
        <a href="${escapeHtml(listing.detailUrl)}" style="color: #0b57d0;">${escapeHtml(title)}</a>
        <span style="color:#333;"> — ${escapeHtml(formatRentLine(listing))}</span>
        <br><span style="color:#666;font-size:0.9em;">${escapeHtml(access)} / ${escapeHtml(listing.searchArea)}</span>
        ${flags.length ? `<br><span style="color:#666;font-size:0.85em;">${escapeHtml(flags.join(" / "))}</span>` : ""}
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
  const html = `
    ${introHtml}
    <p style="color: #444;">条件: ${escapeHtml(config.madori)} / 管理費込 ${config.rentMaxTotal.toLocaleString("ja-JP")} 円以下 / v1: 詳細ページから構造・キーワード取得</p>
    <p style="color: #444;">${renderSummaries(context.summaries)}</p>
    <p style="color: #444;">フィルタ後の該当: ${context.matchedCount} 件 / このメール: ${listings.length} 件</p>
    ${advisorBlock}
    ${renderScoreboard(listings)}
    ${renderListingsBody(listings)}
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
    introHtml: `<p>SUUMO 賃貸（今里・あびこ）に、条件に合う<strong>新規</strong>物件が ${listings.length} 件あります（詳細・スコア・AI メモ付き）。</p>`,
    listings,
    context,
    subjectPrefix: "新規",
  });
}

export function buildSnapshotMail(
  listings: ScoredListing[],
  context: MailContext,
): { subject: string; html: string } {
  return buildListingsMail({
    introHtml:
      "<p>SUUMO 賃貸（今里・あびこ）の<strong>現時点</strong>一覧です（詳細・スコア・AI メモ付き）。</p>",
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
