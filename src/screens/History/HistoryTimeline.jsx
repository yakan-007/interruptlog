import { formatHistoryTimeRange, isSameHistoryDay } from '../../history';

const TYPE_LABELS = { task: 'タスク', interrupt: '割り込み', break: '休憩', unknown: '記録' };
const URGENCY_LABELS = { low: '低', med: '中', high: '高' };

export default function HistoryTimeline({ timeline, timelineRef, selectedDate, now, state, onEdit }) {
  const { axis, items, nowY } = timeline;
  const showNowLine = isSameHistoryDay(selectedDate, now);

  return (
    <div className="il-history-timeline" ref={timelineRef}>
      <div className="il-history-timeline-canvas" style={{ height: axis.totalHeight }}>
        {axis.hourMarkers.map((marker) => (
          <div key={marker.hour} className="il-history-hourline" style={{ top: marker.y }}>
            <div className="label il-mono">{marker.hour}:00</div>
          </div>
        ))}

        <div className="il-history-track">
          {showNowLine && nowY != null && nowY >= 0 && nowY <= axis.totalHeight && (
            <div className="il-history-nowline" style={{ top: nowY }}>
              <span />
            </div>
          )}

          {items.map((event) => {
            const category = findEventCategory(event, state);
            return (
              <button
                key={event.id}
                type="button"
                className={'il-history-eventcard t-' + event.type + ' ' + event.variant}
                style={{
                  top: event.topPx,
                  height: event.heightPx,
                  left: `calc(${(event.lane * 100) / event.laneCount}% + 4px)`,
                  width: `calc(${100 / event.laneCount}% - 8px)`,
                  zIndex: 3 + event.lane,
                }}
                onClick={() => onEdit(event)}
              >
                <div className="rail" />
                <div className="headline">
                  <div className="time il-mono">{formatHistoryTimeRange(event)}</div>
                  <div className="title">{event.label}</div>
                </div>
                <div className="meta">
                  <span>{TYPE_LABELS[event.type]}</span>
                  {category && <span>{category.name}</span>}
                </div>
                <div className="chips">
                  {event.startsBeforeDay && <span className="il-chip sm accent">前日から</span>}
                  {event.endsAfterDay && <span className="il-chip sm accent">翌日に続く</span>}
                  {event.longEvent && <span className="il-chip sm warn">長時間</span>}
                  {event.type === 'interrupt' && event.urgency && (
                    <span className={'il-chip sm urg-' + event.urgency}>{URGENCY_LABELS[event.urgency] ?? event.urgency}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function findEventCategory(event, state) {
  if (!event.categoryId) return null;
  return state.categories.find((category) => category.id === event.categoryId)
    || state.interruptCats.find((category) => category.id === event.categoryId)
    || null;
}
