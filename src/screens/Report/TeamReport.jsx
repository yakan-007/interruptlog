import { useMemo, useRef, useState } from 'react';
import Icons from '../../icons';
import { fmtDurationMin, fmtDurationShort } from '../../helpers';
import {
  aggregateArchiveRows,
  aggregateTeamReportRows,
  compareArchivePeriods,
  parseReportCsvFiles,
} from '../../state';
import StatCard from './StatCard';
import { PayloadImportSheet, TaskTemplateSheet } from '../Settings/panels';

const EMPTY_ARCHIVE_ENTRIES = [];

export default function TeamReport({ state, actions }) {
  const [view, setView] = useState('import');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ files: 0, skipped: 0 });
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [archiveGrain, setArchiveGrain] = useState('month');
  const [compareGrain, setCompareGrain] = useState('month');
  const inputRef = useRef(null);

  const summary = useMemo(() => aggregateTeamReportRows(rows), [rows]);
  const archiveEntries = state.teamArchive?.entries ?? EMPTY_ARCHIVE_ENTRIES;
  const archivePeriods = useMemo(() => aggregateArchiveRows(archiveEntries, archiveGrain), [archiveEntries, archiveGrain]);
  const comparison = useMemo(() => compareArchivePeriods(archiveEntries, compareGrain), [archiveEntries, compareGrain]);

  const importFiles = async (fileList) => {
    const csvFiles = Array.from(fileList ?? []).filter((file) => /\.csv$/i.test(file.name) || file.type.includes('csv'));
    if (csvFiles.length === 0) {
      setError('CSVファイルを選択してください');
      return;
    }
    try {
      const payloads = await Promise.all(csvFiles.map(async (file) => ({ name: file.name, text: await file.text() })));
      const parsed = parseReportCsvFiles(payloads);
      setRows(parsed.rows);
      setMeta({ files: parsed.files, skipped: parsed.skipped });
      setSaveResult(null);
      setError('');
    } catch {
      setError('CSVを読み込めませんでした');
    }
  };

  const saveToArchive = () => {
    const result = actions.addRowsToTeamArchive(rows);
    setSaveResult(result);
  };

  return (
    <>
      <div className="il-body il-body-report">
        <div className="il-report-submode">
          <div className="il-seg full">
            <button className={view === 'import' ? 'active' : ''} onClick={() => setView('import')}>読み込み</button>
            <button className={view === 'distribution' ? 'active' : ''} onClick={() => setView('distribution')}>配布</button>
            <button className={view === 'archive' ? 'active' : ''} onClick={() => setView('archive')}>アーカイブ</button>
            <button className={view === 'compare' ? 'active' : ''} onClick={() => setView('compare')}>比較</button>
          </div>
        </div>

        {view === 'import' && (
          <ImportView
            rows={rows}
            meta={meta}
            error={error}
            summary={summary}
            saveResult={saveResult}
            inputRef={inputRef}
            onImportFiles={importFiles}
            onSaveToArchive={saveToArchive}
          />
        )}
        {view === 'distribution' && (
          <DistributionView
            state={state}
            actions={actions}
            onCreateTemplate={() => setPanel({ type: 'taskTemplate' })}
            onEditTemplate={(template) => setPanel({ type: 'taskTemplate', template })}
            onImportTaskPack={() => setPanel({ type: 'taskPackImport' })}
          />
        )}
        {view === 'archive' && (
          <ArchiveView
            entries={archiveEntries}
            grain={archiveGrain}
            periods={archivePeriods}
            onGrainChange={setArchiveGrain}
          />
        )}
        {view === 'compare' && (
          <CompareView
            entries={archiveEntries}
            grain={compareGrain}
            comparison={comparison}
            onGrainChange={setCompareGrain}
          />
        )}
      </div>

      {panel?.type === 'taskPackImport' && (
        <PayloadImportSheet
          title="タスクパックを読み込む"
          copy="配布されたタスクを、自分の未完了タスクとして追加します。同じ配布版は重複追加しません。"
          label="タスクパックJSON"
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importTaskPack(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {panel?.type === 'taskTemplate' && (
        <TaskTemplateSheet
          template={panel.template}
          categories={state.categories}
          onClose={() => setPanel(null)}
          onSave={(template) => {
            const result = actions.saveTaskTemplate(template);
            if (result.ok) setPanel(null);
          }}
          onDelete={(id) => { actions.deleteTaskTemplate(id); setPanel(null); }}
        />
      )}
    </>
  );
}

function ImportView({ rows, meta, error, summary, saveResult, inputRef, onImportFiles, onSaveToArchive }) {
  return (
    <>
      <div
        className="il-team-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onImportFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={(event) => onImportFiles(event.target.files)}
        />
        <button className="btn secondary fill" onClick={() => inputRef.current?.click()}>
          {Icons.download(14)} CSVを読み込む
        </button>
        <div className="copy">複数人の日次CSVをまとめて選択できます。読み込んだ内容は、必要なときだけアーカイブに保存します。</div>
        {error && <div className="il-inline-error">{error}</div>}
        {meta.files > 0 && (
          <div className="il-team-importmeta">
            {meta.files}ファイル · {summary.rowCount}行
            {meta.skipped > 0 ? ` · ${meta.skipped}行をスキップ` : ''}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <SummaryStats summary={summary} />
          <div className="il-report-export">
            <button className="btn primary fill" onClick={onSaveToArchive}>{Icons.check(14)} アーカイブに保存</button>
            {saveResult && (
              <div className="il-report-exportcopy">
                {saveResult.addedEntries}行を保存
                {saveResult.skippedEntries > 0 ? ` · ${saveResult.skippedEntries}行は重複または不正のためスキップ` : ''}
              </div>
            )}
          </div>
          <TeamSummaryCards summary={summary} />
        </>
      )}
    </>
  );
}

function ArchiveView({ entries, grain, periods, onGrainChange }) {
  const latest = periods[0] ?? null;
  return (
    <>
      <div className="il-report-submode">
        <div className="il-seg full">
          <button className={grain === 'month' ? 'active' : ''} onClick={() => onGrainChange('month')}>月次</button>
          <button className={grain === 'year' ? 'active' : ''} onClick={() => onGrainChange('year')}>年次</button>
        </div>
      </div>
      {entries.length === 0 ? (
        <EmptyTeamCard title="アーカイブはまだ空です" copy="読み込みタブでCSVを読み込み、アーカイブに保存すると月次・年次で見返せます。" />
      ) : (
        <>
          {latest && <SummaryStats summary={latest} />}
          <div className="il-card">
            <h3>{grain === 'month' ? '月次アーカイブ' : '年次アーカイブ'}</h3>
            {periods.slice(0, 12).map((period, index) => (
              <ArchivePeriodRow key={period.period} period={period} showBorder={index > 0} />
            ))}
          </div>
          {latest && <ArchiveBreakdown summary={latest} />}
        </>
      )}
    </>
  );
}

function DistributionView({ state, actions, onCreateTemplate, onEditTemplate, onImportTaskPack }) {
  const templates = [...(state.taskTemplates ?? [])].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const totalPlannedMinutes = templates.reduce((sum, template) => sum + (template.planning?.plannedDurationMinutes ?? 0), 0);

  return (
    <>
      <div className="il-card">
        <h3>配布用タスク</h3>
        <div className="il-report-taskstats">
          <TeamStat label="件数" value={`${templates.length}件`} />
          <TeamStat label="予定合計" value={fmtDurationMin(totalPlannedMinutes)} />
          <TeamStat label="分類版" value={state.teamWorkspace.taxonomyVersion || '-'} />
        </div>
        <div className="il-report-exportcopy">
          日常タスクとは別管理です。ここにあるものだけがタスクパックに入り、各メンバーの手元に複製されます。
        </div>
      </div>

      <div className="il-card">
        <h3>配布操作</h3>
        <div className="il-team-actiongrid">
          <button className="btn primary fill" onClick={onCreateTemplate}>{Icons.plus(14)} 配布用タスクを追加</button>
          <button className="btn secondary fill" onClick={() => actions.exportTaskPack()} disabled={templates.length === 0}>{Icons.download(14)} タスクパックを書き出す</button>
          <button className="btn secondary fill" onClick={onImportTaskPack}>タスクパックを読み込む</button>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyTeamCard title="配布用タスクはまだありません" copy="まずはここで配布用タスクを作ると、チーム向けのタスクパックを書き出せます。" />
      ) : (
        <div className="il-card">
          <h3>配布用タスク一覧</h3>
          {templates.map((template, index) => (
            <button
              key={template.id}
              className="il-team-templatebutton"
              onClick={() => onEditTemplate(template)}
              style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}
            >
              <span
                className="il-settings-catdot"
                style={{ background: state.categories.find((category) => category.id === template.categoryId)?.color }}
              />
              <span className="main">
                <span className="title">{template.name}</span>
                <span className="sub">
                  {state.categories.find((category) => category.id === template.categoryId)?.name ?? 'カテゴリ未設定'}
                  {' · '}
                  {fmtDurationMin(template.planning?.plannedDurationMinutes ?? 0)}
                  {' · '}
                  {formatTemplateDue(template.planning?.dueAt)}
                </span>
              </span>
              <span className="meta">{Icons.chevR(14)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function CompareView({ entries, grain, comparison, onGrainChange }) {
  const hasCurrent = Boolean(comparison.current.period);
  return (
    <>
      <div className="il-report-submode">
        <div className="il-seg full">
          <button className={grain === 'month' ? 'active' : ''} onClick={() => onGrainChange('month')}>月次</button>
          <button className={grain === 'year' ? 'active' : ''} onClick={() => onGrainChange('year')}>年次</button>
        </div>
      </div>
      {entries.length === 0 || !hasCurrent ? (
        <EmptyTeamCard title="比較できるアーカイブがありません" copy="CSVを保存すると、最新期間と前期間の変化をここで見られます。" />
      ) : (
        <>
          <div className="il-card">
            <h3>比較期間</h3>
            <div className="il-report-taskstats">
              <TeamStat label="最新" value={comparison.current.period || '-'} />
              <TeamStat label="比較元" value={comparison.previous.period || '-'} />
              <TeamStat label="記録行" value={`${comparison.current.rowCount}行`} />
            </div>
          </div>
          <div className="il-report-statgrid">
            <CompareStat label="集中" value={comparison.current.totals.task} delta={comparison.deltas.task} color="var(--task)" />
            <CompareStat label="割り込み" value={comparison.current.totals.interrupt} delta={comparison.deltas.interrupt} color="var(--interrupt)" />
            <CompareStat label="休憩" value={comparison.current.totals.break} delta={comparison.deltas.break} color="var(--break)" />
          </div>
          <ArchiveBreakdown summary={comparison.current} />
        </>
      )}
    </>
  );
}

function SummaryStats({ summary }) {
  return (
    <div className="il-report-statgrid">
      <StatCard label="集中時間" color="var(--task)" value={summary.totals.task} />
      <StatCard label="割り込み時間" color="var(--interrupt)" value={summary.totals.interrupt} />
      <StatCard label="休憩時間" color="var(--break)" value={summary.totals.break} />
    </div>
  );
}

function TeamSummaryCards({ summary }) {
  return (
    <>
      <div className="il-card">
        <h3>チーム合計</h3>
        <div className="il-report-taskstats">
          <TeamStat label="総記録" value={fmtDurationShort(summary.totals.total)} />
          <TeamStat label="割り込み" value={`${summary.totals.interruptCount}件`} />
          <TeamStat label="人数" value={`${summary.members.length}人`} />
        </div>
      </div>
      <MemberList members={summary.members} />
      {summary.senders.length > 0 && <SenderList senders={summary.senders} />}
    </>
  );
}

function ArchiveBreakdown({ summary }) {
  return (
    <>
      <MemberList members={summary.members} />
      {summary.categories.length > 0 && <CategoryList categories={summary.categories} />}
      {summary.senders.length > 0 && <SenderList senders={summary.senders} />}
    </>
  );
}

function MemberList({ members }) {
  const maxTotal = Math.max(...members.map((member) => member.total), 1);
  return (
    <div className="il-card">
      <h3>人別一覧</h3>
      {members.map((member, index) => (
        <div key={member.member} className="il-report-row il-team-memberrow" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="avatar">{member.member[0]}</div>
          <div className="main">
            <div className="title">{member.member}</div>
            <div className="sub">集中 {fmtDurationShort(member.task)} · 割り込み {member.interruptCount}件</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(member.total / maxTotal) * 100}%`, background: 'var(--task)' }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(member.total)}</div>
        </div>
      ))}
    </div>
  );
}

function CategoryList({ categories }) {
  const maxTotal = Math.max(...categories.map((category) => category.total), 1);
  return (
    <div className="il-card">
      <h3>カテゴリ別</h3>
      {categories.slice(0, 8).map((category, index) => (
        <div key={category.category} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="main">
            <div className="title">{category.name}</div>
            <div className="sub">集中 {fmtDurationShort(category.task)} · 割り込み {fmtDurationShort(category.interrupt)}</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(category.total / maxTotal) * 100}%`, background: 'var(--accent)' }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(category.total)}</div>
        </div>
      ))}
    </div>
  );
}

function SenderList({ senders }) {
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);
  return (
    <div className="il-card">
      <h3>発信者別の割り込み</h3>
      {senders.map((sender, index) => (
        <div key={sender.who} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="avatar">{sender.who[0]}</div>
          <div className="main">
            <div className="title">{sender.who}</div>
            <div className="sub">{sender.count}件</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(sender.time / maxSenderTime) * 100}%` }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(sender.time)}</div>
        </div>
      ))}
    </div>
  );
}

function ArchivePeriodRow({ period, showBorder }) {
  return (
    <div className="il-report-row" style={{ borderTop: showBorder ? '0.5px solid var(--hair)' : 'none' }}>
      <div className="main">
        <div className="title">{period.period}</div>
        <div className="sub">{period.members.length}人 · {period.rowCount}行 · 割り込み {period.totals.interruptCount}件</div>
      </div>
      <div className="il-mono value">{fmtDurationShort(period.totals.total)}</div>
    </div>
  );
}

function CompareStat({ label, value, delta, color }) {
  return (
    <div className="il-card il-statcard">
      <div className="il-statcard-head">
        <span className="swatch" style={{ background: color }} />
        <span className="label">{label}</span>
      </div>
      <div className="il-stat">{fmtDurationShort(value)}</div>
      <div className={'il-delta ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')}>{formatDelta(delta)}</div>
    </div>
  );
}

function TeamStat({ label, value }) {
  return (
    <div className="il-taskstat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function EmptyTeamCard({ title, copy }) {
  return (
    <div className="il-card">
      <h3>{title}</h3>
      <div className="il-report-exportcopy">{copy}</div>
    </div>
  );
}

function formatDelta(value) {
  if (!value) return '±0分';
  return `${value > 0 ? '+' : '-'}${fmtDurationShort(Math.abs(value))}`;
}

function formatTemplateDue(dueAt) {
  if (!Number.isFinite(dueAt)) return '期限なし';
  return new Date(dueAt).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
