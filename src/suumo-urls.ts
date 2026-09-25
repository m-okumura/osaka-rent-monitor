/**
 * SUUMO 賃貸一覧の共通クエリ（管理費込上限 8.5 万・1K/1DK/1LDK）
 * 専有 28㎡以上は URL の mb=28 がエラーになるためアプリ側で判定
 */
const RENT_QUERY =
  "cb=0.0&ct=8.5&mb=0&mt=9999999&shkr1=03&shkr2=03&shkr3=03&shkr4=03&fw=1K&fw=1DK&fw=1LDK";

export type SuumoSearchTarget = {
  id: string;
  label: string;
  /** 監視用の固定 URL（マンション = 賃貸マンション系） */
  listUrl: string;
};

/** 監視対象駅（御堂筋・谷町・長堀 等） */
export const SEARCH_TARGETS: SuumoSearchTarget[] = [
  {
    id: "showacho",
    label: "昭和町駅（御堂筋線 ek_18770・西田辺周辺含む）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_18770/mansion/?${RENT_QUERY}`,
  },
  {
    id: "tamatsukuri",
    label: "玉造駅（長堀鶴見緑地線・JR ek_23520）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_23520/mansion/?${RENT_QUERY}`,
  },
  {
    id: "nakatsu",
    label: "中津駅（御堂筋線 ek_27221）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_27221/mansion/?${RENT_QUERY}`,
  },
  {
    id: "tanimachi4",
    label: "谷町四丁目駅（谷町線・中央線 ek_23380）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_23380/mansion/?${RENT_QUERY}`,
  },
  {
    id: "imasato",
    label: "今里駅（千日前線 ek_03621）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_03621/mansion/?${RENT_QUERY}`,
  },
  {
    id: "abiko",
    label: "あびこ駅（御堂筋線 ek_01200）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_01200/mansion/?${RENT_QUERY}`,
  },
  {
    id: "honmachi",
    label: "本町駅（御堂筋線・中央線 ek_35470）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_35470/mansion/?${RENT_QUERY}`,
  },
  {
    id: "esaka",
    label: "江坂駅（御堂筋線 ek_04840）",
    listUrl: `https://suumo.jp/chintai/osaka/ek_04840/mansion/?${RENT_QUERY}`,
  },
];

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
