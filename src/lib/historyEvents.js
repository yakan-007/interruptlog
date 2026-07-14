import { getHistoryDayBounds } from './historyDate';

const HOUR_MS = 3600000;
const LONG_EVENT_MS = 4 * HOUR_MS;
const SECOND_EVENT_MS = 60000;

export function isSuspiciousHistoryEvent(event, running, now = Date.now()) {
  const end = event.end ?? now;
  if (!Number.isFinite(event.start) || !Number.isFinite(end) || end <= event.start) return true;
  if (event.end !== null) return false;
  return !(
    event.type === 'task'
    && running?.type === 'task'
    && running.taskId === event.taskId
    && running.start === event.start
  );
}

function projectEventIntoHistoryDay(event, selectedDate, now = Date.now()) {
  const { dayStart, dayEnd } = getHistoryDayBounds(selectedDate);
  const actualEnd = event.end ?? now;
  const invalid = !Number.isFinite(event.start) || !Number.isFinite(actualEnd) || actualEnd <= event.start;

  if (invalid) {
    if (!Number.isFinite(event.start) || event.start < dayStart || event.start >= dayEnd) return null;
    const point = Math.min(Math.max(event.start, dayStart), dayEnd - 1);
    return {
      ...event,
      actualEnd,
      clippedStart: point,
      clippedEnd: point,
      clippedDurationMs: 0,
      running: event.end == null,
      startsBeforeDay: false,
      endsAfterDay: false,
      invalid: true,
      longEvent: Number.isFinite(actualEnd - event.start) && (actualEnd - event.start) >= LONG_EVENT_MS,
    };
  }

  if (actualEnd <= dayStart || event.start >= dayEnd) return null;

  const clippedStart = Math.max(event.start, dayStart);
  const clippedEnd = Math.min(actualEnd, dayEnd);
  return {
    ...event,
    actualEnd,
    clippedStart,
    clippedEnd,
    clippedDurationMs: Math.max(0, clippedEnd - clippedStart),
    running: event.end == null,
    startsBeforeDay: event.start < dayStart,
    endsAfterDay: actualEnd > dayEnd,
    invalid: false,
    longEvent: (actualEnd - event.start) >= LONG_EVENT_MS,
  };
}

export function getHistoryDayItems(events, selectedDate, now = Date.now()) {
  return events
    .map((event) => projectEventIntoHistoryDay(event, selectedDate, now))
    .filter(Boolean)
    .sort((left, right) =>
      (right.clippedStart - left.clippedStart)
      || (right.clippedEnd - left.clippedEnd)
      || (right.start - left.start)
    );
}

export function shouldShowHistorySeconds(event) {
  return (event.clippedDurationMs ?? 0) < SECOND_EVENT_MS;
}

export function formatHistoryTimeRange(event, options = {}) {
  const showSeconds = options.showSeconds ?? event.showSeconds ?? shouldShowHistorySeconds(event);
  const startLabel = event.startsBeforeDay ? '00:00' : formatHistoryClock(event.clippedStart, showSeconds);
  const endLabel = event.endsAfterDay ? '24:00' : formatHistoryClock(event.clippedEnd, showSeconds);
  return `${startLabel} – ${endLabel}`;
}

function formatHistoryClock(timestamp, showSeconds) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (!showSeconds) return `${hours}:${minutes}`;
  return `${hours}:${minutes}:${String(date.getSeconds()).padStart(2, '0')}`;
}
