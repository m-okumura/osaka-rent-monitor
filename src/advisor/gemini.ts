import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import type { ScoredListing } from "../types.js";
import { toAdvisorFacts, type AdvisorFact } from "./facts.js";
import { renderAdvisorMarkdownToHtml } from "./markdown-email.js";

/** API 廃止時のフォールバック（先頭から試行） */
const MODEL_FALLBACKS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
] as const;

export type AdvisorOutput = {
  html: string;
  skipped: boolean;
  reason?: string;
  modelUsed?: string;
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

const SYSTEM_INSTRUCTION = `あなたは大阪賃貸の選定アドバイザーです。
入力 JSON の listings だけを根拠にしてください。JSON に無い事実（通勤分数の断定、構造、平米、家賃など）は書いてはいけません。
isLeoPalace が true の物件は「見送り推奨」に含めてください。
cancellationClass が review の物件では cancellationMailLabel / cancellationHints をそのまま参照し、違約金を断定しないでください。term_only は契約期間のみ確度が高いです。
心斎橋への通勤は stationAccess から推測可能な範囲のみ述べ、不明なら「要確認」。
出力は日本語 Markdown（見出し ##、箇条書き - ）。
物件名は JSON の propertyName をそのまま使う。**物件名** で強調してよい。
Markdown のリンク [text](url) や URL は書かない（メール側で SUUMO リンクを付与する）。
id フィールドを本文に繰り返さない。
1行に複数物件を「/」で並べない。見送りは物件ごとに箇条書き1行。
構成:
1. 結論（おすすめ TOP2、各1〜3行）
2. 見送り推奨（理由付き）
3. 次のアクション（不動産会社への質問例2つ）`;

function modelCandidates(): string[] {
  const preferred = config.gemini.model;
  const rest = MODEL_FALLBACKS.filter((m) => m !== preferred);
  return [preferred, ...rest];
}

async function generateWithModel(
  apiKey: string,
  modelName: string,
  prompt: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
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
  const prompt = `以下の物件データを評価してください。\n\n${factsToPrompt(facts)}`;
  const errors: string[] = [];

  for (const modelName of modelCandidates()) {
    try {
      const text = await generateWithModel(apiKey, modelName, prompt);
      if (!text) {
        errors.push(`${modelName}: 空応答`);
        continue;
      }
      console.log(`Gemini 成功: ${modelName}`);
      const bodyHtml = renderAdvisorMarkdownToHtml(text, facts);
      return {
        modelUsed: modelName,
        html: `<section style="margin:1.2em 0;padding:1em;background:#f6f8fc;border-radius:8px;">
<h2 style="margin:0 0 0.6em;font-size:1.05em;">AI 選定メモ（Gemini / ${escapeHtmlModel(modelName)}）</h2>
${bodyHtml}
<p style="margin-top:0.8em;color:#666;font-size:0.85em;">※JSON 根拠の自動要約。契約条件・空室は SUUMO / 店舗で要確認。</p>
</section>`,
        skipped: false,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${modelName}: ${msg.slice(0, 200)}`);
      console.warn(`Gemini ${modelName} 失敗: ${msg.slice(0, 120)}`);
    }
  }

  return {
    html: "",
    skipped: true,
    reason: `全モデル失敗 (${errors.join(" | ")})`,
  };
}

function escapeHtmlModel(name: string): string {
  return name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
