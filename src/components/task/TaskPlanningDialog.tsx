'use client';

import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MyTask, TaskPlanning } from '@/types';

interface TaskPlanningDialogProps {
  task: MyTask;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { planning?: TaskPlanning | null }) => void;
  onReset: () => void;
}

export default function TaskPlanningDialog({ task, isOpen, onClose, onSave, onReset }: TaskPlanningDialogProps) {
  const [plannedDuration, setPlannedDuration] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');

  const hasExistingPlanning = useMemo(() => {
    const planning = task.planning;
    return Boolean(planning?.plannedDurationMinutes || planning?.dueAt);
  }, [task]);

  useEffect(() => {
    const planning = task.planning;
    setPlannedDuration(planning?.plannedDurationMinutes ? String(planning.plannedDurationMinutes) : '');
    setDueAt(planning?.dueAt ? toDateTimeLocal(planning.dueAt) : '');
  }, [task]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const planning = buildPlanning({ plannedDuration, dueAt });

    onSave({
      planning: planning ?? null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>計画を設定</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            予定時間と期限を登録すると、レポートで差分が見えるようになります。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">予定時間 (分)</label>
              <Input
                type="number"
                min={0}
                value={plannedDuration}
                onChange={event => setPlannedDuration(event.target.value)}
                placeholder="例: 90"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">期限</label>
              <Input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {hasExistingPlanning ? '既存の計画情報を更新できます。' : '必要な場合のみ設定してください。'}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onReset}>
                クリア
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildPlanning({
  plannedDuration,
  dueAt,
}: {
  plannedDuration: string;
  dueAt: string;
}): TaskPlanning | undefined {
  const duration = plannedDuration ? Math.max(Number(plannedDuration), 0) : undefined;
  const parsedDue = dueAt ? new Date(dueAt).getTime() : undefined;
  const normalizedDue = parsedDue && !Number.isNaN(parsedDue) ? parsedDue : undefined;

  const planning: TaskPlanning = {
    plannedDurationMinutes: duration && Number.isFinite(duration) ? duration : undefined,
    dueAt: normalizedDue,
  };

  const hasData = Object.values(planning).some(value => value !== undefined);
  return hasData ? planning : undefined;
}

function toDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
