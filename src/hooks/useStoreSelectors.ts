import { useMemo } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Event, MyTask, Category } from '@/types';

// Optimized selectors to prevent unnecessary re-renders

export function useEvents() {
  return useEventsStore(state => state.events);
}

export function useMyTasks() {
  return useEventsStore(state => state.myTasks);
}

export function useCategories() {
  return useEventsStore(state => state.categories);
}

export function useActiveEvent() {
  const currentEventId = useEventsStore(state => state.currentEventId);
  const events = useEventsStore(state => state.events);
  
  return useMemo(() => 
    currentEventId ? events.find(e => e.id === currentEventId) : undefined,
    [currentEventId, events]
  );
}

export function useSortedTasks() {
  const myTasks = useEventsStore(state => state.myTasks);
  
  return useMemo(() => 
    [...myTasks].sort((a, b) => a.order - b.order),
    [myTasks]
  );
}

export function useTaskById(taskId: string) {
  const myTasks = useEventsStore(state => state.myTasks);
  
  return useMemo(() => 
    myTasks.find(task => task.id === taskId),
    [myTasks, taskId]
  );
}

export function useCategoryById(categoryId: string | undefined) {
  const categories = useEventsStore(state => state.categories);
  
  return useMemo(() => 
    categoryId ? categories.find(cat => cat.id === categoryId) : undefined,
    [categories, categoryId]
  );
}

export function useEventsByType<T extends Event['type']>(type: T) {
  const events = useEventsStore(state => state.events);
  
  return useMemo(() => 
    events.filter(event => event.type === type) as Extract<Event, { type: T }>[],
    [events, type]
  );
}

export function useCompletedTasks() {
  const myTasks = useEventsStore(state => state.myTasks);
  
  return useMemo(() => 
    myTasks.filter(task => task.isCompleted),
    [myTasks]
  );
}

export function useActiveTasks() {
  const myTasks = useEventsStore(state => state.myTasks);
  
  return useMemo(() => 
    myTasks.filter(task => !task.isCompleted),
    [myTasks]
  );
}

export function useTasksWithCategory() {
  const myTasks = useEventsStore(state => state.myTasks);
  const categories = useEventsStore(state => state.categories);
  
  return useMemo(() => 
    myTasks.map(task => ({
      ...task,
      category: task.categoryId ? categories.find(cat => cat.id === task.categoryId) : undefined
    })),
    [myTasks, categories]
  );
}

export function useEventsToday() {
  const events = useEventsStore(state => state.events);
  
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate < tomorrow;
    });
  }, [events]);
}

export function useTaskDuration(taskId: string) {
  const events = useEventsStore(state => state.events);
  
  return useMemo(() => 
    events
      .filter(event => event.type === 'task' && event.meta?.myTaskId === taskId && event.end)
      .reduce((total, event) => total + (event.end! - event.start), 0),
    [events, taskId]
  );
}

export function useLastCompletedEvent() {
  const events = useEventsStore(state => state.events);
  
  return useMemo(() => 
    [...events].reverse().find(event => event.end !== undefined),
    [events]
  );
}

// Settings selectors
export function useIsCategoryEnabled() {
  return useEventsStore(state => state.isCategoryEnabled);
}

export function useAddTaskToTop() {
  return useEventsStore(state => state.addTaskToTop);
}

export function useAutoStartTask() {
  return useEventsStore(state => state.autoStartTask);
}

export function useInterruptCategorySettings() {
  return useEventsStore(state => state.interruptCategorySettings);
}

// Actions selector (stable reference)
export function useStoreActions() {
  return useEventsStore(state => state.actions);
}

// Hydration state
export function useIsHydrated() {
  return useEventsStore(state => state.isHydrated);
}

// Combined selectors for specific use cases
export function useTaskManagement() {
  const myTasks = useSortedTasks();
  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const autoStartTask = useAutoStartTask();
  const actions = useStoreActions();
  
  return {
    myTasks,
    categories,
    isCategoryEnabled,
    autoStartTask,
    actions,
  };
}

export function useEventHistory() {
  const events = useEvents();
  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const lastCompletedEvent = useLastCompletedEvent();
  
  return {
    events,
    categories,
    isCategoryEnabled,
    lastCompletedEvent,
  };
}

export function useCurrentSession() {
  const activeEvent = useActiveEvent();
  const currentEventId = useEventsStore(state => state.currentEventId);
  const previousTaskIdBeforeInterrupt = useEventsStore(state => state.previousTaskIdBeforeInterrupt);
  
  return {
    activeEvent,
    currentEventId,
    previousTaskIdBeforeInterrupt,
    isActive: !!activeEvent && !activeEvent.end,
  };
}