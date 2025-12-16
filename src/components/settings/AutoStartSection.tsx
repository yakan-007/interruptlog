'use client';

import { PlusCircle, Zap } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';

export default function AutoStartSection() {
  const { autoStartTask, actions } = useEventsStore();

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          {autoStartTask ? <Zap className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
          追加してすぐ開始
        </h2>
        <button
          onClick={actions.toggleAutoStartTask}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            autoStartTask 
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {autoStartTask ? 'ON' : 'OFF'}
        </button>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        新しいタスクを追加したら、そのまま自動でタスクを開始します。
      </p>
      
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
        <div className="flex items-center gap-3">
          {autoStartTask ? (
            <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          ) : (
            <PlusCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium">
              {autoStartTask ? '追加後自動で開始' : '追加後手動で開始'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {autoStartTask 
                ? 'タスク追加と同時にタイマーが開始されます'
                : 'タスク追加後、手動でスタートボタンを押します'
              }
            </p>
          </div>
        </div>
        <button
          onClick={actions.toggleAutoStartTask}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {autoStartTask ? 'OFFにする' : 'ONにする'}
        </button>
      </div>
    </div>
  );
}
