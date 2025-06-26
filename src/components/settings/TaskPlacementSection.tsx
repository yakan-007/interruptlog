'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';

export default function TaskPlacementSection() {
  const { addTaskToTop, actions } = useEventsStore();

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          {addTaskToTop ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
          新規タスクの追加位置
        </h2>
        <button
          onClick={actions.toggleTaskPlacement}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            addTaskToTop 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {addTaskToTop ? '上に追加' : '下に追加'}
        </button>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        新しいタスクをリストの上と下のどちらに追加するかを選択できます。
      </p>
      
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
        <div className="flex items-center gap-3">
          {addTaskToTop ? (
            <ArrowUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <ArrowDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium">
              {addTaskToTop ? 'リストの上に追加' : 'リストの下に追加'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {addTaskToTop 
                ? '新しいタスクが一番上に表示されます'
                : '新しいタスクが一番下に表示されます'
              }
            </p>
          </div>
        </div>
        <button
          onClick={actions.toggleTaskPlacement}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          切り替え
        </button>
      </div>
    </div>
  );
}