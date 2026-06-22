const CLOCK_RE = /^(\d{2}):(\d{2})$/;

function isClockText(value) {
  const match = String(value ?? '').match(CLOCK_RE);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function clockToMinutes(value) {
  if (!isClockText(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isWorkSchedule(value) {
  return Boolean(
    value
    && isClockText(value.start)
    && isClockText(value.end)
    && clockToMinutes(value.start) < clockToMinutes(value.end)
  );
}

export function normalizeWorkSchedule(value) {
  return {
    start: isClockText(value?.start) ? value.start : null,
    end: isClockText(value?.end) ? value.end : null,
  };
}

export function workdayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function timestampAtClock(timestamp, clock) {
  if (!isClockText(clock)) return null;
  const [hour, minute] = clock.split(':').map(Number);
  const date = new Date(timestamp);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export function timestampAtClockForOffset(timestamp, clock, dayOffset = 0) {
  const at = timestampAtClock(timestamp, clock);
  if (at == null) return null;
  const date = new Date(at);
  date.setDate(date.getDate() + dayOffset);
  return date.getTime();
}

export function getFridayAtClock(timestamp, clock) {
  const date = new Date(timestampAtClock(timestamp, clock));
  let offset = (5 - date.getDay() + 7) % 7;
  if (offset === 0 && timestamp >= date.getTime()) offset = 7;
  date.setDate(date.getDate() + offset);
  return date.getTime();
}
