import { normalizeLocale } from '../../i18n';
import { calculateRangeStats, getWorkdayBounds } from '../../state';

export function buildWorkdayReport(state, events, bounds, now) {
  if (bounds.until - bounds.since > 86400000) return null;
  const workday = getWorkdayBounds(state, bounds.since);
  if (!workday) return null;

  const result = {
    schedule: workday.schedule,
    inside: { task: 0, interrupt: 0 },
    beforeStart: { task: 0, interrupt: 0 },
    afterEnd: { task: 0, interrupt: 0 },
    reactive: { direct: 0, followup: 0 },
  };
  for (const event of events) {
    if (event.type !== 'task' && event.type !== 'interrupt') continue;
    const eventStart = event.clippedStart;
    const eventEnd = event.clippedEnd ?? now;
    const insideStart = Math.max(eventStart, workday.start);
    const insideEnd = Math.min(eventEnd, workday.end);
    const insideMs = Math.max(0, insideEnd - insideStart);
    const beforeStartMs = Math.max(0, Math.min(eventEnd, workday.start) - eventStart);
    const afterEndMs = Math.max(0, eventEnd - Math.max(eventStart, workday.end));
    result.inside[event.type] += insideMs;
    result.beforeStart[event.type] += beforeStartMs;
    result.afterEnd[event.type] += afterEndMs;
    if (event.type === 'interrupt') result.reactive.direct += event.durationMs;
    if (event.type === 'task' && event.interruptOriginId) result.reactive.followup += event.durationMs;
  }
  result.reactive.total = result.reactive.direct + result.reactive.followup;
  return result;
}

export function buildHourlyInterrupts(events) {
  const hourly = Array(12).fill(0);
  for (const event of events.filter((item) => item.type === 'interrupt')) {
    const hour = new Date(event.clippedStart).getHours();
    if (hour >= 9 && hour <= 20) hourly[hour - 9] += event.durationMs;
  }
  return hourly;
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
