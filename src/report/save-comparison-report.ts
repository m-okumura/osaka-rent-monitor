import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import type { MailAttachment } from "../notify/types.js";
import {
  buildComparisonReportHtml,
  comparisonReportFilename,
  type ComparisonReportEntry,
} from "./build-comparison-report.js";

export async function buildComparisonMailAttachment(options: {
  entries: ComparisonReportEntry[];
  mode: "new" | "snapshot";
}): Promise<MailAttachment | null> {
  if (!config.comparisonReportEnabled || options.entries.length === 0) {
    return null;
  }

  const generatedAt = new Date();
  const content = buildComparisonReportHtml({
    generatedAt,
    entries: options.entries,
    mode: options.mode,
  });
  const filename = comparisonReportFilename(generatedAt);

  const dir = path.resolve(process.cwd(), config.reportsDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), content, "utf-8");

  return {
    filename,
    content,
    contentType: "text/html; charset=utf-8",
  };
}
