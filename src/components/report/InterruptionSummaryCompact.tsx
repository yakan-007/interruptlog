'use client';

import { InterruptionStats } from '@/lib/reportUtils';
import { formatDuration } from '@/lib/reportUtils';

interface Props {
  stats: InterruptionStats;
}

export default function InterruptionSummaryCompact({ stats }: Props) {
  if (stats.totalCount === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">割り込みの状況</h2>
      <dl className="grid gap-3 md:grid-cols-3 text-sm text-gray-700 dark:text-gray-300">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">件数</dt>
          <dd className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-50">{stats.totalCount} 件</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">合計時間</dt>
          <dd className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-50">
            {formatDuration(stats.totalDuration)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">最も多かった時間帯</dt>
          <dd className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-50">
            {stats.peakHourLabel ?? '—'}
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <TopList title="主な要因" items={stats.topContributors} />
        <TopList title="主な種類" items={stats.topTypes} />
      </div>
    </section>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: { label: string; totalDuration: number; count: number }[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {title}はありません。
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
        {items.map(item => (
          <li key={item.label} className="flex justify-between">
            <span>{item.label}</span>
            <span>
              {item.count}件 / {Math.round(item.totalDuration / 60000)}分
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
