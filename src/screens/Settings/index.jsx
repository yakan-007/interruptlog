import { useState } from 'react';
import Icons from '../../icons';
import SettingRow from './SettingRow';
import { ACCENTS } from './constants';
import {
  CategorySheet,
  ChipsSheet,
  ConfirmResetSheet,
  ImportSheet,
  InterruptCategorySheet,
  PayloadImportSheet,
} from './panels';

export default function SettingsScreen({ state, actions }) {
  const [panel, setPanel] = useState(null);
  const teamModeEnabled = state.preferences.teamModeEnabled;

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar">
        <div><div className="sub">SETTINGS</div><h1>設定</h1></div>
      </div>

      <div className="il-body il-body-settings">
        <div className="il-section-h"><span>外観</span></div>
        <div className="il-settings-group">
          <SettingRow title="ダークモード" note="端末内に保存されます">
            <button className={'il-toggle' + (state.preferences.dark ? ' on' : '')} onClick={() => actions.setDark(!state.preferences.dark)} aria-label="ダークモードを切り替え" />
          </SettingRow>
          <SettingRow title="アクセントカラー">
            <div className="il-settings-accents">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  aria-label="アクセントカラーを選択"
                  onClick={() => actions.setAccent(color)}
                  className="il-settings-accent"
                  data-selected={state.preferences.accent === color}
                  style={{ background: color }}
                />
              ))}
            </div>
          </SettingRow>
        </div>

        <div className="il-section-h"><span>動作</span></div>
        <div className="il-settings-group">
          <SettingRow title="リスト上部に追加">
            <button className={'il-toggle' + (state.preferences.topAdd ? ' on' : '')} onClick={() => actions.setTopAdd(!state.preferences.topAdd)} aria-label="追加位置を切り替え" />
          </SettingRow>
          <SettingRow title="期限順ソート">
            <button className={'il-toggle' + (state.preferences.sortDue ? ' on' : '')} onClick={() => actions.setSortDue(!state.preferences.sortDue)} aria-label="期限順ソートを切り替え" />
          </SettingRow>
        </div>

        <div className="il-section-h"><span>カテゴリ</span><span className="count">{state.categories.length}</span></div>
        <div className="il-settings-group">
          {state.categories.map((category) => (
            <button key={category.id} className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'category', category })}>
              <span className="il-settings-catdot" style={{ background: category.color }} />
              <span className="tg"><span className="t">{category.name}</span></span>
              {Icons.chevR(14)}
            </button>
          ))}
          <button className="il-setrow il-setbutton accent" onClick={() => setPanel({ type: 'category' })}>
            <span className="tg"><span className="t">{Icons.plus(14)} カテゴリを追加</span></span>
          </button>
        </div>

        <div className="il-section-h"><span>割り込みカテゴリ</span><span className="count">{state.interruptCats.length}</span></div>
        <div className="il-settings-group">
          {state.interruptCats.map((category) => (
            <button key={category.id} className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'interruptCategory', category })}>
              <span className="il-settings-noteicon" aria-hidden="true">{category.icon ? (Icons[category.icon]?.(14) ?? Icons.dots(14)) : Icons.circle(14)}</span>
              <span className="tg"><span className="t">{category.name}</span></span>
              {Icons.chevR(14)}
            </button>
          ))}
          <button className="il-setrow il-setbutton accent" onClick={() => setPanel({ type: 'interruptCategory' })}>
            <span className="tg"><span className="t">{Icons.plus(14)} 割り込みカテゴリを追加</span></span>
          </button>
        </div>

        <div className="il-section-h"><span>よく使う入力</span></div>
        <div className="il-settings-group">
          <button className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'chips', kind: 'who' })}>
            <span className="tg"><span className="t">発信者チップ</span><span className="s">{state.whoChips.length ? state.whoChips.join(' · ') : '未登録'}</span></span>
            {Icons.chevR(14)}
          </button>
          <button className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'chips', kind: 'subject' })}>
            <span className="tg"><span className="t">件名チップ</span><span className="s">{state.subjectChips.length}件</span></span>
            {Icons.chevR(14)}
          </button>
        </div>

        <div className="il-section-h"><span>チーム運用</span>{teamModeEnabled && <span className="count">{state.teamArchive.entries.length}</span>}</div>
        <div className="il-settings-group">
          <SettingRow title="チーム運用を使う" note={teamModeEnabled ? '配布・アーカイブ・比較を使います' : '使わない人の画面にはチーム機能を出しません'}>
            <button className={'il-toggle' + (teamModeEnabled ? ' on' : '')} onClick={() => actions.setTeamModeEnabled(!teamModeEnabled)} aria-label="チーム運用を切り替え" />
          </SettingRow>
          {teamModeEnabled && (
            <>
              <div className="il-setrow il-settings-member">
                <span className="tg">
                  <span className="t">表示名</span>
                  <span className="s">チーム集計用CSVに記録されます</span>
                </span>
                <input
                  className="il-settings-memberinput"
                  value={state.preferences.memberName}
                  onChange={(event) => actions.setMemberName(event.target.value)}
                  placeholder="例: 佐藤"
                  aria-label="表示名"
                />
              </div>
              <div className="il-setrow il-settings-note">
                <span className="il-settings-noteicon" aria-hidden="true">{Icons.report(14)}</span>
                <span className="tg">
                  <div className="t">共通ルールと長期アーカイブ</div>
                  <div className="s">カテゴリやタスクを配布し、日次CSVを蓄積して月次・年次で見返します。</div>
                  <div className="s">分類バージョン: {state.teamWorkspace.taxonomyVersion}</div>
                </span>
              </div>
              <button className="il-setrow il-setbutton" onClick={() => actions.exportTeamSettings()}>
                <span className="tg"><span className="t accent-inline">{Icons.download(14)} チーム設定を書き出す</span><span className="s">タスクカテゴリ、割り込みカテゴリ、入力チップを配布</span></span>
              </button>
              <button className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'teamSettingsImport' })}>
                <span className="tg"><span className="t accent-inline">チーム設定を読み込む</span><span className="s">個人ログを消さずに共通設定だけ更新</span></span>
                {Icons.chevR(14)}
              </button>
              <div className="il-setrow il-settings-note">
                <span className="il-settings-noteicon" aria-hidden="true">{Icons.tasks(14)}</span>
                <span className="tg">
                  <div className="t">配布用タスクの管理場所</div>
                  <div className="s">振り返り → チーム → 配布 で、配布用タスクの作成、タスクパックの書き出し、読み込みを行います。</div>
                </span>
              </div>
              <button className="il-setrow il-setbutton" onClick={() => actions.exportTeamArchive()}>
                <span className="tg"><span className="t accent-inline">{Icons.download(14)} チームアーカイブを書き出す</span><span className="s">保存済みの集計元データを長期保管</span></span>
              </button>
              <button className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'teamArchiveImport' })}>
                <span className="tg"><span className="t accent-inline">チームアーカイブを読み込む</span><span className="s">別端末や過去ファイルのアーカイブを追加</span></span>
                {Icons.chevR(14)}
              </button>
            </>
          )}
        </div>

        <div className="il-section-h"><span>データ</span></div>
        {state.overlapRepair.warning && (
          <div className="il-settings-group">
            <div className="il-setrow">
              <span className="tg">
                <span className="t danger-inline">{Icons.alert(14)} 重複イベントを確認</span>
                <span className="s">未整理の重複があるため、集計や書き出し結果に重複時間が含まれる可能性があります</span>
              </span>
              <button className="btn secondary sm" onClick={() => actions.openOverlapRepair()}>整理</button>
            </div>
          </div>
        )}
        <div className="il-settings-group">
          <div className="il-setrow il-settings-note">
            <span className="il-settings-noteicon" aria-hidden="true">{Icons.alert(14)}</span>
            <span className="tg">
              <div className="t">Web 版の保存について</div>
              <div className="s">データはこのブラウザにのみ保存されます。別端末には自動同期されません。</div>
              <div className="s">大事なログは JSON エクスポートで控えてください。ブラウザデータを削除すると消えます。</div>
            </span>
          </div>
          <button className="il-setrow il-setbutton" onClick={() => actions.exportJson()}>
            <span className="tg"><span className="t accent-inline">{Icons.download(14)} 個人バックアップを書き出す</span><span className="s">このブラウザ内のタスク、履歴、設定をバックアップ</span></span>
          </button>
          <button className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'import' })}>
            <span className="tg"><span className="t accent-inline">個人バックアップを復元</span><span className="s">バックアップからこのブラウザへ復元</span></span>
            {Icons.chevR(14)}
          </button>
          <button className="il-setrow il-setbutton" onClick={() => setPanel({ type: 'reset' })}>
            <span className="tg"><span className="t danger-inline">全データを削除</span><span className="s">この操作は取り消せません</span></span>
            {Icons.chevR(14)}
          </button>
        </div>

        <div className="il-settings-footnote">
          <div className="title">InterruptLog · 割り込みログ</div>
          <div>Web v1 · このブラウザにのみ保存されます</div>
          <div>同期なし · JSON バックアップ対応</div>
        </div>
      </div>

      {panel?.type === 'category' && (
        <CategorySheet
          category={panel.category}
          onClose={() => setPanel(null)}
          onSave={(category) => { actions.saveCategory(category); setPanel(null); }}
          onDelete={(id) => { actions.deleteCategory(id); setPanel(null); }}
        />
      )}
      {panel?.type === 'interruptCategory' && (
        <InterruptCategorySheet
          category={panel.category}
          onClose={() => setPanel(null)}
          onSave={(category) => { actions.saveInterruptCategory(category); setPanel(null); }}
          onDelete={(id) => { actions.deleteInterruptCategory(id); setPanel(null); }}
        />
      )}
      {panel?.type === 'chips' && (
        <ChipsSheet
          kind={panel.kind}
          chips={panel.kind === 'subject' ? state.subjectChips : state.whoChips}
          onClose={() => setPanel(null)}
          onSave={(chips) => { actions.saveChips(panel.kind, chips); setPanel(null); }}
        />
      )}
      {panel?.type === 'import' && (
        <ImportSheet
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importJson(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {panel?.type === 'teamSettingsImport' && (
        <PayloadImportSheet
          title="チーム設定を読み込む"
          copy="タスクカテゴリ、割り込みカテゴリ、入力チップだけを追加・更新します。個人のタスクや履歴は消えません。"
          label="チーム設定JSON"
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importTeamSettings(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {panel?.type === 'teamArchiveImport' && (
        <PayloadImportSheet
          title="チームアーカイブを読み込む"
          copy="保存済みのアーカイブ行を追加します。同じ行は重複保存しません。"
          label="チームアーカイブJSON"
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importTeamArchive(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {panel?.type === 'reset' && (
        <ConfirmResetSheet
          onClose={() => setPanel(null)}
          onConfirm={() => { actions.resetAll(); setPanel(null); }}
        />
      )}
    </div>
  );
}
