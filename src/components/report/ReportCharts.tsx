'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
  Bar,
  BarChart,
} from 'recharts';
import type {
  HeatmapRow,
  HourlyTrendPoint,
  WeeklyActivityPoint,
  TaskMonthlyPoint,
  TaskYearlyPoint,
  TaskWeeklyPoint,
  TaskTotals,
} from '@/app/report/utils/types';
import type { CategorySeriesResult } from '@/app/report/utils/categoryTimeSeries';
import { formatMinutesLabel } from '@/app/report/utils/formatters';

const trendColors = {
  focus: '#38bdf8',
  interrupt: '#f97316',
  break: '#22c55e',
  backlog: '#1f2937',
} as const;

export const DayTrendChart = ({ data }: { data: HourlyTrendPoint[] }) => (
  <section className="w-full rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        時間帯トレンド
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">集中・割り込み・休憩の推移（1時間粒度）</p>
    </header>
    <div className="h-72">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="hourLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={2} />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            tickFormatter={formatMinutesLabel}
            domain={[0, 'auto']}
          />
          <Tooltip formatter={(value: number) => `${Math.round(value)}分`} labelFormatter={label => `${label}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="focusMinutes" name="集中" stroke={trendColors.focus} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="interruptMinutes" name="割り込み" stroke={trendColors.interrupt} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="breakMinutes" name="休憩" stroke={trendColors.break} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const HourlyHeatmap = ({ data }: { data: HeatmapRow[] }) => {
  const allValues = data.flatMap(row => row.values);
  const maxValue = Math.max(...allValues, 0);

  const intensity = (value: number) => {
    if (maxValue <= 0) return 0;
    return value / maxValue;
  };

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            時間帯ヒートマップ（過去7日）
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">濃いほど集中・割り込みが発生</p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[auto,1fr] gap-2 text-[11px]">
          <div className="space-y-2">
            {data.map(row => (
              <div key={row.dayKey} className="flex h-8 items-center justify-end pr-1 text-slate-500 dark:text-slate-400">
                {row.label}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {data.map(row => (
              <div key={row.dayKey} className="grid h-8 grid-cols-24 gap-[2px]">
                {row.values.map((value, index) => {
                  const ratio = intensity(value);
                  const background = ratio === 0 ? 'transparent' : `rgba(59, 130, 246, ${0.12 + ratio * 0.88})`;
                  return (
                    <div
                      key={index}
                      className="rounded-sm"
                      style={{ backgroundColor: background }}
                      title={`${row.label} ${String(index).padStart(2, '0')}:00 → ${Math.round(value)}分`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-24 gap-[2px] text-center text-[10px] text-slate-400 dark:text-slate-500">
          {Array.from({ length: 24 }).map((_, index) => (
            <span key={index}>{index % 3 === 0 ? `${index}` : ''}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export const WeeklyActivityChart = ({ data }: { data: WeeklyActivityPoint[] }) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        曜日別の稼働
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">集中（バー）と割り込み（バー）、集中率（折れ線）</p>
    </header>
    <div className="h-72">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="hours"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            tickFormatter={value => `${value.toFixed(1)}h`}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
            tickFormatter={value => `${value}%`}
          />
          <Tooltip formatter={(value: number, name) => (name === '集中率' ? `${value}%` : `${value.toFixed(1)}時間`)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="hours" dataKey="focusHours" name="集中" fill={trendColors.focus} radius={[8, 8, 8, 8]} />
          <Bar yAxisId="hours" dataKey="interruptHours" name="割り込み" fill={trendColors.interrupt} radius={[8, 8, 8, 8]} />
          <Line yAxisId="rate" type="monotone" dataKey="focusRate" name="集中率" stroke={trendColors.break} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const WeeklyTaskFlowChart = ({ data }: { data: TaskWeeklyPoint[] }) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        日別タスクの増減
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">新規／完了（積み上げ）と未完了残数の推移</p>
    </header>
    <div className="h-72">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="count" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis
            yAxisId="backlog"
            orientation="right"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number, name) =>
              name === '未完了残数' ? `${value} 件` : `${value} 件`
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="count" dataKey="newCount" name="新規" fill="#38bdf8" radius={[6, 6, 0, 0]} />
          <Bar yAxisId="count" dataKey="completedCount" name="完了" fill="#22c55e" radius={[6, 6, 0, 0]} />
          <Line
            yAxisId="backlog"
            type="monotone"
            dataKey="backlogEnd"
            name="未完了残数"
            stroke="#1f2937"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const WeeklyCategoryStackedChart = ({ series }: { series: CategorySeriesResult }) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        カテゴリ別の集中時間
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">1日あたりのカテゴリ別集中時間（Stacked）</p>
    </header>
    <div className="h-80 overflow-x-auto">
      <ResponsiveContainer>
        <BarChart data={series.data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={value => `${value.toFixed(1)}分`} allowDecimals />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}分`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.categories.map(meta => (
            <Bar
              key={meta.id ?? 'uncategorized'}
              dataKey={`values.${meta.id ?? 'uncategorized'}`}
              stackId="category"
              name={meta.name}
              fill={meta.color ?? '#cbd5f5'}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const MonthlyTaskFlowChart = ({ data }: { data: TaskMonthlyPoint[] }) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        日別タスクフロー
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">新規／完了の勢いと未完了数の推移</p>
    </header>
    <div className="h-80">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={Math.max(Math.floor(data.length / 15), 0)} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={value => `${value}件`} allowDecimals={false} />
          <Tooltip formatter={(value: number) => `${value}件`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="newCount" name="新規" fill={trendColors.focus} radius={[6, 6, 0, 0]} />
          <Bar dataKey="completedCount" name="完了" fill={trendColors.break} radius={[6, 6, 0, 0]} />
          <Line type="monotone" dataKey="backlogEnd" name="未完了" stroke={trendColors.backlog} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const YearlyTaskFlowChart = ({ data }: { data: TaskYearlyPoint[] }) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        月別タスクフロー
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">新規／完了と未完了数の年間推移</p>
    </header>
    <div className="h-80">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={value => `${value}件`} allowDecimals={false} />
          <Tooltip formatter={(value: number) => `${value}件`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="newCount" name="新規" fill={trendColors.focus} radius={[6, 6, 0, 0]} />
          <Bar dataKey="completedCount" name="完了" fill={trendColors.break} radius={[6, 6, 0, 0]} />
          <Line type="monotone" dataKey="backlogEnd" name="未完了" stroke={trendColors.backlog} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const TaskAggregateSummary = ({ totals, label }: { totals: TaskTotals; label: string }) => {
  const processingRate = totals.newCount > 0 ? Math.round((totals.completedCount / totals.newCount) * 100) : 0;

  const cards = [
    { title: `${label}新規`, value: `${totals.newCount} 件` },
    { title: `${label}完了`, value: `${totals.completedCount} 件` },
    { title: `${label}未完了`, value: `${totals.backlogEnd} 件` },
    { title: `${label}処理率`, value: `${processingRate}%` },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {cards.map(card => (
        <article
          key={card.title}
          className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{card.title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
        </article>
      ))}
    </section>
  );
};
