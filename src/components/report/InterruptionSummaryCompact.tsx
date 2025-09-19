'use client';

import { InterruptionStats } from '@/lib/reportUtils';
import { formatDuration } from '@/lib/reportUtils';

interface Props {
  stats: InterruptionStats;
}

export default function InterruptionSummaryCompact({ stats }: Props) {
  if (stats.totalCount === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-100/70 bg-amber-50/70 p-5 shadow-sm backdrop-blur-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-200">割り込みの状況</h2>
      <dl className="grid gap-3 text-sm text-amber-900 md:grid-cols-3 dark:text-amber-100">
        <div>
          <dt className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-200">件数</dt>
          <dd className="mt-1 text-base font-semibold">{stats.totalCount} 件</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-200">合計時間</dt>
          <dd className="mt-1 text-base font-semibold">
            {formatDuration(stats.totalDuration)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-200">最も多かった時間帯</dt>
          <dd className="mt-1 text-base font-semibold">
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
      <div className="rounded-lg border border-dashed border-amber-200/80 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:text-amber-200">
        {title}はありません。
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200/80 bg-white/60 p-3 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-200">{title}</p>
      <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-100">
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
