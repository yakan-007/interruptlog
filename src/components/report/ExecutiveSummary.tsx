'use client';

import type { Granularity, TaskTotals } from '@/app/report/utils/types';
import type { CategoryStats } from '@/app/report/utils/categoryMetrics';
import type { InterruptionStats, SummaryMetrics } from '@/lib/reportUtils';
import { formatDurationCompact, formatDelta } from '@/lib/reportUtils';

interface ExecutiveSummaryProps {
  rangeLabel: string;
  granularity: Granularity;
  comparisonLabel: string;
  summaryMetrics: SummaryMetrics;
  taskTotals: TaskTotals;
  previousTaskTotals: TaskTotals;
  categoryStats: CategoryStats[];
  interruptionStats: InterruptionStats;
}

const describeDelta = (label: string, trend: 'up' | 'down' | 'flat', comparisonLabel: string) => {
  if (trend === 'flat') {
    return `${comparisonLabel}比 横ばい`;
  }
  return `${comparisonLabel}比 ${label}`;
};

const formatBacklogDelta = (current: number, previous: number) => {
  const delta = current - previous;
  if (delta === 0) return '横ばい';
  return `${delta > 0 ? '+' : ''}${delta}件${delta > 0 ? '増' : '減'}`;
};

const pickTopFocusCategory = (stats: CategoryStats[]) => {
  return stats
    .filter(stat => stat.categoryId !== 'TOTAL' && stat.focusDuration > 0)
    .reduce<CategoryStats | null>((top, stat) => {
      if (!top) return stat;
      return stat.focusDuration > top.focusDuration ? stat : top;
    }, null);
};

const ExecutiveSummary = ({
  rangeLabel,
  granularity,
  comparisonLabel,
  summaryMetrics,
  taskTotals,
  previousTaskTotals,
  categoryStats,
  interruptionStats,
}: ExecutiveSummaryProps) => {
  const focusItem = summaryMetrics.items.find(item => item.key === 'task');
  const interruptItem = summaryMetrics.items.find(item => item.key === 'interrupt');

  const statements: string[] = [];

  if (focusItem) {
    const focusDelta = formatDelta(focusItem.deltaDuration);
    const focusDeltaCopy = describeDelta(focusDelta.label, focusDelta.trend, comparisonLabel);
    const focusSessionsCopy = `${focusItem.totalCount}セッション`;

    const topFocusCategory = pickTopFocusCategory(categoryStats);
    const focusCategoryCopy = topFocusCategory
      ? ` 主な投入先は「${topFocusCategory.categoryName}」(${formatDurationCompact(topFocusCategory.focusDuration)})。`
      : '';

    statements.push(
      `${rangeLabel}の集中時間は${formatDurationCompact(focusItem.totalDuration)}。${focusDeltaCopy}、${focusSessionsCopy}です。${focusCategoryCopy}`.trim(),
    );
  }

  const backlogDeltaCopy = formatBacklogDelta(taskTotals.backlogEnd, previousTaskTotals.backlogEnd);
  const processingRate = taskTotals.newCount > 0 ? Math.round((taskTotals.completedCount / taskTotals.newCount) * 100) : null;
  const throughputCopy = `タスクは新規${taskTotals.newCount}件 / 完了${taskTotals.completedCount}件、未完了は${taskTotals.backlogEnd}件（${backlogDeltaCopy}）。`;
  const processingCopy = processingRate != null ? ` 処理率は${processingRate}%です。` : '';
  statements.push(`${throughputCopy}${processingCopy}`.trim());

  if (interruptItem) {
    const interruptDelta = formatDelta(interruptItem.deltaDuration);
    const interruptDeltaCopy = describeDelta(interruptDelta.label, interruptDelta.trend, comparisonLabel);
    const peakCopy = interruptionStats.peakHourLabel ? `ピークは${interruptionStats.peakHourLabel}。` : '';
    const topContributor = interruptionStats.topContributors[0];
    const contributorCopy = topContributor
      ? `最大の発信源は「${topContributor.label}」(${formatDurationCompact(topContributor.totalDuration)} / ${topContributor.count}件)。`
      : '';

    if (interruptionStats.totalCount > 0) {
      statements.push(
        `割り込みは${interruptionStats.totalCount}件（${formatDurationCompact(interruptionStats.totalDuration)}）。${interruptDeltaCopy}。${peakCopy}${contributorCopy}`.trim(),
      );
    } else {
      statements.push('割り込みの記録はありませんでした。');
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300">主要ポイント</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{rangeLabel}の押さえておきたい出来事</p>
        </div>
        <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{granularity.toUpperCase()}</span>
      </header>
      <ul className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {statements.map((statement, index) => (
          <li key={index} className="flex gap-3">
            <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-rose-400 dark:bg-rose-500" aria-hidden />
            <span>{statement}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ExecutiveSummary;
