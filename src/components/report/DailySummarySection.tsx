'use client';

import { SummaryMetrics } from '@/lib/reportUtils';
import { formatDuration } from '@/lib/reportUtils';

interface DailySummarySectionProps {
  summaryMetrics: SummaryMetrics;
}

const CARD_CLASSES =
  'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900';

export default function DailySummarySection({ summaryMetrics }: DailySummarySectionProps) {
  const task = summaryMetrics.items.find(item => item.key === 'task');
  const interrupt = summaryMetrics.items.find(item => item.key === 'interrupt');
  const breakItem = summaryMetrics.items.find(item => item.key === 'break');

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className={CARD_CLASSES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">集中に充てた時間</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          {task ? formatDuration(task.totalDuration) : '0分'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          前日比 {task ? diffLabel(task.deltaDuration) : '±0'}・セッション {task?.totalCount ?? 0} 回
        </p>
      </article>
      <article className={CARD_CLASSES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">割り込み対応</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          {interrupt ? formatDuration(interrupt.totalDuration) : '0分'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          件数 {interrupt?.totalCount ?? 0} 件・前日比 {interrupt ? diffLabel(interrupt.deltaDuration) : '±0'}
        </p>
      </article>
      <article className={CARD_CLASSES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">休憩</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          {breakItem ? formatDuration(breakItem.totalDuration) : '0分'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          前日比 {breakItem ? diffLabel(breakItem.deltaDuration) : '±0'}
        </p>
      </article>
    </section>
  );
}

function diffLabel(delta: number): string {
  if (Math.abs(delta) < 60000) return '±0分';
  const minutes = Math.round(delta / 60000);
  return minutes > 0 ? `+${minutes}分` : `${minutes}分`;
}
