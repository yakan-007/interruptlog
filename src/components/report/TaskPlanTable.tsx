'use client';

interface TaskPlanRow {
  taskName: string;
  plannedMinutes?: number;
  actualMinutes: number;
  dueStatus?: 'danger' | 'warning' | 'neutral';
  dueLabel?: string;
  varianceMinutes?: number;
}

interface TaskPlanTableProps {
  rows: TaskPlanRow[];
}

export default function TaskPlanTable({ rows }: TaskPlanTableProps) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
          主要タスクの状況
        </h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {rows.length} 件
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="w-1/3 pb-2">タスク</th>
              <th className="w-1/5 pb-2">実績</th>
              <th className="w-1/5 pb-2">予定</th>
              <th className="w-1/5 pb-2">差分</th>
              <th className="w-1/5 pb-2">期限</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700">
            {rows.map(row => (
              <tr key={row.taskName} className="text-slate-700 dark:text-slate-300">
                <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{row.taskName}</td>
                <td className="py-3">{Math.round(row.actualMinutes)}分</td>
                <td className="py-3">{row.plannedMinutes ? `${Math.round(row.plannedMinutes)}分` : '—'}</td>
                <td className="py-3">{formatVariance(row.varianceMinutes)}</td>
                <td className="py-3">
                  {row.dueLabel ? (
                    <span className={dueToneClass(row.dueStatus)}>{row.dueLabel}</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatVariance(variance?: number): string {
  if (variance === undefined) return '—';
  const rounded = Math.round(variance);
  if (Math.abs(rounded) < 1) return '±0分';
  return rounded > 0 ? `+${rounded}分` : `${rounded}分`;
}

function dueToneClass(status: TaskPlanRow['dueStatus']): string {
  switch (status) {
    case 'danger':
      return 'rounded-full bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-200';
    case 'warning':
      return 'rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
    default:
      return 'rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }
}
