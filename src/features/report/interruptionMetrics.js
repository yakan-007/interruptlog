import { normalizeLocale } from '../../i18n';
import { calculateRangeStats, getWorkdayBounds } from '../../state';
import { isWorkSchedule } from '../../lib/workday';
import { addDays, startOfDay } from '../../lib/day';

// How the period's work sits against the work hours: inside them, overtime
// (before start or after end on a working day) and holiday work (any work on
// a day off). Works for a day, a week or a month, one day at a time.
export function buildWorkdayReport(state, events, bounds, now) {
  if (!isWorkSchedule(state.preferences?.workSchedule)) return null;

  const result = {
    schedule: state.preferences.workSchedule,
    inside: { task: 0, interrupt: 0 },
    overtime: { task: 0, interrupt: 0 },
    holiday: { task: 0, interrupt: 0 },
  };
  const worked = events.filter((event) => event.type === 'task' || event.type === 'interrupt');
  for (let dayStart = startOfDay(bounds.since); dayStart < bounds.until; dayStart = addDays(dayStart, 1)) {
    const dayEnd = Math.min(addDays(dayStart, 1), bounds.until);
    const workday = getWorkdayBounds(state, dayStart);
    for (const event of worked) {
      const start = Math.max(event.clippedStart, dayStart);
      const end = Math.min(event.clippedEnd ?? now, dayEnd);
      if (end <= start) continue;
      if (!workday) {
        result.holiday[event.type] += end - start;
        continue;
      }
      const insideMs = Math.max(0, Math.min(end, workday.end) - Math.max(start, workday.start));
      result.inside[event.type] += insideMs;
      result.overtime[event.type] += end - start - insideMs;
    }
  }
  return result;
}



// How many interruptions started in each hour. The hours shown are the work
// hours (9-18 without a schedule), widened to any hour that had one, so an
// early call or a late chat is never dropped.
export function buildHourlyInterrupts(events, workSchedule = null) {
  const hours = events
    .filter((item) => item.type === 'interrupt')
    .map((event) => new Date(event.clippedStart ?? event.start).getHours());
  const scheduleStart = parseHour(workSchedule?.start);
  const scheduleEnd = parseHour(workSchedule?.end);
  const firstHour = Math.min(scheduleStart ?? 9, ...hours);
  const lastHour = Math.max(scheduleEnd != null ? scheduleEnd - 1 : 17, ...hours);
  const counts = Array(lastHour - firstHour + 1).fill(0);
  for (const hour of hours) counts[hour - firstHour] += 1;
  return { firstHour, counts };
}

function parseHour(clock) {
  if (typeof clock !== 'string') return null;
  const [hours, minutes] = clock.split(':').map(Number);
  if (!Number.isFinite(hours)) return null;
  return minutes > 0 ? hours + 1 : hours;
}

export function buildDayStats(snapshot, now, locale) {
  const weekdayFormatter = new Intl.DateTimeFormat(normalizeLocale(locale), { weekday: 'narrow' });
  return Array(7).fill(null).map((_, index) => {
    const base = new Date(now);
    base.setDate(base.getDate() - (6 - index));
    base.setHours(0, 0, 0, 0);
    const dayStart = base.getTime();
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    const until = Math.min(nextDay.getTime(), now);
    const dayInput = calculateRangeStats(snapshot, dayStart, until);
    return {
      day: weekdayFormatter.format(base),
      focus: dayInput.focus,
      interrupt: dayInput.interrupt,
    };
  });
}

export function buildSenders(events) {
  const senderMap = {};
  for (const event of events.filter((item) => item.type === 'interrupt' && item.who)) {
    if (!senderMap[event.who]) senderMap[event.who] = { who: event.who, count: 0, time: 0 };
    senderMap[event.who].count += 1;
    senderMap[event.who].time += event.durationMs;
  }
  return Object.values(senderMap).sort((left, right) => right.time - left.time).slice(0, 5);
}

export function buildCategoryList(events) {
  const categoryMap = {};
  for (const event of events.filter((item) => item.type === 'task' && item.categoryId)) {
    if (!categoryMap[event.categoryId]) categoryMap[event.categoryId] = { id: event.categoryId, time: 0 };
    categoryMap[event.categoryId].time += event.durationMs;
  }
  return Object.values(categoryMap).sort((left, right) => right.time - left.time);
}
