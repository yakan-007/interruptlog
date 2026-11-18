import { fmtDurationShort } from '../../../lib/formatters';
import { t } from '../../../i18n';

export function DayActivityCard({ activity, locale = 'ja-JP' }) {
  return (
    <div className="il-card il-day-activity-card">
      <div className="il-card-intro">
        <h3>{t(locale, 'report.dayActivity')}</h3>
      </div>
      {/* Tasks are listed in the card above; this card is what happened
          around them: interruptions, work outside tasks, and notes. */}
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
      {activity.memos.length > 0 && (
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
      )}
    </div>
  );
}

function formatInterruptMeta(event) {
  const label = event.label ?? '';
  return [event.who, event.categoryName]
    .filter((item) => item && !label.includes(item))
    .join(' · ');
}

function ActivitySection({ title, empty, items, render }) {
  return (
    <div className="il-daily-section">
      <div className="il-report-tasklist-title">
        <span>{title}</span>
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
