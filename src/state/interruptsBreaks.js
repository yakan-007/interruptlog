import { newId } from './ids';
import { asNumber, cleanText } from './utils';
import { closeTaskSessionInState, createTaskInState, startTaskInState } from './tasks';
import { ensureWorkdayScheduleInState } from './workday';

export function beginPauseInState(state, type, now = Date.now(), context = {}) {
  const snapshotted = ensureWorkdayScheduleInState(state, now);
  const running = snapshotted.running;
  const resumeStack = buildResumeStackForNextPause(running);
  const suspended = running?.type === 'task'
    ? closeTaskSessionInState(snapshotted, now)
    : closeRunningPauseSegmentInState(snapshotted, now);

  return {
    ...suspended,
    running: createPauseRunning(type, now, resumeStack, context),
  };
}

export function beginPauseWithCategoryInState(state, categoryId = null, now = Date.now()) {
  const category = findPauseCategory(state, categoryId) ?? firstPauseCategory(state, null);
  const type = pauseTypeFromCategory(category);
  return beginPauseInState(state, type, now, pauseContextFromCategory(category, type));
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
        plannedBreakDurationMinutes: null,
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
      plannedBreakDurationMinutes: running.type === 'break' && running.categoryId === category.id
        ? Math.max(0, asNumber(running.plannedBreakDurationMinutes, category.defaultDurationMinutes) ?? 0)
        : Math.max(0, asNumber(category.defaultDurationMinutes, 0) ?? 0),
    },
  };
}

export function setBreakTargetInState(state, minutes) {
  if (state.running?.type !== 'break') return state;
  return {
    ...state,
    running: {
      ...state.running,
      plannedBreakDurationMinutes: Math.max(0, asNumber(minutes, 0) ?? 0),
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

function resumeOrStopInState(state, resume, now = Date.now()) {
  const running = state.running;
  const resumeStack = getResumeStack(running);
  const base = { ...state, running: null };
  const taskContext = findNearestTaskContext(resumeStack);
  if (!resume || !taskContext) return base;

  if (base.tasks.some((task) => task.id === taskContext.taskId)) {
    return startTaskInState(base, taskContext.taskId, now, { resumeStack: [] });
  }
  return base;
}

export function saveInterruptInState(state, data, now = Date.now()) {
  if (state.running?.type !== 'interrupt') return state;
  const event = buildInterruptEvent({ ...state.running.draft, ...data }, state.running.start ?? now, now);
  const next = appendInterruptEvent(state, event, data.saveWhoChip ?? state.running.draft?.saveWhoChip);
  return resumeOrStopInState(next, data.resume, now);
}

export function createInterruptFollowupTaskInState(state, interruptData, taskData, now = Date.now()) {
  if (state.running?.type !== 'interrupt') return { state, taskId: null, error: '割り込み作業が開始されていません' };

  const validation = createTaskInState(state, taskData, now);
  if (validation.error) return validation;

  const event = buildInterruptEvent({ ...state.running.draft, ...interruptData }, state.running.start ?? now, now);
  const withInterrupt = appendInterruptEvent(state, event, interruptData.saveWhoChip ?? state.running.draft?.saveWhoChip);
  const created = createTaskInState(withInterrupt, {
    ...taskData,
    interruptOriginId: event.id,
  }, now);
  const hadResumeTarget = getResumeStack(state.running).length > 0;
  const resumed = resumeOrStopInState({ ...created.state, running: state.running }, true, now);
  return {
    state: hadResumeTarget ? resumed : startTaskInState(resumed, created.taskId, now),
    taskId: created.taskId,
    error: null,
  };
}

export function saveBreakInState(state, data, now = Date.now()) {
  if (state.running?.type !== 'break') return state;
  const next = {
    ...state,
    events: [...state.events, buildBreakEvent(state.running, data, now)],
  };
  return resumeOrStopInState(next, data.resume, now);
}

export function cancelPauseInState(state, now = Date.now()) {
  return resumeOrStopInState(state, true, now);
}

export function stopPauseInState(state, resume, now = Date.now()) {
  const running = state.running;
  const next = running?.type === 'interrupt' || running?.type === 'break'
    ? {
        ...state,
        events: [...state.events, running.type === 'interrupt'
          ? buildInterruptEvent(running.draft, running.start, now, '未記録の割り込み')
          : buildBreakEvent(running, {}, now, '未記録の休憩')],
      }
    : state;
  return resumeOrStopInState(next, resume, now);
}

function closeRunningPauseSegmentInState(state, now) {
  const running = state.running;
  if (running?.type === 'interrupt') {
    const event = buildInterruptEvent(running.draft, running.start, now);
    return appendInterruptEvent(state, event, running.draft?.saveWhoChip);
  }
  if (running?.type === 'break') {
    return {
      ...state,
      events: [...state.events, buildBreakEvent(running, {}, now)],
    };
  }
  return state;
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
    plannedBreakDurationMinutes: type === 'break'
      ? Math.max(0, asNumber(context.plannedBreakDurationMinutes, 0) ?? 0)
      : null,
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

function normalizeInterruptDraft(data = {}) {
  return {
    who: cleanText(data.who),
    saveWhoChip: Boolean(data.saveWhoChip),
    label: cleanText(data.label),
    urgency: ['low', 'med', 'high'].includes(data.urgency) ? data.urgency : 'med',
    categoryId: cleanText(data.categoryId) || null,
    memo: cleanText(data.memo),
  };
}

function appendInterruptEvent(state, event, saveWhoChip) {
  return {
    ...state,
    events: [...state.events, event],
    whoChips: saveWhoChip && event.who && !state.whoChips.includes(event.who)
      ? [...state.whoChips, event.who]
      : state.whoChips,
  };
}

function buildBreakEvent(running, data, now, fallbackLabel = '休憩') {
  const runningLabel = cleanText(running.label);
  return {
    id: newId('ev', now),
    type: 'break',
    label: cleanText(data.label) || (running.categoryId && runningLabel ? runningLabel : fallbackLabel),
    categoryId: cleanText(data.categoryId) || running.categoryId || null,
    memo: cleanText(data.memo),
    breakType: data.breakType ?? null,
    breakDurationMinutes: Math.max(0, asNumber(data.breakDurationMinutes ?? running.plannedBreakDurationMinutes, 0) ?? 0),
    start: running.start ?? now,
    end: now,
  };
}

function buildInterruptEvent(data = {}, start, end, fallbackLabel = null) {
  return {
    id: newId('ev', end),
    type: 'interrupt',
    label: cleanText(data.label) || (data.who ? `${data.who}から` : fallbackLabel || '割り込み作業'),
    who: cleanText(data.who),
    urgency: data.urgency || 'med',
    categoryId: data.categoryId || null,
    memo: data.memo || '',
    start,
    end,
  };
}

function interruptLabel(data = {}, categoryName = null) {
  return cleanText(data.label) || (data.who ? `${data.who}から` : cleanText(categoryName) || '割り込み作業中');
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
      plannedBreakDurationMinutes: category.defaultDurationMinutes,
    };
  }
  return {
    label: category.name,
    draft: { categoryId: category.id },
  };
}
