import { useMemo, useState } from 'react';
import Icons from '../../icons';
import { fmtDurationShort, useTicker } from '../../helpers';
import { selectReportInputs } from '../../state';
import StatCard from './StatCard';
import TaskStat from './TaskStat';
import TeamReport from './TeamReport';

export default function ReportScreen({ state, actions }) {
  const [mode, setMode] = useState('personal');
  const [range, setRange] = useState('week');
  const teamModeEnabled = state.preferences.teamModeEnabled;
  const now = useTicker(1000);
  const { bounds, currentStats, previousStats, compareLabel } = useMemo(
    () => selectReportInputs(state, range, now),
    [state, range, now]
  );

  const total = currentStats.focus + currentStats.interrupt + currentStats.break + currentStats.unknown || 1;
  const deltaHours = (current, previous) => (current - previous) / 3600000;

  const hourly = Array(12).fill(0);
  for (const event of currentStats.events.filter((item) => item.type === 'interrupt')) {
    const hour = new Date(event.clippedStart).getHours();
    if (hour >= 9 && hour <= 20) hourly[hour - 9] += event.durationMs;
  }
  const maxHourly = Math.max(...hourly, 1);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const dayStats = Array(7).fill(null).map((_, index) => {
    const dayStart = now - (6 - index) * 86400000;
    const base = new Date(dayStart);
    base.setHours(0, 0, 0, 0);
    const dayInput = selectReportInputs(state, 'day', base.getTime() + 86399999);
    return {
      day: weekDays[new Date(dayStart).getDay()],
      focus: dayInput.currentStats.focus,
      interrupt: dayInput.currentStats.interrupt,
    };
  });
  const maxDay = Math.max(...dayStats.map((day) => day.focus + day.interrupt), 1);

  const senderMap = {};
  for (const event of currentStats.events.filter((item) => item.type === 'interrupt' && item.who)) {
    if (!senderMap[event.who]) senderMap[event.who] = { who: event.who, count: 0, time: 0 };
    senderMap[event.who].count += 1;
    senderMap[event.who].time += event.durationMs;
  }
  const senders = Object.values(senderMap).sort((a, b) => b.time - a.time).slice(0, 5);
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);

  const categoryMap = {};
  for (const event of currentStats.events.filter((item) => item.type === 'task' && item.categoryId)) {
    if (!categoryMap[event.categoryId]) categoryMap[event.categoryId] = { id: event.categoryId, time: 0 };
    categoryMap[event.categoryId].time += event.durationMs;
  }
  const categoryList = Object.values(categoryMap).sort((a, b) => b.time - a.time);
  const totalCategoryTime = categoryList.reduce((sum, category) => sum + category.time, 0) || 1;

  const taskEvents = currentStats.events.filter((event) => event.type === 'task' && event.taskId);
  const uniqueTaskIds = [...new Set(taskEvents.map((event) => event.taskId))];
  const completedInRange = uniqueTaskIds.filter((id) => {
    const task = state.tasks.find((item) => item.id === id);
    return task?.isCompleted && task.completedAt >= bounds.since && task.completedAt < bounds.until;
  }).length;
  const taskRate = uniqueTaskIds.length > 0 ? Math.round((completedInRange / uniqueTaskIds.length) * 100) : 0;

  const peakHour = hourly.indexOf(Math.max(...hourly));
  const quietHour = hourly.indexOf(Math.min(...hourly));

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
              {currentStats.interrupt > 0 && (
                <div className="il-report-meta">
                  <span>ピーク: <strong className="peak">{9 + peakHour}時</strong> · {fmtDurationShort(hourly[peakHour])}</span>
                  <span>静かな時間: {9 + quietHour}時</span>
                </div>
              )}
            </div>

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
