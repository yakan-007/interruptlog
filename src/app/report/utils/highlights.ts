import type { HighlightMetric, Granularity, TaskRangeComputation } from './types';
import type { SummaryMetrics, InterruptionStats } from '@/lib/reportUtils';
import { formatDurationCompact, formatDelta, formatCountDelta } from '@/lib/reportUtils';

interface BuildHighlightsArgs {
  summaryMetrics: SummaryMetrics;
  taskRanges: { current: TaskRangeComputation; previous: TaskRangeComputation };
  granularity: Granularity;
  interruptionStats: InterruptionStats;
}

const LABELS: Record<Granularity, string> = {
  day: '昨日比',
  week: '先週比',
  month: '先月比',
  year: '前年比',
};

export const buildHighlights = ({
  summaryMetrics,
  taskRanges,
  granularity,
  interruptionStats,
}: BuildHighlightsArgs): HighlightMetric[] => {
  const focusItem = summaryMetrics.items.find(item => item.key === 'task');
  const interruptItem = summaryMetrics.items.find(item => item.key === 'interrupt');

  if (!focusItem || !interruptItem) {
    return [];
  }

  const currentTasks = taskRanges.current.totals;
  const previousTasks = taskRanges.previous.totals;

  const newDelta = currentTasks.newCount - previousTasks.newCount;
  const completedDelta = currentTasks.completedCount - previousTasks.completedCount;
  const interruptionDelta = interruptItem.deltaDuration;

  return [
    {
      id: 'focus',
      label: granularity === 'day' ? '稼働時間' : '集中時間',
      value: formatDurationCompact(focusItem.totalDuration),
      deltaLabel: `${LABELS[granularity]} ${formatDelta(focusItem.deltaDuration).label}`,
      trend: formatDelta(focusItem.deltaDuration).trend,
      helper: `${focusItem.totalCount} セッション`,
    },
    {
      id: 'newTasks',
      label: '新規タスク',
      value: `${currentTasks.newCount} 件`,
      deltaLabel: `${LABELS[granularity]} ${formatCountDelta(newDelta).label}`,
      trend: formatCountDelta(newDelta).trend,
    },
    {
      id: 'completedTasks',
      label: '完了タスク',
      value: `${currentTasks.completedCount} 件`,
      deltaLabel: `${LABELS[granularity]} ${formatCountDelta(completedDelta).label}`,
      trend: formatCountDelta(completedDelta).trend,
      helper: `未完了 ${currentTasks.backlogEnd} 件`,
    },
    {
      id: 'interrupt',
      label: '割り込み件数',
      value: `${interruptionStats.totalCount} 件`,
      deltaLabel: `${LABELS[granularity]} ${formatDelta(interruptionDelta).label}`,
      trend: formatDelta(interruptionDelta).trend,
      helper: `合計 ${formatDurationCompact(interruptItem.totalDuration)}`,
    },
  ];
};
