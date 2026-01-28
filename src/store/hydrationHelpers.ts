import { Event, MyTask, Category, InterruptCategorySettings, FeatureFlags, DueAlertSettings, UiSettings, TaskLifecycleRecord, ArchivedTask } from '@/types';
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
  INTERRUPT_CONTACTS: 'interrupt-contacts-store',
  INTERRUPT_REASONS: 'interrupt-reasons-store',
  TASK_PLACEMENT_SETTING: 'task-placement-setting',
  AUTO_START_TASK_SETTING: 'auto-start-task-setting',
  FEATURE_FLAGS_SETTING: 'feature-flags-setting',
  PRO_ACCESS: 'pro-access',
  DUE_ALERT_SETTINGS: 'due-alert-settings',
  UI_SETTINGS: 'ui-settings',
  TASK_LEDGER: 'task-ledger',
  ARCHIVED_TASKS: 'archived-tasks',
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
  taskLedger: Record<string, TaskLifecycleRecord>;
  archivedTasks: ArchivedTask[];
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
  proAccess: boolean;
  dueAlertSettings: DueAlertSettings;
  uiSettings: UiSettings;
  interruptContacts: string[];
  interruptSubjects: string[];
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
  const [storedMyTasks, storedLedger, storedArchivedTasks] = await Promise.all([
    dbGet<MyTask[]>(STORE_STORAGE_KEYS.MY_TASKS),
    dbGet<Record<string, TaskLifecycleRecord>>(STORE_STORAGE_KEYS.TASK_LEDGER),
    dbGet<ArchivedTask[]>(STORE_STORAGE_KEYS.ARCHIVED_TASKS),
  ]);

  const ledger: Record<string, TaskLifecycleRecord> = storedLedger ? { ...storedLedger } : {};
  const baseNow = Date.now();
  const archivedTasks: ArchivedTask[] = storedArchivedTasks ? [...storedArchivedTasks] : [];
  const archivedTaskIds = new Set(archivedTasks.map(task => task.id));
  const activeTasks: MyTask[] = [];
  const newlyArchivedTasks: ArchivedTask[] = [];

  if (storedMyTasks) {
    const hydratedTasks = storedMyTasks.map((task, index) => {
      const fallbackTimestamp = baseNow - (storedMyTasks.length - index) * 60_000;
      const createdAt = task.createdAt ?? fallbackTimestamp;
      const completedAt = task.completedAt ?? (task.isCompleted ? createdAt : null);
      const canceledAt = task.canceledAt ?? null;
      const createdCategoryId = task.categoryId ?? null;
      const existingLedger = ledger[task.id];

      const normalizedLedger: TaskLifecycleRecord = {
        id: task.id,
        name: task.name,
        createdAt: existingLedger?.createdAt ?? createdAt,
        createdCategoryId: existingLedger?.createdCategoryId ?? createdCategoryId,
        createdCategoryName: existingLedger?.createdCategoryName,
        createdPlannedMinutes: existingLedger?.createdPlannedMinutes ?? task.planning?.plannedDurationMinutes ?? null,
        createdDueAt: existingLedger?.createdDueAt ?? task.planning?.dueAt ?? null,
        latestCategoryId: existingLedger?.latestCategoryId ?? createdCategoryId,
        latestCategoryName: existingLedger?.latestCategoryName,
        latestPlannedMinutes: existingLedger?.latestPlannedMinutes ?? task.planning?.plannedDurationMinutes ?? null,
        latestDueAt: existingLedger?.latestDueAt ?? task.planning?.dueAt ?? null,
        completedAt: existingLedger?.completedAt ?? completedAt,
        completedCategoryId: existingLedger?.completedCategoryId ?? (completedAt ? createdCategoryId : null),
        completedCategoryName: existingLedger?.completedCategoryName,
        completedPlannedMinutes: existingLedger?.completedPlannedMinutes,
        completedDueAt: existingLedger?.completedDueAt,
        canceledAt: existingLedger?.canceledAt ?? canceledAt,
        canceledCategoryId: existingLedger?.canceledCategoryId ?? (canceledAt ? createdCategoryId : null),
        canceledCategoryName: existingLedger?.canceledCategoryName,
      };

      const normalized: MyTask = {
        ...task,
        isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
        order: task.order === undefined ? index : task.order,
        planning: task.planning || undefined,
        createdAt,
        completedAt,
        canceledAt,
      };

      ledger[task.id] = normalizedLedger;

      return normalized;
    });

    hydratedTasks.forEach(task => {
      if (task.isCompleted) {
        const archivedAt = task.completedAt ?? baseNow;
        if (!archivedTaskIds.has(task.id)) {
          newlyArchivedTasks.push({
            ...task,
            archivedAt,
          });
          archivedTaskIds.add(task.id);
        }
      } else {
        activeTasks.push(task);
      }
    });

    const sortedActiveTasks = sortMyTasks(activeTasks);

    await Promise.all([
      dbSet(STORE_STORAGE_KEYS.MY_TASKS, sortedActiveTasks),
      dbSet(STORE_STORAGE_KEYS.TASK_LEDGER, ledger),
      dbSet(STORE_STORAGE_KEYS.ARCHIVED_TASKS, [...newlyArchivedTasks, ...archivedTasks]),
    ]);

    return {
      myTasks: sortedActiveTasks,
      taskLedger: ledger,
      archivedTasks: [...newlyArchivedTasks, ...archivedTasks],
    };
  }

  await Promise.all([
    dbSet(STORE_STORAGE_KEYS.TASK_LEDGER, ledger),
    dbSet(STORE_STORAGE_KEYS.ARCHIVED_TASKS, archivedTasks),
  ]);

  return { myTasks: [], taskLedger: ledger, archivedTasks };
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
    isCategoryEnabled: categoryEnabled ?? true,
  };
}

