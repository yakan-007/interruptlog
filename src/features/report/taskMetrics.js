import { categoryLabel, interruptCategoryLabel } from '../../i18n';

export function buildTaskReport(state, groups, bounds) {
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
    .sort((left, right) => {
      if (left.completedInRange !== right.completedInRange) return left.completedInRange ? -1 : 1;
      return right.time - left.time || left.name.localeCompare(right.name, 'ja');
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

export function buildTaskEngagement(state, rangeGroups, allGroups, bounds) {
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
    .sort((left, right) => right.rangeTime - left.rangeTime || left.name.localeCompare(right.name, 'ja'));
  return { rows };
}

export function buildDayActivity(state, events, taskGroups) {
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
        completedAt: task?.completedAt ?? null,
      };
    })
    .sort((left, right) => right.time - left.time || left.name.localeCompare(right.name, 'ja'));
  const interruptions = events
    .filter((event) => event.type === 'interrupt')
    .map((event) => ({
      ...event,
      categoryName: interruptCategoryLabel(state.preferences.locale, state.interruptCats.find((category) => category.id === event.categoryId)),
    }))
    .sort((left, right) => right.durationMs - left.durationMs)
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
    .sort((left, right) => right.time - left.time);
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

export function buildDailyReportData(currentStats, bounds, taskEngagement, dayActivity) {
  // Judge by the completion time, so a past day's report shows that day's state.
  const doneByEnd = (task) => task.isCompleted && (task.completedAt == null || task.completedAt < bounds.until);
  const completedTasks = dayActivity.touchedTasks.filter(doneByEnd);
  const incompleteTasks = dayActivity.touchedTasks.filter((task) => !doneByEnd(task));
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

export function groupTaskEvents(events) {
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
