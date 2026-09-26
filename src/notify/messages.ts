import { formatSearchConditionsShort } from "../listing-requirements.js";
import { renderMailDigestHtml } from "../report/mail-digest-html.js";
import type { AreaFetchSummary, ScoredListing } from "../types.js";
import type { MailContext } from "./types.js";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSummaries(summaries: AreaFetchSummary[]): string {
  const lines = summaries.map((s) => {
    const site =
      s.siteTotal != null ? `${s.siteTotal.toLocaleString("ja-JP")} 件` : "—";
    return `${escapeHtml(s.searchArea)}: ${site} / ${s.parsedRows} 行`;
  });
  return lines.join(" · ");
}

function renderAdvisorSection(advisorHtml: string): string {
  if (!advisorHtml.trim()) {
    return `<section style="margin:0 0 16px;padding:12px;background:#fff8e6;border-radius:8px;">
<h2 style="font-size:1.1em;margin:0 0 8px;">AI選定メモ</h2>
<p style="color:#666;margin:0;">（AI オフ / スキップ）</p>
</section>`;
  }
  return `<section style="margin:0 0 16px;">
<h2 style="font-size:1.1em;margin:0 0 8px;">AI選定メモ（結論）</h2>
${advisorHtml}
</section>`;
}

function renderInquiryNote(context: MailContext): string {
  const inv = context.inquiry;
  if (!inv?.enabled) return "";
  const parts = [
    `問合済みフィルタ: 新規 ${inv.newTotal} 件のうち <strong>${inv.excludedInquired} 件除外</strong>（Gmail 送信済み + state + 手動 bc）`,
  ];
  if (inv.gmailError) {
    parts.push(
      `<span style="color:#b45309;">Gmail 同期エラー: ${escapeHtml(inv.gmailError)}</span>`,
    );
  }
  return `<p style="margin:0 0 12px;color:#444;font-size:0.92em;">${parts.join(" · ")}</p>`;
}

function renderListingsFallback(listings: ScoredListing[]): string {
  const sorted = [...listings].sort((a, b) => b.score - a.score).slice(0, 5);
  const rows = sorted
    .map((l) => {
      const title = l.detail?.propertyName || l.buildingTitle || l.address;
      return `<li>${l.score}点 — <a href="${escapeHtml(l.detailUrl)}" style="color:#0b57d0;">${escapeHtml(title)}</a></li>`;
    })
    .join("");
  return `<ul style="margin:8px 0;padding-left:1.2em;">${rows}</ul>`;
}

function buildListingsMail(options: {
  introHtml: string;
  listings: ScoredListing[];
  context: MailContext;
  subjectPrefix: string;
}): { subject: string; html: string } {
  const { introHtml, listings, context, subjectPrefix } = options;
  const digest = renderMailDigestHtml({
    prepared: context.comparisonReport,
    reportHref: context.reportHref,
    reportFilename: context.reportFilename,
    reportAttachFallback: context.reportAttachFallback,
  });
  const fallback =
    !context.comparisonReport && listings.length > 0
      ? renderListingsFallback(listings)
      : "";

  const html = `
    ${introHtml}
    ${renderInquiryNote(context)}
    ${renderAdvisorSection(context.advisorHtml ?? "")}
    ${digest}
    ${fallback}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="color:#888;font-size:0.85em;margin:0;">条件: ${escapeHtml(formatSearchConditionsShort())}</p>
    <p style="color:#888;font-size:0.85em;margin:4px 0 0;">該当 ${context.matchedCount} 件 / 通知 ${listings.length} 件 · ${renderSummaries(context.summaries)}</p>
  `;

  const inquirySuffix =
    context.inquiry?.enabled && context.inquiry.excludedInquired > 0
      ? ` / 問合済除外 ${context.inquiry.excludedInquired}`
      : "";
  return {
    subject: `[大阪SUUMO] ${subjectPrefix} ${listings.length} 件（該当 ${context.matchedCount} 件${inquirySuffix}）`,
    html,
  };
}

export function buildAllInquiredSkippedMail(
  context: MailContext,
): { subject: string; html: string } {
  const inv = context.inquiry;
  const total = inv?.newTotal ?? 0;
  const excluded = inv?.excludedInquired ?? total;
  const html = `
    <p style="margin:0 0 12px;">SUUMO 賃貸 <strong>新規差分</strong>は ${total} 件ありましたが、<strong>すべて問い合わせ済み</strong>のため詳細レポートは省略しました。</p>
    ${renderInquiryNote(context)}
    <p style="color:#666;margin:0 0 12px;">次回以降も Gmail 送信済み・state に記録された物件は通知から除外されます。電話のみ問合した場合は <code>INQUIRED_BC_EXTRA</code> に SUUMO 物件コードを追加してください。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="color:#888;font-size:0.85em;margin:0;">該当 ${context.matchedCount} 件 · 新規 ${total} 件（未問合 0 / 除外 ${excluded}）</p>
  `;
  return {
    subject: `[大阪SUUMO] 新規 ${total} 件・すべて問合済み（詳細省略）`,
    html,
  };
}

export function buildNewListingsMail(
  listings: ScoredListing[],
  context: MailContext,
): { subject: string; html: string } {
  const label =
    context.inquiry?.enabled ? "新規差分・未問合のみ" : "新規差分";
  return buildListingsMail({
    introHtml: `<p style="margin:0 0 12px;">SUUMO 賃貸 <strong>${escapeHtml(label)}</strong>（${listings.length} 件）</p>`,
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
    introHtml: `<p style="margin:0 0 12px;">SUUMO 賃貸 <strong>現時点</strong>一覧（${listings.length} 件）</p>`,
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
