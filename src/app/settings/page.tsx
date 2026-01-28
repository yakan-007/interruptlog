'use client';

import { useState, useEffect } from 'react';
import useEventsStore from '@/store/useEventsStore';
import ThemeSection from '@/components/settings/ThemeSection';
import TaskManagementSection from '@/components/settings/TaskManagementSection';
import AutoStartSection from '@/components/settings/AutoStartSection';
import TaskPlanningSection from '@/components/settings/TaskPlanningSection';
import TaskPlacementSection from '@/components/settings/TaskPlacementSection';
import CategoryManagementSection from '@/components/settings/CategoryManagementSection';
import InterruptCategorySection from '@/components/settings/InterruptCategorySection';
import InterruptDirectorySection from '@/components/settings/InterruptDirectorySection';
import DataManagementSection from '@/components/settings/DataManagementSection';
import DueAlertSettingsSection from '@/components/settings/DueAlertSettingsSection';
import ProAccessSection from '@/components/settings/ProAccessSection';

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
    <div className="px-4 pb-20 pt-6">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">設定</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          よく使う操作から順に並べました。稼働の記録スタイルに合わせてカスタマイズしてください。
        </p>
      </header>

      <div className="mx-auto max-w-3xl space-y-10">
        <section className="space-y-4">
          <SectionLabel>外観</SectionLabel>
          <ThemeSection />
        </section>

        <section className="space-y-4">
          <SectionLabel>タスクの扱い</SectionLabel>
          <AutoStartSection />
          <TaskPlanningSection />
          <TaskPlacementSection />
          <TaskManagementSection />
        </section>

        <section className="space-y-4">
          <SectionLabel>分類とフォローアップ</SectionLabel>
          <CategoryManagementSection />
          <InterruptCategorySection />
          <InterruptDirectorySection />
          <DueAlertSettingsSection />
        </section>

        <section className="space-y-4">
          <SectionLabel>Pro</SectionLabel>
          <ProAccessSection />
        </section>

        <section className="space-y-4">
          <SectionLabel>データ管理</SectionLabel>
          <DataManagementSection />
        </section>
      </div>
    </div>
  );
};

export default SettingsPage; 

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
    {children}
  </p>
);
