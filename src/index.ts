import path from "node:path";
import { generateGeminiAdvice } from "./advisor/gemini.js";
import { collectListings } from "./collect-listings.js";
import { config } from "./config.js";
import { enrichAndScoreListings } from "./enrich-details.js";
import { createNotifier, isNotifierConfigured } from "./notify/index.js";
import { diffListingIds, loadState, saveState } from "./state.js";
import type { Listing, ScoredListing } from "./types.js";

async function prepareForMail(raw: Listing[]): Promise<{
  scored: ScoredListing[];
  advisorHtml: string;
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
  const scored = await enrichAndScoreListings(raw);

  console.log("AI アドバイス生成…");
  const advisor = await generateGeminiAdvice(scored);
  if (advisor.skipped) {
    console.warn(
      `AI スキップ: ${advisor.reason ?? "不明"}（メール送信は続行）`,
    );
  }

  return { scored, advisorHtml: advisor.html };
}

async function main(): Promise<void> {
  const statePath = path.resolve(process.cwd(), config.statePath);
  const notifier = createNotifier();

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
    const { scored, advisorHtml } = await prepareForMail(listings);
    const mailContext = {
      summaries,
      matchedCount: listings.length,
      advisorHtml,
    };
    console.log(
      `スナップショット: ${scored.length} 件をメール送信します（${config.notifyProvider}）`,
    );
    await notifier.sendSnapshot(scored, mailContext);
    await saveState(statePath, currentIds);
    return;
  }

  const previous = await loadState(statePath);
  const previousIds = new Set(previous?.listingIds ?? []);
  const isFirstRun = previous === null;

  await saveState(statePath, currentIds);

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

  const { scored, advisorHtml } = await prepareForMail(newListings);
  const mailContext = {
    summaries,
    matchedCount: listings.length,
    advisorHtml,
  };

  console.log(
    `新規 ${scored.length} 件をメール送信します（${config.notifyProvider}）`,
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
