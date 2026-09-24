# GitHub Actions 運用

## スケジュール（JST）

| 実行 | cron (UTC) | JST |
|------|------------|-----|
| 朝 | `0 23 * * *` | 8:00 |
| 昼 | `0 4 * * *` | 13:00 |
| 夜 | `0 11 * * *` | 20:00 |

`workflow_dispatch` で手動実行。`snapshot_email: true` で現時点一覧メール（差分無視）。

## Secrets（リポジトリ Settings）

| Name | 説明 |
|------|------|
| `RESEND_API_KEY` | Resend API |
| `MAIL_TO` | 通知先メール |

`MAIL_FROM` は未設定で OK（Resend デフォルト `onboarding@resend.dev`）。

## 環境変数（workflow で設定済み）

| 変数 | 値 |
|------|-----|
| `NOTIFY_PROVIDER` | `resend` |
| `RENT_MAX_TOTAL` | `55000` |
| `NOTIFY_ON_FIRST_RUN` | `false` |

## state

- `.data/state.json` → Actions Cache キー `osaka-rent-monitor-state`
- git には含めない

## ローカル

```bash
npm ci
npm run check          # 初回は通知スキップ + state 保存
npm run poc            # パース PoC のみ
SNAPSHOT_EMAIL=true MAIL_TO=... RESEND_API_KEY=... npm run check
```
