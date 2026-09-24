import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import type { ScoredListing } from "../types.js";
import { toAdvisorFacts, type AdvisorFact } from "./facts.js";
import { renderAdvisorMarkdownToHtml } from "./markdown-email.js";

/** 404 になった旧モデルは含めない。503 時はリトライ後に次へ */
const MODEL_FALLBACKS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

const RETRYABLE_ATTEMPTS = 3;

export type AdvisorOutput = {
  html: string;
  skipped: boolean;
  reason?: string;
  modelUsed?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableError(msg: string): boolean {
  return /503|429|UNAVAILABLE|overloaded|Resource exhausted|high demand/i.test(
    msg,
  );
}

function isNotFoundError(msg: string): boolean {
  return /404|not found|no longer available|is not found for API/i.test(msg);
}

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
入力 JSON の listings だけを根拠にしてください。JSON に無い事実（構造、平米、家賃など）を捏造しないでください。
構造のおすすめ判定は structureEffective を正とし、structureKind（掲載表記）は参考に留めてください。
structureConflict が true、または structureTrust が conflict_safe_side の物件は、掲載が RC でも RC として TOP おすすめに入れないでください（structureEffective が rc でない限り）。
isLeoPalace が true の物件は「見送り推奨」に含めてください。
cancellationClass が review の物件では cancellationMailLabel / cancellationHints をそのまま参照し、違約金を断定しないでください。term_only は契約期間のみ確度が高いです。
心斎橋通勤は commuteHintShinsaibashi が非 null ならその文言を要約に使ってよい（目安である旨は短く触れる）。null のときだけ stationAccess ベースで控えめに書くか「要確認」。
出力は日本語 Markdown（見出し ##、箇条書き - ）。
物件名は JSON の propertyName をそのまま使う。**物件名** で強調してよい。
Markdown のリンク [text](url) や URL は書かない（メール側で SUUMO リンクを付与する）。
id フィールドを本文に繰り返さない。
1行に複数物件を「/」で並べない。見送りは物件ごとに箇条書き1行。
構成:
1. 結論（おすすめ TOP2、各1〜3行）
2. 見送り推奨（理由付き）
3. 次のアクション（不動産会社への質問例2つ）`;

/** 503 が続く 3.x の前に、比較的安定な 2.0 を1巡挟む */
const STABLE_AFTER_PREFERRED = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

function modelCandidates(): string[] {
  const preferred = config.gemini.model;
  const stable = STABLE_AFTER_PREFERRED.filter((m) => m !== preferred);
  const stableSet = new Set<string>(STABLE_AFTER_PREFERRED);
  const rest = MODEL_FALLBACKS.filter(
    (m) => m !== preferred && !stableSet.has(m),
  );
  return [preferred, ...stable, ...rest];
}

async function generateWithModelOnce(
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

async function generateWithModel(
  apiKey: string,
  modelName: string,
  prompt: string,
): Promise<string> {
  let lastMsg = "";
  for (let attempt = 0; attempt < RETRYABLE_ATTEMPTS; attempt++) {
    try {
      return await generateWithModelOnce(apiKey, modelName, prompt);
    } catch (error) {
      lastMsg = errorMessage(error);
      if (isNotFoundError(lastMsg)) throw error;
      if (isRetryableError(lastMsg) && attempt < RETRYABLE_ATTEMPTS - 1) {
        const waitMs = 2000 * (attempt + 1);
        console.warn(
          `Gemini ${modelName} 混雑/503 → ${waitMs}ms 後にリトライ (${attempt + 2}/${RETRYABLE_ATTEMPTS})`,
        );
        await sleep(waitMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error(lastMsg || "Gemini unknown error");
}

function escapeHtmlModel(name: string): string {
  return name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function advisorUnavailableHtml(reason: string): string {
  const short = reason.slice(0, 180).replace(/</g, "&lt;");
  return `<section style="margin:1.2em 0;padding:0.85em 1em;background:#fff8e6;border-radius:8px;border:1px solid #f0e0a0;">
<p style="margin:0;color:#553;font-size:0.95em;"><strong>AI 選定メモ</strong>は Google API の都合で省略しました（503 等）。<strong>ルールスコア TOP</strong>と物件一覧を参照してください。</p>
<p style="margin:0.5em 0 0;color:#887;font-size:0.8em;">${short}</p>
</section>`;
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
      const msg = errorMessage(error);
      errors.push(`${modelName}: ${msg.slice(0, 160)}`);
      console.warn(`Gemini ${modelName} 失敗: ${msg.slice(0, 120)}`);
    }
  }

  const reason = `全モデル失敗 (${errors.join(" | ")})`;
  return {
    html: advisorUnavailableHtml(reason),
    skipped: true,
    reason,
  };
}
