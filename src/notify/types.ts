import type { AreaFetchSummary, ScoredListing } from "../types.js";

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
};

export type Notifier = {
  sendNewListings(
    listings: ScoredListing[],
    context: MailContext,
  ): Promise<void>;
  sendSnapshot(listings: ScoredListing[], context: MailContext): Promise<void>;
  sendFailure(message: string): Promise<void>;
};
