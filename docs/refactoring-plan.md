# InterruptLog リファクタリング計画

作成日: 2026-06-11
対象: `app/` (React 19 + Vite, 約 10,000 行)

## 実装ステータス(2026-06-14)

この計画は段階的に実装済み。現在の検証結果:

- `npm run check` … lint / test / build / knip:strict すべて成功
- `npm test` … 7 ファイル 67 テスト、全て成功
- `npm run test:coverage` … Statements 59.81% / Branches 45.96% / Functions 50.33% / Lines 61.61%
- Git リポジトリ化、初期コミット、論理変更ごとのコミット作成済み
- GitHub Actions workflow `.github/workflows/app-check.yml` を追加済み。リモート作成と push はオーナー判断待ち

主な完了内容:

- Phase 0: 安全網は完了。`check`、coverage、knip、App スモーク、CI workflow を整備
- Phase 1: en-US は保持、チーム機能は削除せず隔離する方針を `docs/inventory.md` / `docs/team-feature-brief.md` / README に反映
- Phase 2: `state/index.js` の名前付き re-export 化、未使用 export 削除、`helpers.js` / `data.js` 解体、`lib/`・`persistence/` 整理、`knip:strict` クリーン化
- Phase 3: `useAppState.js` から action 配線を `src/app/actions.js` に分離し、`controller.js` の素通し配線を簡素化
- Phase 4: `Report` / `Settings` / `TeamReport` を分割。`TeamReport.jsx` は 648 行から 156 行へ縮小し、チーム表示実装は `Report/teamViews/` へ view 単位で隔離
- Phase 5: 英語対応とチーム対応を削除せず、README と architecture docs に将来方針を明記
- Phase 6: `docs/architecture.md` と ESLint のレイヤ規約を追加
- 追加対応: 個人運用優先の次フェーズとして、タスクメモ、押し忘れイベントのメモ、下部タイマーからの詳細表示、個人レポート表示部品の整理、App スモークテストを追加。チーム機能の拡張は行っていない
- v1 リリース方針: 通常画面からチーム導線を外し、個人運用アプリとして完成させる。チーム関連コードとデータ互換は保持するが、`VITE_ENABLE_TEAM_UI=true` を明示しない限り画面には出さない

残る判断事項:

- リモートリポジトリの置き場所と初回 push
- チーム運用の正式仕様化は v1 リリースから切り離し、別フェーズで打ち合わせる

## 0. 現状診断のサマリー

着手前の実測結果:

- `npm run lint` … エラーなし
- `npm test` … 6 ファイル 59 テスト、全て成功
- 依存は `react` / `react-dom` のみで、外部依存の負債はほぼない
- ロジック層 (`src/state/`) はドメイン別に分割済みで、テストもロジック層に集中している

つまり「壊れている」コードベースではない。一方で、以下の無駄・歪みが確認できた。
**最大のリスクはコード品質ではなく、git リポジトリではないこと**(履歴ゼロ、ロールバック手段なし)。

### 確認済みの問題点(優先度順)

| # | 問題 | 場所 | 規模 |
|---|------|------|------|
| P1 | バージョン管理されていない | リポジトリ全体 | 致命的 |
| P2 | UI 層にテストがない(テストは state/history/i18n/persistence/lifecycle のみ) | `src/screens/`, `src/components/` | 大 |
| P3 | ビュー配線が 3 層に重複(`useAppState` 442 行 → `app/controller` 296 行 → `App.jsx`)。55 個の `*InState` 関数を手作業で re-export しており、ほぼパススルーのボイラープレート | `src/useAppState.js`, `src/app/controller.js` | 大 |
| P4 | README は「日本語 UI 前提の Web v1」と宣言している一方で、将来的な英語対応のため `i18n/index.js`(986 行)に en-US ロケールが存在する。削除対象ではなく、正式サポート前の未整備状態として扱う | `src/i18n/index.js` | 大(将来正式化) |
| P5 | チーム機能が README の機能一覧に存在しないのに、コードの約 15% を占める(`state/team.js` 524 行 + `TeamReport.jsx` 648 行 + schema/reports/settings/i18n への波及)。将来的にチーム運用はやりたいが、個人運用が安定してから詰める。現時点では削除せず、探索機能として隔離する | 横断 | 大(後回し) |
| P6 | `helpers.js` が i18n の薄いラッパー(`fmtDuration` 等が `'ja-JP'` をハードコードしたデフォルト引数で委譲するだけ)。フォーマット入口が 2 系統ある | `src/helpers.js` | 中 |
| P7 | `state/index.js` が `export * from` のバレル 11 連発。デッドコード検出とリネームを妨げる | `src/state/index.js` | 中 |
| P8 | 巨大コンポーネント: `TeamReport.jsx` 648 行、`Report/index.jsx` 318 行、`Settings/panels.jsx` 312 行、`Settings/index.jsx` 296 行 | `src/screens/` | 中 |
| P9 | レイヤ違反の芽: `storage.js` が `./state` から `STATE_KEY` を import(永続化層 → 状態層への依存)。`data.js` は `state/schema.js` からしか使われていない | `src/storage.js`, `src/data.js` | 小 |
| P10 | `src/` 直下にフラットなファイル群(`helpers.js`, `history.js`, `persistence.js`, `storage.js`, `data.js`, `features.js`)と構造化ディレクトリ(`state/`, `app/`, `screens/`)が混在 | `src/` | 小 |

