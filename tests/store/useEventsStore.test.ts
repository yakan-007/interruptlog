import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import { Event } from '@/types';
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
    // Reset store state before each test
    const initialState: Partial<EventsState> = {
      events: [],
      currentEventId: null,
      isHydrated: false,
    };
    useEventsStore.setState(initialState as EventsState, true);
    
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

    actions.stopCurrentEvent();

    const { events, currentEventId } = useEventsStore.getState();
    const stoppedEvent = events.find((e: Event) => e.id === taskToStopId);

    expect(stoppedEvent).toBeDefined();
    expect(stoppedEvent?.end).toBeTypeOf('number');
    expect(stoppedEvent?.end).toBe(currentTime + 1000);
    expect(currentEventId).toBeNull();
    expect(idbKeyval.set).toHaveBeenCalledTimes(initialEvents.length === 0 ? 2:3);
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
    (idbKeyval.get as vi.Mock).mockResolvedValue({ events: mockEvents, currentEventId: null });
    
    const initialState: Partial<EventsState> = { events: [], currentEventId: null, isHydrated: false };
    useEventsStore.setState(initialState as EventsState, true);
    await useEventsStore.getState().actions.hydrate();

    const state = useEventsStore.getState();
    expect(state.events.length).toBe(1);
    expect(state.events[0].label).toBe('Past Task');
    expect(state.isHydrated).toBe(true);
  });

}); 