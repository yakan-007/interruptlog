# Inventory

作成日: 2026-06-12
対象: `app/`

## Knip 初回レポート

`npm run knip` は既存コードの棚卸し用として導入した。Phase 2 の整理により、`npm run knip:strict` はクリーンになり、`npm run check` に組み込み済み。

### Resolved unused files

- `src/screens/Log/TodayStrip.jsx` は画面から参照されていなかったため削除済み。

### Resolved unused exports

以下の未使用 export は、削除または内部関数化済み:

- `src/app/controller.js`: `createViewActions`, `shareOrDownloadText`
- `src/components/sheets/index.js`: `SheetShell`
- `src/helpers.js`: `fmtHM`, `pad`
- `src/history.js`: `getHistoryDayBounds`, `projectEventIntoHistoryDay`, `summarizeHistoryDay`, `shouldShowHistorySeconds`, `assignHistoryLanes`, `buildHistoryAnchors`, `solveHistoryAxis`, `DAY_MS`, `HOUR_MS`, `LONG_EVENT_MS`
- `src/i18n/index.js`: `getLocaleConfig`, `formatTime`
- `src/state/events.js`: `validateEventWindow`
- `src/state/interruptsBreaks.js`: `resumeOrStopInState`
- `src/state/reports.js`: `getEventOverlap`, `parseReportCsv`
- `src/state/resolution.js`: `getEventEnd`, `mergeEquivalentEvents`
- `src/state/schema.js`: `defaultPreferences`, `normalizePreferences`, `normalizeHistoryView`, `normalizeTask`, `normalizeRunning`, `normalizeTeamWorkspace`, `normalizeTeamArchive`, `defaultTaxonomyVersion`, `defaultAnonymousMemberId`, `defaultColorSeed`, `resolveOpenEvents`
- `src/state/team.js`: `sanitizePublicPresence`
- `src/storage.js`: `clearPersistedState`

### Current status

- `npm run knip:strict`: pass

## 注意点

- `state/index.js` の `export *` バレルは解消済み。未使用 export は `knip:strict` で検出しやすくなっている。
- テストから直接 import されている内部関数は、製品コード未使用でも削除対象とは限らない。
- チーム機能は将来機能として保持するため、単純な行数削減を目的に削除しない。

## 製品判断待ち

### en-US ロケール

現状:

- README は日本語 UI 前提。
- `src/i18n/index.js` には en-US ツリーが丸ごと存在する。
- `preferences.locale` と設定 UI はロケール切替を前提にしている。

判断:

- 将来的に英語対応したいので、en-US は削除しない。
- 当面は正式対応前の準備状態として扱う。
- リファクタリングでは ja-JP / en-US のキー構造を壊さず、翻訳欠落検査を追加する方向に寄せる。

### チーム機能

現状:

- README の主要機能には明記されていない。
- `FEATURES.teamLights`、`teamWorkspace`、`teamArchive`、`TeamReport`、設定 UI に横断して存在する。
- 既存 localStorage / バックアップ JSON の互換テストが必要。

判断:

- 将来的にチーム対応したいので削除しない。
- ただし「チーム対応」の意味がまだ未確定なので、正式機能として広げず、実験的機能として隔離する。
- README では過剰に約束せず、docs 側で仮説と未決事項を整理する。
