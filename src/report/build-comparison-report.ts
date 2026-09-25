export type { ComparisonReportEntry } from "./comparison-report-entry.js";
export {
  propertyColumnTitle,
  listingDisplayName,
} from "./build-comparison-report-shared.js";
export { buildComparisonReportHtml } from "./build-comparison-report-html.js";
export {
  prepareComparisonReport,
  type PreparedComparisonReport,
} from "./prepare-comparison.js";

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
  return `osaka-suumo-comparison-${ymd}-${hm}.html`;
}
