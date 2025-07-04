import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Event, MyTask, Category, InterruptCategorySettings } from '@/types';
import { dbGet, dbSet } from '@/lib/db';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';
import { 
  hydrateEventsData, 
  hydrateTasksData, 
  hydrateCategoriesData, 
  hydrateSettingsData,
  STORAGE_KEYS,
  sortMyTasks 
} from './hydrationHelpers';
import { 
  createTaskWithOrdering, 
  handleAutoStartTask, 
  reorderTasks, 
  removeTaskAndReorder 
} from './taskHelpers';
import { 
  updateEventWithTimeChange, 
  insertEventWithGap 
} from './eventHelpers';
import { 
  getCategoryFromTask, 
  cleanupCategoryReferences, 
  reorderCategories 
} from './categoryHelpers';

export interface EventsState {
  events: Event[];
  currentEventId: string | null;
  previousTaskIdBeforeInterrupt: string | null;
  myTasks: MyTask[];
  categories: Category[];
  isCategoryEnabled: boolean;
  interruptCategorySettings: InterruptCategorySettings;
  addTaskToTop: boolean; // true: 上に追加, false: 下に追加
  autoStartTask: boolean; // true: タスク追加後即座開始, false: 手動で開始
  isHydrated: boolean;
  actions: {
    startTask: (label?: string, myTaskId?: string) => void;
    stopCurrentEvent: () => void;
    startInterrupt: (data?: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => void;
    updateInterruptDetails: (data: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => void;
    stopInterruptAndResumePreviousTask: () => void;
    startBreak: (data: { label?: string; breakType?: Event['breakType']; breakDurationMinutes?: Event['breakDurationMinutes'] }) => void;
    addEvent: (event: Event) => void;
    updateEvent: (event: Event) => void;
    setEvents: (events: Event[]) => void;
    setCurrentEventId: (id: string | null) => void;
    addMyTask: (name: string, categoryId?: string) => void;
    removeMyTask: (id: string) => void;
    updateMyTask: (id: string, newName: string) => void;
    updateMyTaskCategory: (id: string, categoryId: string | undefined) => void;
    setMyTasks: (tasks: MyTask[]) => void;
    hydrate: () => Promise<void>;
    toggleMyTaskCompletion: (taskId: string) => void;
    reorderMyTasks: (taskId: string, newOrder: number) => void;
    getTaskTotalDuration: (taskId: string) => number;
    cancelCurrentInterruptAndResumeTask: () => void;
    _persistEventsState: () => void;
    _persistMyTasksState: () => void;
    _persistCategoriesState: () => void;
    stopBreakAndResumePreviousTask: () => void;
    addCategory: (name: string, color: string) => void;
    updateCategory: (id: string, name: string, color: string) => void;
    removeCategory: (id: string) => void;
    setCategories: (categories: Category[]) => void;
    toggleCategoryEnabled: () => void;
    updateEventEndTime: (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string) => void;
    updateInterruptCategoryName: (categoryId: keyof InterruptCategorySettings, name: string) => void;
    resetInterruptCategoryToDefault: (categoryId: keyof InterruptCategorySettings) => void;
    resetAllInterruptCategoriesToDefault: () => void;
    _persistInterruptCategorySettings: () => void;
    toggleTaskPlacement: () => void;
    _persistTaskPlacementSetting: () => void;
    toggleAutoStartTask: () => void;
    _persistAutoStartTaskSetting: () => void;
  };
}

const storeCreator: StateCreator<EventsState, [], []> = (set, get) => ({
  events: [],
  currentEventId: null,
  previousTaskIdBeforeInterrupt: null,
  myTasks: [],
  categories: [],
  isCategoryEnabled: false,
  interruptCategorySettings: {
    category1: 'ミーティング',
    category2: '電話',
    category3: '質問',
    category4: '訪問',
    category5: 'チャット',
    category6: 'その他'
  },
  addTaskToTop: false, // デフォルトは下に追加
  autoStartTask: false, // デフォルトは手動開始
  isHydrated: false,
  actions: {
    hydrate: async () => {
      if (get().isHydrated || (typeof window !== 'undefined' && (window as any).__eventStoreHydrating)) {
        return;
      }
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = true;
      }

      if (typeof window === 'undefined') {
        set({ isHydrated: true });
        if (typeof window !== 'undefined') {
          (window as any).__eventStoreHydrating = false; 
        }
        return;
      }

      try {
        const [eventsData, tasksData, categoriesData, settingsData] = await Promise.all([
          hydrateEventsData(),
          hydrateTasksData(),
          hydrateCategoriesData(),
          hydrateSettingsData(),
        ]);

        set({
          ...eventsData,
          ...tasksData,
          ...categoriesData,
          ...settingsData,
        });
      } catch (error) {
        console.error('[useEventsStore] Failed to hydrate from IndexedDB:', error);
        set({ 
          events: [], 
          currentEventId: null, 
          previousTaskIdBeforeInterrupt: null, 
          myTasks: [], 
          categories: [],
          isCategoryEnabled: false,
          interruptCategorySettings: { ...DEFAULT_INTERRUPT_CATEGORIES }, 
          addTaskToTop: false, 
          autoStartTask: false, 
          isHydrated: false 
        });
      }

      set({ isHydrated: true });
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = false;
      }
    },
    startTask: (label?: string, myTaskId?: string) => {
      const { myTasks, isCategoryEnabled } = get();
      const currentRunningEvent = get().events.find(e => e.id === get().currentEventId);
      if (currentRunningEvent && !currentRunningEvent.end) {
        get().actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }
      set({ previousTaskIdBeforeInterrupt: null });
      
      // カテゴリの継承
      const categoryId = getCategoryFromTask(myTaskId, myTasks, isCategoryEnabled);
      
      const newEvent: Event = {
        id: uuidv4(),
        type: 'task',
        label,
        start: Date.now(),
        categoryId,
        meta: myTaskId ? { myTaskId } : undefined,
      };
      get().actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });

      if (myTaskId) {
        const taskToStart = get().myTasks.find(t => t.id === myTaskId);
        if (taskToStart && taskToStart.isCompleted) {
          get().actions.toggleMyTaskCompletion(myTaskId);
        }
      }
    },
    stopCurrentEvent: () => {
      const { events, currentEventId } = get();
      if (currentEventId) {
        const eventToEnd = events.find(e => e.id === currentEventId);
        if (eventToEnd && !eventToEnd.end) {
          get().actions.updateEvent({ ...eventToEnd, end: Date.now() });
        }
      }
      set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
    },
    startInterrupt: (data?: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => {
      const { events, currentEventId } = get();
      let previousActiveEventId: string | null = null;

      const currentRunningEvent = events.find(e => e.id === currentEventId);
      if (currentRunningEvent && !currentRunningEvent.end) {
        if (currentRunningEvent.type === 'task') {
           previousActiveEventId = currentRunningEvent.id;
        }
        get().actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }
      
      set({ previousTaskIdBeforeInterrupt: previousActiveEventId });

      const newEvent: Event = {
        id: uuidv4(),
        type: 'interrupt',
        label: data?.label || 'Interrupt', 
        start: Date.now(),
        categoryId: undefined, // 割り込みは初期状態ではカテゴリなし（編集で設定可能）
        who: data?.who,
        interruptType: data?.interruptType,
        urgency: data?.urgency,
      };
      get().actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },
    updateInterruptDetails: (data: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => {
      const { events, currentEventId } = get();
      if (currentEventId) {
        const interruptEvent = events.find(e => e.id === currentEventId && e.type === 'interrupt' && !e.end);
        if (interruptEvent) {
          const updatedEvent = {
            ...interruptEvent,
            label: data.label || interruptEvent.label, 
            who: data.who !== undefined ? data.who : interruptEvent.who,
            interruptType: data.interruptType !== undefined ? data.interruptType : interruptEvent.interruptType,
            urgency: data.urgency !== undefined ? data.urgency : interruptEvent.urgency,
          };
          get().actions.updateEvent(updatedEvent);
        } else {
          console.warn('[useEventsStore] updateInterruptDetails: No active interrupt event found to update.');
        }
      }
    },
    stopInterruptAndResumePreviousTask: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt } = get();
      
      if (currentEventId) {
        const interruptToEnd = events.find(e => e.id === currentEventId && e.type === 'interrupt');
        if (interruptToEnd && !interruptToEnd.end) {
          get().actions.updateEvent({ ...interruptToEnd, end: Date.now() });
        }
      }

      if (previousTaskIdBeforeInterrupt) {
        const taskEventToResume = events.find(e => e.id === previousTaskIdBeforeInterrupt && e.type === 'task');
        if (taskEventToResume) {
          const myTaskDetails = get().myTasks.find(mt => mt.id === taskEventToResume.meta?.myTaskId);
          
          const newResumedTaskEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: taskEventToResume.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            meta: taskEventToResume.meta,
          };
          get().actions.addEvent(newResumedTaskEvent);
          set({ currentEventId: newResumedTaskEvent.id, previousTaskIdBeforeInterrupt: null });
        } else {
           console.warn('[useEventsStore] stopInterruptAndResumePreviousTask: Previous task event not found.');
           set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
    },
    startBreak: (data: { label?: string; breakType?: Event['breakType']; breakDurationMinutes?: Event['breakDurationMinutes'] }) => {
      const { currentEventId, events } = get();
      const currentRunningEvent = events.find(e => e.id === currentEventId);

      if (currentRunningEvent && !currentRunningEvent.end) {
        if (currentRunningEvent.type === 'task') {
          set({ previousTaskIdBeforeInterrupt: currentEventId });
        }
        get().actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }

      const newEvent: Event = {
        id: uuidv4(),
        type: 'break',
        label: data.label || 'Break',
        start: Date.now(),
        categoryId: undefined, // 休憩は初期状態ではカテゴリなし（編集で設定可能）
        breakType: data.breakType,
        breakDurationMinutes: data.breakDurationMinutes,
      };
      get().actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },
    stopBreakAndResumePreviousTask: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks, isCategoryEnabled } = get();
      if (currentEventId) {
        const breakEvt = events.find(e => e.id === currentEventId && e.type === 'break');
        if (breakEvt && !breakEvt.end) {
          get().actions.updateEvent({ ...breakEvt, end: Date.now() });
        }
      }
      if (previousTaskIdBeforeInterrupt) {
        const prevTaskEvt = events.find(e => e.id === previousTaskIdBeforeInterrupt && e.type === 'task');
        if (prevTaskEvt) {
          const myTaskDetails = myTasks.find(mt => mt.id === prevTaskEvt.meta?.myTaskId);
          // カテゴリの継承（前のタスクのカテゴリまたは元のタスクから）
          const categoryId = prevTaskEvt.categoryId || getCategoryFromTask(prevTaskEvt.meta?.myTaskId, myTasks, isCategoryEnabled);
          
          const resumedEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: prevTaskEvt.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            categoryId,
            meta: prevTaskEvt.meta,
          };
          get().actions.addEvent(resumedEvent);
          set({ currentEventId: resumedEvent.id, previousTaskIdBeforeInterrupt: null });
        } else {
          set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
      get().actions._persistEventsState();
    },
    _persistEventsState: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt } = get();
      dbSet(STORAGE_KEYS.EVENTS, { events, currentEventId, previousTaskIdBeforeInterrupt }).catch(error => {
        console.error('[useEventsStore] Error persisting events state to IndexedDB:', error);
      });
    },
    _persistMyTasksState: () => {
      const { myTasks } = get();
      dbSet(STORAGE_KEYS.MY_TASKS, myTasks).catch(error => {
        console.error('[useEventsStore] Error persisting myTasks state to IndexedDB:', error);
      });
    },
    addEvent: (event: Event) => {
      set((state: EventsState) => ({ events: [...state.events, event] }));
      get().actions._persistEventsState();
    },
    updateEvent: (eventToUpdate: Event) => {
      set((state: EventsState) => ({
        events: state.events.map((e: Event) => (e.id === eventToUpdate.id ? eventToUpdate : e)),
      }));
      get().actions._persistEventsState();
    },
    updateEventEndTime: (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string) => {
      const { events } = get();
      const eventIndex = events.findIndex(e => e.id === eventId);
      const event = events[eventIndex];
      
      if (!event) {
        console.error('[useEventsStore] Event not found');
        return;
      }
      
      try {
        const { updatedEvent, gapEvent, shouldCreateGap } = updateEventWithTimeChange(
          event,
          newEndTime,
          gapActivityName,
          newEventType,
          newLabel,
          newCategoryId
        );
        
        if (shouldCreateGap && gapEvent) {
          const newEvents = insertEventWithGap(events, eventIndex, updatedEvent, gapEvent);
          set({ events: newEvents });
        } else {
          get().actions.updateEvent(updatedEvent);
        }
        
        get().actions._persistEventsState();
      } catch (error) {
        console.error('[useEventsStore] Error updating event end time:', error);
      }
    },
    setEvents: (events: Event[]) => {
      set({ events });
      get().actions._persistEventsState();
    },
    setCurrentEventId: (id: string | null) => {
      set({ currentEventId: id });
      if (id === null && !get().previousTaskIdBeforeInterrupt) {
         set({ previousTaskIdBeforeInterrupt: null });
      }
      get().actions._persistEventsState();
    },
    addMyTask: (name: string, categoryId?: string) => {
      const { myTasks: currentTasks, addTaskToTop, autoStartTask, currentEventId, events, actions } = get();
      
      try {
        const { newTask, updatedTasks } = createTaskWithOrdering({
          name,
          categoryId,
          addToTop: addTaskToTop,
          existingTasks: currentTasks,
        });
        
        set({ myTasks: updatedTasks });
        actions._persistMyTasksState();
        
        // Handle auto-start if enabled
        if (autoStartTask) {
          handleAutoStartTask({
            task: newTask,
            currentEventId,
            events,
            startTaskAction: actions.startTask,
            updateEventAction: actions.updateEvent,
          });
        }
      } catch (error) {
        console.error('[useEventsStore] Error adding task:', error);
      }
    },
    removeMyTask: (id: string) => {
      const currentTasks = get().myTasks;
      const updatedTasks = removeTaskAndReorder(currentTasks, id);
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
    },
    updateMyTask: (id: string, newName: string) => {
      const currentTasks = get().myTasks;
      const updatedTasks = currentTasks.map(task =>
        task.id === id ? { ...task, name: newName } : task
      );
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
      
      // Also update the labels of related events in history
      const currentEvents = get().events;
      const updatedEvents = currentEvents.map(event => {
        if (event.type === 'task' && event.meta?.myTaskId === id) {
          return { ...event, label: newName };
        }
        return event;
      });
      set({ events: updatedEvents });
      get().actions._persistEventsState();
    },
    setMyTasks: (tasks: MyTask[]) => {
      const sortedTasks = sortMyTasks(tasks.map((task, index) => ({
        ...task,
        isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
        order: task.order === undefined ? index : task.order,
      })));
      set({ myTasks: sortedTasks });
      get().actions._persistMyTasksState();
    },
    toggleMyTaskCompletion: (taskId: string) => {
      const currentTasks = get().myTasks;
      const updatedTasks = currentTasks.map(task =>
          task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
      );
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
    },
    reorderMyTasks: (taskId: string, newOrder: number) => {
      const currentTasks = get().myTasks;
      try {
        const updatedTasks = reorderTasks(currentTasks, taskId, newOrder);
        set({ myTasks: updatedTasks });
        get().actions._persistMyTasksState();
      } catch (error) {
        console.error('[useEventsStore] Error reordering tasks:', error);
      }
    },
    getTaskTotalDuration: (taskId: string) => {
        const { events } = get();
        return events
          .filter(event => event.type === 'task' && event.meta?.myTaskId === taskId && event.end)
          .reduce((total, event) => total + (event.end! - event.start), 0);
    },
    cancelCurrentInterruptAndResumeTask: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks } = get();
      if (currentEventId) {
        const interruptToEnd = events.find(e => e.id === currentEventId && e.type === 'interrupt');
        if (interruptToEnd && !interruptToEnd.end) {
          get().actions.updateEvent({ ...interruptToEnd, end: Date.now() });
        }
      }

      if (previousTaskIdBeforeInterrupt) {
        const taskEventToResume = events.find(e => e.id === previousTaskIdBeforeInterrupt && e.type === 'task');
        if (taskEventToResume) {
          const myTaskDetails = myTasks.find(mt => mt.id === taskEventToResume.meta?.myTaskId);
          const newResumedTaskEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: taskEventToResume.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            meta: taskEventToResume.meta,
          };
          get().actions.addEvent(newResumedTaskEvent);
          set({ currentEventId: newResumedTaskEvent.id, previousTaskIdBeforeInterrupt: null });
        } else {
           set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
      get().actions._persistEventsState();
    },
    updateMyTaskCategory: (id: string, categoryId: string | undefined) => {
      const currentTasks = get().myTasks;
      const updatedTasks = currentTasks.map(task =>
        task.id === id ? { ...task, categoryId } : task
      );
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
    },
    _persistCategoriesState: () => {
      const { categories, isCategoryEnabled } = get();
      dbSet(STORAGE_KEYS.CATEGORIES, categories).catch(error => {
        console.error('[useEventsStore] Error persisting categories to IndexedDB:', error);
      });
      dbSet(STORAGE_KEYS.CATEGORY_ENABLED, isCategoryEnabled).catch(error => {
        console.error('[useEventsStore] Error persisting category enabled state to IndexedDB:', error);
      });
    },
    addCategory: (name: string, color: string) => {
      const currentCategories = get().categories;
      const newCategory: Category = {
        id: uuidv4(),
        name: name.trim(),
        color,
        order: currentCategories.length,
      };
      set({ categories: [...currentCategories, newCategory] });
      get().actions._persistCategoriesState();
    },
    updateCategory: (id: string, name: string, color: string) => {
      const currentCategories = get().categories;
      const updatedCategories = currentCategories.map(cat =>
        cat.id === id ? { ...cat, name: name.trim(), color } : cat
      );
      set({ categories: updatedCategories });
      get().actions._persistCategoriesState();
    },
    removeCategory: (id: string) => {
      const { categories: currentCategories, myTasks: currentTasks, events: currentEvents } = get();
      
      const remainingCategories = currentCategories.filter(cat => cat.id !== id);
      const updatedCategories = reorderCategories(remainingCategories);
      set({ categories: updatedCategories });
      get().actions._persistCategoriesState();
      
      // Clean up category references in tasks and events
      const { updatedTasks, updatedEvents } = cleanupCategoryReferences(id, currentTasks, currentEvents);
      set({ myTasks: updatedTasks, events: updatedEvents });
      get().actions._persistMyTasksState();
      get().actions._persistEventsState();
    },
    setCategories: (categories: Category[]) => {
      set({ categories });
      get().actions._persistCategoriesState();
    },
    toggleCategoryEnabled: () => {
      set({ isCategoryEnabled: !get().isCategoryEnabled });
      get().actions._persistCategoriesState();
    },
    _persistInterruptCategorySettings: () => {
      const { interruptCategorySettings } = get();
      dbSet(STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, interruptCategorySettings).catch(error => {
        console.error('[useEventsStore] Error persisting interrupt category settings to IndexedDB:', error);
      });
    },
    updateInterruptCategoryName: (categoryId: keyof InterruptCategorySettings, name: string) => {
      const currentSettings = get().interruptCategorySettings;
      const updatedSettings = {
        ...currentSettings,
        [categoryId]: name.trim() || DEFAULT_INTERRUPT_CATEGORIES[categoryId]
      };
      set({ interruptCategorySettings: updatedSettings });
      get().actions._persistInterruptCategorySettings();
    },
    resetInterruptCategoryToDefault: (categoryId: keyof InterruptCategorySettings) => {
      const currentSettings = get().interruptCategorySettings;
      const updatedSettings = {
        ...currentSettings,
        [categoryId]: DEFAULT_INTERRUPT_CATEGORIES[categoryId]
      };
      set({ interruptCategorySettings: updatedSettings });
      get().actions._persistInterruptCategorySettings();
    },
    resetAllInterruptCategoriesToDefault: () => {
      set({ interruptCategorySettings: { ...DEFAULT_INTERRUPT_CATEGORIES } });
      get().actions._persistInterruptCategorySettings();
    },
    toggleTaskPlacement: () => {
      set({ addTaskToTop: !get().addTaskToTop });
      get().actions._persistTaskPlacementSetting();
    },
    _persistTaskPlacementSetting: () => {
      const { addTaskToTop } = get();
      dbSet(STORAGE_KEYS.TASK_PLACEMENT_SETTING, addTaskToTop).catch(error => {
        console.error('[useEventsStore] Error persisting task placement setting to IndexedDB:', error);
      });
    },
    toggleAutoStartTask: () => {
      set({ autoStartTask: !get().autoStartTask });
      get().actions._persistAutoStartTaskSetting();
    },
    _persistAutoStartTaskSetting: () => {
      const { autoStartTask } = get();
      dbSet(STORAGE_KEYS.AUTO_START_TASK_SETTING, autoStartTask).catch(error => {
        console.error('[useEventsStore] Error persisting auto-start task setting to IndexedDB:', error);
      });
    },
  },
});

const useEventsStore = create<EventsState>(storeCreator);

if (typeof window !== 'undefined') {
  // Handle browser/tab close to properly stop running timers
  window.addEventListener('beforeunload', () => {
    const state = useEventsStore.getState();
    if (state.currentEventId) {
      const currentEvent = state.events.find(e => e.id === state.currentEventId);
      if (currentEvent && !currentEvent.end) {
        state.actions.stopCurrentEvent();
      }
    }
  });

  (async () => {
    try {
      await useEventsStore.getState().actions.hydrate();
      const store = useEventsStore.getState();
      
      if (store.currentEventId) {
        const currentEvent = store.events.find(e => e.id === store.currentEventId);
        if (currentEvent && !currentEvent.end) {
          store.actions.stopCurrentEvent();
        }
      }
    } catch (error) {
      console.error("[useEventsStore] Error during initial hydration:", error);
    }
  })();
}

export default useEventsStore; 