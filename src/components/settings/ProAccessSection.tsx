'use client';

import { Sparkles, Lock } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';

export default function ProAccessSection() {
  const { proAccess, actions } = useEventsStore(state => ({
    proAccess: state.proAccess,
    actions: state.actions,
  }));

  const handleToggle = () => {
    actions.toggleProAccess();
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          {proAccess ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          Pro機能（開発用）
        </h2>
        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            proAccess
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {proAccess ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        課金連携前の確認用に、Pro機能の表示/非表示を切り替えられます。リリース時は自動判定に置き換えます。
      </p>
      <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {proAccess ? 'Pro機能が有効です。' : 'Pro機能はロック中です。'}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="self-start rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 sm:self-auto"
        >
          {proAccess ? 'OFFにする' : 'ONにする'}
        </button>
      </div>
    </div>
  );
}
