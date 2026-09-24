# アーキテクチャ（案）

```mermaid
sequenceDiagram
  participant GA as GitHub Actions
  participant App as src/index.ts
  participant SUUMO as suumo.jp
  participant Cache as Actions Cache
  participant Mail as Resend

  GA->>App: npm run check（1日2〜3回）
  App->>SUUMO: 条件付き検索 GET
  SUUMO-->>App: 一覧 HTML
  App->>App: パース・フィルタ・差分
  App->>Cache: state 読書
  App->>Cache: state 保存
  alt 新規あり
    App->>Mail: 通知メール
  optional v1
    App->>SUUMO: 新規のみ詳細 GET
    App->>App: 防音キーワード / 要確認
  end
```

## モジュール（予定）

| パス | 役割 |
|------|------|
| `src/suumo-client.ts` | 検索 URL・取得 |
| `src/parse-listings.ts` | 一覧パース |
| `src/filter.ts` | 家賃込・1K・RC |
| `src/detail.ts` | 詳細（v1） |
| `src/state.ts` | `.data/state.json` |
| `src/notify/` | Resend（akiya-monitor と同型） |
| `src/index.ts` | オーケストレーション |

## 物件 ID

PoC 後に確定（SUUMO 物件 URL または bukkenId）。
