# Quality Baseline

作成日: 2026-06-12
対象: `app/`

## Baseline Commands

- `npm run lint`: pass
- `npm test`: pass, 7 files / 60 tests
- `npm run build`: pass
- `npm run test:coverage`: pass
- `npm run knip`: pass as report mode, with known findings
- `npm run check`: lint + test + build

## Coverage Baseline

`npm run test:coverage` の初回値:

| Metric | Coverage |
|---|---:|
| Statements | 46.6% |
| Branches | 35.85% |
| Functions | 34.65% |
| Lines | 48.68% |

解釈:

- `src/state/` は比較的厚くテストされている。
- `src/screens/` と `src/components/sheets/` は UI スモーク以外が薄い。
- `Report` / `Settings` / `TeamReport` の分割前に、画面単位のスモークを足すと安全。

## Test Scope Added

`src/App.smoke.test.jsx` を追加し、以下の最小導線を保証する:

1. 初回起動でオンボーディングを表示
2. オンボーディング完了
3. タスクを追加して開始
4. 停止シートを開く
5. セッションを停止

このテストは詳細な UI 表示を固定せず、主要導線のレンダリングエラー検出を目的にしている。
