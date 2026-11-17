import { describe, expect, it } from 'vitest';
import {
  addMissedEventInState,
  applyResolutionPreviewInState,
  beginNextPauseWithCategoryInState,
  beginPauseInState,
  createEmptyState,
  createTaskAndStartInState,
  endRunningAtInState,
  getPauseStartFloor,
  previewAddMissedEventInState,
  selectForgottenTimer,
  shiftPauseStartInState,
  stopTaskInState,
} from './index';

const MIN = 60000;
const HOUR = 60 * MIN;
const t10 = new Date(2026, 10, 17, 10, 0).getTime();

function runningTask(start = t10) {
  const created = createTaskAndStartInState(createEmptyState(), { name: '設計', categoryId: 'cat-dev' }, start);
  return { state: created.state, taskId: created.taskId };
}

const windows = (state) => state.events.map((event) => [event.type, event.start, event.end]);

describe('adding a missed record inside the running task', () => {
  it('splits the running task and keeps the timer going', () => {
    const { state, taskId } = runningTask();
    const now = t10 + 60 * MIN;
    const result = addMissedEventInState(state, { type: 'interrupt', label: '電話', start: t10 + 30 * MIN, end: t10 + 45 * MIN }, {}, now);

    expect(result.errorCode).toBe(null);
    expect(windows(result.state)).toEqual([
      ['task', t10, t10 + 30 * MIN],
      ['interrupt', t10 + 30 * MIN, t10 + 45 * MIN],
      ['task', t10 + 45 * MIN, null],
    ]);
    expect(result.state.running).toMatchObject({ type: 'task', taskId, start: t10 + 45 * MIN });

    const stopped = stopTaskInState(result.state, false, t10 + 90 * MIN);
    expect(windows(stopped).at(-1)).toEqual(['task', t10 + 45 * MIN, t10 + 90 * MIN]);
  });

  it('restarts the running session at now when the record reaches now', () => {
    const { state } = runningTask();
    const now = t10 + 60 * MIN;
    const result = addMissedEventInState(state, { type: 'interrupt', label: '電話', start: t10 + 30 * MIN, end: now }, {}, now);

    expect(windows(result.state)).toEqual([
      ['task', t10, t10 + 30 * MIN],
      ['interrupt', t10 + 30 * MIN, now],
      ['task', now, null],
    ]);
    expect(result.state.running.start).toBe(now);
  });

  it('carries the running change through a confirmed preview', () => {
    const { state } = runningTask();
    const now = t10 + 60 * MIN;
    const { preview } = previewAddMissedEventInState(state, { type: 'break', label: '休憩', start: t10 + 10 * MIN, end: t10 + 20 * MIN }, {}, now);
    const applied = applyResolutionPreviewInState(state, preview);

    expect(applied.running.start).toBe(t10 + 20 * MIN);
    expect(applied.events.filter((event) => event.end === null)).toHaveLength(1);
  });

  it('still refuses records in the future or inside a running pause', () => {
    const { state } = runningTask();
    const now = t10 + 60 * MIN;
    expect(addMissedEventInState(state, { type: 'interrupt', start: t10 + 50 * MIN, end: t10 + 70 * MIN }, {}, now).errorCode).toBe('RUNNING_OVERLAP');

    const paused = beginPauseInState(state, 'interrupt', t10 + 40 * MIN);
    expect(addMissedEventInState(paused, { type: 'interrupt', start: t10 + 45 * MIN, end: t10 + 50 * MIN }, {}, now).errorCode).toBe('RUNNING_OVERLAP');
    expect(addMissedEventInState(paused, { type: 'interrupt', start: t10 + 10 * MIN, end: t10 + 20 * MIN }, {}, now).errorCode).toBe(null);
  });
});

