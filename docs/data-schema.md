# データ設計書 — Bookcafe Safari LP 計測基盤

> 目的: 店舗型 Web 謎解きが集客導線として機能するかを定量検証するためのデータ設計ドキュメント。

---

## 1. ファネル概要図

```
訪問者
  │
  ▼
[流入元]
  Instagram / 謎広場 / X / Google など
  URL パラメータ: source, medium, campaign, ref
  utm_* パラメータも同様に取得
  │
  ▼
[LP: lp.escape-safari.com/bookcafe/]
  ─ データ保存先: GA4（ページビュー・CTAクリック）
  ─ データ保存先: localStorage（safari_attribution: 流入元の初回・最終接触）
  │
  ▼ CTAクリック（予約する）
[予約フォーム: Google フォーム]
  ─ データ保存先: 予約 Sheet（Google スプレッドシート）
  ─ 保存内容: 名前 / 人数 / 希望日時 + 流入元 6 項目
  │
  ▼ 来店
[実店舗]
  │
  ▼ Web 謎解き参加（将来）
[Web 謎解きシステム: 将来構築]
  ─ データ保存先: Web 謎 DB
  ─ 保存内容: session_id / 開始〜クリア時刻
  │
  ▼ 体験後
[アンケート: 将来構築]
  ─ データ保存先: アンケート Sheet
  ─ 保存内容: 来店理由 / 認知経路 / 謎解き頻度 / リピート意向 / SNS 投稿
  ─ Web 謎と session_id で結合
```

### データフローと突合キー

```
GA4 ──────── source ─────────── 予約 Sheet
                │
                └── source ──── アンケート Sheet
                                     │
                                 session_id  ─── Web 謎 DB（将来）
```

---

## 2. localStorage スキーマ

### キー名: `safari_attribution`

LP を訪問すると、スクリプトがこのキーに流入元情報を保存する。

**構造（JSON）:**

```json
{
  "first_touch": {
    "source":       "instagram",
    "medium":       "social",
    "campaign":     "",
    "ref":          "",
    "landing_path": "/bookcafe/",
    "ts":           1719000000000
  },
  "last_touch": {
    "source":       "nazohiroba",
    "medium":       "",
    "campaign":     "",
    "ref":          "",
    "landing_path": "/bookcafe/",
    "ts":           1719086400000
  }
}
```

**フィールド定義:**

| フィールド      | 型     | 説明                                                  |
|---------------|--------|-----------------------------------------------------|
| `source`      | string | 流入チャネル。URL の `source` または `utm_source` から取得 |
| `medium`      | string | 流入メディア。URL の `medium` または `utm_medium` から取得 |
| `campaign`    | string | キャンペーン名。URL の `campaign` または `utm_campaign` から取得 |
| `ref`         | string | 紹介元など任意の識別子。URL の `ref` パラメータから取得    |
| `landing_path`| string | 初回着地した URL パス（例: `/bookcafe/`）               |
| `ts`          | number | 訪問タイムスタンプ（Unix ミリ秒）                         |

**first_touch / last_touch の更新ルール:**

- `first_touch`: 初回訪問時のみ書き込む。以降の訪問では上書きしない。
- `last_touch`: 毎回の訪問で上書きする。

### キー名: `safari_session`（将来）

Web 謎解き実装時に追加予定。`session_id` を保持し、アンケートとの突合に使う。

```json
{
  "session_id":  "abc12345",
  "started_at":  1719086400000,
  "completed_at": null
}
```

---

## 3. GA4 イベント定義

### イベント一覧

| イベント名              | 発火条件                                            | パラメータ                                                  |
|-----------------------|----------------------------------------------------|------------------------------------------------------------|
| `page_view`           | LP への訪問時（自動）                                | GA4 デフォルト + user_properties（下記）                    |
| `reservation_cta_click` | 予約 CTA ボタンをクリックしたとき                    | `cta_id`, `source`, `medium`, `campaign`                   |
| `form_open`           | フォームへ遷移するボタンをクリックしたとき（dm・tel を除く） | `cta_id`, `source`, `medium`, `campaign`                   |

### user_properties（page_view 時に付与）

| user_property 名  | 値の例          | 説明                         |
|------------------|-----------------|------------------------------|
| `att_source`     | `instagram`     | first_touch の source        |
| `att_medium`     | `social`        | first_touch の medium        |
| `att_campaign`   | `bookcafe_0624` | first_touch の campaign      |
| `att_landing_path` | `/bookcafe/`  | first_touch の landing_path  |

### `reservation_cta_click` / `form_open` のパラメータ詳細

