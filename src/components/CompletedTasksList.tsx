'use client';

import { } from 'react';
import { MyTask, Event } from '@/types';

interface CompletedTasksListProps {
  completedTasks: MyTask[];
  events: Event[];
}

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

const CompletedTasksList: React.FC<CompletedTasksListProps> = ({ completedTasks, events }) => {
  if (completedTasks.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        本日完了したタスクはありません。
      </div>
    );
  }

  // Calculate total time spent on each completed task
  const tasksWithTime = completedTasks.map(task => {
    const taskEvents = events.filter(event => 
      event.type === 'task' && 
      event.meta?.myTaskId === task.id && 
      event.end
    );
    
    const totalTime = taskEvents.reduce((sum, event) => 
      sum + (event.end! - event.start), 0
    );

    return {
      ...task,
      totalTime,
      sessionsCount: taskEvents.length
    };
  });

  return (
    <div className="space-y-3">
      {tasksWithTime.map((task) => (
        <div 
          key={task.id} 
          className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 p-3 shadow-sm border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <span className="font-medium text-green-800 dark:text-green-200">
                {task.name}
              </span>
              {task.sessionsCount > 1 && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ({task.sessionsCount}セッション)
                </span>
              )}
            </div>
          </div>
          <span className="font-mono text-sm text-green-700 dark:text-green-300">
            {formatDuration(task.totalTime)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CompletedTasksList;