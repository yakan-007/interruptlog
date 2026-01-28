import { StateCreator } from 'zustand';
import { Event, MyTask, Category, InterruptCategorySettings, TaskPlanning, FeatureFlags, DueAlertSettings, UiSettings, TaskLifecycleRecord, ArchivedTask } from '@/types';

export interface EventsActions {
  hydrate: () => Promise<void>;
  startTask: (label?: string, myTaskId?: string) => void;
  stopCurrentEvent: () => void;
  startInterrupt: (data?: string | { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => void;
  updateInterruptDetails: (data: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => void;
  stopInterruptAndResumePreviousTask: () => void;
  startBreak: (data?: string | { label?: string; breakType?: Event['breakType']; breakDurationMinutes?: Event['breakDurationMinutes'] }) => void;
  stopBreakAndResumePreviousTask: () => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  updateEventEndTime: (
    eventId: string,
    newEndTime: number,
    gapActivityName?: string,
    newEventType?: Event['type'],
    newLabel?: string,
    newCategoryId?: string,
    interruptType?: string,
    createGapEvent?: boolean
  ) => void;
  updateEventTimeRange: (
    eventId: string,
    newStartTime: number,
    newEndTime: number,
    gapActivityName?: string,
    newEventType?: Event['type'],
    newLabel?: string,
    newCategoryId?: string | null,
    interruptType?: string,
    createGapEvent?: boolean,
    extra?: {
      who?: string;
      memo?: string;
      myTaskId?: string | null;
      breakType?: Event['breakType'];
      breakDurationMinutes?: Event['breakDurationMinutes'];
    }
  ) => void;
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
  restoreArchivedTask: (taskId: string) => void;
  deleteArchivedTask: (taskId: string) => void;
  toggleMyTaskCompletion: (taskId: string) => void;
  setMyTaskCompletion: (taskId: string, completed: boolean) => void;
  reorderMyTasks: (taskId: string, newOrder: number) => void;
  getTaskTotalDuration: (taskId: string) => number;
  cancelCurrentInterruptAndResumeTask: () => void;
  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, name: string, color: string) => void;
  removeCategory: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  toggleCategoryEnabled: () => void;
  addInterruptContact: (value: string) => void;
  removeInterruptContact: (value: string) => void;
  addInterruptSubject: (value: string) => void;
  removeInterruptSubject: (value: string) => void;
  updateInterruptCategoryName: (categoryId: keyof InterruptCategorySettings, name: string) => void;
  resetInterruptCategoryToDefault: (categoryId: keyof InterruptCategorySettings) => void;
  resetAllInterruptCategoriesToDefault: () => void;
  toggleTaskPlacement: () => void;
  toggleAutoStartTask: () => void;
  setFeatureFlag: (flag: keyof FeatureFlags, value: boolean) => void;
  toggleFeatureFlag: (flag: keyof FeatureFlags) => void;
  setDueAlertPreset: (preset: DueAlertSettings['preset']) => void;
  setDueAlertSettings: (settings: DueAlertSettings) => void;
  toggleSortTasksByDueDate: () => void;
  setSortTasksByDueDate: (value: boolean) => void;
}

export interface EventsState {
  events: Event[];
  currentEventId: string | null;
  previousTaskIdBeforeInterrupt: string | null;
  myTasks: MyTask[];
  taskLedger: Record<string, TaskLifecycleRecord>;
  categories: Category[];
  archivedTasks: ArchivedTask[];
  isCategoryEnabled: boolean;
  interruptCategorySettings: InterruptCategorySettings;
  interruptContacts: string[];
  interruptSubjects: string[];
  addTaskToTop: boolean;
  autoStartTask: boolean;
  isHydrated: boolean;
  featureFlags: FeatureFlags;
  dueAlertSettings: DueAlertSettings;
  uiSettings: UiSettings;
  actions: EventsActions;
}

export type EventsStoreCreator = StateCreator<EventsState, [], []>;
export type StoreSet = Parameters<EventsStoreCreator>[0];
export type StoreGet = Parameters<EventsStoreCreator>[1];
