import { googleMapsSearchUrl, resolveListingAddress } from "../listing-address.js";
import {
  ACTION_BAND_HEADINGS,
  bandOrder,
  formatThresholdsNote,
} from "./action-bands.js";
import {
  formatAreaRange,
  formatFloorRange,
  formatManYenRange,
  groupListingsByBuilding,
} from "./building-card-group.js";
import type { PreparedComparisonReport } from "./prepare-comparison.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TOP_BUILDING_LIMIT = 4;

function renderBuildingCard(
  group: ReturnType<typeof groupListingsByBuilding>[number],
): string {
  const rep = group.representative;
  const link = escapeHtml(group.cheapest.detailUrl);
  const name = escapeHtml(group.displayName);
  const floors = escapeHtml(formatFloorRange(group.listings));
  const price = escapeHtml(formatManYenRange(group.listings));
  const area = escapeHtml(formatAreaRange(group.listings));
  const madori = escapeHtml(rep.madori);
  const access = escapeHtml(
    rep.detail?.stationAccess[0] ?? rep.accessSummary,
  );
  const areaLabel = escapeHtml(rep.searchArea.split("（")[0] ?? rep.searchArea);
  const dup =
    group.listings.length > 1
      ? `<span style="color:#888;font-size:0.85em;">（${group.listings.length}掲載 → 最安リンク）</span>`
      : "";
  const addr = resolveListingAddress(rep);
  const addrBlock =
    addr != null
      ? `<div style="margin-top:8px;"><a href="${escapeHtml(googleMapsSearchUrl(addr))}" style="color:#0b57d0;font-size:0.9em;">📍 ${escapeHtml(addr)}</a></div>`
      : "";

  return `<div style="border:1px solid #ccc;border-radius:8px;padding:12px 14px;margin:0 0 12px;background:#fff;">
<div style="font-size:1.05em;font-weight:600;margin-bottom:6px;">
<span style="color:#333;">${group.maxScore}点</span> · <a href="${link}" style="color:#0b57d0;">${name}</a>${dup}
</div>
<div style="font-size:0.95em;color:#333;line-height:1.5;">
${floors} / ${madori} / ${area} / 家賃込 <strong>${price}</strong><br>
<span style="color:#666;">${access} · ${areaLabel}</span>
</div>
${addrBlock}
</div>`;
}

function renderBandSummary(prepared: PreparedComparisonReport): string {
  const buildingGroups = groupListingsByBuilding(prepared.notify);
  const uniqueBuildings = buildingGroups.length;
  const lines = bandOrder()
    .map((band) => {
      const items = prepared.notifyByBand[band];
      if (items.length === 0) return "";
      const buildings = groupListingsByBuilding(items).length;
      const { title } = ACTION_BAND_HEADINGS[band];
      return `<li>${escapeHtml(title)}: ${items.length} 件（${buildings} 棟）</li>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<p style="margin:8px 0;color:#444;font-size:0.95em;">
通知 ${prepared.notify.length} 件 / <strong>${uniqueBuildings} 棟</strong>（同一マンションは1枠に集約）
</p>
<ul style="margin:0 0 12px;padding-left:1.2em;color:#555;font-size:0.9em;">${lines}</ul>`;
}

function renderReportCta(options: {
  href: string | null | undefined;
  filename: string | null | undefined;
  attachFallback: boolean;
}): string {
  const { href, filename, attachFallback } = options;
  if (href) {
    return `<div style="margin:20px 0 8px;text-align:center;">
<a href="${escapeHtml(href)}" style="display:inline-block;background:#0b57d0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">詳細横断比較レポートを開く</a>
<p style="color:#888;font-size:0.85em;margin-top:8px;">ブラウザで sticky 付き全項目表（${escapeHtml(filename ?? "report.html")}）</p>
</div>`;
  }
  if (attachFallback && filename) {
    return `<div style="margin:20px 0 8px;padding:12px;background:#f5f5f5;border-radius:8px;text-align:center;">
<p style="margin:0 0 6px;font-weight:600;">詳細比較は添付 HTML</p>
<p style="margin:0;color:#666;font-size:0.9em;">「${escapeHtml(filename)}」を開くと横並び全項目表を表示（メール本文には載せていません）</p>
<p style="margin:8px 0 0;color:#888;font-size:0.8em;">公開 URL を使う場合は <code>REPORT_PUBLIC_BASE_URL</code> を設定</p>
</div>`;
  }
  return `<p style="color:#888;font-size:0.9em;">詳細レポート: 実行環境の <code>.data/reports/</code> を参照（<code>COMPARISON_REPORT</code>）</p>`;
}

/** プッシュ通知型メール本文（表なし・TOP棟カードのみ） */
export function renderMailDigestHtml(options: {
  prepared: PreparedComparisonReport | undefined;
  reportHref?: string | null;
  reportFilename?: string | null;
  reportAttachFallback?: boolean;
}): string {
  const { prepared, reportHref, reportFilename, reportAttachFallback } = options;
  if (!prepared || prepared.notify.length === 0) {
    return renderReportCta({
      href: reportHref,
      filename: reportFilename,
      attachFallback: reportAttachFallback ?? false,
    });
  }

  const topGroups = groupListingsByBuilding(prepared.notify).slice(
    0,
    TOP_BUILDING_LIMIT,
  );
  const cards = topGroups.map(renderBuildingCard).join("\n");

  const passedNote =
    prepared.passed.length > 0
      ? `<p style="color:#666;font-size:0.9em;margin:12px 0 0;">見送り ${prepared.passed.length} 件 — 詳細レポート内</p>`
      : "";

  return `<section style="margin:12px 0;">
<h2 style="font-size:1.05em;margin:0 0 8px;">今日の注目（ユニーク ${Math.min(TOP_BUILDING_LIMIT, groupListingsByBuilding(prepared.notify).length)} 棟）</h2>
<p style="margin:0 0 10px;color:#666;font-size:0.9em;">${escapeHtml(formatThresholdsNote(prepared.thresholds))}</p>
${renderBandSummary(prepared)}
${cards}
${passedNote}
${renderReportCta({
  href: reportHref,
  filename: reportFilename,
  attachFallback: reportAttachFallback ?? false,
})}
</section>`;
}
