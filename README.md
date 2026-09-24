# PRJ-OSAKA — 大阪 SUUMO 賃貸監視

心斎橋勤務想定で、**あびこ・今里** 近辺の SUUMO 賃貸（1K・賃貸マンション・管理費込 5.5万まで）の **新規物件** をメール通知します。

- **GitHub（予定）**: [m-okumura/osaka-rent-monitor](https://github.com/m-okumura/osaka-rent-monitor)
- **東京 JK K 監視**: 別プロジェクト [`akiya-monitor`](../PRJ-AKIYA_JKK空き家監視)

## コマンド

```bash
npm ci
npm run check   # 監視 1 回（初回は state のみ）
npm run poc     # パース PoC
npm run build
```

## ステータス

**MVP 実装済み**（GitHub push・Secrets 設定で本番可）。防音・RC 厳密判定・通勤は v1。

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [PROJECT.md](./PROJECT.md) | 案件定義 |
| [CLAUDE.md](./CLAUDE.md) | AI / 開発ルール |
| [docs/requirements.md](./docs/requirements.md) | 条件・段階リリース |
| [docs/suumo-poc.md](./docs/suumo-poc.md) | PoC 結果 |
| [docs/operations-github-actions.md](./docs/operations-github-actions.md) | Actions / Secrets |
