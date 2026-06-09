import { selectReportInputs } from '../../state';

export const URGENCY_META = {
  low: { label: '低', color: 'var(--urg-low)', copy: '後回しにできた割り込み' },
  med: { label: '中', color: 'var(--urg-med)', copy: 'その場で扱う相談' },
  high: { label: '高', color: 'var(--urg-high)', copy: '即対応が必要だった割り込み' },
};

export function buildReportMetrics(state, currentStats, bounds, now) {
  const total = currentStats.focus + currentStats.interrupt + currentStats.break || 1;
  const hourly = buildHourlyInterrupts(currentStats.events);
  const maxHourly = Math.max(...hourly, 1);
  const dayStats = buildDayStats(state, now);
  const maxDay = Math.max(...dayStats.map((day) => day.focus + day.interrupt), 1);
  const senders = buildSenders(currentStats.events);
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);
  const urgencyStats = buildUrgencyStats(currentStats.events);
  const maxUrgencyTime = Math.max(...urgencyStats.map((item) => item.time), 1);
  const topUrgency = urgencyStats.reduce((top, item) => item.time > top.time ? item : top, urgencyStats[0]);
  const categoryList = buildCategoryList(currentStats.events);
  const totalCategoryTime = categoryList.reduce((sum, category) => sum + category.time, 0) || 1;
  const taskReport = buildTaskReport(state, currentStats.events, bounds);
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

function buildDayStats(state, now) {
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  return Array(7).fill(null).map((_, index) => {
    const dayStart = now - (6 - index) * 86400000;
    const base = new Date(dayStart);
    base.setHours(0, 0, 0, 0);
    const dayInput = selectReportInputs(state, 'day', base.getTime() + 86399999);
    return {
      day: weekDays[new Date(dayStart).getDay()],
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
        name: task?.name ?? firstEvent?.label ?? 'タスク',
        categoryName: category?.name ?? '',
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
