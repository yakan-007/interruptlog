import { MyTask, Event, TaskPlanning } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { sortMyTasks } from './hydrationHelpers';

export interface TaskCreationOptions {
  name: string;
  categoryId?: string;
  addToTop: boolean;
  existingTasks: MyTask[];
  planning?: TaskPlanning;
}

export interface TaskCreationResult {
  newTask: MyTask;
  updatedTasks: MyTask[];
}

export function createTaskWithOrdering({
  name,
  categoryId,
  addToTop,
  existingTasks,
  planning,
}: TaskCreationOptions): TaskCreationResult {
  if (!name.trim()) {
    throw new Error('Task name cannot be empty');
  }

  let newOrder: number;
  let updatedTasksWithNewOrder: MyTask[];
  
  if (addToTop) {
    // Add to top: set new task order to 0 and increment others by 1
    newOrder = 0;
    updatedTasksWithNewOrder = existingTasks.map(task => ({
      ...task,
      order: task.order + 1
    }));
  } else {
    // Add to bottom: set order to current max + 1
    newOrder = existingTasks.length;
    updatedTasksWithNewOrder = existingTasks;
  }
  
  const newTask: MyTask = {
    id: uuidv4(),
    name: name.trim(),
    isCompleted: false,
    order: newOrder,
    categoryId: categoryId,
    planning,
    createdAt: Date.now(),
    completedAt: null,
    canceledAt: null,
  };
  
  const updatedTasks = sortMyTasks([...updatedTasksWithNewOrder, newTask]);
  
  return {
    newTask,
    updatedTasks,
  };
}

export interface AutoStartTaskOptions {
  task: MyTask;
  currentEventId: string | null;
  events: Event[];
  startTaskAction: (label: string, taskId: string) => void;
  updateEventAction: (event: Event) => void;
}

export function handleAutoStartTask({
  task,
  currentEventId,
  events,
  startTaskAction,
  updateEventAction,
}: AutoStartTaskOptions): void {
  // Stop current event if running
  if (currentEventId) {
    const currentEvent = events.find(e => e.id === currentEventId);
    if (currentEvent && !currentEvent.end) {
      updateEventAction({ ...currentEvent, end: Date.now() });
    }
  }
  
  // Start new task
  startTaskAction(task.name, task.id);
}

export function reorderTasks(
  tasks: MyTask[],
  taskId: string,
  newOrder: number
): MyTask[] {
  const taskToMove = tasks.find(t => t.id === taskId);
  if (!taskToMove) {
    throw new Error('Task not found');
  }

  const remainingTasks = tasks.filter(t => t.id !== taskId);
  remainingTasks.splice(newOrder, 0, taskToMove);
  
  // Reassign orders
  return remainingTasks.map((task, index) => ({ ...task, order: index }));
}

export function removeTaskAndReorder(
  tasks: MyTask[],
  taskId: string
): MyTask[] {
  const remainingTasks = tasks.filter(task => task.id !== taskId);
  return sortMyTasks(remainingTasks).map((task, index) => ({ ...task, order: index }));
}
