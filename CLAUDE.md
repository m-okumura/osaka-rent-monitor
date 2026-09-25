# CLAUDE.md（AI 向け）

## 概要

- **PRJ-OSAKA**: 大阪 SUUMO 賃貸の新規掲載監視 + メール通知
- **リポジトリ（予定）**: `m-okumura/osaka-rent-monitor`
- **PRJ-AKIYA（`akiya-monitor`）とは別管理**。JKK 用コード・workflow を混ぜない

## 技術方針

- Node.js 22 + TypeScript（`tsx`）
- cheerio（SUUMO HTML）
- Resend / `src/notify/`（東京版と同パターン）
- GitHub Actions Cron **1日3回** + Cache（state）

## コーディング方針

1. **SUUMO 仕様追随** 以外は変更最小
2. **取得頻度** — 合意した 2〜3回/日を超えない（規約・負荷）
3. **state** — git に含めない
4. **解約・防音** — 断定せず `要確認` / スコアで明示
5. 利用規約・robots を確認し、PoC 結果を `docs/suumo-poc.md` に残す

## 環境変数

| 変数 | 説明 |
|------|------|
| `RESEND_API_KEY` / `MAIL_TO` | 通知（Actions Secrets） |
| `RENT_MAX_TOTAL` | 管理費込上限（デフォルト 85000） |
| `MIN_AREA_SQM` | 専有面積下限（デフォルト 28） |
| `MADORI` | 許可間取り（デフォルト `1K,1DK,1LDK`） |
| `NOTIFY_PROVIDER` | `resend`（デフォルト） |
| `NOTIFY_ON_FIRST_RUN` | `true` で初回も通知 |
| `SNAPSHOT_EMAIL` | `true` で差分無視の一覧メール |
| `STATE_PATH` | デフォルト `.data/state.json` |
| `GEMINI_API_KEY` | v1 AI 選定（任意） |
| `AI_ADVISOR` | `false` で Gemini オフ |
| `DETAIL_FETCH` | `false` で詳細 GET オフ |
| `COMPARISON_REPORT` | `false` で比較 HTML 添付オフ（デフォルト ON） |
| `REPORTS_DIR` | 比較レポート保存先（デフォルト `.data/reports`） |
| `ACCESS_FILTER` | `false` で最寄り私鉄除外オフ |

詳細: `docs/access-filter.md`

詳細: `docs/operations-github-actions.md`
