import type { MailAttachment } from "./types.js";

export function toNodemailerAttachments(attachments: MailAttachment[] | undefined) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: "text/markdown; charset=utf-8",
  }));
}

export function toResendAttachments(attachments: MailAttachment[] | undefined) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content, "utf-8"),
  }));
}