### 方針

**ビッグバン書き換えはしない。** lint・テストが緑で構造も概ね健全なため、「全フェーズで常にテスト緑・コミット単位で巻き戻せる」漸進的リファクタリングを行う。各フェーズは独立して価値があり、途中で止めても壊れない。

---

## Phase 0: 安全網の整備(最優先・他の全てを停止してでも先にやる)

**目的**: 巻き戻し手段と検証手段を確保する。これなしでリファクタリングを始めてはいけない。

作業:
1. `git init` → `.gitignore` 確認(既存)→ 初期コミット。可能なら GitHub 等にリモートを作成して push
2. `vitest` のカバレッジ計測を有効化(`@vitest/coverage-v8` 追加、`npm run test:coverage`)し、現状値を記録
3. App 全体のスモークテストを 1 本追加(`@testing-library/react` + `jsdom`):「起動 → オンボーディング → タスク追加 → 開始 → 停止」がレンダリングエラーなく通ること
4. `knip`(未使用 export / ファイル / 依存の検出)を devDependency に追加し、初回レポートを取得
5. CI 相当のチェックを 1 コマンド化: `npm run check` = lint + test + build

完了条件: 初期コミットが存在し、`npm run check` が緑。
リスク: ほぼゼロ。所要: 半日。

---

## Phase 1: 棚卸しと製品判断(コードを変えないフェーズ)

**目的**: 将来残すものと、今は隔離すべきものを確定する。英語対応とチーム対応は削除せず、正式化までの扱いを決める。

作業:
1. knip レポートを精査し、未使用 export / 未使用 i18n キーの一覧を作成(`export *` バレルのせいで偽陰性が出るため、Phase 2 のバレル整理後に再実行する前提で一次リストとする)
2. i18n キーの実使用調査: `t()` / `tx()` 呼び出しを全件抽出し、ja-JP / en-US 両方の未参照キーを洗い出す
3. **製品判断 A(確定)**: en-US ロケールは将来的に正式対応したいので削除しない。当面は「準備中」として保持し、リファクタリングでは `locale` の受け渡しと翻訳キー整合性を壊さない
4. **製品判断 B(方針確定・詳細未定)**: チーム機能(team.js / TeamReport / teamWorkspace スキーマ / FEATURES.teamLights)は削除しない。ただし「チーム対応」が何を意味するかは未確定なので、個人運用が安定するまでは実験的機能として隔離し、README では正式機能として過剰に約束しない
5. CSS(`src/styles/` 約 8 ファイル)の未使用セレクタを一次調査

成果物: `docs/inventory.md`(削除候補リスト+判断結果)、`docs/team-feature-brief.md`(チーム機能の仮説と未決事項)。
完了条件: 英語対応は保持、チーム対応は隔離という方針が文書化されている。
リスク: ゼロ(読み取りのみ)。所要: 半日〜1 日。

---

## Phase 2: 低リスクの機械的整理

**目的**: 挙動を一切変えずに、構造のノイズを除去する。1 項目 = 1 コミット。

