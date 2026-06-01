import { newId } from './ids';
import { asNumber, cleanText } from './utils';

function validateTaskInput(data) {
  if (!cleanText(data.name)) return 'タスク名を入力してください';
  return null;
}

function buildTask(state, data, taskId, now) {
  return {
    id: taskId,
    name: cleanText(data.name) || '無題のタスク',
    isCompleted: false,
    order: getNextTaskOrder(state),
    categoryId: data.categoryId ?? state.categories[0]?.id ?? null,
    sourceTaskId: cleanText(data.sourceTaskId) || null,
    taskTemplateId: cleanText(data.taskTemplateId) || null,
    packVersion: cleanText(data.packVersion) || null,
    planning: {
      plannedDurationMinutes: Math.max(0, asNumber(data.plannedDurationMinutes, 0) ?? 0),
      dueAt: asNumber(data.dueAt, null),
    },
    createdAt: now,
    completedAt: null,
  };
}

function getManualActiveOrder(state) {
  return state.tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !task.isCompleted)
    .sort((a, b) => a.task.order - b.task.order || a.index - b.index)
    .map(({ task }) => task.id);
}

function getNextTaskOrder(state) {
  const activeTasks = state.tasks.filter((task) => !task.isCompleted);
  if (activeTasks.length === 0) return 0;
  const orders = activeTasks.map((task) => task.order);
  return state.preferences.topAdd
    ? Math.min(...orders) - 1
    : Math.max(...orders) + 1;
}

export function createTaskInState(state, data, now = Date.now()) {
  const error = validateTaskInput(data);
  if (error) return { state, taskId: null, error };

  const taskId = newId('tn', now);
  const task = buildTask(state, data, taskId, now);
  const tasks = state.preferences.topAdd ? [task, ...state.tasks] : [...state.tasks, task];
  return {
    state: { ...state, tasks },
    taskId,
    error: null,
  };
}

export function createTaskAndStartInState(state, data, now = Date.now()) {
  if (state.running?.type === 'interrupt' || state.running?.type === 'break') {
    return { state, taskId: null, error: '先に現在の割り込みや休憩を処理してください' };
  }
  const created = createTaskInState(state, data, now);
  if (created.error || !created.taskId) return created;
  return {
    state: startTaskInState(created.state, created.taskId, now),
    taskId: created.taskId,
    error: null,
  };
}

export function saveTaskInState(state, data, now = Date.now()) {
  const error = validateTaskInput(data);
  if (error) return { state, taskId: data.id ?? null, error };
  if (!data.id) return createTaskInState(state, data, now);

  return {
    state: {
      ...state,
      tasks: state.tasks.map((task) => task.id === data.id ? {
        ...task,
        name: cleanText(data.name) || task.name,
        categoryId: data.categoryId ?? null,
        planning: {
          ...task.planning,
          plannedDurationMinutes: Math.max(0, asNumber(data.plannedDurationMinutes, 0) ?? 0),
          dueAt: asNumber(data.dueAt, null),
        },
      } : task),
    },
    taskId: data.id,
    error: null,
  };
}

export function startTaskInState(state, taskId, now = Date.now()) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return state;
  const closed = closeTaskSessionInState(state, now);
  const event = {
    id: newId('ev', now),
    type: 'task',
    taskId,
    label: task.name,
    categoryId: task.categoryId,
    sourceTaskId: task.sourceTaskId ?? null,
    taskTemplateId: task.taskTemplateId ?? null,
    packVersion: task.packVersion ?? null,
    start: now,
    end: null,
  };
  return {
    ...closed,
    events: [...closed.events, event],
    running: { type: 'task', taskId, start: now, label: null, preTaskId: null },
  };
}

export function closeTaskSessionInState(state, now = Date.now()) {
  const running = state.running;
  if (running?.type !== 'task' || !running.taskId || running.start == null) return state;
  const task = state.tasks.find((item) => item.id === running.taskId);
  const openIndex = state.events.findIndex((event) =>
    event.type === 'task' &&
    event.taskId === running.taskId &&
    event.end === null &&
    event.start === running.start
  );

  if (openIndex >= 0) {
    const events = [...state.events];
    events[openIndex] = { ...events[openIndex], end: now };
    return { ...state, events };
  }

  return {
    ...state,
    events: [...state.events, {
      id: newId('ev', now),
      type: 'task',
      taskId: running.taskId,
      label: task?.name ?? 'タスク',
      categoryId: task?.categoryId ?? null,
      sourceTaskId: task?.sourceTaskId ?? null,
      taskTemplateId: task?.taskTemplateId ?? null,
      packVersion: task?.packVersion ?? null,
      start: running.start,
      end: now,
    }],
  };
}

