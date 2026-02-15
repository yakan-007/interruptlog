import { create } from 'zustand';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';
import { EventsState, EventsActions } from './types';
import { createPersistenceHelpers } from './persistence';
import { createEventActions } from './slices/eventActions';
import { createTaskActions } from './slices/taskActions';
import { createCategoryActions } from './slices/categoryActions';
import { createSettingsActions } from './slices/settingsActions';
import { SliceContext } from './slices/shared';

const createInitialState = (): Omit<EventsState, 'actions'> => ({
  events: [],
  currentEventId: null,
  previousTaskIdBeforeInterrupt: null,
  myTasks: [],
  archivedTasks: [],
  taskLedger: {},
  categories: [],
  isCategoryEnabled: true,
  interruptCategorySettings: { ...DEFAULT_INTERRUPT_CATEGORIES },
  interruptContacts: [],
  interruptSubjects: [],
  addTaskToTop: false,
  autoStartTask: false,
  isHydrated: false,
  featureFlags: {
    enableTaskPlanning: true,
  },
  proAccess: false,
  dueAlertSettings: {
    warningMinutes: 6 * 60,
    dangerMinutes: 60,
    preset: 'few-hours',
  },
  uiSettings: {
    sortTasksByDueDate: false,
  },
});

const useEventsStore = create<EventsState>((set, get) => {
  const persist = createPersistenceHelpers(get);
  const initialState = createInitialState();

  const actionsRef: { current: EventsActions } = { current: {} as EventsActions };
  const context: SliceContext = {
    set,
    get,
    persist,
    getActions: () => actionsRef.current,
  };

  const actions: EventsActions = {
    ...createEventActions(context),
    ...createTaskActions(context),
    ...createCategoryActions(context),
    ...createSettingsActions(context),
  };

  actionsRef.current = actions;

  return {
    ...initialState,
    actions,
  };
});

if (typeof window !== 'undefined') {
  (async () => {
    try {
      await useEventsStore.getState().actions.hydrate();
    } catch (error) {
      console.error('[useEventsStore] Error during initial hydration:', error);
    }
  })();
}

export default useEventsStore;
