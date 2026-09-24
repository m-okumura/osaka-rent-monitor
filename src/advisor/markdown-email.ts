import type { AdvisorFact } from "./facts.js";

const PH_START = "\uE000";
const PH_END = "\uE001";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Gemini の [text](url) や裸 URL、壊れた LINK プレースホルダを除去 */
export function normalizeGeminiMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s*\(id:\s*\d+\)/gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\{\{LINK(?::[^}]*)?\}\}/g, "")
    .replace(/\*\*\s*\*\*/g, "");
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

function buildLabelUrlMap(facts: AdvisorFact[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of facts) {
    for (const label of linkLabelsForFact(f)) {
      if (!map.has(label)) map.set(label, f.detailUrl);
    }
  }
  return map;
}

function isPlaceholderSegment(part: string): boolean {
  return part.startsWith(PH_START) && part.endsWith(PH_END);
}

function placeholder(index: number): string {
  return `${PH_START}${index}${PH_END}`;
}

type LinkRegistry = { name: string; url: string }[];

/** 物件名 → SUUMO リンク（二重置換・ネストを防ぐ） */
export function linkifyPropertyNames(
  text: string,
  facts: AdvisorFact[],
): { text: string; registry: LinkRegistry } {
  const labelToUrl = buildLabelUrlMap(facts);
  const labels = [...labelToUrl.keys()].sort((a, b) => b.length - a.length);
  const registry: LinkRegistry = [];

  const linkifyPlainSegment = (segment: string): string => {
    let s = segment;
    for (const label of labels) {
      const url = labelToUrl.get(label)!;
      const esc = escapeRegExp(label);

      s = s.replace(new RegExp(`\\*\\*${esc}\\*\\*`, "g"), () => {
        const idx = registry.length;
        registry.push({ name: label, url });
        return placeholder(idx);
      });

      const parts = s.split(/(\uE000\d+\uE001)/);
      s = parts
        .map((part) => {
          if (isPlaceholderSegment(part)) return part;
          return part.replace(new RegExp(esc, "g"), () => {
            const idx = registry.length;
            registry.push({ name: label, url });
            return placeholder(idx);
          });
        })
        .join("");
    }
    return s;
  };

  const segments = text.split(/(\uE000\d+\uE001)/);
  const out = segments
    .map((part) => (isPlaceholderSegment(part) ? part : linkifyPlainSegment(part)))
    .join("");

  return { text: out, registry };
}

function renderInline(line: string, registry: LinkRegistry): string {
  const parts: string[] = [];
  const re = /\uE000(\d+)\uE001/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    parts.push(formatBoldSegment(line.slice(last, m.index)));
    const entry = registry[Number.parseInt(m[1]!, 10)];
    if (entry) {
      parts.push(
        `<a href="${escapeHtml(entry.url)}" style="color:#0b57d0;text-decoration:underline;">${escapeHtml(entry.name)}</a>`,
      );
    } else {
      parts.push(escapeHtml(m[0]));
    }
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
export function renderAdvisorMarkdownToHtml(
  md: string,
  facts: AdvisorFact[],
): string {
  const normalized = normalizeGeminiMarkdown(md);
  const { text: linked, registry } = linkifyPropertyNames(normalized, facts);

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
        `<h3 style="margin:1em 0 0.35em;font-size:1em;color:#111;">${renderInline(trimmed.slice(3), registry)}</h3>`,
      );
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul style="margin:0.2em 0 0.6em;padding-left:1.2em;">');
        inList = true;
      }
      htmlParts.push(
        `<li style="margin:0.3em 0;line-height:1.45;">${renderInline(trimmed.replace(/^[-*]\s/, ""), registry)}</li>`,
      );
      continue;
    }

    if (trimmed === "") {
      closeList();
      continue;
    }

    closeList();
    htmlParts.push(
      `<p style="margin:0.35em 0;line-height:1.45;">${renderInline(trimmed, registry)}</p>`,
    );
  }
  closeList();

  return `<div style="color:#222;font-size:0.95em;">${htmlParts.join("\n")}</div>`;
}
