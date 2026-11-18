import { fmtDurationShort } from '../../lib/formatters';
import { formatHistoryTimeRange, isSameHistoryDay } from '../../lib/history';
import { t } from '../../i18n';
import { eventCategoryText, eventSenderText, findEventCategory } from './eventMeta';

export default function HistoryList({ items, state, now, selectedDate, locale = 'ja-JP', onEdit }) {
  return (
    <div className="il-history-list">
      <div className="il-history-listcard">
        {items.map((event, index) => (
          <EventRow
            key={event.id}
            event={event}
            state={state}
            now={now}
            selectedDate={selectedDate}
            locale={locale}
            last={index === items.length - 1}
            onEdit={() => onEdit(event)}
          />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, state, now, selectedDate, locale, last, onEdit }) {
  const category = findEventCategory(event, state);
  const showRunning = event.running && isSameHistoryDay(selectedDate, now) && !event.endsAfterDay;
  const categoryColor = event.type === 'task' ? category?.color : null;
  const categoryText = eventCategoryText(event, category, locale);
  const sender = eventSenderText(event);

  return (
    <button type="button" className={'il-ev t-' + event.type} style={{ borderBottom: last ? 'none' : '0.5px solid var(--hair)', '--history-category-color': categoryColor ?? undefined }} onClick={onEdit}>
      <div className="dot" />
      <div className="ev-main">
        <div className="ev-title">{event.workDetail || event.label}</div>
        <div className="ev-meta wrap">
          <span className="il-mono">{formatHistoryTimeRange(event)}</span>
          {categoryText && <><span>•</span><span style={{ color: categoryColor || undefined }}>{categoryText}</span></>}
          {sender && <><span>•</span><span>{sender}</span></>}
          {event.startsBeforeDay && <span className="il-chip sm accent">{t(locale, 'history.previousDay')}</span>}
          {event.endsAfterDay && <span className="il-chip sm accent">{t(locale, 'history.nextDay')}</span>}
          {event.longEvent && <span className="il-chip sm warn">{t(locale, 'history.longEvent')}</span>}
        </div>
        {event.memo && <div className="il-history-memo">{event.memo}</div>}
      </div>
      <div className="ev-dur il-mono">
        {showRunning ? <span className="accent">{fmtDurationShort(event.clippedDurationMs, locale)}●</span> : fmtDurationShort(event.clippedDurationMs, locale)}
      </div>
    </button>
  );
}
