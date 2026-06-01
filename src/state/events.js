import { newId } from './ids';
import { TYPE_LABELS } from './schema';
import { asNumber, cleanText } from './utils';
import {
  buildManualResolutionPreview,
  buildOverlapRepairPreview,
  eventsOverlap,
  sortEventsByWindow,
} from './resolution';

export function validateEventWindow({ start, end }) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '開始と終了を正しく入力してください';
  if (end <= start) return '終了は開始より後にしてください';
  return null;
}

export function saveEventInState(state, updated) {
  const result = previewSaveEventInState(state, updated);
  if (result.error || !result.preview) return { state, error: result.error ?? '入力を確認してください' };
  return { state: applyResolutionPreviewInState(state, result.preview), error: null };
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
  if (result.error || !result.preview) return { state, error: result.error ?? '入力を確認してください' };
  return { state: applyResolutionPreviewInState(state, result.preview), error: null };
}

export function previewSaveEventInState(state, updated, now = Date.now()) {
  const previous = state.events.find((event) => event.id === updated.id);
  if (!previous) return { preview: null, error: 'イベントが見つかりませんでした' };

  const draft = {
    ...updated,
    id: previous.id,
    label: cleanText(updated.label) || TYPE_LABELS[updated.type] || previous.label || 'イベント',
    start: asNumber(updated.start, null),
    end: asNumber(updated.end, null),
  };
  const error = validateEventWindow(draft) ?? validateRunningOverlap(state, draft, now);
  if (error) return { preview: null, error };

  return {
    preview: buildManualResolutionPreview(state.events, draft, {
      replaceEvent: previous,
      now,
    }),
    error: null,
  };
}

export function previewAddMissedEventInState(state, event, options = {}, now = Date.now()) {
  const draft = {
    ...event,
    id: newId('ev', now),
    label: cleanText(event.label) || TYPE_LABELS[event.type] || 'イベント',
    start: asNumber(event.start, null),
    end: asNumber(event.end, null),
  };
  const error = validateEventWindow(draft);
  const runningError = validateRunningOverlap(state, draft, now);
  if (error || runningError) return { preview: null, error: error ?? runningError };

  return {
    preview: buildManualResolutionPreview(state.events, draft, {
      createGap: Boolean(options.createGap),
      now,
    }),
    error: null,
  };
}

export function previewOverlapRepairInState(state, now = Date.now()) {
  return buildOverlapRepairPreview(state.events, now);
}

export function applyResolutionPreviewInState(state, preview) {
  if (!preview?.nextEvents) return state;
  return {
    ...state,
    events: sortEventsByWindow(preview.nextEvents),
  };
}

function validateRunningOverlap(state, draft, now = Date.now()) {
  if (!state.running?.start) return null;
  const runningEvent = {
    id: '__running__',
    type: state.running.type,
    start: state.running.start,
    end: now,
  };
  return eventsOverlap(runningEvent, draft, now)
    ? '現在進行中の時間帯は、いったん停止してから編集してください'
    : null;
}