export async function hydrateSettingsData(): Promise<HydratedSettingsData> {
  const [
    storedInterruptCategorySettings,
    storedTaskPlacement,
    storedAutoStartTask,
    storedFeatureFlags,
    storedProAccess,
    storedDueAlertSettings,
    storedUiSettings,
    storedInterruptContacts,
    storedInterruptReasons,
  ] = await Promise.all([
    dbGet<InterruptCategorySettings>(STORE_STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS),
    dbGet<boolean>(STORE_STORAGE_KEYS.TASK_PLACEMENT_SETTING),
    dbGet<boolean>(STORE_STORAGE_KEYS.AUTO_START_TASK_SETTING),
    dbGet<FeatureFlags>(STORE_STORAGE_KEYS.FEATURE_FLAGS_SETTING),
    dbGet<boolean>(STORE_STORAGE_KEYS.PRO_ACCESS),
    dbGet<DueAlertSettings>(STORE_STORAGE_KEYS.DUE_ALERT_SETTINGS),
    dbGet<UiSettings>(STORE_STORAGE_KEYS.UI_SETTINGS),
    dbGet<string[]>(STORE_STORAGE_KEYS.INTERRUPT_CONTACTS),
    dbGet<string[]>(STORE_STORAGE_KEYS.INTERRUPT_REASONS),
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
    enableTaskPlanning: storedFeatureFlags?.enableTaskPlanning ?? true,
  };
  await dbSet(STORE_STORAGE_KEYS.FEATURE_FLAGS_SETTING, featureFlags);

  const proAccess = storedProAccess ?? false;
  await dbSet(STORE_STORAGE_KEYS.PRO_ACCESS, proAccess);

  const sanitizeEntries = (values: string[] | undefined | null) =>
    (values ?? [])
      .map(value => value.trim())
      .filter((value, index, array) => value.length > 0 && array.findIndex(candidate => candidate.toLowerCase() === value.toLowerCase()) === index)
      .slice(0, 10);

  const interruptContacts = sanitizeEntries(storedInterruptContacts);
  const interruptSubjects = sanitizeEntries(storedInterruptReasons);

  await Promise.all([
    dbSet(STORE_STORAGE_KEYS.INTERRUPT_CONTACTS, interruptContacts),
    dbSet(STORE_STORAGE_KEYS.INTERRUPT_REASONS, interruptSubjects),
  ]);

  const dueAlertSettings: DueAlertSettings = storedDueAlertSettings ?? {
    warningMinutes: 6 * 60,
    dangerMinutes: 60,
    preset: 'few-hours',
  };
  await dbSet(STORE_STORAGE_KEYS.DUE_ALERT_SETTINGS, dueAlertSettings);

  const uiSettings: UiSettings = {
    sortTasksByDueDate: storedUiSettings?.sortTasksByDueDate ?? false,
  };
  await dbSet(STORE_STORAGE_KEYS.UI_SETTINGS, uiSettings);

  return {
    interruptCategorySettings,
    addTaskToTop: storedTaskPlacement ?? false,
    autoStartTask: storedAutoStartTask ?? false,
    featureFlags,
    proAccess,
    dueAlertSettings,
    uiSettings,
    interruptContacts,
    interruptSubjects,
  };
}
