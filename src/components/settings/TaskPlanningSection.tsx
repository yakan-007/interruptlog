'use client';

import { CalendarClock, CalendarX2 } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';

export default function TaskPlanningSection() {
  const { featureFlags, actions } = useEventsStore();
  const planningEnabled = featureFlags.enableTaskPlanning;

  const handleToggle = () => {
    actions.toggleFeatureFlag('enableTaskPlanning');
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          {planningEnabled ? (
            <CalendarClock className="h-5 w-5" />
          ) : (
            <CalendarX2 className="h-5 w-5" />
          )}
          予定時間と期限の入力
        </h2>
        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            planningEnabled
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {planningEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        タスク作成時やカードの詳細から予定時間と期限を入力できるようにします。レポートでは期日順ソートやタスク変化の期限列に反映されます。
      </p>
      <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {planningEnabled
            ? '入力欄（予定時間・期限）がマイタスク画面とタスク編集ダイアログに表示されます。'
            : '期限と予定時間の入力を使わない場合は OFF にすると入力欄が非表示になります。'}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="self-start rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 sm:self-auto"
        >
          {planningEnabled ? 'OFFにする' : 'ONにする'}
        </button>
      </div>
    </div>
  );
}
