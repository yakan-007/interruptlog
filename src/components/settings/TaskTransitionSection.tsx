'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import TaskTransitionModal from '@/components/TaskTransitionModal';
import useEventsStore from '@/store/useEventsStore';
import { dbGet, dbSet } from '@/lib/db';

interface TaskTransitionConfig {
  autoTransition: boolean;
  lastTransitionDate?: string;
}

const STORAGE_KEY_TASK_TRANSITION = 'task-transition-config';

export default function TaskTransitionSection() {
  const { myTasks, isHydrated } = useEventsStore();
  const [config, setConfig] = useState<TaskTransitionConfig>({
    autoTransition: false,
  });
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  // Load saved config
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await dbGet<TaskTransitionConfig>(STORAGE_KEY_TASK_TRANSITION);
      if (savedConfig) {
        setConfig(savedConfig);
      }
    };
    loadConfig();
  }, []);

  // Check for date change and auto-trigger transition if enabled
  useEffect(() => {
    if (!isHydrated) return;

    const checkDateChange = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      if (config.lastTransitionDate && config.lastTransitionDate !== today) {
        const incompleteTasks = myTasks.filter(task => !task.isCompleted);
        
        if (incompleteTasks.length > 0) {
          if (config.autoTransition) {
            // Auto-transition: mark all incomplete tasks as complete
            incompleteTasks.forEach(task => {
              // In a real implementation, you'd call the action
              // For now, just update the last transition date
            });
          } else {
            // Manual mode: show modal
            setShowTransitionModal(true);
          }
        }
        
        // Update last transition date
        const newConfig = { ...config, lastTransitionDate: today };
        await saveConfig(newConfig);
      } else if (!config.lastTransitionDate) {
        // First time setup
        const newConfig = { ...config, lastTransitionDate: today };
        await saveConfig(newConfig);
      }
    };

    checkDateChange();
  }, [isHydrated, config, myTasks]);

  // Save config
  const saveConfig = async (newConfig: TaskTransitionConfig) => {
    await dbSet(STORAGE_KEY_TASK_TRANSITION, newConfig);
    setConfig(newConfig);
  };

  const handleAutoTransitionToggle = async () => {
    const newConfig = { ...config, autoTransition: !config.autoTransition };
    await saveConfig(newConfig);
  };

  const handleManualTransition = () => {
    setShowTransitionModal(true);
  };

  const incompleteTasks = myTasks.filter(task => !task.isCompleted);

  return (
    <>
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-medium">翌日業務引き継ぎ</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
            <div>
              <div className="font-medium">自動引き継ぎ</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                日付変更時に未完了タスクを自動的に完了済みとしてマーク
              </div>
            </div>
            <Button
              variant={config.autoTransition ? "default" : "outline"}
              size="sm"
              onClick={handleAutoTransitionToggle}
            >
              {config.autoTransition ? "有効" : "無効"}
            </Button>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">現在の状況</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>未完了タスク:</span>
                <span className="font-medium">{incompleteTasks.length}件</span>
              </div>
              {config.lastTransitionDate && (
                <div className="flex justify-between">
                  <span>最終確認日:</span>
                  <span className="font-medium">{config.lastTransitionDate}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleManualTransition}
              disabled={incompleteTasks.length === 0}
              className="w-full"
              variant="outline"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              手動で引き継ぎ設定を行う
            </Button>
            
            {incompleteTasks.length === 0 && (
              <p className="text-xs text-gray-500 text-center">
                現在未完了のタスクはありません
              </p>
            )}
          </div>

          <div className="mt-4 p-3 border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              引き継ぎ設定について
            </h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p>• <strong>自動引き継ぎ有効</strong>: 日付変更時に未完了タスクを自動的に完了済みとしてマーク</p>
              <p>• <strong>自動引き継ぎ無効</strong>: 日付変更時に手動で引き継ぎ設定のモーダルを表示</p>
              <p>• 引き継ぎたいタスクは選択解除することで翌日に持ち越せます</p>
            </div>
          </div>
        </div>
      </div>

      <TaskTransitionModal
        isOpen={showTransitionModal}
        onClose={() => setShowTransitionModal(false)}
        incompleteTasks={incompleteTasks}
      />
    </>
  );
}