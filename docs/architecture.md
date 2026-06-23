# Architecture

作成日: 2026-06-12
対象: 個人運用 Web v1

## レイヤ構成

- `src/lib/`: UI に依存しない小さなユーティリティ。日時、表示フォーマット、ticker など。
- `src/state/`: localStorage に保存するドメイン状態と純粋関数。React には依存しない。
- `src/persistence/`: localStorage の読み書きと、保存スケジュール制御。
- `src/app/commands/`: task / record / preferences / data ごとの command factory。state の純粋関数を UI から呼べる action に束ねる。
- `src/app/actions.js`: command factory を合成する入口。
- `src/useAppState.js`: React state、永続化、派生 selector、action 生成の接続点。
- `src/app/controller.js`: シート閉鎖、通知、ダウンロードなど画面固有の副作用を合成する層。
- `src/screens/` / `src/components/`: 表示と入力。ドメイン更新は action 経由で行う。
- `src/i18n/messages/<locale>/`: 画面機能ごとの辞書。公開 API は `src/i18n/index.js` に集約する。

## アクション追加手順

1. 状態変更はまず `src/state/` に純粋関数として追加する。
2. UI から呼ぶ必要がある場合は対応する `src/app/commands/` に action を追加する。
3. 画面固有の閉じる/通知などが必要な場合だけ `src/app/controller.js` で合成する。
4. 追加後は `npm run check` を通す。

## i18n 方針

- `ja-JP` と `en-US` はキー構造を揃える。
- en-US は削除しない。正式な英語対応に向けた準備状態として保持する。
- 新しい UI 文言は対応する `src/i18n/messages/<locale>/` に追加し、画面では `t()` / `tx()` を使う。
- locale を受け取れる場所では固定の `'ja-JP'` に寄せず、現在 locale を渡す。

## 保存形式

- 個人版の保存形式は `interruptlog_personal_v1` と JSON backup の `schemaVersion: 1` だけを扱う。
- 旧形式の localStorage とバックアップは互換対象にしない。個人版の開発はこの形式を唯一の正本とする。
- 将来のチーム機能は、この保存形式へ仮説のフィールドを追加せず、要件を決めてから別設計として始める。

## リリース品質

- `src/` が唯一の実装正本。`dist/` は `npm run build` が作る成果物で、手編集しない。
- `npm run check` は lint、coverage 付きテスト、build、knip を順に実行する。
- coverage は Statements 80%、Branches 65%、Functions 70%、Lines 80% を下回ると失敗する。
- GitHub Actions の `Check` workflow でも同じ `npm run check` を実行する。
