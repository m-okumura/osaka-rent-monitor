import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import type { ScoredListing } from "../types.js";
import { toAdvisorFacts, type AdvisorFact } from "./facts.js";

export type AdvisorOutput = {
  html: string;
  skipped: boolean;
  reason?: string;
};

function factsToPrompt(facts: AdvisorFact[]): string {
  return JSON.stringify(
    {
      criteria:
        "大阪・あびこ/今里、1K、管理費込5.5万以下、RC優先、防音重視、心斎橋通勤、短期解約は要確認",
      listings: facts,
    },
    null,
    2,
  );
}

function markdownToSimpleHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBreaks = escaped.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
  return `<div style="color:#222;font-size:0.95em;"><p>${withBreaks}</p></div>`;
}

export async function generateGeminiAdvice(
  listings: ScoredListing[],
): Promise<AdvisorOutput> {
  if (!config.aiAdvisorEnabled) {
    return { html: "", skipped: true, reason: "AI_ADVISOR=false" };
  }
  const apiKey = config.gemini.apiKey();
  if (!apiKey) {
    return { html: "", skipped: true, reason: "GEMINI_API_KEY 未設定" };
  }

  const facts = toAdvisorFacts(listings);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    systemInstruction: `あなたは大阪賃貸の選定アドバイザーです。
入力 JSON の listings だけを根拠にしてください。JSON に無い事実（通勤分数の断定、構造、平米、家賃など）は書いてはいけません。
isLeoPalace が true の物件は「見送り推奨」に含めてください。
cancellationReview が true の物件では短期解約・違約金は「要確認」とし、断定しないでください。
心斎橋への通勤は stationAccess から推測可能な範囲のみ述べ、不明なら「要確認」。
出力は日本語 Markdown（見出し ##、箇条書き）。構成:
1. 結論（おすすめ TOP2、各1〜3行）
2. 見送り推奨（理由付き）
3. 次のアクション（不動産会社への質問例2つ）`,
  });

  const prompt = `以下の物件データを評価してください。\n\n${factsToPrompt(facts)}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) {
    return { html: "", skipped: true, reason: "Gemini 空応答" };
  }

  return {
    html: `<section style="margin:1.2em 0;padding:1em;background:#f6f8fc;border-radius:8px;">
<h2 style="margin:0 0 0.6em;font-size:1.05em;">AI 選定メモ（Gemini・JSON根拠）</h2>
${markdownToSimpleHtml(text)}
<p style="margin-top:0.8em;color:#666;font-size:0.85em;">※自動生成。契約条件・空室は必ず SUUMO / 店舗で要確認。</p>
</section>`,
    skipped: false,
  };
}
