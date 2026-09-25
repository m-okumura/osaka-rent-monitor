import type { ScoredListing } from "../types.js";
import { formatSearchConditionsShort } from "../listing-requirements.js";
import {
  comparisonRowsForListing,
  formatCell,
} from "./comparison-fields.js";

export type ComparisonReportEntry = ScoredListing & {
  reportBucket: "notify" | "passed_over";
  reportReasons: string[];
};

function escapeMdCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function propertyColumnTitle(l: ScoredListing): string {
  const name = l.detail?.propertyName || l.buildingTitle || l.id;
  const short =
    name.length > 28 ? `${name.slice(0, 28)}…` : name;
  return `${short} (${l.madori})`;
}

function buildMatrixTable(listings: ScoredListing[]): string {
  if (listings.length === 0) {
    return "_（該当なし）_\n";
  }

  const rowDefs = comparisonRowsForListing(listings[0]!);
  const headers = ["項目", ...listings.map(propertyColumnTitle)];
  const lines = [
    `| ${headers.map(escapeMdCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];

  for (const row of rowDefs) {
    const cells = [
      row.label,
      ...listings.map((l) => formatCell(l, row)),
    ].map(escapeMdCell);
    lines.push(`| ${cells.join(" | ")} |`);
  }

  return `${lines.join("\n")}\n`;
}

function reasonsBlock(entries: ComparisonReportEntry[]): string {
  return entries
    .map((e) => {
      const name = e.detail?.propertyName || e.buildingTitle || e.id;
      if (e.reportReasons.length === 0) return `- **${name}**`;
      return `- **${name}**: ${e.reportReasons.join("、")}`;
    })
    .join("\n");
}

export function buildComparisonReportMarkdown(options: {
  generatedAt: Date;
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): string {
  const { generatedAt, entries, mode } = options;
  const stamp = generatedAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const notify = entries.filter((e) => e.reportBucket === "notify");
  const passed = entries.filter((e) => e.reportBucket === "passed_over");

  const intro =
    mode === "snapshot"
      ? "スナップショット時点の該当物件"
      : "今回の新規差分物件";

  return `# 大阪 SUUMO 賃貸 横断比較レポート

- 生成: ${stamp} (JST)
- 対象: ${intro}
- 検索条件: ${formatSearchConditionsShort()}

## おすすめ候補（通知対象 ${notify.length} 件）

${notify.length > 0 ? reasonsBlock(notify) : "_なし_"}

${buildMatrixTable(notify)}

## 見送り（${passed.length} 件）

${passed.length > 0 ? reasonsBlock(passed) : "_なし_"}

${buildMatrixTable(passed)}

---

※ SUUMO 詳細 \`data_table\` の項目を横並びにしたものです。未取得項目は — 表示。契約・空室は店舗で要確認。
`;
}

export function comparisonReportFilename(generatedAt: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(generatedAt);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const ymd = `${pick("year")}${pick("month")}${pick("day")}`;
  const hm = `${pick("hour")}${pick("minute")}`;
  return `osaka-suumo-comparison-${ymd}-${hm}.md`;
}
