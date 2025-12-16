import { MyTask, Event, Category } from '@/types';

// Helper to get category ID from task ID (for event category inheritance)
export function getCategoryFromTask(
  taskId: string | undefined, 
  tasks: MyTask[], 
  isCategoryEnabled: boolean
): string | undefined {
  if (!taskId || !isCategoryEnabled) return undefined;
  const task = tasks.find(t => t.id === taskId);
  return task?.categoryId;
}

export function cleanupCategoryReferences(
  categoryId: string,
  tasks: MyTask[],
  events: Event[]
): { updatedTasks: MyTask[]; updatedEvents: Event[] } {
  // Remove category references from tasks
  const updatedTasks = tasks.map(task =>
    task.categoryId === categoryId ? { ...task, categoryId: undefined } : task
  );
  
  // Remove category references from events  
  const updatedEvents = events.map(event =>
    event.categoryId === categoryId ? { ...event, categoryId: undefined } : event
  );
  
  return { updatedTasks, updatedEvents };
}

export function reorderCategories(categories: Category[]): Category[] {
  return categories.map((cat, index) => ({ ...cat, order: index }));
}

export function validateCategoryData(name: string, color: string): boolean {
  return name.trim() !== '' && color.match(/^#[0-9A-F]{6}$/i) !== null;
}