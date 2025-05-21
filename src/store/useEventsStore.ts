import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Event, MyTask } from '@/types';
import { dbGet, dbSet } from '@/lib/db';

const EVENTS_STORE_KEY = 'events-store';
const MY_TASKS_STORE_KEY = 'mytasks-store';

// Helper to sort tasks by order
const sortMyTasks = (tasks: MyTask[]): MyTask[] => tasks.slice().sort((a, b) => a.order - b.order);

// Helper to re-assign order after add/remove/reorder
const reassignOrder = (tasks: MyTask[]): MyTask[] => {
  return tasks.map((task, index) => ({ ...task, order: index }));
};

export interface EventsState {
  events: Event[];
  currentEventId: string | null;
  previousTaskIdBeforeInterrupt: string | null;
  myTasks: MyTask[];
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
    addMyTask: (name: string) => void;
    removeMyTask: (id: string) => void;
    updateMyTask: (id: string, newName: string) => void;
    setMyTasks: (tasks: MyTask[]) => void;
    hydrate: () => Promise<void>;
    toggleMyTaskCompletion: (taskId: string) => void;
    reorderMyTasks: (taskId: string, newOrder: number) => void;
    getTaskTotalDuration: (taskId: string) => number;
    cancelCurrentInterruptAndResumeTask: () => void;
    _persistEventsState: () => void;
    _persistMyTasksState: () => void;
    stopBreakAndResumePreviousTask: () => void;
    discardCurrentEventAndResumePreviousTask: () => void;
    _endCurrentEvent: (eventId?: string | null) => void;
    _resumePreviousTask: (previousTaskId: string | null) => void;
  };
}

const storeCreator: StateCreator<EventsState, [], []> = (set, get) => ({
  events: [],
  currentEventId: null,
  previousTaskIdBeforeInterrupt: null,
  myTasks: [],
  isHydrated: false,
  actions: {
    _endCurrentEvent: (eventId?: string | null) => {
      const targetEventId = eventId || get().currentEventId;
      if (targetEventId) {
        const eventToEnd = get().events.find(e => e.id === targetEventId);
        if (eventToEnd && !eventToEnd.end) {
          get().actions.updateEvent({ ...eventToEnd, end: Date.now() });
        }
      }
    },
    _resumePreviousTask: (previousTaskId: string | null) => {
      if (previousTaskId) {
        const taskEventToResume = get().events.find(e => e.id === previousTaskId && e.type === 'task');
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
          console.warn('[_resumePreviousTask] Previous task event not found:', previousTaskId);
          set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
    },
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
      get().actions._endCurrentEvent();
      set({ previousTaskIdBeforeInterrupt: null });
      
      const newEvent: Event = {
        id: uuidv4(),
        type: 'task',
        label,
        start: Date.now(),
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
      get().actions._endCurrentEvent();
      set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
    },
    startInterrupt: (data?: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => {
      const { events, currentEventId } = get();
      let previousActiveEventId: string | null = null;

      const currentEvent = events.find(e => e.id === currentEventId);
      if (currentEvent && currentEvent.type === 'task' && !currentEvent.end) {
        previousActiveEventId = currentEvent.id;
      }
      get().actions._endCurrentEvent();
      
      set({ previousTaskIdBeforeInterrupt: previousActiveEventId });

      const newEvent: Event = {
        id: uuidv4(),
        type: 'interrupt',
        label: data?.label || '割り込み中...', 
        start: Date.now(),
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
      get().actions._endCurrentEvent();
      get().actions._resumePreviousTask(get().previousTaskIdBeforeInterrupt);
    },
    startBreak: (data: { label?: string; breakType?: Event['breakType']; breakDurationMinutes?: Event['breakDurationMinutes'] }) => {
      const { currentEventId, events } = get();
      const currentEvent = events.find(e => e.id === currentEventId);
      if (currentEvent && currentEvent.type === 'task' && !currentEvent.end) {
        set({ previousTaskIdBeforeInterrupt: currentEvent.id });
      }
      get().actions._endCurrentEvent();

      const newEvent: Event = {
        id: uuidv4(),
        type: 'break',
        label: data.label || 'Break',
        start: Date.now(),
        breakType: data.breakType,
        breakDurationMinutes: data.breakDurationMinutes,
      };
      get().actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },
    stopBreakAndResumePreviousTask: () => {
      get().actions._endCurrentEvent();
      get().actions._resumePreviousTask(get().previousTaskIdBeforeInterrupt);
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
    addMyTask: (name: string) => {
      if (!name.trim()) return;
      const currentTasks = get().myTasks;
      const newTask: MyTask = {
        id: uuidv4(),
        name: name.trim(),
        isCompleted: false,
        order: currentTasks.length,
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
      get().actions._endCurrentEvent();
      get().actions._resumePreviousTask(get().previousTaskIdBeforeInterrupt);
      get().actions._persistEventsState();
    },
    discardCurrentEventAndResumePreviousTask: () => {
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks } = get();
      if (currentEventId) {
        const updatedEvents = events.filter(e => e.id !== currentEventId);
        set({ events: updatedEvents });
      }

      get().actions._resumePreviousTask(previousTaskIdBeforeInterrupt);
      get().actions._persistEventsState();
    },
  },
});

const useEventsStore = create<EventsState>(storeCreator);

if (typeof window !== 'undefined') {
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