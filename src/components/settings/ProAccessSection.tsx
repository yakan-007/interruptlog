'use client';

import { Sparkles, Lock, CheckCircle2 } from 'lucide-react';
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
      <div className="mb-3 flex items-center gap-2">
        {proAccess ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        <h2 className="text-lg font-medium">Proプラン</h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        振り返りの精度を上げるための分析・出力を解放します。
      </p>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold">¥300 / 月</div>
          <div className="text-xs text-amber-700 dark:text-amber-200">年額 ¥2,400</div>
        </div>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
          ※ App内課金は準備中です。
        </p>
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-md bg-amber-300/70 px-4 py-2 text-sm font-semibold text-amber-900 opacity-70"
        >
          購入は準備中
        </button>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          月次・年次の推移が見える
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          カテゴリ/時間帯で深掘り
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          期間指定のCSVエクスポート
        </li>
      </ul>

      <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">
        {proAccess ? 'Pro機能が有効です。' : 'Pro機能はロック中です。'}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-md border border-dashed border-gray-200 p-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <span>開発用: Pro表示切替</span>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-md bg-blue-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600"
        >
          {proAccess ? 'OFF' : 'ON'}
        </button>
      </div>
    </div>
  );
}
