import { describe, expect, it } from 'vitest';
import {
  buildReportCsv,
  createEmptyState,
  createReportSnapshot,
  selectHistoryDaySummary,
  selectReportInputs,
} from './index';
import { getHistoryDayItems } from '../lib/history';

const at = (day, hour, minute = 0) => new Date(2026, 4, day, hour, minute).getTime();
const MINUTE = 60 * 1000;

describe('report fact snapshot', () => {
  it('keeps history, report, daily output, and CSV on the same clipped durations', () => {
    const now = at(11, 23, 59);
    const state = {
      ...createEmptyState(),
      tasks: [
        task('overnight', '夜間の確認', 'cat-dev'),
        task('long', '長い作業', 'cat-doc'),
      ],
      events: [
        { id: 'overnight', type: 'task', taskId: 'overnight', label: '夜間の確認', categoryId: 'cat-dev', start: at(10, 23, 30), end: at(11, 0, 30) },
        { id: 'long', type: 'task', taskId: 'long', label: '長い作業', categoryId: 'cat-doc', start: at(11, 8), end: at(11, 21, 30) },
        { id: 'call', type: 'interrupt', label: '電話', categoryId: 'int-call', start: at(11, 9), end: at(11, 9, 15) },
        { id: 'break', type: 'break', label: '休憩', start: at(11, 12), end: at(11, 12, 10) },
      ],
    };
    const snapshot = createReportSnapshot(state, now);
    const input = selectReportInputs(state, 'day', now, snapshot);
    const history = getHistoryDayItems(state.events, at(11, 0), now);
    const historySummary = selectHistoryDaySummary(history);
    const rows = buildReportCsv(state, 'day', now, snapshot).trim().split('\n').slice(1);

    expect(input.currentStats).toMatchObject({
      focus: 14 * 60 * MINUTE,
      interrupt: 15 * MINUTE,
      break: 10 * MINUTE,
    });
    const recorded = input.currentStats.focus + input.currentStats.interrupt + input.currentStats.break + input.currentStats.unknown;
    expect(recorded).toBe(14 * 60 * MINUTE + 25 * MINUTE);
    expect(historySummary.totalMs).toBe(recorded);
    expect(rows).toHaveLength(4);
  });
});

function task(id, name, categoryId) {
  return {
    id,
    name,
    categoryId,
    isCompleted: false,
    order: 0,
    planning: { plannedDurationMinutes: 0, dueAt: null },
    createdAt: 0,
    completedAt: null,
  };
}
