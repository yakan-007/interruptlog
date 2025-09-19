'use client';

import { SummaryMetrics } from '@/lib/reportUtils';
import { formatDuration } from '@/lib/reportUtils';

interface DailySummarySectionProps {
  summaryMetrics: SummaryMetrics;
}

export default function DailySummarySection({ summaryMetrics }: DailySummarySectionProps) {
  const task = summaryMetrics.items.find(item => item.key === 'task');
  const interrupt = summaryMetrics.items.find(item => item.key === 'interrupt');
  const breakItem = summaryMetrics.items.find(item => item.key === 'break');

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl border border-rose-100/70 bg-rose-50/70 p-5 shadow-sm backdrop-blur-sm dark:border-rose-500/30 dark:bg-rose-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-200">集中に充てた時間</p>
        <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-100">
          {task ? formatDuration(task.totalDuration) : '0分'}
        </p>
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-200">
          前日比 {task ? diffLabel(task.deltaDuration) : '±0'}・セッション {task?.totalCount ?? 0} 回
        </p>
      </article>
      <article className="rounded-2xl border border-amber-100/70 bg-amber-50/70 p-5 shadow-sm backdrop-blur-sm dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-200">割り込み対応</p>
        <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
          {interrupt ? formatDuration(interrupt.totalDuration) : '0分'}
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-200">
          件数 {interrupt?.totalCount ?? 0} 件・前日比 {interrupt ? diffLabel(interrupt.deltaDuration) : '±0'}
        </p>
      </article>
      <article className="rounded-2xl border border-emerald-100/70 bg-emerald-50/70 p-5 shadow-sm backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-200">休憩</p>
        <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
          {breakItem ? formatDuration(breakItem.totalDuration) : '0分'}
        </p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-200">
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
