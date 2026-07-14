# Architecture

作成日: 2026-06-12
最終更新: 2026-07-14
対象: 個人運用 Web v1

## レイヤ構成

- `src/domain/`: エラーコード、locale、ID 形式など、環境と UI に依存しない値オブジェクト／契約。
- `src/platform/`: clock と ID generator など、時刻・乱数を読む実行環境アダプター。
- `src/lib/`: UI に依存しない小さなユーティリティ。日時、履歴投影、表示フォーマット、ticker など。
- `src/state/`: 保存対象のドメイン状態、selector、純粋な状態遷移。React とブラウザ API には依存しない。
- `src/features/`: 複数の state fact から機能固有の読み取りモデルを作る層。現在はレポート集計を置く。
- `src/persistence/`: localStorage の読み書きと、保存スケジュール制御。
- `src/app/commands/`: task / record / preferences / data ごとの command factory。state の純粋関数を UI から呼べる action に束ねる。
- `src/app/actions.js`: command factory を合成する入口。
- `src/useAppState.js`: hydration、React state、派生 selector、action 生成の接続点。保存キューと失敗回復は `src/persistence/useStatePersistence.js` が担当する。
- `src/app/controller.js`: シート閉鎖、通知、ダウンロードなど画面固有の副作用を合成する層。
- `src/screens/` / `src/components/`: 表示と入力。ドメイン更新は action 経由で行う。
- `src/i18n/messages/<locale>/`: 画面機能ごとの辞書。公開 API は `src/i18n/index.js` に集約する。

依存方向は原則として `components/screens → app/features → state → domain` とする。`platform` と `persistence` は application の組み立て時に注入し、state から直接参照しない。時刻や ID を必要とする状態遷移には、同一操作で確定した `now` と `createId` を渡す。

## 機能分割の基準

- 画面の `index.jsx` はデータ準備と子コンポーネントの調停に限定する。
- History は日付、イベント投影、タイムライン幾何を別モジュールにする。
- Report は集計を `src/features/report/`、カード表示を `src/screens/Report/cards/` に置く。
- Settings は設定種別ごとの section と panel router を分ける。
- Log は active task list、completed/archive、quick add を分ける。
- CSS は機能単位で import 順を明示し、単一ファイルへ画面横断の規則を再集約しない。

## アクション追加手順

1. 状態変更はまず `src/state/` に純粋関数として追加する。
2. 失敗は表示文ではなく `src/domain/errors.js` の安定した `errorCode` で返す。
3. 時刻・ID が必要なら関数引数／dependencies から受け取り、1 操作中に `Date.now()` や `Math.random()` を再読込しない。
4. UI から呼ぶ必要がある場合は対応する `src/app/commands/` に action を追加する。
5. 画面固有の閉じる、通知、ダウンロードが必要な場合だけ `src/app/controller.js` で合成する。
6. 追加後は `npm run check` を通す。

## i18n 方針

- `ja-JP` と `en-US` はキー構造を揃える。
- en-US は削除しない。正式な英語対応に向けた準備状態として保持する。
- 新しい UI 文言は対応する `src/i18n/messages/<locale>/` に追加し、画面では `t()` / `tx()` を使う。
- locale を受け取れる場所では固定の `'ja-JP'` に寄せず、現在 locale を渡す。
- state は翻訳済み UI 文を返さない。表示に必要な意味は enum、key、構造化データで返し、画面境界で翻訳する。

## 保存形式

- 個人版の保存形式は `interruptlog_personal_v1` と JSON backup の `schemaVersion: 1` だけを扱う。
- 旧形式の localStorage とバックアップは互換対象にしない。個人版の開発はこの形式を唯一の正本とする。
- 将来のチーム機能は、この保存形式へ仮説のフィールドを追加せず、要件を決めてから別設計として始める。

## リリース品質

- `src/` が唯一の実装正本。`dist/` は `npm run build` が作る成果物で、手編集しない。
- `npm run check` は lint、coverage 付きテスト、build、knip を順に実行する。
- coverage は Statements 80%、Branches 65%、Functions 70%、Lines 80% を下回ると失敗する。
- GitHub Actions の `Check` workflow でも同じ `npm run check` を実行する。
- clock、ID generator、storage adapter はテストから差し替え、時刻・乱数・保存失敗を再現可能にする。
- シートは共通 `SheetShell` の dialog セマンティクス、Esc、フォーカス循環／復帰を維持する。
