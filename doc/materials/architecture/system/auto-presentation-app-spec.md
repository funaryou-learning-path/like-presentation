> **出典**: プロジェクト `like-presentation / project/part2` 要件ヒアリング（2026-08-25〜2026-08-29 確定）
> **用途**: Reactによる自動プレゼンアプリの仕様定義・フォルダ設計・ルーティング/TTS/モード切替の実装指針
> **状態**: ✅ 要件確定（2026-08-29）

# 自動プレゼンアプリ 仕様書（part2）

## 背景・目的

### 背景
- 本プロジェクトは二つの課題を同時に消化する必要がある
  1. 本来のプレゼンテーション（伊藤園自販機等を題材とした3分プレゼン）
  2. ReactでAPIを使用したアプリを1つ完成させる課題
- 2を「勝手にプレゼンをしてくれるアプリ」として実装することで、1の発表でも実演可能な成果物とする

### 目的
- プレゼンターの負担を最小化しつつ、聴衆に情報が伝わるプレゼンを半自動で実行する
- Reactのフォルダ設計・ルーティングにこだわった拡張性のある構成を実現する
- 合成音声APIを活用し、台本ベースの自動読み上げと手動操作を切り替え可能にする

## 対象範囲（スコープ）

### 対象
- `project/part2`（Vite + React 19 + TypeScript + Tailwind 4 + framer-motion + recharts）
- 現行の `src/slides/*.tsx` 6枚（Title / Comparison / WhyItoen / Lineup / Price / Summary）を内包するプレゼン
- 新規で追加される題材プレゼン（例: `vending-ranking` 等）

### 対象外
- バックエンドAPI（今回はフロント完結、必要に応じて外部TTS APIのみ）
- 認証・ユーザー管理
- マルチユーザー同時編集

## 機能要件

### F-01 合成音声による読み上げ【確定】
- **方針**: VOICEVOX を一次TTSとし、Dockerで `voicevox_engine` を起動して使用する。無料で完結させる要件を満たす。Web Speech API は将来的なフォールバック候補とするが、現仕様では VOICEVOX必須とし、未起動時はエラー表示とする
- **運用**: `docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest` を想定。フロントからは `http://localhost:50021` に fetch（`audio_query` → `synthesis`）で音声取得
- `lib/tts.ts` で `TTSProvider` インターフェースを抽象化し、`VoiceVoxProvider` / `WebSpeechProvider` を切替可能にする（現状は `VoiceVoxProvider` をデフォルト）
- **話者選択**: 複数話者（ずんだもん、四国めたん等）をダッシュボードおよびTTSControllerで選択可能にする。`GET /speakers` で一覧取得し、`speakerId` を `localStorage` に保存
- 速度（`speedScale` 0.5〜2.0）、音量、テスト再生を提供。AIモードでは `speedScale` を反映して1秒ディレイ後に次スライドへ遷移
- ブラウザの自動再生制限を考慮し、ダッシュボードの「開始」クリックを起点に再生する。VOICEVOX未起動検出時は「VOICEVOXサーバーが起動していません」と明示

### F-02 ページごとの発言内容の記入・編集【確定: 両方】
- スライドIDに紐づく `SlideScript { slideId, script, durationSec? }` として台本を管理
- `presentations/{題材}/scripts.ts` にデフォルト台本を定義（Git管理、初期値）。粒度は「枚数で可変」とし、タイトルは短く、比較スライド等は長くする。全体で3分に収まるよう `durationSec` で調整
- `ScriptEditor.tsx` でページごとに textarea 編集、保存時に `localStorage` に永続化（キー: `scripts:{presentationId}`）。未保存時はデフォルト台本を表示、編集内容は即時プレビューに反映
- **エクスポート**: 「JSONをコピー」「scripts.ts形式でダウンロード」ボタンを提供し、`localStorage` の内容をファイルとして書き戻せるようにする（両方対応）

### F-03 プレゼンとしての使用（本番再生）【確定: フルスクリーン必須 + テレプロンプター切替可】
- 全画面スライド表示、キーボード操作（← → Space）、ページインジケーター、スライド番号表示を維持
- 下部コントロール: 前へ / 次へ / 再生 / 一時停止 / 停止 / 速度調整
- **フルスクリーン**: 必須機能とする。ボタンおよび `F` キーで `requestFullscreen()` を発火。終了は `Esc`
- **タイマー/進捗バー**: 今回は非採用（フルスクリーンのみ）。必要になれば後追加
- **テレプロンプター**: 切替可能とする。`ScriptEditor` の台本を下部に半透明で表示、ON/OFFボタンを Controls に配置。人力モード時のカンペ、AIモード時の字幕として利用

