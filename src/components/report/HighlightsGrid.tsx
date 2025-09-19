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

const HighlightsGrid = ({ metrics }: HighlightsGridProps) => (
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {metrics.map(metric => (
      <article
        key={metric.id}
        className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-rose-100/40 backdrop-blur-sm transition dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none"
      >
        <header className="flex items-center justify-between">
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

export default HighlightsGrid;