| パラメータ   | 値の例          | 説明                                    |
|------------|-----------------|----------------------------------------|
| `cta_id`   | `hero`          | クリックされた CTA の識別子（下表参照）     |
| `source`   | `instagram`     | last_touch の source                   |
| `medium`   | `social`        | last_touch の medium                   |
| `campaign` | `bookcafe_0624` | last_touch の campaign                 |

### CTA 識別子 (`cta_id`) 一覧

| `cta_id` | CTA の場所              | `form_open` も発火するか |
|---------|------------------------|------------------------|
| `hero`  | Hero セクション          | ○                      |
| `intro` | What-is-this セクション  | ○                      |
| `price` | Price セクション         | ○                      |
| `bottom`| 最下部                  | ○                      |
| `dm`    | Instagram DM リンク     | ✕（DM へ遷移するため）    |
| `tel`   | 電話リンク               | ✕（電話発信のため）       |

---

## 4. 予約フォーム 列定義

Google フォーム → スプレッドシートに自動保存される列の定義。

### ユーザー入力列

| 列名（推奨）         | フォームの質問名 | 型         | 例                         |
|--------------------|----------------|-----------|---------------------------|
| `timestamp`        | タイムスタンプ   | datetime  | `2024-06-22 14:30:00`     |
| `name`             | お名前          | string    | `山田 太郎`                |
| `party_size`       | 参加人数        | string    | `2名`                     |
| `preferred_datetime` | 希望日時      | string    | `6/28（金）15:00頃`         |

### 管理用列（自動入力）

| 列名           | フォームの質問名 | 型     | 例                      |
|--------------|----------------|--------|------------------------|
| `source`     | source         | string | `instagram`            |
| `medium`     | medium         | string | `social`               |
| `campaign`   | campaign       | string | `bookcafe_0624`        |
| `ref`        | ref            | string | `（空）`                |
| `cta`        | cta            | string | `hero`                 |
| `landing_path` | landing_path | string | `/bookcafe/`           |

> `source` 列が GA4・アンケート Sheet との**結合キー**となる。

---

## 5. アンケート設計（将来構築）

来店後の体験を計測するためのアンケート。現時点では未実装。構築時の設計案を示す。

### 設問一覧

| 設問 ID       | 質問文                           | 選択肢                                                     | 列名          |
|--------------|----------------------------------|------------------------------------------------------------|--------------|
| `q1_reason`  | 来店のきっかけは？                | 謎解き / カフェ利用 / カレーが食べたかった / 友人に誘われた / その他 | `q1_reason`  |
| `q2_channel` | どこで Bookcafe Safari を知りましたか？ | Instagram / 謎広場 / Google / X / 友人・知人 / その他     | `q2_channel` |
| `q3_frequency` | 普段、謎解きをしますか？        | よくする（月 1 回以上）/ 時々する / 今回が初めて              | `q3_frequency` |
| `q4_repeat`  | また参加したいと思いますか？（1〜5） | 1（まったく思わない）〜 5（ぜひ参加したい）                 | `q4_repeat`  |
| `q5_sns_posted` | SNS に投稿しましたか？         | した / しない                                              | `q5_sns_posted` |

### アンケート Sheet 列定義

| 列名             | 型      | 説明                                          |
|----------------|---------|---------------------------------------------|
| `timestamp`    | datetime | 回答日時                                     |
| `q1_reason`    | string  | 来店理由                                      |
| `q2_channel`   | string  | 認知経路                                      |
| `q3_frequency` | string  | 謎解き頻度                                    |
| `q4_repeat`    | integer | リピート意向（1-5）                             |
| `q5_sns_posted`| string  | SNS 投稿有無                                  |
| `session_id`   | string  | （将来）Web 謎のセッション ID。事前入力で自動入力  |

---

## 6. Web 謎データ設計（将来）

Web 謎解きシステム実装時に追加するデータ設計案。

### テーブル / Sheet 定義

| 列名              | 型       | 説明                                       |
|-----------------|----------|--------------------------------------------|
| `session_id`    | string   | セッション識別子。発行ルール: ランダム英数字 8 文字（例: `abc12345`）|
| `started_at`    | datetime | 謎解き開始日時                               |
| `completed_at`  | datetime | クリア日時（クリアしなかった場合は null）       |
| `completion_time` | integer | クリアにかかった秒数（`completed_at - started_at`） |

### session_id の発行と結合戦略

