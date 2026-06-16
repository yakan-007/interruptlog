import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEmptyState,
  normalizeState,
  previewOverlapRepairInState,
  selectActiveTasks,
  selectCompletedTasks,
  selectRunningTaskMeta,
} from './state';
import { createAppActions } from './app/actions';
import { resyncTickersNow } from './lib/ticker';
import { createSerializedPersistenceController } from './persistence/controller';
import { loadPersistedState, savePersistedState } from './persistence/storage';

const STABLE_PREVIEW_NOW = 0;

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

  const actions = useMemo(() => createAppActions({
    currentState: appState,
    mutate,
    overlapRepairPreview,
    setLastError,
    setOverlapRepairUi,
    setTrackedAppState,
  }), [appState, mutate, overlapRepairPreview, setTrackedAppState]);

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
