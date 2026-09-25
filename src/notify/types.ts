import type { AreaFetchSummary, ScoredListing } from "../types.js";
import type { PreparedComparisonReport } from "../report/prepare-comparison.js";

export type MailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type MailContext = {
  summaries: AreaFetchSummary[];
  matchedCount: number;
  advisorHtml?: string;
  attachments?: MailAttachment[];
  /** 横断比較（統合・A/B/C 区分済み）。メール本文の表に使用 */
  comparisonReport?: PreparedComparisonReport;
};

export type Notifier = {
  sendNewListings(
    listings: ScoredListing[],
    context: MailContext,
  ): Promise<void>;
  sendSnapshot(listings: ScoredListing[], context: MailContext): Promise<void>;
  sendFailure(message: string): Promise<void>;
};
