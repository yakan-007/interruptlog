import type { TaskLifecycleRecord } from '@/types';
import { formatDurationCompact } from '@/lib/reportUtils';
import type {
  DateRange,
  TaskDailyStat,
  TaskRangeComputation,
  TaskMonthlyPoint,
  TaskYearlyPoint,
  TaskWeeklyPoint,
  TaskTotals,
} from './types';
import { getDayBounds, toDateKey } from './range';

export const formatDayLabel = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const computeBaselineBacklog = (
  entries: TaskLifecycleRecord[],
  rangeStartMs: number,
) =>
  entries.filter(entry => {
    if (entry.createdAt >= rangeStartMs) return false;
    if (entry.completedAt != null && entry.completedAt < rangeStartMs) return false;
    if (entry.canceledAt != null && entry.canceledAt < rangeStartMs) return false;
    return true;
  }).length;

const buildTaskRange = (
  ledger: Record<string, TaskLifecycleRecord>,
  range: DateRange,
): TaskRangeComputation => {
  const entries = Object.values(ledger);
  const rangeStartMs = range.start.getTime();

  const baselineBacklog = computeBaselineBacklog(entries, rangeStartMs);

  let backlog = baselineBacklog;
  const daily: TaskDailyStat[] = range.days.map(dayKey => {
    const { start, end } = getDayBounds(dayKey);
    const newCount = entries.filter(entry => entry.createdAt >= start && entry.createdAt < end).length;
    const completedCount = entries.filter(entry => entry.completedAt != null && entry.completedAt >= start && entry.completedAt < end).length;
    const canceledCount = entries.filter(entry => entry.canceledAt != null && entry.canceledAt >= start && entry.canceledAt < end).length;
    backlog = backlog + newCount - completedCount - canceledCount;
    return {
      dateKey: dayKey,
      label: formatDayLabel(dayKey),
      newCount,
      completedCount,
      canceledCount,
      backlogEnd: backlog,
    };
  });

  const totals = daily.reduce<TaskTotals>(
    (acc, stat) => ({
      newCount: acc.newCount + stat.newCount,
      completedCount: acc.completedCount + stat.completedCount,
      canceledCount: acc.canceledCount + stat.canceledCount,
      backlogEnd: stat.backlogEnd,
    }),
    {
      newCount: 0,
      completedCount: 0,
      canceledCount: 0,
      backlogEnd: baselineBacklog,
    },
  );

  if (daily.length === 0) {
    totals.backlogEnd = baselineBacklog;
  }

  return { daily, totals, baselineBacklog };
};

export const buildTaskRangeData = (
  ledger: Record<string, TaskLifecycleRecord>,
  currentRange: DateRange,
  previousRange: DateRange,
) => ({
  current: buildTaskRange(ledger, currentRange),
  previous: buildTaskRange(ledger, previousRange),
});

export const buildMonthlyTaskPoints = (daily: TaskDailyStat[]): TaskMonthlyPoint[] =>
  daily.map(stat => ({
    dateKey: stat.dateKey,
    label: formatDayLabel(stat.dateKey),
    newCount: stat.newCount,
    completedCount: stat.completedCount,
    backlogEnd: stat.backlogEnd,
  }));

export const buildYearlyTaskPoints = (
  taskRange: TaskRangeComputation,
  year: number,
): TaskYearlyPoint[] => {
  const grouped = new Map<number, TaskYearlyPoint>();

  taskRange.daily.forEach(stat => {
    const date = new Date(`${stat.dateKey}T00:00:00`);
    const monthIndex = date.getMonth();
    const existing = grouped.get(monthIndex);
    if (existing) {
      existing.newCount += stat.newCount;
      existing.completedCount += stat.completedCount;
      existing.backlogEnd = stat.backlogEnd;
    } else {
      grouped.set(monthIndex, {
        monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        label: `${monthIndex + 1}月`,
        newCount: stat.newCount,
        completedCount: stat.completedCount,
        backlogEnd: stat.backlogEnd,
      });
    }
  });

  const results: TaskYearlyPoint[] = [];
  let carryBacklog = taskRange.baselineBacklog;

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const existing = grouped.get(monthIndex);
    if (existing) {
      results.push(existing);
      carryBacklog = existing.backlogEnd;
    } else {
      results.push({
        monthKey: key,
        label: `${monthIndex + 1}月`,
        newCount: 0,
        completedCount: 0,
        backlogEnd: carryBacklog,
      });
    }
  }

  return results;
};

export const buildWeeklyTaskPoints = (daily: TaskDailyStat[]): TaskWeeklyPoint[] =>
  daily.map(stat => {
    const date = new Date(`${stat.dateKey}T00:00:00`);
    const label = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return {
      dateKey: stat.dateKey,
      label,
      newCount: stat.newCount,
      completedCount: stat.completedCount,
      netCount: stat.newCount - stat.completedCount - stat.canceledCount,
      backlogEnd: stat.backlogEnd,
    };
  });

export const formatProcessingRate = (totals: TaskTotals) => {
  if (totals.newCount === 0) return '0%';
  return `${Math.round((totals.completedCount / totals.newCount) * 100)}%`;
};

export const summarizeTaskTotals = (totals: TaskTotals) => ({
  new: `${totals.newCount} 件`,
  completed: `${totals.completedCount} 件`,
  backlog: `${totals.backlogEnd} 件`,
  canceled: `${totals.canceledCount} 件`,
  processingRate: formatProcessingRate(totals),
});

export const summarizeInterrupt = (count: number, totalDuration: number) => ({
  count,
  durationLabel: formatDurationCompact(totalDuration),
});
