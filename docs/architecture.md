# Architecture

作成日: 2026-06-12
対象: `app/`

## レイヤ構成

- `src/lib/`: UI に依存しない小さなユーティリティ。日時、表示フォーマット、ticker など。
- `src/state/`: localStorage に保存するドメイン状態と純粋関数。React には依存しない。
- `src/persistence/`: localStorage の読み書きと、保存スケジュール制御。
- `src/app/actions.js`: state の純粋関数を UI から呼べる action に束ねる。
- `src/useAppState.js`: React state、永続化、派生 selector、action 生成の接続点。
- `src/app/controller.js`: view state と view action を画面向けに整える薄い層。
- `src/screens/` / `src/components/`: 表示と入力。ドメイン更新は action 経由で行う。

## アクション追加手順

1. 状態変更はまず `src/state/` に純粋関数として追加する。
2. UI から呼ぶ必要がある場合は `src/app/actions.js` に action を追加する。
3. 画面固有の閉じる/通知などが必要な場合だけ `src/app/controller.js` で合成する。
4. 追加後は `npm run check` を通す。

## i18n 方針

- `ja-JP` と `en-US` はキー構造を揃える。
- en-US は削除しない。正式な英語対応に向けた準備状態として保持する。
- 新しい UI 文言は `src/i18n/index.js` にキー追加し、画面では `t()` / `tx()` を使う。
- locale を受け取れる場所では固定の `'ja-JP'` に寄せず、現在 locale を渡す。

## チーム機能方針

- チーム機能は削除しない。
- ただし、v1 リリースは個人運用アプリとして完成させるため、通常画面には出さない。
- チーム UI は `VITE_ENABLE_TEAM_UI=true` を明示した開発時だけ表示する。
- チーム関連の UI は `TeamReport.jsx` / `TeamReportViews.jsx` / `Report/teamViews/` / `Settings/TeamPanels.jsx` に境界を寄せる。
- 仕様の仮説と未決事項は `docs/team-feature-brief.md` を更新する。
