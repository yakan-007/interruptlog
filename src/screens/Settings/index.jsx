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
          <ToggleSetting title="ダークモード" note="端末内に保存されます" value={state.preferences.dark} onToggle={() => actions.setDark(!state.preferences.dark)} ariaLabel="ダークモードを切り替え" />
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
          <ToggleSetting title="リスト上部に追加" value={state.preferences.topAdd} onToggle={() => actions.setTopAdd(!state.preferences.topAdd)} ariaLabel="追加位置を切り替え" />
          <ToggleSetting title="期限順ソート" value={state.preferences.sortDue} onToggle={() => actions.setSortDue(!state.preferences.sortDue)} ariaLabel="期限順ソートを切り替え" />
        </div>

        <div className="il-section-h"><span>カテゴリ</span><span className="count">{state.categories.length}</span></div>
        <div className="il-settings-group">
          {state.categories.map((category) => (
            <CategoryRow key={category.id} category={category} onClick={() => setPanel({ type: 'category', category })} />
          ))}
          <AddRowButton label="カテゴリを追加" onClick={() => setPanel({ type: 'category' })} />
        </div>

        <div className="il-section-h"><span>割り込みカテゴリ</span><span className="count">{state.interruptCats.length}</span></div>
        <div className="il-settings-group">
          {state.interruptCats.map((category) => (
            <InterruptCategoryRow key={category.id} category={category} onClick={() => setPanel({ type: 'interruptCategory', category })} />
          ))}
          <AddRowButton label="割り込みカテゴリを追加" onClick={() => setPanel({ type: 'interruptCategory' })} />
        </div>

        <div className="il-section-h"><span>よく使う入力</span></div>
        <div className="il-settings-group">
          <NavRow title="発信者チップ" note={state.whoChips.length ? state.whoChips.join(' · ') : '未登録'} onClick={() => setPanel({ type: 'chips', kind: 'who' })} />
          <NavRow title="件名チップ" note={`${state.subjectChips.length}件`} onClick={() => setPanel({ type: 'chips', kind: 'subject' })} />
        </div>

        <div className="il-section-h"><span>チーム運用</span>{teamModeEnabled && <span className="count">{state.teamArchive.entries.length}</span>}</div>
        <div className="il-settings-group">
          <ToggleSetting title="チーム運用を使う" note={teamModeEnabled ? '配布・アーカイブ・比較を使います' : '使わない人の画面にはチーム機能を出しません'} value={teamModeEnabled} onToggle={() => actions.setTeamModeEnabled(!teamModeEnabled)} ariaLabel="チーム運用を切り替え" />
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
              <SettingsNote icon={Icons.report(14)} title="共通ルールと長期アーカイブ" lines={['カテゴリやタスクを配布し、日次CSVを蓄積して月次・年次で見返します。', `分類バージョン: ${state.teamWorkspace.taxonomyVersion}`]} />
              <ExportRow title="チーム設定を書き出す" note="タスクカテゴリ、割り込みカテゴリ、入力チップを配布" onClick={() => actions.exportTeamSettings()} />
              <NavRow title="チーム設定を読み込む" note="個人ログを消さずに共通設定だけ更新" accent onClick={() => setPanel({ type: 'teamSettingsImport' })} />
              <SettingsNote icon={Icons.tasks(14)} title="配布用タスクの管理場所" lines={['振り返り → チーム → 配布 で、配布用タスクの作成、タスクパックの書き出し、読み込みを行います。']} />
              <ExportRow title="チームアーカイブを書き出す" note="保存済みの集計元データを長期保管" onClick={() => actions.exportTeamArchive()} />
              <NavRow title="チームアーカイブを読み込む" note="別端末や過去ファイルのアーカイブを追加" accent onClick={() => setPanel({ type: 'teamArchiveImport' })} />
            </>
          )}
        </div>

        <div className="il-section-h"><span>データ</span></div>
        {state.overlapRepair.warning && (
          <div className="il-settings-group">
            <RepairWarningRow onRepair={() => actions.openOverlapRepair()} />
          </div>
        )}
        <div className="il-settings-group">
          <SettingsNote icon={Icons.alert(14)} title="Web 版の保存について" lines={['データはこのブラウザにのみ保存されます。別端末には自動同期されません。', '大事なログは JSON エクスポートで控えてください。ブラウザデータを削除すると消えます。']} />
          <ExportRow title="個人バックアップを書き出す" note="このブラウザ内のタスク、履歴、設定をバックアップ" onClick={() => actions.exportJson()} />
          <NavRow title="個人バックアップを復元" note="バックアップからこのブラウザへ復元" accent onClick={() => setPanel({ type: 'import' })} />
          <NavRow title="全データを削除" note="この操作は取り消せません" danger onClick={() => setPanel({ type: 'reset' })} />
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

function ToggleSetting({ title, note, value, onToggle, ariaLabel }) {
  return (
    <SettingRow title={title} note={note}>
      <button className={'il-toggle' + (value ? ' on' : '')} onClick={onToggle} aria-label={ariaLabel} />
    </SettingRow>
  );
}

function CategoryRow({ category, onClick }) {
  return (
    <button className="il-setrow il-setbutton" onClick={onClick}>
      <span className="il-settings-catdot" style={{ background: category.color }} />
      <span className="tg"><span className="t">{category.name}</span></span>
      {Icons.chevR(14)}
    </button>
  );
}

function InterruptCategoryRow({ category, onClick }) {
  return (
    <button className="il-setrow il-setbutton" onClick={onClick}>
      <span className="tg"><span className="t">{category.name}</span></span>
      {Icons.chevR(14)}
    </button>
  );
}

function AddRowButton({ label, onClick }) {
  return (
    <button className="il-setrow il-setbutton accent" onClick={onClick}>
      <span className="tg"><span className="t">{Icons.plus(14)} {label}</span></span>
    </button>
  );
}

function NavRow({ title, note, accent = false, danger = false, onClick }) {
  const titleClass = danger ? 'danger-inline' : accent ? 'accent-inline' : undefined;
  return (
    <button className="il-setrow il-setbutton" onClick={onClick}>
      <span className="tg"><span className={titleClass ? `t ${titleClass}` : 't'}>{title}</span><span className="s">{note}</span></span>
      {Icons.chevR(14)}
    </button>
  );
}

function ExportRow({ title, note, onClick }) {
  return (
    <button className="il-setrow il-setbutton" onClick={onClick}>
      <span className="tg"><span className="t accent-inline">{Icons.download(14)} {title}</span><span className="s">{note}</span></span>
    </button>
  );
}

function SettingsNote({ icon, title, lines }) {
  return (
    <div className="il-setrow il-settings-note">
      <span className="il-settings-noteicon" aria-hidden="true">{icon}</span>
      <span className="tg">
        <div className="t">{title}</div>
        {lines.map((line) => <div key={line} className="s">{line}</div>)}
      </span>
    </div>
  );
}

function RepairWarningRow({ onRepair }) {
  return (
    <div className="il-setrow">
      <span className="tg">
        <span className="t danger-inline">{Icons.alert(14)} 重複イベントを確認</span>
        <span className="s">未整理の重複があるため、集計や書き出し結果に重複時間が含まれる可能性があります</span>
      </span>
      <button className="btn secondary sm" onClick={onRepair}>整理</button>
    </div>
  );
}
