'use client';

import { useMemo } from 'react';
import { SummaryMetrics, InterruptionStats } from '@/lib/reportUtils';
import { CompletedTaskSummary } from './types';

interface ManagementSummaryProps {
  dateLabel: string;
  summaryMetrics: SummaryMetrics;
  totalFocusMinutes: number;
  totalInterruptMinutes: number;
  breakMinutes: number;
  interruptionStats: InterruptionStats;
  highlights: string[];
  completedTasks: CompletedTaskSummary[];
}

export default function ManagementSummary({
  dateLabel,
  summaryMetrics,
  totalFocusMinutes,
  totalInterruptMinutes,
  breakMinutes,
  interruptionStats,
  highlights,
  completedTasks,
}: ManagementSummaryProps) {
  const generatedAtLabel = useMemo(() => formatGeneratedAtLabel(), []);

  const focusItem = summaryMetrics.items.find(item => item.key === 'task');
  const interruptItem = summaryMetrics.items.find(item => item.key === 'interrupt');
  const breakItem = summaryMetrics.items.find(item => item.key === 'break');

  const topCompletedTasks = completedTasks.slice(0, 3);
  const topContributor = interruptionStats.topContributors[0];

  const managementNotes = buildManagementNotes({
    highlights,
    topCompletedTasks,
    topContributor,
    interruptionCount: interruptionStats.totalCount,
  });

  return (
    <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-rose-100/40 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none print:border-gray-300 print:bg-white print:shadow-none">
      <header className="flex flex-col gap-3 border-b border-white/60 pb-5 dark:border-slate-800 print:border-gray-300">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400 dark:text-rose-300">
          Management Snapshot
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{dateLabel}の報告サマリー</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              上司・チーム向けの主要指標を、YouTube Studio 風のカードでまとめました。
            </p>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">作成時点: {generatedAtLabel}</p>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="集中時間"
          value={formatMinutes(totalFocusMinutes)}
          detail={`前日比 ${formatDelta(focusItem?.deltaDuration ?? 0)}`}
          tone="focus"
        />
        <MetricCard
          title="完了タスク"
          value={`${completedTasks.length}件`}
          detail={
            topCompletedTasks.length > 0
              ? `${topCompletedTasks.map(task => task.name).join(' / ')}`
              : '主要タスクなし'
          }
          tone="tasks"
        />
        <MetricCard
          title="割り込み対応"
          value={`${interruptionStats.totalCount}件`}
          detail={`前日比 ${formatDelta(interruptItem?.deltaDuration ?? 0)} / 合計 ${formatMinutes(totalInterruptMinutes)}${
            topContributor ? ` / 最多: ${topContributor.label}` : ''
          }`}
          tone="interrupt"
        />
        <MetricCard
          title="休憩"
          value={formatMinutes(breakMinutes)}
          detail={`前日比 ${formatDelta(breakItem?.deltaDuration ?? 0)}`}
          tone="break"
        />
      </dl>

      {managementNotes.length > 0 && (
        <div className="mt-6 rounded-2xl border border-rose-100/80 bg-rose-50/60 p-4 text-sm text-rose-900 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 print:border-gray-300 print:bg-white">
          <h3 className="font-semibold uppercase tracking-wide text-xs text-rose-500 dark:text-rose-200">トピック</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {managementNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded <= 0) return '0分';
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  }
  if (hours > 0) {
    return `${hours}時間`;
  }
  return `${mins}分`;
}

function formatDelta(deltaMs: number): string {
  const minutes = Math.round(deltaMs / 60000);
  if (minutes === 0) return '±0分';
  return minutes > 0 ? `+${minutes}分` : `${minutes}分`;
}

function formatGeneratedAtLabel(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function buildManagementNotes({
  highlights,
  topCompletedTasks,
  topContributor,
  interruptionCount,
}: {
  highlights: string[];
  topCompletedTasks: CompletedTaskSummary[];
  topContributor: InterruptionStats['topContributors'][number] | undefined;
  interruptionCount: number;
}): string[] {
  const notes: string[] = [];

  if (topCompletedTasks.length > 0) {
    const taskLine = topCompletedTasks
      .map(task => `${task.name}（${formatMinutes(task.totalTimeMs / 60000)}）`)
      .join(' / ');
    notes.push(`主要タスク: ${taskLine}`);
  }

  if (interruptionCount > 0 && topContributor) {
    notes.push(`割り込み最多: ${topContributor.label}（${topContributor.count}件）`);
  }

  highlights.slice(0, 3).forEach(item => {
    if (!notes.includes(item)) {
      notes.push(item);
    }
  });

  return notes.slice(0, 5);
}

type MetricTone = 'focus' | 'tasks' | 'interrupt' | 'break';

function MetricCard({
  title,
  value,
  detail,
  tone = 'focus',
}: {
  title: string;
  value: string;
  detail: string;
  tone?: MetricTone;
}) {
  const toneStyles: Record<MetricTone, string> = {
    focus: 'border-rose-100/80 bg-gradient-to-br from-rose-50 via-white to-white text-rose-900 dark:border-rose-500/30 dark:from-rose-500/20 dark:via-transparent dark:to-transparent dark:text-rose-100',
    tasks: 'border-sky-100/80 bg-gradient-to-br from-sky-50 via-white to-white text-sky-900 dark:border-sky-500/30 dark:from-sky-500/20 dark:text-sky-100',
    interrupt:
      'border-amber-100/80 bg-gradient-to-br from-amber-50 via-white to-white text-amber-900 dark:border-amber-500/30 dark:from-amber-500/20 dark:text-amber-100',
    break:
      'border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-white text-emerald-900 dark:border-emerald-500/30 dark:from-emerald-500/20 dark:text-emerald-100',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm backdrop-blur-sm print:border-gray-300 print:bg-white ${toneStyles[tone]}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{title}</dt>
      <dd className="mt-2 text-2xl font-bold">{value}</dd>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{detail}</p>
    </div>
  );
}
