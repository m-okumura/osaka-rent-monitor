import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import type { MailAttachment } from "../notify/types.js";
import {
  buildComparisonReportHtml,
  comparisonReportFilename,
  prepareComparisonReport,
  type ComparisonReportEntry,
  type PreparedComparisonReport,
} from "./build-comparison-report.js";

export type ComparisonMailArtifacts = {
  attachment: MailAttachment | null;
  prepared: PreparedComparisonReport | null;
};

export async function buildComparisonMailArtifacts(options: {
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): Promise<ComparisonMailArtifacts> {
  if (!config.comparisonReportEnabled || options.entries.length === 0) {
    return { attachment: null, prepared: null };
  }

  const generatedAt = new Date();
  const prepared = prepareComparisonReport(options.entries);
  const content = buildComparisonReportHtml({
    generatedAt,
    prepared,
    mode: options.mode,
  });
  const filename = comparisonReportFilename(generatedAt);

  const dir = path.resolve(process.cwd(), config.reportsDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), content, "utf-8");

  return {
    prepared,
    attachment: {
      filename,
      content,
      contentType: "text/html; charset=utf-8",
    },
  };
}

/** @deprecated buildComparisonMailArtifacts を使用 */
export async function buildComparisonMailAttachment(options: {
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): Promise<MailAttachment | null> {
  const { attachment } = await buildComparisonMailArtifacts(options);
  return attachment;
}
