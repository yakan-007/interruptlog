import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addMissedEventInState,
  addReportRowsToArchive,
  applyResolutionPreviewInState,
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
  deleteInterruptCategoryInState,
  deleteTaskTemplateInState,
  deleteEventInState,
  deleteTaskInState,
  applyTaskPackImport,
  applyTeamArchiveImport,
  applyTeamSettingsImport,
  normalizeState,
  parseBackup,
  moveTaskToIndexInState,
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
  saveTaskTemplateInState,
  saveTaskInState,
  selectActiveTasks,
  selectCompletedTasks,
  selectRunningTaskMeta,
  setBreakTargetInState,
  setPreferenceInState,
  startTaskInState,
  stopPauseInState,
  stopTaskInState,
  uncompleteTaskInState,
} from './state';
import { resyncTickersNow } from './helpers';
import { createSerializedPersistenceController } from './persistence';
import { loadPersistedState, savePersistedState } from './storage';

const STABLE_PREVIEW_NOW = 0;

function toActionResult(result) {
  return { ok: !result?.error, error: result?.error ?? null, taskId: result?.taskId ?? null };
}

export function useAppState() {
  const [appState, setAppState] = useState(() => createEmptyState());
  const appStateRef = useRef(appState);
  const persistenceRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [overlapRepairUi, setOverlapRepairUi] = useState({ sheetOpen: false, deferred: false });

  if (persistenceRef.current == null) {
    persistenceRef.current = createSerializedPersistenceController(savePersistedState);
  }

  const setTrackedAppState = useCallback((nextState) => {
    setAppState((current) => {
      const resolved = typeof nextState === 'function' ? nextState(current) : nextState;
      appStateRef.current = resolved;
      return resolved;
    });
  }, []);

  useEffect(() => {
    let active = true;
    loadPersistedState().then((stored) => {
      if (!active) return;
      const normalized = normalizeState(stored, Date.now(), { assumeOnboarded: stored != null });
      setTrackedAppState(normalized);
      const preview = previewOverlapRepairInState(normalized, Date.now());
      setOverlapRepairUi({ sheetOpen: Boolean(preview), deferred: false });
      setHydrated(true);
    });
    return () => { active = false; };
  }, [setTrackedAppState]);

  useEffect(() => {
    if (!hydrated) return;
    void persistenceRef.current.schedule(appState).catch(() => null);
  }, [appState, hydrated]);

  const overlapRepairPreview = useMemo(
    () => hydrated ? previewOverlapRepairInState(appState, STABLE_PREVIEW_NOW) : null,
    [appState, hydrated]
  );

  const overlapRepair = useMemo(
    () => ({
      pending: overlapRepairUi.sheetOpen ? overlapRepairPreview : null,
      deferred: overlapRepairUi.deferred ? overlapRepairPreview : null,
    }),
    [overlapRepairPreview, overlapRepairUi.deferred, overlapRepairUi.sheetOpen]
  );

  const mutate = useCallback((recipe) => {
    setLastError(null);
    setTrackedAppState((current) => recipe(current));
  }, [setTrackedAppState]);

  const applyResult = useCallback((result) => {
    setTrackedAppState(result.state);
    setLastError(result.error ?? null);
    return toActionResult(result);
  }, [setTrackedAppState]);

  const applyStateResult = useCallback((result) => {
    setTrackedAppState(result.state);
    setLastError(result.error ?? null);
    return { ok: !result.error, ...result };
  }, [setTrackedAppState]);

  const actions = useMemo(() => ({
    beginInterrupt() {
      mutate((state) => beginPauseInState(state, 'interrupt'));
    },

    beginBreak() {
      mutate((state) => beginPauseInState(state, 'break'));
    },

    setBreakTarget(minutes) {
      mutate((state) => setBreakTargetInState(state, minutes));
    },

    startTask(id) {
      mutate((state) => startTaskInState(state, id));
    },

    stopTask(complete) {
      mutate((state) => stopTaskInState(state, complete));
    },

    completeTask(id) {
      mutate((state) => completeTaskInState(state, id));
    },

    restoreTask(id) {
      mutate((state) => restoreTaskInState(state, id));
    },

    restoreTaskAndStart(id) {
      return applyResult(restoreTaskAndStartInState(appStateRef.current, id));
    },

    uncompleteTask(id) {
      mutate((state) => uncompleteTaskInState(state, id));
    },

    saveTask(data) {
      return applyResult(saveTaskInState(appStateRef.current, data));
    },

    createTask(data) {
      return applyResult(createTaskInState(appStateRef.current, data));
    },

    createTaskAndStart(data) {
      return applyResult(createTaskAndStartInState(appStateRef.current, data));
    },

    deleteTask(id) {
      mutate((state) => deleteTaskInState(state, id));
    },

    reorderTask(id, direction) {
      mutate((state) => reorderTaskInState(state, id, direction));
    },

    moveTaskToIndex(id, targetIndex) {
      mutate((state) => moveTaskToIndexInState(state, id, targetIndex));
    },

    saveInterrupt(data) {
      mutate((state) => saveInterruptInState(state, data));
    },

    cancelInterrupt() {
      mutate((state) => cancelPauseInState(state));
    },

    stopInterrupt(resume) {
      mutate((state) => stopPauseInState(state, resume));
    },

    saveBreak(data) {
      mutate((state) => saveBreakInState(state, data));
    },

    previewSaveEvent(updated) {
      return previewSaveEventInState(appStateRef.current, updated);
    },

    saveEvent(updated) {
      return applyResult(saveEventInState(appStateRef.current, updated));
    },

    deleteEvent(id) {
      mutate((state) => deleteEventInState(state, id));
    },

    addMissedEvent(event, options) {
      return applyResult(addMissedEventInState(appStateRef.current, event, options));
    },

    previewAddMissedEvent(event, options) {
      return previewAddMissedEventInState(appStateRef.current, event, options);
    },

    applyResolution(preview) {
      setLastError(null);
      const nextState = applyResolutionPreviewInState(appStateRef.current, preview);
      setTrackedAppState(nextState);
      const nextRepair = previewOverlapRepairInState(nextState, Date.now());
      setOverlapRepairUi({ sheetOpen: false, deferred: Boolean(nextRepair) });
      return { ok: true, error: null };
    },

    openOverlapRepair() {
      const preview = overlapRepairPreview ?? previewOverlapRepairInState(appStateRef.current, Date.now());
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

    saveCategory(category) {
      mutate((state) => saveCategoryInState(state, category));
    },

    deleteCategory(id) {
      mutate((state) => deleteCategoryInState(state, id));
    },

    saveInterruptCategory(category) {
      mutate((state) => saveInterruptCategoryInState(state, category));
    },

    deleteInterruptCategory(id) {
      mutate((state) => deleteInterruptCategoryInState(state, id));
    },

    saveChips(kind, chips) {
      mutate((state) => saveChipsInState(state, kind, chips));
    },

    saveTaskTemplate(template) {
      return applyStateResult(saveTaskTemplateInState(appStateRef.current, template));
    },

    deleteTaskTemplate(id) {
      mutate((state) => deleteTaskTemplateInState(state, id));
    },

    setDark(value) {
      mutate((state) => setPreferenceInState(state, 'dark', value));
    },

    setAccent(value) {
      mutate((state) => setPreferenceInState(state, 'accent', value));
    },

    setMemberName(value) {
      mutate((state) => setPreferenceInState(state, 'memberName', value));
    },

    setTeamModeEnabled(value) {
      mutate((state) => setPreferenceInState(state, 'teamModeEnabled', value));
    },

    setTopAdd(value) {
      mutate((state) => setPreferenceInState(state, 'topAdd', value));
    },

    setSortDue(value) {
      mutate((state) => setPreferenceInState(state, 'sortDue', value));
    },

    setShowTodayStrip(value) {
      mutate((state) => setPreferenceInState(state, 'showTodayStrip', value));
    },

    setHistoryView(value) {
      mutate((state) => setPreferenceInState(state, 'historyView', value));
    },

    finishOnboarding() {
      mutate((state) => setPreferenceInState(state, 'onboardingDone', true));
    },

    exportJson() {
      return JSON.stringify(buildBackup(appStateRef.current), null, 2);
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
      return buildReportCsv(appStateRef.current, range);
    },

    exportTeamSettings() {
      return JSON.stringify(buildTeamSettingsExport(appStateRef.current), null, 2);
    },

    importTeamSettings(payload) {
      return applyStateResult(applyTeamSettingsImport(appStateRef.current, payload));
    },

    exportTaskPack() {
      return JSON.stringify(buildTaskPackExport(appStateRef.current), null, 2);
    },

    importTaskPack(payload) {
      return applyStateResult(applyTaskPackImport(appStateRef.current, payload));
    },

    addRowsToTeamArchive(rows) {
      return applyStateResult(addReportRowsToArchive(appStateRef.current, rows));
    },

    exportTeamArchive() {
      return JSON.stringify(buildTeamArchiveExport(appStateRef.current), null, 2);
    },

    importTeamArchive(payload) {
      return applyStateResult(applyTeamArchiveImport(appStateRef.current, payload));
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
  }), [applyResult, applyStateResult, mutate, overlapRepairPreview, setTrackedAppState]);

  const derived = useMemo(() => ({
    activeTasks: selectActiveTasks(appState),
    completedTasks: selectCompletedTasks(appState),
    runningTaskMeta: selectRunningTaskMeta(appState),
  }), [appState]);

  const persistNow = useCallback(() => {
    if (!hydrated) return Promise.resolve();
    return persistenceRef.current.schedule(appStateRef.current).catch(() => null);
  }, [hydrated]);

  const resyncNow = useCallback(() => {
    resyncTickersNow();
  }, []);

  return {
    ready: hydrated,
    lastError,
    state: appState,
    derived,
    overlapRepair,
    actions,
    persistNow,
    resyncNow,
  };
}
