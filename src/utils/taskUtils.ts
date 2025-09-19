import { MyTask, Event } from '@/types';
import { getEventsForTask, getTaskTotalDuration, isCompletedEvent } from './eventUtils';

/**
 * タスク関連のユーティリティ関数
 */

// Task State Checks
export function isCompletedTask(task: MyTask): boolean {
  return task.isCompleted === true;
}

export function isActiveTask(task: MyTask): boolean {
  return !task.isCompleted;
}

export function hasCategory(task: MyTask): boolean {
  return !!task.categoryId;
}

// Task Filtering
export function filterActiveTasks(tasks: MyTask[]): MyTask[] {
  return tasks.filter(isActiveTask);
}

export function filterCompletedTasks(tasks: MyTask[]): MyTask[] {
  return tasks.filter(isCompletedTask);
}

export function filterTasksByCategory(tasks: MyTask[], categoryId: string): MyTask[] {
  return tasks.filter(task => task.categoryId === categoryId);
}

export function filterTasksWithoutCategory(tasks: MyTask[]): MyTask[] {
  return tasks.filter(task => !task.categoryId);
}

// Task Analysis
export function getTaskProgress(
  task: MyTask,
  events: Event[]
): {
  totalDuration: number;
  sessionCount: number;
  averageSessionDuration: number;
  lastWorkedOn?: Date;
} {
  const taskEvents = getEventsForTask(events, task.id).filter(isCompletedEvent);
  const totalDuration = getTaskTotalDuration(events, task.id);
  const sessionCount = taskEvents.length;
  const averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;
  
  const lastEvent = taskEvents.sort((a, b) => b.start - a.start)[0];
  const lastWorkedOn = lastEvent ? new Date(lastEvent.start) : undefined;
  
  return {
    totalDuration,
    sessionCount,
    averageSessionDuration,
    lastWorkedOn,
  };
}

export function getTaskStatistics(tasks: MyTask[], events: Event[]) {
  const activeTasks = filterActiveTasks(tasks);
  const completedTasks = filterCompletedTasks(tasks);
  
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  
  const tasksWithTime = tasks.map(task => ({
    task,
    ...getTaskProgress(task, events),
  }));
  
  const totalWorkTime = tasksWithTime.reduce((sum, item) => sum + item.totalDuration, 0);
  const averageTaskDuration = completedTasks.length > 0 
    ? totalWorkTime / completedTasks.length 
    : 0;
  
  return {
    totalTasks,
    activeTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    completionRate,
    totalWorkTime,
    averageTaskDuration,
    tasksWithTime,
  };
}

// Task Ordering
export function sortTasksByOrder(tasks: MyTask[]): MyTask[] {
  return [...tasks].sort((a, b) => a.order - b.order);
}

export function sortTasksByName(tasks: MyTask[], ascending = true): MyTask[] {
  return [...tasks].sort((a, b) => 
    ascending 
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  );
}

export function sortTasksByCreatedDate(tasks: MyTask[], ascending = true): MyTask[] {
  return [...tasks].sort((a, b) => {
    const createdA = a.createdAt || 0;
    const createdB = b.createdAt || 0;
    return ascending ? createdA - createdB : createdB - createdA;
  });
}

export function sortTasksByDuration(tasks: MyTask[], events: Event[], ascending = true): MyTask[] {
  return [...tasks].sort((a, b) => {
    const durationA = getTaskTotalDuration(events, a.id);
    const durationB = getTaskTotalDuration(events, b.id);
    return ascending ? durationA - durationB : durationB - durationA;
  });
}

// Task Creation/Modification
export function createTask(
  name: string,
  categoryId?: string,
  order?: number
): Omit<MyTask, 'id'> {
  return {
    name: name.trim(),
    isCompleted: false,
    order: order || 0,
    categoryId,
    planning: undefined,
    createdAt: Date.now(),
    completedAt: null,
    canceledAt: null,
  };
}

export function updateTaskOrder(tasks: MyTask[], taskId: string, newOrder: number): MyTask[] {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return tasks;
  
  const updatedTasks = [...tasks];
  const [movedTask] = updatedTasks.splice(taskIndex, 1);
  updatedTasks.splice(newOrder, 0, { ...movedTask, order: newOrder });
  
  // Reassign order values
  return updatedTasks.map((task, index) => ({
    ...task,
    order: index,
  }));
}

export function reorderTasks(tasks: MyTask[]): MyTask[] {
  return tasks.map((task, index) => ({
    ...task,
    order: index,
  }));
}

// Task Validation
export function isValidTaskName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 100;
}

export function validateTask(task: Partial<MyTask>): {
  isValid: boolean;
  errors: Partial<Record<keyof MyTask, string>>;
} {
  const errors: Partial<Record<keyof MyTask, string>> = {};
  
  if (!task.name || !isValidTaskName(task.name)) {
    errors.name = 'タスク名は1文字以上100文字以下で入力してください';
  }
  
  if (task.order !== undefined && (task.order < 0 || !Number.isInteger(task.order))) {
    errors.order = '順序は0以上の整数である必要があります';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Task Search/Filter
export function searchTasks(tasks: MyTask[], query: string): MyTask[] {
  if (!query.trim()) return tasks;
  
  const searchQuery = query.toLowerCase().trim();
  return tasks.filter(task => 
    task.name.toLowerCase().includes(searchQuery)
  );
}

export function getTasksByStatus(tasks: MyTask[]) {
  return {
    active: filterActiveTasks(tasks),
    completed: filterCompletedTasks(tasks),
  };
}

// Task Time Management
export function getTasksWorkedOnToday(tasks: MyTask[], events: Event[]): MyTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayEvents = events.filter(event => 
    event.start >= today.getTime() && event.start < tomorrow.getTime()
  );
  
  const taskIdsWorkedOnToday = new Set(
    todayEvents
      .filter(event => event.meta?.myTaskId)
      .map(event => event.meta!.myTaskId!)
  );
  
  return tasks.filter(task => taskIdsWorkedOnToday.has(task.id));
}

export function getIncompleteTasks(tasks: MyTask[]): MyTask[] {
  return filterActiveTasks(tasks);
}

export function getTasksNeedingAttention(
  tasks: MyTask[], 
  events: Event[],
  daysThreshold = 3
): MyTask[] {
  const cutoffDate = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
  
  return filterActiveTasks(tasks).filter(task => {
    const taskEvents = getEventsForTask(events, task.id);
    if (taskEvents.length === 0) return true; // Never worked on
    
    const lastEvent = taskEvents.sort((a, b) => b.start - a.start)[0];
    return lastEvent.start < cutoffDate; // Not worked on recently
  });
}

// Task Dependencies (for future use)
export function canDeleteTask(task: MyTask, events: Event[]): boolean {
  // Check if task has associated events
  const taskEvents = getEventsForTask(events, task.id);
  return taskEvents.length === 0;
}

export function getTaskDependencies(task: MyTask, events: Event[]) {
  const taskEvents = getEventsForTask(events, task.id);
  return {
    hasEvents: taskEvents.length > 0,
    eventCount: taskEvents.length,
    canSafelyDelete: taskEvents.length === 0,
  };
}
