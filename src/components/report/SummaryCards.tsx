'use client';

import { SummaryItem, formatDurationCompact, formatDelta, formatCountDelta } from '@/lib/reportUtils';

interface SummaryCardsProps {
  items: SummaryItem[];
  comparisonLabel?: string;
}

const trendColors: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  flat: 'text-slate-500 dark:text-slate-400',
};

export default function SummaryCards({ items, comparisonLabel = '昨日' }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(item => {
        const durationDelta = formatDelta(item.deltaDuration);
        const countDelta = formatCountDelta(item.deltaCount);
        return (
          <article
            key={item.key}
            className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">{item.description}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {formatDurationCompact(item.totalDuration)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">({item.totalCount}件)</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className={`flex items-center gap-1 ${trendColors[durationDelta.trend]}`}>
                <span>{durationDelta.label}</span>
                <span className="text-slate-400 dark:text-slate-500">vs {comparisonLabel}</span>
              </div>
              <div className={`flex items-center gap-1 ${trendColors[countDelta.trend]}`}>
                <span>{countDelta.label}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
