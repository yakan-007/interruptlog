'use client';

import { SummaryItem, formatDurationCompact, formatDelta, formatCountDelta } from '@/lib/reportUtils';

interface SummaryCardsProps {
  items: SummaryItem[];
}

const trendColors: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-gray-500 dark:text-gray-400',
};

export default function SummaryCards({ items }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(item => {
        const durationDelta = formatDelta(item.deltaDuration);
        const countDelta = formatCountDelta(item.deltaCount);
        return (
          <div
            key={item.key}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.label}</h3>
              <span className="text-xs text-gray-400">{item.description}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatDurationCompact(item.totalDuration)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">({item.totalCount}件)</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className={`flex items-center gap-1 ${trendColors[durationDelta.trend]}`}>
                <span>{durationDelta.label}</span>
                <span className="text-gray-400 dark:text-gray-500">vs 昨日</span>
              </div>
              <div className={`flex items-center gap-1 ${trendColors[countDelta.trend]}`}>
                <span>{countDelta.label}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
