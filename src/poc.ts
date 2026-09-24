import { fetchSuumoHtml } from "./suumo-client.js";
import { filterListingsForMvp, parseSuumoListHtml } from "./parse-listings.js";
import { SEARCH_TARGETS } from "./suumo-urls.js";

const POC_MIN = 10;

async function runTarget(target: (typeof SEARCH_TARGETS)[number]) {
  const html = await fetchSuumoHtml(target.listUrl);
  const all = parseSuumoListHtml(html);
  const matched = filterListingsForMvp(all);

  console.log(`\n=== ${target.label} ===`);
  console.log(`URL: ${target.listUrl}`);
  console.log(
    `parsed rows: ${all.length}, 一覧要件一致: ${matched.length}`,
  );

  const sample = matched.slice(0, 3);
  for (const l of sample) {
    console.log(
      `  - ${l.madori} ${l.rentYen}円+${l.adminYen ?? 0}円=${l.totalYen}円 | ${l.floor} | ${l.detailUrl}`,
    );
  }

  return matched.length;
}

async function main() {
  let total = 0;
  for (const t of SEARCH_TARGETS) {
    total += await runTarget(t);
  }

  console.log(`\n合計（全エリア）一覧フィルタ後: ${total} 件`);
  if (total < POC_MIN) {
    console.error(`PoC 未達: 成功基準は ${POC_MIN} 件以上`);
    process.exit(1);
  }
  console.log("PoC 成功基準を満たしました。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
