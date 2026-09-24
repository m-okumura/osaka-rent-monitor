import type { AreaFetchSummary, ScoredListing } from "../types.js";

export type MailContext = {
  summaries: AreaFetchSummary[];
  matchedCount: number;
  advisorHtml?: string;
};

export type Notifier = {
  sendNewListings(
    listings: ScoredListing[],
    context: MailContext,
  ): Promise<void>;
  sendSnapshot(listings: ScoredListing[], context: MailContext): Promise<void>;
  sendFailure(message: string): Promise<void>;
};
