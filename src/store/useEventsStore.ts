import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Event, MyTask, Category } from '@/types';
import { BusinessHoursSettings, BusinessHoursState } from '@/types/businessHours';
import { shouldAutoRestartBusinessTask } from '@/lib/businessHours';
import { dbGet, dbSet } from '@/lib/db';

const EVENTS_STORE_KEY = 'events-store';
const MY_TASKS_STORE_KEY = 'mytasks-store';
const CATEGORIES_STORE_KEY = 'categories-store';
const CATEGORY_ENABLED_KEY = 'category-enabled';
const BUSINESS_HOURS_SETTINGS_KEY = 'business-hours-settings';
const BUSINESS_HOURS_STATE_KEY = 'business-hours-state';

// Helper to sort tasks by order
const sortMyTasks = (tasks: MyTask[]): MyTask[] => tasks.slice().sort((a, b) => a.order - b.order);

// Helper to re-assign order after add/remove/reorder
const reassignOrder = (tasks: MyTask[]): MyTask[] => {
  return tasks.map((task, index) => ({ ...task, order: index }));
};

// Helper to get category ID from task ID (for event category inheritance)
const getCategoryFromTask = (taskId: string | undefined, tasks: MyTask[], isCategoryEnabled: boolean): string | undefined => {
  if (!taskId || !isCategoryEnabled) return undefined;
  const task = tasks.find(t => t.id === taskId);
  return task?.categoryId;
};

export interface EventsState {
  events: Event[];
  currentEventId: string | null;
  previousTaskIdBeforeInterrupt: string | null;
  myTasks: MyTask[];
  categories: Category[];
  isCategoryEnabled: boolean;
  isHydrated: boolean;
  // Business Hours Mode
  businessHoursSettings: BusinessHoursSettings | null;
  businessHoursState: BusinessHoursState;
  businessHoursCheckInterval: NodeJS.Timeout | null;
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
    // Business Hours Mode actions
    updateBusinessHoursSettings: (settings: BusinessHoursSettings) => void;
    toggleBusinessHours: () => void;
    checkBusinessHoursStatus: () => void;
    startBusinessHoursTask: () => void;
    isWithinBusinessHours: () => boolean;
    initializeBusinessHoursInterval: () => void;
    cleanupBusinessHoursInterval: () => void;
    _persistBusinessHoursSettings: () => void;
    _tryRestartBusinessTask: () => void;
  };
}

