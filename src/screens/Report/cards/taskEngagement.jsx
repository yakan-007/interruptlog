import { useState } from 'react';
import { fmtDurationShort } from '../../../lib/formatters';
import { formatDate, formatDateTime, t, tx } from '../../../i18n';
import TaskStat from '../TaskStat';

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
                    <span className="il-session-main">
                      <span>{formatSession(session, locale)}</span>
                      {session.workDetail && <small>{session.workDetail}</small>}
                    </span>
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
