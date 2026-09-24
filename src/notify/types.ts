import type { AreaFetchSummary, Listing } from "../types.js";

export type MailContext = {
  summaries: AreaFetchSummary[];
  matchedCount: number;
};

export type Notifier = {
  sendNewListings(
    listings: Listing[],
    context: MailContext,
  ): Promise<void>;
  sendSnapshot(listings: Listing[], context: MailContext): Promise<void>;
  sendFailure(message: string): Promise<void>;
};
