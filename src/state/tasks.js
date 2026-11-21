import { newId } from './ids';
import { asNumber, asPositiveTimestamp, cleanText } from './utils';
import { ensureWorkdayScheduleInState } from './workday';
import { ERROR_CODES } from '../domain/errors';
import { closeRunningPauseSegmentInState } from './pauseEvents';
import { compareByDueDate } from '../domain/records';

function validateTaskInput(data) {
  if (!cleanText(data.name)) return ERROR_CODES.TASK_NAME_REQUIRED;
  return null;
}

function buildTask(state, data, taskId, now) {
  return {
    id: taskId,
    name: cleanText(data.name) || '無題のタスク',
    isCompleted: false,
    order: getNextTaskOrder(state),
    categoryId: data.categoryId ?? state.categories[0]?.id ?? null,
    memo: cleanText(data.memo),
    planning: {
      plannedDurationMinutes: Math.max(0, asNumber(data.plannedDurationMinutes, 0) ?? 0),
      dueAt: asPositiveTimestamp(data.dueAt, null),
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

function getDueActiveOrder(state) {
  return state.tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !task.isCompleted)
    .sort((a, b) => compareByDueDate(a.task, b.task) || a.index - b.index)
    .map(({ task }) => task.id);
}

function getNextTaskOrder(state) {
  const activeTasks = state.tasks.filter((task) => !task.isCompleted);
  if (activeTasks.length === 0) return 0;
  const orders = activeTasks.map((task) => task.order);
  return state.preferences.taskOrder !== 'bottom'
    ? Math.min(...orders) - 1
    : Math.max(...orders) + 1;
}

export function createTaskInState(state, data, now = Date.now(), { createId = newId } = {}) {
  const errorCode = validateTaskInput(data);
  if (errorCode) return { state, taskId: null, errorCode };

  const taskId = createId('tn', now);
  const task = buildTask(state, data, taskId, now);
  const tasks = state.preferences.taskOrder !== 'bottom' ? [task, ...state.tasks] : [...state.tasks, task];
  return {
    state: { ...state, tasks },
    taskId,
    errorCode: null,
  };
}

export function createTaskAndStartInState(state, data, now = Date.now(), dependencies = {}) {
  const created = createTaskInState(state, data, now, dependencies);
  if (created.errorCode || !created.taskId) return created;
  return {
    state: startTaskInState(created.state, created.taskId, now, dependencies),
    taskId: created.taskId,
    errorCode: null,
  };
}

export function saveTaskInState(state, data, now = Date.now(), dependencies = {}) {
  const errorCode = validateTaskInput(data);
  if (errorCode) return { state, taskId: data.id ?? null, errorCode };
  if (!data.id) return createTaskInState(state, data, now, dependencies);

  const name = cleanText(data.name);
  const memo = cleanText(data.memo);
  return {
    state: {
      ...state,
      tasks: state.tasks.map((task) => task.id === data.id ? {
        ...task,
        name: name || task.name,
        categoryId: data.categoryId ?? null,
        memo,
        planning: {
          ...task.planning,
          plannedDurationMinutes: Math.max(0, asNumber(data.plannedDurationMinutes, 0) ?? 0),
          dueAt: asPositiveTimestamp(data.dueAt, null),
        },
      } : task),
      // Task sessions inherit their shared identity from the task. A task edit
      // must therefore update every linked session so history, reports, and
      // exports cannot disagree about its name, category, or memo.
      events: state.events.map((event) => {
        if (event.type !== 'task' || event.taskId !== data.id) return event;
        return {
          ...event,
          categoryId: data.categoryId ?? null,
          label: name || event.label,
          memo,
        };
      }),
    },
    taskId: data.id,
    errorCode: null,
  };
}

export function startTaskInState(state, taskId, now = Date.now(), options = {}) {
  const { createId = newId } = options;
  const snapshotted = ensureWorkdayScheduleInState(state, now);
  const task = snapshotted.tasks.find((item) => item.id === taskId);
  if (!task) return state;
  const pauseClosed = closePauseInState(snapshotted, now, createId);
  const closed = closeTaskSessionInState(pauseClosed, now, { createId });
  const event = {
    id: createId('ev', now),
    type: 'task',
    taskId,
    label: task.name,
    categoryId: task.categoryId,
    memo: task.memo ?? '',
    start: now,
    end: null,
  };
  return {
    ...closed,
    events: [...closed.events, event],
    running: {
      type: 'task',
      taskId,
      start: now,
      label: null,
    },
  };
}

// Ends the running pause and records it with whatever the pause sheet holds so
// far, exactly like "save and end" would. Used when a task starts during a pause
// and when a forgotten pause is stopped at a chosen time.
function closePauseInState(state, now, createId = newId) {
  const running = state.running;
  if (running?.type !== 'interrupt' && running?.type !== 'break') return state;
  const category = state.interruptCats?.find((item) => item.id === running.categoryId);
  const draft = running.draft ?? {};
  const untitled = running.type === 'interrupt' && !draft.label && !draft.who;
  const data = untitled ? { label: category?.name || '未記録の割り込み' } : {};
  return { ...closeRunningPauseSegmentInState(state, now, data, { createId }), running: null };
}



export function closeTaskSessionInState(state, now = Date.now(), { createId = newId } = {}) {
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
      id: createId('ev', now),
      type: 'task',
      taskId: running.taskId,
      label: task?.name ?? 'タスク',
      categoryId: task?.categoryId ?? null,
      memo: task?.memo ?? '',
      start: running.start,
      end: now,
    }],
  };
}

