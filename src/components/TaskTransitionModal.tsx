'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { MyTask } from '@/types';
import useEventsStore from '@/store/useEventsStore';

interface TaskTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  incompleteTasks: MyTask[];
}

export default function TaskTransitionModal({
  isOpen,
  onClose,
  incompleteTasks
}: TaskTransitionModalProps) {
  const { actions } = useEventsStore();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Initialize with all incomplete tasks selected
  useEffect(() => {
    if (isOpen && incompleteTasks.length > 0) {
      setSelectedTasks(new Set(incompleteTasks.map(task => task.id)));
    }
  }, [isOpen, incompleteTasks]);

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleTransition = () => {
    // Mark unselected tasks as completed
    incompleteTasks.forEach(task => {
      if (!selectedTasks.has(task.id)) {
        actions.toggleMyTaskCompletion(task.id);
      }
    });
    
    onClose();
  };

  const handleSelectAll = () => {
    setSelectedTasks(new Set(incompleteTasks.map(task => task.id)));
  };

  const handleSelectNone = () => {
    setSelectedTasks(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            翌日への業務引き継ぎ
          </DialogTitle>
          <DialogDescription>
            未完了のタスクの取り扱いを選択してください。選択したタスクは翌日に引き継がれ、選択しないタスクは完了済みとしてマークされます。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {incompleteTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                すべてのタスクが完了しています！
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                お疲れ様でした。翌日に引き継ぐタスクはありません。
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    未完了タスク: {incompleteTasks.length}件
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    すべて選択
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNone}>
                    すべて解除
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {incompleteTasks.map((task) => {
                  const isSelected = selectedTasks.has(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleTaskToggle(task.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {task.name}
                          </div>
                          {task.categoryId && (
                            <span className="inline-block bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded mt-1">
                              カテゴリ付き
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <ArrowRight className="w-4 h-4" />
                            <span>引き継ぎ</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500">
                            <XCircle className="w-4 h-4" />
                            <span>完了扱い</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between mb-1">
                    <span>翌日に引き継ぐタスク:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {selectedTasks.size}件
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>完了済みとしてマーク:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {incompleteTasks.length - selectedTasks.size}件
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          {incompleteTasks.length > 0 && (
            <Button onClick={handleTransition}>
              設定を適用
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}