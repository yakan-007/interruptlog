import { Event, MyTask, Category, InterruptCategorySettings, FeatureFlags, DueAlertSettings, UiSettings } from '@/types';
import { dbGet, dbSet } from '@/lib/db';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Storage keys
export const STORE_STORAGE_KEYS = {
  EVENTS: 'events-store',
  MY_TASKS: 'mytasks-store',
  CATEGORIES: 'categories-store',
  CATEGORY_ENABLED: 'category-enabled',
  INTERRUPT_CATEGORY_SETTINGS: 'interrupt-category-settings-store',
  TASK_PLACEMENT_SETTING: 'task-placement-setting',
  AUTO_START_TASK_SETTING: 'auto-start-task-setting',
  FEATURE_FLAGS_SETTING: 'feature-flags-setting',
  DUE_ALERT_SETTINGS: 'due-alert-settings',
  UI_SETTINGS: 'ui-settings',
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
  featureFlags: FeatureFlags;
  dueAlertSettings: DueAlertSettings;
  uiSettings: UiSettings;
}

export async function hydrateEventsData(): Promise<HydratedEventsData> {
  const storedEventsState = await dbGet<{
    events: Event[];
    currentEventId: string | null;
    previousTaskIdBeforeInterrupt?: string | null;
  }>(STORE_STORAGE_KEYS.EVENTS);

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
  const storedMyTasks = await dbGet<MyTask[]>(STORE_STORAGE_KEYS.MY_TASKS);

  if (storedMyTasks) {
    const hydratedTasks = storedMyTasks.map((task, index) => ({
      ...task,
      isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
      order: task.order === undefined ? index : task.order,
      planning: task.planning || undefined,
    }));
    return { myTasks: sortMyTasks(hydratedTasks) };
  }

  return { myTasks: [] };
}

export async function hydrateCategoriesData(): Promise<HydratedCategoriesData> {
  const storedCategories = await dbGet<Category[]>(STORE_STORAGE_KEYS.CATEGORIES);
  const categoryEnabled = await dbGet<boolean>(STORE_STORAGE_KEYS.CATEGORY_ENABLED);

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
    await dbSet(STORE_STORAGE_KEYS.CATEGORIES, defaultCategories);
  }

  return {
    categories,
    isCategoryEnabled: categoryEnabled ?? false,
  };
}

export async function hydrateSettingsData(): Promise<HydratedSettingsData> {
  const [storedInterruptCategorySettings, storedTaskPlacement, storedAutoStartTask, storedFeatureFlags, storedDueAlertSettings, storedUiSettings] =
    await Promise.all([
      dbGet<InterruptCategorySettings>(STORE_STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS),
      dbGet<boolean>(STORE_STORAGE_KEYS.TASK_PLACEMENT_SETTING),
      dbGet<boolean>(STORE_STORAGE_KEYS.AUTO_START_TASK_SETTING),
      dbGet<FeatureFlags>(STORE_STORAGE_KEYS.FEATURE_FLAGS_SETTING),
      dbGet<DueAlertSettings>(STORE_STORAGE_KEYS.DUE_ALERT_SETTINGS),
      dbGet<UiSettings>(STORE_STORAGE_KEYS.UI_SETTINGS),
    ]);

  let interruptCategorySettings: InterruptCategorySettings;

  if (storedInterruptCategorySettings) {
    const mergedSettings = {
      ...DEFAULT_INTERRUPT_CATEGORIES,
      ...storedInterruptCategorySettings,
    };
    interruptCategorySettings = mergedSettings;
    await dbSet(STORE_STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, mergedSettings);
  } else {
    interruptCategorySettings = { ...DEFAULT_INTERRUPT_CATEGORIES };
    await dbSet(STORE_STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, DEFAULT_INTERRUPT_CATEGORIES);
  }

  const featureFlags: FeatureFlags = {
    enableTaskPlanning: storedFeatureFlags?.enableTaskPlanning ?? false,
  };
  await dbSet(STORE_STORAGE_KEYS.FEATURE_FLAGS_SETTING, featureFlags);

  const dueAlertSettings: DueAlertSettings = storedDueAlertSettings ?? {
    warningMinutes: 6 * 60,
    dangerMinutes: 60,
    preset: 'few-hours',
  };
  await dbSet(STORE_STORAGE_KEYS.DUE_ALERT_SETTINGS, dueAlertSettings);

  const uiSettings: UiSettings = storedUiSettings ?? {
    sortTasksByDueDate: false,
    highlightTimeline: true,
    showCounters: true,
  };
  await dbSet(STORE_STORAGE_KEYS.UI_SETTINGS, uiSettings);

  return {
    interruptCategorySettings,
    addTaskToTop: storedTaskPlacement ?? false,
    autoStartTask: storedAutoStartTask ?? false,
    featureFlags,
    dueAlertSettings,
    uiSettings,
  };
}
