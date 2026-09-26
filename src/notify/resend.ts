import { Resend } from "resend";
import type { ScoredListing } from "../types.js";
import { config } from "../config.js";
import {
  buildAllInquiredSkippedMail,
  buildFailureMail,
  buildNewListingsMail,
  buildSnapshotMail,
} from "./messages.js";
import { toResendAttachments } from "./mail-attachments.js";
import type { MailContext, Notifier } from "./types.js";

function client(): Resend {
  return new Resend(config.resend.apiKey());
}

export const resendNotifier: Notifier = {
  async sendNewListings(listings: ScoredListing[], context: MailContext): Promise<void> {
    const { subject, html } = buildNewListingsMail(listings, context);
    const { error } = await client().emails.send({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
      attachments: toResendAttachments(context.attachments),
    });
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
  },

  async sendNewListingsAllInquired(context: MailContext): Promise<void> {
    const { subject, html } = buildAllInquiredSkippedMail(context);
    const { error } = await client().emails.send({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
    });
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
  },

  async sendSnapshot(listings: ScoredListing[], context: MailContext): Promise<void> {
    const { subject, html } = buildSnapshotMail(listings, context);
    const { error } = await client().emails.send({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
      attachments: toResendAttachments(context.attachments),
    });
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
  },

  async sendFailure(message: string): Promise<void> {
    const { subject, html } = buildFailureMail(message);
    const { error } = await client().emails.send({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
    });
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
  },
};
