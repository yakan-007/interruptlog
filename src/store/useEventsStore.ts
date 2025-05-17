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
  myTasks: MyTask[];
  isHydrated: boolean;
  actions: {
    startTask: (label?: string, myTaskId?: string) => void;
    stopCurrentEvent: () => void;
    startInterrupt: (label?: string) => void;
    startBreak: (label?: string) => void;
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
  };
}

const storeCreator: StateCreator<EventsState, [], []> = (set, get) => ({
  events: [],
  currentEventId: null,
  myTasks: [],
  isHydrated: false,
  actions: {
    hydrate: async () => {
      if (get().isHydrated || (typeof window !== 'undefined' && (window as any).__eventStoreHydrating)) {
        console.log('[useEventsStore] Hydration already in progress or completed. Skipping.');
        return;
      }
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = true;
      }

      console.log('[useEventsStore] Hydration started.');
      if (typeof window === 'undefined') {
        console.log('[useEventsStore] Hydrating on server, setting isHydrated to true.');
        set({ isHydrated: true }); // Server-side hydration, set and return
        if (typeof window !== 'undefined') {
          (window as any).__eventStoreHydrating = false; // Reset flag even on server path if window was defined for some reason
        }
        return;
      }
      try {
        console.log('[useEventsStore] Attempting to load from IndexedDB...');
        const storedEventsState = await dbGet<{ events: Event[]; currentEventId: string | null }>(EVENTS_STORE_KEY);
        if (storedEventsState) {
          console.log('[useEventsStore] Loaded events state:', storedEventsState);
          set({ events: storedEventsState.events, currentEventId: storedEventsState.currentEventId });
        } else {
          console.log('[useEventsStore] No stored events state found in IndexedDB.');
        }
        const storedMyTasks = await dbGet<MyTask[]>(MY_TASKS_STORE_KEY);
        if (storedMyTasks) {
          console.log('[useEventsStore] Loaded myTasks:', storedMyTasks);
          const hydratedTasks = storedMyTasks.map((task, index) => ({
            ...task,
            isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
            order: task.order === undefined ? index : task.order,
          }));
          set({ myTasks: sortMyTasks(hydratedTasks) });
        } else {
          console.log('[useEventsStore] No stored myTasks found in IndexedDB.');
        }
        console.log('[useEventsStore] IndexedDB load successful (or no data).');
      } catch (error) {
        console.error('[useEventsStore] Failed to hydrate from IndexedDB:', error);
      }
      console.log('[useEventsStore] Setting isHydrated to true.');
      set({ isHydrated: true });
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = false;
      }
    },
    startTask: (label?: string, myTaskId?: string) => {
      const currentRunningEvent = get().events.find(e => e.id === get().currentEventId);
      if (currentRunningEvent && !currentRunningEvent.end) {
        get().actions.stopCurrentEvent(); 
      }
      
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
      const { events, currentEventId } = get();
      if (currentEventId) {
        const eventToEnd = events.find(e => e.id === currentEventId);
        if (eventToEnd && !eventToEnd.end) {
          get().actions.updateEvent({ ...eventToEnd, end: Date.now() });
        }
      }
      set({ currentEventId: null });
    },
    startInterrupt: (label?: string) => {
      const currentRunningEvent = get().events.find(e => e.id === get().currentEventId);
      if (currentRunningEvent && currentRunningEvent.type === 'task' && !currentRunningEvent.end) {
        get().actions.stopCurrentEvent();
      }
      const newEvent: Event = {
        id: uuidv4(),
        type: 'interrupt',
        label,
        start: Date.now(),
      };
      get().actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },
    startBreak: (label?: string) => {
      const currentRunningEvent = get().events.find(e => e.id === get().currentEventId);
      if (currentRunningEvent && currentRunningEvent.type === 'task' && !currentRunningEvent.end) {
        get().actions.stopCurrentEvent();
      }
      const newEvent: Event = {
        id: uuidv4(),
        type: 'break',
        label,
        start: Date.now(),
      };
      get().actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },
    addEvent: (event: Event) => {
      set((state: EventsState) => ({ events: [...state.events, event] }));
    },
    updateEvent: (eventToUpdate: Event) => {
      set((state: EventsState) => ({
        events: state.events.map((e: Event) => (e.id === eventToUpdate.id ? eventToUpdate : e)),
      }));
    },
    setEvents: (events: Event[]) => set({ events }),
    setCurrentEventId: (id: string | null) => set({ currentEventId: id }),
    addMyTask: (name: string) => {
      console.log('[useEventsStore] addMyTask called with name:', name);
      if (!name.trim()) {
        console.log('[useEventsStore] addMyTask: name is empty, returning.');
        return;
      }
      const currentTasks = get().myTasks;
      console.log('[useEventsStore] addMyTask: currentTasks:', currentTasks);
      const newTask: MyTask = {
        id: uuidv4(),
        name: name.trim(),
        isCompleted: false,
        order: currentTasks.length,
      };
      console.log('[useEventsStore] addMyTask: newTask:', newTask);
      set({ myTasks: sortMyTasks([...currentTasks, newTask]) });
      console.log('[useEventsStore] addMyTask: state updated. New myTasks:', get().myTasks);
    },
    removeMyTask: (id: string) => {
      const remainingTasks = get().myTasks.filter(task => task.id !== id);
      set({ myTasks: reassignOrder(sortMyTasks(remainingTasks)) });
    },
    updateMyTask: (id: string, newName: string) => {
      if (!newName.trim()) return;
      set((state: EventsState) => ({
        myTasks: sortMyTasks(state.myTasks.map(task =>
          task.id === id ? { ...task, name: newName.trim() } : task
        )),
      }));
    },
    setMyTasks: (tasksToSet: MyTask[]) => {
      const processedTasks = tasksToSet.map((task, index) => ({
        ...task,
        isCompleted: task.isCompleted === undefined ? false : task.isCompleted,
        order: task.order === undefined ? index : task.order,
      }));
      set({ myTasks: sortMyTasks(processedTasks) });
    },
    toggleMyTaskCompletion: (taskId: string) => {
      set((state: EventsState) => ({
        myTasks: sortMyTasks(state.myTasks.map(task =>
          task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
        )),
      }));
    },
    reorderMyTasks: (taskId: string, newOrderInput: number) => {
      let tasks = get().myTasks;
      const taskToMove = tasks.find(t => t.id === taskId);
      if (!taskToMove) return;

      const remainingTasks = tasks.filter(t => t.id !== taskId);
      
      const newOrder = Math.max(0, Math.min(newOrderInput, remainingTasks.length));

      remainingTasks.splice(newOrder, 0, taskToMove);
      
      set({ myTasks: reassignOrder(remainingTasks) });
    },
  },
});

const useEventsStore: UseBoundStore<StoreApi<EventsState>> = create<EventsState>(storeCreator);

useEventsStore.subscribe(
  (state) => {
    if (state.isHydrated && typeof window !== 'undefined') {
      const tasksToSave = sortMyTasks(state.myTasks);
      console.log('[useEventsStore subscribe] Saving events to IndexedDB:', { events: state.events, currentEventId: state.currentEventId });
      dbSet(EVENTS_STORE_KEY, { events: state.events, currentEventId: state.currentEventId });
      console.log('[useEventsStore subscribe] Saving myTasks to IndexedDB:', tasksToSave);
      dbSet(MY_TASKS_STORE_KEY, tasksToSave)
        .then(() => console.log('[useEventsStore subscribe] myTasks successfully saved to IndexedDB.'))
        .catch(err => console.error('[useEventsStore subscribe] Error saving myTasks to IndexedDB:', err));
    } else {
      // console.log('[useEventsStore subscribe] Not saving to DB. isHydrated:', state.isHydrated, 'typeof window:', typeof window);
    }
  }
);

// if (typeof window !== 'undefined') {
//   useEventsStore.getState().actions.hydrate();
// }

export default useEventsStore; 