import { config } from "../config.js";
import type { AreaFetchSummary, Listing } from "../types.js";
import type { MailContext } from "./types.js";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRentLine(listing: Listing): string {
  const admin =
    listing.adminYen != null ? ` + 管理費 ${listing.adminYen.toLocaleString("ja-JP")}円` : "";
  return `${listing.madori} / ${listing.areaText} / ${listing.floor} / 家賃 ${listing.rentYen.toLocaleString("ja-JP")}円${admin} = 計 ${listing.totalYen.toLocaleString("ja-JP")}円`;
}

function renderSummaries(summaries: AreaFetchSummary[]): string {
  const lines = summaries.map((s) => {
    const site =
      s.siteTotal != null ? `${s.siteTotal.toLocaleString("ja-JP")} 件` : "—";
    return `${escapeHtml(s.searchArea)}: サイト表示 ${site} / 一覧パース ${s.parsedRows} 行`;
  });
  return lines.join("<br>");
}

function groupByArea(listings: Listing[]): Map<string, Listing[]> {
  const groups = new Map<string, Listing[]>();
  for (const listing of listings) {
    const bucket = groups.get(listing.searchArea);
    if (bucket) bucket.push(listing);
    else groups.set(listing.searchArea, [listing]);
  }
  for (const items of groups.values()) {
    items.sort((a, b) => a.totalYen - b.totalYen || a.buildingTitle.localeCompare(b.buildingTitle, "ja"));
  }
  return groups;
}

function renderListingsBody(listings: Listing[]): string {
  const groups = groupByArea(listings);
  const areas = [...groups.keys()].sort((a, b) => a.localeCompare(b, "ja"));

  return areas
    .map((area) => {
      const items = groups.get(area) ?? [];
      const rows = items
        .map((listing) => {
          const title = listing.buildingTitle || listing.address;
          return `<li style="margin: 0.35em 0;">
          <a href="${escapeHtml(listing.detailUrl)}" style="color: #0b57d0; text-decoration: underline;">${escapeHtml(title)}</a>
          <span style="color: #333;"> — ${escapeHtml(formatRentLine(listing))}</span>
          <br><span style="color: #666; font-size: 0.9em;">${escapeHtml(listing.accessSummary)} / ${escapeHtml(listing.address)}</span>
        </li>`;
        })
        .join("\n");

      return `<section style="margin: 1em 0;">
      <h3 style="margin: 0.5em 0; font-size: 1em; color: #111;">${escapeHtml(area)}（${items.length}件）</h3>
      <ul style="margin: 0; padding-left: 1.2em; list-style: disc;">${rows}</ul>
    </section>`;
    })
    .join("\n");
}

function buildListingsMail(options: {
  introHtml: string;
  listings: Listing[];
  context: MailContext;
  subjectPrefix: string;
}): { subject: string; html: string } {
  const { introHtml, listings, context, subjectPrefix } = options;
  const html = `
    ${introHtml}
    <p style="color: #444;">条件: ${escapeHtml(config.madori)} / 管理費込 ${config.rentMaxTotal.toLocaleString("ja-JP")} 円以下 / 賃貸マンション（RC 構造は詳細で要確認）</p>
    <p style="color: #444;">${renderSummaries(context.summaries)}</p>
    <p style="color: #444;">フィルタ後の該当: ${context.matchedCount} 件 / このメール: ${listings.length} 件</p>
    <p style="color: #666; font-size: 0.9em;">※短期解約違約金・防音性能は自動判定していません。気になる物件は SUUMO 詳細で<strong>要確認</strong>してください。</p>
    ${renderListingsBody(listings)}
  `;

  return {
    subject: `[大阪SUUMO] ${subjectPrefix} ${listings.length} 件（該当 ${context.matchedCount} 件）`,
    html,
  };
}

export function buildNewListingsMail(
  listings: Listing[],
  context: MailContext,
): { subject: string; html: string } {
  return buildListingsMail({
    introHtml: `<p>SUUMO 賃貸（今里・あびこエリア）に、条件に合う<strong>新規</strong>物件が ${listings.length} 件見つかりました。</p>`,
    listings,
    context,
    subjectPrefix: "新規",
  });
}

export function buildSnapshotMail(
  listings: Listing[],
  context: MailContext,
): { subject: string; html: string } {
  return buildListingsMail({
    introHtml:
      "<p>SUUMO 賃貸（今里・あびこエリア）の<strong>現時点</strong>の該当一覧です（手動スナップショット）。</p>",
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
