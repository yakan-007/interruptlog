import { dbSet } from '@/lib/db';
import { TIME_THRESHOLDS } from '@/lib/constants';
import { STORE_STORAGE_KEYS } from './hydrationHelpers';
import { StoreGet } from './types';

export interface PersistenceHelpers {
  persistEventsState: () => void;
  persistMyTasksState: () => void;
  persistMyTasksStateDebounced: () => void;
  persistTaskLedger: () => void;
  persistArchivedTasks: () => void;
  persistCategoriesState: () => void;
  persistInterruptDirectory: () => void;
  persistInterruptCategorySettings: () => void;
  persistFeatureFlags: () => void;
  persistDueAlertSettings: () => void;
  persistUiSettings: () => void;
  persistTaskPlacementSetting: () => void;
  persistAutoStartTaskSetting: () => void;
}

export const createPersistenceHelpers = (get: StoreGet): PersistenceHelpers => {
  let myTasksDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  const persistEventsState = () => {
    const { events, currentEventId, previousTaskIdBeforeInterrupt } = get();
    dbSet(STORE_STORAGE_KEYS.EVENTS, { events, currentEventId, previousTaskIdBeforeInterrupt }).catch(error => {
      console.error('[useEventsStore] Error persisting events state to IndexedDB:', error);
    });
  };

  const persistMyTasksState = () => {
    const { myTasks } = get();
    dbSet(STORE_STORAGE_KEYS.MY_TASKS, myTasks).catch(error => {
      console.error('[useEventsStore] Error persisting myTasks state to IndexedDB:', error);
    });
  };

  const persistMyTasksStateDebounced = () => {
    if (myTasksDebounceTimer) {
      clearTimeout(myTasksDebounceTimer);
    }
    myTasksDebounceTimer = setTimeout(() => {
      const { myTasks } = get();
      dbSet(STORE_STORAGE_KEYS.MY_TASKS, myTasks).catch(error => {
        console.error('[useEventsStore] Error persisting myTasks state to IndexedDB:', error);
      });
    }, TIME_THRESHOLDS.AUTO_SAVE_DEBOUNCE_MS);
  };

  const persistTaskLedger = () => {
    const { taskLedger } = get();
    dbSet(STORE_STORAGE_KEYS.TASK_LEDGER, taskLedger).catch(error => {
      console.error('[useEventsStore] Error persisting task ledger to IndexedDB:', error);
    });
  };

  const persistArchivedTasks = () => {
    const { archivedTasks } = get();
    dbSet(STORE_STORAGE_KEYS.ARCHIVED_TASKS, archivedTasks).catch(error => {
      console.error('[useEventsStore] Error persisting archived tasks to IndexedDB:', error);
    });
  };

  const persistCategoriesState = () => {
    const { categories, isCategoryEnabled } = get();
    dbSet(STORE_STORAGE_KEYS.CATEGORIES, categories).catch(error => {
      console.error('[useEventsStore] Error persisting categories to IndexedDB:', error);
    });
    dbSet(STORE_STORAGE_KEYS.CATEGORY_ENABLED, isCategoryEnabled).catch(error => {
      console.error('[useEventsStore] Error persisting category enabled state to IndexedDB:', error);
    });
  };

  const persistInterruptDirectory = () => {
    const { interruptContacts, interruptSubjects } = get();
    Promise.all([
      dbSet(STORE_STORAGE_KEYS.INTERRUPT_CONTACTS, interruptContacts),
      dbSet(STORE_STORAGE_KEYS.INTERRUPT_REASONS, interruptSubjects),
    ]).catch(error => {
      console.error('[useEventsStore] Error persisting interrupt directory:', error);
    });
  };

  const persistInterruptCategorySettings = () => {
    const { interruptCategorySettings } = get();
    dbSet(STORE_STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, interruptCategorySettings).catch(error => {
      console.error('[useEventsStore] Error persisting interrupt category settings to IndexedDB:', error);
    });
  };

  const persistFeatureFlags = () => {
    const { featureFlags } = get();
    dbSet(STORE_STORAGE_KEYS.FEATURE_FLAGS_SETTING, featureFlags).catch(error => {
      console.error('[useEventsStore] Error persisting feature flags to IndexedDB:', error);
    });
  };

  const persistDueAlertSettings = () => {
    const { dueAlertSettings } = get();
    dbSet(STORE_STORAGE_KEYS.DUE_ALERT_SETTINGS, dueAlertSettings).catch(error => {
      console.error('[useEventsStore] Error persisting due alert settings to IndexedDB:', error);
    });
  };

  const persistUiSettings = () => {
    const { uiSettings } = get();
    dbSet(STORE_STORAGE_KEYS.UI_SETTINGS, uiSettings).catch(error => {
      console.error('[useEventsStore] Error persisting UI settings to IndexedDB:', error);
    });
  };

  const persistTaskPlacementSetting = () => {
    const { addTaskToTop } = get();
    dbSet(STORE_STORAGE_KEYS.TASK_PLACEMENT_SETTING, addTaskToTop).catch(error => {
      console.error('[useEventsStore] Error persisting task placement setting to IndexedDB:', error);
    });
  };

  const persistAutoStartTaskSetting = () => {
    const { autoStartTask } = get();
    dbSet(STORE_STORAGE_KEYS.AUTO_START_TASK_SETTING, autoStartTask).catch(error => {
      console.error('[useEventsStore] Error persisting auto-start task setting to IndexedDB:', error);
    });
  };

  return {
    persistEventsState,
    persistMyTasksState,
    persistMyTasksStateDebounced,
    persistTaskLedger,
    persistArchivedTasks,
    persistCategoriesState,
    persistInterruptDirectory,
    persistInterruptCategorySettings,
    persistFeatureFlags,
    persistDueAlertSettings,
    persistUiSettings,
    persistTaskPlacementSetting,
    persistAutoStartTaskSetting,
  };
};
