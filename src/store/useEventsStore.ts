import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Event, MyTask, Category, InterruptCategorySettings, TaskPlanning, FeatureFlags, DueAlertSettings, UiSettings, TaskLifecycleRecord } from '@/types';
import { dbGet, dbSet } from '@/lib/db';
import { DEFAULT_INTERRUPT_CATEGORIES, TIME_THRESHOLDS } from '@/lib/constants';
import { 
  hydrateEventsData, 
  hydrateTasksData, 
  hydrateCategoriesData, 
  hydrateSettingsData,
  STORE_STORAGE_KEYS,
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

const MAX_INTERRUPT_DIRECTORY_ENTRIES = 10;

const normalizeDirectoryValue = (value: string) => value.trim();

export interface EventsState {
  events: Event[];
  currentEventId: string | null;
  previousTaskIdBeforeInterrupt: string | null;
  myTasks: MyTask[];
  taskLedger: Record<string, TaskLifecycleRecord>;
  categories: Category[];
  isCategoryEnabled: boolean;
  interruptCategorySettings: InterruptCategorySettings;
  interruptContacts: string[];
  interruptSubjects: string[];
  addTaskToTop: boolean; // true: 上に追加, false: 下に追加
  autoStartTask: boolean; // true: タスク追加後即座開始, false: 手動で開始
  isHydrated: boolean;
  featureFlags: FeatureFlags;
  dueAlertSettings: DueAlertSettings;
  uiSettings: UiSettings;
  actions: {
    startTask: (label?: string, myTaskId?: string) => void;
    stopCurrentEvent: () => void;
    startInterrupt: (data?: string | { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => void;
    updateInterruptDetails: (data: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => void;
    stopInterruptAndResumePreviousTask: () => void;
    startBreak: (data?: string | { label?: string; breakType?: Event['breakType']; breakDurationMinutes?: Event['breakDurationMinutes'] }) => void;
    addEvent: (event: Event) => void;
    updateEvent: (event: Event) => void;
    setEvents: (events: Event[]) => void;
    setCurrentEventId: (id: string | null) => void;
    addMyTask: (
      name: string,
      categoryId?: string,
      options?: { suppressAutoStart?: boolean; planning?: TaskPlanning }
    ) => void;
    removeMyTask: (id: string) => void;
    updateMyTask: (id: string, newName: string) => void;
    updateMyTaskPlanning: (id: string, updates: { planning?: TaskPlanning | null }) => void;
    updateMyTaskCategory: (id: string, categoryId: string | undefined) => void;
    setMyTasks: (tasks: MyTask[]) => void;
    hydrate: () => Promise<void>;
    toggleMyTaskCompletion: (taskId: string) => void;
    setMyTaskCompletion: (taskId: string, completed: boolean) => void;
    reorderMyTasks: (taskId: string, newOrder: number) => void;
    getTaskTotalDuration: (taskId: string) => number;
    cancelCurrentInterruptAndResumeTask: () => void;
    _persistEventsState: () => void;
    _persistMyTasksState: () => void;
    _persistMyTasksStateDebounced: () => void;
    _persistTaskLedger: () => void;
    _persistCategoriesState: () => void;
    stopBreakAndResumePreviousTask: () => void;
    addCategory: (name: string, color: string) => void;
    updateCategory: (id: string, name: string, color: string) => void;
    removeCategory: (id: string) => void;
    setCategories: (categories: Category[]) => void;
    toggleCategoryEnabled: () => void;
    addInterruptContact: (value: string) => void;
    removeInterruptContact: (value: string) => void;
    addInterruptSubject: (value: string) => void;
    removeInterruptSubject: (value: string) => void;
    _persistInterruptDirectory: () => void;
    updateEventEndTime: (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string, interruptType?: string) => void;
    updateInterruptCategoryName: (categoryId: keyof InterruptCategorySettings, name: string) => void;
    resetInterruptCategoryToDefault: (categoryId: keyof InterruptCategorySettings) => void;
    resetAllInterruptCategoriesToDefault: () => void;
    _persistInterruptCategorySettings: () => void;
    toggleTaskPlacement: () => void;
    _persistTaskPlacementSetting: () => void;
    toggleAutoStartTask: () => void;
    _persistAutoStartTaskSetting: () => void;
    setFeatureFlag: (flag: keyof FeatureFlags, value: boolean) => void;
    toggleFeatureFlag: (flag: keyof FeatureFlags) => void;
    _persistFeatureFlags: () => void;
    setDueAlertPreset: (preset: DueAlertSettings['preset']) => void;
    setDueAlertSettings: (settings: DueAlertSettings) => void;
    _persistDueAlertSettings: () => void;
    toggleSortTasksByDueDate: () => void;
    setSortTasksByDueDate: (value: boolean) => void;
    _persistUiSettings: () => void;  };
}

// Debounce timer for myTasks persistence (to reduce IndexedDB writes during reorder operations)
let _persistMyTasksDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const storeCreator: StateCreator<EventsState, [], []> = (set, get) => ({
  events: [],
  currentEventId: null,
  previousTaskIdBeforeInterrupt: null,
  myTasks: [],
  taskLedger: {},
  categories: [],
  isCategoryEnabled: true,
  interruptCategorySettings: { ...DEFAULT_INTERRUPT_CATEGORIES },
  interruptContacts: [],
  interruptSubjects: [],
  addTaskToTop: false, // デフォルトは下に追加
  autoStartTask: false, // デフォルトは手動開始
  isHydrated: false,
  featureFlags: {
    enableTaskPlanning: true,
  },
  dueAlertSettings: {
    warningMinutes: 6 * 60,
    dangerMinutes: 60,
    preset: 'few-hours',
  },
  uiSettings: {
    sortTasksByDueDate: false,
  },
  actions: {
    hydrate: async () => {
      if (get().isHydrated || (typeof window !== 'undefined' && (window as any).__eventStoreHydrating)) {
        return;
      }
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = true;
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
          isCategoryEnabled: true,
          interruptCategorySettings: { ...DEFAULT_INTERRUPT_CATEGORIES }, 
          interruptContacts: [],
          interruptSubjects: [],
          addTaskToTop: false, 
          autoStartTask: false, 
          featureFlags: {
            enableTaskPlanning: true,
          },
          dueAlertSettings: {
            warningMinutes: 6 * 60,
            dangerMinutes: 60,
            preset: 'few-hours',
          },
          uiSettings: {
            sortTasksByDueDate: false,
          },
          isHydrated: false 
        });
      }

      set({ isHydrated: true });
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = false;
      }
    },
    startTask: (label?: string, myTaskId?: string) => {
      const { myTasks, isCategoryEnabled, featureFlags } = get();
      const currentRunningEvent = get().events.find(e => e.id === get().currentEventId);
      if (currentRunningEvent && !currentRunningEvent.end) {
        get().actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }
      set({ previousTaskIdBeforeInterrupt: null });
      
      // カテゴリの継承
      const categoryId = getCategoryFromTask(myTaskId, myTasks, isCategoryEnabled);
      const associatedTask = myTaskId ? myTasks.find(t => t.id === myTaskId) : undefined;
      const planningSnapshot = featureFlags.enableTaskPlanning ? associatedTask?.planning : undefined;
      
      const newEvent: Event = {
        id: uuidv4(),
        type: 'task',
        label,
        start: Date.now(),
        categoryId,
        meta: myTaskId
          ? {
              myTaskId,
              ...(planningSnapshot ? { planningSnapshot } : {}),
            }
          : undefined,
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
      if (!currentEventId) {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        return;
      }
      const eventToEnd = events.find(e => e.id === currentEventId);
      if (eventToEnd && !eventToEnd.end) {
        // Clear currentEventId first so persistence writes the cleared state
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        get().actions.updateEvent({ ...eventToEnd, end: Date.now() });
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
    },
    startInterrupt: (data?: string | { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => {
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

      // Support both string label and object payload
      const payload = typeof data === 'string' ? { label: data } : (data || {});

      if (payload.who) {
        get().actions.addInterruptContact(payload.who);
      }
      if (payload.label) {
        const normalizedLabel = payload.label.trim();
        if (normalizedLabel && normalizedLabel !== 'Interrupt') {
          get().actions.addInterruptSubject(normalizedLabel);
        }
      }

      const newEvent: Event = {
        id: uuidv4(),
        type: 'interrupt',
        label: payload.label || 'Interrupt', 
        start: Date.now(),
        categoryId: undefined, // 割り込みは初期状態ではカテゴリなし（編集で設定可能）
        who: payload.who,
        interruptType: payload.interruptType,
        urgency: payload.urgency,
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
          if (data.who) {
            get().actions.addInterruptContact(data.who);
          }
          if (data.label) {
            const normalizedLabel = data.label.trim();
            if (normalizedLabel && normalizedLabel !== 'Interrupt') {
              get().actions.addInterruptSubject(normalizedLabel);
            }
          }
          get().actions.updateEvent(updatedEvent);
        } else {
          console.warn('[useEventsStore] updateInterruptDetails: No active interrupt event found to update.');
        }
      }
    },
    stopInterruptAndResumePreviousTask: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks, isCategoryEnabled } = get();
      
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
          // カテゴリの継承（前のタスクのカテゴリまたは元のタスクから）
          const categoryId = taskEventToResume.categoryId || getCategoryFromTask(taskEventToResume.meta?.myTaskId, myTasks, isCategoryEnabled);

          const newResumedTaskEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: taskEventToResume.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            categoryId,
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
    startBreak: (data?: string | { label?: string; breakType?: Event['breakType']; breakDurationMinutes?: Event['breakDurationMinutes'] }) => {
      const { currentEventId, events } = get();
      const currentRunningEvent = events.find(e => e.id === currentEventId);

      if (currentRunningEvent && !currentRunningEvent.end) {
        if (currentRunningEvent.type === 'task') {
          set({ previousTaskIdBeforeInterrupt: currentEventId });
        }
        get().actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }

      // Support both string label and object payload
      const payload = typeof data === 'string' ? { label: data } : (data || {});

      const newEvent: Event = {
        id: uuidv4(),
        type: 'break',
        label: payload.label || 'Break',
        start: Date.now(),
        categoryId: undefined, // 休憩は初期状態ではカテゴリなし（編集で設定可能）
        breakType: payload.breakType,
        breakDurationMinutes: payload.breakDurationMinutes,
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
      dbSet(STORE_STORAGE_KEYS.EVENTS, { events, currentEventId, previousTaskIdBeforeInterrupt }).catch(error => {
        console.error('[useEventsStore] Error persisting events state to IndexedDB:', error);
      });
    },
    _persistMyTasksState: () => {
      const { myTasks } = get();
      dbSet(STORE_STORAGE_KEYS.MY_TASKS, myTasks).catch(error => {
        console.error('[useEventsStore] Error persisting myTasks state to IndexedDB:', error);
      });
    },
    _persistMyTasksStateDebounced: () => {
      if (_persistMyTasksDebounceTimer) {
        clearTimeout(_persistMyTasksDebounceTimer);
      }
      _persistMyTasksDebounceTimer = setTimeout(() => {
        const { myTasks } = get();
        dbSet(STORE_STORAGE_KEYS.MY_TASKS, myTasks).catch(error => {
          console.error('[useEventsStore] Error persisting myTasks state to IndexedDB:', error);
        });
      }, TIME_THRESHOLDS.AUTO_SAVE_DEBOUNCE_MS);
    },
    _persistTaskLedger: () => {
      const { taskLedger } = get();
      dbSet(STORE_STORAGE_KEYS.TASK_LEDGER, taskLedger).catch(error => {
        console.error('[useEventsStore] Error persisting task ledger to IndexedDB:', error);
      });
    },
    addEvent: (event: Event) => {
      set((state: EventsState) => {
        const nextEvents = [...state.events, event].sort((a, b) => a.start - b.start);
        return { events: nextEvents };
      });
      get().actions._persistEventsState();
    },
    updateEvent: (eventToUpdate: Event) => {
      set((state: EventsState) => ({
        events: state.events.map((e: Event) => (e.id === eventToUpdate.id ? eventToUpdate : e)),
      }));
      get().actions._persistEventsState();
    },
    updateEventEndTime: (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string, interruptType?: string) => {
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
        // If interrupt field is provided, merge when applicable
        const finalUpdatedEvent = (interruptType !== undefined && (newEventType === 'interrupt' || updatedEvent.type === 'interrupt'))
          ? { ...updatedEvent, interruptType }
          : updatedEvent;

        if (shouldCreateGap && gapEvent) {
          const newEvents = insertEventWithGap(events, eventIndex, finalUpdatedEvent, gapEvent);
          set({ events: newEvents });
        } else {
          get().actions.updateEvent(finalUpdatedEvent);
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
    addMyTask: (
      name: string,
      categoryId?: string,
      options?: { suppressAutoStart?: boolean; planning?: TaskPlanning }
    ) => {
      const { myTasks: currentTasks, addTaskToTop, autoStartTask, currentEventId, events, actions, categories } = get();
      const suppressAutoStart = options?.suppressAutoStart ?? false;
      const planning = options?.planning;

      try {
        const { newTask, updatedTasks } = createTaskWithOrdering({
          name,
          categoryId,
          addToTop: addTaskToTop,
          existingTasks: currentTasks,
          planning,
        });

        const category = categories.find(cat => cat.id === categoryId);
        const plannedMinutes = planning?.plannedDurationMinutes ?? null;
        const dueAt = planning?.dueAt ?? null;

        set(state => ({
          myTasks: updatedTasks,
          taskLedger: {
            ...state.taskLedger,
            [newTask.id]: {
              id: newTask.id,
              name: newTask.name,
              createdAt: newTask.createdAt,
              createdCategoryId: category?.id ?? null,
              createdCategoryName: category?.name,
              createdPlannedMinutes: plannedMinutes,
              createdDueAt: dueAt,
              latestCategoryId: category?.id ?? null,
              latestCategoryName: category?.name,
              latestPlannedMinutes: plannedMinutes,
              latestDueAt: dueAt,
              completedAt: null,
              completedCategoryId: null,
              completedCategoryName: undefined,
              completedPlannedMinutes: null,
              completedDueAt: null,
              canceledAt: null,
              canceledCategoryId: null,
              canceledCategoryName: undefined,
            },
          },
        }));
        actions._persistMyTasksState();
        actions._persistTaskLedger();
        
        // Handle auto-start if enabled
        if (autoStartTask && !suppressAutoStart) {
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
      const { myTasks: currentTasks, categories } = get();
      const taskToRemove = currentTasks.find(task => task.id === id);
      if (!taskToRemove) {
        return;
      }

      const updatedTasks = removeTaskAndReorder(currentTasks, id);
      const removalTime = Date.now();
      const category = categories.find(cat => cat.id === taskToRemove.categoryId);

      set(state => ({
        myTasks: updatedTasks,
        taskLedger: {
          ...state.taskLedger,
          [id]: {
            id,
            name: taskToRemove.name,
            createdAt: state.taskLedger[id]?.createdAt ?? taskToRemove.createdAt,
            completedAt:
              state.taskLedger[id]?.completedAt ??
              (taskToRemove.isCompleted ? taskToRemove.completedAt ?? removalTime : null),
            canceledAt: removalTime,
            createdCategoryId: state.taskLedger[id]?.createdCategoryId ?? taskToRemove.categoryId ?? null,
            createdCategoryName: state.taskLedger[id]?.createdCategoryName,
            createdPlannedMinutes: state.taskLedger[id]?.createdPlannedMinutes ?? taskToRemove.planning?.plannedDurationMinutes ?? null,
            createdDueAt: state.taskLedger[id]?.createdDueAt ?? taskToRemove.planning?.dueAt ?? null,
            latestCategoryId: state.taskLedger[id]?.latestCategoryId ?? taskToRemove.categoryId ?? null,
            latestCategoryName: state.taskLedger[id]?.latestCategoryName,
            latestPlannedMinutes: state.taskLedger[id]?.latestPlannedMinutes ?? taskToRemove.planning?.plannedDurationMinutes ?? null,
            latestDueAt: state.taskLedger[id]?.latestDueAt ?? taskToRemove.planning?.dueAt ?? null,
            completedCategoryId: state.taskLedger[id]?.completedCategoryId ?? (taskToRemove.isCompleted ? taskToRemove.categoryId ?? null : null),
            completedCategoryName: state.taskLedger[id]?.completedCategoryName,
            completedPlannedMinutes: state.taskLedger[id]?.completedPlannedMinutes ?? (taskToRemove.isCompleted ? taskToRemove.planning?.plannedDurationMinutes ?? null : null),
            completedDueAt: state.taskLedger[id]?.completedDueAt ?? (taskToRemove.isCompleted ? taskToRemove.planning?.dueAt ?? null : null),
            canceledCategoryId: category?.id ?? taskToRemove.categoryId ?? null,
            canceledCategoryName: category?.name,
          },
        },
      }));

      const { actions: innerActions } = get();
      innerActions._persistMyTasksState();
      innerActions._persistTaskLedger();
    },
    updateMyTask: (id: string, newName: string) => {
      const { myTasks: currentTasks, categories } = get();
      const updatedTasks = currentTasks.map(task =>
        task.id === id ? { ...task, name: newName } : task
      );
      set(state => ({
        myTasks: updatedTasks,
        taskLedger: state.taskLedger[id]
          ? {
              ...state.taskLedger,
              [id]: { ...state.taskLedger[id], name: newName },
            }
          : state.taskLedger,
      }));
      get().actions._persistMyTasksState();
      if (get().taskLedger[id]) {
        get().actions._persistTaskLedger();
      }
      
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
    updateMyTaskPlanning: (id: string, updates: { planning?: TaskPlanning | null }) => {
      const currentTasks = get().myTasks;
      const hasPlanningUpdate = Object.prototype.hasOwnProperty.call(updates, 'planning');
      const normalizedPlanning = updates.planning === null ? undefined : updates.planning;

      const updatedTasks = currentTasks.map(task => {
        if (task.id !== id) {
          return task;
        }

        return {
          ...task,
          planning: hasPlanningUpdate ? normalizedPlanning : task.planning,
        };
      });

      set(state => {
        const updatedLedger = { ...state.taskLedger };
        if (updatedLedger[id] && hasPlanningUpdate) {
          const plannedMinutes = normalizedPlanning?.plannedDurationMinutes ?? null;
          const dueAt = normalizedPlanning?.dueAt ?? null;
          updatedLedger[id] = {
            ...updatedLedger[id],
            latestPlannedMinutes: plannedMinutes,
            latestDueAt: dueAt,
          };
        }
        return {
          myTasks: updatedTasks,
          taskLedger: updatedLedger,
        };
      });
      const { actions: storeActions } = get();
      storeActions._persistMyTasksState();
      storeActions._persistTaskLedger();

      const { events, currentEventId } = get();
      if (!currentEventId) {
        return;
      }
      const currentEvent = events.find(event => event.id === currentEventId);
      if (currentEvent && currentEvent.type === 'task' && currentEvent.meta?.myTaskId === id && !currentEvent.end) {
        const updatedEvent: Event = {
          ...currentEvent,
          meta: {
            ...currentEvent.meta,
            ...(updates.planning !== undefined ? { planningSnapshot: normalizedPlanning } : {}),
          },
        };

        set({
          events: events.map(event => (event.id === currentEventId ? updatedEvent : event)),
        });
        get().actions._persistEventsState();
      }
    },
    setMyTasks: (tasks: MyTask[]) => {
      const baseNow = Date.now();
      const categories = get().categories;
      const normalizedTasks = tasks.map((task, index) => {
        const createdAt = task.createdAt ?? baseNow;
        return {
          ...task,
          isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
          order: task.order === undefined ? index : task.order,
          planning: task.planning || undefined,
          createdAt,
          completedAt: task.completedAt ?? (task.isCompleted ? createdAt : null),
          canceledAt: task.canceledAt ?? null,
        };
      });
      const sortedTasks = sortMyTasks(normalizedTasks);
      set(state => {
        const updatedLedger = { ...state.taskLedger };
        sortedTasks.forEach(task => {
          const existing = updatedLedger[task.id];
          const category = categories.find(cat => cat.id === task.categoryId);
          updatedLedger[task.id] = {
            id: task.id,
            name: task.name,
            createdAt: existing?.createdAt ?? task.createdAt,
            createdCategoryId: existing?.createdCategoryId ?? task.categoryId ?? null,
            createdCategoryName: existing?.createdCategoryName ?? category?.name,
            createdPlannedMinutes: existing?.createdPlannedMinutes ?? task.planning?.plannedDurationMinutes ?? null,
            createdDueAt: existing?.createdDueAt ?? task.planning?.dueAt ?? null,
            latestCategoryId: task.categoryId ?? existing?.latestCategoryId ?? null,
            latestCategoryName: category?.name ?? existing?.latestCategoryName,
            latestPlannedMinutes: task.planning?.plannedDurationMinutes ?? existing?.latestPlannedMinutes ?? null,
            latestDueAt: task.planning?.dueAt ?? existing?.latestDueAt ?? null,
            completedAt: existing?.completedAt ?? task.completedAt ?? null,
            completedCategoryId: existing?.completedCategoryId ?? (task.completedAt ? task.categoryId ?? null : null),
            completedCategoryName: existing?.completedCategoryName,
            completedPlannedMinutes: existing?.completedPlannedMinutes,
            completedDueAt: existing?.completedDueAt,
            canceledAt: existing?.canceledAt ?? task.canceledAt ?? null,
            canceledCategoryId: existing?.canceledCategoryId ?? (task.canceledAt ? task.categoryId ?? null : null),
            canceledCategoryName: existing?.canceledCategoryName,
          };
        });
        return {
          myTasks: sortedTasks,
          taskLedger: updatedLedger,
        };
      });
      const { actions: innerActions } = get();
      innerActions._persistMyTasksState();
      innerActions._persistTaskLedger();
    },
    toggleMyTaskCompletion: (taskId: string) => {
      const currentState = get();
      const { myTasks: currentTasks, categories, currentEventId, events } = currentState;
      const activeEvent = currentEventId ? events.find(event => event.id === currentEventId) : undefined;
      if (activeEvent && !activeEvent.end) {
        return;
      }
      const task = currentTasks.find(t => t.id === taskId);
      if (!task) return;

      const now = Date.now();
      const updatedTasks = currentTasks.map(item => {
        if (item.id !== taskId) return item;
        const nextCompleted = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? item.completedAt ?? now : null,
        };
      });

      set(state => {
        const existingLedger = state.taskLedger[taskId] || {
          id: taskId,
          name: task.name,
          createdAt: task.createdAt,
        };
        const category = categories.find(cat => cat.id === task.categoryId);
        const newCompletedAt = updatedTasks.find(t => t.id === taskId)?.completedAt ?? null;
        return {
          myTasks: updatedTasks,
          taskLedger: {
            ...state.taskLedger,
            [taskId]: {
              ...existingLedger,
              name: task.name,
              latestCategoryId: task.categoryId ?? existingLedger.latestCategoryId ?? null,
              latestCategoryName: category?.name ?? existingLedger.latestCategoryName,
              latestPlannedMinutes: task.planning?.plannedDurationMinutes ?? existingLedger.latestPlannedMinutes ?? null,
              latestDueAt: task.planning?.dueAt ?? existingLedger.latestDueAt ?? null,
              completedAt: newCompletedAt,
              completedCategoryId: newCompletedAt ? task.categoryId ?? existingLedger.completedCategoryId ?? null : null,
              completedCategoryName: newCompletedAt ? category?.name ?? existingLedger.completedCategoryName : undefined,
              completedPlannedMinutes: newCompletedAt ? task.planning?.plannedDurationMinutes ?? existingLedger.completedPlannedMinutes ?? null : null,
              completedDueAt: newCompletedAt ? task.planning?.dueAt ?? existingLedger.completedDueAt ?? null : null,
            },
          },
        };
      });

      const { actions: innerActions } = get();
      innerActions._persistMyTasksState();
      innerActions._persistTaskLedger();
    },
    setMyTaskCompletion: (taskId: string, completed: boolean) => {
      const currentState = get();
      const { myTasks: currentTasks, categories, currentEventId, events } = currentState;
      const activeEvent = currentEventId ? events.find(event => event.id === currentEventId) : undefined;
      if (activeEvent && !activeEvent.end) {
        return;
      }
      const task = currentTasks.find(t => t.id === taskId);
      if (!task) return;

      const now = Date.now();
      const updatedTasks = currentTasks.map(item =>
        item.id === taskId
          ? {
              ...item,
              isCompleted: completed,
              completedAt: completed ? item.completedAt ?? now : null,
            }
          : item,
      );

      set(state => {
        const existingLedger = state.taskLedger[taskId] || {
          id: taskId,
          name: task.name,
          createdAt: task.createdAt,
        };
        const category = categories.find(cat => cat.id === task.categoryId);
        return {
          myTasks: updatedTasks,
          taskLedger: {
            ...state.taskLedger,
            [taskId]: {
              ...existingLedger,
              name: task.name,
              latestCategoryId: task.categoryId ?? existingLedger.latestCategoryId ?? null,
              latestCategoryName: category?.name ?? existingLedger.latestCategoryName,
              latestPlannedMinutes: task.planning?.plannedDurationMinutes ?? existingLedger.latestPlannedMinutes ?? null,
              latestDueAt: task.planning?.dueAt ?? existingLedger.latestDueAt ?? null,
              completedAt: completed ? (existingLedger.completedAt ?? now) : null,
              completedCategoryId: completed ? task.categoryId ?? existingLedger.completedCategoryId ?? null : null,
              completedCategoryName: completed ? category?.name ?? existingLedger.completedCategoryName : undefined,
              completedPlannedMinutes: completed ? task.planning?.plannedDurationMinutes ?? existingLedger.completedPlannedMinutes ?? null : null,
              completedDueAt: completed ? task.planning?.dueAt ?? existingLedger.completedDueAt ?? null : null,
            },
          },
        };
      });

      const { actions: innerActions } = get();
      innerActions._persistMyTasksState();
      innerActions._persistTaskLedger();
    },
    reorderMyTasks: (taskId: string, newOrder: number) => {
      const currentTasks = get().myTasks;
      try {
        const updatedTasks = reorderTasks(currentTasks, taskId, newOrder);
        set({ myTasks: updatedTasks });
        get().actions._persistMyTasksStateDebounced();
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
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks, isCategoryEnabled } = get();
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
          const categoryId = taskEventToResume.categoryId || getCategoryFromTask(taskEventToResume.meta?.myTaskId, myTasks, isCategoryEnabled);
          const newResumedTaskEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: taskEventToResume.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            categoryId,
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
      const { myTasks: currentTasks, categories } = get();
      const updatedTasks = currentTasks.map(task =>
        task.id === id ? { ...task, categoryId } : task
      );
      const category = categories.find(cat => cat.id === categoryId);
      set(state => ({
        myTasks: updatedTasks,
        taskLedger: state.taskLedger[id]
          ? {
              ...state.taskLedger,
              [id]: {
                ...state.taskLedger[id],
                latestCategoryId: categoryId ?? null,
                latestCategoryName: category?.name ?? state.taskLedger[id].latestCategoryName,
              },
            }
          : state.taskLedger,
      }));
      const actions = get().actions;
      actions._persistMyTasksState();
      actions._persistTaskLedger();
    },
    _persistCategoriesState: () => {
      const { categories, isCategoryEnabled } = get();
      dbSet(STORE_STORAGE_KEYS.CATEGORIES, categories).catch(error => {
        console.error('[useEventsStore] Error persisting categories to IndexedDB:', error);
      });
      dbSet(STORE_STORAGE_KEYS.CATEGORY_ENABLED, isCategoryEnabled).catch(error => {
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
    addInterruptContact: (value: string) => {
      const normalized = normalizeDirectoryValue(value);
      if (!normalized) {
        return;
      }

      set(state => {
        const existsIndex = state.interruptContacts.findIndex(entry => entry.toLowerCase() === normalized.toLowerCase());
        const filtered = existsIndex >= 0 ? state.interruptContacts.filter((_, index) => index !== existsIndex) : state.interruptContacts;
        const updated = [normalized, ...filtered].slice(0, MAX_INTERRUPT_DIRECTORY_ENTRIES);
        return { interruptContacts: updated };
      });
      get().actions._persistInterruptDirectory();
    },
    removeInterruptContact: (value: string) => {
      set(state => ({
        interruptContacts: state.interruptContacts.filter(entry => entry.toLowerCase() !== value.toLowerCase()),
      }));
      get().actions._persistInterruptDirectory();
    },
    addInterruptSubject: (value: string) => {
      const normalized = normalizeDirectoryValue(value);
      if (!normalized) {
        return;
      }

      set(state => {
        const existsIndex = state.interruptSubjects.findIndex(entry => entry.toLowerCase() === normalized.toLowerCase());
        const filtered = existsIndex >= 0 ? state.interruptSubjects.filter((_, index) => index !== existsIndex) : state.interruptSubjects;
        const updated = [normalized, ...filtered].slice(0, MAX_INTERRUPT_DIRECTORY_ENTRIES);
        return { interruptSubjects: updated };
      });
      get().actions._persistInterruptDirectory();
    },
    removeInterruptSubject: (value: string) => {
      set(state => ({
        interruptSubjects: state.interruptSubjects.filter(entry => entry.toLowerCase() !== value.toLowerCase()),
      }));
      get().actions._persistInterruptDirectory();
    },
    _persistInterruptDirectory: () => {
      const { interruptContacts, interruptSubjects } = get();
      Promise.all([
        dbSet(STORE_STORAGE_KEYS.INTERRUPT_CONTACTS, interruptContacts),
        dbSet(STORE_STORAGE_KEYS.INTERRUPT_REASONS, interruptSubjects),
      ]).catch(error => {
        console.error('[useEventsStore] Error persisting interrupt directory:', error);
      });
    },
    _persistInterruptCategorySettings: () => {
      const { interruptCategorySettings } = get();
      dbSet(STORE_STORAGE_KEYS.INTERRUPT_CATEGORY_SETTINGS, interruptCategorySettings).catch(error => {
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
    setFeatureFlag: (flag: keyof FeatureFlags, value: boolean) => {
      set({ featureFlags: { ...get().featureFlags, [flag]: value } });
      get().actions._persistFeatureFlags();
    },
    toggleFeatureFlag: (flag: keyof FeatureFlags) => {
      const current = get().featureFlags[flag];
      set({ featureFlags: { ...get().featureFlags, [flag]: !current } });
      get().actions._persistFeatureFlags();
    },
    _persistFeatureFlags: () => {
      const { featureFlags } = get();
      dbSet(STORE_STORAGE_KEYS.FEATURE_FLAGS_SETTING, featureFlags).catch(error => {
        console.error('[useEventsStore] Error persisting feature flags to IndexedDB:', error);
      });
    },
    setDueAlertPreset: (preset: DueAlertSettings['preset']) => {
      const presetMap: Record<DueAlertSettings['preset'], DueAlertSettings> = {
        'day-before': {
          warningMinutes: 24 * 60,
          dangerMinutes: 4 * 60,
          preset: 'day-before',
        },
        'few-hours': {
          warningMinutes: 6 * 60,
          dangerMinutes: 60,
          preset: 'few-hours',
        },
        tight: {
          warningMinutes: 120,
          dangerMinutes: 30,
          preset: 'tight',
        },
      };
      set({ dueAlertSettings: presetMap[preset] });
      get().actions._persistDueAlertSettings();
    },
    setDueAlertSettings: (settings: DueAlertSettings) => {
      set({ dueAlertSettings: settings });
      get().actions._persistDueAlertSettings();
    },
    _persistDueAlertSettings: () => {
      const { dueAlertSettings } = get();
      dbSet(STORE_STORAGE_KEYS.DUE_ALERT_SETTINGS, dueAlertSettings).catch(error => {
        console.error('[useEventsStore] Error persisting due alert settings to IndexedDB:', error);
      });
    },
    toggleSortTasksByDueDate: () => {
      set(state => ({ uiSettings: { ...state.uiSettings, sortTasksByDueDate: !state.uiSettings.sortTasksByDueDate } }));
      get().actions._persistUiSettings();
    },
    setSortTasksByDueDate: (value: boolean) => {
      set(state => ({ uiSettings: { ...state.uiSettings, sortTasksByDueDate: value } }));
      get().actions._persistUiSettings();
    },    _persistUiSettings: () => {
      const { uiSettings } = get();
      dbSet(STORE_STORAGE_KEYS.UI_SETTINGS, uiSettings).catch(error => {
        console.error('[useEventsStore] Error persisting UI settings to IndexedDB:', error);
      });
    },
    toggleTaskPlacement: () => {
      set({ addTaskToTop: !get().addTaskToTop });
      get().actions._persistTaskPlacementSetting();
    },
    _persistTaskPlacementSetting: () => {
      const { addTaskToTop } = get();
      dbSet(STORE_STORAGE_KEYS.TASK_PLACEMENT_SETTING, addTaskToTop).catch(error => {
        console.error('[useEventsStore] Error persisting task placement setting to IndexedDB:', error);
      });
    },
    toggleAutoStartTask: () => {
      set({ autoStartTask: !get().autoStartTask });
      get().actions._persistAutoStartTaskSetting();
    },
    _persistAutoStartTaskSetting: () => {
      const { autoStartTask } = get();
      dbSet(STORE_STORAGE_KEYS.AUTO_START_TASK_SETTING, autoStartTask).catch(error => {
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
