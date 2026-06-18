import { useMemo, useState } from 'react';
import { fmtDurationShort } from '../../lib/formatters';
import { buildWeeklyReview } from '../../state';
import { categoryLabel, formatDate, formatDateTime, t, tx, urgencyLabel } from '../../i18n';
import TaskStat from './TaskStat';

export function BreakdownCard({ currentStats, locale, total }) {
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.breakdown')}</h3>
      <div className="il-hbar tall">
        <span style={{ width: `${currentStats.focus / total * 100}%`, background: 'var(--task)' }} />
        <span style={{ width: `${currentStats.interrupt / total * 100}%`, background: 'var(--interrupt)' }} />
        <span style={{ width: `${currentStats.break / total * 100}%`, background: 'var(--break)' }} />
      </div>
      <div className="il-hbar-legend">
        {[['focus', 'task', t(locale, 'common.task')], ['interrupt', 'interrupt', t(locale, 'common.interrupt')], ['break', 'break', t(locale, 'common.break')]].map(([statKey, colorKey, label]) => (
          <span key={statKey} className="l">
            <span className="sw" style={{ background: `var(--${colorKey})` }} />
            {label} {Math.round(currentStats[statKey] / total * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function HourlyInterruptsCard({
  hasInterruptTrend,
  hourly,
  locale,
  maxHourly,
  peakHour,
  quietHour,
}) {
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.hourlyInterrupts')}</h3>
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
          <span>{t(locale, 'report.peak')}: <strong className="peak">{9 + peakHour}:00</strong> · {fmtDurationShort(hourly[peakHour], locale)}</span>
          <span>{t(locale, 'report.quietHour')}: {9 + quietHour}:00</span>
        </div>
      ) : (
        <div className="il-report-emptytrend">
          {t(locale, 'report.noInterruptTrend')}
        </div>
      )}
    </div>
  );
}

export function WeeklyReviewCard({ state, now }) {
  const review = useMemo(() => buildWeeklyReview(state, now), [state, now]);
  return (
    <div className="il-card il-weekly-review">
      <h3>{t(state.preferences.locale, 'report.review')}</h3>
      <div className="il-report-taskstats">
        <TaskStat label={t(state.preferences.locale, 'report.focusRate')} value={`${review.focusRate}%`} accent />
        <TaskStat label={t(state.preferences.locale, 'report.peak')} value={`${review.peakHour}:00`} />
        <TaskStat label={t(state.preferences.locale, 'report.quietHour')} value={`${review.quietHour}:00`} />
      </div>
      <div className="il-review-lines">
        <div>{tx(state.preferences.locale, 'report.focusAndInterrupt', { focus: fmtDurationShort(review.focus, state.preferences.locale), interrupt: fmtDurationShort(review.interrupt, state.preferences.locale) })}</div>
        <div>{review.topSender ? `${t(state.preferences.locale, 'report.topSender')}: ${review.topSender.label} (${tx(state.preferences.locale, 'common.count', review.topSender.count)})` : t(state.preferences.locale, 'report.noSender')}</div>
        <div>{review.categoryName ? `${t(state.preferences.locale, 'report.topCategory')}: ${review.categoryName}` : t(state.preferences.locale, 'report.noCategory')}</div>
      </div>
      <div className="il-report-emptytrend">{state.preferences.locale === 'ja-JP' ? review.suggestion : 'Use this week’s interruption trend to choose one request rule to try next week.'}</div>
    </div>
  );
}

export function UrgencyBreakdownCard({ urgencyStats, maxUrgencyTime, topUrgency, locale = 'ja-JP' }) {
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.urgencyBreakdown')}</h3>
      <div className="il-urgency-report">
        {urgencyStats.map((item) => (
          <div key={item.key} className="il-urgency-report-row">
            <div className="main">
              <span className={'il-chip sm urg-' + item.key}>{urgencyLabel(locale, item.key)}</span>
              <span className="copy">{t(locale, `report.urgencyCopy.${item.key}`)}</span>
            </div>
            <div className="meter">
              <div style={{ width: `${(item.time / maxUrgencyTime) * 100}%`, background: item.color }} />
            </div>
            <div className="value">
              <span>{tx(locale, 'common.count', item.count)}</span>
              <strong className="il-mono">{fmtDurationShort(item.time, locale)}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="il-report-emptytrend">
        {topUrgency.time > 0
          ? tx(locale, 'report.topUrgencyInsight', {
              label: urgencyLabel(locale, topUrgency.key),
              insight: t(locale, `report.urgencyInsight.${topUrgency.key}`),
            })
          : t(locale, 'report.urgencyInsight.empty')}
      </div>
    </div>
  );
}

export function WeekdayTrendCard({ dayStats, maxDay, locale = 'ja-JP' }) {
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.weekdayTrend')}</h3>
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
  );
}

export function SendersCard({ senders, maxSenderTime, locale = 'ja-JP' }) {
  if (senders.length === 0) return null;

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.senders')}</h3>
      {senders.map((person, index) => (
        <div key={person.who} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="avatar">{person.who[0]}</div>
          <div className="main">
            <div className="title">{person.who}</div>
            <div className="sub">{tx(locale, 'common.count', person.count)}</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(person.time / maxSenderTime) * 100}%` }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(person.time, locale)}</div>
        </div>
      ))}
    </div>
  );
}

export function TaskEngagementCard({ engagement, locale = 'ja-JP' }) {
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const selected = selectedId ? engagement.rows.find((row) => row.id === selectedId) ?? null : null;
  const visibleRows = expanded ? engagement.rows : engagement.rows.slice(0, 5);
  const hiddenRows = Math.max(0, engagement.rows.length - visibleRows.length);
  const sessions = selected?.sessions.slice().reverse() ?? [];
  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 3);
  const hiddenSessions = Math.max(0, sessions.length - visibleSessions.length);
  const maxDaily = Math.max(...(selected?.daily.map((day) => day.durationMs) ?? [1]), 1);

  return (
    <div className="il-card il-task-engagement-card">
      <div className="il-card-intro">
        <h3>{t(locale, 'report.taskEngagement')}</h3>
        <div className="il-card-copy">{t(locale, 'report.taskEngagementCopy')}</div>
      </div>
      {engagement.rows.length === 0 ? (
        <div className="il-report-taskempty">{t(locale, 'report.noTaskEngagement')}</div>
      ) : (
        <>
          <div className="il-task-engagement-list">
            {visibleRows.map((row) => (
              <button
                key={row.id}
                className={'il-task-engagement-row' + (selected?.id === row.id ? ' active' : '')}
                onClick={() => {
                  setSelectedId((current) => current === row.id ? null : row.id);
                  setShowAllSessions(false);
                }}
              >
                <span className="swatch" style={{ background: row.categoryColor }} />
                <span className="main">
                  <span className="name">{row.name}</span>
                  <span className="meta">
                    {fmtDurationShort(row.rangeTime, locale)}
                    {' · '}
                    {tx(locale, 'report.sessionsCount', row.sessionCount)}
                    {' · '}
                    {tx(locale, 'report.workDaysCount', row.workDayCount)}
                  </span>
                </span>
                <span className="state">{row.isCompleted ? t(locale, 'report.completed') : t(locale, 'report.incomplete')}</span>
              </button>
            ))}
            {engagement.rows.length > 5 && (
              <button className="il-task-more" onClick={() => setExpanded((current) => !current)}>
                {expanded ? t(locale, 'report.collapseTasks') : tx(locale, 'report.showAllTasks', hiddenRows)}
              </button>
            )}
          </div>

          {selected && (
            <div className="il-task-engagement-detail">
              <div className="il-report-taskstats">
                <TaskStat label={t(locale, 'report.periodWork')} value={fmtDurationShort(selected.rangeTime, locale)} accent />
                <TaskStat label={t(locale, 'report.allWork')} value={fmtDurationShort(selected.allTime, locale)} />
                <TaskStat label={t(locale, 'report.sessions')} value={selected.sessionCount} />
                <TaskStat label={t(locale, 'report.workDays')} value={selected.workDayCount} />
              </div>
              {selected.plannedMs > 0 && (
                <div className="il-estimate-row">
                  <span>{t(locale, 'report.estimate')}</span>
                  <span className="il-mono">{fmtDurationShort(selected.plannedMs, locale)}</span>
                  <span>{t(locale, 'report.variance')}</span>
                  <span className="il-mono">{formatSignedDuration(selected.estimateDiffMs, locale)}</span>
                </div>
              )}
              <div className="il-task-days">
                <div className="il-report-tasklist-title">
                  <span>{t(locale, 'report.dailyWork')}</span>
                  <span className="count">{selected.daily.length}</span>
                </div>
                {selected.daily.map((day) => (
                  <div key={day.dayStart} className="il-task-day-row">
                    <span>{formatDate(day.dayStart, locale)}</span>
                    <span className="bar"><span style={{ width: `${Math.max(4, day.durationMs / maxDaily * 100)}%` }} /></span>
                    <span className="il-mono">{fmtDurationShort(day.durationMs, locale)}</span>
                  </div>
                ))}
              </div>
              <div className="il-task-sessions">
                <div className="il-report-tasklist-title">
                  <span>{t(locale, 'report.sessionList')}</span>
                  <span className="count">{sessions.length}</span>
                </div>
                {visibleSessions.map((session) => (
                  <div key={session.id} className="il-session-row">
                    <span>{formatSession(session, locale)}</span>
                    <span className="il-mono">{fmtDurationShort(session.durationMs, locale)}</span>
                  </div>
                ))}
                {sessions.length > 3 && (
                  <button className="il-session-more" onClick={() => setShowAllSessions((current) => !current)}>
                    {showAllSessions ? t(locale, 'report.collapseSessions') : tx(locale, 'report.showAllSessions', hiddenSessions)}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function DayActivityCard({ activity, locale = 'ja-JP' }) {
  return (
    <div className="il-card il-day-activity-card">
      <div className="il-card-intro">
        <h3>{t(locale, 'report.dayActivity')}</h3>
        <div className="il-card-copy">{t(locale, 'report.dayActivityCopy')}</div>
      </div>
      <ActivitySection
        title={t(locale, 'report.touchedTasks')}
        empty={t(locale, 'report.noTouchedTasks')}
        items={activity.touchedTasks}
        render={(task) => (
          <div className="il-daily-line">
            <span className="swatch" style={{ background: task.categoryColor }} />
            <span>{task.name}</span>
            <span className="meta">{task.categoryName}</span>
            <span className="il-mono">{fmtDurationShort(task.time, locale)}</span>
          </div>
        )}
      />
      <ActivitySection
        title={t(locale, 'report.interruptions')}
        empty={t(locale, 'report.noInterruptions')}
        items={activity.interruptions}
        render={(event) => (
          <div className="il-daily-line">
            <span>{event.label}</span>
            <span className="meta">{[event.who, event.categoryId].filter(Boolean).join(' · ')}</span>
            <span className="il-mono">{fmtDurationShort(event.durationMs, locale)}</span>
          </div>
        )}
      />
      <ActivitySection
        title={t(locale, 'report.recordedMemos')}
        empty={t(locale, 'report.noRecordedMemos')}
        items={activity.memos}
        render={(memo) => (
          <div className="il-daily-memo">
            <div className="label">{memo.label}</div>
            <div>{memo.memo}</div>
          </div>
        )}
      />
    </div>
  );
}

export function DailyReportPrintTemplate({ report, locale = 'ja-JP' }) {
  const totals = report.totals;
  return (
    <section className="il-daily-print" aria-label={t(locale, 'report.dailyReportPrintTitle')}>
      <header className="il-daily-print-head">
        <div>
          <div className="eyebrow">{t(locale, 'report.dailyReportPrintTitle')}</div>
          <h1>{formatDate(report.date, locale, { weekday: 'short' })}</h1>
        </div>
        <div className="range">{formatTimeRange(report.range, locale)}</div>
      </header>

      <div className="il-daily-print-stats">
        <PrintStat label={t(locale, 'report.recordedTime')} value={fmtDurationShort(totals.recorded, locale)} />
        <PrintStat label={t(locale, 'report.focus')} value={fmtDurationShort(totals.focus, locale)} />
        <PrintStat label={t(locale, 'report.interrupt')} value={fmtDurationShort(totals.interrupt, locale)} />
        <PrintStat label={t(locale, 'report.break')} value={fmtDurationShort(totals.break, locale)} />
      </div>

      <div className="il-daily-print-grid">
        <PrintTaskSection
          title={t(locale, 'report.completedTasks')}
          empty={t(locale, 'report.noCompletedTasks')}
          tasks={report.completedTasks}
          locale={locale}
        />
        <PrintTaskSection
          title={t(locale, 'report.incompleteTasks')}
          empty={t(locale, 'report.noTouchedTasks')}
          tasks={report.incompleteTasks}
          locale={locale}
        />
      </div>

      <PrintSection title={t(locale, 'report.taskWork')} empty={t(locale, 'report.noTaskEngagement')} items={report.taskRows}>
        {(task) => (
          <div className="il-daily-print-row">
            <span>{task.name}</span>
            <span>{task.categoryName}</span>
            <strong>{fmtDurationShort(task.rangeTime, locale)}</strong>
          </div>
        )}
      </PrintSection>

      <PrintSection title={t(locale, 'report.interruptionSummary')} empty={t(locale, 'report.noInterruptions')} items={report.interruptions}>
        {(event) => (
          <div className="il-daily-print-row">
            <span>{event.label}</span>
            <span>{[event.who, event.categoryId].filter(Boolean).join(' · ')}</span>
            <strong>{fmtDurationShort(event.durationMs, locale)}</strong>
          </div>
        )}
      </PrintSection>

      <PrintSection title={t(locale, 'report.recordedMemos')} empty={t(locale, 'report.noRecordedMemos')} items={report.memos}>
        {(memo) => (
          <div className="il-daily-print-memo">
            <strong>{memo.label}</strong>
            <span>{memo.memo}</span>
          </div>
        )}
      </PrintSection>
    </section>
  );
}

export function CategoryTimeCard({ categories, categoryList, totalCategoryTime, locale = 'ja-JP' }) {
  if (categoryList.length === 0) return null;

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.categoryTime')}</h3>
      {categoryList.map((category, index) => {
        const categoryInfo = categories.find((item) => item.id === category.id);
        const percent = Math.round((category.time / totalCategoryTime) * 100);
        return (
          <div key={category.id} className="il-report-categoryrow" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
            <div className="header">
              <span className="name">
                <span className="swatch" style={{ background: categoryInfo?.color }} />
                {categoryInfo ? categoryLabel(locale, categoryInfo) : category.id}
              </span>
              <span className="il-mono value">{fmtDurationShort(category.time, locale)} <span className="muted">· {percent}%</span></span>
            </div>
            <div className="bar">
              <div style={{ width: `${percent}%`, background: categoryInfo?.color, opacity: 0.85 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TaskStatusCard({
  completedInRange,
  completedTasks,
  incompleteTasks,
  taskRate,
  taskReportRows,
  uniqueTaskIds,
  locale = 'ja-JP',
}) {
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.taskStatus')}</h3>
      <div className="il-report-taskstats">
        <TaskStat label={t(locale, 'report.taskCount')} value={uniqueTaskIds.length} />
        <TaskStat label={t(locale, 'report.completed')} value={completedInRange} />
        <TaskStat label={t(locale, 'report.incomplete')} value={uniqueTaskIds.length - completedInRange} />
        <TaskStat label={t(locale, 'report.completionRate')} value={`${taskRate}%`} accent />
      </div>
      {taskReportRows.length > 0 && (
        <div className="il-report-tasklists">
          <TaskReportList title={t(locale, 'report.completedTasks')} empty={t(locale, 'report.noCompletedTasks')} tasks={completedTasks} locale={locale} />
          <TaskReportList title={t(locale, 'report.incompleteTasks')} empty={t(locale, 'report.noIncompleteTasks')} tasks={incompleteTasks} locale={locale} />
        </div>
      )}
    </div>
  );
}

function ActivitySection({ title, empty, items, render }) {
  return (
    <div className="il-daily-section">
      <div className="il-report-tasklist-title">
        <span>{title}</span>
        <span className="count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="il-report-taskempty">{empty}</div>
      ) : (
        <div className="il-daily-list">
          {items.map((item) => <div key={item.id}>{render(item)}</div>)}
        </div>
      )}
    </div>
  );
}

function PrintStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintTaskSection({ title, empty, tasks, locale }) {
  return (
    <PrintSection title={title} empty={empty} items={tasks}>
      {(task) => (
        <div className="il-daily-print-row">
          <span>{task.name}</span>
          <span>{task.categoryName}</span>
          <strong>{fmtDurationShort(task.time, locale)}</strong>
        </div>
      )}
    </PrintSection>
  );
}

function PrintSection({ title, empty, items, children }) {
  return (
    <section className="il-daily-print-section">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="items">
          {items.map((item) => <div key={item.id}>{children(item)}</div>)}
        </div>
      )}
    </section>
  );
}

function TaskReportList({ title, empty, tasks, locale = 'ja-JP' }) {
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
                <span>{fmtDurationShort(task.time, locale)}</span>
                {task.completedInRange && task.completedAt && <span>{tx(locale, 'report.completedAt', formatReportTaskDate(task.completedAt, locale))}</span>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatReportTaskDate(timestamp, locale) {
  return formatDate(timestamp, locale);
}

function formatSignedDuration(value, locale) {
  if (value == null) return '';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${fmtDurationShort(Math.abs(value), locale)}`;
}

function formatSession(session, locale) {
  const start = formatDateTime(session.clippedStart, locale);
  const end = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(session.clippedEnd));
  return `${start} - ${end}`;
}

function formatTimeRange(range, locale) {
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${timeFormatter.format(new Date(range.since))} - ${timeFormatter.format(new Date(range.until))}`;
}
