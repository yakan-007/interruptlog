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
import { browserStateStorage } from './persistence/storage';
import { useStatePersistence } from './persistence/useStatePersistence';
import { systemClock } from './platform/clock';
import { systemIdGenerator } from './platform/idGenerator';

const STABLE_PREVIEW_NOW = 0;

export function useAppState({ clock = systemClock, idGenerator = systemIdGenerator, storage = browserStateStorage } = {}) {
  const [appState, setAppState] = useState(() => createEmptyState());
  const appStateRef = useRef(appState);
  const [hydrated, setHydrated] = useState(false);
  const [storageRecoveryState, setStorageRecoveryState] = useState(null);
  const [overlapRepairUi, setOverlapRepairUi] = useState({ sheetOpen: false, deferred: false });

  const setTrackedAppState = useCallback((nextState) => {
    setAppState((current) => {
      const resolved = typeof nextState === 'function' ? nextState(current) : nextState;
      appStateRef.current = resolved;
      return resolved;
    });
  }, []);

  useEffect(() => {
    let active = true;
    storage.load().then((result) => {
      if (!active) return;
      if (result.status === 'corrupt') {
        setStorageRecoveryState({ kind: 'corrupt-json', raw: result.raw });
        return;
      }
      const stored = result.state;
      const currentTime = clock.now();
      const normalized = normalizeState(stored, currentTime, { assumeOnboarded: stored != null });
      setTrackedAppState(normalized);
      // Overlaps found at launch are flagged in History, Review and Settings
      // instead of opening a sheet before the user has done anything.
      const preview = previewOverlapRepairInState(normalized, currentTime);
      setOverlapRepairUi({ sheetOpen: false, deferred: Boolean(preview) });
      setHydrated(true);
    });
    return () => { active = false; };
  }, [clock, setTrackedAppState, storage]);

  const persistence = useStatePersistence({
    hydrated,
    state: appState,
    stateRef: appStateRef,
    storage,
  });

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
    setTrackedAppState((current) => recipe(current));
  }, [setTrackedAppState]);

  const actions = useMemo(() => createAppActions({
    clock,
    currentState: appState,
    idGenerator,
    mutate,
    overlapRepairPreview,
    setOverlapRepairUi,
    setTrackedAppState,
  }), [appState, clock, idGenerator, mutate, overlapRepairPreview, setTrackedAppState]);

  const derived = useMemo(() => ({
    activeTasks: selectActiveTasks(appState),
    completedTasks: selectCompletedTasks(appState),
    runningTaskMeta: selectRunningTaskMeta(appState),
  }), [appState]);

  const resyncNow = useCallback(() => {
    resyncTickersNow();
  }, []);

  const resetStorageRecovery = useCallback(async () => {
    if (!storageRecoveryState || typeof storage.clear !== 'function') return { ok: false };
    try {
      await storage.clear();
      const freshState = createEmptyState();
      setTrackedAppState(freshState);
      setOverlapRepairUi({ sheetOpen: false, deferred: false });
      setStorageRecoveryState(null);
      setHydrated(true);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }, [setTrackedAppState, storage, storageRecoveryState]);

  const storageRecovery = useMemo(
    () => storageRecoveryState
      ? { ...storageRecoveryState, reset: resetStorageRecovery }
      : null,
    [resetStorageRecovery, storageRecoveryState]
  );

  return {
    ready: hydrated,
    persistenceError: persistence.error,
    storageRecovery,
    state: appState,
    derived,
    overlapRepair,
    actions,
    persistNow: persistence.persistNow,
    resyncNow,
  };
}
