/** SUUMO 詳細から拾える解約・契約の分類（違約金の断定はしない） */
export type CancellationClass = "review" | "term_only" | "not_listed";

export type CancellationInfo = {
  class: CancellationClass;
  /** メール1行ラベル */
  mailLabel: string;
  contractTerm: string | null;
  /** 要確認理由（キーワード等） */
  hints: string[];
};

const REVIEW_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /短期解約/, label: "短期解約" },
  { re: /違約金/, label: "違約金" },
  { re: /解約制限/, label: "解約制限" },
  { re: /固定期間.*?解約|解約.*?固定期間/, label: "固定期間" },
  { re: /満了前解約|解約.*?満了前/, label: "満了前解約" },
  { re: /残(?:り)?賃料/, label: "残賃料" },
  { re: /解約予告.*?(?:違約|ペナルティ|料)/, label: "解約予告" },
  { re: /(?:最低|最小).*?(?:住|期間)/, label: "最低住期間" },
];

function normalizeField(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t === "-") return null;
  return t;
}

function findReviewHints(corpus: string): string[] {
  const hints: string[] = [];
  for (const { re, label } of REVIEW_PATTERNS) {
    if (re.test(corpus)) hints.push(label);
  }
  return [...new Set(hints)];
}

export function analyzeCancellation(options: {
  contractTermRaw: string | null | undefined;
  remarksRaw: string | null | undefined;
  extraTexts: string[];
}): CancellationInfo {
  const contractTerm = normalizeField(options.contractTermRaw);
  const remarks = normalizeField(options.remarksRaw);
  const corpus = [contractTerm, remarks, ...options.extraTexts]
    .filter(Boolean)
    .join("\n");

  const hints = findReviewHints(corpus);

  if (hints.length > 0) {
    const hintText = hints.slice(0, 3).join("・");
    return {
      class: "review",
      mailLabel: `解約条件:要確認（${hintText}の記載）`,
      contractTerm,
      hints,
    };
  }

  if (contractTerm) {
    return {
      class: "term_only",
      mailLabel: `契約:${contractTerm}（解約・違約金は店舗確認）`,
      contractTerm,
      hints: [],
    };
  }

  return {
    class: "not_listed",
    mailLabel: "解約条件:SUUMO概要に記載なし",
    contractTerm: null,
    hints: [],
  };
}
