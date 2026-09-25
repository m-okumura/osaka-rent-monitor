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

export type ComparisonMailBundle = {
  prepared: PreparedComparisonReport;
  reportFilename: string;
  reportHtml: string;
};

export async function writeComparisonReportHtmlFile(options: {
  prepared: PreparedComparisonReport;
  mode: "new" | "snapshot";
  generatedAt?: Date;
  html?: string;
  filename?: string;
}): Promise<string> {
  const generatedAt = options.generatedAt ?? new Date();
  const content =
    options.html ??
    buildComparisonReportHtml({
      generatedAt,
      prepared: options.prepared,
      mode: options.mode,
    });
  const filename = options.filename ?? comparisonReportFilename(generatedAt);
  const dir = path.resolve(process.cwd(), config.reportsDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), content, "utf-8");
  return filename;
}

/** 比較データ + ブラウザ用 HTML（メール本文には載せない） */
export async function prepareComparisonForMail(options: {
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): Promise<ComparisonMailBundle | null> {
  if (options.entries.length === 0) return null;

  const generatedAt = new Date();
  const prepared = prepareComparisonReport(options.entries);
  const reportHtml = buildComparisonReportHtml({
    generatedAt,
    prepared,
    mode: options.mode,
  });
  const reportFilename = comparisonReportFilename(generatedAt);

  if (config.comparisonReportEnabled) {
    await writeComparisonReportHtmlFile({
      prepared,
      mode: options.mode,
      generatedAt,
      html: reportHtml,
      filename: reportFilename,
    });
    console.log(`比較レポート保存: ${reportFilename}（${config.reportsDir}）`);
  }

  if (prepared.mergeStats.mergedAway > 0) {
    console.log(
      `  重複統合: ${prepared.mergeStats.before} → ${prepared.mergeStats.after} 件`,
    );
  }

  return { prepared, reportFilename, reportHtml };
}
