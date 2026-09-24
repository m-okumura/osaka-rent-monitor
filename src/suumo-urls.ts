/** SUUMO 賃貸一覧の共通クエリ（管理費込上限・1K） */
const RENT_QUERY =
  "cb=0.0&ct=5.5&mb=0&mt=9999999&shkr1=03&shkr2=03&shkr3=03&shkr4=03&fw=1K";

export type SuumoSearchTarget = {
  id: string;
  label: string;
  /** 監視用の固定 URL（マンション = 賃貸マンション系） */
  listUrl: string;
};

/** PoC / MVP v0: 今里・あびこ（御堂筋線） */
export const SEARCH_TARGETS: SuumoSearchTarget[] = [
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
];

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
