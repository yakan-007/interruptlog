import { buildOverlapRepairPreview, sortEventsByWindow } from './resolution';

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
