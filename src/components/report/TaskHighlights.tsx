'use client';

import { TaskHighlight, formatDurationCompact } from '@/lib/reportUtils';

interface TaskHighlightsProps {
  items: TaskHighlight[];
}

export default function TaskHighlights({ items }: TaskHighlightsProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        選択した日のタスク時間は記録されていません。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">タスクハイライト</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">時間を多く使ったタスクを表示します</p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map(item => (
          <li
            key={item.taskId}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{item.taskName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.sessions}セッション</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {formatDurationCompact(item.totalDuration)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
