import { calcStats, getRangeBounds } from './reports';

export function selectActiveTasks(state) {
  return state.tasks
    .filter((task) => !task.isCompleted)
    .sort((a, b) => state.preferences.sortDue
      ? (a.planning?.dueAt ?? Infinity) - (b.planning?.dueAt ?? Infinity)
      : a.order - b.order);
}

export function selectCompletedTasks(state) {
  return state.tasks
    .filter((task) => task.isCompleted)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function partitionCompletedTasks(tasks, now = Date.now()) {
  const dayStart = startOfDay(now);
  const nextDay = dayStart + 86400000;
  const today = [];
  const archived = [];

  for (const task of tasks) {
    if (!task.isCompleted) continue;
    if (task.completedAt != null && task.completedAt >= dayStart && task.completedAt < nextDay) today.push(task);
    else archived.push(task);
  }

  return { today, archived };
}

export function selectTodayStripSummary(state, now = Date.now()) {
  const dayStart = startOfDay(now);
  let task = 0;
  let interrupt = 0;
  let breakMs = 0;
  let unknown = 0;

  for (const event of state.events) {
    const end = event.end ?? now;
    if (end < dayStart) continue;
    const from = Math.max(event.start, dayStart);
    const duration = end - from;
    if (event.type === 'task') task += duration;
    else if (event.type === 'interrupt') interrupt += duration;
    else if (event.type === 'break') breakMs += duration;
    else if (event.type === 'unknown') unknown += duration;
  }

  const total = task + interrupt + breakMs + unknown;
  const percent = (value) => total ? (value / total) * 100 : 0;
  return {
    task,
    interrupt,
    break: breakMs,
    unknown,
    total,
    percentages: {
      task: percent(task),
      interrupt: percent(interrupt),
      break: percent(breakMs),
      unknown: percent(unknown),
    },
  };
}

export function selectRunningTaskMeta(state) {
  const running = state.running;
  if (!running) return null;

  if (running.type === 'task') {
    const task = state.tasks.find((item) => item.id === running.taskId);
    return {
      type: 'task',
      label: task?.name ?? 'タスク',
      subLabel: 'タスク実行中',
      task,
      variant: '',
    };
  }

  if (running.type === 'interrupt') {
    return {
      type: 'interrupt',
      label: running.label || '割り込み',
      subLabel: '割り込み中',
      task: null,
      variant: 'interrupt',
    };
  }

  return {
    type: 'break',
    label: running.label || '休憩',
    subLabel: '休憩中',
    task: null,
    variant: 'break',
  };
}

export function selectTaskPriorSpentMs(state, taskId) {
  return state.events
    .filter((event) => event.type === 'task' && event.taskId === taskId && event.end !== null)
    .reduce((sum, event) => sum + (event.end - event.start), 0);
}

export function selectHistoryDaySummary(items) {
  return {
    count: items.length,
    totalMs: items.reduce((sum, item) => sum + item.clippedDurationMs, 0),
  };
}

export function selectReportInputs(state, range, now = Date.now()) {
  const bounds = getRangeBounds(range, now);
  return {
    bounds,
    currentStats: calcStats(state.events, bounds.since, bounds.until, now),
    previousStats: calcStats(state.events, bounds.prevSince, bounds.prevUntil, now),
    compareLabel: { day: '昨日比', week: '先週比', month: '先月比', year: '前年比' }[range],
  };
}

function startOfDay(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
