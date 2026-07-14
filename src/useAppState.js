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
    storage.load().then((stored) => {
      if (!active) return;
      const currentTime = clock.now();
      const normalized = normalizeState(stored, currentTime, { assumeOnboarded: stored != null });
      setTrackedAppState(normalized);
      const preview = previewOverlapRepairInState(normalized, currentTime);
      setOverlapRepairUi({ sheetOpen: Boolean(preview), deferred: false });
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

  return {
    ready: hydrated,
    persistenceError: persistence.error,
    state: appState,
    derived,
    overlapRepair,
    actions,
    persistNow: persistence.persistNow,
    resyncNow,
  };
}
