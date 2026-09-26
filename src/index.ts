import path from "node:path";
import { generateGeminiAdvice } from "./advisor/gemini.js";
import { collectListings } from "./collect-listings.js";
import { config } from "./config.js";
import { enrichAndScoreListings } from "./enrich-details.js";
import { createNotifier, isNotifierConfigured } from "./notify/index.js";
import type { MailAttachment } from "./notify/types.js";
import {
  prepareComparisonForMail,
  type ComparisonMailBundle,
} from "./report/save-comparison-report.js";
import {
  resolveReportPublicHref,
  shouldAttachReportHtml,
} from "./report/report-link.js";
import type { PreparedComparisonReport } from "./report/prepare-comparison.js";
import { partitionByInquired } from "./inquiry/filter-listings.js";
import {
  inquiredSetFromList,
  syncInquiredBc,
} from "./inquiry/sync-inquired.js";
import { diffListingIds, loadState, saveState } from "./state.js";
import type { InquiryMailStats } from "./notify/types.js";
import type { Listing, ScoredListing } from "./types.js";

async function prepareForMail(
  raw: Listing[],
  mode: "new" | "snapshot",
): Promise<{
  scored: ScoredListing[];
  advisorHtml: string;
  comparisonReport?: PreparedComparisonReport;
  reportHref?: string | null;
  reportFilename?: string | null;
  attachments?: MailAttachment[];
  reportAttachFallback?: boolean;
}> {
  if (!config.detailFetchEnabled || raw.length === 0) {
    const scored = raw.map((l) => ({
      ...l,
      score: 0,
      tier: "neutral" as const,
      scoreReasons: ["詳細未取得"],
    }));
    return { scored, advisorHtml: "" };
  }

  console.log(`詳細ページ取得 (${raw.length} 件)…`);
  const batch = await enrichAndScoreListings(raw);

  console.log("AI アドバイス生成…");
  const advisor = await generateGeminiAdvice(batch.forNotification);
  if (advisor.skipped) {
    console.warn(
      `AI スキップ: ${advisor.reason ?? "不明"}（メール送信は続行）`,
    );
  }

  const bundle = await prepareComparisonForMail({
    entries: batch.forReport,
    mode,
  });
  const mailExtras = bundle ? mailExtrasFromComparisonBundle(bundle) : {};

  return {
    scored: batch.forNotification,
    advisorHtml: advisor.html,
    ...mailExtras,
  };
}

function mailExtrasFromComparisonBundle(bundle: ComparisonMailBundle): {
  comparisonReport: PreparedComparisonReport;
  reportHref: string | null;
  reportFilename: string;
  attachments?: MailAttachment[];
  reportAttachFallback: boolean;
} {
  const reportHref = resolveReportPublicHref(bundle.reportFilename);
  const attach = shouldAttachReportHtml(reportHref);
  return {
    comparisonReport: bundle.prepared,
    reportHref,
    reportFilename: bundle.reportFilename,
    reportAttachFallback: attach,
    attachments: attach
      ? [
          {
            filename: bundle.reportFilename,
            content: bundle.reportHtml,
            contentType: "text/html; charset=utf-8",
          },
        ]
      : undefined,
  };
}

function inquiryMailStats(
  sync: Awaited<ReturnType<typeof syncInquiredBc>>,
  newTotal: number,
  excludedInquired: number,
): InquiryMailStats {
  return {
    enabled: sync.enabled,
    newTotal,
    excludedInquired,
    gmailSynced: sync.enabled && sync.fromGmail > 0,
    gmailError: sync.gmailError,
  };
}

async function main(): Promise<void> {
  const statePath = path.resolve(process.cwd(), config.statePath);
  const notifier = createNotifier();

  const previous = await loadState(statePath);
  const inquiredSync = await syncInquiredBc(previous?.inquiredBc ?? []);
  const inquiredSet = inquiredSetFromList(inquiredSync.inquiredBc);
  if (inquiredSync.enabled) {
    console.log(
      `問合済みコード: ${inquiredSync.inquiredBc.length} 件（Gmail +${inquiredSync.fromGmail} / 手動 +${inquiredSync.fromExtra}）`,
    );
  }

  console.log("大阪 SUUMO 賃貸監視を開始します…");
  const { listings, summaries } = await collectListings();

  for (const s of summaries) {
    console.log(
      `${s.searchArea}: サイト ${s.siteTotal ?? "?"} 件 / パース ${s.parsedRows} 行`,
    );
  }
  console.log(`フィルタ後（重複除く）: ${listings.length} 件`);

  const currentIds = listings.map((l) => l.id);

  if (config.snapshotEmail) {
    const mailPayload = await prepareForMail(listings, "snapshot");
    const { scored, advisorHtml, ...reportMail } = mailPayload;
    const mailContext = {
      summaries,
      matchedCount: listings.length,
      advisorHtml,
      attachments: mailPayload.attachments,
      ...reportMail,
    };
    console.log(
      `スナップショット: ${scored.length} 件をメール送信します（${config.notifyProvider}）`,
    );
    await notifier.sendSnapshot(scored, mailContext);
    await saveState(statePath, currentIds, inquiredSync.inquiredBc);
    return;
  }

  const previousIds = new Set(previous?.listingIds ?? []);
  const isFirstRun = previous === null;

  await saveState(statePath, currentIds, inquiredSync.inquiredBc);

  const newIds = diffListingIds(previousIds, currentIds);
  const newListings = listings.filter((l) => newIds.includes(l.id));

  if (isFirstRun && !config.notifyOnFirstRun) {
    console.log(
      `初回実行のため通知をスキップしました（保存 ID: ${currentIds.length} 件）`,
    );
    return;
  }

  if (newListings.length === 0) {
    console.log("新規物件はありません");
    return;
  }

  const partitioned = config.inquiry.enabled
    ? partitionByInquired(newListings, inquiredSet)
    : { uninquired: newListings, inquired: [] as typeof newListings };

  if (partitioned.inquired.length > 0) {
    console.log(
      `問合済みのため除外: ${partitioned.inquired.length} 件（未問合 ${partitioned.uninquired.length} 件）`,
    );
  }

  const inquiryStats = inquiryMailStats(
    inquiredSync,
    newListings.length,
    partitioned.inquired.length,
  );

  if (partitioned.uninquired.length === 0) {
    console.log("新規はあるがすべて問合済み — 短い通知メールを送信");
    await notifier.sendNewListingsAllInquired({
      summaries,
      matchedCount: listings.length,
      inquiry: inquiryStats,
    });
    return;
  }

  const mailPayload = await prepareForMail(partitioned.uninquired, "new");
  const { scored, advisorHtml, ...reportMail } = mailPayload;
  const mailContext = {
    summaries,
    matchedCount: listings.length,
    advisorHtml,
    attachments: mailPayload.attachments,
    inquiry: inquiryStats,
    ...reportMail,
  };

  console.log(
    `新規・未問合 ${scored.length} 件をメール送信します（${config.notifyProvider}）`,
  );
  await notifier.sendNewListings(scored, mailContext);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  try {
    if (isNotifierConfigured()) {
      await createNotifier().sendFailure(message);
    }
  } catch (mailError) {
    console.error("失敗通知メールも送信できませんでした:", mailError);
  }
  process.exit(1);
});
