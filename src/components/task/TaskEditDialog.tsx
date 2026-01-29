'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Category, MyTask, TaskPlanning } from '@/types';

interface TaskEditDialogProps {
  task: MyTask | null;
  categories: Category[];
  isCategoryEnabled: boolean;
  planningEnabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { name: string; categoryId?: string; planning?: TaskPlanning | null }) => void;
}

export default function TaskEditDialog({
  task,
  categories,
  isCategoryEnabled,
  planningEnabled,
  isOpen,
  onClose,
  onSave,
}: TaskEditDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('none');
  const [plannedMinutes, setPlannedMinutes] = useState('');
  const [dueAt, setDueAt] = useState('');

  useEffect(() => {
    if (!task) {
      setName('');
      setCategoryId('none');
      setPlannedMinutes('');
      setDueAt('');
      return;
    }
    setName(task.name);
    setCategoryId(task.categoryId ?? 'none');
    setPlannedMinutes(
      task.planning?.plannedDurationMinutes !== undefined && task.planning?.plannedDurationMinutes !== null
        ? String(task.planning.plannedDurationMinutes)
        : ''
    );
    setDueAt(task.planning?.dueAt ? new Date(task.planning.dueAt).toISOString().slice(0, 16) : '');
  }, [task]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canSave = Boolean(task && trimmedName.length > 0);

  const handleSave = () => {
    if (!task) return;
    if (!trimmedName) return;
    const normalizedCategoryId = categoryId === 'none' ? undefined : categoryId;
    const parsedMinutes = Number(plannedMinutes);
    const normalizedMinutes =
      plannedMinutes.trim() === '' || Number.isNaN(parsedMinutes) ? undefined : Math.max(parsedMinutes, 0);
    const parsedDueAt = dueAt ? new Date(dueAt).getTime() : undefined;
    const normalizedDueAt = parsedDueAt && !Number.isNaN(parsedDueAt) ? parsedDueAt : undefined;
    const nextPlanning: TaskPlanning | null | undefined = planningEnabled
      ? (normalizedMinutes !== undefined || normalizedDueAt !== undefined
          ? { plannedDurationMinutes: normalizedMinutes, dueAt: normalizedDueAt }
          : null)
      : undefined;
    onSave({ name: trimmedName, categoryId: normalizedCategoryId, planning: nextPlanning });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>タスクを編集</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            名前とカテゴリを更新できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">名前</label>
            <Input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="タスク名"
              autoFocus
            />
          </div>

          {isCategoryEnabled && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">カテゴリ</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">カテゴリなし</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {planningEnabled && (
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">予定時間 (分)</label>
                  <Input
                    type="number"
                    min={0}
                    value={plannedMinutes}
                    onChange={event => setPlannedMinutes(event.target.value)}
                    placeholder="例: 90"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">期限</label>
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={event => setDueAt(event.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
