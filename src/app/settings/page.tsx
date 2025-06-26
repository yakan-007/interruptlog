'use client';

import { useState, useEffect } from 'react';
import useEventsStore from '@/store/useEventsStore';
import ThemeSection from '@/components/settings/ThemeSection';
import TaskManagementSection from '@/components/settings/TaskManagementSection';
import TaskPlacementSection from '@/components/settings/TaskPlacementSection';
import AutoStartSection from '@/components/settings/AutoStartSection';
import CategoryManagementSection from '@/components/settings/CategoryManagementSection';
import InterruptCategorySection from '@/components/settings/InterruptCategorySection';
import DataManagementSection from '@/components/settings/DataManagementSection';

const SettingsPage = () => {
  const { isHydrated } = useEventsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  if (!mounted || !isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h1 className="mb-6 text-center text-2xl font-semibold">設定</h1>

      <div className="mx-auto max-w-md space-y-6">
        <ThemeSection />
        <TaskManagementSection />
        <TaskPlacementSection />
        <AutoStartSection />
        <CategoryManagementSection />
        <InterruptCategorySection />
        <DataManagementSection />
      </div>
    </div>
  );
};

export default SettingsPage; 