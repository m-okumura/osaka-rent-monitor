# PRJ-OSAKA 記憶

## 2026-09-25

- 検索条件更新: 家賃込上限 **85,000**（`RENT_MAX_TOTAL` / `ct=8.5`）、**28㎡+**、1K/1DK/1LDK
- 詳細必須: バス・トイレ別・独立洗面・室内洗濯・**RC/SRC**（`listing-requirements.ts` + `enrich-details`）
- 監視駅追加: 谷町四丁目 `ek_23380` / 本町 `ek_35470` / 江坂 `ek_04840`（既存 今里・あびこ）
- SUUMO: `mb=28` はエラー → 面積はコード判定。`fw=1K&fw=1DK&fw=1LDK` は有効

## 2026-09-24

- PoC: 今里 `ek_03621` + あびこ `ek_01200`、マンション + `ct=5.5` + `fw=1K`
- MVP: `collect-listings` → `filter` → `state` 差分 → Resend（akiya 同型）
- 初回 `npm run check` で 21 ID を `.data/state.json` に保存（通知スキップ）
- GitHub: https://github.com/m-okumura/osaka-rent-monitor （main push 済み）
- 本番: Secrets 設定済み。Actions 手動成功（snapshot / 差分）。cron 8/13/20 JST
- v1: `parse-detail` + `score` + `advisor/gemini`（通知対象のみ詳細 GET）。`GEMINI_API_KEY` を repo Secret に追加
- 最寄り1行目フィルタ（DENY 私鉄 / ALLOW 地下鉄・JR）。cron は新規差分のみ（`docs/access-filter.md`）
- Gemini: 旧 Run の「Re-run jobs」は **当時の commit のまま**（2.5/1.5 404）。main 最新で **workflow_dispatch 新規実行**すること
- `6a002f4` 503 リトライ + 2.0 系フォールバック / `3187801` 503 時は 2.0 を 3.6 より先に試行。Run `35964671252` で `gemini-3.6-flash` 成功
- 同一建物 `structureEffective`（表記割れ→鉄骨優先）+ `commuteHintShinsaibashi`（今里9分/あびこ16分目安）を facts 注入
- 限界: クロールに1部屋しか無い誤RC掲載は検知できない（複数掲載が同バッチに要る）
