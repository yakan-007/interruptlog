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
    <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">週間トレンド</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">集中時間と割り込み時間の推移</p>
      </header>
      <div className="flex items-end gap-3">
        {data.map(item => (
          <div key={item.dateKey} className="flex-1">
            <div className="relative h-32 w-full overflow-hidden rounded-xl bg-slate-100/80 dark:bg-slate-800">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-500/80 via-sky-400/80 to-sky-300/70 dark:from-sky-400/80 dark:via-sky-500/60"
                style={{ height: `${(item.focusMinutes / maxValue) * 100}%` }}
                title={`集中 ${Math.round(item.focusMinutes)}分`}
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rose-400/80 via-rose-300/70 to-rose-200/60 dark:from-rose-500/80 dark:via-rose-400/60"
                style={{ height: `${(item.interruptMinutes / maxValue) * 100}%` }}
                title={`割り込み ${Math.round(item.interruptMinutes)}分`}
              />
            </div>
            <div className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-200">{formatShortDate(item.dateKey)}</div>
              <div>{weekdayLabel(item.dateKey)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-4 text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-sky-400" />集中
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-rose-400" />割り込み
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
