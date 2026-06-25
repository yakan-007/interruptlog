import { categoryLabel, interruptCategoryLabel, normalizeLocale } from '../../i18n';
import {
  buildMicroInterruptionStats,
  calculateRangeStats,
  createReportSnapshot,
  getWorkdayBounds,
  selectRangeEvents,
} from '../../state';

const URGENCY_META = {
  low: { color: 'var(--urg-low)' },
  med: { color: 'var(--urg-med)' },
  high: { color: 'var(--urg-high)' },
};

export function buildReportMetrics(state, currentStats, bounds, now, snapshot = null) {
  const facts = snapshot ?? createReportSnapshot(state, now);
  const total = currentStats.focus + currentStats.interrupt + currentStats.break || 1;
  const hourly = buildHourlyInterrupts(currentStats.events);
  const maxHourly = Math.max(...hourly, 1);
  const locale = state.preferences.locale;
  const dayStats = buildDayStats(facts, now, locale);
  const maxDay = Math.max(...dayStats.map((day) => day.focus + day.interrupt), 1);
  const senders = buildSenders(currentStats.events);
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);
  const urgencyStats = buildUrgencyStats(currentStats.events);
  const maxUrgencyTime = Math.max(...urgencyStats.map((item) => item.time), 1);
  const topUrgency = urgencyStats.reduce((top, item) => item.time > top.time ? item : top, urgencyStats[0]);
  const categoryList = buildCategoryList(currentStats.events);
  const totalCategoryTime = categoryList.reduce((sum, category) => sum + category.time, 0) || 1;
  const taskGroups = groupTaskEvents(currentStats.events);
  const allTaskGroups = groupTaskEvents(selectRangeEvents(facts, Number.NEGATIVE_INFINITY, now));
  const taskReport = buildTaskReport(state, taskGroups, bounds);
  const taskEngagement = buildTaskEngagement(state, taskGroups, allTaskGroups, bounds);
  const dayActivity = buildDayActivity(state, currentStats.events, taskGroups);
  const dailyReport = buildDailyReportData(currentStats, bounds, taskEngagement, dayActivity);
  const workday = buildWorkdayReport(state, currentStats.events, bounds, now);
  const microInterruptions = buildMicroInterruptionStats(currentStats.events);
  const peakHour = hourly.indexOf(Math.max(...hourly));
  const quietHour = hourly.indexOf(Math.min(...hourly));
  const hasInterruptTrend = hourly.some((value) => value >= 60000);

  return {
    total,
    hourly,
    maxHourly,
    dayStats,
    maxDay,
    senders,
    maxSenderTime,
    urgencyStats,
    maxUrgencyTime,
    topUrgency,
    categoryList,
    totalCategoryTime,
    peakHour,
    quietHour,
    hasInterruptTrend,
    taskEngagement,
    dayActivity,
    dailyReport,
    workday,
    microInterruptions,
    ...taskReport,
  };
}

