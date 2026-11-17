import { closeTaskSessionInState, startTaskInState } from './tasks';
import {
  appendInterruptEvent,
  buildBreakEvent,
  buildInterruptEvent,
  closeRunningPauseSegmentInState,
  interruptLabel,
  normalizeInterruptDraft,
} from './pauseEvents';
import { ensureWorkdayScheduleInState } from './workday';

export function beginPauseInState(state, type, now = Date.now(), context = {}, dependencies = {}) {
  const snapshotted = ensureWorkdayScheduleInState(state, now);
  const running = snapshotted.running;
  const resumeStack = buildResumeStackForNextPause(running);
  const suspended = running?.type === 'task'
    ? closeTaskSessionInState(snapshotted, now, dependencies)
    : closeRunningPauseSegmentInState(snapshotted, now, context.currentPauseData, dependencies);

  return {
    ...suspended,
    running: createPauseRunning(type, now, resumeStack, context),
  };
}

export function beginPauseWithCategoryInState(state, categoryId = null, now = Date.now(), dependencies = {}) {
  const category = findPauseCategory(state, categoryId) ?? firstPauseCategory(state, null);
  const type = pauseTypeFromCategory(category);
  return beginPauseInState(state, type, now, pauseContextFromCategory(category, type), dependencies);
}

export function beginNextPauseWithCategoryInState(state, categoryId = null, currentPauseData = {}, now = Date.now(), dependencies = {}) {
  const category = findPauseCategory(state, categoryId) ?? firstPauseCategory(state, null);
  const type = pauseTypeFromCategory(category);
  return beginPauseInState(state, type, now, {
    ...pauseContextFromCategory(category, type),
    currentPauseData,
  }, dependencies);
}

export function selectPauseCategoryInState(state, categoryId) {
  const running = state.running;
  if (running?.type !== 'interrupt' && running?.type !== 'break') return state;
  const category = findPauseCategory(state, categoryId);
  if (!category) return state;

  const type = pauseTypeFromCategory(category);
  if (type === 'interrupt') {
    const draft = normalizeInterruptDraft({ ...running.draft, categoryId: category.id });
    return {
      ...state,
      running: {
        ...running,
        type,
        categoryId: category.id,
        label: interruptLabel(draft, category.name),
        draft,
      },
    };
  }

  return {
    ...state,
    running: {
      ...running,
      type,
      categoryId: category.id,
      label: category.name || '休憩中',
      draft: null,
    },
  };
}

export function updateInterruptDraftInState(state, draft) {
  if (state.running?.type !== 'interrupt') return state;
  const nextDraft = normalizeInterruptDraft(draft);
  const currentDraft = normalizeInterruptDraft(state.running.draft);
  if (Object.entries(nextDraft).every(([key, value]) => currentDraft[key] === value)) return state;
  const category = findPauseCategory(state, nextDraft.categoryId);
  return {
    ...state,
    running: {
      ...state.running,
      categoryId: nextDraft.categoryId,
      draft: nextDraft,
      label: interruptLabel(nextDraft, category?.name),
    },
  };
}

// The task a pause returns to: the nearest task in the resume stack, as long as
// it still exists and has not been completed while the pause was running.
export function getResumeTaskId(state) {
  const running = state.running;
  if (running?.type !== 'interrupt' && running?.type !== 'break') return null;
  const taskId = findNearestTaskContext(getResumeStack(running))?.taskId;
  const task = taskId ? state.tasks.find((item) => item.id === taskId) : null;
  return task && !task.isCompleted ? task.id : null;
}

function resumeOrStopInState(state, resume, now = Date.now(), dependencies = {}) {
  const taskId = resume ? getResumeTaskId(state) : null;
  const base = { ...state, running: null };
  if (!taskId) return base;
  return startTaskInState(base, taskId, now, { ...dependencies, resumeStack: [] });
}

export function saveInterruptInState(state, data, now = Date.now(), dependencies = {}) {
  if (state.running?.type !== 'interrupt') return state;
  const event = buildInterruptEvent({ ...state.running.draft, ...data }, state.running.start ?? now, now, null, dependencies);
  const next = appendInterruptEvent(state, event, data.saveWhoChip ?? state.running.draft?.saveWhoChip);
  return resumeOrStopInState(next, data.resume, now, dependencies);
}

export function saveBreakInState(state, data, now = Date.now(), dependencies = {}) {
  if (state.running?.type !== 'break') return state;
  const next = {
    ...state,
    events: [...state.events, buildBreakEvent(state.running, data, now, '休憩', dependencies)],
  };
  return resumeOrStopInState(next, data.resume, now, dependencies);
}

// "It wasn't a pause": nothing is recorded for it, and its time goes back to the
// task it interrupted, so the timeline has no hole. With no task to return to,
// the pause is simply dropped.
export function cancelPauseInState(state, _now, dependencies = {}) {
  const running = state.running;
  if (running?.type !== 'interrupt' && running?.type !== 'break') return state;
  const taskId = getResumeTaskId(state);
  if (!taskId) return { ...state, running: null };

  const sessionIndex = state.events.findLastIndex((event) =>
    event.type === 'task' && event.taskId === taskId && event.end === running.start
  );
  if (sessionIndex < 0) {
    return startTaskInState({ ...state, running: null }, taskId, running.start, { ...dependencies, resumeStack: [] });
  }
  const session = state.events[sessionIndex];
  const events = [...state.events];
  events[sessionIndex] = { ...session, end: null };
  return {
    ...state,
    events,
    running: { type: 'task', taskId, start: session.start, label: null, preTaskId: null, resumeStack: [] },
  };
}

function createPauseRunning(type, now, resumeStack, context = {}) {
  const draft = type === 'interrupt' ? normalizeInterruptDraft(context.draft) : null;
  return {
    type,
    taskId: null,
    start: now,
    label: type === 'break' ? (context.label || '休憩中') : interruptLabel(draft, context.label),
    preTaskId: findNearestTaskId(resumeStack),
    resumeStack,
    categoryId: type === 'interrupt' ? draft.categoryId : context.categoryId ?? null,
    draft,
  };
}

function getResumeStack(running) {
  if (Array.isArray(running?.resumeStack)) return running.resumeStack;
  return running?.preTaskId ? [{ type: 'task', taskId: running.preTaskId }] : [];
}

function buildResumeStackForNextPause(running) {
  if (!running) return [];
  if (running.type === 'task' && running.taskId) return [{ type: 'task', taskId: running.taskId }];
  const taskContext = findNearestTaskContext(getResumeStack(running));
  return taskContext ? [taskContext] : [];
}

function findNearestTaskId(resumeStack) {
  return findNearestTaskContext(resumeStack)?.taskId ?? null;
}

function findNearestTaskContext(resumeStack) {
  const context = [...resumeStack].reverse().find((item) => item.type === 'task' && item.taskId);
  return context ? { type: 'task', taskId: context.taskId } : null;
}

function findPauseCategory(state, categoryId) {
  if (!categoryId) return null;
  return state.interruptCats.find((category) => category.id === categoryId) ?? null;
}

function firstPauseCategory(state, kind) {
  return state.interruptCats.find((category) => !kind || category.kind === kind) ?? null;
}

function pauseTypeFromCategory(category) {
  return category?.kind === 'break' ? 'break' : 'interrupt';
}

function pauseContextFromCategory(category, type) {
  if (!category) return {};
  if (type === 'break') {
    return {
      categoryId: category.id,
      label: category.name,
    };
  }
  return {
    label: category.name,
    draft: { categoryId: category.id },
  };
}
