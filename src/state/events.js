import { ERROR_CODES } from '../domain/errors';
import { applyResolutionPreviewInState } from './eventResolution';
import { validateEventWindow, validateRunningOverlap } from './eventValidation';
import { newId } from './ids';
import { buildResolutionPreviewInState } from './runningResolution';
import { TYPE_LABELS } from './schema';
import { asNumber, cleanText } from './utils';
import { ensureWorkdayScheduleInState } from './workday';

export function saveEventInState(state, updated, now = Date.now()) {
  const result = previewSaveEventInState(state, updated, now);
  if (result.errorCode || !result.preview) return { state, errorCode: result.errorCode ?? ERROR_CODES.CHECK_INPUT };
  return { state: ensureWorkdayScheduleInState(applyResolutionPreviewInState(state, result.preview), updated.start), errorCode: null };
}

export function deleteEventInState(state, eventId) {
  const removed = state.events.find((event) => event.id === eventId);
  const runningMatches = removed?.end === null && state.running?.type === 'task' && state.running?.start === removed.start;
  return {
    ...state,
    events: state.events.filter((event) => event.id !== eventId),
    running: runningMatches ? null : state.running,
  };
}

export function addMissedEventInState(state, event, options = {}, now = Date.now()) {
  const result = previewAddMissedEventInState(state, event, options, now);
  if (result.errorCode || !result.preview) return { state, errorCode: result.errorCode ?? ERROR_CODES.CHECK_INPUT };
  const nextState = ensureWorkdayScheduleInState(applyResolutionPreviewInState(state, result.preview), event.start);
  const who = cleanText(event.who);
  return {
    state: options.saveWhoChip && who && !nextState.whoChips.includes(who)
      ? { ...nextState, whoChips: [...nextState.whoChips, who] }
      : nextState,
    errorCode: null,
  };
}

export function previewSaveEventInState(state, updated, now = Date.now()) {
  const previous = state.events.find((event) => event.id === updated.id);
  if (!previous) return { preview: null, errorCode: ERROR_CODES.EVENT_NOT_FOUND };

  const draft = {
    ...updated,
    id: previous.id,
    label: cleanText(updated.label) || TYPE_LABELS[updated.type] || previous.label || 'イベント',
    memo: cleanText(updated.memo),
    start: asNumber(updated.start, null),
    end: asNumber(updated.end, null),
  };
  const errorCode = validateEventWindow(draft) ?? validateRunningOverlap(state, draft, now);
  if (errorCode) return { preview: null, errorCode };

  return {
    preview: buildResolutionPreviewInState(state, draft, {
      replaceEvent: previous,
      now,
    }),
    errorCode: null,
  };
}

export function previewAddMissedEventInState(state, event, options = {}, now = Date.now()) {
  const { createId = newId } = options;
  const draft = {
    ...event,
    id: createId('ev', now),
    label: cleanText(event.label) || TYPE_LABELS[event.type] || 'イベント',
    memo: cleanText(event.memo),
    start: asNumber(event.start, null),
    end: asNumber(event.end, null),
  };
  const errorCode = validateEventWindow(draft) ?? validateRunningOverlap(state, draft, now);
  if (errorCode) return { preview: null, errorCode };

  return {
    preview: buildResolutionPreviewInState(state, draft, {
      createGap: Boolean(options.createGap),
      now,
    }),
    errorCode: null,
  };
}
