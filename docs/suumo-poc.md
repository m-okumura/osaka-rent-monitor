# SUUMO PoC チェックリスト



実装前に **ブラウザと 1 回の fetch** で埋める。



## 1. 検索条件の固定



- [x] エリア: **今里** `ek_03621` / **あびこ** `ek_01200` / **谷町四丁目** `ek_23380` / **本町** `ek_35470` / **江坂** `ek_04840`

- [ ] 心斎橋通勤: SUUMO の「通勤・通学」が使えるか（駅・分数）→ **v1**。一覧 URL には未反映

- [x] 家賃上限 8.5万（管理費込）: クエリ `ct=8.5`（下限 `cb=0.0`）

- [x] 間取り: `fw=1K&fw=1DK&fw=1LDK` + `shkr1=03&…&shkr4=03`

- [x] 専有 28㎡以上: **`mb=28` は SUUMO がエラー** → アプリ側 `MIN_AREA_SQM=28`

- [x] 設備・RC/SRC: 詳細ページのタグ・構造表で判定（通知対象のみ GET）

- [x] RC 近似: パス `/mansion/`（賃貸マンション）



### 監視用 URL（`src/suumo-urls.ts` と同期）



| エリア | URL |

|--------|-----|

| 今里 | `src/suumo-urls.ts` の `RENT_QUERY` 参照 |

| あびこ | 同上 |

| 谷町四丁目 | 同上 |

| 本町 | 同上 |

| 江坂 | 同上 |



## 2. HTML



- [x] 一覧 DOM: `div.cassetteitem` → 建物ヘッダ + `tr.js-cassette_link` 行

- [x] 家賃/管理費: `.cassetteitem_price--rent` / `--administration`

- [x] 間取り: `.cassetteitem_madori`

- [x] 安定キー: `input.js-clipkey`（SUUMO 物件コード）+ 詳細 `jnc_*` URL

- [x] 詳細 URL: `/chintai/jnc_000109787963/` 形式



## 3. 規約・マナー



- [x] `robots.txt`: `/chintai/` 一覧は Disallow なし（2026-09-24 確認）。問い合わせ系 JJ パスは多数 Disallow

- [x] 利用規約: 自動アクセスは **1日2〜3回** を守る（PoC は `npm run poc` の手動のみ）



## 4. 防音・解約（v1）



- [ ] 詳細 HTML で拾えるキーワード例

- [ ] 解約違約金は **要確認** のみとする旨を通知文に明記



## PoC 成功基準



- 固定 URL から **10件以上** を一覧フィルタ後に取得できる（家賃・間取り・面積）



### 実行結果（2026-09-24）



```bash

npm run poc

```



| エリア | パース行数 | 1K & 管理費込≤5.5万 |

|--------|-----------|---------------------|

| 今里 | 42 | 8 |

| あびこ | 40 | 13 |

| **合計** | 82 | **21** |



→ 成功基準クリア（実装: `src/parse-listings.ts`, `src/poc.ts`）。


