import { newId } from './ids';
import { asNumber, cleanText } from './utils';
import { closeTaskSessionInState, startTaskInState } from './tasks';

export function beginPauseInState(state, type, now = Date.now()) {
  const preTaskId = state.running?.type === 'task' ? state.running.taskId : null;
  const closed = closeTaskSessionInState(state, now);
  return {
    ...closed,
    running: {
      type,
      taskId: null,
      start: now,
      label: type === 'break' ? '休憩中' : '割り込み中',
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
  const event = {
    id: newId('ev', now),
    type: 'interrupt',
    label: cleanText(data.label) || (data.who ? `${data.who}から` : '割り込み'),
    who: cleanText(data.who),
    urgency: data.urgency || 'med',
    categoryId: data.categoryId || null,
    memo: data.memo || '',
    start,
    end: now,
  };
  const next = {
    ...state,
    events: [...state.events, event],
    whoChips: data.saveWhoChip && event.who && !state.whoChips.includes(event.who) ? [...state.whoChips, event.who] : state.whoChips,
  };
  return resumeOrStopInState(next, data.resume, state.running?.preTaskId, now);
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
  let next = state;
  if (state.running?.start && now - state.running.start > 5000) {
    const type = state.running.type === 'break' ? 'break' : 'interrupt';
    next = {
      ...state,
      events: [...state.events, {
        id: newId('ev', now),
        type,
        label: type === 'break' ? 'キャンセルした休憩' : 'キャンセルした割り込み',
        start: state.running.start,
        end: now,
      }],
    };
  }
  return resumeOrStopInState(next, true, state.running?.preTaskId, now);
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
