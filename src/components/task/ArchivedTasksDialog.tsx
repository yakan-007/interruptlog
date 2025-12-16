'use client';

import { useMemo, useState } from 'react';
import { ArchivedTask } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ArchivedTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: ArchivedTask[];
  onRestore: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const formatDateTime = (timestamp?: number | null) => {
  if (!timestamp) {
    return '-';
  }
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const downloadCsv = (tasks: ArchivedTask[]) => {
  if (typeof window === 'undefined' || tasks.length === 0) {
    return;
  }

  const header = ['タスク名', 'カテゴリ', '完了日時', 'アーカイブ日時', '予定時間(分)', '期限'];
  const rows = tasks.map(task => [
    `"${task.name.replace(/"/g, '""')}"`,
    `"${task.categoryId ?? ''}"`,
    `"${formatDateTime(task.completedAt)}"`,
    `"${formatDateTime(task.archivedAt)}"`,
    task.planning?.plannedDurationMinutes ?? '',
    task.planning?.dueAt ? formatDateTime(task.planning.dueAt) : '',
  ]);

  const csvContent = [header, ...rows].map(columns => columns.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `archived_tasks_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ArchivedTasksDialog({
  open,
  onOpenChange,
  tasks,
  onRestore,
  onDelete,
}: ArchivedTasksDialogProps) {
  const [query, setQuery] = useState('');

  const filteredTasks = useMemo(() => {
    if (!query.trim()) {
      return tasks;
    }
    const lower = query.trim().toLowerCase();
    return tasks.filter(task => task.name.toLowerCase().includes(lower));
  }, [query, tasks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>アーカイブ済みタスク</DialogTitle>
          <DialogDescription>
            完了したタスクはアーカイブに自動移動します。ここから復元や削除、CSVエクスポートができます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="タスク名で検索"
              className="sm:max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              disabled={tasks.length === 0}
              onClick={() => downloadCsv(tasks)}
            >
              CSVでエクスポート
            </Button>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="text-sm text-slate-500">該当するアーカイブはありません。</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2">タスク名</th>
                    <th className="px-3 py-2">カテゴリ</th>
                    <th className="px-3 py-2">完了日時</th>
                    <th className="px-3 py-2">アーカイブ日時</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{task.name}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {task.categoryId ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{formatDateTime(task.completedAt)}</td>
                      <td className="px-3 py-2 text-slate-500">{formatDateTime(task.archivedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onRestore(task.id)}>
                            復元
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onDelete(task.id)}>
                            削除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
