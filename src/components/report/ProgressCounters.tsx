'use client';

import { SummaryMetrics } from '@/lib/reportUtils';

interface ProgressCountersProps {
  summaryMetrics: SummaryMetrics;
  completedTaskCount: number;
  interruptionCount: number;
}

export default function ProgressCounters({ summaryMetrics, completedTaskCount, interruptionCount }: ProgressCountersProps) {
  const taskItem = summaryMetrics.items.find(item => item.key === 'task');

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl border border-sky-100/70 bg-sky-50/70 p-5 text-sm shadow-sm backdrop-blur-sm dark:border-sky-500/30 dark:bg-sky-500/10">
        <p className="text-xs uppercase tracking-wide text-sky-600 dark:text-sky-200">完了したタスク</p>
        <p className="mt-2 text-2xl font-bold text-sky-900 dark:text-sky-100">{completedTaskCount} 件</p>
        <p className="mt-1 text-xs text-sky-600 dark:text-sky-200">本日完了として記録されたタスク数</p>
      </article>
      <article className="rounded-2xl border border-violet-100/70 bg-violet-50/70 p-5 text-sm shadow-sm backdrop-blur-sm dark:border-violet-500/40 dark:bg-violet-500/10">
        <p className="text-xs uppercase tracking-wide text-violet-600 dark:text-violet-200">タスクセッション</p>
        <p className="mt-2 text-2xl font-bold text-violet-900 dark:text-violet-100">{taskItem?.totalCount ?? 0} 回</p>
        <p className="mt-1 text-xs text-violet-600 dark:text-violet-200">タスク開始・再開した回数</p>
      </article>
      <article className="rounded-2xl border border-rose-100/70 bg-rose-50/70 p-5 text-sm shadow-sm backdrop-blur-sm dark:border-rose-500/40 dark:bg-rose-500/10">
        <p className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-200">対応した割り込み</p>
        <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-100">{interruptionCount} 件</p>
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-200">今日処理した割り込みの件数</p>
      </article>
    </section>
  );
}
