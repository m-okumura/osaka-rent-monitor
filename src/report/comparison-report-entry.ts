import type { ScoredListing } from "../types.js";

export type ComparisonReportEntry = ScoredListing & {
  reportBucket: "notify" | "passed_over";
  reportReasons: string[];
};
