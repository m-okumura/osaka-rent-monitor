import type { MailAttachment } from "./types.js";

function attachmentContentType(a: MailAttachment): string {
  if (a.contentType) return a.contentType;
  if (a.filename.endsWith(".html")) return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export function toNodemailerAttachments(attachments: MailAttachment[] | undefined) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: attachmentContentType(a),
  }));
}

export function toResendAttachments(attachments: MailAttachment[] | undefined) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content, "utf-8"),
  }));
}
