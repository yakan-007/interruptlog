'use client';

import { useCallback, useEffect, useState } from 'react';
import { ANOMALY_DISMISS_STORAGE_KEY } from '@/utils/anomalies';
import { dbGet, dbSet } from '@/lib/db';

const normalizeIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];

export default function useDismissedAnomalies() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const saved = await dbGet<string[]>(ANOMALY_DISMISS_STORAGE_KEY);
    setDismissedIds(normalizeIds(saved));
  }, []);

  useEffect(() => {
    refresh();
    const handleFocus = () => {
      refresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  const dismissAnomalies = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) return;
    const next = Array.from(new Set([...dismissedIds, ...eventIds]));
    setDismissedIds(next);
    await dbSet(ANOMALY_DISMISS_STORAGE_KEY, next);
  }, [dismissedIds]);

  const resetDismissed = useCallback(async () => {
    setDismissedIds([]);
    await dbSet(ANOMALY_DISMISS_STORAGE_KEY, []);
  }, []);

  return {
    dismissedIds,
    dismissAnomalies,
    resetDismissed,
    refresh,
  } as const;
}
