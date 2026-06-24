import { fmtDurationShort } from '../../../lib/formatters';
import { formatDate, t } from '../../../i18n';

export function DailyReportPrintTemplate({ report, profile = {}, locale = 'ja-JP' }) {
  const totals = report.totals;
  const identity = [profile.affiliation, profile.name].filter(Boolean).join(' · ');
  return (
    <section className="il-daily-print" aria-label={t(locale, 'report.dailyReportPrintTitle')}>
      <header className="il-daily-print-head">
        <div>
          <div className="eyebrow">{t(locale, 'report.dailyReportPrintTitle')}</div>
          <h1>{formatDate(report.date, locale, { weekday: 'short' })}</h1>
          {identity && <div className="identity">{identity}</div>}
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

      <PrintSection title={t(locale, 'report.recordOnlyWork')} empty={t(locale, 'report.noRecordOnlyWork')} items={report.recordOnlyWork}>
        {(work) => (
          <div className="il-daily-print-row">
            <span>{work.name}</span>
            <span>{work.categoryName}</span>
            <strong>{fmtDurationShort(work.time, locale)}</strong>
          </div>
        )}
      </PrintSection>

      <PrintSection title={t(locale, 'report.interruptionSummary')} empty={t(locale, 'report.noInterruptions')} items={report.interruptions}>
        {(event) => (
          <div className="il-daily-print-row">
            <span>{event.label}</span>
            <span>{[event.who, event.categoryName].filter(Boolean).join(' · ')}</span>
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

function formatTimeRange(range, locale) {
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${timeFormatter.format(new Date(range.since))} - ${timeFormatter.format(new Date(range.until))}`;
}
