import { describe, it, expect } from 'vitest';
import { computePlanningAggregates, PlanningInsight } from '@/lib/planningInsights';
import { SummaryItem } from '@/lib/reportUtils';

const baseSummaryItems: SummaryItem[] = [
  {
    key: 'task',
    label: 'タスク',
    description: '',
    totalDuration: 7_800_000,
    totalCount: 5,
    deltaDuration: 0,
    deltaCount: 0,
  },
  {
    key: 'interrupt',
    label: '割り込み',
    description: '',
    totalDuration: 1_800_000,
    totalCount: 2,
    deltaDuration: 0,
    deltaCount: 0,
  },
  {
    key: 'break',
    label: '休憩',
    description: '',
    totalDuration: 600_000,
    totalCount: 1,
    deltaDuration: 0,
    deltaCount: 0,
  },
];

describe('planningInsights', () => {
  it('returns null when no insights are provided', () => {
    const aggregates = computePlanningAggregates({
      insights: [],
      summaryItems: baseSummaryItems,
      selectedDateKey: '2025-01-10',
    });
    expect(aggregates).toBeNull();
  });

  it('computes aggregates and classifications correctly', () => {
    const insights: PlanningInsight[] = [
      {
        taskName: '遅延タスク',
        plannedMinutes: 60,
        actualMinutes: 90,
        varianceMinutes: 30,
        dueAt: new Date('2025-01-10T15:00:00').getTime(),
      },
      {
        taskName: '先行タスク',
        plannedMinutes: 45,
        actualMinutes: 30,
        varianceMinutes: -15,
        dueAt: new Date('2025-01-11T03:00:00').getTime(),
      },
      {
        taskName: '期限切れタスク',
        plannedMinutes: 30,
        actualMinutes: 10,
        varianceMinutes: 20,
        dueAt: new Date('2025-01-10T18:00:00').getTime(),
      },
      {
        taskName: '未計画タスク',
        actualMinutes: 20,
      },
    ];

    const aggregates = computePlanningAggregates({
      insights,
      summaryItems: baseSummaryItems,
      selectedDateKey: '2025-01-10',
      upcomingWindowMinutes: 24 * 60,
    });

    expect(aggregates).not.toBeNull();
    if (!aggregates) return;

    expect(aggregates.totalActualMinutes).toBeCloseTo(150, 5);
    expect(aggregates.totalPlannedMinutes).toBeCloseTo(135, 5);
    expect(aggregates.planningCoverage).toBeCloseTo(0.75, 5);
    expect(aggregates.focusRate).toBeCloseTo(0.765, 3);

    expect(aggregates.behindSchedule.map(item => item.taskName)).toContain('遅延タスク');
    expect(aggregates.aheadOfSchedule.map(item => item.taskName)).toContain('先行タスク');
    expect(aggregates.overdue.map(item => item.taskName)).toContain('期限切れタスク');
    expect(aggregates.upcoming.map(item => item.taskName)).toContain('先行タスク');
    expect(aggregates.onTrack.length).toBe(0);
  });
});
