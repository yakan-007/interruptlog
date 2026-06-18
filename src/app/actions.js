import {
  addInterruptionQueueItemInState,
  addMissedEventInState,
  addReportRowsToArchive,
  addTeamDemoArchiveInState,
  applyResolutionPreviewInState,
  applyTaskPackImport,
  applyTeamArchiveImport,
  applyTeamSettingsImport,
  beginPauseInState,
  buildBackup,
  buildReportCsv,
  buildTaskPackExport,
  buildTeamArchiveExport,
  buildTeamSettingsExport,
  cancelPauseInState,
  completeTaskInState,
  createEmptyState,
  createTaskAndStartInState,
  createTaskInState,
  deleteCategoryInState,
  deleteEventInState,
  deleteInterruptionQueueItemInState,
  deleteInterruptCategoryInState,
  deleteTaskInState,
  deleteTaskTemplateInState,
  moveTaskToIndexInState,
  moveCategoryToIndexInState,
  moveChipToIndexInState,
  moveInterruptCategoryToIndexInState,
  parseBackup,
  previewAddMissedEventInState,
  previewOverlapRepairInState,
  previewSaveEventInState,
  reorderTaskInState,
  restoreTaskAndStartInState,
  restoreTaskInState,
  saveBreakInState,
  saveCategoryInState,
  saveChipsInState,
  saveEventInState,
  saveInterruptCategoryInState,
  saveInterruptInState,
  saveTaskInState,
  saveTaskTemplateInState,
  setBreakTargetInState,
  setPreferenceInState,
  startTaskInState,
  stopPauseInState,
  stopTaskInState,
  uncompleteTaskInState,
  updateInterruptionQueueItemInState,
  updateTeamWorkspaceInState,
} from '../state';

function toActionResult(result) {
  return { ok: !result?.error, error: result?.error ?? null, taskId: result?.taskId ?? null };
}

function toStateActionResult(result) {
  return { ok: !result.error, ...result };
}

