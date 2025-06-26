import { Event, MyTask, Category, InterruptCategorySettings } from '@/types';
import { dbGet, dbSet } from '@/lib/db';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Storage keys
export const STORAGE_KEYS = {
  EVENTS: 'events-store',
  MY_TASKS: 'mytasks-store',
  CATEGORIES: 'categories-store',
  CATEGORY_ENABLED: 'category-enabled',
  INTERRUPT_CATEGORY_SETTINGS: 'interrupt-category-settings-store',
  TASK_PLACEMENT_SETTING: 'task-placement-setting',
  AUTO_START_TASK_SETTING: 'auto-start-task-setting',
} as const;

// Helper to sort tasks by order
export const sortMyTasks = (tasks: MyTask[]): MyTask[] => 
  tasks.slice().sort((a, b) => a.order - b.order);

// Helper to re-assign order after add/remove/reorder
export const reassignOrder = (tasks: MyTask[]): MyTask[] => {
  return tasks.map((task, index) => ({ ...task, order: index }));
};

export interface HydratedEventsData {
  events: Event[];
  currentEventId: string | null;
  previousTaskIdBeforeInterrupt: string | null;
}

export interface HydratedTasksData {
  myTasks: MyTask[];
}

export interface HydratedCategoriesData {
  categories: Category[];
  isCategoryEnabled: boolean;
}

export interface HydratedSettingsData {
  interruptCategorySettings: InterruptCategorySettings;
  addTaskToTop: boolean;
  autoStartTask: boolean;
}

export async function hydrateEventsData(): Promise<HydratedEventsData> {
  const storedEventsState = await dbGet<{ 
    events: Event[]; 
    currentEventId: string | null; 
    previousTaskIdBeforeInterrupt?: string | null 
  }>(STORAGE_KEYS.EVENTS);
  
  if (storedEventsState) {
    return {
      events: storedEventsState.events || [],
      currentEventId: storedEventsState.currentEventId,
      previousTaskIdBeforeInterrupt: storedEventsState.previousTaskIdBeforeInterrupt || null,
    };
  }
  
  return {
    events: [],
    currentEventId: null,
    previousTaskIdBeforeInterrupt: null,
  };
}

export async function hydrateTasksData(): Promise<HydratedTasksData> {
  const storedMyTasks = await dbGet<MyTask[]>(STORAGE_KEYS.MY_TASKS);
  
  if (storedMyTasks) {
    const hydratedTasks = storedMyTasks.map((task, index) => ({
      ...task,
      isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
      order: task.order === undefined ? index : task.order,
    }));
    return { myTasks: sortMyTasks(hydratedTasks) };
  }
  
  return { myTasks: [] };
}

export async function hydrateCategoriesData(): Promise<HydratedCategoriesData> {
  const storedCategories = await dbGet<Category[]>(STORAGE_KEYS.CATEGORIES);
  const categoryEnabled = await dbGet<boolean>(STORAGE_KEYS.CATEGORY_ENABLED);
  
  let categories: Category[];
  
  if (storedCategories) {
    categories = storedCategories;
  } else {
    // Create default categories
    const defaultCategories: Category[] = [
      { id: uuidv4(), name: '開発', color: '#3B82F6', order: 0 },
      { id: uuidv4(), name: '会議', color: '#8B5CF6', order: 1 },
      { id: uuidv4(), name: 'レビュー', color: '#10B981', order: 2 },
      { id: uuidv4(), name: 'ドキュメント', color: '#F59E0B', order: 3 },
      { id: uuidv4(), name: 'その他', color: '#6B7280', order: 4 },
    ];
    categories = defaultCategories;
    await dbSet(STORAGE_KEYS.CATEGORIES, defaultCategories);
  }
  
  return {
    categories,
    isCategoryEnabled: categoryEnabled ?? false,
  };
}

export async function hydrateSettingsData(): Promise<HydratedSettingsData> {
  const [
    storedInterruptCategorySettings,
    storedTaskPlacement,
    storedAutoStartTask
  ] = await Promise.all([
    dbGet<InterruptCategorySettings>(STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS),
    dbGet<boolean>(STORAGE_KEYS.TASK_PLACEMENT_SETTING),
    dbGet<boolean>(STORAGE_KEYS.AUTO_START_TASK_SETTING),
  ]);

  let interruptCategorySettings: InterruptCategorySettings;
  
  if (storedInterruptCategorySettings) {
    // Merge with defaults to fill in missing categories
    const mergedSettings = {
      ...DEFAULT_INTERRUPT_CATEGORIES,
      ...storedInterruptCategorySettings
    };
    interruptCategorySettings = mergedSettings;
    // Save updated data
    await dbSet(STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, mergedSettings);
  } else {
    interruptCategorySettings = { ...DEFAULT_INTERRUPT_CATEGORIES };
    await dbSet(STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, DEFAULT_INTERRUPT_CATEGORIES);
  }

  return {
    interruptCategorySettings,
    addTaskToTop: storedTaskPlacement ?? false,
    autoStartTask: storedAutoStartTask ?? false,
  };
}