# 計測基盤 運用手順書 — Bookcafe Safari LP

> 対象: `https://lp.escape-safari.com/bookcafe/`（GitHub Pages 静的 HTML）  
> 計測スタック: GA4 + localStorage 流入元保存 + Google フォーム事前入力

---

## 1. GA4 セットアップ

### 1-1. GA4 プロパティを作成する

1. [Google Analytics](https://analytics.google.com/) にブラウザでアクセスしてログインする。
2. 左下の「管理」（歯車アイコン）をクリック。
3. 「プロパティを作成」をクリック。
4. プロパティ名を入力（例: `Bookcafe Safari LP`）し、タイムゾーン「日本」・通貨「日本円」を選択して「次へ」。
5. ビジネスの説明は任意。「作成」をクリック。

### 1-2. ウェブデータストリームを作成する

1. プロパティ作成後、「データストリームを設定する」という画面が表示される（または 管理 > データストリーム > ストリームを追加）。
2. 「ウェブ」を選択。
3. ウェブサイトの URL に `https://lp.escape-safari.com` を入力。
4. ストリーム名を入力（例: `bookcafe-lp`）して「ストリームを作成」。

### 1-3. 測定 ID（G-XXXX）を取得する

1. 作成したストリームの詳細画面を開く。
2. 右上の「測定 ID」欄に `G-XXXXXXXXXX` 形式の ID が表示される。
3. この ID をコピーしておく。

### 1-4. LP の設定ファイルに貼り付ける

`bookcafe/index.html` の先頭付近にある計測モジュール内 `SAFARI_TRACK` オブジェクトを探し、`ga4Id` の値を差し替える。

**変更前:**
```js
const SAFARI_TRACK = {
  ga4Id: 'G-XXXXXXXXXX',
  // ...
};
```

**変更後（実際の ID に置き換える）:**
```js
const SAFARI_TRACK = {
  ga4Id: 'G-ABC1234567',  // ← 取得した測定 ID
  // ...
};
```

> `ga4Id` が `G-` で始まる実際の ID に設定されていれば、スクリプトが自動で gtag.js を読み込む。プレースホルダ（`G-XXXXXXXXXX`）のままでは計測されない。

---

## 2. カスタムディメンション登録

GA4 のレポートでイベントパラメータや流入元を絞り込み・集計するために、カスタムディメンションを事前登録する必要がある。

### 2-1. イベントスコープのカスタムディメンション（CTAクリック等の分析用）

1. GA4 の管理画面を開き、対象プロパティを選択。
2. 「カスタム定義」→「カスタムディメンション」タブ→「カスタムディメンションを作成」をクリック。
3. 以下の 4 つを順番に登録する（スコープはすべて「イベント」）：

| ディメンション名 | イベントパラメータ名 | スコープ | 説明                             |
|-----------------|--------------------|---------|---------------------------------|
| `cta_id`        | `cta_id`           | イベント | クリックされた CTA の識別子       |
| `source`        | `source`           | イベント | 流入元チャネル（instagram など）  |
| `medium`        | `medium`           | イベント | 流入メディア（social など）        |
| `campaign`      | `campaign`         | イベント | キャンペーン名                    |

4. 「保存」をクリック。

### 2-2. ユーザースコープのカスタムディメンション（初回流入の属性）

以下のユーザープロパティも登録しておくと、初回流入元別のユーザー分析ができる（オプション）。

| ディメンション名        | ユーザープロパティ名    | スコープ |
|-----------------------|----------------------|---------|
| `att_source`          | `att_source`         | ユーザー |
| `att_medium`          | `att_medium`         | ユーザー |
| `att_campaign`        | `att_campaign`       | ユーザー |
| `att_landing_path`    | `att_landing_path`   | ユーザー |

> 登録後、データが溜まるまで 24〜48 時間かかる。DebugView（後述）ではリアルタイムで確認できる。

---

## 3. Google フォーム設定

予約フォームは管理用の流入元情報を自動入力する仕組みになっている。以下の手順で設定する。

### 3-1. フォームの回答項目を整理する

Google フォームを開き、ユーザーに入力してもらう項目は以下の 3 つのみにする：

| 項目名           | 質問の種類  | 必須 |
|-----------------|------------|------|
| お名前           | 短文回答   | 任意 |
| 参加人数         | 短文回答   | 任意 |
| 希望日時         | 短文回答   | 任意 |

### 3-2. 管理用の隠し項目を追加する

ユーザーには見えるが「自動入力される」ことを説明する形で、以下の 6 項目を短文回答で追加する：

| 項目名          | 説明欄（フォームに表示する注記）        |
|----------------|--------------------------------------|
| `source`       | ※自動入力・編集不要                   |
| `medium`       | ※自動入力・編集不要                   |
| `campaign`     | ※自動入力・編集不要                   |
| `ref`          | ※自動入力・編集不要                   |
| `cta`          | ※自動入力・編集不要                   |
| `landing_path` | ※自動入力・編集不要                   |

> 「必須」にはしない。値が空のときは自動入力されない仕様。

### 3-3. 事前入力 URL から entry ID を取得する

各項目のフォーム内部 ID（`entry.数字`）を取得する手順：

1. フォームの編集画面（`docs.google.com/forms/...`）を開く。
2. 右上の「︙（3点ドット）」メニュー →「事前入力したURLを取得」をクリック。
3. 各項目（source, medium … landing_path）に適当なダミー値（`test` など）を入力して「リンクを取得」をクリック。
4. 取得した URL をコピーする。URL は以下のような形式になっている：

   ```
   https://docs.google.com/forms/d/e/.../viewform?usp=pp_url
     &entry.123456789=test        ← source の entry ID
     &entry.234567890=test        ← medium の entry ID
     &entry.345678901=test        ← campaign の entry ID
     ...
   ```

5. `entry.数字` の部分を各項目分メモしておく。

### 3-4. LP の設定ファイルに entry ID を差し込む

`bookcafe/index.html` の `SAFARI_TRACK` 内 `formEntries` に取得した entry ID を設定する：

```js
const SAFARI_TRACK = {
  ga4Id: 'G-ABC1234567',
  formBaseUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdIkxqX2XbYLUMMcv-RIiqYILNnGcjQI4NWPJXrWDtZTJqoJw/viewform',
  formEntries: {
    source:       'entry.123456789',  // ← 実際の entry ID に差し替える
    medium:       'entry.234567890',
    campaign:     'entry.345678901',
    ref:          'entry.456789012',
    cta:          'entry.567890123',
    landing_path: 'entry.678901234',
  },
  webnazo: { enabled: false },  // 将来の Web謎解き機能（現在は無効）
};
```

> 値が空文字（`''`）のままの項目はフォーム URL に付与されない。使わない項目は空のままでよい。

---

## 4. フォーム → Google Sheets 連携

回答を CSV 手作業でなく、シートに自動で積み上げる設定。

1. フォームを開き、上部タブの「回答」をクリック。
2. 右側のスプレッドシートアイコン（または「スプレッドシートにリンク」）をクリック。
3. 「新しいスプレッドシートを作成」を選択して名前をつける（例: `Bookcafe 予約フォーム回答`）。
4. 「作成」をクリック。

**列名の運用方針:**

フォームの項目名がそのままスプレッドシートの列ヘッダーになる。分析時の突合がしやすいよう、以下の通り英語の snake_case で統一することを推奨する：

| フォーム項目名   | シート列名（推奨）     |
|----------------|---------------------|
| お名前          | `name`              |
| 参加人数        | `party_size`        |
| 希望日時        | `preferred_datetime`|
| source         | `source`            |
| medium         | `medium`            |
| campaign       | `campaign`          |
| ref            | `ref`               |
| cta            | `cta`               |
| landing_path   | `landing_path`      |

> Google フォームのタイムスタンプ列（`タイムスタンプ`）も自動で追加される。後から API で取得するときのために列名を日本語から英語に変えたい場合は、シート側のヘッダー行を直接編集してよい（フォームの項目名と紐付けは変わらない）。

---

## 5. 流入元 URL の付け方（運用）

LP を告知するときは URL にパラメータを付けることで、どのチャネルからの訪問かを計測できる。

**ベース URL:**
```
https://lp.escape-safari.com/bookcafe/
```

### チャネルごとの推奨パラメータ

| チャネル           | 配布する URL の例                                                          | 備考                      |
|-------------------|-------------------------------------------------------------------------|--------------------------|
| Instagram（投稿）  | `?source=instagram`                                                     | プロフィールリンク等         |
| Instagram（リール）| `?source=instagram&medium=reel`                                         |                          |
| 謎広場             | `?source=nazohiroba`                                                    | サイト掲載時               |
| X（旧 Twitter）    | `?source=x`                                                             | ポスト本文リンク             |
| Google 広告        | `?utm_source=google&utm_medium=cpc&utm_campaign=bookcafe_0624`          | utm_* での指定も可          |
| 友人への口コミ      | `?source=word_of_mouth`                                                 | QRコード等                 |
| パラメータなし      | `https://lp.escape-safari.com/bookcafe/`                                | source = `(direct)` 扱い  |

**utm_* との互換性:**  
スクリプトは `source` と `utm_source` の両方を読む。どちらかがあれば計測される。`source=instagram` と `utm_source=instagram` は同じ結果になる。utm_* を使い慣れている場合はそのまま使って構わない。

---

## 6. デプロイ

このリポジトリは **GitHub Pages** でホストされており、`main` ブランチへの push が自動的に本番サイトへ反映される。

1. `bookcafe/index.html` を変更する（GA4 ID の差し替えなど）。
2. 変更をコミットする（コミットのタイミングはご自身で判断してください）。
3. `git push origin main` を実行する。
4. 数分以内に `https://lp.escape-safari.com/bookcafe/` へ反映される。

> **注意:** push した内容はすぐ公開される。本番と関係ない変更（デバッグ用 console.log 等）を混入しないよう注意する。

---

## 7. 動作確認チェックリスト

変更後は以下の手順でローカルまたは本番での動作を確認する。

### ローカル確認手順

```bash
# プロジェクトルートで実行
python3 -m http.server 8000
```

ブラウザで以下にアクセスする（パラメータ付き）：

```
http://localhost:8000/bookcafe/?source=instagram&utm_campaign=test
```

### 確認項目

| # | 確認内容                                                 | 確認方法                                                                                                                                 |
|---|--------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `localStorage` に流入元が保存されているか               | DevTools（F12）> Application > Local Storage > `http://localhost:8000` > `safari_attribution` のキーを確認。`first_touch.source` が `instagram` になっていれば OK |
| 2 | 2 回目のアクセスで `last_touch` が更新されているか       | 別パラメータ（`?source=x`）でリロードし、`last_touch.source` が更新されることを確認。`first_touch` は変わらないことを確認                    |
| 3 | 各 CTA クリックでフォーム URL に事前入力が付くか          | 「予約する」ボタンをクリックし、遷移先の Google フォーム URL に `entry.数字=instagram` 等が付いていることを確認                              |
| 4 | GA4 DebugView でイベントが届いているか                  | URL に `?debug_mode=1` を追加してアクセス。GA4 管理画面 > レポート > DebugView で `page_view`・`reservation_cta_click` などのイベントが表示されることを確認 |
| 5 | `reservation_cta_click` イベントの `cta_id` が正しいか  | Hero ボタン → `hero`、Price セクション → `price`、最下部 → `bottom`、Instagram DM → `dm` となっているか確認                               |

### CTA ごとの `cta_id` 一覧

| CTA 位置              | `cta_id` | イベント                                  |
|----------------------|----------|------------------------------------------|
| Hero セクション        | `hero`   | `reservation_cta_click` + `form_open`   |
| What-is-this セクション | `intro`  | `reservation_cta_click` + `form_open`   |
| Price セクション       | `price`  | `reservation_cta_click` + `form_open`   |
| 最下部                | `bottom` | `reservation_cta_click` + `form_open`   |
| Instagram DM         | `dm`     | `reservation_cta_click` のみ             |
| 電話                  | `tel`    | `reservation_cta_click` のみ             |

> `dm` と `tel` はフォームへ遷移しないため `form_open` イベントは発火しない。

---

## 付録: トラブルシューティング

| 症状                                         | 考えられる原因                         | 対処                                              |
|---------------------------------------------|--------------------------------------|--------------------------------------------------|
| GA4 に何もデータが来ない                      | `ga4Id` がプレースホルダのまま         | `G-XXXXXXXXXX` を実際の測定 ID に差し替えてデプロイ |
| `safari_attribution` が空                    | パラメータ付き URL でアクセスしていない   | `?source=test` を URL に付けてアクセスし直す         |
| フォームに事前入力が付いていない               | `formEntries` の entry ID が未設定     | 手順 3-3〜3-4 に従って entry ID を設定する           |
| DebugView に `reservation_cta_click` が来ない | `?debug_mode=1` が付いていない          | URL の末尾に `?debug_mode=1` を追加する             |
