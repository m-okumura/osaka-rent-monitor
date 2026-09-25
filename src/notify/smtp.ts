import nodemailer from "nodemailer";
import type { ScoredListing } from "../types.js";
import { config } from "../config.js";
import {
  buildFailureMail,
  buildNewListingsMail,
  buildSnapshotMail,
} from "./messages.js";
import { toNodemailerAttachments } from "./mail-attachments.js";
import type { MailContext, Notifier } from "./types.js";

function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host(),
    port: config.smtp.port(),
    auth: {
      user: config.smtp.user(),
      pass: config.smtp.password(),
    },
  });
}

export const smtpNotifier: Notifier = {
  async sendNewListings(listings: ScoredListing[], context: MailContext): Promise<void> {
    const { subject, html } = buildNewListingsMail(listings, context);
    await createTransporter().sendMail({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
      attachments: toNodemailerAttachments(context.attachments),
    });
  },

  async sendSnapshot(listings: ScoredListing[], context: MailContext): Promise<void> {
    const { subject, html } = buildSnapshotMail(listings, context);
    await createTransporter().sendMail({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
      attachments: toNodemailerAttachments(context.attachments),
    });
  },

  async sendFailure(message: string): Promise<void> {
    const { subject, html } = buildFailureMail(message);
    await createTransporter().sendMail({
      from: config.notify.from(),
      to: config.notify.to(),
      subject,
      html,
    });
  },
};
