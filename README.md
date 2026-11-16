# akashic-lp

複数のランディングページ (LP) をまとめてホストするリポジトリ。GitHub Pages で配信する。

## 公開URL

- ハブ: https://invite.escape-safari.com/
- ブックカフェからの脱出: https://invite.escape-safari.com/bookcafe/

## 構成の規約

各 LP は **トップレベルのディレクトリ** に置き、その中に自身の `index.html` を持つ。
ルートの `index.html` は公開中の LP へリンクするハブページで、`sitemap.xml` にも掲載する。

```
akashic-lp/
  .nojekyll        # Jekyll の処理を無効化（アセット保護）
  README.md
  index.html       # ハブ（LP一覧）
  bookcafe/
    index.html     # ブックカフェからの脱出 LP
```

## LP を追加する手順

1. 新しいディレクトリを作る: `<new-name>/`
2. その中に `<new-name>/index.html` を置く（自己完結HTMLでよい）
3. ルートの `index.html` にカードを1枚追加してリンクする
4. `sitemap.xml` に新しい公開URLを追加する
5. Akashicモノレポで検証・main反映後、既存mirrorが公開repoへ同期し、Pagesの配備後に `https://invite.escape-safari.com/<new-name>/` で公開される

## Pages 設定

ブランチ `main` / パス `/`（root）から配信。
カスタムドメインは `CNAME` ファイルで `invite.escape-safari.com` に設定している。

## ローカルのルート確認

LPを追加・変更したら、Akashicモノレポのrootから `node scripts/check-lp-routes.cjs apps/akashic-lp` を実行する。rootハブの内部リンク・faviconなどの内部リソース・公開ルート一覧を検査し、fixture回帰は `node scripts/check-lp-routes.test.cjs` で確認する。Bookcafeの画面・CTA検査は既存の共有ローカル検証laneでChromium/WebKitを使う。公開ミラーrepoは配信専用で、検査スクリプトはモノレポが所有する。
