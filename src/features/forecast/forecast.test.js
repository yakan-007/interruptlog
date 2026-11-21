import { describe, expect, it } from 'vitest';
import { createEmptyState, setWorkScheduleInState } from '../../state';
import { buildForecast } from './forecast';

// November 2026: the 16th and 23rd are Mondays, the 21st/22nd a weekend.
const at = (date, hour, minute = 0) => new Date(2026, 10, date, hour, minute).getTime();
const H = 3600000;

function task(id, estimateHours, dueAt, extra = {}) {
  return {
    id,
    name: id,
    isCompleted: false,
    order: 0,
    categoryId: null,
    memo: '',
    planning: { plannedDurationMinutes: estimateHours * 60, dueAt },
    createdAt: at(1, 9),
    completedAt: null,
    ...extra,
  };
}

function baseState(tasks, events = []) {
  return {
    ...setWorkScheduleInState(createEmptyState(), { start: '09:00', end: '18:00' }),
    tasks,
    events,
  };
}

describe('deadline forecast', () => {
  it('needs work hours to say anything', () => {
    expect(buildForecast({ ...createEmptyState(), tasks: [task('a', 2, null)] }, at(23, 10))).toBe(null);
  });

  it('fills working hours in due order and reports the shortfall of the first date that cannot be met', () => {
    const state = baseState([
      task('c', 8, at(25, 18)),
      task('a', 10, at(24, 18)),
      task('b', 10, at(25, 18)),
      task('none', 0, at(24, 18)),
    ]);
    // Monday 10:00: 8h left today, 9h on Tuesday and Wednesday.
    const forecast = buildForecast(state, at(23, 10));

    expect(forecast.items.map((item) => item.taskId)).toEqual(['a', 'c', 'b']);
    expect(forecast.byTaskId.get('a')).toMatchObject({ finishAt: at(24, 11), late: false });
    // c: the rest of Tuesday (7h) and 1h on Wednesday.
    expect(forecast.byTaskId.get('c')).toMatchObject({ finishAt: at(25, 10), late: false });
    // b: 28h due by Wednesday evening against 26h available -> 2h short, done Thursday 11:00.
    expect(forecast.byTaskId.get('b')).toMatchObject({ finishAt: at(26, 11), late: true, shortfallMs: 2 * H });
    expect(forecast.firstLate.taskId).toBe('b');
    expect(forecast.unestimatedCount).toBe(1);
  });

  it('skips days off and counts what was already done', () => {
    const state = baseState(
      [task('report', 5, at(23, 18))],
      [{ id: 'done', type: 'task', taskId: 'report', label: 'report', start: at(20, 9), end: at(20, 11) }],
    );
    // Friday 17:00: 1h left today, the weekend is off, Monday 9h.
    const forecast = buildForecast(state, at(20, 17));

    expect(forecast.byTaskId.get('report').remainingMs).toBe(3 * H);
    expect(forecast.byTaskId.get('report')).toMatchObject({ finishAt: at(23, 11), late: false });
  });

  it('shrinks the day by the usual interruptions and breaks once there are enough days of records', () => {
    const events = [];
    for (const date of [16, 17, 18, 19, 20]) {
      events.push(
        { id: `t${date}`, type: 'task', taskId: 'x', label: 'x', start: at(date, 9), end: at(date, 12) },
        { id: `i${date}`, type: 'interrupt', label: 'call', start: at(date, 12), end: at(date, 13) },
        { id: `b${date}`, type: 'break', label: 'break', start: at(date, 13), end: at(date, 13, 30) },
        { id: `left${date}`, type: 'task', taskId: 'x', label: 'x', start: at(date, 13, 30), end: at(date, 17, 30) },
      );
    }
    // A timer left running over a weekend day must not count.
    events.push({ id: 'forgotten', type: 'task', taskId: 'x', label: 'x', start: at(19, 18), end: at(20, 8) });
    const state = baseState([task('big', 15, at(24, 18))], events);
    const forecast = buildForecast(state, at(23, 9));

    expect(forecast.profile).toMatchObject({ corrected: true, sampleDays: 5 });
    expect(forecast.profile.focusShare).toBeCloseTo(7.5 / 9);
    expect(forecast.profile.perDay.interruptCount).toBe(1);
    // 7.5h of task time a day: 15h takes exactly Monday and Tuesday.
    expect(forecast.byTaskId.get('big').finishAt).toBe(at(24, 18));
    expect(forecast.byTaskId.get('big').late).toBe(false);
  });

  it('scales remaining estimates by how far finished tasks usually ran over', () => {
    const finished = ['p', 'q', 'r'].map((id, index) => task(id, 2, null, { isCompleted: true, completedAt: at(18 + index, 18) }));
    const events = finished.map((item, index) => ({
      id: `e-${item.id}`, type: 'task', taskId: item.id, label: item.id, start: at(18 + index, 9), end: at(18 + index, 12),
    }));
    const state = baseState([...finished, task('next', 4, at(23, 18))], events);
    const forecast = buildForecast(state, at(23, 9));

    expect(forecast.pace).toMatchObject({ corrected: true, ratio: 1.5, samples: 3 });
    expect(forecast.byTaskId.get('next')).toMatchObject({ remainingMs: 6 * H, finishAt: at(23, 15), late: false });
  });
});