作業(依存順):
1. `state/index.js` のバレルを `export * from` → 名前付き re-export に変換(機械的作業。これで knip の精度が上がる)
2. knip を再実行し、確定した未使用 export・未使用ファイルを削除
3. `data.js` を `state/schema.js` に統合(唯一の利用者のため)。`features.js` は利用箇所が 2 ファイルだけなので据え置きでよい
4. レイヤ整理: `STATE_KEY` の定義を `storage.js` 側(または独立した定数ファイル)へ移し、永続化層から状態層への import を解消
5. `helpers.js` の解体:
   - i18n への単純委譲(`fmtDuration`, `fmtDurationShort`, `fmtRel`, `fmtDateHeader`, `getTaskDuePresets`)は呼び出し側を i18n 直接利用に書き換えて削除。`'ja-JP'` ハードコードのデフォルトは「現在の locale を必ず渡す」規約に統一
   - 日時変換ユーティリティ(`toDateTimeLocalValue` 等)→ `src/lib/datetime.js`
   - ticker(`useTicker`, `resyncTickersNow`)→ `src/lib/ticker.js`(React hook と通知レジストリのペアとして独立)
6. `src/` 直下の残りを整理: `history.js` → `src/state/` or `src/lib/`、`persistence.js`・`storage.js` → `src/persistence/` に集約
7. 未使用 i18n キーの整理(Phase 1 のリストに基づく)。en-US は削除しない。ja-JP / en-US のキー構造を揃え、削る場合は両ロケールで同時に削る

検証: 各コミットで `npm run check` 緑+スモークテスト緑。
完了条件: knip がクリーン(意図的な例外を除く)、`src/` 直下が `App.jsx` / `main.jsx` / `useAppState.js` 程度になる。
リスク: 小。所要: 1〜2 日。

---

## Phase 3: ビュー配線の単純化(最も価値が高い構造変更)

**目的**: `useAppState` → `controller` → `App` の 3 層パススルーを 2 層に圧縮し、「アクションを 1 個増やすたびに 3 ファイル編集」状態を解消する。

作業:
1. まず `useAppState.js` のアクション定義をテーブル駆動に変える: 55 個の個別ラッパーを「`*InState` 関数 + 結果変換(`toActionResult` / `toStateActionResult`)+ 永続化スケジュール」を共通化したファクトリで生成する。シグネチャが特殊なもの(プレビュー系、バックアップ系)だけ手書きを残す
2. `app/controller.js` の `buildViewState` は `app.state` のほぼ全フィールドの手書きコピー。view 専用に加工しているもの(`todayLabel`, `overlapRepair.warning`)だけ残し、素通しフィールドは `app.state` をそのまま渡す形に変える
3. `createViewActions` のうち「`app.actions.X` を呼ぶだけ」「呼んでから `closeSheet()` するだけ」のものをパターン化し、トースト表示・シート閉鎖の合成を宣言的に書けるようにする
4. アクション戻り値の規約を 1 つに統一(現状 `toActionResult` と `toStateActionResult` の 2 系統)

検証: 既存 59 テスト+スモークテスト。このフェーズの前に、シート経由の主要フロー(割り込み記録、押し忘れ追加、イベント編集)の結合テストを 3〜5 本足してから着手する。
完了条件: 新アクション追加時の編集箇所が 1〜2 ファイルになる。`useAppState.js` + `controller.js` の合計行数が概ね半減(約 740 行 → 400 行以下)。
リスク: 中(配線ミスは型がないため実行時にしか出ない。JSDoc の `@typedef` で view-state / actions の形を明文化するとよい)。所要: 2〜3 日。

---

## Phase 4: 大型コンポーネントの分割

**目的**: 個人運用の主要画面を中心に、画面コンポーネントを「1 ファイル 1 関心事・200 行目安」に分割する。

**前提**: チーム機能は将来残したいが、個人運用が安定するまでは詰めない。`TeamReport.jsx` と `state/team.js` は削除しないが、このフェーズではチーム機能の大規模な設計変更を主目的にしない。

作業(残った場合):
1. `Report/index.jsx`(318 行): 個人レポートの期間切り替えロジックを `reportMetrics.js` 側へ寄せ、表示専用に
2. `Settings/index.jsx` + `panels.jsx`(計 608 行): 個人運用に関わるパネル(外観 / データ管理 / カテゴリ管理)を優先して分割。チーム設定は境界を明確にするだけに留める
3. `Log` / `History` 周辺の個人運用導線に追加スモークテストを足す
4. `TeamReport.jsx`(648 行): 当面は正式化しないため、大規模分割は後回し。ただし import / archive / ambient の境界を崩さないよう TODO と docs を残す
5. 分割と同時に、コンポーネント間で受け渡す props を view-state 丸ごとではなく必要フィールドに絞る

