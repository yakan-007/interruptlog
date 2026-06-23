import { getRangeBounds } from './reports';
import { calculateRangeStats, createReportSnapshot, selectRangeEvents } from './reportFacts';
import { getWorkdayBounds } from './workday';

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
      label: running.label || '割り込み作業',
      subLabel: '割り込み作業中',
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

export function selectWorkdayStatus(state, now = Date.now()) {
  const bounds = getWorkdayBounds(state, now);
  if (!bounds) return null;

  const spentByTask = new Map();
  for (const event of selectRangeEvents(createReportSnapshot(state, now), Number.NEGATIVE_INFINITY, now)) {
    if (event.type !== 'task' || !event.taskId) continue;
    spentByTask.set(event.taskId, (spentByTask.get(event.taskId) ?? 0) + event.durationMs);
  }

  const commitments = state.tasks
    .filter((task) => !task.isCompleted)
    .filter((task) => (task.planning?.plannedDurationMinutes ?? 0) > 0)
    .filter((task) => task.planning?.dueAt != null && task.planning.dueAt <= bounds.end)
    .map((task) => {
      const spentMs = spentByTask.get(task.id) ?? 0;
      const estimatedMs = task.planning.plannedDurationMinutes * 60000;
      return { taskId: task.id, remainingMs: Math.max(0, estimatedMs - spentMs) };
    });
  const estimateRemainingMs = commitments.reduce((sum, item) => sum + item.remainingMs, 0);
  const remainingMs = Math.max(0, bounds.end - Math.max(now, bounds.start));

  return {
    ...bounds,
    commitmentCount: commitments.length,
    estimateRemainingMs,
    remainingMs,
    overflowMs: Math.max(0, estimateRemainingMs - remainingMs),
    afterEnd: now >= bounds.end,
  };
}

export function selectHistoryDaySummary(items) {
  return {
    count: items.length,
    totalMs: items.reduce((sum, item) => sum + item.clippedDurationMs, 0),
  };
}

export function selectReportInputs(state, range, now = Date.now(), snapshot = null) {
  const bounds = getRangeBounds(range, now);
  const facts = snapshot ?? createReportSnapshot(state, now);
  return {
    bounds,
    snapshot: facts,
    currentStats: calculateRangeStats(facts, bounds.since, bounds.until),
    previousStats: calculateRangeStats(facts, bounds.prevSince, bounds.prevUntil),
    compareLabel: { day: '昨日比', week: '先週比', month: '先月比', year: '前年比' }[range],
  };
}

function startOfDay(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
