'use client';

import { ArrowUp, ArrowDown, CalendarClock } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';

export default function TaskPlacementSection() {
  const { addTaskToTop, uiSettings, actions } = useEventsStore(state => ({
    addTaskToTop: state.addTaskToTop,
    uiSettings: state.uiSettings,
    actions: state.actions,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            {addTaskToTop ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
            新規タスクの追加位置
          </h2>
          <button
            onClick={actions.toggleTaskPlacement}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              addTaskToTop
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {addTaskToTop ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          新しいタスクをリストの上と下のどちらに追加するかを選択できます。
        </p>
        <div className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
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
                  : '新しいタスクが一番下に表示されます'}
              </p>
            </div>
          </div>
          <button
            onClick={actions.toggleTaskPlacement}
            className="rounded-md bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
          >
            {addTaskToTop ? 'OFFにする' : 'ONにする'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <CalendarClock className="h-5 w-5" />
            納期が近い順に並べ替える
          </h2>
          <button
            onClick={actions.toggleSortTasksByDueDate}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              uiSettings.sortTasksByDueDate
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {uiSettings.sortTasksByDueDate ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          納期が設定されているタスクを期限が近い順に自動で並べ替えます。納期が未設定のタスクは従来の並び順を維持します。
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          納期優先モードではドラッグで並べ替えできません。手動で順番を調整したい場合はモードをオフにしてください。
        </p>
      </div>
    </div>
  );
}
