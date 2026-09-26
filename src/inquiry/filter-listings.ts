import type { Listing } from "../types.js";
import { listingMatchesInquired } from "./suumo-codes.js";

export function partitionByInquired<T extends Listing>(
  listings: T[],
  inquired: ReadonlySet<string>,
): { uninquired: T[]; inquired: T[] } {
  const uninquired: T[] = [];
  const inquiredList: T[] = [];
  for (const l of listings) {
    if (listingMatchesInquired(l, inquired)) inquiredList.push(l);
    else uninquired.push(l);
  }
  return { uninquired, inquired: inquiredList };
}
