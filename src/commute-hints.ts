/** 監視エリア向け・心斎橋通勤の参考（乗換・待ち除く目安） */
const SHINSAIBASHI_BY_STATION: Readonly<Record<string, string>> = {
  今里:
    "長堀鶴見緑地線で心斎橋まで直通約9分（目安・待ち時間除く）",
  あびこ: "御堂筋線で心斎橋まで直通約16分（目安・待ち時間除く）",
  森ノ宮: "中央線→御堂筋線など乗換で心斎橋約15〜20分（目安）",
  鶴橋: "JR→御堂筋線など乗換で心斎橋約15〜20分（目安）",
};

/** SUUMO 最寄り行から駅名を抽出（1行目想定） */
export function extractStationName(accessLine: string): string | null {
  const line = accessLine.replace(/\s+/g, " ").trim();
  if (!line) return null;

  const quoted = line.match(/「([^」]+)」/);
  if (quoted?.[1]) return quoted[1].trim();

  const beforeWalk = line.match(/^(.+?)駅/);
  if (beforeWalk?.[1]) {
    const chunk = beforeWalk[1].replace(/.*[/／]/, "").trim();
    if (chunk) return chunk;
  }

  return null;
}

export function commuteHintToShinsaibashi(
  stationAccessLines: string[],
): string | null {
  for (const line of stationAccessLines) {
    const station = extractStationName(line);
    if (!station) continue;
    const hint = SHINSAIBASHI_BY_STATION[station];
    if (hint) {
      return `${station}駅 → ${hint}`;
    }
  }
  return null;
}