### F-04 AIプレゼンモード / 人力プレゼンモード切替【確定: 1秒ディレイ】
| モード | 挙動 |
|---|---|
| AIモード | 自動で `speak(script)` → `onend` → **1秒待機** → `goNext()` → 次スライドを自動再生。最後まで連続再生。速度・一時停止・スキップ可。テレプロンプターは切替で表示可能 |
| 人力モード | 手動でページ遷移（← → Space）。読み上げは「🔊 読み上げ」ボタン押下時のみ任意再生。台本はテレプロンプター切替で補助表示 |

- `ModeSwitcher.tsx` で切替、状態は `localStorage` と URLクエリ `?mode=ai|manual` で同期
- ダッシュボードとプレゼン画面の両方から切替可能。AI→人力への途中切替時は即時 `cancel()` し手動操作に復帰

### F-05 ダッシュボード（LP）機能【確定: 手動フォルダ作成 + 2本体制】
- `App.tsx` を Router のみにし、`/` をダッシュボードとする
- プレゼン一覧（サムネイル、タイトル、所要時間、最終更新）、モード切替、TTS設定（話者・速度）、台本編集への導線、「プレゼン開始」CTAを提供
- **題材数**: 初期は `itoen`（現行6枚を移設）+ ダミー1本（内容はお任せ、雛形としてタイトル1枚+サンプル2枚程度）の計2本とする。拡張デモ用
- **新規追加**: 手動フォルダ作成方式。`presentations/{題材}/` を手で作成すれば `data/presentations.ts` で自動一覧化される。UIでの自動生成は今回非採用。ガイドをダッシュボードに表示
- **デザイン**: お任せ。現行ダークグリーン基調を尊重しつつ、LPはヒーローセクションを明るくする等バランスを取る

## 非機能要件

- **拡張性**: 新題材は `presentations/{題材}/` を1フォルダ追加するだけで一覧に自動反映されること
- **パフォーマンス**: スライド遷移は framer-motion による 0.4s アニメーションを維持、TTSはプリロード不要
- **アクセシビリティ**: キーボード操作、コントラスト担保、音声停止の即時性
- **可用性**: VOICEVOX必須のため Docker 起動を前提とする。未起動時のエラーハンドリングと再試行導線を設ける
- **保守性**: 共通コンポーネントと題材固有コンポーネントの責務分離

## システム構成・フォルダ設計

### 全体構成
```
src/
├── App.tsx                          # Router 定義のみ（LP/ダッシュボードのハブ）
├── main.tsx
├── index.css
├── types/
│   └── presentation.ts              # Slide, SlideScript, PresentationMeta 型定義
├── components/                      # 全プレゼン共通
│   ├── ui/                          # Button, Card, Badge 等汎用UI
│   └── presentation/
│       ├── Dashboard.tsx            # / のLP兼ダッシュボード
│       ├── PresentationPlayer.tsx   # スライド表示 + 進行管理の核
│       ├── Controls.tsx             # 前後/再生/停止/速度/全画面
│       ├── ModeSwitcher.tsx         # AI ↔ 人力 切替
│       ├── ScriptEditor.tsx         # ページごとの台本編集UI
│       └── TTSController.tsx        # 声種・速度・テスト再生UI
├── hooks/
│   ├── useSpeechSynthesis.ts        # Web Speech API ラッパ
│   └── usePresentation.ts           # 現在ページ/モード/タイマー/自動進行ロジック
├── lib/
│   └── tts.ts                       # TTSProvider 抽象（WebSpeech / OpenAI 等切替）
├── data/
│   └── presentations.ts             # ダッシュボード用一覧の集約
└── presentations/                   # 題材ごと（拡張ポイント）
    ├── itoen/                       # 例: 伊藤園自販機（現 slides を移設）
    │   ├── meta.ts                  # { id, title, description, thumbnail, duration, slidesCount }
    │   ├── scripts.ts               # SlideScript[] デフォルト台本
    │   ├── slides/
    │   │   ├── TitleSlide.tsx
    │   │   ├── ComparisonSlide.tsx
    │   │   ├── WhyItoenSlide.tsx
    │   │   ├── LineupSlide.tsx
    │   │   ├── PriceSlide.tsx
    │   │   └── SummarySlide.tsx
    │   ├── components/              # この題材固有のコンポーネント
    │   └── index.ts                 # meta + slides + scripts を束ねて export
    └── vending-ranking/              # 次題材追加時の雛形
        ├── meta.ts
        ├── scripts.ts
        ├── slides/
        └── index.ts
```

