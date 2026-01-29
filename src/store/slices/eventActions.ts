import { v4 as uuidv4 } from 'uuid';
import { Event } from '@/types';
import {
  hydrateEventsData,
  hydrateTasksData,
  hydrateCategoriesData,
  hydrateSettingsData,
} from '../hydrationHelpers';
import {
  updateEventWithTimeChange,
  insertEventWithGap,
  createGapEvent,
  clearTypeSpecificFields,
  GAP_MIN_MS,
} from '../eventHelpers';
import { getCategoryFromTask } from '../categoryHelpers';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';
import { SliceContext } from './shared';

type EventActionKeys =
  | 'hydrate'
  | 'startTask'
  | 'stopCurrentEvent'
  | 'startInterrupt'
  | 'updateInterruptDetails'
  | 'stopInterruptAndResumePreviousTask'
  | 'startBreak'
  | 'stopBreakAndResumePreviousTask'
  | 'addEvent'
  | 'updateEvent'
  | 'updateEventEndTime'
  | 'updateEventTimeRange'
  | 'setEvents'
  | 'setCurrentEventId'
  | 'cancelCurrentInterruptAndResumeTask';

export const createEventActions = ({
  set,
  get,
  persist,
  getActions,
}: SliceContext): Pick<import('../types').EventsActions, EventActionKeys> => {
  const {
    persistEventsState,
  } = persist;

  return {
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
          proAccess: false,
          dueAlertSettings: {
            warningMinutes: 6 * 60,
            dangerMinutes: 60,
            preset: 'few-hours',
          },
          uiSettings: {
            sortTasksByDueDate: false,
          },
          isHydrated: false,
        });
      }

      set({ isHydrated: true });
      if (typeof window !== 'undefined') {
        (window as any).__eventStoreHydrating = false;
      }
    },

    startTask: (label?: string, myTaskId?: string) => {
      const actions = getActions();
      const { myTasks, isCategoryEnabled, featureFlags } = get();
      const currentRunningEvent = get().events.find(e => e.id === get().currentEventId);
      if (currentRunningEvent && !currentRunningEvent.end) {
        actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }
      set({ previousTaskIdBeforeInterrupt: null });

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
      actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });

      if (myTaskId) {
        const taskToStart = get().myTasks.find(t => t.id === myTaskId);
        if (taskToStart && taskToStart.isCompleted) {
          actions.toggleMyTaskCompletion(myTaskId);
        }
      }
    },

    stopCurrentEvent: () => {
      const actions = getActions();
      const { events, currentEventId } = get();
      if (!currentEventId) {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        return;
      }
      const eventToEnd = events.find(e => e.id === currentEventId);
      if (eventToEnd && !eventToEnd.end) {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        actions.updateEvent({ ...eventToEnd, end: Date.now() });
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
    },

    startInterrupt: (data?: string | { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => {
      const actions = getActions();
      const { events, currentEventId } = get();
      let previousActiveEventId: string | null = null;

      const currentRunningEvent = events.find(e => e.id === currentEventId);
      if (currentRunningEvent && !currentRunningEvent.end) {
        if (currentRunningEvent.type === 'task') {
          previousActiveEventId = currentRunningEvent.id;
        }
        actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }

      set({ previousTaskIdBeforeInterrupt: previousActiveEventId });

      const payload = typeof data === 'string' ? { label: data } : (data || {});

      if (payload.who) {
        actions.addInterruptContact(payload.who);
      }
      const newEvent: Event = {
        id: uuidv4(),
        type: 'interrupt',
        label: payload.label || 'Interrupt',
        start: Date.now(),
        categoryId: undefined,
        who: payload.who,
        interruptType: payload.interruptType,
        urgency: payload.urgency,
      };
      actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },

    updateInterruptDetails: (data: { label?: string; who?: string; interruptType?: string; urgency?: 'Low' | 'Medium' | 'High' }) => {
      const actions = getActions();
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
            actions.addInterruptContact(data.who);
          }
          actions.updateEvent(updatedEvent);
        } else {
          console.warn('[useEventsStore] updateInterruptDetails: No active interrupt event found to update.');
        }
      }
    },

    stopInterruptAndResumePreviousTask: () => {
      const actions = getActions();
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks, isCategoryEnabled } = get();

      if (currentEventId) {
        const interruptToEnd = events.find(e => e.id === currentEventId && e.type === 'interrupt');
        if (interruptToEnd && !interruptToEnd.end) {
          actions.updateEvent({ ...interruptToEnd, end: Date.now() });
        }
      }

      if (previousTaskIdBeforeInterrupt) {
        const taskEventToResume = events.find(e => e.id === previousTaskIdBeforeInterrupt && e.type === 'task');
        if (taskEventToResume) {
          const myTaskDetails = get().myTasks.find(mt => mt.id === taskEventToResume.meta?.myTaskId);
          const categoryId = taskEventToResume.categoryId
            || getCategoryFromTask(taskEventToResume.meta?.myTaskId, myTasks, isCategoryEnabled);

          const newResumedTaskEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: taskEventToResume.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            categoryId,
            meta: taskEventToResume.meta,
          };
          actions.addEvent(newResumedTaskEvent);
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
      const actions = getActions();
      const { currentEventId, events } = get();
      const currentRunningEvent = events.find(e => e.id === currentEventId);

      if (currentRunningEvent && !currentRunningEvent.end) {
        if (currentRunningEvent.type === 'task') {
          set({ previousTaskIdBeforeInterrupt: currentEventId });
        }
        actions.updateEvent({ ...currentRunningEvent, end: Date.now() });
      }

      const payload = typeof data === 'string' ? { label: data } : (data || {});

      const newEvent: Event = {
        id: uuidv4(),
        type: 'break',
        label: payload.label || 'Break',
        start: Date.now(),
        categoryId: undefined,
        breakType: payload.breakType,
        breakDurationMinutes: payload.breakDurationMinutes,
      };
      actions.addEvent(newEvent);
      set({ currentEventId: newEvent.id });
    },

    stopBreakAndResumePreviousTask: () => {
      const actions = getActions();
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks, isCategoryEnabled } = get();
      if (currentEventId) {
        const breakEvt = events.find(e => e.id === currentEventId && e.type === 'break');
        if (breakEvt && !breakEvt.end) {
          actions.updateEvent({ ...breakEvt, end: Date.now() });
        }
      }
      if (previousTaskIdBeforeInterrupt) {
        const prevTaskEvt = events.find(e => e.id === previousTaskIdBeforeInterrupt && e.type === 'task');
        if (prevTaskEvt) {
          const myTaskDetails = myTasks.find(mt => mt.id === prevTaskEvt.meta?.myTaskId);
          const categoryId = prevTaskEvt.categoryId || getCategoryFromTask(prevTaskEvt.meta?.myTaskId, myTasks, isCategoryEnabled);

          const resumedEvent: Event = {
            id: uuidv4(),
            type: 'task',
            label: prevTaskEvt.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            categoryId,
            meta: prevTaskEvt.meta,
          };
          actions.addEvent(resumedEvent);
          set({ currentEventId: resumedEvent.id, previousTaskIdBeforeInterrupt: null });
        } else {
          set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
        }
      } else {
        set({ currentEventId: null, previousTaskIdBeforeInterrupt: null });
      }
      persistEventsState();
    },

    addEvent: (event: Event) => {
      set(state => {
        const nextEvents = [...state.events, event].sort((a, b) => a.start - b.start);
        return { events: nextEvents };
      });
      persistEventsState();
    },

    updateEvent: (eventToUpdate: Event) => {
      set(state => ({
        events: state.events.map(event => (event.id === eventToUpdate.id ? eventToUpdate : event)),
      }));
      persistEventsState();
    },

    updateEventEndTime: (
      eventId: string,
      newEndTime: number,
      gapActivityName?: string,
      newEventType?: Event['type'],
      newLabel?: string,
      newCategoryId?: string,
      interruptType?: string,
      createGapEvent?: boolean,
    ) => {
      const { events } = get();
      const eventIndex = events.findIndex(event => event.id === eventId);
      const event = events[eventIndex];

      if (!event) {
        console.error('[useEventsStore] Event not found');
        return;
      }

      const nextEvent = events[eventIndex + 1];
      if (nextEvent && newEndTime > nextEvent.start) {
        console.error('[useEventsStore] New end time overlaps with the next event');
        return;
      }

      try {
        const { updatedEvent, gapEvent, shouldCreateGap } = updateEventWithTimeChange(
          event,
          newEndTime,
          gapActivityName,
          newEventType,
          newLabel,
          newCategoryId,
        );
        const finalUpdatedEvent =
          interruptType !== undefined && (newEventType === 'interrupt' || updatedEvent.type === 'interrupt')
            ? { ...updatedEvent, interruptType }
            : updatedEvent;

        const allowGapCreation = createGapEvent !== false;

        if (shouldCreateGap && gapEvent && allowGapCreation) {
          const newEvents = insertEventWithGap(events, eventIndex, finalUpdatedEvent, gapEvent);
          set({ events: newEvents });
        } else {
          set(state => ({
            events: state.events.map(e => (e.id === finalUpdatedEvent.id ? finalUpdatedEvent : e)),
          }));
        }

        persistEventsState();
      } catch (error) {
        console.error('[useEventsStore] Error updating event end time:', error);
      }
    },

    updateEventTimeRange: (
      eventId: string,
      newStartTime: number,
      newEndTime: number,
      gapActivityName?: string,
      newEventType?: Event['type'],
      newLabel?: string,
      newCategoryId?: string | null,
      interruptType?: string,
      createGapEventOption?: boolean,
      extra?: {
        who?: string;
        memo?: string;
        myTaskId?: string | null;
        breakType?: Event['breakType'];
        breakDurationMinutes?: Event['breakDurationMinutes'];
      },
    ) => {
      const { events } = get();
      const eventIndex = events.findIndex(event => event.id === eventId);
      const event = events[eventIndex];

      if (!event) {
        console.error('[useEventsStore] Event not found');
        return;
      }

      if (newStartTime >= newEndTime) {
        console.error('[useEventsStore] Start time must be before end time');
        return;
      }

      if (newEndTime > Date.now()) {
        console.error('[useEventsStore] End time cannot be in the future');
        return;
      }

      const sortedEvents = [...events].sort((a, b) => a.start - b.start);
      const sortedIndex = sortedEvents.findIndex(e => e.id === eventId);
      const prevEvent = sortedEvents[sortedIndex - 1];
      const nextEvent = sortedEvents[sortedIndex + 1];

      if (prevEvent) {
        const prevEnd = prevEvent.end ?? prevEvent.start;
        if (prevEnd > newStartTime) {
          console.error('[useEventsStore] New start time overlaps previous event');
          return;
        }
      }

      if (nextEvent && newEndTime > nextEvent.start) {
        console.error('[useEventsStore] New end time overlaps next event');
        return;
      }

      const typeToApply = newEventType ?? event.type;
      let updatedEvent: Event = clearTypeSpecificFields(event, typeToApply);
      updatedEvent = {
        ...updatedEvent,
        type: typeToApply,
        start: newStartTime,
        end: newEndTime,
        ...(newLabel !== undefined && { label: newLabel.trim() ? newLabel.trim() : undefined }),
        ...(newCategoryId !== undefined && { categoryId: newCategoryId ?? undefined }),
      } as Event;

      if (typeToApply !== 'task') {
        updatedEvent.categoryId = undefined;
      }

      if (typeToApply === 'interrupt') {
        updatedEvent.interruptType = interruptType ?? updatedEvent.interruptType;
        if (extra?.who !== undefined) {
          updatedEvent.who = extra.who.trim() ? extra.who.trim() : undefined;
        }
      } else {
        updatedEvent.interruptType = undefined;
        updatedEvent.who = undefined;
      }

      if (extra?.memo !== undefined) {
        updatedEvent.memo = extra.memo.trim() ? extra.memo.trim() : undefined;
      }

      if (typeToApply === 'task' && extra?.myTaskId !== undefined) {
        const nextMeta = updatedEvent.meta ? { ...updatedEvent.meta } : {};
        if (extra.myTaskId) {
          nextMeta.myTaskId = extra.myTaskId;
        } else {
          delete nextMeta.myTaskId;
        }
        updatedEvent.meta = Object.keys(nextMeta).length > 0 ? nextMeta : undefined;
      }

      if (
        typeToApply === 'task' &&
        updatedEvent.meta?.isUnknownActivity &&
        (newLabel !== undefined || newCategoryId !== undefined || extra?.myTaskId !== undefined)
      ) {
        const nextMeta = { ...updatedEvent.meta };
        delete nextMeta.isUnknownActivity;
        updatedEvent.meta = Object.keys(nextMeta).length > 0 ? nextMeta : undefined;
      }

      if (typeToApply === 'break') {
        if (extra?.breakType !== undefined) {
          updatedEvent.breakType = extra.breakType;
        }
        if (extra?.breakDurationMinutes !== undefined) {
          updatedEvent.breakDurationMinutes = extra.breakDurationMinutes;
        }
      } else {
        updatedEvent.breakType = undefined;
        updatedEvent.breakDurationMinutes = undefined;
      }

      const shouldCreateGap =
        createGapEventOption !== false &&
        event.end !== undefined &&
        newEndTime < event.end &&
        event.end - newEndTime >= GAP_MIN_MS;

      const nextEventsWithoutCurrent = events.filter(e => e.id !== event.id);
      const updatedList = [...nextEventsWithoutCurrent, updatedEvent];

      if (shouldCreateGap) {
        const gapEvent = createGapEvent({
          originalEvent: event,
          newEndTime,
          gapActivityName,
        });
        updatedList.push(gapEvent);
      }

      const finalEvents = updatedList.sort((a, b) => a.start - b.start);
      set({ events: finalEvents });
      persistEventsState();
    },

    setEvents: (events: Event[]) => {
      set({ events });
      persistEventsState();
    },

    setCurrentEventId: (id: string | null) => {
      set({ currentEventId: id });
      if (id === null && !get().previousTaskIdBeforeInterrupt) {
        set({ previousTaskIdBeforeInterrupt: null });
      }
      persistEventsState();
    },

    cancelCurrentInterruptAndResumeTask: () => {
      const actions = getActions();
      const { events, currentEventId, previousTaskIdBeforeInterrupt, myTasks, isCategoryEnabled } = get();
      let updatedEvents = events;
      let resumedEvent: Event | null = null;

      if (currentEventId) {
        const interruptToCancel = events.find(e => e.id === currentEventId && e.type === 'interrupt' && !e.end);
        if (interruptToCancel) {
          const now = Date.now();
          const duration = now - interruptToCancel.start;
          const placeholderEvent: Event | null = duration > 0
            ? {
                id: uuidv4(),
                type: 'task',
                label: '未分類の時間',
                start: interruptToCancel.start,
                end: now,
                meta: { isUnknownActivity: true },
              }
            : null;

          updatedEvents = events.filter(event => event.id !== interruptToCancel.id);
          if (placeholderEvent) {
            updatedEvents = [...updatedEvents, placeholderEvent].sort((a, b) => a.start - b.start);
          }
        }
      }

      if (previousTaskIdBeforeInterrupt) {
        const taskEventToResume = events.find(e => e.id === previousTaskIdBeforeInterrupt && e.type === 'task');
        if (taskEventToResume) {
          const myTaskDetails = myTasks.find(mt => mt.id === taskEventToResume.meta?.myTaskId);
          const derivedCategoryId = taskEventToResume.categoryId
            || getCategoryFromTask(taskEventToResume.meta?.myTaskId, myTasks, isCategoryEnabled);

          resumedEvent = {
            id: uuidv4(),
            type: 'task',
            label: taskEventToResume.label || myTaskDetails?.name || 'Resumed Task',
            start: Date.now(),
            categoryId: derivedCategoryId,
            meta: taskEventToResume.meta,
          };

          updatedEvents = [...updatedEvents, resumedEvent].sort((a, b) => a.start - b.start);
        }
      }

      set({
        events: updatedEvents,
        currentEventId: resumedEvent ? resumedEvent.id : null,
        previousTaskIdBeforeInterrupt: null,
      });
      persistEventsState();
    },
  };
};
