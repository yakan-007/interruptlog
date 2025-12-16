'use client';

import type { TaskChangeEntry } from '@/app/report/utils/taskChanges';
import { formatDurationCompact } from '@/lib/reportUtils';

interface TaskDailyChangesProps {
  created: TaskChangeEntry[];
  completed: TaskChangeEntry[];
  label: string;
}

const formatDueDate = (dueAt?: number | null) => {
  if (!dueAt) return '—';
  const date = new Date(dueAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatMinutes = (planned?: number | null) => {
  if (planned == null) return '—';
  return `${planned}分`;
};

const formatFocusDuration = (ms: number) => {
  if (ms <= 0) return '—';
  return formatDurationCompact(ms);
};

const Section = ({ title, items }: { title: string; items: TaskChangeEntry[] }) => (
  <div>
    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{title}</h3>
    {items.length === 0 ? (
      <p className="mt-2 rounded-lg border border-dashed border-slate-200/80 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        該当するタスクはありません。
      </p>
    ) : (
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="w-1/3 pb-2">タスク</th>
              <th className="w-1/6 pb-2">カテゴリ</th>
              <th className="w-1/6 pb-2">予定時間</th>
              <th className="w-1/6 pb-2">期限</th>
              <th className="w-1/6 pb-2">当日投入</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700">
            {items.map(item => (
              <tr key={item.taskId} className="text-slate-700 dark:text-slate-300">
                <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-2">
                    {item.categoryColor && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.categoryColor }}
                      />
                    )}
                    {item.categoryName}
                  </span>
                </td>
                <td className="py-2">{formatMinutes(item.plannedMinutes)}</td>
                <td className="py-2">{formatDueDate(item.dueAt)}</td>
                <td className="py-2">{formatFocusDuration(item.focusDurationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const TaskDailyChanges = ({ created, completed, label }: TaskDailyChangesProps) => (
  <section className="w-full space-y-6 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg shadow-rose-100/40 backdrop-blur-sm transition dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
    <header className="space-y-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}のタスク変化</h2>
      <p className="text-xs text-slate-400 dark:text-slate-500">当日に追加されたタスクと完了したタスクの一覧</p>
    </header>
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="追加されたタスク" items={created} />
      <Section title="完了したタスク" items={completed} />
    </div>
  </section>
);

export default TaskDailyChanges;