export function stopTaskInState(state, complete, now = Date.now(), dependencies = {}) {
  const runningTaskId = state.running?.taskId;
  const closed = closeTaskSessionInState(state, now, dependencies);
  return {
    ...closed,
    tasks: complete && runningTaskId
      ? closed.tasks.map((task) => task.id === runningTaskId ? { ...task, isCompleted: true, completedAt: now } : task)
      : closed.tasks,
    running: null,
  };
}

// Stop whatever is running at a past moment (a forgotten timer). `at` must lie
// after the running start and not in the future.
export function endRunningAtInState(state, at, now = Date.now(), { createId = newId } = {}) {
  const running = state.running;
  if (!running) return { state, errorCode: null };
  if (!Number.isFinite(at) || at > now) return { state, errorCode: ERROR_CODES.INVALID_EVENT_WINDOW };
  if (at <= running.start) return { state, errorCode: ERROR_CODES.END_NOT_AFTER_START };
  if (running.type === 'task') return { state: stopTaskInState(state, false, at, { createId }), errorCode: null };
  return { state: closePauseInState(state, at, createId), errorCode: null };
}

export function completeTaskInState(state, taskId, now = Date.now(), dependencies = {}) {
  const shouldStop = state.running?.type === 'task' && state.running.taskId === taskId;
  const base = shouldStop ? closeTaskSessionInState(state, now, dependencies) : state;
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

export function restoreTaskAndStartInState(state, taskId, now = Date.now(), dependencies = {}) {
  const restored = restoreTaskInState(state, taskId);
  return {
    state: startTaskInState(restored, taskId, now, dependencies),
    taskId,
    errorCode: null,
  };
}

export function deleteTaskInState(state, taskId, now = Date.now(), dependencies = {}) {
  const base = state.running?.type === 'task' && state.running.taskId === taskId
    ? closeTaskSessionInState(state, now, dependencies)
    : state;
  const running = base.running?.taskId === taskId
    ? null
    : base.running?.returnTaskId === taskId
      ? { ...base.running, returnTaskId: null }
      : base.running;

  return {
    ...base,
    tasks: base.tasks.filter((task) => task.id !== taskId),
    running,
  };
}

// `targetIndex` is a position in the list as shown. While the list is sorted
// by due date, that is the due order, which then becomes the manual order.
export function moveTaskToIndexInState(state, taskId, targetIndex) {
  const orderedIds = state.preferences.taskOrder === 'due' ? getDueActiveOrder(state) : getManualActiveOrder(state);
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
    // Dragging means a hand-made order; from due order it becomes "new on top".
    preferences: {
      ...state.preferences,
      taskOrder: state.preferences.taskOrder === 'due' ? 'top' : state.preferences.taskOrder,
    },
    tasks: state.tasks.map((task) => ordersById.has(task.id)
      ? { ...task, order: ordersById.get(task.id) }
      : task),
  };
}
