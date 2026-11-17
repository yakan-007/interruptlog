import {
  addMissedEventInState,
  applyResolutionPreviewInState,
  beginInterruptWithCategoryInState,
  beginNextPauseInState,
  beginPauseInState,
  cancelPauseInState,
  deleteEventInState,
  previewAddMissedEventInState,
  previewOverlapRepairInState,
  previewSaveEventInState,
  previewTaskRecordInState,
  saveBreakInState,
  saveEventInState,
  saveInterruptInState,
  selectPauseCategoryInState,
  setPauseKindInState,
  saveTaskRecordInState,
  updateInterruptDraftInState,
} from '../../state';

export function createRecordCommands({
  applyResult,
  createId,
  getState,
  mutate,
  mutateWith,
  now,
  overlapRepairPreview,
  setOverlapRepairUi,
  setTrackedAppState,
}) {
  const dependencies = { createId };
  return {
    beginPause: (categoryId) => mutate((state) => beginInterruptWithCategoryInState(state, categoryId, now(), dependencies)),
    beginNextPause: (kind, currentPauseData) => mutate((state) => beginNextPauseInState(state, kind, currentPauseData, now(), dependencies)),
    beginInterrupt: () => mutate((state) => beginPauseInState(state, 'interrupt', now(), {}, dependencies)),
    beginBreak: () => mutate((state) => beginPauseInState(state, 'break', now(), {}, dependencies)),
    selectPauseCategory: mutateWith(selectPauseCategoryInState),
    setPauseKind: mutateWith(setPauseKindInState),
    saveInterrupt: (data) => mutate((state) => saveInterruptInState(state, data, now(), dependencies)),
    cancelInterrupt: () => mutate((state) => cancelPauseInState(state, now(), dependencies)),
    updateInterruptDraft: mutateWith(updateInterruptDraftInState),
    saveBreak: (data) => mutate((state) => saveBreakInState(state, data, now(), dependencies)),
    previewSaveEvent(updated) {
      return previewSaveEventInState(getState(), updated, now());
    },
    saveEvent(updated) {
      return applyResult(saveEventInState(getState(), updated, now()));
    },
    previewTaskRecord(record) {
      return previewTaskRecordInState(getState(), record, now(), dependencies);
    },
    saveTaskRecord(record) {
      return applyResult(saveTaskRecordInState(getState(), record, now(), dependencies));
    },
    deleteEvent: mutateWith(deleteEventInState),
    addMissedEvent(event, options) {
      return applyResult(addMissedEventInState(getState(), event, { ...options, ...dependencies }, now()));
    },
    previewAddMissedEvent(event, options) {
      return previewAddMissedEventInState(getState(), event, { ...options, ...dependencies }, now());
    },
    applyResolution(preview) {
      const nextState = applyResolutionPreviewInState(getState(), preview);
      setTrackedAppState(nextState);
      const nextRepair = previewOverlapRepairInState(nextState, now());
      setOverlapRepairUi({ sheetOpen: false, deferred: Boolean(nextRepair) });
      return { ok: true, errorCode: null };
    },
    openOverlapRepair() {
      const preview = overlapRepairPreview ?? previewOverlapRepairInState(getState(), now());
      if (!preview) {
        setOverlapRepairUi({ sheetOpen: false, deferred: false });
        return { ok: false, errorCode: null, preview: null };
      }
      setOverlapRepairUi({ sheetOpen: true, deferred: false });
      return { ok: true, errorCode: null, preview };
    },
    deferOverlapRepair() {
      setOverlapRepairUi({ sheetOpen: false, deferred: Boolean(overlapRepairPreview) });
    },
  };
}
