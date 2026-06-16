import { useMemo } from 'react';
import { fmtDurationShort } from '../../lib/formatters';
import { buildWeeklyReview } from '../../state';
import { categoryLabel, formatDate, t, tx, urgencyLabel } from '../../i18n';
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
