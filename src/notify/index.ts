import { config } from "../config.js";
import { resendNotifier } from "./resend.js";
import { smtpNotifier } from "./smtp.js";
import type { Notifier } from "./types.js";

export type { Notifier, MailContext } from "./types.js";

export function isNotifierConfigured(): boolean {
  if (!process.env.MAIL_TO) return false;
  if (config.notifyProvider === "resend") {
    return Boolean(process.env.RESEND_API_KEY);
  }
  return Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASSWORD,
  );
}

export function createNotifier(): Notifier {
  if (config.notifyProvider === "resend") {
    return resendNotifier;
  }
  return smtpNotifier;
}