export function stopTaskInState(state, complete, now = Date.now()) {
  const runningTaskId = state.running?.taskId;
  const closed = closeTaskSessionInState(state, now);
  return {
    ...closed,
    tasks: complete && runningTaskId
      ? closed.tasks.map((task) => task.id === runningTaskId ? { ...task, isCompleted: true, completedAt: now } : task)
      : closed.tasks,
    running: null,
  };
}

export function completeTaskInState(state, taskId, now = Date.now()) {
  const shouldStop = state.running?.type === 'task' && state.running.taskId === taskId;
  const base = shouldStop ? closeTaskSessionInState(state, now) : state;
  return {
    ...base,
    tasks: base.tasks.map((task) => task.id === taskId ? { ...task, isCompleted: true, completedAt: now } : task),
    running: shouldStop ? null : base.running,
  };
}

export function restoreTaskInState(state, taskId) {
  return {
    ...state,
    tasks: state.tasks.map((task) => task.id === taskId ? { ...task, isCompleted: false, completedAt: null } : task),
  };
}

export function restoreTaskAndStartInState(state, taskId, now = Date.now()) {
  if (state.running?.type === 'interrupt' || state.running?.type === 'break') {
    return { state, taskId: null, error: '先に現在の割り込みや休憩を処理してください' };
  }
  const restored = restoreTaskInState(state, taskId);
  return {
    state: startTaskInState(restored, taskId, now),
    taskId,
    error: null,
  };
}

export function uncompleteTaskInState(state, taskId) {
  return restoreTaskInState(state, taskId);
}

export function deleteTaskInState(state, taskId, now = Date.now()) {
  const base = state.running?.type === 'task' && state.running.taskId === taskId
    ? closeTaskSessionInState(state, now)
    : state;
  const running = base.running?.taskId === taskId || base.running?.preTaskId === taskId
    ? { ...base.running, taskId: null, preTaskId: null }
    : base.running;

  return {
    ...base,
    tasks: base.tasks.filter((task) => task.id !== taskId),
    running: running?.type === 'task' && !running.taskId ? null : running,
  };
}

export function reorderTaskInState(state, taskId, direction) {
  const orderedIds = getManualActiveOrder(state);
  const from = orderedIds.indexOf(taskId);
  if (from < 0) return state;

  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= orderedIds.length) return state;

  const nextIds = [...orderedIds];
  [nextIds[from], nextIds[to]] = [nextIds[to], nextIds[from]];
  const ordersById = new Map(nextIds.map((id, index) => [id, index]));

  return {
    ...state,
    preferences: {
      ...state.preferences,
      sortDue: false,
    },
    tasks: state.tasks.map((task) => ordersById.has(task.id)
      ? { ...task, order: ordersById.get(task.id) }
      : task),
  };
}

export function moveTaskToIndexInState(state, taskId, targetIndex) {
  const orderedIds = getManualActiveOrder(state);
  const from = orderedIds.indexOf(taskId);
  if (from < 0) return state;

  const withoutTask = orderedIds.filter((id) => id !== taskId);
  const safeIndex = Math.max(0, Math.min(withoutTask.length, targetIndex));
  const nextIds = [
    ...withoutTask.slice(0, safeIndex),
    taskId,
    ...withoutTask.slice(safeIndex),
  ];
  const unchanged = nextIds.every((id, index) => id === orderedIds[index]);
  if (unchanged) return state;

  const ordersById = new Map(nextIds.map((id, index) => [id, index]));
  return {
    ...state,
    preferences: {
      ...state.preferences,
      sortDue: false,
    },
    tasks: state.tasks.map((task) => ordersById.has(task.id)
      ? { ...task, order: ordersById.get(task.id) }
      : task),
  };
}
