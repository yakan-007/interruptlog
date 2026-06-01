import { useEffect } from 'react';

export function handleAppStateChange({ isActive }, { persistNow, resyncNow }) {
  if (isActive) {
    resyncNow();
    return;
  }
  void persistNow();
}

export function useAppLifecycle({ enabled, persistNow, resyncNow }) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      handleAppStateChange({ isActive: document.visibilityState === 'visible' }, { persistNow, resyncNow });
    };

    const handlePageHide = () => {
      void persistNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, persistNow, resyncNow]);
}
