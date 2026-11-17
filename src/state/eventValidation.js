import { ERROR_CODES } from '../domain/errors';
import { eventsOverlap } from './resolution';
import { findOpenRunningTaskIndex } from './runningResolution';
import { startOfDay } from './utils';

export function validateEventWindow({ start, end }) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return ERROR_CODES.INVALID_EVENT_WINDOW;
  if (end <= start) return ERROR_CODES.END_NOT_AFTER_START;
  return null;
}

export function validateSameDayWindow({ start, end }) {
  return startOfDay(start) === startOfDay(end - 1) ? null : ERROR_CODES.SAME_DAY_REQUIRED;
}

// A running task can absorb an edit inside its elapsed time (see
// runningResolution.js); only the future and the running session itself are
// off limits. A running pause has no record yet, so its window stays locked.
export function validateRunningOverlap(state, draft, now = Date.now()) {
  if (!state.running?.start) return null;
  const runningWindow = { start: state.running.start, end: now };
  if (!eventsOverlap(runningWindow, draft, now)) return null;
  if (state.running.type !== 'task') return ERROR_CODES.RUNNING_OVERLAP;
  const openEvent = state.events[findOpenRunningTaskIndex(state)];
  if (!openEvent || draft.id === openEvent.id || draft.end > now) return ERROR_CODES.RUNNING_OVERLAP;
  return null;
}
