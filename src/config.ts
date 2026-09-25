export type NotifyProvider = "smtp" | "resend";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value;
}

function optionalInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`環境変数 ${name} は整数である必要があります`);
  }
  return n;
}

function parseNotifyProvider(): NotifyProvider {
  const raw = process.env.NOTIFY_PROVIDER ?? "resend";
  if (raw === "smtp" || raw === "resend") {
    return raw;
  }
  throw new Error(
    `環境変数 NOTIFY_PROVIDER は smtp または resend である必要があります（現在: ${raw}）`,
  );
}

const notifyProvider = parseNotifyProvider();

function defaultFromAddress(): string {
  if (notifyProvider === "resend") {
    return "Osaka Rent Monitor <onboarding@resend.dev>";
  }
  return "Osaka Rent Monitor <monitor@localhost>";
}

function resolveFromAddress(): string {
  const raw = process.env.MAIL_FROM?.trim();
  if (raw) return raw;
  return defaultFromAddress();
}

function optionalEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw || undefined;
}

function parseMadoriList(raw: string | undefined): string[] {
  const source = raw?.trim() || "1K,1DK,1LDK";
  const items = source
    .split(/[,、/|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) {
    throw new Error("環境変数 MADORI に有効な間取りがありません");
  }
  return items;
}

export const config = {
  statePath: process.env.STATE_PATH ?? ".data/state.json",
  /** 家賃+管理費の上限（円） */
  rentMaxTotal: optionalInt("RENT_MAX_TOTAL") ?? 85_000,
  /** 専有面積の下限（㎡）。一覧に無い場合は詳細で再判定 */
  minAreaSqm: optionalInt("MIN_AREA_SQM") ?? 28,
  madoriAllowed: parseMadoriList(process.env.MADORI),
  /** @deprecated 表示互換。先頭の許可間取り */
  get madori(): string {
    return this.madoriAllowed[0] ?? "1K";
  },
  notifyOnFirstRun: process.env.NOTIFY_ON_FIRST_RUN === "true",
  snapshotEmail: process.env.SNAPSHOT_EMAIL === "true",
  detailFetchEnabled: process.env.DETAIL_FETCH !== "false",
  aiAdvisorEnabled: process.env.AI_ADVISOR !== "false",
  /** 最寄り1行目が私鉄のみ等なら除外 */
  accessFilterEnabled: process.env.ACCESS_FILTER !== "false",
  comparisonReportEnabled: process.env.COMPARISON_REPORT !== "false",
  reportsDir: process.env.REPORTS_DIR ?? ".data/reports",
  /** メール・レポートの A 区分（固定モード時） */
  actionScoreBandA: optionalInt("ACTION_SCORE_A") ?? 100,
  /** メール・レポートの B 区分下限（固定モード時） */
  actionScoreBandB: optionalInt("ACTION_SCORE_B") ?? 98,
  /** fixed | dynamic（dynamic は最高 score と spread で A/B を決める） */
  actionBandMode:
    process.env.ACTION_BAND_MODE === "dynamic" ? "dynamic" : "fixed",
  actionBandDynamicSpread: optionalInt("ACTION_BAND_SPREAD") ?? 3,
  notifyProvider,
  gemini: {
    apiKey: () => optionalEnv("GEMINI_API_KEY"),
    model: optionalEnv("GEMINI_MODEL") ?? "gemini-3.8-flash",
  },
  notify: {
    to: () => requireEnv("MAIL_TO"),
    from: () => resolveFromAddress(),
  },
  resend: {
    apiKey: () => requireEnv("RESEND_API_KEY"),
  },
  smtp: {
    host: () => requireEnv("MAIL_HOST"),
    port: () => Number.parseInt(requireEnv("MAIL_PORT"), 10),
    user: () => requireEnv("MAIL_USER"),
    password: () => requireEnv("MAIL_PASSWORD"),
  },
};