検証: 各画面のレンダリングスモークテスト(Phase 3 で追加済みのもの+画面ごとに 1 本)。
完了条件: 個人運用の主要画面で 300 行超の `.jsx` がなくなる。`TeamReport.jsx` は後続のチーム運用設計まで例外として許容する。
リスク: 中(見た目の崩れはテストで捕まらない。各画面のビフォー/アフターを `npm run dev` で目視確認する手順をフェーズ内に含める)。所要: 2〜3 日。

---

## Phase 5: 将来機能の隔離と正式化準備

**目的**: 将来の英語対応・チーム対応を残しつつ、現時点で未確定なものが日常の保守性を下げないようにする。

作業:
1. en-US ロケールは保持し、ja-JP とキー構造が一致することをテストで保証する。README では「英語対応予定」または「言語切替は準備中」として現状を正直に書く
2. `helpers.js` などに残る `'ja-JP'` デフォルトを減らし、画面から現在 locale を渡す規約に寄せる
3. チーム機能は `FEATURES.teamLights` 配下に閉じ込め、個人利用の主要導線に影響しないようにする。個人運用が安定するまで、チーム機能の UX 拡張はしない
4. `docs/team-feature-brief.md` を作り、「チーム対応」が指しうる案を整理する: 配布タスク、共通カテゴリ、日次/月次アーカイブ集計、メンバー比較、リアルタイム在席共有など
5. README / docs を実態に合わせて更新。ただしチーム機能は正式な約束ではなく、探索中として表現する

検証: 旧形式の localStorage ダンプ(チームデータ入り)を fixture 化し、将来機能を隔離してもバックアップ JSON のインポート互換が保たれることを確認。
完了条件: 英語対応とチーム対応を削除せず、個人利用の保守性と将来拡張の余地が両立している。
リスク: 中(曖昧なチーム概念がコード構造に漏れる)。所要: 1〜2 日。

---

## Phase 6: 再発防止と仕上げ

**目的**: 同じ無駄が再蓄積しない仕組みを残す。

作業:
1. ESLint にレイヤ規約を追加: `no-restricted-imports` で「`state/` から `screens/` を import 禁止」「`lib/` は React 以外に依存しない」等
2. `knip` を `npm run check` に組み込み(未使用 export をエラー化)
3. `docs/architecture.md` を新規作成: レイヤ構成(lib → state → useAppState → controller → screens)、アクション追加手順、i18n キー追加手順を各 10 行程度で
4. カバレッジの最低ライン(Phase 0 の実測値)を CI 化(GitHub Actions: `npm run check`)

完了条件: `npm run check` 一発で lint / test / knip / build が全部走る。
リスク: ほぼゼロ。所要: 半日。

---

## 全体スケジュールとマイルストーン

| フェーズ | 所要目安 | 依存 | 中断可能性 |
|---------|---------|------|-----------|
| 0 安全網 | 0.5 日 | なし | 不可(必須) |
| 1 棚卸し | 0.5〜1 日 | 0 | ここで止めても価値あり |
| 2 機械的整理 | 1〜2 日 | 1 | コミット単位で中断可 |
| 3 配線単純化 | 2〜3 日 | 2 | フェーズ境界で中断可 |
| 4 コンポーネント分割 | 2〜3 日 | 3(+1 の判断 B) | 画面単位で中断可 |
| 5 スコープ反映 | 1〜2 日 | 1 の判断確定 | 判断次第でスキップ可 |
| 6 再発防止 | 0.5 日 | 2 以降いつでも | — |

合計: 約 8〜12 営業日。

## 運用ルール(全フェーズ共通)

- 1 論理変更 = 1 コミット。コミット前に `npm run check` 必須
- 挙動変更とリファクタリングを同一コミットに混ぜない
- localStorage スキーマ(`interruptlog_state_v2`)とバックアップ JSON の互換は全フェーズで不変条件。壊す場合は `SCHEMA_VERSION` を上げて移行コードを書く
- フェーズ途中で新機能要望が来たら、リファクタリングを止めて main 相当に戻ってから対応する(ブランチを分ける)

## 着手前にオーナーが決めること(ブロッカー)

1. **判断 A(済)**: en-US ロケールは削除せず、将来正式対応に向けて保持する
2. **判断 B(暫定)**: チーム機能は削除せず、ただし個人運用が安定し、正式な「チーム対応」の定義が固まるまでは隔離する
3. リモートリポジトリをどこに置くか(GitHub 等)
