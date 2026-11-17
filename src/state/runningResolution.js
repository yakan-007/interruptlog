import { buildManualResolutionPreview, eventsOverlap, sortEventsByWindow } from './resolution';

/**
 * Manual history edits may land inside the task that is running right now
 * ("the phone rang 20 minutes ago"). The running session is treated as if it
 * ended now, the edit is resolved against it like any closed record, and the
 * piece that still reaches `now` becomes the running session again — so the
 * timer keeps going without the user stopping it first.
 */
export function buildResolutionPreviewInState(state, candidate, options = {}) {
  const now = options.now ?? Date.now();
  const running = state.running;
  const openIndex = findOpenRunningTaskIndex(state);
  if (openIndex < 0 || !eventsOverlap({ start: running.start, end: now }, candidate, now)) {
    return buildManualResolutionPreview(state.events, candidate, options);
  }

  const openEvent = state.events[openIndex];
  const closedEvents = state.events.map((event, index) => index === openIndex ? { ...event, end: now } : event);
  const preview = buildManualResolutionPreview(closedEvents, candidate, options);

  const tail = [...preview.nextEvents]
    .reverse()
    .find((event) => event.type === 'task' && event.taskId === running.taskId && event.end === now);
  const nextEvents = tail
    ? preview.nextEvents.map((event) => event === tail ? { ...event, end: null } : event)
    : [...preview.nextEvents, { ...openEvent, id: `${openEvent.id}-r${now}`, start: now, end: null }];
  const runningStart = tail ? tail.start : now;

  return {
    ...preview,
    nextEvents: sortEventsByWindow(nextEvents, now),
    nextRunning: { ...running, start: runningStart },
  };
}

export function findOpenRunningTaskIndex(state) {
  const running = state.running;
  if (running?.type !== 'task' || running.start == null) return -1;
  return state.events.findIndex((event) =>
    event.type === 'task'
    && event.taskId === running.taskId
    && event.end === null
    && event.start === running.start
  );
}
