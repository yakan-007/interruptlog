'use client';

import { CompletedTaskSummary } from '@/components/report/types';

interface CompletedTasksListProps {
  tasks: CompletedTaskSummary[];
}

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
};

const CompletedTasksList: React.FC<CompletedTasksListProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        本日完了したタスクはありません。
      </div>
    );
  }

  const sortedTasks = tasks.slice().sort((a, b) => b.totalTimeMs - a.totalTimeMs);

  return (
    <div className="space-y-3">
      {sortedTasks.map(task => (
        <div
          key={task.id}
          className="flex items-center justify-between rounded-lg bg-green-50 p-3 shadow-sm ring-1 ring-inset ring-green-200 dark:bg-green-900/20 dark:ring-green-800"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <span className="font-medium text-green-800 dark:text-green-200">{task.name}</span>
              {task.sessionsCount > 1 && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">({task.sessionsCount}セッション)</span>
              )}
            </div>
          </div>
          <span className="font-mono text-sm text-green-700 dark:text-green-300">{formatDuration(task.totalTimeMs)}</span>
        </div>
      ))}
    </div>
  );
};

export default CompletedTasksList;
