# PRJ-OSAKA 記憶

## 2026-09-24

- PoC: 今里 `ek_03621` + あびこ `ek_01200`、マンション + `ct=5.5` + `fw=1K`
- MVP: `collect-listings` → `filter` → `state` 差分 → Resend（akiya 同型）
- 初回 `npm run check` で 21 ID を `.data/state.json` に保存（通知スキップ）
- GitHub: https://github.com/m-okumura/osaka-rent-monitor （main push 済み）
- 本番: Secrets 設定済み。Actions 手動成功（snapshot / 差分）。cron 8/13/20 JST
- v1: `parse-detail` + `score` + `advisor/gemini`（通知対象のみ詳細 GET）。`GEMINI_API_KEY` を repo Secret に追加
