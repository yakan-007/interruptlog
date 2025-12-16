import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import { Event, FeatureFlags, DueAlertSettings } from '@/types';
import * as idbKeyval from 'idb-keyval';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  clear: vi.fn(),
  keys: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(2, 9)),
}));

describe('useEventsStore', () => {
  beforeEach(async () => {
    // Reset store state before each test (merge to keep actions)
    const initialState: Partial<EventsState> = {
      events: [],
      currentEventId: null,
      previousTaskIdBeforeInterrupt: null,
      myTasks: [],
      categories: [],
      isCategoryEnabled: false,
      isHydrated: false,
      featureFlags: {
        enableTaskPlanning: false,
      },
      dueAlertSettings: {
        warningMinutes: 6 * 60,
        dangerMinutes: 60,
        preset: 'few-hours',
      },
      uiSettings: {
        sortTasksByDueDate: false,
      },
    };
    useEventsStore.setState((state) => ({ ...state, ...initialState }));

    vi.clearAllMocks();
    (idbKeyval.get as vi.Mock).mockResolvedValue(undefined);
    await useEventsStore.getState().actions.hydrate();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state and hydrate', async () => {
    const state = useEventsStore.getState();
    expect(state.events).toEqual([]);
    expect(state.currentEventId).toBeNull();
    expect(state.isHydrated).toBe(true);
    expect(idbKeyval.get).toHaveBeenCalledWith('events-store');
  });

  it('startTask should add a new task event and set it as current', () => {
    const { actions } = useEventsStore.getState();
    const initialEventCount = useEventsStore.getState().events.length;

    actions.startTask('Test Task');

    const { events, currentEventId } = useEventsStore.getState();
    expect(events.length).toBe(initialEventCount + 1);
    const newEvent = events[events.length - 1];
    expect(newEvent.type).toBe('task');
    expect(newEvent.label).toBe('Test Task');
    expect(newEvent.start).toBeTypeOf('number');
    expect(newEvent.end).toBeUndefined();
    expect(currentEventId).toBe(newEvent.id);
    expect(idbKeyval.set).toHaveBeenCalled();
  });

  it('stopCurrentEvent should set end time for the current event and clear currentEventId', () => {
    const { actions, events: initialEvents } = useEventsStore.getState();
    actions.startTask('Task to stop');
    const taskToStopId = useEventsStore.getState().currentEventId;

    vi.useFakeTimers();
    const currentTime = Date.now();
    vi.setSystemTime(new Date(currentTime + 1000)); 

    // Only count writes triggered by this stop sequence
    (idbKeyval.set as vi.Mock).mockClear();

    actions.stopCurrentEvent();

    const { events, currentEventId } = useEventsStore.getState();
    const stoppedEvent = events.find((e: Event) => e.id === taskToStopId);

    expect(stoppedEvent).toBeDefined();
    expect(stoppedEvent?.end).toBeTypeOf('number');
    expect(stoppedEvent?.end).toBe(currentTime + 1000);
    expect(currentEventId).toBeNull();
    // stopCurrentEvent triggers one persist via updateEvent
    expect(idbKeyval.set).toHaveBeenCalledTimes(1);
  });

  it('startInterrupt should stop current task and start an interrupt event', () => {
    const { actions } = useEventsStore.getState();
    actions.startTask('Ongoing Task');
    const ongoingTaskId = useEventsStore.getState().currentEventId;

    actions.startInterrupt('Coffee Break');

    const { events, currentEventId } = useEventsStore.getState();
    const ongoingTask = events.find((e: Event) => e.id === ongoingTaskId);
    const interruptEvent = events.find((e: Event) => e.id === currentEventId);

    expect(ongoingTask?.end).toBeTypeOf('number');
    expect(interruptEvent?.type).toBe('interrupt');
    expect(interruptEvent?.label).toBe('Coffee Break');
    expect(interruptEvent?.end).toBeUndefined();
  });

  it('startBreak should stop current task and start a break event', () => {
    const { actions } = useEventsStore.getState();
    actions.startTask('Work Session');
    const workSessionId = useEventsStore.getState().currentEventId;

    actions.startBreak('Lunch Break');

    const { events, currentEventId } = useEventsStore.getState();
    const workSession = events.find((e: Event) => e.id === workSessionId);
    const breakEvent = events.find((e: Event) => e.id === currentEventId);

    expect(workSession?.end).toBeTypeOf('number');
    expect(breakEvent?.type).toBe('break');
    expect(breakEvent?.label).toBe('Lunch Break');
    expect(breakEvent?.end).toBeUndefined();
  });

   it('should persist to IndexedDB on state change after hydration', async () => {
    const { actions } = useEventsStore.getState();
    expect(useEventsStore.getState().isHydrated).toBe(true);
    (idbKeyval.set as vi.Mock).mockClear();
    
    actions.startTask('Another task');
    
    expect(idbKeyval.set).toHaveBeenCalledTimes(1);
    const lastCallArgs = (idbKeyval.set as vi.Mock).mock.calls[0];
    expect(lastCallArgs[0]).toBe('events-store');
    expect(lastCallArgs[1].events.length).toBe(1);
    expect(lastCallArgs[1].events[0].label).toBe('Another task');
  });

  it('hydrate should load events from IndexedDB', async () => {
    const mockEvents: Event[] = [
      { id: '1', type: 'task', start: Date.now() - 10000, end: Date.now() - 5000, label: 'Past Task' },
    ];
    // Return per-key values
    (idbKeyval.get as vi.Mock).mockImplementation((key: string) => {
      if (key === 'events-store') return Promise.resolve({ events: mockEvents, currentEventId: null });
      if (key === 'mytasks-store') return Promise.resolve([]);
      if (key === 'categories-store') return Promise.resolve(undefined);
      if (key === 'category-enabled') return Promise.resolve(false);
      if (key === 'interrupt-category-settings-store') return Promise.resolve(undefined);
      if (key === 'task-placement-setting') return Promise.resolve(false);
      if (key === 'auto-start-task-setting') return Promise.resolve(false);
      if (key === 'feature-flags-setting') return Promise.resolve(undefined);
      if (key === 'due-alert-settings') return Promise.resolve(undefined);
      if (key === 'ui-settings') return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });
    
    const initialState: Partial<EventsState> = { events: [], currentEventId: null, isHydrated: false };
    useEventsStore.setState((state) => ({ ...state, ...initialState }));
    await useEventsStore.getState().actions.hydrate();

    const state = useEventsStore.getState();
    expect(state.events.length).toBe(1);
    expect(state.events[0].label).toBe('Past Task');
    expect(state.isHydrated).toBe(true);
  });

  it('stopInterruptAndResumePreviousTask should resume with category when enabled', () => {
    const { actions } = useEventsStore.getState();

    // Ensure categories are enabled and pick one
    if (!useEventsStore.getState().isCategoryEnabled) {
      actions.toggleCategoryEnabled();
    }
    const category = useEventsStore.getState().categories[0];

    // Add a task with that category and start it
    actions.addMyTask('CatTask', category.id);
    const task = useEventsStore.getState().myTasks.find(t => t.name === 'CatTask');
    expect(task).toBeDefined();
    actions.startTask('CatTask', task!.id);

    // Start an interrupt then resume
    actions.startInterrupt('Interrupting');
    actions.stopInterruptAndResumePreviousTask();

    const { events } = useEventsStore.getState();
    // Last event should be a resumed task with the same category
    const last = events[events.length - 1];
    expect(last.type).toBe('task');
    expect(last.categoryId).toBe(category.id);
  });

  it('updateEventEndTime should support type change to interrupt with interruptType', () => {
    const { actions } = useEventsStore.getState();

    vi.useFakeTimers();
    const now = Date.now();
    actions.startTask('WillChange');
    // Simulate 10 minutes of work
    vi.setSystemTime(new Date(now + 10 * 60 * 1000));
    const startedId = useEventsStore.getState().currentEventId!;
    actions.stopCurrentEvent();

    const state = useEventsStore.getState();
    const original = state.events.find(e => e.id === startedId)!;
    expect(original.end).toBeDefined();

    const newEndTime = (original.end as number) - 60 * 1000; // -1min (ensures > start)
    actions.updateEventEndTime(original.id, newEndTime, undefined, 'interrupt', 'Changed', undefined, '電話');

    const updated = useEventsStore.getState().events.find(e => e.id === original.id)!;
    expect(updated.type).toBe('interrupt');
    expect(updated.label).toBe('Changed');
    expect(updated.interruptType).toBe('電話');
  });

  it('updateEventEndTime creates a gap event when reducing by >= 1 minute', () => {
    const { actions } = useEventsStore.getState();
    vi.useFakeTimers();
    const now = Date.now();
    actions.startTask('WithGap');
    // Let it run 6 minutes
    vi.setSystemTime(new Date(now + 6 * 60 * 1000));
    const id = useEventsStore.getState().currentEventId!;
    actions.stopCurrentEvent();
    const { events } = useEventsStore.getState();
    const index = events.findIndex(e => e.id === id);
    const evt = events[index]!;

    const newEndTime = (evt.end as number) - 5 * 60 * 1000; // -5min
    actions.updateEventEndTime(evt.id, newEndTime, '不明なアクティビティ');

    const { events: after } = useEventsStore.getState();
    // Updated event stays at index, gap inserted at index+1
    const updatedEvt = after[index];
    const gapEvt = after[index + 1];
    expect(updatedEvt.end).toBe(newEndTime);
    expect(gapEvt).toBeDefined();
    expect(gapEvt.label).toBe('不明なアクティビティ');
    expect(gapEvt.meta?.isUnknownActivity).toBe(true);
  });

  it('reorderMyTasks persistence is debounced', async () => {
    const { actions } = useEventsStore.getState();
    // Add tasks
    actions.addMyTask('A');
    actions.addMyTask('B');
    
    // Clear mock calls before measuring persistence
    (idbKeyval.set as vi.Mock).mockClear();

    vi.useFakeTimers();
    const firstTask = useEventsStore.getState().myTasks[0];
    actions.reorderMyTasks(firstTask.id, 1);

    // Immediately no write yet (debounced)
    expect((idbKeyval.set as vi.Mock).mock.calls.length).toBe(0);

    // After debounce window, one write for MY_TASKS should occur
    vi.advanceTimersByTime(500); // TIME_THRESHOLDS.AUTO_SAVE_DEBOUNCE_MS
    expect((idbKeyval.set as vi.Mock).mock.calls.length).toBe(1);
    const [key] = (idbKeyval.set as vi.Mock).mock.calls[0];
    expect(key).toBe('mytasks-store');
    vi.useRealTimers();
  });

  it('explicitly stopped event should not auto-resume after hydration', async () => {
    const { actions } = useEventsStore.getState();

    // Start and stop a task
    actions.startTask('StopAndReload');
    const startedId = useEventsStore.getState().currentEventId!;
    actions.stopCurrentEvent();

    // Capture the last persisted events-store payload
    const calls = (idbKeyval.set as vi.Mock).mock.calls;
    const lastEventsSet = [...calls].reverse().find(([key]) => key === 'events-store');
    expect(lastEventsSet).toBeDefined();
    const persisted = lastEventsSet![1];
    expect(persisted.currentEventId).toBeNull();

    // Simulate reload: reset store, then hydrate from persisted value
    (idbKeyval.get as vi.Mock).mockImplementation((key: string) => {
      if (key === 'events-store') return Promise.resolve(persisted);
      if (key === 'mytasks-store') return Promise.resolve([]);
      if (key === 'categories-store') return Promise.resolve(undefined);
      if (key === 'category-enabled') return Promise.resolve(false);
      if (key === 'interrupt-category-settings-store') return Promise.resolve(undefined);
      if (key === 'task-placement-setting') return Promise.resolve(false);
      if (key === 'auto-start-task-setting') return Promise.resolve(false);
      if (key === 'feature-flags-setting') return Promise.resolve(undefined);
      if (key === 'due-alert-settings') return Promise.resolve(undefined);
      if (key === 'ui-settings') return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    useEventsStore.setState((state) => ({
      ...state,
      events: [],
      currentEventId: null,
      previousTaskIdBeforeInterrupt: null,
      isHydrated: false,
    }));
    await useEventsStore.getState().actions.hydrate();

    const state = useEventsStore.getState();
    expect(state.currentEventId).toBeNull();
    const ended = state.events.find(e => e.id === startedId);
    expect(ended?.end).toBeTypeOf('number');
  });

  it('changing event type clears irrelevant fields', () => {
    const { actions } = useEventsStore.getState();

    // Create an interrupt with details
    vi.useFakeTimers();
    const now = Date.now();
    actions.startInterrupt({ label: 'Int', who: 'A', interruptType: '電話', urgency: 'High' });
    vi.setSystemTime(new Date(now + 5 * 60 * 1000));
    const intId = useEventsStore.getState().currentEventId!;
    actions.stopCurrentEvent();

    const original = useEventsStore.getState().events.find(e => e.id === intId)!;
    const newEnd = original.end!; // keep same end to avoid gap
    actions.updateEventEndTime(original.id, newEnd, undefined, 'task', 'Back to task');

    const updated = useEventsStore.getState().events.find(e => e.id === original.id)!;
    expect(updated.type).toBe('task');
    expect((updated as any).who).toBeUndefined();
    expect((updated as any).interruptType).toBeUndefined();
    expect((updated as any).urgency).toBeUndefined();
  });

  it('startTask captures planning snapshot when feature enabled', () => {
    const { actions } = useEventsStore.getState();
    actions.setFeatureFlag('enableTaskPlanning', true);
    actions.addMyTask('Planned Task', undefined, {
      planning: {
        plannedDurationMinutes: 90,
        dueAt: new Date('2025-01-10T12:00:00').getTime(),
      },
    });

    const task = useEventsStore.getState().myTasks.find(t => t.name === 'Planned Task');
    expect(task).toBeDefined();

    actions.startTask('Planned Task', task!.id);

    const { events, currentEventId } = useEventsStore.getState();
    const running = events.find(event => event.id === currentEventId)!;
    expect(running.meta?.planningSnapshot?.plannedDurationMinutes).toBe(90);
    expect(running.meta?.planningSnapshot?.dueAt).toBeDefined();
  });

  it('updateMyTaskMetadata synchronizes active event meta and trimming', () => {
    const { actions } = useEventsStore.getState();
    actions.setFeatureFlag('enableTaskPlanning', true);
    actions.addMyTask('Meta Task');
    const task = useEventsStore.getState().myTasks[0];
    actions.startTask('Meta Task', task.id);

    actions.updateMyTaskPlanning(task.id, {
      planning: {
        plannedDurationMinutes: 120,
        dueAt: new Date('2025-01-12T09:00:00').getTime(),
      },
    });

    const updatedTask = useEventsStore.getState().myTasks.find(t => t.id === task.id)!;
    expect(updatedTask.planning?.plannedDurationMinutes).toBe(120);
    expect(updatedTask.planning?.dueAt).toBeDefined();

    const { events, currentEventId } = useEventsStore.getState();
    const running = events.find(event => event.id === currentEventId)!;
    expect(running.meta?.planningSnapshot?.plannedDurationMinutes).toBe(120);
    expect(running.meta?.planningSnapshot?.dueAt).toBeDefined();
  });

  it('setFeatureFlag persists feature flags to storage', () => {
    const { actions } = useEventsStore.getState();
    (idbKeyval.set as vi.Mock).mockClear();
    actions.setFeatureFlag('enableTaskPlanning', true);
    expect(idbKeyval.set).toHaveBeenCalled();
    const featureCall = (idbKeyval.set as vi.Mock).mock.calls.find(
      ([key]) => key === 'feature-flags-setting'
    );
    expect(featureCall).toBeDefined();
    const [, payload] = featureCall as [string, FeatureFlags];
    expect(payload.enableTaskPlanning).toBe(true);
  });

  it('setDueAlertPreset updates settings and persists', () => {
    const { actions } = useEventsStore.getState();
    (idbKeyval.set as vi.Mock).mockClear();

    actions.setDueAlertPreset('tight');

    const state = useEventsStore.getState();
    expect(state.dueAlertSettings.preset).toBe('tight');
    expect(state.dueAlertSettings.dangerMinutes).toBe(30);

    const dueAlertCall = (idbKeyval.set as vi.Mock).mock.calls.find(
      ([key]) => key === 'due-alert-settings'
    );
    expect(dueAlertCall).toBeDefined();
    const [, payload] = dueAlertCall as [string, DueAlertSettings];
    expect(payload.preset).toBe('tight');
  });

  it('toggleSortTasksByDueDate updates ui settings', () => {
    const { actions } = useEventsStore.getState();
    (idbKeyval.set as vi.Mock).mockClear();

    actions.toggleSortTasksByDueDate();

    const state = useEventsStore.getState();
    expect(state.uiSettings.sortTasksByDueDate).toBe(true);

    const uiCall = (idbKeyval.set as vi.Mock).mock.calls.find(([key]) => key === 'ui-settings');
    expect(uiCall).toBeDefined();
    const [, payload] = uiCall as [string, { sortTasksByDueDate: boolean }];
    expect(payload.sortTasksByDueDate).toBe(true);
  });

}); 
