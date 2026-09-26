# Gmail 問合済みフィルタ

新規差分のうち **まだ問い合わせていない物件だけ** を通知メールに載せる。

## 判定

1. **state**（`.data/state.json` の `inquiredBc`）— 過去 run で Gmail から拾ったコード
2. **Gmail 送信済み**（直近 90 日、`suumo` を含む Sent）— 本文から `bc=` / SUUMO 物件コード
3. **`INQUIRED_BC_EXTRA`** — 電話問合など Gmail に残らない分を手動追加

いずれかに一致した **SUUMO 部屋コード** は除外。新規がすべて問合済みのときは **短い1通**（詳細 GET / AI / 比較 HTML なし）。

## Secrets（GitHub Actions）

| Name | 説明 |
|------|------|
| `GMAIL_CLIENT_ID` | OAuth クライアント ID |
| `GMAIL_CLIENT_SECRET` | OAuth クライアントシークレット |
| `GMAIL_REFRESH_TOKEN` | リフレッシュトークン（`gmail.readonly`） |
| `INQUIRED_BC_EXTRA` | 任意。カンマ区切り SUUMO 物件コード |

`GMAIL_REFRESH_TOKEN` を設定すると **フィルタはデフォルト ON**。オフにする場合は `INQUIRY_FILTER=false`。

## OAuth 初回設定（個人 Gmail）

**ゴール:** クライアント ID / シークレット / **refresh token** の3つを GitHub Secrets に入れる。  
**所要:** 15〜20分。**Gemini API キーとは別**（Gmail 読み取り用）。

既存プロジェクト **`analyzeSample`** のままでOK（新規プロジェクト不要）。

---

### ステップ A — Gmail API を有効化

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 画面上部のプロジェクト名が **`analyzeSample`** になっていることを確認
3. 左の **≡ メニュー** → **API とサービス** → **ライブラリ**  
   （ホームの「クイックアクセス」の **API API とサービス** から入ってもよい）
4. 検索框に **`Gmail`** → **Gmail API** をクリック
5. **有効にする** を押す（すでに有効ならそのまま次へ）

---

### ステップ B — アプリ情報（新 UI: Google Auth プラットフォーム）

いま見えている **「OAuth の概要」**（左メニュー **概要**）は、まだクライアント未作成の状態で正常。**ここでは B/C の設定を左メニューから行う。**

入り方（どちらか）:

- 左 **≡** → **Google Auth プラットフォーム**（または **API とサービス** → **OAuth 同意画面** → 新 UI にリダイレクト）

#### B-1. ブランディング

1. 左 **ブランディング** をクリック
2. **ページ上部**（ロゴより上）にある **アプリ名** も必須。見えなければ **上にスクロール**
3. 次をすべて埋める（新 UI では **ホームページ・プライバシーポリシー URL も必須**）

   | 項目 | 入力例（このリポジトリの場合） |
   |------|--------------------------------|
   | **アプリ名** | `osaka-rent-monitor` |
   | **ユーザーサポートメール** | 自分の Gmail |
   | **アプリケーションのホームページ** | **自分の DNS で所有するドメイン** の URL（Sites/GitHub は不可） |
   | **プライバシーポリシー リンク** | 同上ドメイン上のページ |
   | **利用規約リンク** | 空欄でOK（任意） |
   | **デベロッパーの連絡先情報** | 自分の Gmail |

4. **承認済みドメイン** → その **ルートドメイン**（例: `example.com`）のみ。**`google.com` は絶対に入れない**
5. ロゴは **未設定でOK**
6. **保存**

##### なぜ `google.com` エラーになるか（Sites でも同じ）

Sites の URL（`sites.google.com/...`）を入れると、Google はルートを **`google.com`** とみなす。  
**google.com は誰も Search Console で所有証明できない** → 「ドメインが見つかりません」が消えない。  
`github.com` も同様。**Google Sites / GitHub だけではブランディング保存は通らない** ことが多い。

##### ルート A — 独自ドメインがある

