import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import {
  buildComparisonReportHtml,
  comparisonReportFilename,
  prepareComparisonReport,
  type ComparisonReportEntry,
  type PreparedComparisonReport,
} from "./build-comparison-report.js";

export { prepareComparisonReport, type PreparedComparisonReport };

export async function writeComparisonReportHtmlFile(options: {
  prepared: PreparedComparisonReport;
  mode: "new" | "snapshot";
  generatedAt?: Date;
}): Promise<string> {
  const generatedAt = options.generatedAt ?? new Date();
  const content = buildComparisonReportHtml({
    generatedAt,
    prepared: options.prepared,
    mode: options.mode,
  });
  const filename = comparisonReportFilename(generatedAt);
  const dir = path.resolve(process.cwd(), config.reportsDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), content, "utf-8");
  return filename;
}

/** メール用データ準備 + 任意でローカル HTML 保存（添付なし） */
export async function prepareComparisonForMail(options: {
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): Promise<PreparedComparisonReport | null> {
  if (options.entries.length === 0) return null;

  const prepared = prepareComparisonReport(options.entries);

  if (config.comparisonReportEnabled) {
    const filename = await writeComparisonReportHtmlFile({
      prepared,
      mode: options.mode,
    });
    console.log(`比較レポート保存: ${filename}（${config.reportsDir}）`);
  }

  if (prepared.mergeStats.mergedAway > 0) {
    console.log(
      `  重複統合: ${prepared.mergeStats.before} → ${prepared.mergeStats.after} 件`,
    );
  }

  return prepared;
}
