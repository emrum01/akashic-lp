# akashic-lp

複数のランディングページ (LP) をまとめてホストするリポジトリ。GitHub Pages で配信する。

## 公開URL

- ハブ: https://emrum01.github.io/akashic-lp/
- ブックカフェからの脱出: https://emrum01.github.io/akashic-lp/bookcafe/

## 構成の規約

各 LP は **トップレベルのディレクトリ** に置き、その中に自身の `index.html` を持つ。
ルートの `index.html` は各 LP へのリンクを並べたハブページ。

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
4. commit & push すると `https://emrum01.github.io/akashic-lp/<new-name>/` で公開される

## Pages 設定

ブランチ `main` / パス `/`（root）から配信。
