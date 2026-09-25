import {
  groupByActionBand,
  resolveActionBandThresholds,
  type ActionBand,
  type ActionBandThresholds,
} from "./action-bands.js";
import type { ComparisonReportEntry } from "./comparison-report-entry.js";
import {
  mergeStats,
  sanitizeComparisonEntries,
  type SanitizedComparisonEntry,
} from "./comparison-sanitize.js";

export type PreparedComparisonReport = {
  notify: SanitizedComparisonEntry[];
  passed: SanitizedComparisonEntry[];
  notifyRawCount: number;
  mergeStats: { before: number; after: number; mergedAway: number };
  thresholds: ActionBandThresholds;
  notifyByBand: Record<ActionBand, SanitizedComparisonEntry[]>;
};

export function prepareComparisonReport(
  entries: ComparisonReportEntry[],
): PreparedComparisonReport {
  const notifyRaw = entries.filter((e) => e.reportBucket === "notify");
  const passedRaw = entries.filter((e) => e.reportBucket === "passed_over");
  const notify = sanitizeComparisonEntries(notifyRaw);
  const passed = sanitizeComparisonEntries(passedRaw);
  const thresholds = resolveActionBandThresholds(notify);
  const notifyByBand = groupByActionBand(notify, thresholds);

  return {
    notify,
    passed,
    notifyRawCount: notifyRaw.length,
    mergeStats: mergeStats(notifyRaw.length, notify.length),
    thresholds,
    notifyByBand,
  };
}
