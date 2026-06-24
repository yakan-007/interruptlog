import { cleanText, csvCell } from './utils';
import { calculateRangeStats, createReportSnapshot } from './reportFacts';

export function getRangeBounds(range, now = Date.now()) {
  const today = startOfDay(now);
  if (range === 'day') return { since: today, until: now, prevSince: shiftCalendarDays(today, -1), prevUntil: today };
  if (range === 'week') return calendarRange(now, 7);
  if (range === 'month') return calendarRange(now, 30);
  return calendarRange(now, 365);
}

export function calcStats(events, since, until, now = Date.now()) {
  return calculateRangeStats(createReportSnapshot(events, now), since, until);
}

export function buildReportCsv(state, range, now = Date.now(), snapshot = null) {
  const bounds = getRangeBounds(range, now);
  const stats = calculateRangeStats(snapshot ?? createReportSnapshot(state, now), bounds.since, bounds.until);
  const reportDate = formatDateKey(bounds.since);
  const timezone = getTimezoneName();
  const profile = state.preferences?.reportProfile ?? {};
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const categoryName = (id) =>
    state.categories.find((category) => category.id === id)?.name ?? id ?? '';
  const rows = [
    ['reportDate', 'range', 'timezone', 'affiliation', 'memberName', 'start', 'end', 'type', 'label', 'category', 'categoryId', 'taskId', 'sourceTaskId', 'interruptOriginId', 'who', 'urgency', 'memo', 'durationMinutes'],
    ...stats.events
      .sort((a, b) => a.clippedStart - b.clippedStart)
      .map((event) => {
        const task = event.taskId ? taskById.get(event.taskId) : null;
        return [
          reportDate,
          range,
          timezone,
          cleanText(profile.affiliation),
          cleanText(profile.name),
          new Date(event.clippedStart).toISOString(),
          new Date(event.clippedEnd).toISOString(),
          event.type,
          event.label ?? '',
          categoryName(event.categoryId),
          event.categoryId ?? '',
          event.taskId ?? '',
          event.sourceTaskId ?? task?.sourceTaskId ?? '',
          event.interruptOriginId ?? task?.interruptOriginId ?? '',
          event.who ?? '',
          event.urgency ?? '',
          event.memo ?? task?.memo ?? '',
          (event.durationMs / 60000).toFixed(1),
        ];
      }),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function buildWeeklyReview(state, now = Date.now(), snapshot = null) {
  const { since, until } = getRangeBounds('week', now);
  const stats = calculateRangeStats(snapshot ?? createReportSnapshot(state, now), since, until);
  const hourly = Array(24).fill(0);
  const senders = new Map();
  const categories = new Map();

  for (const event of stats.events) {
    if (event.type !== 'interrupt') continue;
    const hour = new Date(event.clippedStart).getHours();
    hourly[hour] += event.durationMs;
    const who = cleanText(event.who);
    if (who) {
      if (!senders.has(who)) senders.set(who, { label: who, time: 0, count: 0 });
      senders.get(who).time += event.durationMs;
      senders.get(who).count += 1;
    }
    const category = cleanText(event.categoryId || event.category);
    if (category) categories.set(category, (categories.get(category) ?? 0) + event.durationMs);
  }

  const peakHour = hourly.reduce((best, value, index) => value > hourly[best] ? index : best, 0);
  const quietHour = hourly.reduce((best, value, index) => value < hourly[best] ? index : best, 0);
  const topSender = [...senders.values()].sort((a, b) => b.time - a.time || b.count - a.count)[0] ?? null;
  const topCategoryId = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const categoryName = topCategoryId
    ? state.categories.find((category) => category.id === topCategoryId)?.name ?? topCategoryId
    : '';
  const focusRate = stats.focus + stats.interrupt + stats.break > 0
    ? Math.round((stats.focus / (stats.focus + stats.interrupt + stats.break)) * 100)
    : 0;
  const suggestion = stats.interrupt > 0
    ? topSender
      ? `${topSender.label}からの相談をまとめる時間を作る候補です`
      : `${peakHour}時台の割り込み作業をまとめる候補です`
    : '割り込み作業の記録が増えると、来週の改善候補を出せます';

  return {
    since,
    until,
    focus: stats.focus,
    interrupt: stats.interrupt,
    break: stats.break,
    focusRate,
    peakHour,
    quietHour,
    topSender,
    categoryName,
    suggestion,
  };
}

function startOfDay(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function calendarRange(now, days) {
  const since = shiftCalendarDays(now, -days);
  const prevSince = shiftCalendarDays(now, -(days * 2));
  return { since, until: now, prevSince, prevUntil: since };
}

function shiftCalendarDays(timestamp, amount) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + amount);
  return date.getTime();
}

function formatDateKey(ts) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimezoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
}
