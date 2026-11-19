import { describe, expect, it } from 'vitest';
import { createEmptyState, setWorkScheduleInState } from '../../state';
import { buildDailyReport } from './dailyReport';

const day = (date, hour = 0, minute = 0) => new Date(2026, 10, date, hour, minute).getTime();
const MIN = 60000;

function task(id, overrides = {}) {
  return {
    id,
    name: id,
    memo: '',
    isCompleted: false,
    order: 0,
    categoryId: 'cat-dev',
    planning: { plannedDurationMinutes: 0, dueAt: null },
    createdAt: day(1),
    completedAt: null,
    ...overrides,
  };
}

function work(id, taskId, start, end, overrides = {}) {
  return { id, type: 'task', taskId, label: taskId, categoryId: 'cat-dev', start, end, ...overrides };
}

describe('buildDailyReport', () => {
  it('judges completion by when the task was completed, not by its current state', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        task('done-that-day', { isCompleted: true, completedAt: day(17, 15) }),
        task('done-later', { isCompleted: true, completedAt: day(18, 10) }),
        task('done-without-work-that-day', { isCompleted: true, completedAt: day(17, 9) }),
      ],
      events: [
        work('a', 'done-that-day', day(17, 9), day(17, 10)),
        work('b', 'done-later', day(17, 10), day(17, 11)),
      ],
    };

    const report = buildDailyReport(state, day(17), day(19));

    expect(report.completed.map((row) => row.id).sort()).toEqual(['done-that-day', 'done-without-work-that-day']);
    expect(report.inProgress.map((row) => row.id)).toEqual(['done-later']);
    expect(report.totals.completedCount).toBe(2);
  });

  it('compares the cumulative time with the estimate and lists overruns first', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        task('on-budget', { isCompleted: true, completedAt: day(17, 18), planning: { plannedDurationMinutes: 120, dueAt: null } }),
        task('over', { isCompleted: true, completedAt: day(17, 18), planning: { plannedDurationMinutes: 60, dueAt: null } }),
      ],
      events: [
        work('earlier', 'over', day(16, 9), day(16, 10)),
        work('today-over', 'over', day(17, 9), day(17, 9, 30)),
        work('today-budget', 'on-budget', day(17, 10), day(17, 12)),
      ],
    };

    const report = buildDailyReport(state, day(17), day(19));

    expect(report.completed[0]).toMatchObject({ id: 'over', dayTime: 30 * MIN, totalTime: 90 * MIN, plannedMs: 60 * MIN, overMs: 30 * MIN });
    expect(report.completed[1]).toMatchObject({ id: 'on-budget', overMs: 0 });
  });

  it('attaches work details and memos to their own rows', () => {
    const state = {
      ...createEmptyState(),
      tasks: [task('spec', { name: '仕様書' })],
      events: [
        work('s1', 'spec', day(17, 9), day(17, 10), { label: '仕様書', workDetail: '画面一覧', memo: '先方の回答待ち' }),
        work('s2', 'spec', day(17, 11), day(17, 12), { label: '仕様書', workDetail: '仕様書' }),
        { id: 'r1', type: 'task', label: '問い合わせ対応', workDetail: '問い合わせ対応', categoryId: 'cat-sup', memo: '請求書の件', start: day(17, 13), end: day(17, 13, 20) },
        { id: 'r2', type: 'task', label: '問い合わせ対応', workDetail: '問い合わせ対応', categoryId: 'cat-sup', start: day(17, 14), end: day(17, 14, 10) },
      ],
    };

    const report = buildDailyReport(state, day(17), day(19));

    expect(report.inProgress[0]).toMatchObject({ name: '仕様書', dayTime: 120 * MIN, notes: ['画面一覧', '先方の回答待ち'] });
    expect(report.recordOnly).toEqual([expect.objectContaining({ name: '問い合わせ対応', time: 30 * MIN, notes: ['請求書の件'] })]);
  });

  it('counts every interruption and never drops one that has a memo', () => {
    const interrupts = Array.from({ length: 7 }, (_, index) => ({
      id: `i${index}`,
      type: 'interrupt',
      label: `件名${index}`,
      who: index < 3 ? '佐藤' : index < 5 ? '鈴木' : '',
      categoryId: 'int-chat',
      memo: index === 6 ? '短いが大事' : '',
      start: day(17, 9 + index),
      end: day(17, 9 + index, 10 - index),
    }));
    const state = { ...createEmptyState(), events: interrupts };

    const report = buildDailyReport(state, day(17), day(19));

    expect(report.interruptions.count).toBe(7);
    expect(report.interruptions.time).toBe((10 + 9 + 8 + 7 + 6 + 5 + 4) * MIN);
    expect(report.interruptions.senders).toEqual([
      { label: '佐藤', count: 3, time: 27 * MIN },
      { label: '鈴木', count: 2, time: 13 * MIN },
    ]);
    expect(report.interruptions.otherSenders).toEqual({ count: 2, time: 9 * MIN });
    expect(report.interruptions.items.map((item) => item.id)).toEqual(['i0', 'i1', 'i2', 'i3', 'i4', 'i6']);
    expect(report.interruptions.otherItems).toEqual({ count: 1, time: 5 * MIN });
  });

  it('lists untouched tasks that are overdue or due within three days', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        task('overdue', { planning: { plannedDurationMinutes: 0, dueAt: day(16, 18) } }),
        task('due-today', { planning: { plannedDurationMinutes: 0, dueAt: day(17, 18) } }),
        task('due-soon', { planning: { plannedDurationMinutes: 0, dueAt: day(19, 18) } }),
        task('due-later', { planning: { plannedDurationMinutes: 0, dueAt: day(25, 18) } }),
        task('no-due'),
        task('created-after', { createdAt: day(18, 9), planning: { plannedDurationMinutes: 0, dueAt: day(18, 18) } }),
      ],
    };

    const report = buildDailyReport(state, day(17), day(17, 12));

    expect(report.remaining.map((row) => [row.id, row.dueStatus])).toEqual([
      ['overdue', 'overdue'],
      ['due-today', 'today'],
      ['due-soon', 'soon'],
    ]);
  });

  it('marks a task completed after its due time as late', () => {
    const state = {
      ...createEmptyState(),
      tasks: [task('late', { isCompleted: true, completedAt: day(17, 15), planning: { plannedDurationMinutes: 0, dueAt: day(15, 18) } })],
      events: [work('l', 'late', day(17, 9), day(17, 10))],
    };

    expect(buildDailyReport(state, day(17), day(19)).completed[0].dueStatus).toBe('late');
  });

  it('uses the workday as the span when one is set, otherwise the first and last record', () => {
    const base = {
      ...createEmptyState(),
      events: [work('w', 'x', day(17, 8, 50), day(17, 18, 5))],
    };

    expect(buildDailyReport(base, day(17), day(19)).span).toEqual({ kind: 'recorded', start: day(17, 8, 50), end: day(17, 18, 5) });
    expect(buildDailyReport(setWorkScheduleInState(base, { start: '09:00', end: '18:00' }), day(17), day(19)).span)
      .toEqual({ kind: 'workday', start: day(17, 9), end: day(17, 18) });
    expect(buildDailyReport(createEmptyState(), day(17), day(19)).span).toBeNull();
  });

  it('clips a running record at the report time and totals each kind', () => {
    const state = {
      ...createEmptyState(),
      events: [
        work('w', 'x', day(17, 9), day(17, 10)),
        { id: 'b', type: 'break', label: '昼食', categoryId: 'break-lunch', start: day(17, 12), end: day(17, 12, 45) },
        { id: 'open', type: 'interrupt', label: '電話', categoryId: 'int-call', start: day(17, 13), end: null },
      ],
    };

    const report = buildDailyReport(state, day(17), day(17, 13, 20));

    expect(report.totals).toEqual({
      recorded: 125 * MIN,
      focus: 60 * MIN,
      interrupt: 20 * MIN,
      interruptCount: 1,
      break: 45 * MIN,
      completedCount: 0,
    });
  });
});
