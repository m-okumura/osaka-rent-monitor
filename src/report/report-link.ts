import { config } from "../config.js";

export function resolveReportPublicHref(filename: string): string | null {
  const base = config.reportPublicBaseUrl?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${filename}`;
}

export function shouldAttachReportHtml(publicHref: string | null): boolean {
  if (publicHref && !config.comparisonAttachHtml) return false;
  if (publicHref) return false;
  return config.comparisonAttachHtml;
}