export function createAppActions({
  currentState,
  mutate,
  overlapRepairPreview,
  setLastError,
  setOverlapRepairUi,
  setTrackedAppState,
}) {
  const commitResult = (result) => {
    setTrackedAppState(result.state);
    setLastError(result.error ?? null);
  };
  const applyResult = (result) => {
    commitResult(result);
    return toActionResult(result);
  };
  const applyStateResult = (result) => {
    commitResult(result);
    return toStateActionResult(result);
  };
  const mutateWith = (action) => (...args) => {
    mutate((state) => action(state, ...args));
  };
  const setPreference = (key) => (value) => {
    mutate((state) => setPreferenceInState(state, key, value));
  };
  const getState = () => currentState;

  return {
    beginInterrupt: () => mutate((state) => beginPauseInState(state, 'interrupt')),
    beginBreak: () => mutate((state) => beginPauseInState(state, 'break')),
    setBreakTarget: mutateWith(setBreakTargetInState),
    startTask: mutateWith(startTaskInState),
    stopTask: mutateWith(stopTaskInState),
    completeTask: mutateWith(completeTaskInState),
    restoreTask: mutateWith(restoreTaskInState),
    restoreTaskAndStart(id) {
      return applyResult(restoreTaskAndStartInState(getState(), id));
    },
    uncompleteTask: mutateWith(uncompleteTaskInState),
    saveTask(data) {
      return applyResult(saveTaskInState(getState(), data));
    },
    createTask(data) {
      return applyResult(createTaskInState(getState(), data));
    },
    createTaskAndStart(data) {
      return applyResult(createTaskAndStartInState(getState(), data));
    },
    deleteTask: mutateWith(deleteTaskInState),
    reorderTask: mutateWith(reorderTaskInState),
    moveTaskToIndex: mutateWith(moveTaskToIndexInState),
    saveInterrupt: mutateWith(saveInterruptInState),
    cancelInterrupt: mutateWith(cancelPauseInState),
    stopInterrupt: mutateWith(stopPauseInState),
    saveBreak: mutateWith(saveBreakInState),
    previewSaveEvent(updated) {
      return previewSaveEventInState(getState(), updated);
    },
    saveEvent(updated) {
      return applyResult(saveEventInState(getState(), updated));
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
    saveCategory: mutateWith(saveCategoryInState),
    deleteCategory: mutateWith(deleteCategoryInState),
    moveCategoryToIndex: mutateWith(moveCategoryToIndexInState),
    saveInterruptCategory: mutateWith(saveInterruptCategoryInState),
    deleteInterruptCategory: mutateWith(deleteInterruptCategoryInState),
    moveInterruptCategoryToIndex: mutateWith(moveInterruptCategoryToIndexInState),
    saveChips: mutateWith(saveChipsInState),
    moveChipToIndex: mutateWith(moveChipToIndexInState),
    saveTaskTemplate(template) {
      return applyStateResult(saveTaskTemplateInState(getState(), template));
    },
    deleteTaskTemplate: mutateWith(deleteTaskTemplateInState),
    setDark: setPreference('dark'),
    setAccent: setPreference('accent'),
    setMemberName: setPreference('memberName'),
    setLocale: setPreference('locale'),
    setTeamModeEnabled: setPreference('teamModeEnabled'),
    setTeamLightsEnabled: setPreference('teamLightsEnabled'),
    setTopAdd: setPreference('topAdd'),
    setSortDue: setPreference('sortDue'),
    setHistoryView: setPreference('historyView'),
    updateTeamWorkspace: mutateWith(updateTeamWorkspaceInState),
    addInterruptionQueueItem: mutateWith(addInterruptionQueueItemInState),
    updateInterruptionQueueItem: mutateWith(updateInterruptionQueueItemInState),
    deleteInterruptionQueueItem: mutateWith(deleteInterruptionQueueItemInState),
    finishOnboarding: () => mutate((state) => setPreferenceInState(state, 'onboardingDone', true)),
    exportJson() {
      return JSON.stringify(buildBackup(getState()), null, 2);
    },
    importJson(payload) {
      try {
        const imported = parseBackup(payload);
        setTrackedAppState(imported);
        const preview = previewOverlapRepairInState(imported, Date.now());
        setOverlapRepairUi({ sheetOpen: Boolean(preview), deferred: false });
        setLastError(null);
        return { ok: true, error: null, requiresRepair: Boolean(preview) };
      } catch {
        const error = 'JSONを読み込めませんでした';
        setLastError(error);
        return { ok: false, error, requiresRepair: false };
      }
    },
    exportReportCsv(range) {
      return buildReportCsv(getState(), range);
    },
    exportTeamSettings() {
      return JSON.stringify(buildTeamSettingsExport(getState()), null, 2);
    },
    importTeamSettings(payload) {
      return applyStateResult(applyTeamSettingsImport(getState(), payload));
    },
    exportTaskPack() {
      return JSON.stringify(buildTaskPackExport(getState()), null, 2);
    },
    importTaskPack(payload) {
      return applyStateResult(applyTaskPackImport(getState(), payload));
    },
    addRowsToTeamArchive(rows) {
      return applyStateResult(addReportRowsToArchive(getState(), rows));
    },
    addTeamDemoArchive() {
      return applyStateResult(addTeamDemoArchiveInState(getState()));
    },
    exportTeamArchive() {
      return JSON.stringify(buildTeamArchiveExport(getState()), null, 2);
    },
    importTeamArchive(payload) {
      return applyStateResult(applyTeamArchiveImport(getState(), payload));
    },
    resetAll() {
      mutate((state) => ({
        ...createEmptyState(),
        preferences: {
          ...createEmptyState().preferences,
          onboardingDone: state.preferences.onboardingDone,
        },
      }));
      setOverlapRepairUi({ sheetOpen: false, deferred: false });
    },
  };
}
