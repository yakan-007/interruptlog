import { describe, expect, it } from 'vitest';
import { calcStats, createEmptyState, setWorkScheduleInState } from '../../state';
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
});
