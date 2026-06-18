import { selectReportInputs } from '../../state';
import { categoryLabel, normalizeLocale } from '../../i18n';

const URGENCY_META = {
  low: { color: 'var(--urg-low)' },
  med: { color: 'var(--urg-med)' },
  high: { color: 'var(--urg-high)' },
};

export function buildReportMetrics(state, currentStats, bounds, now) {
  const total = currentStats.focus + currentStats.interrupt + currentStats.break || 1;
  const hourly = buildHourlyInterrupts(currentStats.events);
  const maxHourly = Math.max(...hourly, 1);
  const locale = state.preferences.locale;
  const dayStats = buildDayStats(state, now, locale);
  const maxDay = Math.max(...dayStats.map((day) => day.focus + day.interrupt), 1);
  const senders = buildSenders(currentStats.events);
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);
  const urgencyStats = buildUrgencyStats(currentStats.events);
  const maxUrgencyTime = Math.max(...urgencyStats.map((item) => item.time), 1);
  const topUrgency = urgencyStats.reduce((top, item) => item.time > top.time ? item : top, urgencyStats[0]);
  const categoryList = buildCategoryList(currentStats.events);
  const totalCategoryTime = categoryList.reduce((sum, category) => sum + category.time, 0) || 1;
  const taskReport = buildTaskReport(state, currentStats.events, bounds);
  const taskEngagement = buildTaskEngagement(state, currentStats.events, bounds, now);
  const dayActivity = buildDayActivity(state, currentStats.events);
  const dailyReport = buildDailyReportData(currentStats, bounds, taskEngagement, dayActivity);
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
    ...taskReport,
  };
}

function buildHourlyInterrupts(events) {
  const hourly = Array(12).fill(0);
  for (const event of events.filter((item) => item.type === 'interrupt')) {
    const hour = new Date(event.clippedStart).getHours();
    if (hour >= 9 && hour <= 20) hourly[hour - 9] += event.durationMs;
  }
  return hourly;
}

function buildDayStats(state, now, locale) {
  const weekdayFormatter = new Intl.DateTimeFormat(normalizeLocale(locale), { weekday: 'narrow' });
  return Array(7).fill(null).map((_, index) => {
    const dayStart = now - (6 - index) * 86400000;
    const base = new Date(dayStart);
    base.setHours(0, 0, 0, 0);
    const dayInput = selectReportInputs(state, 'day', base.getTime() + 86399999);
    return {
      day: weekdayFormatter.format(new Date(dayStart)),
      focus: dayInput.currentStats.focus,
      interrupt: dayInput.currentStats.interrupt,
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

function buildTaskReport(state, events, bounds) {
  const taskEvents = events.filter((event) => event.type === 'task' && event.taskId);
  const uniqueTaskIds = [...new Set(taskEvents.map((event) => event.taskId))];
  const taskTimeById = taskEvents.reduce((map, event) => {
    map.set(event.taskId, (map.get(event.taskId) ?? 0) + event.durationMs);
    return map;
  }, new Map());
  const taskReportRows = uniqueTaskIds
    .map((id) => {
      const task = state.tasks.find((item) => item.id === id);
      const firstEvent = taskEvents.find((event) => event.taskId === id);
      const category = state.categories.find((item) => item.id === (task?.categoryId ?? firstEvent?.categoryId));
      const completedInRange = Boolean(task?.isCompleted && task.completedAt >= bounds.since && task.completedAt < bounds.until);
      return {
        id,
        name: task?.name ?? firstEvent?.label ?? 'Task',
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        time: taskTimeById.get(id) ?? 0,
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

function buildTaskEngagement(state, events, bounds, now) {
  const taskEvents = events.filter((event) => event.type === 'task' && event.taskId);
  const allTaskEvents = state.events
    .filter((event) => event.type === 'task' && event.taskId)
    .map((event) => clipEvent(event, 0, now, now))
    .filter(Boolean);
  const allTimeById = sumEventsByTask(allTaskEvents);
  const rangeTimeById = sumEventsByTask(taskEvents);
  const rows = [...rangeTimeById.entries()]
    .map(([id, rangeTime]) => {
      const task = state.tasks.find((item) => item.id === id);
      const sessions = taskEvents
        .filter((event) => event.taskId === id)
        .sort((a, b) => a.clippedStart - b.clippedStart);
      const firstEvent = sessions[0];
      const category = state.categories.find((item) => item.id === (task?.categoryId ?? firstEvent?.categoryId));
      const daily = buildTaskDailyWork(sessions, bounds);
      const plannedMs = (task?.planning?.plannedDurationMinutes ?? 0) * 60000;
      return {
        id,
        name: task?.name ?? firstEvent?.label ?? 'Task',
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        rangeTime,
        allTime: allTimeById.get(id) ?? rangeTime,
        sessionCount: sessions.length,
        workDayCount: daily.length,
        isCompleted: Boolean(task?.isCompleted),
        plannedMs,
        estimateDiffMs: plannedMs > 0 ? (allTimeById.get(id) ?? rangeTime) - plannedMs : null,
        daily,
        sessions,
      };
    })
    .sort((a, b) => b.rangeTime - a.rangeTime || a.name.localeCompare(b.name, 'ja'));
  return { rows };
}

function buildDayActivity(state, events) {
  const taskIds = new Set(events.filter((event) => event.type === 'task' && event.taskId).map((event) => event.taskId));
  const touchedTasks = [...taskIds]
    .map((id) => {
      const task = state.tasks.find((item) => item.id === id);
      const taskEvents = events.filter((event) => event.taskId === id);
      const firstEvent = taskEvents[0];
      const category = state.categories.find((item) => item.id === (task?.categoryId ?? firstEvent?.categoryId));
      return {
        id,
        name: task?.name ?? firstEvent?.label ?? 'Task',
        categoryName: categoryLabel(state.preferences.locale, category),
        categoryColor: category?.color ?? 'var(--task)',
        time: taskEvents.reduce((sum, event) => sum + event.durationMs, 0),
        isCompleted: Boolean(task?.isCompleted),
      };
    })
    .sort((a, b) => b.time - a.time || a.name.localeCompare(b.name, 'ja'));
  const interruptions = events
    .filter((event) => event.type === 'interrupt')
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5);
  const memos = events
    .filter((event) => event.memo)
    .map((event) => ({
      id: event.id,
      label: event.label || event.type,
      memo: event.memo,
      time: event.clippedStart,
    }))
    .slice(0, 6);
  return { touchedTasks, interruptions, memos };
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
    taskRows: taskEngagement.rows.slice(0, 8),
    interruptions: dayActivity.interruptions,
    memos: dayActivity.memos,
  };
}

function sumEventsByTask(events) {
  return events.reduce((map, event) => {
    map.set(event.taskId, (map.get(event.taskId) ?? 0) + event.durationMs);
    return map;
  }, new Map());
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

function clipEvent(event, since, until, now) {
  const end = event.end ?? now;
  const clippedStart = Math.max(event.start, since);
  const clippedEnd = Math.min(end, until);
  const durationMs = Math.max(0, clippedEnd - clippedStart);
  return durationMs > 0 ? { ...event, clippedStart, clippedEnd, durationMs } : null;
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
