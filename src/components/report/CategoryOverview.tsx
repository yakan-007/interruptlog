'use client';

import type { CategoryStats } from '@/app/report/utils/categoryMetrics';

interface CategoryOverviewProps {
  stats: CategoryStats[];
}

const formatHours = (ms: number) => {
  if (ms <= 0) return '0h';
  const hours = ms / (60 * 60 * 1000);
  return `${hours.toFixed(1)}h`;
};

const CategoryOverview = ({ stats }: CategoryOverviewProps) => {
  if (stats.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg shadow-rose-100/40 backdrop-blur-sm transition dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">カテゴリ別の流入と処理</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">新規・完了・未完了・投入時間をカテゴリ別に集計</p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="w-1/5 pb-2">カテゴリ</th>
              <th className="w-1/5 pb-2">新規</th>
              <th className="w-1/5 pb-2">完了</th>
              <th className="w-1/5 pb-2">未完了</th>
              <th className="w-1/5 pb-2">割り当て時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700">
            {stats.map(stat => (
              <tr key={stat.categoryId ?? 'uncategorized'} className="text-slate-700 dark:text-slate-300">
                <td className="flex items-center gap-2 py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                  {stat.color && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stat.color }} />}
                  {stat.categoryName}
                </td>
                <td className="py-2">{stat.newCount} 件</td>
                <td className="py-2">{stat.completedCount} 件</td>
                <td className="py-2">{stat.activeCount} 件</td>
                <td className="py-2">{formatHours(stat.focusDuration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CategoryOverview;
