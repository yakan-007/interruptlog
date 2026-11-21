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
  // The task to go back to: the one that was running, or the one the current
  // pause was already going back to.
  const returnTaskId = running?.type === 'task' ? running.taskId : running?.returnTaskId ?? null;
  const suspended = running?.type === 'task'
    ? closeTaskSessionInState(snapshotted, now, dependencies)
    : closeRunningPauseSegmentInState(snapshotted, now, context.currentPauseData, dependencies);

  return {
    ...suspended,
    running: createPauseRunning(type, now, returnTaskId, context),
  };
}

// Interruptions are categorised (phone, chat, ...); a break is just a break.
export function beginInterruptWithCategoryInState(state, categoryId = null, now = Date.now(), dependencies = {}) {
  return beginPauseInState(state, 'interrupt', now, interruptContext(state, categoryId), dependencies);
}

// Switch between an interruption and a break from now: the current pause is
// recorded with what the sheet holds, and the task to return to is kept.
export function beginNextPauseInState(state, kind, currentPauseData = {}, now = Date.now(), dependencies = {}) {
  const context = kind === 'break' ? {} : interruptContext(state, null);
  return beginPauseInState(state, kind === 'break' ? 'break' : 'interrupt', now, { ...context, currentPauseData }, dependencies);
}

export function selectPauseCategoryInState(state, categoryId) {
  const running = state.running;
  if (running?.type !== 'interrupt') return state;
  const category = findInterruptCategory(state, categoryId);
  if (!category) return state;
  const draft = normalizeInterruptDraft({ ...running.draft, categoryId: category.id });
  return {
    ...state,
    running: {
      ...running,
      categoryId: category.id,
      label: interruptLabel(draft, category.name),
      draft,
    },
  };
}

// Correct what the running pause is, from its start: one record either way.
// (Switching from now instead is beginNextPauseInState.)
export function setPauseKindInState(state, kind, categoryId = null) {
  const running = state.running;
  if (running?.type !== 'interrupt' && running?.type !== 'break') return state;
  if (running.type === kind) return kind === 'interrupt' && categoryId ? selectPauseCategoryInState(state, categoryId) : state;
  if (kind === 'break') {
    return { ...state, running: { ...running, type: 'break', categoryId: null, label: '休憩中', draft: null } };
  }
  const context = interruptContext(state, categoryId);
  const draft = normalizeInterruptDraft(context.draft);
  return {
    ...state,
    running: { ...running, type: 'interrupt', categoryId: draft.categoryId, label: interruptLabel(draft, context.label), draft },
  };
}

export function updateInterruptDraftInState(state, draft) {
  if (state.running?.type !== 'interrupt') return state;
  const nextDraft = normalizeInterruptDraft(draft);
  const currentDraft = normalizeInterruptDraft(state.running.draft);
  if (Object.entries(nextDraft).every(([key, value]) => currentDraft[key] === value)) return state;
  const category = findInterruptCategory(state, nextDraft.categoryId);
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

// The task a pause returns to, as long as
// it still exists and has not been completed while the pause was running.
export function getResumeTaskId(state) {
  const running = state.running;
  if (running?.type !== 'interrupt' && running?.type !== 'break') return null;
  const taskId = running.returnTaskId;
  const task = taskId ? state.tasks.find((item) => item.id === taskId) : null;
  return task && !task.isCompleted ? task.id : null;
}

function resumeOrStopInState(state, resume, now = Date.now(), dependencies = {}) {
  const taskId = resume ? getResumeTaskId(state) : null;
  const base = { ...state, running: null };
  if (!taskId) return base;
  return startTaskInState(base, taskId, now, dependencies);
}

export function saveInterruptInState(state, data, now = Date.now(), dependencies = {}) {
  if (state.running?.type !== 'interrupt') return state;
  // Ended without a subject or sender (e.g. from the running bar): name it
  // after its category, as when a task start closes it.
  const category = findInterruptCategory(state, data.categoryId ?? state.running.categoryId);
  const event = buildInterruptEvent({ ...state.running.draft, ...data }, state.running.start ?? now, now, category?.name, dependencies);
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
    return startTaskInState({ ...state, running: null }, taskId, running.start, dependencies);
  }
  const session = state.events[sessionIndex];
  const events = [...state.events];
  events[sessionIndex] = { ...session, end: null };
  return {
    ...state,
    events,
    running: { type: 'task', taskId, start: session.start, label: null },
  };
}

function createPauseRunning(type, now, returnTaskId, context = {}) {
  const draft = type === 'interrupt' ? normalizeInterruptDraft(context.draft) : null;
  return {
    type,
    taskId: null,
    start: now,
    label: type === 'break' ? '休憩中' : interruptLabel(draft, context.label),
    returnTaskId,
    categoryId: type === 'interrupt' ? draft.categoryId : null,
    draft,
  };
}

function findInterruptCategory(state, categoryId) {
  if (!categoryId) return null;
  return state.interruptCats.find((category) => category.id === categoryId) ?? null;
}

function interruptContext(state, categoryId) {
  const category = findInterruptCategory(state, categoryId)
    ?? state.interruptCats[0]
    ?? null;
  return category ? { label: category.name, draft: { categoryId: category.id } } : {};
}