describe('starting a pause earlier', () => {
  it('moves the pause start back and shortens the interrupted task', () => {
    const { state } = runningTask();
    const paused = beginPauseInState(state, 'interrupt', t10 + 30 * MIN);
    const shifted = shiftPauseStartInState(paused, 5);

    expect(shifted.running.start).toBe(t10 + 25 * MIN);
    expect(windows(shifted)).toEqual([['task', t10, t10 + 25 * MIN]]);
  });

  it('stops at the start of the interrupted task and drops it when fully covered', () => {
    const { state } = runningTask();
    const paused = beginPauseInState(state, 'interrupt', t10 + 2 * MIN);
    expect(getPauseStartFloor(paused)).toBe(t10);
    const shifted = shiftPauseStartInState(paused, 5);

    expect(shifted.running.start).toBe(t10);
    expect(shifted.events).toHaveLength(0);
  });

  it('keeps a long-running schedule-day task unflagged until after the work end', () => {
    const { state } = runningTask(t10);
    const withSchedule = { ...state, preferences: { ...state.preferences, workSchedule: { start: '09:00', end: '18:00' } } };
    expect(selectForgottenTimer(withSchedule, t10 + 6 * HOUR)).toBe(null);
  });

  it('takes the time from the previous pause segment when pauses are chained', () => {
    const { state } = runningTask();
    let paused = beginPauseInState(state, 'interrupt', t10 + 30 * MIN);
    paused = beginNextPauseWithCategoryInState(paused, null, { label: '最初' }, t10 + 40 * MIN);
    const shifted = shiftPauseStartInState(paused, 3);

    expect(windows(shifted)).toEqual([
      ['task', t10, t10 + 30 * MIN],
      ['interrupt', t10 + 30 * MIN, t10 + 37 * MIN],
    ]);
    expect(shifted.running.start).toBe(t10 + 37 * MIN);
  });

  it('does not overlap earlier records when nothing was running', () => {
    const { state } = runningTask();
    const idle = stopTaskInState(state, false, t10 + 30 * MIN);
    const paused = beginPauseInState(idle, 'interrupt', t10 + 32 * MIN);
    const shifted = shiftPauseStartInState(paused, 5);

    expect(shifted.running.start).toBe(t10 + 30 * MIN);
    expect(windows(shifted)).toEqual([['task', t10, t10 + 30 * MIN]]);
  });
});

describe('forgotten timers', () => {
  it('flags a timer still running well after the work end and suggests the work end', () => {
    const { state } = runningTask(t10);
    const withSchedule = { ...state, preferences: { ...state.preferences, workSchedule: { start: '09:00', end: '18:00' } } };
    const workEnd = new Date(2026, 10, 17, 18, 0).getTime();

    expect(selectForgottenTimer(withSchedule, workEnd + 10 * MIN)).toBe(null);
    expect(selectForgottenTimer(withSchedule, workEnd + 40 * MIN)).toMatchObject({ suggestedEnd: workEnd });
  });

  it('flags a timer that has run for hours without a work schedule', () => {
    const { state } = runningTask(t10);
    expect(selectForgottenTimer(state, t10 + 3 * HOUR)).toBe(null);
    expect(selectForgottenTimer(state, t10 + 5 * HOUR)).toMatchObject({ elapsedMs: 5 * HOUR, suggestedEnd: null });
  });

  it('stops a task at a chosen past time', () => {
    const { state } = runningTask(t10);
    const now = t10 + 23 * HOUR;
    const result = endRunningAtInState(state, t10 + 8 * HOUR, now);

    expect(result.errorCode).toBe(null);
    expect(result.state.running).toBe(null);
    expect(windows(result.state)).toEqual([['task', t10, t10 + 8 * HOUR]]);
  });

  it('stops a pause at a chosen time and keeps what was typed', () => {
    const { state } = runningTask(t10);
    const paused = beginPauseInState(state, 'break', t10 + HOUR);
    const result = endRunningAtInState(paused, t10 + 2 * HOUR, t10 + 20 * HOUR);

    expect(result.state.running).toBe(null);
    expect(windows(result.state)).toEqual([
      ['task', t10, t10 + HOUR],
      ['break', t10 + HOUR, t10 + 2 * HOUR],
    ]);
  });

  it('rejects stop times before the start or in the future', () => {
    const { state } = runningTask(t10);
    expect(endRunningAtInState(state, t10 - MIN, t10 + HOUR).errorCode).toBe('END_NOT_AFTER_START');
    expect(endRunningAtInState(state, t10 + 2 * HOUR, t10 + HOUR).errorCode).toBe('INVALID_EVENT_WINDOW');
  });
});
