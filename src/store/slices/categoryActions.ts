import { v4 as uuidv4 } from 'uuid';
import { SliceContext } from './shared';
import { reorderCategories, cleanupCategoryReferences } from '../categoryHelpers';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';
import { MAX_INTERRUPT_DIRECTORY_ENTRIES } from '../constants';

type CategoryActionKeys =
  | 'addCategory'
  | 'updateCategory'
  | 'removeCategory'
  | 'setCategories'
  | 'toggleCategoryEnabled'
  | 'addInterruptContact'
  | 'removeInterruptContact'
  | 'addInterruptSubject'
  | 'removeInterruptSubject'
  | 'updateInterruptCategoryName'
  | 'resetInterruptCategoryToDefault'
  | 'resetAllInterruptCategoriesToDefault';

const normalizeDirectoryValue = (value: string) => value.trim();

export const createCategoryActions = ({
  set,
  get,
  persist,
}: SliceContext): Pick<import('../types').EventsActions, CategoryActionKeys> => {
  const updateDirectoryList = (
    listKey: 'interruptContacts' | 'interruptSubjects',
    updater: (list: string[]) => string[],
  ) => {
    set(state => ({
      ...state,
      [listKey]: updater(state[listKey]),
    }));
    persistInterruptDirectory();
  };

  const addToDirectory = (listKey: 'interruptContacts' | 'interruptSubjects', value: string) => {
    const normalized = normalizeDirectoryValue(value);
    if (!normalized) {
      return;
    }

    updateDirectoryList(listKey, list => {
      const existsIndex = list.findIndex(entry => entry.toLowerCase() === normalized.toLowerCase());
      const filtered = existsIndex >= 0 ? list.filter((_, index) => index !== existsIndex) : list;
      return [normalized, ...filtered].slice(0, MAX_INTERRUPT_DIRECTORY_ENTRIES);
    });
  };

  const removeFromDirectory = (listKey: 'interruptContacts' | 'interruptSubjects', value: string) => {
    updateDirectoryList(listKey, list =>
      list.filter(entry => entry.toLowerCase() !== value.toLowerCase()),
    );
  };

  const {
    persistCategoriesState,
    persistMyTasksState,
    persistEventsState,
    persistInterruptDirectory,
    persistInterruptCategorySettings,
  } = persist;

  return {
    addCategory: (name: string, color: string) => {
      const currentCategories = get().categories;
      const newCategory = {
        id: uuidv4(),
        name: name.trim(),
        color,
        order: currentCategories.length,
      };
      set({ categories: [...currentCategories, newCategory] });
      persistCategoriesState();
    },

    updateCategory: (id: string, name: string, color: string) => {
      const currentCategories = get().categories;
      const updatedCategories = currentCategories.map(cat =>
        cat.id === id ? { ...cat, name: name.trim(), color } : cat,
      );
      set({ categories: updatedCategories });
      persistCategoriesState();
    },

    removeCategory: (id: string) => {
      const { categories: currentCategories, myTasks: currentTasks, events: currentEvents } = get();

      const remainingCategories = currentCategories.filter(cat => cat.id !== id);
      const updatedCategories = reorderCategories(remainingCategories);
      set({ categories: updatedCategories });
      persistCategoriesState();

      const { updatedTasks, updatedEvents } = cleanupCategoryReferences(id, currentTasks, currentEvents);
      set({ myTasks: updatedTasks, events: updatedEvents });
      persistMyTasksState();
      persistEventsState();
    },

    setCategories: (categories) => {
      set({ categories });
      persistCategoriesState();
    },

    toggleCategoryEnabled: () => {
      set({ isCategoryEnabled: !get().isCategoryEnabled });
      persistCategoriesState();
    },

    addInterruptContact: value => addToDirectory('interruptContacts', value),

    removeInterruptContact: value => removeFromDirectory('interruptContacts', value),

    addInterruptSubject: value => addToDirectory('interruptSubjects', value),

    removeInterruptSubject: value => removeFromDirectory('interruptSubjects', value),

    updateInterruptCategoryName: (categoryId, name) => {
      const currentSettings = get().interruptCategorySettings;
      const updatedSettings = {
        ...currentSettings,
        [categoryId]: name.trim() || DEFAULT_INTERRUPT_CATEGORIES[categoryId],
      };
      set({ interruptCategorySettings: updatedSettings });
      persistInterruptCategorySettings();
    },

    resetInterruptCategoryToDefault: (categoryId) => {
      const currentSettings = get().interruptCategorySettings;
      const updatedSettings = {
        ...currentSettings,
        [categoryId]: DEFAULT_INTERRUPT_CATEGORIES[categoryId],
      };
      set({ interruptCategorySettings: updatedSettings });
      persistInterruptCategorySettings();
    },

    resetAllInterruptCategoriesToDefault: () => {
      set({ interruptCategorySettings: { ...DEFAULT_INTERRUPT_CATEGORIES } });
      persistInterruptCategorySettings();
    },
  };
};
