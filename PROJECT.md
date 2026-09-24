# プロジェクト定義

| 項目 | 内容 |
|------|------|
| プロジェクト ID | PRJ-OSAKA |
| 名称 | 大阪・SUUMO 賃貸監視（あびこ／今里エリア） |
| GitHub（予定） | https://github.com/m-okumura/osaka-rent-monitor |
| ローカル配置 | `C:\Users\3031662\Work\1_projects\PRJ-OSAKA_SUUMO賃貸監視` |
| 親プロジェクト | **なし**（PRJ-AKIYA / `akiya-monitor` とは別 repo・別運用） |

## 目的

[SUUMO](https://suumo.jp/) 賃貸を **1日2〜3回** 監視し、条件に合う **新規掲載** をメール通知する。

## 検索条件（合意済み）

| 項目 | 内容 |
|------|------|
| エリア | **あびこ・今里** 近辺（駅・沿線は PoC で確定） |
| 通勤 | **心斎橋** 勤務想定（SUUMO 通勤検索 or 駅リスト＋分数） |
| 予算 | **管理費込み 5.5万円まで** |
| 間取り | **1K** |
| 構造 | **RC（鉄筋コンクリート）** |
| 防音 | 重視 → 一覧＋**詳細のキーワード**でスコア（PoC） |
| 解約違約金 | 自動判定は難しい → **「要確認」フラグ** で通知 |

## 通知・運用

| 項目 | 決定 |
|------|------|
| 通知 | **メールのみ**（Resend。Slack なし） |
| 実行 | GitHub Actions |
| 頻度 | **1日 2〜3回**（例: 8:00 / 13:00 / 20:00 JST） |
| 東京 JK K 監視 | **触らない**（`akiya-monitor` 独立） |

## ステータス

| フェーズ | 状態 |
|----------|------|
| 要件整理 | 完了（2026-09-24） |
| SUUMO PoC（一覧パース） | 完了（2026-09-24） |
| MVP（差分 + Resend） | 完了（2026-09-24） |
| GitHub / Secrets | 未（push 後に Settings） |
| 本番運用 | 未 |

## 関連ドキュメント

- [docs/requirements.md](./docs/requirements.md) … 詳細要件・段階リリース
- [docs/architecture.md](./docs/architecture.md) … 処理フロー（案）
- [docs/suumo-poc.md](./docs/suumo-poc.md) … SUUMO 調査チェックリスト