### 現行 `src/slides` からの移行方針
- `src/slides/*.tsx` → `src/presentations/itoen/slides/` へ移動
- `src/presentations/itoen/index.ts` で barrel export し、既存 import の互換性を担保
- `App.tsx` の `slides` 配列は `presentations/itoen/index.ts` から import する形に置換

### ルーティング設計【確定: BrowserRouter（未定・ローカル）】
- `react-router-dom` を導入
- `App.tsx` で以下を定義

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/presentations/:id" element={<PresentationPlayer />} />
    <Route path="/presentations/:id/edit" element={<PresentationPlayer editMode />} />
  </Routes>
</BrowserRouter>
```

- `/` : LP兼ダッシュボード
- `/presentations/:id` : 本番プレゼン（クエリ `?mode=ai|manual` でモード指定）。AIモードは `?mode=ai` で直リンク可能
- デプロイ先は未定・ローカル想定のため `BrowserRouter` を採用。`vite.config.ts` で `history` fallback を担保し、将来 GitHub Pages 等で必要になれば `HashRouter` に切替可能な抽象化を残す

### データ設計

```ts
// types/presentation.ts
export type SlideScript = {
  slideId: string
  script: string
  durationSec?: number
  voice?: string
}

export type PresentationMeta = {
  id: string              // 'itoen'
  title: string           // '最強の自販機が伊藤園に集結する理由'
  description: string
  thumbnail: string
  durationSec: number     // 想定3分
  slidesCount: number
}

export type Presentation = {
  meta: PresentationMeta
  slides: React.FC[]
  scripts: SlideScript[]
}
```

- 台本の永続化: `localStorage.setItem('scripts:itoen', JSON.stringify(scripts))`
- 設定の永続化: `localStorage.setItem('tts:config', JSON.stringify({ rate, voiceURI, volume }))`

### TTS 抽象設計【確定: VOICEVOX必須・話者選択可】

```ts
// lib/tts.ts
export interface TTSProvider {
  speak(text: string, opts?: { speakerId?: number; speedScale?: number }): Promise<void>
  cancel(): void
  getSpeakers(): Promise<{ id: number; name: string }[]>
}
export class VoiceVoxProvider implements TTSProvider {
  // POST http://localhost:50021/audio_query?text=...&speaker=...
  // POST http://localhost:50021/synthesis?speaker=...
  // Audio 要素で再生し onended で resolve
}
export class WebSpeechProvider implements TTSProvider { /* フォールバック候補 */ }
```

```ts
// hooks/useSpeechSynthesis.ts
export function useSpeechSynthesis(provider: TTSProvider = voiceVoxProvider) {
  // speak(text, { speakerId, speedScale }) をラップし、音声終了で Promise resolve
  // 1秒ディレイは呼び出し側（usePresentation）で制御
}
```

- ダッシュボードの `TTSController` で `getSpeakers()` の結果をセレクト表示、選択値を `localStorage: tts:speakerId` に保存

## 画面設計概要

### Dashboard（`/`）
- ヒーロー: タイトル「Auto Presentation」+ 説明 + 「プレゼン開始」CTA
- プレゼン一覧カード: サムネ/タイトル/枚数/所要時間/「再生」「編集」ボタン
- 右側/下部: ModeSwitcher（AI/人力）、TTSController（声・速度）、タイマー設定

### PresentationPlayer（`/presentations/:id`）
- 中央: スライド本体（現行の `slide-container` を流用）
- 下部: Controls（前/次/再生/停止/速度）+ 進捗ドット + 残り時間
- 右上: スライド番号 + 全画面ボタン
- 下部テレプロンプター: 現在スライドの script を半透明で表示（編集時は textarea に切替）

## 制約条件

- 技術スタックは現行を維持（Vite + React 19 + TS + Tailwind 4 + framer-motion + recharts）
- 追加依存は `react-router-dom` のみを原則とする。VOICEVOXは Docker で別プロセス起動（`voicevox/voicevox_engine:cpu-ubuntu20.04-latest` 推奨）
- ブラウザは Chrome/Edge 最新を主対象。VOICEVOX必須のため `http://localhost:50021` への fetch が可能な環境を前提
- 1プレゼンあたり3分を想定。AIモードは「読み上げ + 1秒待機」を各スライドで実行し、全体で3分以内に収まるよう台本長を可変調整すること
- 課題の「APIを使用」要件は `fetch` による VOICEVOX Engine API で満たす（Web Speech でも可だが今回はVOICEVOXで明示的に満たす）

