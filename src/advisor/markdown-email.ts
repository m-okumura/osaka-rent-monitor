import type { AdvisorFact } from "./facts.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gemini の [text](url) や裸 URL を除去（リンクは後段で SUUMO URL に統一） */
export function normalizeGeminiMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s*\(id:\s*\d+\)/gi, "")
    .replace(/https?:\/\/\S+/g, "");
}

function linkLabelsForFact(f: AdvisorFact): string[] {
  const name = f.propertyName.trim();
  if (!name) return [];
  const labels = new Set<string>([name]);
  const floor = f.floor.trim();
  if (floor) {
    labels.add(`${name} ${floor}`);
    labels.add(`${name} [${floor}]`);
    const n = floor.match(/^(\d+)/);
    if (n) labels.add(`${name} [${n[1]}階]`);
  }
  return [...labels];
}

/** 物件名をすべて detailUrl 付きリンクに統一 */
export function linkifyPropertyNames(text: string, facts: AdvisorFact[]): string {
  const pairs: { label: string; url: string }[] = [];
  for (const f of facts) {
    for (const label of linkLabelsForFact(f)) {
      pairs.push({ label, url: f.detailUrl });
    }
  }
  pairs.sort((a, b) => b.label.length - a.label.length);

  let out = text;
  for (const { label, url } of pairs) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(escaped, "g"),
      `{{LINK:${label}::${url}}}`,
    );
  }
  return out;
}

function renderInline(line: string): string {
  const parts: string[] = [];
  const re = /\{\{LINK:([^:]+)::([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    parts.push(formatBoldSegment(line.slice(last, m.index)));
    const name = m[1]!;
    const url = m[2]!;
    parts.push(
      `<a href="${escapeHtml(url)}" style="color:#0b57d0;text-decoration:underline;">${escapeHtml(name)}</a>`,
    );
    last = m.index + m[0].length;
  }
  parts.push(formatBoldSegment(line.slice(last)));
  return parts.join("");
}

function formatBoldSegment(segment: string): string {
  const escaped = escapeHtml(segment);
  return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** メール向け Markdown サブセット（## / 箇条書き） */
export function renderAdvisorMarkdownToHtml(md: string, facts: AdvisorFact[]): string {
  const normalized = normalizeGeminiMarkdown(md);
  const linked = linkifyPropertyNames(normalized, facts);

  const lines = linked.split("\n");
  const htmlParts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      htmlParts.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      closeList();
      htmlParts.push(
        `<h3 style="margin:1em 0 0.35em;font-size:1em;color:#111;">${renderInline(trimmed.slice(3))}</h3>`,
      );
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul style="margin:0.2em 0 0.6em;padding-left:1.2em;">');
        inList = true;
      }
      htmlParts.push(
        `<li style="margin:0.3em 0;line-height:1.45;">${renderInline(trimmed.replace(/^[-*]\s/, ""))}</li>`,
      );
      continue;
    }

    if (trimmed === "") {
      closeList();
      continue;
    }

    closeList();
    htmlParts.push(
      `<p style="margin:0.35em 0;line-height:1.45;">${renderInline(trimmed)}</p>`,
    );
  }
  closeList();

  return `<div style="color:#222;font-size:0.95em;">${htmlParts.join("\n")}</div>`;
}
