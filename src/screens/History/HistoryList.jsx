import { fmtDurationShort } from '../../lib/formatters';
import { formatHistoryTimeRange, isSameHistoryDay } from '../../lib/history';
import { categoryLabel, interruptCategoryLabel, t, typeLabel, urgencyLabel } from '../../i18n';

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

  return (
    <button type="button" className={'il-ev t-' + event.type} style={{ borderBottom: last ? 'none' : '0.5px solid var(--hair)' }} onClick={onEdit}>
      <div className="dot" />
      <div className="ev-main">
        <div className="ev-title">{event.workDetail || event.label}</div>
        <div className="ev-meta wrap">
          <span className="il-mono">{formatHistoryTimeRange(event)}</span>
          <span>•</span>
          <span className="type">{typeLabel(locale, event.type)}</span>
          {category && <><span>•</span><span style={{ color: category.color || 'var(--ink-3)' }}>{event.type === 'interrupt' ? interruptCategoryLabel(locale, category) : categoryLabel(locale, category)}</span></>}
          {event.who && <><span>•</span><span>{event.who}</span></>}
          {event.startsBeforeDay && <span className="il-chip sm accent">{t(locale, 'history.previousDay')}</span>}
          {event.endsAfterDay && <span className="il-chip sm accent">{t(locale, 'history.nextDay')}</span>}
          {event.longEvent && <span className="il-chip sm warn">{t(locale, 'history.longEvent')}</span>}
          {event.type === 'interrupt' && event.urgency && (
            <span className={'il-chip sm urg-' + event.urgency}>{urgencyLabel(locale, event.urgency)}</span>
          )}
        </div>
        {event.memo && <div className="il-history-memo">{event.memo}</div>}
      </div>
      <div className="ev-dur il-mono">
        {showRunning ? <span className="accent">{fmtDurationShort(event.clippedDurationMs, locale)}●</span> : fmtDurationShort(event.clippedDurationMs, locale)}
      </div>
    </button>
  );
}

function findEventCategory(event, state) {
  if (!event.categoryId) return null;
  return state.categories.find((category) => category.id === event.categoryId)
    || state.interruptCats.find((category) => category.id === event.categoryId)
    || null;
}
