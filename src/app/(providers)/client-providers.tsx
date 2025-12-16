'use client';

import { ThemeProvider } from 'next-themes';
import React, { ReactNode, useEffect, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';

interface ClientProvidersProps {
  children: ReactNode;
}

const ClientProviders = ({ children }: ClientProvidersProps) => {
  const storeIsHydrated = useEventsStore(state => state.isHydrated);
  const [clientMounted, setClientMounted] = useState(false);

  useEffect(() => {
    setClientMounted(true);
    // Ensure hydrate action is called on client mount if not already hydrating
    // This is a safeguard, as it should also be called in useEventsStore.ts
    if (!useEventsStore.getState().isHydrated && typeof window !== 'undefined') {
        useEventsStore.getState().actions.hydrate();
    }
  }, []);

  if (!clientMounted) {
    // On the server or before client-side mount, render children directly.
    return <>{children}</>;
  }

  if (!storeIsHydrated) {
    // Client mounted, but store not hydrated yet -> show spinner.
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
      </div>
    );
  }
  
  // Client mounted AND store is hydrated.
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
};

export default ClientProviders; 
