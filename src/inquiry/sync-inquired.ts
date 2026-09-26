import { config } from "../config.js";
import { fetchInquiredBcFromGmailSent } from "./gmail-inquired.js";
import {
  mergeInquiredBc,
  parseInquiredBcExtra,
} from "./suumo-codes.js";

export type InquiredSyncResult = {
  enabled: boolean;
  inquiredBc: string[];
  fromState: number;
  fromGmail: number;
  fromExtra: number;
  gmailError?: string;
};

/** state + Gmail Sent + 手動 bc をマージ */
export async function syncInquiredBc(
  stateInquired: string[],
): Promise<InquiredSyncResult> {
  const extra = parseInquiredBcExtra(config.inquiry.extraBc);
  const base = mergeInquiredBc(stateInquired, extra);

  if (!config.inquiry.enabled) {
    return {
      enabled: false,
      inquiredBc: base,
      fromState: stateInquired.length,
      fromGmail: 0,
      fromExtra: extra.length,
    };
  }

  const creds = config.inquiry.gmailCredentials();
  if (!creds) {
    console.warn(
      "INQUIRY_FILTER は有効ですが Gmail 認証が未設定のため、state/手動 bc のみ使います",
    );
    return {
      enabled: true,
      inquiredBc: base,
      fromState: stateInquired.length,
      fromGmail: 0,
      fromExtra: extra.length,
    };
  }

  try {
    const fromGmail = await fetchInquiredBcFromGmailSent({
      ...creds,
      lookbackDays: config.inquiry.gmailLookbackDays,
      maxMessages: config.inquiry.gmailMaxMessages,
      searchExtra: config.inquiry.gmailSearchExtra,
    });
    const merged = mergeInquiredBc(base, fromGmail);
    return {
      enabled: true,
      inquiredBc: merged,
      fromState: stateInquired.length,
      fromGmail: fromGmail.size,
      fromExtra: extra.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Gmail 問合済み同期失敗（state/手動 bc のみ）: ${msg}`);
    return {
      enabled: true,
      inquiredBc: base,
      fromState: stateInquired.length,
      fromGmail: 0,
      fromExtra: extra.length,
      gmailError: msg,
    };
  }
}

export function inquiredSetFromList(codes: string[]): Set<string> {
  return new Set(codes);
}