1. [Search Console](https://search.google.com/search-console) → **ドメイン** → 例 `example.com` → DNS に **TXT** 追加 → 確認
2. ホーム / プライバシーを **そのドメイン** の URL に変更
3. **承認済みドメイン** = `example.com` → **保存**

##### ルート B — 独自ドメインがない（おすすめ）

**ブランディングは保存しなくてよい。** 先に OAuth クライアントだけ作る。

1. **承認済みドメイン** の **`google.com` を削除**（空でOK）
2. 左 **対象** → **テストユーザー** に問合 Gmail を追加
3. 左 **クライアント** → **OAuth クライアントを作成** → **デスクトップ** → ID/Secret
4. ドキュメント **ステップ D**（OAuth Playground）へ

※ クライアント作成でブランディング必須と出たら **ルート A** か **ルート C**

##### ルート C — Gmail 連携を一旦やめる

GitHub Secret: `INQUIRY_FILTER=false`。問合済みは **`INQUIRED_BC_EXTRA`** に物件コードを手動追加。

※ 右の「ブランディングを確認」は **押さなくてよい**（テスト利用のみなら不要）。

#### B-2. 対象（テストユーザー）

1. 左 **対象** をクリック
2. **ユーザーの種類** が **外部** になっていることを確認（個人 Gmail なら **外部**）
3. **公開ステータス** は **テスト** のままでOK
4. **テストユーザー** → **ユーザーを追加** → **SUUMO 問合に使う Gmail** を1件追加 → **保存**

※ テストユーザーに **載っていない** アカウントでは、後の Playground ログインが `access_denied` になる。

#### B-3. データアクセス（任意）

1. 左 **データアクセス** を開く
2. **スコープを追加** から `.../auth/gmail.readonly` を追加してもよいが、**Playground でスコープを指定するなら未設定でも可**（テスト段階はスキップしてよい）

---

### ステップ C — OAuth クライアント（デスクトップ）

**新 UI（いまの画面）**

1. 左 **クライアント** をクリック（または **概要** 画面の **OAuth クライアントを作成**）
2. **アプリケーションの種類:** **デスクトップ**（**Web アプリケーション** ではない）
3. **名前:** 例 `osaka-rent-gmail-readonly` → **作成**
4. 表示された **クライアント ID** と **クライアント シークレット** をメモ  
   → GitHub の `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET`

**旧 UI しか出ない場合**

1. **API とサービス** → **認証情報** → **＋ 認証情報を作成** → **OAuth クライアント ID** → **デスクトップアプリ**

---

### ステップ C-2 — Playground 用 Web クライアント（Playground で redirect エラーが出る場合）

Playground は **デスクトップ** クライアントと相性が悪いことがある。**Web アプリケーション** を **もう1つ** 作る。

1. **クライアント** → **OAuth クライアントを作成**
2. 種類: **ウェブ アプリケーション**
3. **承認済みのリダイレクト URI** に **1件だけ** 追加:

   `https://developers.google.com/oauthplayground`

4. 作成 → この **Web 用** ID/Secret を Playground と GitHub Secrets に使う（デスクトップの ID は使わない）

---

### ステップ D — Refresh token を取る（OAuth Playground）

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) を開く
2. 右上 **⚙（設定）** を開く  
   - **Use your own OAuth credentials** に **チェック**  
   - **OAuth Client ID / secret:** ステップ **C-2（Web）** の ID/Secret（redirect エラーなら C-2 必須）  
   - **Access type:** `Offline`  
   - **Force prompt:** `Consent Screen`（refresh_token 用）  
   - 閉じる
3. 左の一覧ではなく、下の **「Input your own scopes」** に次を **1行で** 貼る:

   `https://www.googleapis.com/auth/gmail.readonly`

4. **Authorize APIs** → Google ログイン（**テストユーザーに追加した同じ Gmail**）
5. 「Google hasn't verified this app」→ **Advanced（詳細）** → **Go to … (unsafe)** で進む（自分用アプリなので問題ない）
6. Gmail の **読み取り** を **許可**
7. **Exchange authorization code for tokens** をクリック
8. 右側 JSON の **`refresh_token`** の値をコピー（ `"` は含めない）  
   → GitHub の `GMAIL_REFRESH_TOKEN`  
   ※ `refresh_token` が出ないときは [Playground の設定で Force prompt](https://developers.google.com/oauthplayground/) や、Google アカウント → セキュリティ → 第三者アクセスから一度アプリを削除して D をやり直し

---

### ステップ E — GitHub Secrets

リポジトリ **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|--------|
| `GMAIL_CLIENT_ID` | ステップ C |
| `GMAIL_CLIENT_SECRET` | ステップ C |
| `GMAIL_REFRESH_TOKEN` | ステップ D |

保存後、Actions を **workflow_dispatch** で1回実行。ログに  
`Gmail 送信済み: … 通解析 → 問合済みコード … 件`  
が出れば成功。

---

### よくあるつまずき

| 症状 | 対処 |
|------|------|
| `access_denied` / 403 | OAuth 同意画面の **テストユーザー** にその Gmail を追加 |
| refresh_token が空 | 上記 D のやり直し（アプリアクセス削除 → 再 Authorize） |
| GitHub で Gmail エラー | Client ID/Secret が **デスクトップ** か、Playground に **同じ** ID/Secret を入れたか確認 |
| フィルタしたくない | Secret を消すか `INQUIRY_FILTER=false` |

## 環境変数

| 変数 | デフォルト | 説明 |
|------|------------|------|
| `INQUIRY_FILTER` | Gmail 認証があれば on | `false` で無効 |
| `GMAIL_SENT_LOOKBACK_DAYS` | 90 | Sent 検索の日数 |
| `GMAIL_SENT_MAX_MESSAGES` | 120 | 1 run あたり本文解析の上限 |
| `GMAIL_SENT_SEARCH_EXTRA` | — | Gmail 検索 q に追加（例: `label:SUUMO`） |

## 運用メモ

- 問合メールに **SUUMO の URL または物件コード** が入っているほど確実
- Gmail 同期に失敗しても **state + INQUIRED_BC_EXTRA** だけでフィルタ継続（警告ログ）
- スナップショットメール（`SNAPSHOT_EMAIL`）はフィルタ対象外
