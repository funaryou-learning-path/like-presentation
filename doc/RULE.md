# Documentation Rules

## 1. トップレベル構成
```
doc/
├── materials/     # 全コンテンツ（文書＋画像）
├── src/           # materials のブラウザプレビューアプリ（フロントエンド）
├── serve.js       # 開発サーバー（静的配信＋ファイル監視＋SSE）
├── serve.sh       # 開発サーバー起動スクリプト
├── README.md
└── RULE.md
```

- `materials/` は、本プロジェクトのすべての文書・画像コンテンツを格納する。
- `src/` は、`materials/` の内容をブラウザでプレビューするためのフロントエンドアプリケーション（`index.html`, `style.css`, `script.js`）。
- `serve.js` は、Node.js/Bun で動作する開発サーバー。`src/` と `materials/` を配信し、`materials/` のファイル変更を検出して SSE でクライアントに通知する。
- `serve.sh` は `serve.js` の起動ラッパー。`bash serve.sh` でサーバーが起動する。

## 2. Scope and Purpose
- `materials/architecture/` は、構造・責務分割・データ設計・技術方針を扱う。
- `materials/design/` は、UI/UX・画面設計・体験設計を扱う（`.pen` を含む）。

## 3. Directory Responsibilities
- `materials/architecture/system/`: システム全体構成、責務境界、外部連携方針、技術選定、機能一覧。
- `materials/architecture/database/`: ER 図、テーブル設計、インデックス方針、マイグレーション設計。
- `materials/architecture/structure/frontend/`: フロントエンド構造設計（レイヤ、状態管理、依存関係）。
- `materials/architecture/structure/backend/`: バックエンド構造設計（レイヤ、ユースケース、依存関係）。
- `materials/design/`: 画面設計資料、画面要件定義、プロトタイプ、デザインファイル（例: `design.pen`）。
- `materials/guide/`: 環境構築手順、セットアップガイド、クイックスタート。
- `materials/implementation/`: 実装ガイド、詳細手順、運用ノウハウ。
- `materials/verification/test-plan/`: テスト観点、テスト計画、受け入れ条件。
- `materials/verification/test-result/`: テスト結果、実行ログ要約、既知課題。
- `materials/review/frontend/`, `materials/review/backend/`: レビュー記録。
- `materials/misc/`: 上記に当てはまらない補助資料。
- `materials/temp/`: 一時資料。正式採用時は適切なディレクトリへ移動する。
- `materials/demo/`: デモ用資料、シナリオ、説明補助。
- `materials/image/`: スクリーンショット・図版・画面キャプチャ。

## 4. Review Document Mandatory Rule
- `materials/review/frontend/` および `materials/review/backend/` に作成するレビュー用 Markdown (`.md`) は、**必ずファイル最下部に担当モデルを明記**する。
- 記載形式は以下で統一する。

```md
担当:<モデル名>
```

- 記載例:

```md
担当:<gpt-5.3-codex>
```

- この記載がないレビュー文書は未完了扱いとする。

## 5. ファイル内ヘッダルール
- 各文書の冒頭には、出典・用途を明記したコメントブロックを推奨する。
- 例:

```md
> **出典**: Notion「<ページ名>」ページ
> **用途**: <その文書の目的>
```

## 6. Naming and Operation
- ファイル名は内容が判別できる具体名を使う。
- 既存構成に新しいカテゴリが必要な場合は、先に `RULE.md` を更新してからディレクトリを追加する。
- 役割が重複する資料は作らず、必要に応じてリンク参照で集約する。
