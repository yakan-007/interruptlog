'use client';

import type { HighlightMetric } from '@/app/report/utils/types';

const TREND_COLORS: Record<HighlightMetric['trend'], string> = {
  up: 'text-rose-500 dark:text-rose-300',
  down: 'text-emerald-600 dark:text-emerald-300',
  flat: 'text-slate-400 dark:text-slate-500',
};

interface HighlightsGridProps {
  metrics: HighlightMetric[];
}

const HighlightsGrid = ({ metrics }: HighlightsGridProps) => {
  if (metrics.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/95 p-6 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        現在の期間で表示できる指標がありません。データ範囲やフィルターを確認してください。
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map(metric => (
        <article
          key={metric.id}
          className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <header className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              {metric.label}
            </p>
            {metric.helper && <span className="text-xs text-slate-400 dark:text-slate-500">{metric.helper}</span>}
          </header>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{metric.value}</span>
          </div>
          <p className={`mt-2 text-xs font-medium ${TREND_COLORS[metric.trend]}`}>{metric.deltaLabel}</p>
        </article>
      ))}
    </section>
  );
};

export default HighlightsGrid;
