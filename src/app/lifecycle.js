import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

export function handleAppStateChange({ isActive }, { persistNow, resyncNow }) {
  if (isActive) {
    resyncNow();
    return;
  }
  void persistNow();
}

export function useAppLifecycle({ enabled, persistNow, resyncNow }) {
  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let listenerHandle = null;

    const register = async () => {
      try {
        const handle = await CapacitorApp.addListener('appStateChange', (state) => {
          handleAppStateChange(state, { persistNow, resyncNow });
        });

        if (disposed) {
          await handle.remove();
          return;
        }

        listenerHandle = handle;
      } catch {
        listenerHandle = null;
      }
    };

    void register();

    return () => {
      disposed = true;
      if (listenerHandle) void listenerHandle.remove();
    };
  }, [enabled, persistNow, resyncNow]);
}
