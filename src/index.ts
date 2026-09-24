import path from "node:path";
import { collectListings } from "./collect-listings.js";
import { config } from "./config.js";
import { createNotifier, isNotifierConfigured } from "./notify/index.js";
import { diffListingIds, loadState, saveState } from "./state.js";

async function main(): Promise<void> {
  const statePath = path.resolve(process.cwd(), config.statePath);
  const notifier = createNotifier();

  console.log("大阪 SUUMO 賃貸監視を開始します…");
  const { listings, summaries } = await collectListings();
  const mailContext = {
    summaries,
    matchedCount: listings.length,
  };

  for (const s of summaries) {
    console.log(
      `${s.searchArea}: サイト ${s.siteTotal ?? "?"} 件 / パース ${s.parsedRows} 行`,
    );
  }
  console.log(`フィルタ後（重複除く）: ${listings.length} 件`);

  const currentIds = listings.map((l) => l.id);

  if (config.snapshotEmail) {
    console.log(
      `スナップショット: ${listings.length} 件をメール送信します（${config.notifyProvider}）`,
    );
    await notifier.sendSnapshot(listings, mailContext);
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

  console.log(
    `新規 ${newListings.length} 件をメール送信します（${config.notifyProvider}）`,
  );
  await notifier.sendNewListings(newListings, mailContext);
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