function buildWorkdayReport(state, events, bounds, now) {
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

function buildHourlyInterrupts(events) {
  const hourly = Array(12).fill(0);
  for (const event of events.filter((item) => item.type === 'interrupt')) {
    const hour = new Date(event.clippedStart).getHours();
    if (hour >= 9 && hour <= 20) hourly[hour - 9] += event.durationMs;
  }
  return hourly;
}

function buildDayStats(snapshot, now, locale) {
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

function buildSenders(events) {
  const senderMap = {};
  for (const event of events.filter((item) => item.type === 'interrupt' && item.who)) {
    if (!senderMap[event.who]) senderMap[event.who] = { who: event.who, count: 0, time: 0 };
    senderMap[event.who].count += 1;
    senderMap[event.who].time += event.durationMs;
  }
  return Object.values(senderMap).sort((a, b) => b.time - a.time).slice(0, 5);
}

function buildUrgencyStats(events) {
  return ['low', 'med', 'high'].map((key) => {
    const urgencyEvents = events.filter((item) => item.type === 'interrupt' && (item.urgency || 'med') === key);
    return {
      key,
      ...URGENCY_META[key],
      count: urgencyEvents.length,
      time: urgencyEvents.reduce((sum, event) => sum + event.durationMs, 0),
    };
  });
}

function buildCategoryList(events) {
  const categoryMap = {};
  for (const event of events.filter((item) => item.type === 'task' && item.categoryId)) {
    if (!categoryMap[event.categoryId]) categoryMap[event.categoryId] = { id: event.categoryId, time: 0 };
    categoryMap[event.categoryId].time += event.durationMs;
  }
  return Object.values(categoryMap).sort((a, b) => b.time - a.time);
}

function buildTaskReport(state, groups, bounds) {
  const uniqueTaskIds = [...groups.keys()];
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const categoryById = new Map(state.categories.map((category) => [category.id, category]));
  const taskReportRows = [...groups.values()]
    .map((group) => {
      const task = taskById.get(group.id);
      const firstEvent = group.events[0];
      const category = categoryById.get(firstEvent?.categoryId ?? task?.categoryId);
      const completedInRange = Boolean(task?.isCompleted && task.completedAt >= bounds.since && task.completedAt < bounds.until);
      return {
        id: group.id,
        name: task?.name ?? firstEvent?.label ?? 'Task',
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        time: group.time,
        completedAt: task?.completedAt ?? null,
        completedInRange,
      };
    })
    .sort((a, b) => {
      if (a.completedInRange !== b.completedInRange) return a.completedInRange ? -1 : 1;
      return b.time - a.time || a.name.localeCompare(b.name, 'ja');
    });
  const completedTasks = taskReportRows.filter((task) => task.completedInRange);
  const incompleteTasks = taskReportRows.filter((task) => !task.completedInRange);
  const completedInRange = completedTasks.length;
  const taskRate = uniqueTaskIds.length > 0 ? Math.round((completedInRange / uniqueTaskIds.length) * 100) : 0;

  return {
    uniqueTaskIds,
    taskReportRows,
    completedTasks,
    incompleteTasks,
    completedInRange,
    taskRate,
  };
}

function buildTaskEngagement(state, rangeGroups, allGroups, bounds) {
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const categoryById = new Map(state.categories.map((category) => [category.id, category]));
  const rows = [...rangeGroups.values()]
    .map((group) => {
      const task = taskById.get(group.id);
      const sessions = group.events;
      const firstEvent = sessions[0];
      const category = categoryById.get(firstEvent?.categoryId ?? task?.categoryId);
      const daily = buildTaskDailyWork(sessions, bounds);
      const plannedMs = (task?.planning?.plannedDurationMinutes ?? 0) * 60000;
      const allTime = allGroups.get(group.id)?.time ?? group.time;
      return {
        id: group.id,
        name: task?.name ?? firstEvent?.label ?? 'Task',
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        rangeTime: group.time,
        allTime,
        sessionCount: sessions.length,
        workDayCount: daily.length,
        isCompleted: Boolean(task?.isCompleted),
        plannedMs,
        estimateDiffMs: plannedMs > 0 ? allTime - plannedMs : null,
        daily,
        sessions,
      };
    })
    .sort((a, b) => b.rangeTime - a.rangeTime || a.name.localeCompare(b.name, 'ja'));
  return { rows };
}

function buildDayActivity(state, events, taskGroups) {
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const categoryById = new Map(state.categories.map((category) => [category.id, category]));
  const touchedTasks = [...taskGroups.values()]
    .map((group) => {
      const task = taskById.get(group.id);
      const firstEvent = group.events[0];
      const category = categoryById.get(firstEvent?.categoryId ?? task?.categoryId);
      return {
        id: group.id,
        name: task?.name ?? firstEvent?.label ?? 'Task',
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        time: group.time,
        isCompleted: Boolean(task?.isCompleted),
      };
    })
    .sort((a, b) => b.time - a.time || a.name.localeCompare(b.name, 'ja'));
  const interruptions = events
    .filter((event) => event.type === 'interrupt')
    .map((event) => ({
      ...event,
      categoryName: interruptCategoryLabel(state.preferences.locale, state.interruptCats.find((category) => category.id === event.categoryId)),
    }))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5);
  const recordOnlyWork = events
    .filter((event) => event.type === 'task' && !event.taskId)
    .map((event) => {
      const category = state.categories.find((item) => item.id === event.categoryId);
      return {
        id: event.id,
        name: event.workDetail || event.label,
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        time: event.durationMs,
      };
    })
    .sort((a, b) => b.time - a.time);
  const memos = events
    .filter((event) => event.memo)
    .map((event) => ({
      id: event.id,
      label: event.workDetail || event.label || event.type,
      memo: event.memo,
      time: event.clippedStart,
    }))
    .slice(0, 6);
  return { touchedTasks, interruptions, recordOnlyWork, memos };
}

function buildDailyReportData(currentStats, bounds, taskEngagement, dayActivity) {
  const completedTasks = dayActivity.touchedTasks.filter((task) => task.isCompleted);
  const incompleteTasks = dayActivity.touchedTasks.filter((task) => !task.isCompleted);
  return {
    date: bounds.since,
    range: bounds,
    totals: {
      recorded: currentStats.focus + currentStats.interrupt + currentStats.break + currentStats.unknown,
      focus: currentStats.focus,
      interrupt: currentStats.interrupt,
      break: currentStats.break,
    },
    completedTasks,
    incompleteTasks,
    recordOnlyWork: dayActivity.recordOnlyWork,
    taskRows: taskEngagement.rows.slice(0, 8),
    interruptions: dayActivity.interruptions,
    memos: dayActivity.memos,
  };
}

function groupTaskEvents(events) {
  const groups = new Map();
  for (const event of events) {
    if (event.type !== 'task' || !event.taskId) continue;
    if (!groups.has(event.taskId)) groups.set(event.taskId, { id: event.taskId, events: [], time: 0 });
    const group = groups.get(event.taskId);
    group.events.push(event);
    group.time += event.durationMs;
  }
  return groups;
}

function buildTaskDailyWork(events, bounds) {
  const daily = new Map();
  for (const event of events) {
    let cursor = startOfDay(event.clippedStart);
    while (cursor < event.clippedEnd) {
      const nextDay = cursor + 86400000;
      const start = Math.max(event.clippedStart, cursor, bounds.since);
      const end = Math.min(event.clippedEnd, nextDay, bounds.until);
      const durationMs = Math.max(0, end - start);
      if (durationMs > 0) daily.set(cursor, (daily.get(cursor) ?? 0) + durationMs);
      cursor = nextDay;
    }
  }
  return [...daily.entries()].map(([dayStart, durationMs]) => ({ dayStart, durationMs }));
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
