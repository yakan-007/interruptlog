import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSerializedPersistenceController } from './controller';

const PERSISTENCE_ERROR_KEY = 'toasts.storageSaveFailed';

export function useStatePersistence({ hydrated, state, stateRef, storage }) {
  const failedRef = useRef(false);
  const [error, setError] = useState(null);
  const queue = useMemo(() => createSerializedPersistenceController(storage.save), [storage]);

  const schedule = useCallback((nextState) => {
    if (!hydrated) return Promise.resolve();
    return queue.schedule(nextState)
      .then(() => {
        if (!failedRef.current) return;
        failedRef.current = false;
        setError(null);
      })
      .catch(() => {
        if (failedRef.current) return;
        failedRef.current = true;
        setError(PERSISTENCE_ERROR_KEY);
      });
  }, [hydrated, queue]);

  useEffect(() => {
    if (!hydrated) return;
    void schedule(state);
  }, [hydrated, schedule, state]);

  const persistNow = useCallback(() => schedule(stateRef.current), [schedule, stateRef]);

  return { error, persistNow };
}