1. 来店者が Web 謎ページにアクセスした時点で `session_id` を発行する。
2. `session_id` を `localStorage` の `safari_session.session_id` に保存する。
3. 体験後のアンケート URL に `session_id` を事前入力として付与する（`?session_id=abc12345`）。
4. アンケート Sheet の `session_id` 列と Web 謎 DB の `session_id` で突合する。

---

## 7. 分析基盤（Claude Code / MCP / CLI 連携）

将来、データを API 経由で取得して分析する際の設計方針。

### GA4 Data API

**接続方法:**
- Google Cloud Console でサービスアカウントを作成し、GA4 プロパティに「閲覧者」権限を付与する。
- サービスアカウントキー（JSON）を使って認証する。
- `property_id`（GA4 のプロパティ ID）を控えておく。

**取得指標とディメンションのサンプル:**

```json
{
  "dateRanges": [{ "startDate": "2024-06-01", "endDate": "today" }],
  "metrics": [
    { "name": "sessions" },
    { "name": "eventCount" }
  ],
  "dimensions": [
    { "name": "customEvent:source" },
    { "name": "customEvent:cta_id" },
    { "name": "eventName" }
  ]
}
```

### Google Sheets API（予約・アンケート Sheet）

**接続方法:**
- 同一のサービスアカウントに対してスプレッドシートの「閲覧者」権限を付与する。
- Python の `gspread` ライブラリでアクセスする。

**サンプルコード（Python）:**
```python
import gspread
from google.oauth2.service_account import Credentials

creds = Credentials.from_service_account_file(
    'service_account.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
)
gc = gspread.authorize(creds)
sheet = gc.open_by_key('SPREADSHEET_ID').sheet1
records = sheet.get_all_records()  # [{列名: 値, ...}, ...]
```

### 結合キー

| 結合先                 | 結合キー       | 現状    |
|-----------------------|--------------|--------|
| GA4 ↔ 予約 Sheet       | `source`     | 今すぐ可 |
| GA4 ↔ アンケート Sheet  | `source`     | 将来    |
| Web 謎 DB ↔ アンケート Sheet | `session_id` | 将来    |

**命名規則:** 全列名・パラメータ名は英語の snake_case で統一する。後から API 経由でプログラム処理しやすい。日本語列名はフォームの表示用のみ（シートのヘッダー行は英語 snake_case に変換して運用する）。

---

## 8. 将来見たいレポート定義

各指標の定義とデータ出所（どのシステムから取得するか）を示す。

### 指標とデータ出所

| 指標                | 定義                                | データ出所          |
|--------------------|-----------------------------------|-------------------|
| LP 訪問数           | `page_view` イベント数              | GA4               |
| CTA クリック数      | `reservation_cta_click` イベント数  | GA4               |
| フォーム遷移数      | `form_open` イベント数              | GA4               |
| 予約数             | 予約 Sheet の行数                   | 予約 Sheet        |
| 予約率             | 予約数 ÷ LP 訪問数                  | GA4 + 予約 Sheet  |
| 来店数             | 実際に来店した予約の数（手動管理）     | 予約 Sheet（フラグ列）|
| 謎解き参加数        | Web 謎の `started_at` が存在する数  | Web 謎 DB（将来）  |
| クリア数           | Web 謎の `completed_at` が存在する数 | Web 謎 DB（将来）  |
| SNS 投稿率         | `q5_sns_posted=した` の割合         | アンケート Sheet（将来）|

### サンプルレポート表

```
source        LP訪問  CTAクリック  予約  予約率
instagram       120       24        8    6.7%
nazohiroba       35       12        6   17.1%
x                50        5        1    2.0%
(direct)         80       10        3    3.8%
```

---

## 9. 今必要なもの vs 将来の拡張ポイント

| 項目                        | 今すぐ必要（フェーズ 1）   | 将来の拡張（フェーズ 2 以降）            |
|---------------------------|-------------------------|---------------------------------------|
| 流入元の計測               | ○ URL パラメータ取得 + localStorage 保存 | ─                             |
| LP 訪問・CTA クリック計測  | ○ GA4 イベント                | ─                                      |
| 予約フォームへの流入元引き渡し | ○ 事前入力 URL               | ─                                      |
| 予約データの収集           | ○ Google フォーム → Sheet    | ─                                      |
| Web 謎解き体験の計測       | ─                            | ○ session_id 発行・進捗 DB              |
| アンケート実施と Sheet 連携 | ─                            | ○ session_id でアンケート事前入力        |
| データの API 取得・結合分析 | ─                            | ○ GA4 Data API + gspread + session_id 結合 |
| ダッシュボード             | ─                            | ○ Sheets or Looker Studio で可視化      |