## 未確定事項・確認事項（確定済みは ✅）

- [x] TTSの一次実装 → **VOICEVOX必須（Docker）**、話者は複数選択可、Web Speechは将来のフォールバック候補
- [x] ダッシュボードのビジュアル → **お任せ**（現行ダークグリーン基調を尊重しつつLPはバランス調整）
- [x] 台本編集の保存先 → **両方**（localStorage + JSONエクスポート）
- [x] `BrowserRouter` vs `HashRouter` → **BrowserRouter**（未定・ローカル想定、将来切替可能）
- [x] 新題材 → **itoen + ダミー1本**、ダミー内容はお任せ（雛形）
- [x] API要件 → **fetchできていれば何でも可**、今回はVOICEVOX Engine APIで満たす
- [x] AIモード進行 → **1秒ディレイ**後に次スライド
- [x] 本番補助機能 → **フルスクリーン必須**、テレプロンプターは**切替可能**、タイマー/進捗バーは今回非採用
- [x] 台本粒度 → **枚数で可変**
- [x] 新規題材追加 → **手動フォルダ作成**
- [x] VOICEVOXの Docker 起動コマンド・ポート → **固定 `50021`** で確定。起動コマンド `docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest`、未起動時は「VOICEVOXサーバーが起動していません。Dockerを起動してください」と表示
- [x] ダミー題材の具体タイトル → **お任せで確定**。ID `sample`、タイトル「サンプルプレゼンテーション — 拡張性のデモ」（タイトル1枚 + サンプル2枚の計3枚雛形）で作成

## 決定事項とトレードオフ【2026-08-29 確定版】

| 決定 | 理由 | トレードオフ |
|---|---|---|
| `App.tsx` を Router ハブ化 | LP/ダッシュボードと各プレゼンの責務分離、複数題材拡張が容易 | 現行の単一プレゼン直表示からの移行コスト（import パス変更） |
| `presentations/{題材}/` 集約 + 手動フォルダ作成 | 題材ごとに slides/scripts/components を閉じて管理、再利用性向上。手動作成で課題範囲では十分 | UI自動生成に比べ手間。将来3本以上になる場合は scaffolding スクリプト追加を検討 |
| VOICEVOX必須（Docker, 話者選択可） | 無料で高品質、API要件を明示的に満たす。複数話者でデモの幅が出る | Docker起動が前提。未起動時はエラー表示が必要。Web Speechフォールバックは今回なし |
| localStorage + JSONエクスポート | サーバー不要で即時実現、課題提出でも動作。Git管理も可能 | 複数端末共有不可。エクスポートを忘れるとGitに反映されない |
| AIモード 1秒ディレイ | 聴衆の理解を待つ間を設けつつ自動進行のテンポを維持 | 6枚で6秒のオーバーヘッド。3分に収めるには台本をやや短くする必要がある |
| フルスクリーン必須 + テレプロンプター切替 | 本番プレゼンらしさとカンペ需要の両立。切替式で邪魔にならない | 実装が1ボタン増える。フルスクリーン時のテレプロンプター位置に配慮が必要 |
| BrowserRouter（ローカル想定） | 標準的でURLが綺麗。Vercel/Netlifyなら fallback 可能 | GitHub Pages 等では HashRouter が必要。切替時は1行変更で対応可能な抽象化を残す |
| 台本は枚数で可変 | タイトルは短く、説明スライドは長くすることで3分に自然に収まる | 枚数ごとの duration 管理が必要。`durationSec` を optional で持つ |

## 次のステップ

1. `npm install react-router-dom` 追加
2. `src/types/presentation.ts`, `src/lib/tts.ts`, `src/hooks/useSpeechSynthesis.ts` 作成
3. `src/components/presentation/*` 共通コンポーネント作成
4. `src/presentations/itoen/` へ現行スライド移設 + `meta.ts`/`scripts.ts`/`index.ts` 作成
5. `App.tsx` を Router 化、`Dashboard.tsx` 作成
6. AIモード自動進行（`speak → onend → goNext`）の結合テスト
7. `vite.config.ts` の fallback 設定確認、ビルド確認

---
担当: muse-spark-1.2-contributor-free
