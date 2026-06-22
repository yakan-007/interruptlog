import { newId } from './ids';
import { asNumber, cleanText } from './utils';
import { closeTaskSessionInState, createTaskInState, startTaskInState } from './tasks';
import { ensureWorkdayScheduleInState } from './workday';

export function beginPauseInState(state, type, now = Date.now()) {
  const snapshotted = ensureWorkdayScheduleInState(state, now);
  const preTaskId = snapshotted.running?.type === 'task' ? snapshotted.running.taskId : null;
  const closed = closeTaskSessionInState(snapshotted, now);
  return {
    ...closed,
    running: {
      type,
      taskId: null,
      start: now,
      label: type === 'break' ? '休憩中' : '割り込み作業中',
      preTaskId,
      plannedBreakDurationMinutes: type === 'break' ? 0 : null,
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

function resumeOrStopInState(state, resume, preTaskId, now = Date.now()) {
  const base = { ...state, running: null };
  if (resume && preTaskId && base.tasks.some((task) => task.id === preTaskId)) {
    return startTaskInState(base, preTaskId, now);
  }
  return base;
}

export function saveInterruptInState(state, data, now = Date.now()) {
  const start = state.running?.start ?? now;
  const event = buildInterruptEvent(data, start, now);
  const next = {
    ...state,
    events: [...state.events, event],
    whoChips: data.saveWhoChip && event.who && !state.whoChips.includes(event.who) ? [...state.whoChips, event.who] : state.whoChips,
  };
  return resumeOrStopInState(next, data.resume, state.running?.preTaskId, now);
}

export function createInterruptFollowupTaskInState(state, interruptData, taskData, now = Date.now()) {
  if (state.running?.type !== 'interrupt') return { state, taskId: null, error: '割り込み作業が開始されていません' };

  const validation = createTaskInState(state, taskData, now);
  if (validation.error) return validation;

  const event = buildInterruptEvent(interruptData, state.running.start ?? now, now);
  const withInterrupt = {
    ...state,
    events: [...state.events, event],
    whoChips: interruptData.saveWhoChip && event.who && !state.whoChips.includes(event.who)
      ? [...state.whoChips, event.who]
      : state.whoChips,
  };
  const created = createTaskInState(withInterrupt, {
    ...taskData,
    interruptOriginId: event.id,
  }, now);
  return {
    state: resumeOrStopInState(created.state, true, state.running.preTaskId, now),
    taskId: created.taskId,
    error: null,
  };
}

export function saveBreakInState(state, data, now = Date.now()) {
  const start = state.running?.start ?? now;
  const next = {
    ...state,
    events: [...state.events, {
      id: newId('ev', now),
      type: 'break',
      label: '休憩',
      breakType: data.breakType ?? null,
      breakDurationMinutes: Math.max(0, asNumber(data.breakDurationMinutes, 0) ?? 0),
      start,
      end: now,
    }],
  };
  return resumeOrStopInState(next, data.resume, state.running?.preTaskId, now);
}

export function cancelPauseInState(state, now = Date.now()) {
  return resumeOrStopInState(state, true, state.running?.preTaskId, now);
}

export function stopPauseInState(state, resume, now = Date.now()) {
  const running = state.running;
  let next = state;
  if (running?.type === 'interrupt' || running?.type === 'break') {
    next = {
      ...state,
      events: [...state.events, {
        id: newId('ev', now),
        type: running.type,
        label: running.type === 'break' ? '未記録の休憩' : '未記録の割り込み',
        start: running.start,
        end: now,
      }],
    };
  }
  return resumeOrStopInState(next, resume, running?.preTaskId, now);
}

function buildInterruptEvent(data, start, end) {
  return {
    id: newId('ev', end),
    type: 'interrupt',
    label: cleanText(data.label) || (data.who ? `${data.who}から` : '割り込み作業'),
    who: cleanText(data.who),
    urgency: data.urgency || 'med',
    categoryId: data.categoryId || null,
    memo: data.memo || '',
    start,
    end,
  };
}
