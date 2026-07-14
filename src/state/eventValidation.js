import { ERROR_CODES } from '../domain/errors';
import { eventsOverlap } from './resolution';
import { startOfDay } from './utils';

export function validateEventWindow({ start, end }) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return ERROR_CODES.INVALID_EVENT_WINDOW;
  if (end <= start) return ERROR_CODES.END_NOT_AFTER_START;
  return null;
}

export function validateSameDayWindow({ start, end }) {
  return startOfDay(start) === startOfDay(end - 1) ? null : ERROR_CODES.SAME_DAY_REQUIRED;
}

export function validateRunningOverlap(state, draft, now = Date.now()) {
  if (!state.running?.start) return null;
  const runningEvent = {
    id: '__running__',
    type: state.running.type,
    start: state.running.start,
    end: now,
  };
  return eventsOverlap(runningEvent, draft, now)
    ? ERROR_CODES.RUNNING_OVERLAP
    : null;
}