const storeCreator: StateCreator<EventsState, [], []> = (set, get) => ({
  events: [],
  currentEventId: null,
  previousTaskIdBeforeInterrupt: null,
  myTasks: [],
  categories: [],
  isCategoryEnabled: false,
  isHydrated: false,
  // Business Hours Mode
  businessHoursSettings: null,
  businessHoursState: {
    isWithinBusinessHours: false,
    isBusinessTaskRunning: false,
    lastCheckTime: 0,
  },
  businessHoursCheckInterval: null,
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
        const storedEventsState = await dbGet<{ events: Event[]; currentEventId: string | null; previousTaskIdBeforeInterrupt?: string | null }>(EVENTS_STORE_KEY);
        if (storedEventsState) {
          set({ 
            events: storedEventsState.events || [],
            currentEventId: storedEventsState.currentEventId,
            previousTaskIdBeforeInterrupt: storedEventsState.previousTaskIdBeforeInterrupt || null,
           });
        } else {
          set({ events: [], currentEventId: null, previousTaskIdBeforeInterrupt: null });
        }

        const storedMyTasks = await dbGet<MyTask[]>(MY_TASKS_STORE_KEY);
        if (storedMyTasks) {
          const hydratedTasks = storedMyTasks.map((task, index) => ({
            ...task,
            isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
            order: task.order === undefined ? index : task.order,
          }));
          set({ myTasks: sortMyTasks(hydratedTasks) });
        } else {
          set({ myTasks: [] });
        }

        const storedCategories = await dbGet<Category[]>(CATEGORIES_STORE_KEY);
        if (storedCategories) {
          set({ categories: storedCategories });
        } else {
          // デフォルトカテゴリを作成
          const defaultCategories: Category[] = [
            { id: uuidv4(), name: '開発', color: '#3B82F6', order: 0 },
            { id: uuidv4(), name: '会議', color: '#8B5CF6', order: 1 },
            { id: uuidv4(), name: 'レビュー', color: '#10B981', order: 2 },
            { id: uuidv4(), name: 'ドキュメント', color: '#F59E0B', order: 3 },
            { id: uuidv4(), name: 'その他', color: '#6B7280', order: 4 },
          ];
          set({ categories: defaultCategories });
          await dbSet(CATEGORIES_STORE_KEY, defaultCategories);
        }

        const categoryEnabled = await dbGet<boolean>(CATEGORY_ENABLED_KEY);
        set({ isCategoryEnabled: categoryEnabled ?? false });
        
        // Business Hours Settings
        const businessHoursSettings = await dbGet<BusinessHoursSettings>(BUSINESS_HOURS_SETTINGS_KEY);
        if (businessHoursSettings) {
          set({ businessHoursSettings });
          // Initialize business hours check interval if enabled
          if (businessHoursSettings.enabled) {
            get().actions.initializeBusinessHoursInterval();
          }
        }
        
        const businessHoursState = await dbGet<BusinessHoursState>(BUSINESS_HOURS_STATE_KEY);
        if (businessHoursState) {
          set({ businessHoursState });
        }
      } catch (error) {
        console.error('[useEventsStore] Failed to hydrate from IndexedDB:', error);
        set({ events: [], currentEventId: null, previousTaskIdBeforeInterrupt: null, myTasks: [], isHydrated: false });
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
      const { events, currentEventId, businessHoursSettings } = get();
      if (currentEventId) {
        const eventToEnd = events.find(e => e.id === currentEventId);
        if (eventToEnd && !eventToEnd.end) {
          get().actions.updateEvent({ ...eventToEnd, end: Date.now() });
        }
      }
      set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      
      // Try to restart business hours task if applicable
      get().actions._tryRestartBusinessTask();
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
           // Try to restart business hours task if applicable
           get().actions._tryRestartBusinessTask();
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        // Try to restart business hours task if applicable
        get().actions._tryRestartBusinessTask();
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
          // Try to restart business hours task if applicable
          get().actions._tryRestartBusinessTask();
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        // Try to restart business hours task if applicable
        get().actions._tryRestartBusinessTask();
      }
      get().actions._persistEventsState();
    },
    _persistEventsState: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt } = get();
      dbSet(EVENTS_STORE_KEY, { events, currentEventId, previousTaskIdBeforeInterrupt }).catch(error => {
        console.error('[useEventsStore] Error persisting events state to IndexedDB:', error);
      });
    },
    _persistMyTasksState: () => {
      const { myTasks } = get();
      dbSet(MY_TASKS_STORE_KEY, myTasks).catch(error => {
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
      
      if (!event || !event.end) {
        console.error('[useEventsStore] Cannot edit event: event not found or still running');
        return;
      }
      
      if (newEndTime <= event.start || newEndTime > Date.now()) {
        console.error('[useEventsStore] Invalid end time');
        return;
      }
      
      // If reducing end time, create an "unknown activity" event to fill the gap
      // Only create if the gap is at least 1 minute (60000ms)
      if (newEndTime < event.end && (event.end - newEndTime) >= 60000) {
        const unknownActivityEvent: Event = {
          id: uuidv4(),
          type: 'task',
          label: gapActivityName || '不明なアクティビティ',
          start: newEndTime,
          end: event.end,
          meta: {
            isUnknownActivity: true
          }
        };
        
        // Update the original event
        const updatedEvent: Event = { 
          ...event, 
          end: newEndTime,
          ...(newEventType && { type: newEventType }),
          ...(newLabel !== undefined && { label: newLabel }),
          ...(newCategoryId !== undefined && { categoryId: newCategoryId })
        };
        
        // Insert the unknown activity right after the edited event
        const newEvents = [...events];
        newEvents[eventIndex] = updatedEvent;
        newEvents.splice(eventIndex + 1, 0, unknownActivityEvent);
        
        set({ events: newEvents });
      } else {
        // Simply update the end time and/or type and/or label and/or category
        // This includes cases where time is reduced but gap is less than 1 minute
        const updatedEvent: Event = { 
          ...event, 
          end: newEndTime,
          ...(newEventType && { type: newEventType }),
          ...(newLabel !== undefined && { label: newLabel }),
          ...(newCategoryId !== undefined && { categoryId: newCategoryId })
        };
        get().actions.updateEvent(updatedEvent);
      }
      
      get().actions._persistEventsState();
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
      if (!name.trim()) return;
      const currentTasks = get().myTasks;
      const newTask: MyTask = {
        id: uuidv4(),
        name: name.trim(),
        isCompleted: false,
        order: currentTasks.length,
        categoryId: categoryId,
      };
      const updatedTasks = sortMyTasks([...currentTasks, newTask]);
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
    },
    removeMyTask: (id: string) => {
      const currentTasks = get().myTasks;
      const remainingTasks = currentTasks.filter(task => task.id !== id);
      const updatedTasks = reassignOrder(sortMyTasks(remainingTasks));
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
      const taskToMove = currentTasks.find(t => t.id === taskId);
      if (!taskToMove) return;

      const remainingTasks = currentTasks.filter(t => t.id !== taskId);
      remainingTasks.splice(newOrder, 0, taskToMove);
      
      const updatedTasks = reassignOrder(remainingTasks);
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
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
      dbSet(CATEGORIES_STORE_KEY, categories).catch(error => {
        console.error('[useEventsStore] Error persisting categories to IndexedDB:', error);
      });
      dbSet(CATEGORY_ENABLED_KEY, isCategoryEnabled).catch(error => {
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
      const currentCategories = get().categories;
      const remainingCategories = currentCategories.filter(cat => cat.id !== id);
      const updatedCategories = remainingCategories.map((cat, index) => ({ ...cat, order: index }));
      set({ categories: updatedCategories });
      get().actions._persistCategoriesState();
      
      // カテゴリが削除されたら、そのカテゴリを使用しているタスクとイベントのcategoryIdをクリア
      const currentTasks = get().myTasks;
      const updatedTasks = currentTasks.map(task =>
        task.categoryId === id ? { ...task, categoryId: undefined } : task
      );
      set({ myTasks: updatedTasks });
      get().actions._persistMyTasksState();
      
      // イベントのcategoryIdもクリーンアップ
      const currentEvents = get().events;
      const updatedEvents = currentEvents.map(event =>
        event.categoryId === id ? { ...event, categoryId: undefined } : event
      );
      set({ events: updatedEvents });
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
    // Business Hours Mode Implementation
    updateBusinessHoursSettings: (settings: BusinessHoursSettings) => {
      set({ businessHoursSettings: settings });
      get().actions._persistBusinessHoursSettings();
      
      if (settings.enabled) {
        get().actions.initializeBusinessHoursInterval();
        get().actions.checkBusinessHoursStatus();
      } else {
        get().actions.cleanupBusinessHoursInterval();
      }
    },
    toggleBusinessHours: () => {
      const current = get().businessHoursSettings;
      if (current) {
        get().actions.updateBusinessHoursSettings({ ...current, enabled: !current.enabled });
      } else {
        // Create default settings
        const defaultSettings: BusinessHoursSettings = {
          enabled: true,
          workStart: '09:00',
          workEnd: '18:00',
          defaultTaskName: 'その他の業務',
          autoStopOutsideHours: true,
        };
        get().actions.updateBusinessHoursSettings(defaultSettings);
      }
    },
    checkBusinessHoursStatus: () => {
      const settings = get().businessHoursSettings;
      if (!settings || !settings.enabled) return;
      
      const wasWithinHours = get().businessHoursState.isWithinBusinessHours;
      const isWithinHours = get().actions.isWithinBusinessHours();
      
      set({
        businessHoursState: {
          ...get().businessHoursState,
          isWithinBusinessHours: isWithinHours,
          lastCheckTime: Date.now(),
        }
      });
      
      // Handle transitions
      if (isWithinHours && !wasWithinHours) {
        // Just entered business hours
        get().actions.startBusinessHoursTask();
      } else if (!isWithinHours && wasWithinHours && settings.autoStopOutsideHours) {
        // Just left business hours
        const currentEvent = get().events.find(e => e.id === get().currentEventId);
        if (currentEvent && !currentEvent.end && currentEvent.label === settings.defaultTaskName) {
          get().actions.stopCurrentEvent();
        }
      }
    },
    startBusinessHoursTask: () => {
      const settings = get().businessHoursSettings;
      if (!settings || !settings.enabled) return;
      
      const currentEvent = get().events.find(e => e.id === get().currentEventId);
      if (!currentEvent || currentEvent.end) {
        // No active event, start the default business task
        get().actions.startTask(settings.defaultTaskName);
        set({
          businessHoursState: {
            ...get().businessHoursState,
            isBusinessTaskRunning: true,
          }
        });
      }
    },
    isWithinBusinessHours: () => {
      const settings = get().businessHoursSettings;
      if (!settings || !settings.enabled) return false;
      
      try {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = settings.workStart.split(':').map(Number);
        const [endHour, endMin] = settings.workEnd.split(':').map(Number);
        const workStartMinutes = startHour * 60 + startMin;
        const workEndMinutes = endHour * 60 + endMin;
        
        return currentMinutes >= workStartMinutes && currentMinutes < workEndMinutes;
      } catch (error) {
        console.error('[useEventsStore] Error checking business hours:', error);
        return false;
      }
    },
    initializeBusinessHoursInterval: () => {
      // Clean up any existing interval
      get().actions.cleanupBusinessHoursInterval();
      
      // Check immediately
      get().actions.checkBusinessHoursStatus();
      
      // Then check every minute
      const interval = setInterval(() => {
        get().actions.checkBusinessHoursStatus();
      }, 60000); // 1 minute
      
      set({ businessHoursCheckInterval: interval });
    },
    cleanupBusinessHoursInterval: () => {
      const interval = get().businessHoursCheckInterval;
      if (interval) {
        clearInterval(interval);
        set({ businessHoursCheckInterval: null });
      }
    },
    _persistBusinessHoursSettings: () => {
      const { businessHoursSettings, businessHoursState } = get();
      dbSet(BUSINESS_HOURS_SETTINGS_KEY, businessHoursSettings).catch(error => {
        console.error('[useEventsStore] Error persisting business hours settings:', error);
      });
      dbSet(BUSINESS_HOURS_STATE_KEY, businessHoursState).catch(error => {
        console.error('[useEventsStore] Error persisting business hours state:', error);
      });
    },
    _tryRestartBusinessTask: () => {
      const { businessHoursSettings } = get();
      if (shouldAutoRestartBusinessTask(businessHoursSettings)) {
        // Small delay to ensure the previous event is properly closed
        setTimeout(() => {
          get().actions.startBusinessHoursTask();
        }, 100);
      }
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