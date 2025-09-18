'use client';

import { WeeklyTrendDatum } from '@/lib/reportBuilder';

interface WeeklyFocusChartProps {
  data: WeeklyTrendDatum[];
}

export default function WeeklyFocusChart({ data }: WeeklyFocusChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(
    ...data.map(item => Math.max(item.focusMinutes, item.interruptMinutes)),
    1,
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">週間トレンド</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">集中時間と割り込み時間の推移</p>
      </header>
      <div className="flex items-end gap-2">
        {data.map(item => (
          <div key={item.dateKey} className="flex-1">
            <div className="relative h-32 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
              <div
                className="absolute bottom-0 left-0 right-0 bg-blue-500/80 dark:bg-blue-400/80"
                style={{ height: `${(item.focusMinutes / maxValue) * 100}%` }}
                title={`集中 ${Math.round(item.focusMinutes)}分`}
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-red-400/80 dark:bg-red-500/80"
                style={{ height: `${(item.interruptMinutes / maxValue) * 100}%` }}
                title={`割り込み ${Math.round(item.interruptMinutes)}分`}
              />
            </div>
            <div className="mt-2 text-center text-[11px] text-gray-600 dark:text-gray-400">
              <div className="font-medium">{formatShortDate(item.dateKey)}</div>
              <div>{weekdayLabel(item.dateKey)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-blue-500/80" />集中
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-red-400/80" />割り込み
        </span>
      </div>
    </section>
  );
}

function weekdayLabel(dateKey: string): string {
  const weekday = new Date(dateKey + 'T00:00:00').getDay();
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  return labels[weekday];
}

function formatShortDate(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
