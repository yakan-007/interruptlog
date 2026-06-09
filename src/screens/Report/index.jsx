import { useMemo, useState } from 'react';
import Icons from '../../icons';
import { fmtDurationShort, useTicker } from '../../helpers';
import { selectReportInputs } from '../../state';
import { buildReportMetrics } from './reportMetrics';
import StatCard from './StatCard';
import TaskStat from './TaskStat';
import TeamReport from './TeamReport';

export default function ReportScreen({ state, actions }) {
  const [mode, setMode] = useState('personal');
  const [range, setRange] = useState('day');
  const teamModeEnabled = state.preferences.teamModeEnabled;
  const now = useTicker(1000);
  const { bounds, currentStats, previousStats, compareLabel } = useMemo(
    () => selectReportInputs(state, range, now),
    [state, range, now]
  );

  const total = currentStats.focus + currentStats.interrupt + currentStats.break + currentStats.unknown || 1;
  const deltaHours = (current, previous) => (current - previous) / 3600000;
  const {
    hourly,
    maxHourly,
    dayStats,
    maxDay,
    senders,
    maxSenderTime,
    urgencyStats,
    maxUrgencyTime,
    topUrgency,
    categoryList,
    totalCategoryTime,
    uniqueTaskIds,
    taskReportRows,
    completedTasks,
    incompleteTasks,
    completedInRange,
    taskRate,
    peakHour,
    quietHour,
    hasInterruptTrend,
  } = useMemo(
    () => buildReportMetrics(state, currentStats, bounds, now),
    [bounds, currentStats, now, state]
  );

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar">
        <div><div className="sub">REPORT</div><h1>振り返り</h1></div>
        <div className="actions">
          {mode === 'personal' && (
            <button className="il-iconbtn" aria-label="CSVを書き出す" onClick={() => actions.exportReportCsv(range)}>{Icons.download(18)}</button>
          )}
        </div>
      </div>

      {teamModeEnabled && (
        <div className="il-report-mode">
          <div className="il-seg full">
            <button className={mode === 'personal' ? 'active' : ''} onClick={() => setMode('personal')}>個人</button>
            <button className={mode === 'team' ? 'active' : ''} onClick={() => setMode('team')}>チーム</button>
          </div>
        </div>
      )}

      {teamModeEnabled && mode === 'team' ? <TeamReport state={state} actions={actions} /> : (
        <>
          <div className="il-report-range">
            <div className="il-seg full">
              {[['day', '日'], ['week', '週'], ['month', '月'], ['year', '年']].map(([key, label]) => (
                <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="il-body il-body-report">
            {teamModeEnabled && !state.preferences.memberName && (
              <div className="il-warn">
                {Icons.alert(14)}
                <div>
                  <div className="title">表示名が未設定です</div>
                  <div className="copy">チーム集計用CSVを書き出す前に、設定で表示名を入力してください</div>
                </div>
              </div>
            )}

            {state.overlapRepair.warning && (
              <div className="il-warn">
                {Icons.alert(14)}
                <div>
                  <div className="title">{state.overlapRepair.warning.conflicts.length}件の重複イベントが未整理です</div>
                  <div className="copy">レポート集計や CSV に重複時間が含まれる可能性があります</div>
                </div>
                <button className="btn secondary sm" onClick={() => actions.openOverlapRepair()}>重複を整理</button>
              </div>
            )}

            <div className="il-report-statgrid">
              <StatCard label="集中時間" color="var(--task)" value={currentStats.focus} delta={deltaHours(currentStats.focus, previousStats.focus)} deltaLabel={compareLabel} />
              <StatCard label="割り込み時間" color="var(--interrupt)" value={currentStats.interrupt} delta={deltaHours(currentStats.interrupt, previousStats.interrupt)} deltaLabel={compareLabel} deltaInvert />
              <StatCard label="休憩時間" color="var(--break)" value={currentStats.break} delta={deltaHours(currentStats.break, previousStats.break)} deltaLabel={compareLabel} />
              <StatCard label="未分類時間" color="var(--unknown)" value={currentStats.unknown} delta={deltaHours(currentStats.unknown, previousStats.unknown)} deltaLabel={compareLabel} deltaInvert />
            </div>

            <div className="il-card">
              <h3>時間の内訳</h3>
              <div className="il-hbar tall">
                <span style={{ width: `${currentStats.focus / total * 100}%`, background: 'var(--task)' }} />
                <span style={{ width: `${currentStats.interrupt / total * 100}%`, background: 'var(--interrupt)' }} />
                <span style={{ width: `${currentStats.break / total * 100}%`, background: 'var(--break)' }} />
                <span style={{ width: `${currentStats.unknown / total * 100}%`, background: 'var(--unknown)' }} />
              </div>
              <div className="il-hbar-legend">
                {[['focus', 'task', '集中'], ['interrupt', 'interrupt', '割り込み'], ['break', 'break', '休憩'], ['unknown', 'unknown', '未分類']].map(([statKey, colorKey, label]) => (
                  <span key={statKey} className="l">
                    <span className="sw" style={{ background: `var(--${colorKey})` }} />
                    {label} {Math.round(currentStats[statKey] / total * 100)}%
                  </span>
                ))}
              </div>
            </div>

            <div className="il-card">
              <h3>時間帯別の割り込み</h3>
              <div className="il-vchart">
                {hourly.map((value, index) => {
                  const hot = index === peakHour && value > 0;
                  return (
                    <div key={index}>
                      <div className="bar" style={{ height: `${Math.round((value / maxHourly) * 80)}%`, background: hot ? 'var(--interrupt)' : 'var(--ink-5)', borderRadius: '3px 3px 0 0' }} />
                      <div className={'lbl' + (hot ? ' hot' : '')}>{9 + index}</div>
                    </div>
                  );
                })}
              </div>
              {hasInterruptTrend ? (
                <div className="il-report-meta">
                  <span>ピーク: <strong className="peak">{9 + peakHour}時</strong> · {fmtDurationShort(hourly[peakHour])}</span>
                  <span>静かな時間: {9 + quietHour}時</span>
                </div>
              ) : (
                <div className="il-report-emptytrend">
                  まだ傾向を出せるほど割り込み記録がありません
                </div>
              )}
            </div>

            {currentStats.interrupt > 0 && (
              <div className="il-card">
                <h3>緊急度別の割り込み</h3>
                <div className="il-urgency-report">
                  {urgencyStats.map((item) => (
                    <div key={item.key} className="il-urgency-report-row">
                      <div className="main">
                        <span className={'il-chip sm urg-' + item.key}>{item.label}</span>
                        <span className="copy">{item.copy}</span>
                      </div>
                      <div className="meter">
                        <div style={{ width: `${(item.time / maxUrgencyTime) * 100}%`, background: item.color }} />
                      </div>
                      <div className="value">
                        <span>{item.count}件</span>
                        <strong className="il-mono">{fmtDurationShort(item.time)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="il-report-emptytrend">
                  {topUrgency.time > 0
                    ? `${topUrgency.label}の割り込みが一番長めです。${topUrgency.key === 'low' ? 'まとめて聞く時間を作る候補です。' : topUrgency.key === 'high' ? '一次対応や通知設計を見直す候補です。' : '共有不足や確認フローを見直す候補です。'}`
                    : '緊急度の傾向は、割り込み記録が増えると見えてきます。'}
                </div>
              </div>
            )}

            <div className="il-card">
              <h3>曜日別の傾向</h3>
              <div className="il-vchart">
                {dayStats.map((day, index) => (
                  <div key={index} className="il-report-weekday">
                    <div className="stack interrupt" style={{ height: `${(day.interrupt / maxDay) * 80}%` }} />
                    <div className="stack task" style={{ height: `${(day.focus / maxDay) * 80}%` }} />
                    <div className="lbl">{day.day}</div>
                  </div>
                ))}
              </div>
            </div>

            {senders.length > 0 && (
              <div className="il-card">
                <h3>主な発信者</h3>
                {senders.map((person, index) => (
                  <div key={person.who} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
                    <div className="avatar">{person.who[0]}</div>
                    <div className="main">
                      <div className="title">{person.who}</div>
                      <div className="sub">{person.count}件</div>
                    </div>
                    <div className="spark">
                      <div style={{ width: `${(person.time / maxSenderTime) * 100}%` }} />
                    </div>
                    <div className="il-mono value">{fmtDurationShort(person.time)}</div>
                  </div>
                ))}
              </div>
            )}

            {categoryList.length > 0 && (
              <div className="il-card">
                <h3>カテゴリ別時間配分</h3>
                {categoryList.map((category, index) => {
                  const categoryInfo = state.categories.find((item) => item.id === category.id);
                  const percent = Math.round((category.time / totalCategoryTime) * 100);
                  return (
                    <div key={category.id} className="il-report-categoryrow" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
                      <div className="header">
                        <span className="name">
                          <span className="swatch" style={{ background: categoryInfo?.color }} />
                          {categoryInfo?.name ?? category.id}
                        </span>
                        <span className="il-mono value">{fmtDurationShort(category.time)} <span className="muted">· {percent}%</span></span>
                      </div>
                      <div className="bar">
                        <div style={{ width: `${percent}%`, background: categoryInfo?.color, opacity: 0.85 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="il-card">
              <h3>タスクの処理状況</h3>
              <div className="il-report-taskstats">
                <TaskStat label="タスク数" value={uniqueTaskIds.length} />
                <TaskStat label="完了" value={completedInRange} />
                <TaskStat label="未完了" value={uniqueTaskIds.length - completedInRange} />
                <TaskStat label="処理率" value={`${taskRate}%`} accent />
              </div>
              {taskReportRows.length > 0 && (
                <div className="il-report-tasklists">
                  <TaskReportList title="完了したタスク" empty="この期間に完了したタスクはありません" tasks={completedTasks} />
                  <TaskReportList title="未完了のタスク" empty="未完了の記録タスクはありません" tasks={incompleteTasks} />
                </div>
              )}
            </div>

            <div className="il-report-export">
              <button className="btn secondary fill" onClick={() => actions.exportReportCsv(range)}>{Icons.download(14)} CSV エクスポート</button>
              <div className="il-report-exportcopy">
                CSV には現在の表示期間だけを書き出します。集計元はこのブラウザに保存された履歴です。
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TaskReportList({ title, empty, tasks }) {
  return (
    <div className="il-report-tasklist">
      <div className="il-report-tasklist-title">
        <span>{title}</span>
        <span className="count">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="il-report-taskempty">{empty}</div>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="il-report-taskrow">
            <span className="swatch" style={{ background: task.categoryColor }} />
            <div className="main">
              <div className="name">{task.name}</div>
              <div className="meta">
                {task.categoryName && <span>{task.categoryName}</span>}
                <span>{fmtDurationShort(task.time)}</span>
                {task.completedInRange && task.completedAt && <span>{formatReportTaskDate(task.completedAt)} 完了</span>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatReportTaskDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
