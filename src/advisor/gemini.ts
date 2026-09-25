import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import { formatSearchConditionsShort } from "../listing-requirements.js";
import type { ScoredListing } from "../types.js";
import { toAdvisorFacts, type AdvisorFact } from "./facts.js";
import { renderAdvisorMarkdownToHtml } from "./markdown-email.js";

function budgetManYenLabel(): string {
  return (config.rentMaxTotal / 10_000).toLocaleString("ja-JP", {
    maximumFractionDigits: 1,
  });
}

/** AI メモ用の住環境・評価軸（criteria / system で共有） */
const LIFESTYLE_EVALUATION_GUIDANCE = [
  "街の好み（荻窪南口ライク）: ビジネス街・繁華街のど真ん中（無機質なオフィス街、チェーン店だらけの商業地）は好まない。駅前に日常の買い物（スーパー等）がありつつ、物件周辺は落ち着いた住宅街の情緒や個人店があるエリア（東京でいう荻窪南口・西荻窪・目黒寄りの落ち着き）を高く評価する",
  "通勤: 心斎橋徒歩圏にこだわりすぎない。電車で10〜15分程度なら、住環境の静けさ・落ち着きを優先して加点する（commuteHintShinsaibashi は目安）",
  "生活動線: 徒歩5分以内に普段使いのスーパー・コンビニがあり自炊・日常買い物がストレスなくできるかを評価。appealTexts / equipmentTags / scoreReasons に記載があれば根拠にする。記載がなければ店名・距離を捏造せず「周辺の買い物動線は要確認（内見・地図）」と書く",
].join("\n");

function advisorCriteriaText(): string {
  const budgetMan = budgetManYenLabel();
  return [
    `予算: 管理費込${budgetMan}万円以下（listings はこの範囲で抽出済み）`,
    "住環境優先（荻窪南口ライク）: 昭和町・玉造・中津・谷町四丁目など、閑静な住宅街＋駅前生活利便を高評価。本町・江坂は整いすぎ/オフィス街の無機質さが出やすいので加点は控えめ",
    LIFESTYLE_EVALUATION_GUIDANCE,
    "監視駅（searchArea）: 昭和町・玉造・中津・谷町四丁目・今里・あびこ・本町・江坂",
    `物件の硬条件: ${formatSearchConditionsShort()}`,
    "防音は加点要素。解約・違約金は cancellationClass / cancellationMailLabel を参照し断定しない",
  ].join("\n\n");
}

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
      criteria: advisorCriteriaText(),
      listings: facts,
    },
    null,
    2,
  );
}

function systemInstruction(): string {
  const budgetMan = budgetManYenLabel();
  return `あなたは大阪賃貸の選定アドバイザーです。
ユーザーの前提: 管理費込${budgetMan}万円以下（totalYen）。「住む街」の質を最優先し、職住近接は二の次（心斎橋徒歩圏にこだわらない）。
評価軸:
${LIFESTYLE_EVALUATION_GUIDANCE}
エリアの優先: searchArea / stationAccess から、昭和町・玉造・中津（御堂筋・長堀周辺の落ち着き）や谷町四丁目など荻窪南口ライクな候補を TOP おすすめに優先する。本町・江坂は便利だが無機質・整いすぎになりやすいので、同等なら上記エリアを上に置く。今里・あびこは家賃・通勤の参考枠。
入力 JSON の listings だけを根拠にしてください。JSON に無い事実（構造、平米、家賃、店舗名、距離など）を捏造しないでください。
構造のおすすめ判定は structureEffective を正とし、structureKind（掲載表記）は参考に留めてください。
structureConflict が true、または structureTrust が conflict_safe_side の物件は、掲載が RC でも RC として TOP おすすめに入れないでください（structureEffective が rc でない限り）。
isLeoPalace が true の物件は「見送り推奨」に含めてください。
cancellationClass が review の物件では cancellationMailLabel / cancellationHints をそのまま参照し、違約金を断定しないでください。term_only は契約期間のみ確度が高いです。
心斎橋通勤は commuteHintShinsaibashi を参考程度に触れてよい（目安・待ち時間除く）。徒歩分数や直通の短さだけで高得点にしない。電車10〜15分でも静かな住環境ならプラス評価する。
出力は日本語 Markdown（見出し ##、箇条書き - ）。
物件名は JSON の propertyName をそのまま使う。**物件名** で強調してよい。
Markdown のリンク [text](url) や URL は書かない（メール側で SUUMO リンクを付与する）。
id フィールドを本文に繰り返さない。
1行に複数物件を「/」で並べない。見送りは物件ごとに箇条書き1行。
構成:
1. 結論（おすすめ TOP2、各1〜3行）
2. 見送り推奨（理由付き）
3. 次のアクション（不動産会社への質問例2つ）`;
}

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
    systemInstruction: systemInstruction(),
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
