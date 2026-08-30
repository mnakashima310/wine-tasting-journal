# Wine Tasting Journal

ワインの味を言葉にする練習帳。日本ソムリエ協会の用語選択用紙に沿ったテイスティングノートを記録し、ブラインドの答え合わせと品種ごとの振り返りができるPWAです。

- 赤／白／ロゼ／オレンジ／泡でタイプ別の用語に切替
- ブラインド時は自分の回答と正解を並べて記録、品種別の正答率を集計
- 品種ごとの模範回答を登録し、自分・正解・模範を並べて比較
- 全記録をExcelで書き出し
- アカウントごとにデータを分離（行レベルセキュリティ）

**すべて無料で運用できます。** ラベル写真の自動読み取りだけは有料のClaude APIを使うため、初期設定ではオフになっています（手順8で後から追加できます）。

---

## 用意するもの

| | 用途 | 費用 |
|---|---|---|
| GitHubアカウント | コードの保管、週1回のキープアライブ | 無料 |
| Supabaseアカウント | データベース・ログイン・写真保存 | 無料 |
| Vercelアカウント | 公開 | 無料 |

---

## 1. GitHub に登録する

[github.com/signup](https://github.com/signup) でメールアドレス・パスワード・ユーザー名を入力します。認証コードがメールに届くので入力すれば完了です。プランを聞かれたら **Free** を選びます。

登録できたら、右上の「+」→ **New repository** で置き場所を作ります。

- Repository name: `wine-tasting-journal`
- 公開設定: **Public**（Privateだと後述のキープアライブに実行時間の上限がつきます。コードに秘密の情報は入りません）
- ほかは初期設定のまま Create repository

作られた画面に出るコマンドを、このフォルダで実行します。

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/wine-tasting-journal.git
git push -u origin main
```

`.env` は `.gitignore` に入っているので、鍵がアップロードされることはありません。

---

## 2. Supabase を用意する

[supabase.com](https://supabase.com) を開き、**Sign in with GitHub** でログインします。組織を作るときに **Free** プランを選択。続いて New project で、

- Name: `wine-tasting-journal`
- Database Password: 自動生成して控えておく（あとから見られません）
- Region: **Northeast Asia (Tokyo)**

作成に2〜3分かかります。

---

## 3. テーブルを作る

左メニューの **SQL Editor** → New query に `supabase/schema.sql` の中身を全部貼り付けて Run。

これで `notes`（記録）、`references`（模範回答）、`user_options`（自分で足した選択肢）と、写真用の `labels` バケットができます。すべてに `auth.uid() = user_id` のポリシーが張られるため、他人のデータはデータベース側で読めません。

---

## 4. ログインを有効にする

**Authentication → Sign In / Providers → Email** を有効化します。

自分だけで使うなら **Confirm email をオフ**にしてください。確認メールを待たずに登録できます。人に配る予定ができたら、そのときオンに戻します。

---

## 5. 手元で動かす

**Project Settings → API Keys** から Project URL と anon public key をコピーし、`.env` を作って貼ります。

```bash
cp .env.example .env
# VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を書く
# VITE_ENABLE_AI は false のまま

npm install
npm run dev
```

`http://localhost:5173` が開きます。新規登録して、1本記録してみてください。

---

## 6. 公開する

[vercel.com](https://vercel.com) に GitHub アカウントでログインし、**Add New → Project** から `wine-tasting-journal` を選んで Import。

Environment Variables に3つ登録します。

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase の Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |
| `VITE_ENABLE_AI` | `false` |

Deploy を押すと1〜2分で `https://....vercel.app` が発行されます。anon key は公開されても問題ありません。行レベルセキュリティがあるため、鍵だけでは他人のデータを取得できない設計です。

### ホーム画面に追加

発行されたURLをスマホで開き、

- **iOS (Safari)** — 共有ボタン → ホーム画面に追加
- **Android (Chrome)** — メニュー → アプリをインストール

アドレスバーのないアプリとして起動します。

---

## 7. キープアライブを設定する

Supabaseの無料プランは、**7日間アクセスがないとプロジェクトが一時停止**されます。しばらく記録しない週があると止まってしまうので、GitHub Actions から週1回だけ問い合わせて起こしておきます。

`.github/workflows/keepalive.yml` は同梱済みなので、鍵を登録するだけです。

GitHubのリポジトリ → **Settings → Secrets and variables → Actions → New repository secret** で2つ追加します。

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase の Project URL |
| `SUPABASE_ANON_KEY` | anon public key |

毎週月曜9時（JST）に自動実行されます。**Actions** タブから「Keep Supabase awake」を選び、Run workflow で今すぐ試せます。緑のチェックが付けば成功です。

Actions タブで有効化を促された場合は、そこで許可してください。

---

## 8. ラベルの自動読み取りを足す（任意・有料）

写真から名前・産地・品種・年・度数を読み取る機能と、テイスティング内容から品種を推測する機能は、Claude APIを使います。ここだけ従量課金です（1回の読み取りで数円以下、最低5ドルからのチャージ）。

不要ならこの手順は飛ばしてください。手入力で問題なく使えます。

```bash
npm install -g supabase
supabase login
supabase link --project-ref <プロジェクトID>

supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
supabase functions deploy claude
```

APIキーは [console.anthropic.com](https://console.anthropic.com) で発行します。デプロイ後、`.env` と Vercel の環境変数の `VITE_ENABLE_AI` を `true` に変えて再デプロイすると、写真の下に「ラベルから読み取る」ボタンが現れます。

キーはEdge Functionの中だけに置かれ、アプリには含まれません。この関数はログイン済みユーザーからの呼び出しだけを受け付けます。

---

## 無料枠について

| 項目 | 無料枠 | 目安 |
|---|---|---|
| データベース | 500 MB | 記録は1件あたり数KB。数万件入ります |
| ファイル保存 | 1 GB | ラベル写真は1枚100KB程度。約1万枚 |
| 転送量 | 5 GB / 月 | 個人利用なら余ります |
| Edge Functions | 50万回 / 月 | 手順8を使う場合のみ |

**バックアップは無料プランに含まれません。** 一覧タブのExcel書き出しを、ときどき手元に保存しておいてください。

---

## 模範回答を一括登録する

画面から1件ずつ登録するほか、CSVからまとめて投入できます。

**1. 自分の user_id を調べる**

Supabase の SQL Editor で実行します。

```sql
select id, email from auth.users;
```

自分のメールアドレスの行にある `id`（UUID）を控えます。

**2. CSV を用意する**

`tools/refs-white-sample.csv` をコピーして書き換えます。1行が1件の模範回答です。

- `type` は `red` / `white` / `rose` / `orange` / `sparkling`
- 複数の語を入れる欄は「、」で区切ります（例: `イチゴ、ラズベリー、スミレ`）
- 使わない欄は空のままで構いません
- Excelで編集する場合は **CSV UTF-8** 形式で保存してください

**3. SQL に変換して実行**

```bash
python tools/import-refs.py refs.csv <控えたUUID> > refs.sql
```

生成された `refs.sql` の中身を SQL Editor に貼って Run。同じIDで再実行すると上書きされるので、修正して入れ直すこともできます。

アプリを再読み込みすると、模範タブに反映されます。

---

## 構成

```
src/
  App.jsx              画面本体と用語データ
  main.jsx             認証の入口
  components/Auth.jsx  ログイン・新規登録
  lib/supabase.js      クライアント初期化
  lib/store.js         保存先（記録・写真・模範回答・選択肢）
supabase/
  schema.sql           テーブルとRLS
  functions/claude/    Claude APIプロキシ（手順8を使う場合）
.github/workflows/
  keepalive.yml        週1回のキープアライブ
tools/
  import-refs.py       模範回答をCSVから一括登録するスクリプト
  refs-white-sample.csv 白ワイン9件の実データ（書式サンプル）
build-app.py           プロトタイプ版から App.jsx を再生成するスクリプト
```

用語を足したいときは `src/App.jsx` 冒頭の `A1` / `A2` / `A3`（香り）、`APP_AXES`（外観）、`PAL_AXES`（味わい）を編集します。アプリ内の「＋選択肢に追加」でも足せますが、そちらはアカウントごとの保存になります。
