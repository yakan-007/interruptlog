'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Category, MyTask } from '@/types';

interface TaskEditDialogProps {
  task: MyTask | null;
  categories: Category[];
  isCategoryEnabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { name: string; categoryId?: string }) => void;
}

export default function TaskEditDialog({
  task,
  categories,
  isCategoryEnabled,
  isOpen,
  onClose,
  onSave,
}: TaskEditDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('none');

  useEffect(() => {
    if (!task) {
      setName('');
      setCategoryId('none');
      return;
    }
    setName(task.name);
    setCategoryId(task.categoryId ?? 'none');
  }, [task]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canSave = Boolean(task && trimmedName.length > 0);

  const handleSave = () => {
    if (!task) return;
    if (!trimmedName) return;
    const normalizedCategoryId = categoryId === 'none' ? undefined : categoryId;
    onSave({ name: trimmedName, categoryId: normalizedCategoryId });
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
