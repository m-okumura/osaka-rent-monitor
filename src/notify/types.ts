import type { AreaFetchSummary, ScoredListing } from "../types.js";
import type { PreparedComparisonReport } from "../report/prepare-comparison.js";

export type MailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type InquiryMailStats = {
  enabled: boolean;
  newTotal: number;
  excludedInquired: number;
  gmailSynced?: boolean;
  gmailError?: string;
};

export type MailContext = {
  summaries: AreaFetchSummary[];
  matchedCount: number;
  advisorHtml?: string;
  attachments?: MailAttachment[];
  comparisonReport?: PreparedComparisonReport;
  reportHref?: string | null;
  reportFilename?: string | null;
  /** 公開 URL が無いとき HTML 添付を使う */
  reportAttachFallback?: boolean;
  inquiry?: InquiryMailStats;
};

export type Notifier = {
  sendNewListings(
    listings: ScoredListing[],
    context: MailContext,
  ): Promise<void>;
  sendNewListingsAllInquired(context: MailContext): Promise<void>;
  sendSnapshot(listings: ScoredListing[], context: MailContext): Promise<void>;
  sendFailure(message: string): Promise<void>;
};
