'use client';

import Link from 'next/link';

const STEPS = [
  { title: 'タスクを追加', body: '名前とカテゴリを選んで「タスクを追加」。必要なら「詳細を追加」から予定時間や期限を入れます。' },
  { title: '作業を開始', body: 'タスクの再生ボタンで開始。作業中の中断は「割り込み」として記録できます。' },
  { title: '履歴を修正', body: 'イベント履歴から編集して時間や種別を調整。押し忘れの追加も可能です。' },
  { title: 'データの管理', body: '設定 → データ管理でエクスポート/インポートや保持期間の設定ができます。' },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">使い方</h1>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        基本の操作を4ステップでまとめました。
      </p>
      <div className="mt-6 space-y-4">
        {STEPS.map((step, index) => (
          <section key={step.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Step {index + 1}
            </div>
            <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              {step.title}
            </h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{step.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-8">
        <Link href="/settings" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
          設定に戻る
        </Link>
      </div>
    </div>
  );
}
