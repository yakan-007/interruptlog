import { fmtDurationShort } from '../../../lib/formatters';
import { t } from '../../../i18n';

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
            <span className="meta">{formatInterruptMeta(event)}</span>
            <span className="il-mono">{fmtDurationShort(event.durationMs, locale)}</span>
          </div>
        )}
      />
      {activity.recordOnlyWork.length > 0 && (
        <ActivitySection
          title={t(locale, 'report.recordOnlyWork')}
          empty={t(locale, 'report.noRecordOnlyWork')}
          items={activity.recordOnlyWork}
          render={(work) => (
            <div className="il-daily-line">
              <span className="swatch" style={{ background: work.categoryColor }} />
              <span>{work.name}</span>
              <span className="meta">{work.categoryName}</span>
              <span className="il-mono">{fmtDurationShort(work.time, locale)}</span>
            </div>
          )}
        />
      )}
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

function formatInterruptMeta(event) {
  return [event.who, event.categoryName]
    .filter((item) => item && item !== event.label)
    .join(' · ');
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
