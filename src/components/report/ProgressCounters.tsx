'use client';

import { SummaryMetrics } from '@/lib/reportUtils';

interface ProgressCountersProps {
  summaryMetrics: SummaryMetrics;
  completedTaskCount: number;
  interruptionCount: number;
}

const CARD_CLASSES =
  'rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900';

export default function ProgressCounters({ summaryMetrics, completedTaskCount, interruptionCount }: ProgressCountersProps) {
  const taskItem = summaryMetrics.items.find(item => item.key === 'task');

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className={CARD_CLASSES}>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">完了したタスク</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{completedTaskCount} 件</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">本日完了として記録されたタスク数</p>
      </article>
      <article className={CARD_CLASSES}>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">タスクセッション</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{taskItem?.totalCount ?? 0} 回</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">タスク開始・再開した回数</p>
      </article>
      <article className={CARD_CLASSES}>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">対応した割り込み</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{interruptionCount} 件</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">今日処理した割り込みの件数</p>
      </article>
    </section>
  );
}
