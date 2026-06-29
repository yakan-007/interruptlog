import {
  addMissedEventInState,
  applyResolutionPreviewInState,
  beginPauseInState,
  beginPauseWithCategoryInState,
  cancelPauseInState,
  createInterruptFollowupTaskInState,
  deleteEventInState,
  previewAddMissedEventInState,
  previewOverlapRepairInState,
  previewSaveEventInState,
  previewTaskRecordInState,
  saveBreakInState,
  saveEventInState,
  saveInterruptInState,
  selectPauseCategoryInState,
  saveTaskRecordInState,
  setBreakTargetInState,
  stopPauseInState,
  updateInterruptDraftInState,
} from '../../state';

export function createRecordCommands({
  applyResult,
  getState,
  mutate,
  mutateWith,
  overlapRepairPreview,
  setLastError,
  setOverlapRepairUi,
  setTrackedAppState,
}) {
  return {
    beginPause: (categoryId) => mutate((state) => beginPauseWithCategoryInState(state, categoryId)),
    beginInterrupt: () => mutate((state) => beginPauseInState(state, 'interrupt')),
    beginBreak: () => mutate((state) => beginPauseInState(state, 'break')),
    selectPauseCategory: mutateWith(selectPauseCategoryInState),
    setBreakTarget: mutateWith(setBreakTargetInState),
    saveInterrupt: mutateWith(saveInterruptInState),
    cancelInterrupt: mutateWith(cancelPauseInState),
    stopInterrupt: mutateWith(stopPauseInState),
    updateInterruptDraft: mutateWith(updateInterruptDraftInState),
    saveBreak: mutateWith(saveBreakInState),
    createInterruptFollowupTask(interruptData, taskData) {
      return applyResult(createInterruptFollowupTaskInState(getState(), interruptData, taskData));
    },
    previewSaveEvent(updated) {
      return previewSaveEventInState(getState(), updated);
    },
    saveEvent(updated) {
      return applyResult(saveEventInState(getState(), updated));
    },
    previewTaskRecord(record) {
      return previewTaskRecordInState(getState(), record);
    },
    saveTaskRecord(record) {
      return applyResult(saveTaskRecordInState(getState(), record));
    },
    deleteEvent: mutateWith(deleteEventInState),
    addMissedEvent(event, options) {
      return applyResult(addMissedEventInState(getState(), event, options));
    },
    previewAddMissedEvent(event, options) {
      return previewAddMissedEventInState(getState(), event, options);
    },
    applyResolution(preview) {
      setLastError(null);
      const nextState = applyResolutionPreviewInState(getState(), preview);
      setTrackedAppState(nextState);
      const nextRepair = previewOverlapRepairInState(nextState, Date.now());
      setOverlapRepairUi({ sheetOpen: false, deferred: Boolean(nextRepair) });
      return { ok: true, error: null };
    },
    openOverlapRepair() {
      const preview = overlapRepairPreview ?? previewOverlapRepairInState(getState(), Date.now());
      if (!preview) {
        setOverlapRepairUi({ sheetOpen: false, deferred: false });
        return { ok: false, error: null, preview: null };
      }
      setOverlapRepairUi({ sheetOpen: true, deferred: false });
      return { ok: true, error: null, preview };
    },
    deferOverlapRepair() {
      setOverlapRepairUi({ sheetOpen: false, deferred: Boolean(overlapRepairPreview) });
    },
  };
}
