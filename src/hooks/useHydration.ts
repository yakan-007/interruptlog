'use client';

import { useEffect, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';

/**
 * Custom hook to determine if the Zustand store has been hydrated.
 * Useful for delaying render of client-only components until store is ready.
 */
const useHydration = (): boolean => {
  const isHydrated = useEventsStore((state) => state.isHydrated);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in browser and hydration status changes
    if (typeof window !== 'undefined' && isHydrated) {
      setHasHydrated(true);
    }
  }, [isHydrated]);

  // On the server, or before hydration on client, return false.
  // After hydration on client, return true.
  return typeof window === 'undefined' ? false : hasHydrated;
};

export default useHydration; 