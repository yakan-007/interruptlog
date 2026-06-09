import { fmtDurationShort } from '../../helpers';
import { formatHistoryTimeRange, isSameHistoryDay } from '../../history';

const TYPE_LABELS = { task: 'タスク', interrupt: '割り込み', break: '休憩', unknown: '記録' };
const URGENCY_LABELS = { low: '低', med: '中', high: '高' };

export default function HistoryList({ items, state, now, selectedDate, onEdit }) {
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
            last={index === items.length - 1}
            onEdit={() => onEdit(event)}
          />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, state, now, selectedDate, last, onEdit }) {
  const category = findEventCategory(event, state);
  const showRunning = event.running && isSameHistoryDay(selectedDate, now) && !event.endsAfterDay;

  return (
    <button type="button" className={'il-ev t-' + event.type} style={{ borderBottom: last ? 'none' : '0.5px solid var(--hair)' }} onClick={onEdit}>
      <div className="dot" />
      <div className="ev-main">
        <div className="ev-title">{event.label}</div>
        <div className="ev-meta wrap">
          <span className="il-mono">{formatHistoryTimeRange(event)}</span>
          <span>•</span>
          <span className="type">{TYPE_LABELS[event.type]}</span>
          {category && <><span>•</span><span style={{ color: category.color || 'var(--ink-3)' }}>{category.name}</span></>}
          {event.who && <><span>•</span><span>{event.who}</span></>}
          {event.startsBeforeDay && <span className="il-chip sm accent">前日から</span>}
          {event.endsAfterDay && <span className="il-chip sm accent">翌日に続く</span>}
          {event.longEvent && <span className="il-chip sm warn">長時間</span>}
          {event.type === 'interrupt' && event.urgency && (
            <span className={'il-chip sm urg-' + event.urgency}>{URGENCY_LABELS[event.urgency] ?? event.urgency}</span>
          )}
        </div>
        {event.memo && <div className="il-history-memo">{event.memo}</div>}
      </div>
      <div className="ev-dur il-mono">
        {showRunning ? <span className="accent">{fmtDurationShort(event.clippedDurationMs)}●</span> : fmtDurationShort(event.clippedDurationMs)}
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
