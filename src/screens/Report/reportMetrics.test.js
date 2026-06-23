import { describe, expect, it } from 'vitest';
import { calculateRangeStats, calcStats, createEmptyState, createReportSnapshot, selectRangeEvents, setWorkScheduleInState } from '../../state';
import { getRangeBounds } from '../../state/reports';
import { buildReportMetrics } from './reportMetrics';

const at = (hour, minute = 0) => new Date(2026, 4, 11, hour, minute).getTime();

describe('workday report metrics', () => {
  it('splits task and interruption time at workday boundaries and groups reactive follow-up work', () => {
    const state = {
      ...setWorkScheduleInState(createEmptyState(), { start: '09:00', end: '17:00' }),
      events: [
        { id: 'task-early', type: 'task', taskId: 'task-1', label: '準備', start: at(8, 30), end: at(9, 30) },
        { id: 'interrupt', type: 'interrupt', label: '電話', categoryId: 'int-call', start: at(16, 30), end: at(17, 30) },
        { id: 'followup', type: 'task', taskId: 'task-2', interruptOriginId: 'interrupt', label: '後続対応', start: at(17, 30), end: at(18) },
      ],
    };
    const bounds = { since: at(0), until: at(23, 59) };
    const currentStats = calcStats(state.events, bounds.since, bounds.until, bounds.until);
    const metrics = buildReportMetrics(state, currentStats, bounds, bounds.until);

    expect(metrics.workday).toMatchObject({
      inside: { task: 30 * 60000, interrupt: 30 * 60000 },
      beforeStart: { task: 30 * 60000, interrupt: 0 },
      afterEnd: { task: 30 * 60000, interrupt: 30 * 60000 },
      reactive: { direct: 60 * 60000, followup: 30 * 60000, total: 90 * 60000 },
    });
    expect(metrics.dayActivity.interruptions[0].categoryName).toBe('電話');
  });

  it('keeps session details under their task and exposes work recorded without a task separately', () => {
    const state = {
      ...createEmptyState(),
      tasks: [{
        id: 'task-1', name: '資料作成', isCompleted: false, order: 0, categoryId: 'cat-doc',
        planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: at(9), completedAt: null,
      }],
      events: [
        { id: 'session', type: 'task', taskId: 'task-1', label: '資料作成', workDetail: '構成を検討', categoryId: 'cat-doc', start: at(9), end: at(10) },
        { id: 'record-only', type: 'task', label: 'メール返信', workDetail: 'メール返信', categoryId: 'cat-adm', start: at(10), end: at(10, 20) },
      ],
    };
    const bounds = { since: at(0), until: at(23, 59) };
    const currentStats = calcStats(state.events, bounds.since, bounds.until, bounds.until);
    const metrics = buildReportMetrics(state, currentStats, bounds, bounds.until);

    expect(metrics.taskEngagement.rows[0].name).toBe('資料作成');
    expect(metrics.taskEngagement.rows[0].sessions[0].workDetail).toBe('構成を検討');
    expect(metrics.dayActivity.recordOnlyWork).toEqual([expect.objectContaining({ name: 'メール返信', time: 20 * 60000 })]);
    expect(metrics.dailyReport.recordOnlyWork).toHaveLength(1);
  });

  it('keeps task aggregation linear over a large event history', () => {
    const start = at(1, 0);
    const count = 16_000;
    const duration = 5 * 60000;
    const tasks = Array.from({ length: 200 }, (_, index) => ({
      id: `task-${index}`,
      name: `Task ${index}`,
      categoryId: 'cat-dev',
      isCompleted: false,
      order: index,
      planning: { plannedDurationMinutes: 0, dueAt: null },
      createdAt: start,
      completedAt: null,
    }));
    const events = Array.from({ length: count }, (_, index) => ({
      id: `event-${index}`,
      type: 'task',
      taskId: `task-${index % tasks.length}`,
      label: `Task ${index % tasks.length}`,
      categoryId: 'cat-dev',
      start: start + index * duration,
      end: start + (index + 1) * duration,
    }));
    const now = start + count * duration;
    const state = { ...createEmptyState(), tasks, events };
    const snapshot = createReportSnapshot(state, now);
    const middle = 8_000;
    const narrow = selectRangeEvents(snapshot, start + middle * duration, start + (middle + 1) * duration);
    const bounds = getRangeBounds('year', now);
    const stats = calculateRangeStats(snapshot, bounds.since, bounds.until);
    const metrics = buildReportMetrics(state, stats, bounds, now, snapshot);

    expect(narrow).toEqual([expect.objectContaining({ id: `event-${middle}`, durationMs: duration })]);
    expect(stats.focus).toBe(count * duration);
    expect(metrics.taskEngagement.rows).toHaveLength(tasks.length);
    expect(metrics.taskEngagement.rows.reduce((sum, row) => sum + row.rangeTime, 0)).toBe(count * duration);
  });
});
